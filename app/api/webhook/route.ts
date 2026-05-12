// @ts-nocheck
import { NextResponse } from "next/server";
import Stripe from "stripe";
import prismadb from "@/app/lib/prismadb"; // 🟢 FIXED PATH
import { sendBookingReceipt, sendAmendmentAlerts } from "@/app/lib/mail"; // 🟢 FIXED PATH

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);
const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET!; // You'll get this from Stripe Dashboard

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
    const metadata = session.metadata;

    if (metadata?.is_amendment === "true") {
      // 🛠️ SCENARIO A: AMENDMENT / EXTENSION
      const updatedBooking = await prismadb.bookings.update({
        where: { booking_ref: metadata.booking_ref },
        data: {
          pickup_date: metadata.new_pickup,
          dropoff_date: metadata.new_dropoff,
          total_price: { increment: session.amount_total / 100 }, // Add the extra payment to total
        },
        include: { company: true } // Assuming relation exists
      });

      // Notify you and the customer
      await sendAmendmentAlerts(updatedBooking, updatedBooking.company);
      
    } else {
      // 🆕 SCENARIO B: BRAND NEW BOOKING
      const newBooking = await prismadb.bookings.create({
        data: {
          booking_ref: `APD-${Math.random().toString(36).substring(2, 8).toUpperCase()}`,
          full_name: metadata.full_name,
          email: session.customer_details?.email,
          phone_number: session.customer_details?.phone, // Collected via Stripe
          license_plate: metadata.license_plate,
          car_make: metadata.car_make,
          car_color: metadata.car_color,
          airport: metadata.airport,
          terminal: metadata.terminal,
          dropoff_date: metadata.dropoff_date,
          pickup_date: metadata.pickup_date,
          total_price: session.amount_total / 100,
          status: "confirmed",
          stripe_session_id: session.id,
          company_id: metadata.company_id,
        }
      });

      const company = await prismadb.companies.findUnique({ where: { id: metadata.company_id } });
      await sendBookingReceipt(newBooking, company);
    }
  }

  return new NextResponse(null, { status: 200 });
}