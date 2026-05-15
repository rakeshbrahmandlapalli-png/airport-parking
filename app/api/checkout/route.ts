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

    // 2. SAFE URL REDIRECTS (Fixes the Invalid URL Popup)
    const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || process.env.NEXT_PUBLIC_BASE_URL || "https://www.aeroparkdirect.co.uk";

    const successPath = isAmendment 
      ? `/manage?ref=${metadata.booking_ref}&updated=true`
      : `/success?session_id={CHECKOUT_SESSION_ID}`;

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      
      // PHONE COLLECTION
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

      // 🟢 CRITICAL FIX: Explicitly cast metadata to strings for Stripe
      // If we just use ...metadata, Stripe drops non-string values like company_id
      metadata: {
        full_name: String(metadata.full_name || metadata.fullName || ""),
        email: String(metadata.email || ""),
        phone: String(metadata.phone || ""),
        license_plate: String(metadata.license_plate || metadata.registration || ""),
        car_make: String(metadata.car_make || metadata.carMake || ""),
        car_color: String(metadata.car_color || metadata.carColor || ""),
        airport: String(airport || metadata.airport || ""),
        terminal: String(metadata.terminal || ""),
        dropoff_date: String(metadata.dropoff_date || metadata.dropDate || ""),
        pickup_date: String(metadata.pickup_date || metadata.pickDate || ""),
        dropTime: String(metadata.dropTime || ""),
        pickTime: String(metadata.pickTime || ""),
        flightNumber: String(metadata.flightNumber || metadata.flight_number || ""),
        
        // 🟢 THIS IS THE KEY: The webhook needs this ID to generate the custom email
        company_id: String(metadata.company_id || ""), 
        service_type: String(metadata.service_type || metadata.type || "Premium Meet & Greet"),
        booking_ref: String(metadata.booking_ref || ""),
        is_amendment: isAmendment ? "true" : "false"
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