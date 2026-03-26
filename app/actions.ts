"use server";
import { PrismaClient } from "@prisma/client";
import { redirect } from "next/navigation";

const prisma = new PrismaClient();

export async function createBooking(formData: FormData) {
  // 1. Grab the data the user typed into the form
  const name = formData.get("name") as string;
  const plate = formData.get("plate") as string;

  // 2. Find our Economy lot in the database
  const lot = await prisma.parkingLot.findFirst();
  
  if (!lot) {
    throw new Error("No parking lots found in the database!");
  }

  // 3. Save the actual booking to Neon!
  await prisma.booking.create({
    data: {
      customerName: name,
      licensePlate: plate,
      lotId: lot.id,
      dropoffDate: new Date(), // Using today for simplicity
      pickupDate: new Date(Date.now() + 86400000), // Adding 1 day
      totalPrice: lot.pricePerDay,
    },
  });

  // 4. Send the user to a sleek success page
  redirect("/success");
}