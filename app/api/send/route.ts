import { NextResponse } from "next/server";
import { sendBookingReceipt } from "@/app/lib/mail";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { 
      customerEmail, 
      flightNumber, 
      parkingType, 
      bookingRef, 
      customerPhone, 
      carDetails, 
      notes 
    } = body;

    // Clean the email address
    const targetEmail = customerEmail?.trim().toLowerCase();

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
      // 🛡️ Added 'as any' to fix the TypeScript Build Error shown in your screenshot
      const resendError = result.error as any;
      
      console.error("Resend API Rejection:", resendError);
      
      return NextResponse.json({ 
        error: "Resend rejected the request", 
        debug_msg: resendError?.message || "Check Resend Dashboard",
        suggestion: "Verify your API Key has 'Full Access' in Resend Dashboard"
      }, { status: 403 });
    }
  } catch (error: any) {
    return NextResponse.json({ error: "Server Error", msg: error.message }, { status: 500 });
  }
}