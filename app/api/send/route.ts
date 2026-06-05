import { NextResponse } from "next/server";
import { sendBookingReceipt, sendProviderNotification, sendReviewRequest } from "@/app/lib/mail";
import { Resend } from "resend";
import { createClient } from '@supabase/supabase-js';
import { rateLimit, getClientIp } from "@/app/lib/rateLimit";

const resend = new Resend(process.env.RESEND_API_KEY);

// 🟢 INITIALIZE SUPABASE CLIENT
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!, 
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// 🟢 HELPER FUNCTION: GENERATES AIRPORT-SPECIFIC VIP INSTRUCTIONS
function getExclusiveInstructions(booking: any) {
  const airport = (booking.airport || '').toLowerCase();
  const service = (booking.service_type || '').toLowerCase();
  
  let arrival = '';
  let returnInst = '';

  if (airport.includes('luton')) {
    arrival = `
      <ol style="padding-left: 20px;">
        <li style="margin-bottom: 8px;">Call your dedicated VIP driver 20-30 minutes before arriving at Luton Airport.</li>
        <li style="margin-bottom: 8px;">Follow the signs for Terminal Car Park 1 (or as directed by your driver).</li>
        <li style="margin-bottom: 8px;">Your fully insured driver will conduct a vehicle check and take your keys.</li>
        <li style="margin-bottom: 8px;"><strong style="color:#10b981;">VIP Perk:</strong> Do NOT pay the barrier fee! AeroPark Direct covers the £10 drop-off charge on your behalf. Simply hand over your keys and walk to check-in.</li>
      </ol>`;
    returnInst = `
      <ol style="padding-left: 20px;">
        <li style="margin-bottom: 8px;">Once you have landed and collected your luggage, call your driver.</li>
        <li style="margin-bottom: 8px;">Walk back to the designated Meet & Greet collection point.</li>
        <li style="margin-bottom: 8px;"><strong style="color:#10b981;">VIP Perk:</strong> Your exit barrier fee is fully covered. Just load your bags and drive home safely.</li>
      </ol>`;
  } else if (airport.includes('heathrow')) {
    if (service.includes('park & ride') || service.includes('park and ride')) {
      arrival = `
        <ol style="padding-left: 20px;">
          <li style="margin-bottom: 8px;">Drive to the secure compound address provided by our premium operator below.</li>
          <li style="margin-bottom: 8px;">Check in at the reception desk and hand over your keys.</li>
          <li style="margin-bottom: 8px;"><strong style="color:#10b981;">VIP Perk:</strong> Board the priority shuttle bus. You will be dropped right at your terminal doors in minutes.</li>
        </ol>`;
      returnInst = `
        <ol style="padding-left: 20px;">
          <li style="margin-bottom: 8px;">Once you have collected your luggage, call the shuttle dispatch number.</li>
          <li style="margin-bottom: 8px;">Head to the designated bus stop right outside the terminal arrivals.</li>
          <li style="margin-bottom: 8px;">The shuttle will take you straight back to the secure compound where your car is ready and waiting.</li>
        </ol>`;
    } else {
      arrival = `
        <ol style="padding-left: 20px;">
          <li style="margin-bottom: 8px;">Call your dedicated VIP driver 20-30 minutes before reaching your Heathrow departure terminal.</li>
          <li style="margin-bottom: 8px;">Drive directly to the Short Stay car park drop-off zone as instructed by your driver.</li>
          <li style="margin-bottom: 8px;">Your vetted driver will inspect your vehicle and securely park it in a police-approved facility.</li>
          <li style="margin-bottom: 8px;"><strong style="color:#10b981;">VIP Perk:</strong> Do NOT worry about the £5 Heathrow Terminal Drop-Off Charge (TDOC). AeroPark Direct automatically pays this ANPR camera fee for you.</li>
        </ol>`;
      returnInst = `
        <ol style="padding-left: 20px;">
          <li style="margin-bottom: 8px;">Once you clear customs and have your luggage, call your driver.</li>
          <li style="margin-bottom: 8px;">Make your way to the Short Stay collection point at your terminal.</li>
          <li style="margin-bottom: 8px;">Your driver will return your vehicle so you can head straight home.</li>
        </ol>`;
    }
  } else {
    arrival = `<p>Please call your driver 20 minutes before arrival at the airport drop-off zone.</p>`;
    returnInst = `<p>Please call your driver once you have collected your luggage.</p>`;
  }

  return { arrival, returnInst };
}


export async function POST(req: Request) {
  const rl = rateLimit(`send:${getClientIp(req)}`, 20, 60_000);
  if (!rl.ok) {
    return NextResponse.json({ success: false, error: "Too many requests." }, { status: 429, headers: { "Retry-After": String(rl.retryAfterSec) } });
  }
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

    // --- CASE 3: MANUAL PROVIDER TRIGGER (Dashboard "Briefcase" Button) ---
    if (body.manual_provider_notify && body.booking) {
      console.log(`🚀 Manually triggering provider email for: ${body.booking.booking_ref}`);
      const { data: company } = await supabase.from('companies').select('*').eq('id', body.booking.company_id).maybeSingle();
        
      const isExclusive = body.booking.service_type?.toLowerCase().includes('exclusive') || company?.name?.toLowerCase().includes('exclusive');

      // 🟢 IF EXCLUSIVE: Intercept and send a MASSIVE RED WARNING to the operator
      if (isExclusive) {
        await resend.emails.send({
          from: 'AeroPark Ops <ops@aeroparkdirect.co.uk>',
          to: company?.email || 'info@aeroparkdirect.co.uk',
          subject: `VIP JOB ALERT: ${body.booking.booking_ref} (BARRIER PRE-PAID) 🚨`,
          html: `
            <div style="font-family: sans-serif; max-width: 600px; margin: auto;">
              <h2 style="color: #2563eb;">New VIP Booking Assigned</h2>
              <div style="background: #fee2e2; border: 2px solid #ef4444; padding: 15px; border-radius: 8px; margin: 20px 0;">
                <h3 style="color: #b91c1c; margin-top: 0;">⚠️ AEROPARK EXCLUSIVE BOOKING ⚠️</h3>
                <p style="color: #991b1b; font-weight: bold; font-size: 16px;">
                  All barrier and terminal drop-off fees have been PRE-PAID by AeroPark Direct.<br><br>
                  Under NO CIRCUMSTANCES should the customer be asked to pay cash or card at the barrier.
                </p>
              </div>
              <p><strong>Customer:</strong> ${body.booking.full_name}</p>
              <p><strong>Mobile:</strong> ${body.booking.phone_number}</p>
              <p><strong>Car:</strong> ${body.booking.car_color} ${body.booking.car_make} [${body.booking.license_plate}]</p>
              <p><strong>Drop-off:</strong> ${body.booking.dropoff_date} @ ${body.booking.dropoff_time}</p>
              <p><strong>Pick-up:</strong> ${body.booking.pickup_date} @ ${body.booking.pickup_time}</p>
              <p><strong>Terminal:</strong> ${body.booking.terminal}</p>
              <p><strong>Flight:</strong> ${body.booking.flight_number}</p>
            </div>
          `
        });
        return NextResponse.json({ success: true, message: "VIP Provider notification sent" });
      }

      // If standard booking, use normal template
      await sendProviderNotification(body.booking, company);
      return NextResponse.json({ success: true, message: "Manual provider notification sent" });
    }

    // --- CASE 4: MANUAL CUSTOMER TRIGGER (Dashboard "Receipt" Button) ---
    if (body.manual_customer_notify && body.booking) {
      console.log(`🚀 Manually triggering customer dispatch for: ${body.booking.booking_ref}`);
      const { data: company } = await supabase.from('companies').select('*').eq('id', body.booking.company_id).maybeSingle();
        
      const isExclusive = body.booking.service_type?.toLowerCase().includes('exclusive') || company?.name?.toLowerCase().includes('exclusive');

      // 🟢 IF EXCLUSIVE: Send the VIP Instructions with the assigned operator's phone number
      if (isExclusive) {
        const inst = getExclusiveInstructions(body.booking);
        const operatorName = company?.name || 'our Premium Partner network';
        const driverPhone = company?.phone_number || company?.phone || company?.contact_number || 'See booking portal for dispatch number';

        await resend.emails.send({
          from: 'AeroPark Direct <bookings@aeroparkdirect.co.uk>',
          to: body.booking.email,
          subject: `Your VIP Driver Details - AeroPark Exclusive 👑`,
          html: `
            <div style="font-family: sans-serif; color: #333; max-width: 600px; margin: auto;">
              <h2 style="color: #2563eb;">Your VIP Driver is Ready!</h2>
              <p>Dear ${body.booking.full_name},</p>
              <p>Your vehicle has been successfully assigned to <strong>${operatorName}</strong>, one of our fully-vetted premium partners. Here are your highly important instructions for <strong>${body.booking.airport}</strong>.</p>
              
              <div style="background: #f8fafc; padding: 15px; border-radius: 8px; margin: 20px 0; border: 1px solid #e2e8f0;">
                 <h3 style="margin-top: 0; color: #0f172a;">Your Exclusive Perks:</h3>
                 <ul style="margin-bottom: 0;">
                   <li>✅ <strong>Zero Hidden Fees:</strong> We have completely covered your airport barrier/drop-off charges. Do not pay them!</li>
                   <li>✅ <strong>Hand-Picked Operator:</strong> Your car is being handled by a fully insured, top-rated provider.</li>
                   <li>✅ <strong>Priority Support:</strong> You have direct access to our in-house team if your flights change.</li>
                 </ul>
              </div>

              <h3>Arrival Instructions:</h3>
              ${inst.arrival}

              <h3>Return Instructions:</h3>
              ${inst.returnInst}
              
              <div style="background: #e0f2fe; padding: 15px; border-radius: 8px; margin-top: 25px; border: 1px solid #bae6fd;">
                <p style="margin: 0; font-size: 16px;"><strong>Driver Contact Number:</strong> <a href="tel:${driverPhone}">${driverPhone}</a></p>
              </div>
            </div>
          `
        });
        return NextResponse.json({ success: true, message: "VIP Customer dispatch sent" });
      }

      // If standard booking, use normal template
      await sendBookingReceipt(body.booking, company, false);
      return NextResponse.json({ success: true, message: "Manual customer receipt sent" });
    }

    // --- CASE 2: AUTOMATED BOOKING RECEIPT (Immediately after Stripe payment) ---
    if (body.booking) {
      const { booking, isAmendment } = body;
      
      const targetEmail = (booking.email || booking.customerEmail)?.trim().toLowerCase();
      console.log(`📤 Sending Receipt to: "${targetEmail}" | Ref: ${booking.booking_ref}`);

      let company = null;
      
      // 🟢 BULLETPROOF SUPABASE FETCH
      try {
        if (booking.company_id && booking.company_id !== "ALL" && booking.company_id !== "null") {
          const { data } = await supabase.from('companies').select('*').eq('id', booking.company_id).maybeSingle();
          company = data;
        }

        if (!company) {
           console.log("⚠️ Missing company_id. Falling back to AeroPark Direct profile.");
           const { data } = await supabase.from('companies').select('*').eq('name', 'AeroPark Direct').maybeSingle();
           company = data;
        }
      } catch (dbError: any) {
        console.error("⚠️ Supabase DB Error:", dbError.message);
        company = null; 
      }

      const isExclusive = booking.service_type?.toLowerCase().includes('exclusive') || company?.name?.toLowerCase().includes('exclusive');

      // 🟢 IF EXCLUSIVE: Intercept the automated checkout receipt and send the "Matching" email
      if (isExclusive && !isAmendment) {
        const result = await resend.emails.send({
          from: 'AeroPark Direct <bookings@aeroparkdirect.co.uk>',
          to: targetEmail,
          subject: `Booking Confirmed: AeroPark Direct Exclusive 👑`,
          html: `
            <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; color: #333;">
              <h2 style="color: #2563eb;">Booking Confirmed: AeroPark Exclusive</h2>
              <p>Dear ${booking.full_name},</p>
              <p>Thank you for choosing the VIP standard! We have successfully received your booking and payment of <strong>£${booking.total_price}</strong>.</p>
              
              <div style="background: #f8fafc; padding: 20px; border-radius: 8px; margin: 20px 0; border: 1px solid #e2e8f0;">
                <h3 style="margin-top: 0;">What happens next?</h3>
                <p>Our concierge team is currently matching your vehicle with one of our top-rated, fully-vetted parking partners for your dates.</p>
                <p>We will email and text you your dedicated VIP driver's contact number and exact terminal meeting point <strong>24 hours before your flight</strong>.</p>
                <p>Rest assured, your airport barrier and drop-off fees are fully covered by us!</p>
              </div>
              <p><strong>Booking Reference:</strong> ${booking.booking_ref}</p>
            </div>
          `
        });

        if (result.error) return NextResponse.json({ error: "Resend rejected the request" }, { status: 403 });
        return NextResponse.json({ success: true, data: result.data });
      }

      // If Standard Booking: Fire the standard email function
      const result = await sendBookingReceipt(booking, company, isAmendment || false);
      
      if (result.success) {
        // 🟢 PROVIDER NOTIFICATION CHECK
        if (!isAmendment && company && !isExclusive) {
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
        return NextResponse.json({ error: "Resend rejected the request", debug_msg: resendError?.message || "Check Resend Dashboard" }, { status: 403 });
      }
    }

    return NextResponse.json({ error: "Invalid payload format" }, { status: 400 });

  } catch (error: any) {
    console.error("🔥 API Route Crash:", error.message);
    return NextResponse.json({ error: "Server Error", msg: error.message }, { status: 500 });
  }
}