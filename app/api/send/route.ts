import { NextResponse } from "next/server";
import { sendBookingReceipt } from "../../lib/mail";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { customerEmail, flightNumber, parkingType } = body;

    // This calls your existing function from lib/mail.ts
    const result = await sendBookingReceipt(customerEmail, flightNumber, parkingType);
    
    return NextResponse.json({ success: true, result });
  } catch (error) {
    console.error("Email Error:", error);
    return NextResponse.json({ error: "Failed to send email" }, { status: 500 });
  }
}