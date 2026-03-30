"use server";

import { redirect } from "next/navigation";
import Stripe from "stripe";
import prismadb from "./prismadb"; 
import { sendBookingReceipt } from "./lib/mail"; 

export async function createCheckoutSession(formData: FormData) {
  // 1. Initialise Stripe
  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY as string);

  // 2. Extract every field from the form
  const customerName = formData.get("customerName") as string;
  const customerEmail = formData.get("customerEmail") as string;
  const customerPhone = formData.get("customerPhone") as string;
  const flightNumber = formData.get("flightNumber") as string;
  const licensePlate = formData.get("licensePlate") as string;
  const parkingType = formData.get("parkingType") as string || "standard";
  const totalPrice = parseFloat(formData.get("totalPrice") as string) || 0;

  // Generate a temporary Reference ID
  const tempRef = "VIP-" + Math.random().toString(36).substring(2, 8).toUpperCase();

  let sessionUrl = "";

  // 3. DATABASE, EMAIL & STRIPE LOGIC
  try {
    // A. Save the booking to Neon Database
    await prismadb.booking.create({
      data: {
        customerName,
        customerEmail,
        customerPhone,
        flightNumber,
        licensePlate,
        parkingType,
        totalPrice,
        status: "pending",
      },
    });

    // B. Fire off the email receipt via Resend ✈️
    if (customerEmail) {
      // 🔥 FIXED: Added all 7 arguments to match lib/mail.ts
      await sendBookingReceipt(
        customerEmail, 
        flightNumber || "TBA", 
        parkingType, 
        tempRef,
        customerPhone || "N/A",               // Argument 5: Phone
        `License: ${licensePlate || "N/A"}`,  // Argument 6: Car Details
        "Direct Stripe Booking"               // Argument 7: Notes
      );
    }

    // C. Create the Stripe Checkout Session 💳
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      line_items: [
        {
          price_data: {
            currency: "gbp",
            product_data: {
              name: `AIRPORT VIP: ${parkingType.toUpperCase()} PARKING`,
              description: `Flight: ${flightNumber} | License: ${licensePlate} | Ref: ${tempRef}`,
            },
            unit_amount: Math.round(totalPrice * 100),
          },
          quantity: 1,
        },
      ],
      mode: "payment",
      success_url: `${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/success?session_id={CHECKOUT_SESSION_ID}&ref=${tempRef}`,
      cancel_url: `${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/checkout?type=${parkingType}`,
      customer_email: customerEmail,
    });

    sessionUrl = session.url as string;

  } catch (error) {
    console.error("Critical Error in createCheckoutSession:", error);
    return;
  }

  // 4. THE REDIRECT
  if (sessionUrl) {
    redirect(sessionUrl);
  }
}