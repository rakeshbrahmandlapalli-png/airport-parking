import { NextResponse } from "next/server";
import { sendBookingReceipt } from "../../lib/mail";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    
    // 🔥 Extracting ALL the new fields from the checkout request
    const { 
      customerEmail, 
      flightNumber, 
      parkingType, 
      bookingRef, 
      customerPhone, 
      carDetails, 
      notes 
    } = body;

    const result = await sendBookingReceipt(
      customerEmail, 
      flightNumber || "TBA", 
      parkingType,
      bookingRef,
      customerPhone, // 🔥 Passed to mailer
      carDetails,    // 🔥 Passed to mailer
      notes          // 🔥 Passed to mailer
    );
    
    return NextResponse.json({ success: true, result });
  } catch (error) {
    console.error("Email API Error:", error);
    return NextResponse.json({ error: "Failed to send email" }, { status: 500 });
  }
}