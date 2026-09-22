import { logger } from "@/app/lib/logger";
import { NextResponse } from "next/server";
import { sendBookingReceipt, sendProviderNotification, sendReviewRequest } from "@/app/lib/mail";
import { sendReviewRequestSMS } from "@/app/lib/twilio";
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

// `fees_covered` is decided once, at booking creation, from what was actually
// bought (see app/api/webhook/route.ts) — it survives a later reassignment to
// a normal operator, unlike the service_type/company checks below, which stop
// being true the moment an Exclusive booking is transferred off "AeroPark
// Exclusive". Without it, transferring an Exclusive booking silently dropped
// the "your barrier fee is covered" promise the customer paid for.
const isExclusiveBooking = (booking: any, company: any) =>
  booking?.fees_covered === true ||
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
    const isPrivileged = Boolean(body.manual_provider_notify || body.manual_customer_notify || body.review_request || body.review_request_sms);
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

    // --- CASE 5b: REVIEW REQUEST BY SMS (admin only) ---
    if (body.review_request_sms && body.booking) {
      const b = await loadBooking(body.booking?.booking_ref);
      if (!b) return NextResponse.json({ error: "Booking not found" }, { status: 404 });
      if (!(b.phone_number || "").trim()) {
        return NextResponse.json({ error: "Booking has no phone number" }, { status: 400 });
      }
      const result = await sendReviewRequestSMS(b);
      if (!result.success) {
        return NextResponse.json({ error: result.error || "Failed to send review SMS" }, { status: 500 });
      }
      return NextResponse.json({ success: true, message: "Review SMS sent" });
    }

    // --- CASE 3: MANUAL PROVIDER TRIGGER (admin only, dashboard) ---
    // One template here too (see CASE 4) — sendProviderNotification already
    // shows the pre-paid/priority note and the covered-fee payout split for a
    // fees_covered booking (app/lib/mail.ts), in the same plain, professional
    // shell as every other operator email, instead of a separate red-alert one.
    if (body.manual_provider_notify && body.booking) {
      const booking = await loadBooking(body.booking?.booking_ref);
      if (!booking) return NextResponse.json({ error: "Booking not found" }, { status: 404 });
      const company = await loadCompany(booking.company_id);

      await sendProviderNotification(booking, company);
      return NextResponse.json({ success: true, message: "Manual provider notification sent" });
    }

    // --- CASE 4: MANUAL CUSTOMER TRIGGER (admin only, dashboard) ---
    // One template for everyone, including fee-covered/Exclusive bookings —
    // it already pulls the REAL assigned operator's instructions, address and
    // phone; a separate generic "VIP" template used to paper over that with
    // scripted text that didn't match what the operator actually does.
    // ReceiptHtmlParams.feesCovered (set from booking.fees_covered in
    // sendBookingReceipt) swaps the "not included" fee note for a "covered"
    // one instead. See app/lib/receiptEmail.ts.
    if (body.manual_customer_notify && body.booking) {
      const booking = await loadBooking(body.booking?.booking_ref);
      if (!booking) return NextResponse.json({ error: "Booking not found" }, { status: 404 });
      const company = await loadCompany(booking.company_id);

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
