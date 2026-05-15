import { NextResponse } from "next/server";
import { sendBookingReceipt } from "@/app/lib/mail"; 
import { Resend } from "resend";
import prismadb from "@/app/lib/prismadb"; 

const resend = new Resend(process.env.RESEND_API_KEY);

export async function POST(req: Request) {
  try {
    const body = await req.json();
    
    // --- CASE 1: GENERAL CONTACT FORM INQUIRY ---
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
    if (body.booking) {
      const { booking, isAmendment } = body;
      
      const targetEmail = (booking.email || booking.customerEmail)?.trim().toLowerCase();
      console.log(`📤 Sending Receipt to: "${targetEmail}" | Ref: ${booking.booking_ref}`);

      let company = null;
      
      // 🟢 BULLETPROOF DATABASE FETCH
      // If Prisma crashes here, the catch block ensures the email still sends!
      try {
        if (booking.company_id && booking.company_id !== "ALL" && booking.company_id !== "null") {
          company = await prismadb.companies.findUnique({ 
            where: { id: booking.company_id } 
          });
        }

        if (!company) {
           console.log("⚠️ Missing company_id. Falling back to AeroPark Direct profile.");
           // Removed 'insensitive' search just in case your database version rejects it
           company = await prismadb.companies.findFirst({
              where: { name: "AeroPark Direct" }
           });
        }
      } catch (dbError: any) {
        console.error("⚠️ Prisma DB Error (Skipping custom instructions):", dbError.message);
        company = null; // Force null so the email sends with standard defaults
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

    return NextResponse.json({ error: "Invalid payload format" }, { status: 400 });

  } catch (error: any) {
    console.error("🔥 API Route Crash:", error.message);
    return NextResponse.json({ error: "Server Error", msg: error.message }, { status: 500 });
  }
}