// @ts-nocheck
import { NextResponse } from "next/server";
import Stripe from "stripe";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

export async function POST(req: Request) {
  try {
    const { price, airport, provider, metadata, isAmendment } = await req.json();

    // 1. DYNAMIC PRODUCT NAMING
    const productName = isAmendment 
      ? `Booking Amendment: ${metadata.booking_ref}` 
      : `AeroPark: ${airport}`;
    
    const productDesc = isAmendment
      ? `Date Change Adjustment - ${provider}`
      : `${provider} Parking Services`;

    // 2. SAFE URL REDIRECTS
    const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || process.env.NEXT_PUBLIC_BASE_URL || "https://www.aeroparkdirect.co.uk";
    const successPath = isAmendment 
      ? `/manage?ref=${metadata.booking_ref}&updated=true`
      : `/success?session_id={CHECKOUT_SESSION_ID}`;

    // 3. STRIPE SESSION
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      
      customer_email: metadata.email ? String(metadata.email) : undefined,
      
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
            unit_amount: Math.round(price * 100), 
          },
          quantity: 1,
        },
      ],

      metadata: {
        // 🟢 MAPPING: We keep keys clean for the webhook to parse
        full_name: String(metadata.full_name || ""),
        email: String(metadata.email || ""),
        phone: String(metadata.phone || ""),
        license_plate: String(metadata.registration || metadata.license_plate || ""),
        car_make: String(metadata.car_make || ""),
        car_color: String(metadata.car_color || ""),
        airport: String(airport || ""),
        terminal: String(metadata.terminal || "Main Terminal"),
        dropoff_date: String(metadata.dropoff_date || ""),
        pickup_date: String(metadata.pickup_date || ""),
        dropoff_time: String(metadata.dropTime || "09:00"),
        pickup_time: String(metadata.pickTime || "09:00"),
        flight_number: String(metadata.flightNumber || ""),
        provider_name: String(provider || ""), 
        company_id: String(metadata.company_id || ""), 
        service_type: String(metadata.service_type || "Premium Meet & Greet"),
        booking_ref: String(metadata.booking_ref || ""),
        is_amendment: isAmendment ? "true" : "false",
        promo_used: String(metadata.promo_used || "None")
      },

      mode: "payment",
      success_url: `${baseUrl}${successPath}`,
      cancel_url: `${baseUrl}${isAmendment ? '/manage' : '/checkout'}`,
    });

    return NextResponse.json({ url: session.url });

  } catch (err: any) {
    console.error("Stripe Checkout Error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}