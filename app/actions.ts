"use server";
import { redirect } from "next/navigation";
import Stripe from "stripe";
import prismadb from "./prismadb"; // Importing from the same folder

export async function createCheckoutSession(formData: FormData) {
  // 1. Initialise Stripe
  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY as string);

  // 2. Extract every field from the form
  const customerName = formData.get("customerName") as string;
  const customerEmail = formData.get("customerEmail") as string;
  const customerPhone = formData.get("customerPhone") as string;
  const flightNumber = formData.get("flightNumber") as string;
  const licensePlate = formData.get("licensePlate") as string;
  const parkingType = formData.get("parkingType") as string;
  const totalPrice = parseFloat(formData.get("totalPrice") as string);

  // 3. SAVE TO DATABASE (So you can see it in your Admin Dashboard)
  try {
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
  } catch (error) {
    console.error("Database Error:", error);
    // Even if database fails, we usually let the payment proceed 
    // but in a real app you might want to handle this differently.
  }

  // 4. Create Stripe Session
  const session = await stripe.checkout.sessions.create({
    payment_method_types: ["card"],
    customer_email: customerEmail,
    line_items: [
      {
        price_data: {
          currency: "gbp",
          product_data: {
            name: `${parkingType} - ${licensePlate}`,
            description: `Flight: ${flightNumber} | Phone: ${customerPhone}`,
          },
          unit_amount: Math.round(totalPrice * 100),
        },
        quantity: 1,
      },
    ],
    mode: "payment",
    success_url: "https://airport-parking-ochre.vercel.app/success",
    cancel_url: "https://airport-parking-ochre.vercel.app/checkout",
    metadata: {
      customerPhone,
      flightNumber,
      licensePlate,
    },
  });

  redirect(session.url as string);
}