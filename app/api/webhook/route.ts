// @ts-nocheck
import { NextResponse } from "next/server";
import Stripe from "stripe";
import prismadb from "@/app/lib/prismadb"; 
import { sendBookingReceipt, sendAmendmentAlerts } from "@/app/lib/mail"; 

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);
const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET!; 

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

    // 🟢 LOGGING: Check your Vercel logs to see if company_id is arriving!
    console.log("STRIPE WEBHOOK RECEIVED. Company ID:", m?.company_id);

    if (m?.is_amendment === "true") {
      // 🛠️ SCENARIO A: AMENDMENT / EXTENSION
      const updatedBooking = await prismadb.bookings.update({
        where: { booking_ref: m.booking_ref },
        data: {
          pickup_date: new Date(m.new_pickup),
          total_price: { increment: session.amount_total / 100 }, 
        },
        include: { companies: true } // Fetches linked instructions automatically
      });

      await sendAmendmentAlerts(updatedBooking, updatedBooking.companies);
      
    } else {
      // 🆕 SCENARIO B: BRAND NEW BOOKING
      // We use 'include' here so we get the company data in one single database hit
      const newBooking = await prismadb.bookings.create({
        data: {
          booking_ref: `APD-${Math.random().toString(36).substring(2, 8).toUpperCase()}`,
          full_name: m?.full_name || "",
          email: m?.email || session.customer_details?.email || "",
          phone_number: m?.phone || session.customer_details?.phone || "", 
          license_plate: m?.license_plate || "",
          car_make: m?.car_make || "",
          car_color: m?.car_color || "",
          airport: m?.airport || "Luton Airport (LTN)",
          terminal: m?.terminal || "Main Terminal",
          dropoff_date: new Date(m?.dropoff_date),
          pickup_date: new Date(m?.pickup_date),
          dropoff_time: m?.dropTime || "09:00", 
          pickup_time: m?.pickTime || "09:00", 
          flight_number: m?.flightNumber || "", 
          service_type: m?.service_type || "Premium Meet & Greet", 
          total_price: session.amount_total ? session.amount_total / 100 : 0,
          status: "confirmed",
          stripe_session_id: session.id,
          // We only set company_id if it's a valid string, otherwise null
          company_id: (m?.company_id && m.company_id !== "null") ? m.company_id : null,
        },
        include: { companies: true } 
      });

      // 🟢 The company data is now sitting inside newBooking.companies
      if (!newBooking.companies) {
        console.error("WEBHOOK ERROR: Booking created but NO company details found for ID:", m?.company_id);
      }
      
      await sendBookingReceipt(newBooking, newBooking.companies); 
    }
  }

  return new NextResponse(null, { status: 200 });
}