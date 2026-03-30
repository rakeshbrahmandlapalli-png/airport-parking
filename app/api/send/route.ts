import { NextResponse } from "next/server";
import { sendBookingReceipt } from "@/app/lib/mail";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { customerEmail, flightNumber, parkingType, bookingRef, customerPhone, carDetails, notes } = body;

    // We manually clean the email one last time here
    const targetEmail = customerEmail.trim().toLowerCase();

    const result = await sendBookingReceipt(
      targetEmail, 
      flightNumber, 
      parkingType,
      bookingRef,
      customerPhone, 
      carDetails, 
      notes
    );
    
    if (result.success) {
      return NextResponse.json({ success: true, data: result.data });
    } else {
      // If we are still here, Resend is rejecting the IDENTITY of the sender/receiver
      console.error("CRITICAL RESEND REJECTION:", JSON.stringify(result.error, null, 2));
      
      return NextResponse.json({ 
        error: "Resend rejected the request", 
        debug_msg: result.error?.message,
        suggestion: "Verify your API Key has 'Full Access' in Resend Dashboard"
      }, { status: 403 });
    }
  } catch (error: any) {
    return NextResponse.json({ error: "Server Crash", msg: error.message }, { status: 500 });
  }
}