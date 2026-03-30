import { NextResponse } from "next/server";
import { sendBookingReceipt } from "@/app/lib/mail";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    
    // 🔥 Extracting ALL the new fields from the checkout request
    // These must match the keys sent from JSON.stringify in your Checkout page
    const { 
      customerEmail, 
      flightNumber, 
      parkingType, 
      bookingRef, 
      customerPhone, 
      carDetails, 
      notes 
    } = body;

    // 🔥 Calling the mailer with the 7 required arguments
    const result = await sendBookingReceipt(
      customerEmail, 
      flightNumber || "TBA", 
      parkingType || "Luton VIP Parking",
      bookingRef,
      customerPhone || "N/A", 
      carDetails || "Vehicle Details Pending", 
      notes || "" 
    );
    
    // 🛡️ Error Handling based on the Resend Response
    if (result.success) {
      return NextResponse.json({ 
        success: true, 
        message: "Booking receipt sent",
        data: result.data 
      });
    } else {
      // This logs the specific Resend error (like 'unauthorized') to your Vercel console
      console.error("Resend Mailer Error:", result.error);
      return NextResponse.json({ 
        error: "Mailer failed to deliver", 
        details: result.error 
      }, { status: 500 });
    }
    
  } catch (error: any) {
    console.error("Email API Route Crash:", error);
    return NextResponse.json({ 
      error: "Internal Server Error", 
      message: error.message 
    }, { status: 500 });
  }
}