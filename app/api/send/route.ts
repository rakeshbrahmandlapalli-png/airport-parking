import { NextResponse } from "next/server";
import { sendBookingReceipt } from "@/app/lib/mail"; 
import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

export async function POST(req: Request) {
  try {
    const body = await req.json();
    
    // --- CASE 1: GENERAL CONTACT FORM INQUIRY ---
    // This goes to YOU (info@aeroparkdirect.co.uk)
    if (body.message) {
      const { name, email, reference, message } = body;
      
      console.log(`📩 New Contact Inquiry from: ${email}`);

      const result = await resend.emails.send({
        // 🔥 Now using your verified domain for maximum trust
        from: 'AeroPark Direct <info@aeroparkdirect.co.uk>', 
        to: 'info@aeroparkdirect.co.uk',
        subject: `NEW INQUIRY: ${name} (${reference || 'No Ref'})`,
        replyTo: email, // Click 'Reply' in your inbox to email the customer back directly
        text: `Name: ${name}\nEmail: ${email}\nRef: ${reference}\n\nMessage:\n${message}`,
        tags: [{ name: "category", value: "contact_form" }],
      });

      if (result.error) throw result.error;
      return NextResponse.json({ success: true });
    }

    // --- CASE 2: BOOKING RECEIPT ---
    // This goes to the CUSTOMER
    const { 
      customerEmail, 
      flightNumber, 
      parkingType, 
      bookingRef, 
      customerPhone, 
      carDetails, 
      notes,
      airport,
      terminal 
    } = body;

    const targetEmail = customerEmail?.trim().toLowerCase();
    console.log(`📤 Sending Receipt to: "${targetEmail}" | Ref: ${bookingRef}`);

    const result = await sendBookingReceipt(
      targetEmail, 
      flightNumber || "TBA", 
      parkingType || "Premium Meet & Greet",
      bookingRef,
      customerPhone || "N/A", 
      carDetails || "Vehicle Pending", 
      notes || "",
      airport || "Luton Airport (LTN)",
      terminal || "Main Terminal"
    );
    
    if (result.success) {
      return NextResponse.json({ success: true, data: result.data });
    } else {
      const resendError = result.error as any;
      return NextResponse.json({ 
        error: "Resend rejected the request", 
        debug_msg: resendError?.message || "Check Resend Dashboard"
      }, { status: 403 });
    }

  } catch (error: any) {
    console.error("🔥 API Route Crash:", error.message);
    return NextResponse.json({ error: "Server Error", msg: error.message }, { status: 500 });
  }
}