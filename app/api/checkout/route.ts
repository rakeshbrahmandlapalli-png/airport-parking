// @ts-nocheck
import { NextResponse } from "next/server";
import Stripe from "stripe";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

export async function POST(req: Request) {
  try {
    const { price, airport, provider, metadata, isAmendment } = await req.json();

    // 1. DYNAMIC PRODUCT NAMING
    // If it's an amendment, we label it clearly for the customer's bank statement
    const productName = isAmendment 
      ? `Booking Amendment: ${metadata.booking_ref}` 
      : `AeroPark: ${airport}`;
    
    const productDesc = isAmendment
      ? `Date Change Adjustment - ${provider}`
      : `${provider} Parking Services`;

    // 2. DYNAMIC REDIRECTS
    // Amendments should return to the 'Manage' page, new bookings go to 'Success'
    const successPath = isAmendment 
      ? `/manage?ref=${metadata.booking_ref}&updated=true`
      : `/success?session_id={CHECKOUT_SESSION_ID}`;

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      
      // 🟢 PHONE COLLECTION: This fixes the "N/A" in your emails!
      phone_number_collection: {
        enabled: true,
      },

      line_items: [
        {
          price_data: {
            currency: "gbp",
            product_data: {
              name: productName,
              description: productDesc,
            },
            unit_amount: Math.round(price * 100), // Stripe expects pence
          },
          quantity: 1,
        },
      ],

      // 🟢 METADATA: Vital for your Webhook to update the right booking
      metadata: {
        ...metadata,
        is_amendment: isAmendment ? "true" : "false"
      },

      mode: "payment",
      success_url: `${process.env.NEXT_PUBLIC_SITE_URL}${successPath}`,
      cancel_url: `${process.env.NEXT_PUBLIC_SITE_URL}${isAmendment ? '/manage' : '/checkout'}`,
    });

    // Return the secure Stripe URL for redirect
    return NextResponse.json({ url: session.url });

  } catch (err: any) {
    console.error("Stripe Checkout Error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}