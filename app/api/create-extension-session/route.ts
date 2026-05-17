import { NextResponse } from "next/server";
import Stripe from "stripe";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

export async function POST(req: Request) {
  try {
    const { bookingRef, amount, newPickupDate, customerEmail } = await req.json();

    // 🟢 FIXED: Hardcoded fallback URL so Stripe never throws the "Invalid URL" error
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || process.env.NEXT_PUBLIC_SITE_URL || "https://www.aeroparkdirect.co.uk";

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      
      // 🚀 Added to ensure Twilio SMS webhook always has a target number
      phone_number_collection: {
        enabled: true,
      },

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
      
      // 🟢 STRIPE METADATA (Forced to Strings to prevent Webhook crashes)
      metadata: {
        is_amendment: "true", 
        booking_ref: String(bookingRef || ""),
        new_pickup: String(newPickupDate || ""),
        promo_used: "None", // Keeps your webhook database consistent
      },
      
      // 🚀 Smarter redirect so the manage page auto-loads their updated booking
      success_url: `${baseUrl}/manage?ref=${bookingRef}&updated=true`,
      cancel_url: `${baseUrl}/manage`,
      customer_email: customerEmail,
    });

    return NextResponse.json({ url: session.url });
  } catch (error: any) {
    console.error("Stripe Extension Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}