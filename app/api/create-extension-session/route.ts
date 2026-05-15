import { NextResponse } from "next/server";
import Stripe from "stripe";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

export async function POST(req: Request) {
  try {
    const { bookingRef, amount, newPickupDate, customerEmail } = await req.json();

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      line_items: [{
        price_data: {
          currency: "gbp",
          product_data: { 
            name: `AeroPark Direct - Booking Extension`, 
            description: `Ref: ${bookingRef} | New Return: ${new Date(newPickupDate).toLocaleDateString('en-GB')}` 
          },
          unit_amount: Math.round(amount * 100),
        },
        quantity: 1,
      }],
      mode: "payment",
      metadata: {
        is_amendment: "true", 
        booking_ref: bookingRef,
        new_pickup: newPickupDate,
      },
      // Sends them back to the manage page with a success flag
      success_url: `${process.env.NEXT_PUBLIC_BASE_URL}/manage?success=true`,
      cancel_url: `${process.env.NEXT_PUBLIC_BASE_URL}/manage`,
      customer_email: customerEmail,
    });

    return NextResponse.json({ url: session.url });
  } catch (error: any) {
    console.error("Stripe Extension Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}