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

    // We pass all 7 arguments. If optional ones are missing, we provide a clean string.
    const result = await sendBookingReceipt(
      customerEmail, 
      flightNumber || "TBA", 
      parkingType || "Standard Parking",
      bookingRef,
      customerPhone || "N/A", // Fallback if phone is missing
      carDetails || "Vehicle details pending", // Fallback if car details are missing
      notes || "" // Fallback if no notes provided
    );
    
    // Check if the mailer actually succeeded
    if (result.success) {
      return NextResponse.json({ success: true, data: result.data });
    } else {
      console.error("Mailer reported failure:", result.error);
      return NextResponse.json({ error: "Mailer failed to deliver" }, { status: 500 });
    }
    
  } catch (error) {
    console.error("Email API Route Error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}