import { logger } from "@/app/lib/logger";
import { NextResponse } from "next/server";
import { sendBookingReceipt, sendProviderNotification, sendReviewRequest } from "@/app/lib/mail";
import { Resend } from "resend";
import { createClient } from '@supabase/supabase-js';
import { rateLimit, getClientIp } from "@/app/lib/rateLimit";
import { getAdminUser } from "@/app/lib/adminAuth";

const resend = new Resend(process.env.RESEND_API_KEY);

// Service-role client — server-only. Used to resolve the authoritative booking
// and company records so we never trust customer data supplied by the caller.
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// Escape untrusted values before interpolating them into HTML email bodies.
function escapeHtml(v: unknown): string {
  return String(v ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

// Strip a phone number down to a tel:-safe value.
function toTel(phone: unknown): string {
  return String(phone ?? "").replace(/[^\d+]/g, "");
}

// Resolve the authoritative booking row by its reference. All customer-facing
// mail is addressed to the email stored on this row — never an address passed
// in the request — so this endpoint cannot be used to send branded mail to
// arbitrary recipients.
async function loadBooking(ref: unknown) {
  const bookingRef = String(ref || "").toUpperCase().trim();
  if (!bookingRef) return null;
  const { data } = await supabase
    .from("bookings")
    .select("*")
    .eq("booking_ref", bookingRef)
    .maybeSingle();
  return data;
}

async function loadCompany(companyId: unknown) {
  const id = String(companyId || "");
  if (!id || id === "ALL" || id === "null") return null;
  const { data } = await supabase.from("companies").select("*").eq("id", id).maybeSingle();
  return data;
}

// Generates airport-specific VIP instructions for exclusive bookings.
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

const isExclusiveBooking = (booking: any, company: any) =>
  booking?.service_type?.toLowerCase().includes('exclusive') ||
  company?.name?.toLowerCase().includes('exclusive');

export async function POST(req: Request) {
  const rl = rateLimit(`send:${getClientIp(req)}`, 20, 60_000);
  if (!rl.ok) {
    return NextResponse.json({ success: false, error: "Too many requests." }, { status: 429, headers: { "Retry-After": String(rl.retryAfterSec) } });
  }
  try {
    const body = await req.json();

    // The dashboard-triggered actions are privileged: gate them behind an
    // authenticated admin session before any mail is sent.
    const isPrivileged = Boolean(body.manual_provider_notify || body.manual_customer_notify || body.review_request);
    if (isPrivileged) {
      const admin = await getAdminUser(req);
      if (!admin) {
        return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
      }
    }

    // --- CASE 1: GENERAL CONTACT FORM INQUIRY ---
    // Public. Sent only to our own inbox; the customer's address is reply-to.
    // Plain text, so no HTML-injection surface.
    if (body.message && body.name) {
      const name = String(body.name).slice(0, 120);
      const email = String(body.email || "").slice(0, 160);
      const reference = String(body.reference || "").slice(0, 60);
      const message = String(body.message).slice(0, 4000);

      const result = await resend.emails.send({
        from: 'AeroPark Direct <info@aeroparkdirect.co.uk>',
        to: 'info@aeroparkdirect.co.uk',
        subject: `NEW INQUIRY: ${name} (${reference || 'No Ref'})`,
        replyTo: email || undefined,
        text: `Name: ${name}\nEmail: ${email}\nRef: ${reference}\n\nMessage:\n${message}`,
        tags: [{ name: "category", value: "contact_form" }],
      });

      if (result.error) throw result.error;
      return NextResponse.json({ success: true });
    }

    // --- CASE 5: REVIEW REQUEST (admin only) ---
    if (body.review_request && body.booking) {
      const b = await loadBooking(body.booking?.booking_ref);
      if (!b) return NextResponse.json({ error: "Booking not found" }, { status: 404 });
      const targetEmail = (b.email || "").trim();
      if (!targetEmail) {
        return NextResponse.json({ error: "Booking has no email address" }, { status: 400 });
      }
      const result = await sendReviewRequest(targetEmail, b.full_name || "", b.booking_ref || "");
      if (!result.success) {
        return NextResponse.json({ error: "Failed to send review request" }, { status: 500 });
      }
      return NextResponse.json({ success: true, message: "Review request sent" });
    }

    // --- CASE 3: MANUAL PROVIDER TRIGGER (admin only, dashboard) ---
    if (body.manual_provider_notify && body.booking) {
      const booking = await loadBooking(body.booking?.booking_ref);
      if (!booking) return NextResponse.json({ error: "Booking not found" }, { status: 404 });
      const company = await loadCompany(booking.company_id);

      if (isExclusiveBooking(booking, company)) {
        await resend.emails.send({
          from: 'AeroPark Ops <ops@aeroparkdirect.co.uk>',
          to: company?.email || 'info@aeroparkdirect.co.uk',
          subject: `VIP JOB ALERT: ${escapeHtml(booking.booking_ref)} (BARRIER PRE-PAID)`,
          html: `
            <div style="font-family: sans-serif; max-width: 600px; margin: auto;">
              <h2 style="color: #2563eb;">New VIP Booking Assigned</h2>
              <div style="background: #fee2e2; border: 2px solid #ef4444; padding: 15px; border-radius: 8px; margin: 20px 0;">
                <h3 style="color: #b91c1c; margin-top: 0;">AEROPARK EXCLUSIVE BOOKING</h3>
                <p style="color: #991b1b; font-weight: bold; font-size: 16px;">
                  All barrier and terminal drop-off fees have been PRE-PAID by AeroPark Direct.<br><br>
                  Under NO CIRCUMSTANCES should the customer be asked to pay cash or card at the barrier.
                </p>
              </div>
              <p><strong>Customer:</strong> ${escapeHtml(booking.full_name)}</p>
              <p><strong>Mobile:</strong> ${escapeHtml(booking.phone_number)}</p>
              <p><strong>Car:</strong> ${escapeHtml(booking.car_color)} ${escapeHtml(booking.car_make)} [${escapeHtml(booking.license_plate)}]</p>
              <p><strong>Drop-off:</strong> ${escapeHtml(booking.dropoff_date)} @ ${escapeHtml(booking.dropoff_time)}</p>
              <p><strong>Pick-up:</strong> ${escapeHtml(booking.pickup_date)} @ ${escapeHtml(booking.pickup_time)}</p>
              <p><strong>Terminal:</strong> ${escapeHtml(booking.terminal)}</p>
              <p><strong>Flight:</strong> ${escapeHtml(booking.flight_number)}</p>
            </div>
          `
        });
        return NextResponse.json({ success: true, message: "VIP Provider notification sent" });
      }

      await sendProviderNotification(booking, company);
      return NextResponse.json({ success: true, message: "Manual provider notification sent" });
    }

    // --- CASE 4: MANUAL CUSTOMER TRIGGER (admin only, dashboard) ---
    if (body.manual_customer_notify && body.booking) {
      const booking = await loadBooking(body.booking?.booking_ref);
      if (!booking) return NextResponse.json({ error: "Booking not found" }, { status: 404 });
      const company = await loadCompany(booking.company_id);

      if (isExclusiveBooking(booking, company)) {
        const inst = getExclusiveInstructions(booking);
        const operatorName = company?.name || 'our Premium Partner network';
        const driverPhone = company?.phone_number || company?.phone || company?.contact_number || 'See booking portal for dispatch number';

        await resend.emails.send({
          from: 'AeroPark Direct <bookings@aeroparkdirect.co.uk>',
          to: booking.email,
          subject: `Your VIP Driver Details - AeroPark Exclusive`,
          html: `
            <div style="font-family: sans-serif; color: #333; max-width: 600px; margin: auto;">
              <h2 style="color: #2563eb;">Your VIP Driver is Ready!</h2>
              <p>Dear ${escapeHtml(booking.full_name)},</p>
              <p>Your vehicle has been successfully assigned to <strong>${escapeHtml(operatorName)}</strong>, one of our fully-vetted premium partners. Here are your highly important instructions for <strong>${escapeHtml(booking.airport)}</strong>.</p>

              <div style="background: #f8fafc; padding: 15px; border-radius: 8px; margin: 20px 0; border: 1px solid #e2e8f0;">
                 <h3 style="margin-top: 0; color: #0f172a;">Your Exclusive Perks:</h3>
                 <ul style="margin-bottom: 0;">
                   <li><strong>Zero Hidden Fees:</strong> We have completely covered your airport barrier/drop-off charges. Do not pay them!</li>
                   <li><strong>Hand-Picked Operator:</strong> Your car is being handled by a fully insured, top-rated provider.</li>
                   <li><strong>Priority Support:</strong> You have direct access to our in-house team if your flights change.</li>
                 </ul>
              </div>

              <h3>Arrival Instructions:</h3>
              ${inst.arrival}

              <h3>Return Instructions:</h3>
              ${inst.returnInst}

              <div style="background: #e0f2fe; padding: 15px; border-radius: 8px; margin-top: 25px; border: 1px solid #bae6fd;">
                <p style="margin: 0; font-size: 16px;"><strong>Driver Contact Number:</strong> <a href="tel:${escapeHtml(toTel(driverPhone))}">${escapeHtml(driverPhone)}</a></p>
              </div>
            </div>
          `
        });
        return NextResponse.json({ success: true, message: "VIP Customer dispatch sent" });
      }

      await sendBookingReceipt(booking, company, false);
      return NextResponse.json({ success: true, message: "Manual customer receipt sent" });
    }

    // --- CASE 2: AUTOMATED BOOKING RECEIPT (public, post-payment) ---
    // Always resolves the booking from our database and mails the stored
    // address; the request cannot redirect the receipt to another recipient.
    if (body.booking) {
      const isAmendment = Boolean(body.isAmendment);
      const booking = await loadBooking(body.booking?.booking_ref);
      if (!booking) return NextResponse.json({ error: "Booking not found" }, { status: 404 });

      const targetEmail = (booking.email || "").trim().toLowerCase();
      if (!targetEmail) {
        return NextResponse.json({ error: "Booking has no email address" }, { status: 400 });
      }

      let company = await loadCompany(booking.company_id);
      if (!company) {
        const { data } = await supabase.from('companies').select('*').eq('name', 'AeroPark Direct').maybeSingle();
        company = data;
      }

      const isExclusive = isExclusiveBooking(booking, company);

      // Exclusive bookings get a "matching in progress" holding email rather
      // than the standard receipt with immediate instructions.
      if (isExclusive && !isAmendment) {
        const result = await resend.emails.send({
          from: 'AeroPark Direct <bookings@aeroparkdirect.co.uk>',
          to: targetEmail,
          subject: `Booking Confirmed: AeroPark Direct Exclusive`,
          html: `
            <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; color: #333;">
              <h2 style="color: #2563eb;">Booking Confirmed: AeroPark Exclusive</h2>
              <p>Dear ${escapeHtml(booking.full_name)},</p>
              <p>Thank you for choosing the VIP standard! We have successfully received your booking and payment of <strong>£${escapeHtml(booking.total_price)}</strong>.</p>

              <div style="background: #f8fafc; padding: 20px; border-radius: 8px; margin: 20px 0; border: 1px solid #e2e8f0;">
                <h3 style="margin-top: 0;">What happens next?</h3>
                <p>Our concierge team is currently matching your vehicle with one of our top-rated, fully-vetted parking partners for your dates.</p>
                <p>We will email and text you your dedicated VIP driver's contact number and exact terminal meeting point <strong>very soon</strong>, well ahead of your travel date.</p>
                <p>Rest assured, your airport barrier and drop-off fees are fully covered by us!</p>
              </div>
              <p><strong>Booking Reference:</strong> ${escapeHtml(booking.booking_ref)}</p>
            </div>
          `
        });

        if (result.error) return NextResponse.json({ error: "Resend rejected the request" }, { status: 403 });
        return NextResponse.json({ success: true, data: result.data });
      }

      const result = await sendBookingReceipt(booking, company, isAmendment);

      if (result.success) {
        if (!isAmendment && company && !isExclusive) {
          const allowedPartners = ['APD', '24/7 Meet & Greet', 'Airport Parking Bay'];
          if (allowedPartners.includes(company.name)) {
            await sendProviderNotification(booking, company);
          }
        }
        return NextResponse.json({ success: true, data: result.data });
      } else {
        return NextResponse.json({ error: "Resend rejected the request" }, { status: 403 });
      }
    }

    return NextResponse.json({ error: "Invalid payload format" }, { status: 400 });

  } catch (error: any) {
    logger.error("send route error:", error?.message);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
