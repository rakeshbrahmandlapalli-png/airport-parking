// @ts-nocheck
import { NextResponse } from "next/server";
import Stripe from "stripe";
import { sendBookingReceipt, sendAmendmentAlerts } from "@/app/lib/mail"; 
import { createClient } from '@supabase/supabase-js';
import { triggerMissingFlightAlert } from "@/app/lib/twilio"; // 🟢 NEW: Twilio Import

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);
const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET!; 

// 🟢 CRITICAL FIX: Changed from ANON_KEY to SERVICE_ROLE_KEY to bypass your new RLS rules
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!, 
  process.env.SUPABASE_SERVICE_ROLE_KEY! 
);

export async function POST(req: Request) {
  const body = await req.text();
  const signature = req.headers.get("stripe-signature")!;
  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(body, signature, endpointSecret);
  } catch (err: any) {
    console.error("Webhook signature verification failed:", err.message);
    return new NextResponse(`Webhook Error: ${err.message}`, { status: 400 });
  }

  const session = event.data.object as Stripe.Checkout.Session;

  if (event.type === "checkout.session.completed") {
    const m = session.metadata;

    try {
      if (m?.is_amendment === "true") {
        // --- AMENDMENT LOGIC ---
        const { data: updatedBooking } = await supabase.from('bookings')
          .update({ 
            pickup_date: m.new_pickup, 
            total_price: (session.amount_total / 100) 
          })
          .eq('booking_ref', m.booking_ref)
          .select().single();
          
        const { data: comp } = await supabase.from('companies').select('*').eq('id', updatedBooking?.company_id).maybeSingle();
        await sendAmendmentAlerts(updatedBooking, comp);
        
      } else {
        // --- NEW BOOKING LOGIC ---
        let resolvedCompany = null;
        
        // 1. Fetch Company (Works with your 8-character IDs)
        if (m?.company_id && m.company_id !== "null" && m.company_id !== "") {
          const { data } = await supabase.from('companies').select('*').eq('id', m.company_id).maybeSingle();
          if (data) resolvedCompany = data;
        }

        // 2. Fallback search by provider name
        if (!resolvedCompany && m?.provider_name) {
          const { data } = await supabase.from('companies').select('*').ilike('name', `%${m.provider_name}%`).limit(1).maybeSingle();
          if (data) resolvedCompany = data;
        }

        // 3. Create Booking in Database
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
          
          // 🚀 CATCHES THE PROMO CODE AND SAVES IT TO SUPABASE
          promo_code: m?.promo_used || "None",
        };

        const { data: newBooking, error: insertError } = await supabase.from('bookings').insert([bookingData]).select().maybeSingle();

        if (insertError) {
          console.error("❌ SUPABASE INSERT ERROR:", insertError);
        }

        // 4. Send Confirmation Email
        await sendBookingReceipt(newBooking || bookingData, resolvedCompany); 

        // 🟢 5. TRIGGER TWILIO AUTOMATION
        if (newBooking) {
          // Triggers in the background, keeping the Stripe checkout fast
          triggerMissingFlightAlert({
            full_name: newBooking.full_name,
            phone_number: newBooking.phone_number,
            booking_ref: newBooking.booking_ref,
            flight_number: newBooking.flight_number,
            car_make: newBooking.car_make
          }).catch(err => console.error("Twilio Trigger Failed:", err));
        }
      }
    } catch (dbError: any) {
       console.error("❌ FATAL WEBHOOK CRASH:", dbError.message);
    }
  }

  return new NextResponse(null, { status: 200 });
}