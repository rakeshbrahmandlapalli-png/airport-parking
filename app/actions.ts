"use server";
import { PrismaClient } from "@prisma/client";
import { redirect } from "next/navigation";
import Stripe from "stripe";

const prisma = new PrismaClient();

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY as string);

export async function createCheckoutSession(formData: FormData) {
  // 1. Extract the data
  const customerName = formData.get("customerName") as string;
  const licensePlate = formData.get("licensePlate") as string;
  const totalPrice = parseFloat(formData.get("totalPrice") as string);
  const parkingType = formData.get("parkingType") as string;

  const dropoffDate = new Date();
  const pickupDate = new Date();
  pickupDate.setDate(pickupDate.getDate() + 4);

  // 2. THE FIX: Make sure we have a Parking Lot to put the car in!
  // First, we look for any existing parking lot
  let defaultLot = await prisma.parkingLot.findFirst();
  
  // If no lot exists in the database yet, we create a default one on the fly
  if (!defaultLot) {
    defaultLot = await prisma.parkingLot.create({
      data: {
        name: "Main Premium Lot",
        pricePerDay: 15.00,
        capacity: 100
      }
    });
  }

  // 3. Save the booking to your Neon database and connect it to the lot
  await prisma.booking.create({
    data: {
      customerName,
      licensePlate,
      totalPrice,
      dropoffDate,
      pickupDate,
      lotId: defaultLot.id, // <--- We tell the database exactly which lot it is!
    },
  });

  // 4. Talk to Stripe
  const session = await stripe.checkout.sessions.create({
    payment_method_types: ["card"],
    line_items: [
      {
        price_data: {
          currency: "usd",
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
    success_url: "http://localhost:3000/success",
    cancel_url: "http://localhost:3000/checkout",
  });

  // 5. Send the user to the Stripe page!
  if (session.url) {
    redirect(session.url);
  }
}