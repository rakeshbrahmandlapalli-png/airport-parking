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
  
  // Extract the airport and terminal
  const airport = formData.get("airport") as string || "Luton Airport (LTN)";
  const terminal = formData.get("terminal") as string || "Main Terminal";

  // 🔥 NEW: Extract Drop-off and Pick-up dates for inventory tracking
  const dropoffDateStr = formData.get("dropoffDate") as string;
  const pickupDateStr = formData.get("pickupDate") as string;
  
  // Convert strings to proper DateTime objects for the database
  const dropoffDate = dropoffDateStr ? new Date(dropoffDateStr) : null;
  const pickupDate = pickupDateStr ? new Date(pickupDateStr) : null;

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
        airport,    
        terminal,   
        dropoffDate, // 🔥 ADDED: Save drop-off date to DB
        pickupDate,  // 🔥 ADDED: Save pick-up date to DB
      },
    });

    // B. Fire off the email receipt via Resend ✈️
    if (customerEmail) {
      await sendBookingReceipt(
        customerEmail, 
        flightNumber || "TBA", 
        parkingType, 
        tempRef,
        customerPhone || "N/A", 
        `License: ${licensePlate || "N/A"}`, 
        "Direct Stripe Booking", 
        airport,  
        terminal  
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

// ============================================================================
// 🔥 NEW INVENTORY ENGINE
// ============================================================================
export async function checkAvailability(airport: string, dropoffStr: string, pickupStr: string) {
  // Set your physical parking lot capacity here (e.g., 50 cars per airport)
  const MAX_CAPACITY = 50; 

  try {
    const requestedStart = new Date(dropoffStr);
    const requestedEnd = new Date(pickupStr);

    // Ask the database: How many cars are parked at this airport between these two dates?
    const overlappingCars = await prismadb.booking.count({
      where: {
        airport: airport,
        status: { not: "cancelled" }, // Don't count cancelled bookings!
        dropoffDate: { lte: requestedEnd }, // Their dropoff is before or on our pickup
        pickupDate: { gte: requestedStart }, // Their pickup is after or on our dropoff
      }
    });

    const spotsLeft = MAX_CAPACITY - overlappingCars;

    return {
      isAvailable: overlappingCars < MAX_CAPACITY,
      spotsLeft: spotsLeft > 0 ? spotsLeft : 0,
    };
    
  } catch (error) {
    console.error("Inventory check failed:", error);
    // Fail safe: if the database errors out, block the booking to prevent disaster
    return { isAvailable: false, spotsLeft: 0 }; 
  }
}