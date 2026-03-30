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

    // 1. Normalize the email (Remove spaces and force lowercase)
    const targetEmail = customerEmail?.trim().toLowerCase();

    // 2. Log exactly what we are sending to Resend for debugging
    console.log(`📤 Sending to: "${targetEmail}" | Ref: ${bookingRef}`);

    // 3. Trigger the mailer
    const result = await sendBookingReceipt(
      targetEmail, 
      flightNumber || "TBA", 
      parkingType || "Luton Airport Parking",
      bookingRef,
      customerPhone || "N/A", 
      carDetails || "Vehicle Pending", 
      notes || ""
    );
    
    if (result.success) {
      console.log("✅ Resend accepted the email!");
      return NextResponse.json({ success: true, data: result.data });
    } else {
      // 🛡️ Fixed TypeScript Build Error for Vercel deployment
      const resendError = result.error as any;
      
      console.error("❌ Resend API Rejection:", JSON.stringify(resendError));
      
      return NextResponse.json({ 
        error: "Resend rejected the request", 
        debug_msg: resendError?.message || "Check Resend Dashboard",
        resend_code: resendError?.name || "Validation_Error"
      }, { status: 403 });
    }
  } catch (error: any) {
    console.error("🔥 API Route Crash:", error.message);
    return NextResponse.json({ error: "Server Error", msg: error.message }, { status: 500 });
  }
}