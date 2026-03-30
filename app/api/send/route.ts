import { NextResponse } from "next/server";
import { sendBookingReceipt } from "@/app/lib/mail";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    
    // Extract fields
    const { 
      customerEmail, 
      flightNumber, 
      parkingType, 
      bookingRef, 
      customerPhone, 
      carDetails, 
      notes 
    } = body;

    // 1. Validate requirements
    if (!customerEmail || !bookingRef) {
      console.error("❌ Email API Error: Missing customerEmail or bookingRef");
      return NextResponse.json({ error: "Missing required email fields" }, { status: 400 });
    }

    // 2. Normalize Email (Crucial for Resend Sandbox Testing)
    // This removes hidden spaces and forces lowercase to match your Resend login exactly
    const normalizedEmail = customerEmail.trim().toLowerCase();

    console.log(`📩 Attempting to send email to: ${normalizedEmail} for Ref: ${bookingRef}`);

    // 3. Trigger the generic mailer (7 arguments)
    const result = await sendBookingReceipt(
      normalizedEmail, 
      flightNumber || "TBA", 
      parkingType || "Luton Airport Parking",
      bookingRef,
      customerPhone || "N/A", 
      carDetails || "Vehicle Details Pending", 
      notes || "No additional notes" 
    );
    
    if (result.success) {
      console.log("✅ Resend success:", result.data);
      return NextResponse.json({ 
        success: true, 
        message: "Confirmation email processed",
        data: result.data 
      });
    } else {
      // Logs the exact Resend error (e.g., 403 Forbidden)
      console.error("❌ Resend API Failure:", result.error);
      return NextResponse.json({ 
        error: "Mailer failed to deliver", 
        details: result.error 
      }, { status: 500 });
    }
    
  } catch (error: any) {
    console.error("🔥 Critical Email Route Error:", error);
    return NextResponse.json({ 
      error: "Internal Server Error", 
      message: error.message 
    }, { status: 500 });
  }
}