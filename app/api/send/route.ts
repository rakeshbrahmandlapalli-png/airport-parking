import { NextResponse } from "next/server";
import { sendBookingReceipt } from "@/app/lib/mail"; 
import { Resend } from "resend";
import prismadb from "@/app/lib/prismadb"; 

const resend = new Resend(process.env.RESEND_API_KEY);

export async function POST(req: Request) {
  try {
    const body = await req.json();
    
    // --- CASE 1: GENERAL CONTACT FORM INQUIRY ---
    // This goes to YOU (info@aeroparkdirect.co.uk)
    if (body.message && body.name) {
      const { name, email, reference, message } = body;
      
      console.log(`📩 New Contact Inquiry from: ${email}`);

      const result = await resend.emails.send({
        from: 'AeroPark Direct <info@aeroparkdirect.co.uk>', 
        to: 'info@aeroparkdirect.co.uk',
        subject: `NEW INQUIRY: ${name} (${reference || 'No Ref'})`,
        replyTo: email, 
        text: `Name: ${name}\nEmail: ${email}\nRef: ${reference}\n\nMessage:\n${message}`,
        tags: [{ name: "category", value: "contact_form" }],
      });

      if (result.error) throw result.error;
      return NextResponse.json({ success: true });
    }

    // --- CASE 2: BOOKING RECEIPT / AMENDMENT ---
    // This goes to the CUSTOMER
    if (body.booking) {
      const { booking, isAmendment } = body;
      
      const targetEmail = (booking.email || booking.customerEmail)?.trim().toLowerCase();
      console.log(`📤 Sending Receipt to: "${targetEmail}" | Ref: ${booking.booking_ref}`);

      // 1. Fetch the Company to get the correct Parking Instructions
      let company = null;
      
      // 🟢 FIXED: Safely bypass "ALL" so Prisma doesn't crash on Direct Bookings
      if (booking.company_id && booking.company_id !== "ALL") {
        try {
          company = await prismadb.companies.findUnique({ 
            where: { id: booking.company_id } 
          });
        } catch (e) {
          console.error("Could not fetch company instructions, using defaults.");
        }
      }

      // 2. Fire the updated email function
      const result = await sendBookingReceipt(booking, company, isAmendment || false);
      
      if (result.success) {
        return NextResponse.json({ success: true, data: result.data });
      } else {
        const resendError = result.error as any;
        return NextResponse.json({ 
          error: "Resend rejected the request", 
          debug_msg: resendError?.message || "Check Resend Dashboard"
        }, { status: 403 });
      }
    }

    // If neither case matches
    return NextResponse.json({ error: "Invalid payload format" }, { status: 400 });

  } catch (error: any) {
    console.error("🔥 API Route Crash:", error.message);
    return NextResponse.json({ error: "Server Error", msg: error.message }, { status: 500 });
  }
}