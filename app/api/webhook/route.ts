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
    const metadata = session.metadata;

    if (metadata?.is_amendment === "true") {
      // 🛠️ SCENARIO A: AMENDMENT / EXTENSION
      const updatedBooking = await prismadb.bookings.update({
        where: { booking_ref: metadata.booking_ref },
        data: {
          pickup_date: new Date(metadata.new_pickup),
          total_price: { increment: session.amount_total / 100 }, 
        },
        // 🟢 Relation name from your schema is 'companies'
        include: { companies: true } 
      });

      // Notify Admin and send updated voucher to customer
      await sendAmendmentAlerts(updatedBooking, updatedBooking.companies);
      
    } else {
      // 🆕 SCENARIO B: BRAND NEW BOOKING
      const newBooking = await prismadb.bookings.create({
        data: {
          booking_ref: `APD-${Math.random().toString(36).substring(2, 8).toUpperCase()}`,
          full_name: metadata?.full_name || "",
          email: metadata?.email || session.customer_details?.email || "",
          phone_number: metadata?.phone || session.customer_details?.phone || "", 
          license_plate: metadata?.license_plate || "",
          car_make: metadata?.car_make || "",
          car_color: metadata?.car_color || "",
          airport: metadata?.airport || "Luton Airport (LTN)",
          terminal: metadata?.terminal || "Main Terminal",
          dropoff_date: new Date(metadata?.dropoff_date),
          pickup_date: new Date(metadata?.pickup_date),
          dropoff_time: metadata?.dropTime || "", 
          pickup_time: metadata?.pickTime || "", 
          flight_number: metadata?.flightNumber || "", 
          service_type: metadata?.service_type || "Premium Meet & Greet", 
          total_price: session.amount_total ? session.amount_total / 100 : 0,
          status: "confirmed",
          stripe_session_id: session.id,
          // 🟢 Link to the provider from your admin panel
          company_id: metadata?.company_id || null,
        }
      });

      // 🟢 DYNAMIC FETCH: Pull the specific instructions/address for this company
      let company = null;
      if (metadata?.company_id) {
        company = await prismadb.companies.findUnique({ 
          where: { id: metadata.company_id } 
        });
      }
      
      // Pass the booking AND the specific company info to the email template
      await sendBookingReceipt(newBooking, company); 
    }
  }

  return new NextResponse(null, { status: 200 });
}