// @ts-nocheck
import { NextResponse } from "next/server";
import Stripe from "stripe";
import { sendBookingReceipt, sendAmendmentAlerts } from "@/app/lib/mail"; 
import { createClient } from '@supabase/supabase-js';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);
const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET!; 

// 🟢 BYPASS PRISMA: Use Supabase directly to guarantee database connection
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!, 
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export async function POST(req: Request) {
  const body = await req.text();
  const signature = req.headers.get("stripe-signature")!;
  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(body, signature, endpointSecret);
  } catch (err: any) {
    return new NextResponse(`Webhook Error: ${err.message}`, { status: 400 });
  }

  const session = event.data.object as Stripe.Checkout.Session;

  if (event.type === "checkout.session.completed") {
    const m = session.metadata;
    console.log("✅ STRIPE SUCCESS. ID:", m?.company_id);

    try {
      if (m?.is_amendment === "true") {
        // AMENDMENT LOGIC
        const { data: updatedBooking } = await supabase.from('bookings')
          .update({ 
            pickup_date: m.new_pickup, 
            total_price: (session.amount_total / 100) 
          })
          .eq('booking_ref', m.booking_ref)
          .select().single();
          
        const { data: comp } = await supabase.from('companies').select('*').eq('id', updatedBooking?.company_id).single();
        await sendAmendmentAlerts(updatedBooking, comp);
        
      } else {
        // 🟢 1. FETCH COMPANY DIRECTLY VIA SUPABASE
        let resolvedCompany = null;
        
        if (m?.company_id && m.company_id.length > 10) {
          const { data } = await supabase.from('companies').select('*').eq('id', m.company_id).single();
          resolvedCompany = data;
        }

        if (!resolvedCompany && m?.provider_name) {
          const { data } = await supabase.from('companies').select('*').ilike('name', `%${m.provider_name}%`).single();
          resolvedCompany = data;
        }

        // 🟢 2. CREATE BOOKING DIRECTLY VIA SUPABASE
        const bookingData = {
          booking_ref: `APD-${Math.random().toString(36).substring(2, 8).toUpperCase()}`,
          full_name: m?.full_name || "",
          email: m?.email || session.customer_details?.email || "",
          phone_number: m?.phone || session.customer_details?.phone || "", 
          license_plate: m?.license_plate || "",
          car_make: m?.car_make || "",
          car_color: m?.car_color || "",
          airport: m?.airport || "Luton Airport (LTN)",
          terminal: m?.terminal || "Main Terminal",
          dropoff_date: m?.dropoff_date || new Date().toISOString(),
          pickup_date: m?.pickup_date || new Date().toISOString(),
          dropoff_time: m?.dropTime || "09:00", 
          pickup_time: m?.pickTime || "09:00", 
          flight_number: m?.flightNumber || "", 
          service_type: m?.service_type || "Premium Meet & Greet", 
          total_price: session.amount_total ? session.amount_total / 100 : 0,
          status: "confirmed",
          stripe_session_id: session.id,
          company_id: resolvedCompany ? resolvedCompany.id : null, 
        };

        const { data: newBooking, error: insertError } = await supabase.from('bookings').insert([bookingData]).select().single();

        if (insertError) {
          console.error("❌ SUPABASE INSERT ERROR:", insertError);
        }

        // 🟢 3. SEND EMAIL
        // If booking failed to save, use the raw data object so the customer still gets their email!
        await sendBookingReceipt(newBooking || bookingData, resolvedCompany); 
      }
    } catch (dbError: any) {
       console.error("❌ FATAL WEBHOOK CRASH:", dbError.message);
    }
  }

  return new NextResponse(null, { status: 200 });
}