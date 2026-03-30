import { NextResponse } from "next/server";
import { sendBookingReceipt } from "../../lib/mail";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    
    // We now extract bookingRef from the body as well
    const { customerEmail, flightNumber, parkingType, bookingRef } = body;

    // We pass the bookingRef to your mail function so it can be included in the email text
    // Ensure your sendBookingReceipt function in lib/mail.ts is updated to accept this 4th argument
    const result = await sendBookingReceipt(
      customerEmail, 
      flightNumber || "Not Provided", 
      parkingType,
      bookingRef || "N/A"
    );
    
    return NextResponse.json({ success: true, result });
  } catch (error) {
    console.error("Email Error:", error);
    return NextResponse.json({ error: "Failed to send email" }, { status: 500 });
  }
}