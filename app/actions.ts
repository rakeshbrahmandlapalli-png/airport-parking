"use server";
import { PrismaClient } from "@prisma/client";
import { redirect } from "next/navigation";
import Stripe from "stripe";

const prisma = new PrismaClient();

export async function createCheckoutSession(formData: FormData) {
  // THE FIX: We moved Stripe initialization INSIDE the function!
  // Now it waits for the button click to look for the secret key.
  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY as string);

  // 1. Extract the data
  const customerName = formData.get("customerName") as string;
  const licensePlate = formData.get("licensePlate") as string;
  const totalPrice = parseFloat(formData.get("totalPrice") as string);
  const parkingType = formData.get("parkingType") as string;

  const dropoffDate = new Date();
  const pickupDate = new Date();
  pickupDate.setDate(pickupDate.getDate() + 4);

  // 2. Database Relation Logic
  let defaultLot = await prisma.parkingLot.findFirst();
  
  if (!defaultLot) {
    defaultLot = await prisma.parkingLot.create({
      data: {
        name: "Main Premium Lot",
        pricePerDay: 15.00,
        capacity: 100
      }
    });
  }

  // 3. Save to Neon
  await prisma.booking.create({
    data: {
      customerName,
      licensePlate,
      totalPrice,
      dropoffDate,
      pickupDate,
      lotId: defaultLot.id,
    },
  });

 // 4. Stripe Session
  const session = await stripe.checkout.sessions.create({
    payment_method_types: ["card"],
    line_items: [
      {
        price_data: {
          currency: "gbp", // <--- CHANGE THIS FROM "usd" TO "gbp"
          product_data: {
            name: `Airport Parking - ${parkingType}`,
            description: `Vehicle: ${licensePlate}`,
          },
          unit_amount: Math.round(totalPrice * 100), 
        },
        quantity: 1,
      },
    ],
    mode: "payment",
    success_url: "https://airport-parking-ochre.vercel.app/success",
    cancel_url: "https://airport-parking-ochre.vercel.app/checkout",
  });

  // 5. Redirect
  if (session.url) {
    redirect(session.url);
  }
}