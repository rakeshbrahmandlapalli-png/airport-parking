import { NextResponse } from "next/server";
import { sendBookingReceipt, sendProviderNotification, sendReviewRequest } from "@/app/lib/mail";
import { Resend } from "resend";
import { createClient } from '@supabase/supabase-js'; 

const resend = new Resend(process.env.RESEND_API_KEY);

// 🟢 INITIALIZE SUPABASE CLIENT
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!, 
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

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

    // --- CASE 5: REVIEW REQUEST ---
    if (body.review_request && body.booking) {
      const b = body.booking;
      const targetEmail = (b.email || b.customerEmail)?.trim();
      if (!targetEmail) {
        return NextResponse.json({ error: "Booking has no email address" }, { status: 400 });
      }
      console.log(`⭐ Sending review request to: ${targetEmail} | Ref: ${b.booking_ref}`);
      const result = await sendReviewRequest(targetEmail, b.full_name || "", b.booking_ref || "");
      if (!result.success) {
        return NextResponse.json({ error: "Failed to send review request" }, { status: 500 });
      }
      return NextResponse.json({ success: true, message: "Review request sent" });
    }

    // --- CASE 3: MANUAL PROVIDER TRIGGER ---
    if (body.manual_provider_notify && body.booking) {
      console.log(`🚀 Manually triggering provider email for: ${body.booking.booking_ref}`);
      const { data: company } = await supabase
        .from('companies')
        .select('*')
        .eq('id', body.booking.company_id)
        .maybeSingle();
        
      await sendProviderNotification(body.booking, company);
      return NextResponse.json({ success: true, message: "Manual provider notification sent" });
    }

    // --- CASE 4: MANUAL CUSTOMER TRIGGER ---
    if (body.manual_customer_notify && body.booking) {
      console.log(`🚀 Manually triggering customer receipt for: ${body.booking.booking_ref}`);
      const { data: company } = await supabase
        .from('companies')
        .select('*')
        .eq('id', body.booking.company_id)
        .maybeSingle();
        
      await sendBookingReceipt(body.booking, company, false);
      return NextResponse.json({ success: true, message: "Manual customer receipt sent" });
    }

    // --- CASE 2: AUTOMATED BOOKING RECEIPT / AMENDMENT ---
    if (body.booking) {
      const { booking, isAmendment } = body;
      
      const targetEmail = (booking.email || booking.customerEmail)?.trim().toLowerCase();
      console.log(`📤 Sending Receipt to: "${targetEmail}" | Ref: ${booking.booking_ref}`);

      let company = null;
      
      // 🟢 BULLETPROOF SUPABASE FETCH
      try {
        if (booking.company_id && booking.company_id !== "ALL" && booking.company_id !== "null") {
          const { data } = await supabase
            .from('companies')
            .select('*')
            .eq('id', booking.company_id)
            .maybeSingle();
          company = data;
        }

        if (!company) {
           console.log("⚠️ Missing company_id. Falling back to AeroPark Direct profile.");
           const { data } = await supabase
             .from('companies')
             .select('*')
             .eq('name', 'AeroPark Direct')
             .maybeSingle();
           company = data;
        }
      } catch (dbError: any) {
        console.error("⚠️ Supabase DB Error (Skipping custom instructions):", dbError.message);
        company = null; 
      }

      // 2. Fire the updated email function for the Customer
      const result = await sendBookingReceipt(booking, company, isAmendment || false);
      
      if (result.success) {
        
        // 🟢 PROVIDER NOTIFICATION CHECK
        if (!isAmendment && company) {
          const allowedPartners = ['APD', '24/7 Meet & Greet', 'Airport Parking Bay'];
          
          if (allowedPartners.includes(company.name)) {
            await sendProviderNotification(booking, company);
            console.log(`✅ Provider Notification routed to ${company.name}`);
          } else {
            console.log(`ℹ️ No provider notification sent. ${company.name} is not in the allowed partners list.`);
          }
        }

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