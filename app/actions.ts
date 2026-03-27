"use server";
import { redirect } from "next/navigation";
import Stripe from "stripe";

export async function createCheckoutSession(formData: FormData) {
  // 1. Initialise Stripe (Uses the key you added to Vercel)
  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY as string);

  // 2. Extract every field from the form
  const customerName = formData.get("customerName") as string;
  const customerEmail = formData.get("customerEmail") as string;
  const customerPhone = formData.get("customerPhone") as string;
  const flightNumber = formData.get("flightNumber") as string;
  const licensePlate = formData.get("licensePlate") as string;
  const parkingType = formData.get("parkingType") as string;
  const totalPrice = parseFloat(formData.get("totalPrice") as string);

  // 3. Create Stripe Session
  const session = await stripe.checkout.sessions.create({
    payment_method_types: ["card"],
    customer_email: customerEmail, // Automatically fills the Stripe email box
    line_items: [
      {
        price_data: {
          currency: "gbp",
          product_data: {
            name: `${parkingType} - ${licensePlate}`,
            description: `Return Flight: ${flightNumber} | Phone: ${customerPhone}`,
          },
          unit_amount: Math.round(totalPrice * 100), // Stripe uses pence
        },
        quantity: 1,
      },
    ],
    mode: "payment",
    // Ensure these URLs match your live Vercel URL!
    success_url: "https://airport-parking-ochre.vercel.app/success",
    cancel_url: "https://airport-parking-ochre.vercel.app/checkout",
    metadata: {
      customerName,
      customerPhone,
      flightNumber,
      licensePlate,
      parkingType
    }
  });

  // 4. Send the user to the Stripe Payment Page
  redirect(session.url as string);
}