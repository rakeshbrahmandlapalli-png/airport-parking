import { NextResponse } from "next/server";
import { sendBookingReceipt } from "@/app/lib/mail";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    
    // Log incoming request for debugging in Vercel Console
    console.log("Email Request Received for Ref:", body.bookingRef);

    const { 
      customerEmail, 
      flightNumber, 
      parkingType, 
      bookingRef, 
      customerPhone, 
      carDetails, 
      notes 
    } = body;

    // Validate minimum requirements to prevent Resend from crashing
    if (!customerEmail || !bookingRef) {
      return NextResponse.json({ error: "Missing required email fields" }, { status: 400 });
    }

    // Trigger the generic mailer (7 arguments)
    const result = await sendBookingReceipt(
      customerEmail, 
      flightNumber || "TBA", 
      parkingType || "Luton Airport Parking",
      bookingRef,
      customerPhone || "N/A", 
      carDetails || "Vehicle Details Pending", 
      notes || "No additional notes" 
    );
    
    if (result.success) {
      return NextResponse.json({ 
        success: true, 
        message: "Confirmation email processed",
        data: result.data 
      });
    } else {
      // Logs exactly why Resend rejected it (e.g., Sandbox restrictions)
      console.error("Resend API Failure:", result.error);
      return NextResponse.json({ 
        error: "Mailer failed to deliver", 
        details: result.error 
      }, { status: 500 });
    }
    
  } catch (error: any) {
    console.error("Critical Email Route Error:", error);
    return NextResponse.json({ 
      error: "Internal Server Error", 
      message: error.message 
    }, { status: 500 });
  }
}