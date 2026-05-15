// @ts-nocheck
import { NextResponse } from "next/server";
import { sendBookingReceipt } from "@/app/lib/mail"; 
import { Resend } from "resend";
import { createClient } from '@supabase/supabase-js';

const resend = new Resend(process.env.RESEND_API_KEY!);
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!);

export async function POST(req: Request) {
  try {
    const body = await req.json();
    
    // --- CASE 1: CONTACT FORM ---
    if (body.message && body.name) {
      const { name, email, reference, message } = body;
      const result = await resend.emails.send({
        from: 'AeroPark Direct <info@aeroparkdirect.co.uk>', 
        to: 'info@aeroparkdirect.co.uk',
        subject: `NEW INQUIRY: ${name} (${reference || 'No Ref'})`,
        replyTo: email, 
        text: `Name: ${name}\nEmail: ${email}\nRef: ${reference}\n\nMessage:\n${message}`,
      });
      if (result.error) throw result.error;
      return NextResponse.json({ success: true });
    }

    // --- CASE 2: BOOKING RECEIPT ---
    if (body.booking) {
      const { booking, isAmendment } = body;
      let company = null;
      
      // 🟢 BYPASS PRISMA: Fetch company directly via Supabase
      try {
        if (booking.company_id && booking.company_id !== "ALL" && booking.company_id !== "null") {
          const { data } = await supabase.from('companies').select('*').eq('id', booking.company_id).single();
          company = data;
        }
      } catch (e) {
        console.error("Supabase fetch error, using defaults");
      }

      const result = await sendBookingReceipt(booking, company, isAmendment || false);
      
      if (result.success) {
        return NextResponse.json({ success: true, data: result.data });
      } else {
        return NextResponse.json({ error: "Resend rejected the request" }, { status: 403 });
      }
    }

    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });

  } catch (error: any) {
    console.error("🔥 API Route Crash:", error.message);
    return NextResponse.json({ error: "Server Error", msg: error.message }, { status: 500 });
  }
}