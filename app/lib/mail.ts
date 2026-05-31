import { Resend } from "resend";
import { createClient } from "@supabase/supabase-js";

// ─── CLIENTS ──────────────────────────────────────────────────────────────────

if (!process.env.RESEND_API_KEY)               throw new Error("RESEND_API_KEY is not set");
if (!process.env.NEXT_PUBLIC_SUPABASE_URL)     throw new Error("NEXT_PUBLIC_SUPABASE_URL is not set");
if (!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) throw new Error("NEXT_PUBLIC_SUPABASE_ANON_KEY is not set");

const resend = new Resend(process.env.RESEND_API_KEY);

// NOTE: uses anon key — only for fallback company look-ups (public read).
// If your RLS is strict, swap for SUPABASE_SERVICE_ROLE_KEY here.
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

// Fast-track price kept in sync with the checkout route constant
const FAST_TRACK_PRICE = 8.00;

// ─── HELPERS ──────────────────────────────────────────────────────────────────

/**
 * Format a YYYY-MM-DD date string into a human-readable date.
 * FIX: parses as local date to avoid UTC midnight shifting the day in GMT+1.
 */
function formatEmailDate(dateStr: string | null | undefined): string {
  if (!dateStr) return "TBC";
  const parts = dateStr.split("-").map(Number);
  if (parts.length !== 3 || parts.some(isNaN)) return dateStr;
  const [y, m, d] = parts;
  return new Date(y, m - 1, d).toLocaleDateString("en-GB", {
    weekday: "short", day: "numeric", month: "short",
  });
}

/**
 * Normalise a phone number string into a tel: href value.
 * FIX: strips all whitespace AND common separators so href="tel:+447..." works.
 */
function toTelLink(phone: string): string {
  return phone.replace(/[\s\-().]/g, "");
}

/**
 * Safely coerce a value to a non-empty string, returning a fallback otherwise.
 */
function str(v: unknown, fallback = "N/A"): string {
  const s = String(v ?? "").trim();
  return s || fallback;
}

/**
 * Resolve a booking email address from the booking row, consistently.
 * FIX: the original mixed booking.email and booking.customerEmail in several places.
 */
function resolveEmail(booking: any): string {
  return (booking.email || booking.customerEmail || "").trim().toLowerCase();
}

// ─── COMPANY RESOLVER ─────────────────────────────────────────────────────────

/**
 * If the caller didn't pass a company object, look it up from Supabase.
 * Falls back to a generic "Airport Parking Bay" record for test bookings.
 */
async function resolveCompany(booking: any, passedCompany: any): Promise<any> {
  if (passedCompany) return passedCompany;

  console.warn("⚠️ Mailer: company object missing — fetching from DB.");

  try {
    if (booking.company_id && String(booking.company_id) !== "null") {
      const { data } = await supabase
        .from("companies")
        .select("*")
        .eq("id", booking.company_id)
        .maybeSingle();
      if (data) return data;
    }

    // Last-resort fallback for test bookings
    const { data } = await supabase
      .from("companies")
      .select("*")
      .ilike("name", "%Airport Parking Bay%")
      .maybeSingle();
    return data ?? null;
  } catch (e) {
    console.error("Company self-repair failed:", e);
    return null;
  }
}

// ─── SEND BOOKING RECEIPT ─────────────────────────────────────────────────────

/**
 * Sends a polished, mobile-responsive booking confirmation or amendment email.
 */
export async function sendBookingReceipt(
  booking: any,
  passedCompany: any,
  isAmendment = false
): Promise<{ success: boolean; data?: any; error?: any }> {
  try {
    const company = await resolveCompany(booking, passedCompany);

    const isLuton = booking.airport?.toLowerCase().includes("luton");

    // Terminal lookup
    const terminalKey = str(booking.terminal, isLuton ? "Main Terminal" : "Terminal 2");
    const terminalInfo = company?.terminal_data?.[terminalKey];

    // Instructions — FIX: canonicalised field names in priority order
    const arrivalInstructions = isLuton
      ? (company?.on_arrival_ltn || company?.on_arrival || "Please call the driver 20 minutes before arrival.")
      : (company?.on_arrival_lhr || company?.on_arrival || "Please call the driver 20 minutes before arrival.");

    const returnInstructions = isLuton
      ? (company?.on_return_ltn || company?.on_return || "Call dispatch after collecting your luggage.")
      : (company?.on_return_lhr || company?.on_return || "Call dispatch after collecting your luggage.");

    // Address & map
    const displayAddress  = terminalInfo?.address  || company?.address  || "Terminal Location";
    const displayPostcode = terminalInfo?.postcode  || company?.postcode || "";

    // FIX: if there is a specific terminal map_url use it; otherwise build a generic Google Maps link
    const mapsLink = terminalInfo?.map_url
      || `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
           `${str(company?.name, "Airport Parking")} ${displayAddress} ${displayPostcode}`.trim()
         )}`;

    // Phones — FIX: use canonical db field names (phone_number / phone_number_2)
    const phone1     = str(company?.phone_number,   "07397705005");
    const phone2     = str(company?.phone_number_2, "");
    const phone1Link = toTelLink(phone1);
    const phone2Link = toTelLink(phone2);

    // Dates & times — FIX: use only canonical snake_case field names
    const dropDate = formatEmailDate(booking.dropoff_date);
    const pickDate = formatEmailDate(booking.pickup_date);
    const dropTime = str(booking.dropoff_time, "TBC");
    const pickTime = str(booking.pickup_time,  "TBC");

    const licencePlate = str(booking.license_plate);

    const statusText  = isAmendment ? "Updated"   : "Confirmed";
    const statusColor = isAmendment ? "#3b82f6"   : "#059669";
    const statusBg    = isAmendment ? "#eff6ff"   : "#ecfdf5";

    const recipientEmail = resolveEmail(booking);
    if (!recipientEmail) {
      console.error("sendBookingReceipt: no recipient email on booking", booking.booking_ref);
      return { success: false, error: "No recipient email" };
    }

    const { data, error } = await resend.emails.send({
      from:    "AeroPark Direct <info@aeroparkdirect.co.uk>",
      to:      [recipientEmail],
      bcc:     ["aeroparkdirect.co.uk+c6f8c1b490@invite.trustpilot.com"],
      // FIX: subject used booking.licensePlate (camelCase) — swapped to canonical
      subject: `✈️ Booking ${statusText}: ${booking.booking_ref} [${licencePlate}]`,
      html: buildReceiptHtml({
        booking, company, isAmendment,
        terminalKey, displayAddress, displayPostcode, mapsLink,
        phone1, phone2, phone1Link, phone2Link,
        arrivalInstructions, returnInstructions,
        dropDate, pickDate, dropTime, pickTime,
        licencePlate, statusText, statusColor, statusBg,
      }),
    });

    if (error) {
      console.error("Resend error (sendBookingReceipt):", error);
      return { success: false, error };
    }
    return { success: true, data };
  } catch (err) {
    console.error("sendBookingReceipt unhandled error:", err);
    return { success: false, error: err };
  }
}

// ─── HTML BUILDER ─────────────────────────────────────────────────────────────
// FIX: extracted from the function body so the main logic isn't buried in a
//      template literal. Easier to diff and maintain.

interface ReceiptHtmlParams {
  booking: any;
  company: any;
  isAmendment: boolean;
  terminalKey: string;
  displayAddress: string;
  displayPostcode: string;
  mapsLink: string;
  phone1: string;
  phone2: string;
  phone1Link: string;
  phone2Link: string;
  arrivalInstructions: string;
  returnInstructions: string;
  dropDate: string;
  pickDate: string;
  dropTime: string;
  pickTime: string;
  licencePlate: string;
  statusText: string;
  statusColor: string;
  statusBg: string;
}

function buildReceiptHtml(p: ReceiptHtmlParams): string {
  const phone2Button = p.phone2
    ? `<a href="tel:${p.phone2Link}" style="display:inline-block;background-color:#334155;color:#fff;text-decoration:none;padding:8px 15px;border-radius:6px;font-weight:800;font-size:12px;">📞 ${p.phone2}</a>`
    : "";

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1.0">
</head>
<body style="font-family:-apple-system,system-ui,sans-serif;background-color:#f8fafc;margin:0;padding:0;">
<table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#f8fafc;">
  <tr>
    <td align="center" style="padding:40px 20px;">
      <table width="600" cellpadding="0" cellspacing="0" border="0" style="background-color:#fff;border-radius:24px;border:1px solid #e2e8f0;overflow:hidden;box-shadow:0 4px 6px -1px rgba(0,0,0,.1);">

        <!-- Header -->
        <tr>
          <td style="background-color:#0f172a;padding:40px 30px;text-align:center;border-bottom:4px solid #2563eb;">
            <h1 style="color:#fff;margin:0;font-size:28px;letter-spacing:-1px;font-weight:900;">AEROPARK<span style="color:#3b82f6;">DIRECT</span></h1>
          </td>
        </tr>

        <!-- Body -->
        <tr>
          <td style="padding:40px 30px;">

            <!-- Status & Ref -->
            <div style="text-align:center;margin-bottom:30px;">
              <span style="background-color:${p.statusBg};color:${p.statusColor};padding:6px 16px;border-radius:20px;font-size:11px;font-weight:900;text-transform:uppercase;">✓ ${p.statusText}</span>
              <h2 style="margin:20px 0;font-size:42px;color:#0f172a;font-family:monospace;letter-spacing:4px;font-weight:900;">${p.booking.booking_ref}</h2>
            </div>

            <!-- Info card -->
            <div style="background-color:#f8fafc;border:1px solid #e2e8f0;border-radius:20px;padding:25px;margin-bottom:30px;">
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td style="padding-bottom:20px;">
                    <p style="margin:0;font-size:10px;color:#64748b;text-transform:uppercase;font-weight:900;">Airport &amp; Terminal</p>
                    <p style="margin:4px 0 0 0;font-size:18px;font-weight:900;color:#0f172a;">${p.booking.airport} • ${p.terminalKey}</p>
                  </td>
                </tr>
                <tr>
                  <td width="50%">
                    <p style="margin:0;font-size:10px;color:#64748b;text-transform:uppercase;font-weight:900;">Registration</p>
                    <p style="margin:4px 0 0 0;font-size:16px;font-weight:900;color:#0f172a;">${p.licencePlate}</p>
                  </td>
                  <td width="50%">
                    <p style="margin:0;font-size:10px;color:#64748b;text-transform:uppercase;font-weight:900;">Service Provider</p>
                    <p style="margin:4px 0 0 0;font-size:14px;font-weight:700;color:#334155;">${str(p.company?.name, "AeroPark Direct")}</p>
                  </td>
                </tr>
              </table>
            </div>

            <!-- Concierge block -->
            <div style="background-color:#0f172a;border-radius:20px;padding:24px;color:#fff;">
              <h3 style="font-size:14px;font-weight:900;margin:0 0 20px 0;text-transform:uppercase;letter-spacing:1px;border-bottom:1px solid #334155;padding-bottom:15px;">Aero Concierge System</h3>

              <!-- Inbound -->
              <div style="background-color:#1e293b;border-left:4px solid #3b82f6;border-radius:8px;padding:15px;margin-bottom:15px;">
                <p style="margin:0 0 5px 0;font-size:11px;font-weight:900;color:#3b82f6;text-transform:uppercase;">Inbound • ${p.terminalKey} • ${p.dropDate} @ ${p.dropTime}</p>
                <p style="margin:0 0 10px 0;font-size:13px;font-weight:700;color:#fff;">${p.displayAddress}${p.displayPostcode ? `, ${p.displayPostcode}` : ""}</p>
                <p style="margin:0 0 10px 0;font-size:13px;color:#f8fafc;line-height:1.5;">${p.arrivalInstructions}</p>
                <a href="tel:${p.phone1Link}" style="display:inline-block;background-color:#2563eb;color:#fff;text-decoration:none;padding:8px 15px;border-radius:6px;font-weight:800;font-size:12px;margin-right:5px;">📞 ${p.phone1}</a>
                ${phone2Button}
              </div>

              <!-- Return -->
              <div style="background-color:#1e293b;border-left:4px solid #10b981;border-radius:8px;padding:15px;margin-bottom:20px;">
                <p style="margin:0 0 5px 0;font-size:11px;font-weight:900;color:#10b981;text-transform:uppercase;">Return • ${p.terminalKey} • ${p.pickDate} @ ${p.pickTime}</p>
                <p style="margin:0 0 10px 0;font-size:13px;color:#f8fafc;line-height:1.5;">${p.returnInstructions}</p>
                <a href="tel:${p.phone1Link}" style="display:inline-block;background-color:#10b981;color:#fff;text-decoration:none;padding:8px 15px;border-radius:6px;font-weight:800;font-size:12px;margin-right:5px;">📞 ${p.phone1}</a>
                ${phone2Button}
              </div>

              <!-- Directions -->
              <a href="${p.mapsLink}" style="background-color:#334155;color:#fff;text-decoration:none;padding:15px 0;border-radius:12px;font-weight:900;font-size:12px;display:block;text-align:center;text-transform:uppercase;letter-spacing:1px;">📍 View Airport Directions</a>

              <div style="margin-top:25px;padding-top:20px;border-top:1px solid #334155;text-align:center;">
                <a href="https://www.aeroparkdirect.co.uk/manage" style="display:inline-block;color:#3b82f6;text-decoration:underline;font-weight:800;font-size:14px;">Manage Your Trip Online →</a>
              </div>
            </div>

            <!-- Support -->
            <div style="margin-top:30px;padding:20px;border:1px dashed #cbd5e1;border-radius:15px;text-align:center;">
              <p style="margin:0;font-size:13px;color:#475569;font-weight:600;">Need assistance or have a question?</p>
              <p style="margin:5px 0 0 0;font-size:13px;color:#64748b;">Reply to this email or contact us at <a href="mailto:info@aeroparkdirect.co.uk" style="color:#2563eb;font-weight:700;text-decoration:none;">info@aeroparkdirect.co.uk</a></p>
            </div>
          </td>
        </tr>

        <!-- Footer -->
        <tr>
          <td style="background-color:#f8fafc;border-top:1px solid #e2e8f0;padding:30px;text-align:center;">
            <p style="margin:0;font-size:11px;color:#94a3b8;font-weight:800;">© ${new Date().getFullYear()} AeroPark Direct Ltd.</p>
          </td>
        </tr>

      </table>
    </td>
  </tr>
</table>
</body>
</html>`;
}

// ─── SEND AMENDMENT ALERTS ────────────────────────────────────────────────────

/**
 * Sends an internal admin alert + customer receipt for a date amendment.
 * FIX: date formatting used raw `new Date(dateStr)` which shifts by UTC offset.
 */
export async function sendAmendmentAlerts(booking: any, company: any): Promise<void> {
  try {
    const dropDateFmt = formatEmailDate(booking.dropoff_date);
    const pickDateFmt = formatEmailDate(booking.pickup_date);

    await resend.emails.send({
      from:    "AeroPark System <info@aeroparkdirect.co.uk>",
      to:      ["info@aeroparkdirect.co.uk"],
      subject: `🚨 BOOKING AMENDED: ${booking.booking_ref}`,
      html: `
        <div style="font-family:sans-serif;padding:20px;max-width:600px;margin:0 auto;">
          <h2 style="color:#eab308;margin-bottom:10px;">⚠️ Action Required: Booking Amended</h2>
          <p>Customer <strong>${str(booking.full_name)}</strong> just changed their dates.</p>
          <div style="background:#f8fafc;padding:20px;border-radius:10px;border:1px solid #e2e8f0;margin-top:20px;">
            <p><strong>Ref:</strong> ${booking.booking_ref}</p>
            <p><strong>Vehicle:</strong> ${str(booking.license_plate)}</p>
            <p style="color:#2563eb;"><strong>New Drop-off:</strong> ${dropDateFmt} @ ${str(booking.dropoff_time, "TBC")}</p>
            <p style="color:#2563eb;"><strong>New Return:</strong>   ${pickDateFmt} @ ${str(booking.pickup_time,  "TBC")}</p>
          </div>
        </div>
      `,
    });

    await sendBookingReceipt(booking, company, true);
  } catch (err) {
    console.error("sendAmendmentAlerts failed:", err);
  }
}

// ─── SEND REVIEW REQUEST ──────────────────────────────────────────────────────

/**
 * Sends an automated post-trip review request.
 */
export async function sendReviewRequest(
  customerEmail: string,
  customerName: string,
  bookingRef: string
): Promise<{ success: boolean; error?: any }> {
  try {
    // FIX: .split(" ")[0] on an empty string returns "" — guard it
    const firstName = customerName.split(" ")[0] || "Traveller";

    await resend.emails.send({
      from:    "AeroPark Direct <info@aeroparkdirect.co.uk>",
      to:      customerEmail,
      subject: `Welcome back! How was your experience? (${bookingRef})`,
      html: `
        <div style="font-family:-apple-system,system-ui,sans-serif;max-width:600px;margin:auto;padding:30px;background-color:#f8fafc;border-radius:16px;border:1px solid #e2e8f0;text-align:center;">
          <h1 style="color:#0f172a;margin:0;font-size:24px;font-weight:900;">AEROPARK<span style="color:#3b82f6;">DIRECT</span></h1>
          <div style="background-color:#fff;padding:40px 30px;border-radius:20px;margin-top:20px;">
            <h2 style="color:#0f172a;margin-top:0;">Welcome Home, ${firstName}! ✈️</h2>
            <p style="color:#475569;line-height:1.6;">We hope you had a fantastic trip. Would you mind taking 60 seconds to review our service?</p>
            <div style="margin:30px 0;">
              <a href="https://uk.trustpilot.com/evaluate/aeroparkdirect.co.uk"
                 style="background-color:#059669;color:white;padding:18px 32px;text-decoration:none;border-radius:16px;font-weight:900;text-transform:uppercase;display:inline-block;">
                Leave a 5-Star Review
              </a>
            </div>
          </div>
        </div>
      `,
    });
    return { success: true };
  } catch (err) {
    console.error("sendReviewRequest failed:", err);
    return { success: false, error: err };
  }
}

// ─── SEND PROVIDER NOTIFICATION ───────────────────────────────────────────────

/**
 * Sends booking details to the parking provider.
 * Shows parking-only total — fast track revenue is hidden from the provider.
 * FIX: fast track price was hardcoded as £8 here but defined as a constant
 *      in the checkout route. Now uses the shared FAST_TRACK_PRICE constant.
 */
export async function sendProviderNotification(
  booking: any,
  company: any
): Promise<{ success: boolean; data?: any; error?: any }> {
  try {
    if (!company?.name) {
      console.warn("sendProviderNotification: missing company details.");
      return { success: false, error: "Missing company" };
    }

    const dropDate = formatEmailDate(booking.dropoff_date);
    const pickDate = formatEmailDate(booking.pickup_date);

    const fastTrackCount   = Number(booking.fast_track_count || 0);
    const fastTrackRevenue = fastTrackCount * FAST_TRACK_PRICE;
    // FIX: parseFloat on undefined returns NaN — use Number() with fallback
    const totalPaid        = Number(booking.total_price || 0);
    const parkingTotal     = Math.max(0, totalPaid - fastTrackRevenue).toFixed(2);

    // FIX: don't fall back silently to info@ — log clearly when provider has no email
    const providerEmail = company.email?.trim();
    if (!providerEmail) {
      console.warn(`sendProviderNotification: company "${company.name}" has no email — falling back to info@`);
    }
    const recipientEmail = providerEmail || "info@aeroparkdirect.co.uk";

    const dropTime = str(booking.dropoff_time, "TBC");
    const pickTime = str(booking.pickup_time,  "TBC");

    const { data, error } = await resend.emails.send({
      from:    "AeroPark Bookings <info@aeroparkdirect.co.uk>",
      to:      recipientEmail,
      subject: `NEW BOOKING: ${booking.booking_ref} | ${str(booking.full_name)}`,
      html: `
        <div style="font-family:sans-serif;color:#333;max-width:600px;padding:20px;">
          <h2 style="border-bottom:2px solid #2563eb;padding-bottom:10px;">New Parking Reservation</h2>
          <table border="0" cellpadding="8" cellspacing="0" width="100%" style="border-collapse:collapse;">
            <tr style="background-color:#f8fafc;"><td width="35%"><strong>Booking Ref:</strong></td><td>${booking.booking_ref}</td></tr>
            <tr><td><strong>Status:</strong></td><td><span style="background-color:#dcfce7;color:#166534;padding:4px 8px;border-radius:4px;font-size:12px;font-weight:bold;text-transform:uppercase;">${str(booking.status, "Confirmed")}</span></td></tr>
            <tr style="background-color:#f8fafc;"><td><strong>Customer Name:</strong></td><td>${str(booking.full_name)}</td></tr>
            <tr><td><strong>Phone Number:</strong></td><td>${str(booking.phone_number)}</td></tr>
            <tr style="background-color:#f8fafc;"><td><strong>Car Details:</strong></td><td>${str(booking.car_make)} (${str(booking.car_color)})</td></tr>
            <tr><td><strong>Registration:</strong></td><td><strong>${str(booking.license_plate)}</strong></td></tr>
            <tr style="background-color:#f8fafc;"><td><strong>Airport:</strong></td><td>${str(booking.airport, "Luton Airport (LTN)")}</td></tr>
            <tr><td><strong>Drop-off:</strong></td><td>${dropDate} at ${dropTime}</td></tr>
            <tr style="background-color:#f8fafc;"><td><strong>Pick-up:</strong></td><td>${pickDate} at ${pickTime}</td></tr>
            <tr><td><strong>Return Flight:</strong></td><td>${str(booking.flight_number, "N/A")}</td></tr>
            <tr style="background-color:#f8fafc;"><td><strong>Service Type:</strong></td><td>${str(booking.service_type, company.name)}</td></tr>
            <tr style="background-color:#eff6ff;border-top:2px solid #2563eb;">
              <td><strong>Total Paid for Parking:</strong></td>
              <td><strong style="color:#1e40af;font-size:18px;">£${parkingTotal}</strong></td>
            </tr>
          </table>
          <p style="margin-top:30px;font-size:12px;color:#64748b;text-align:center;">
            This email was generated automatically by AeroPark Direct. Please do not reply directly.
          </p>
        </div>
      `,
    });

    if (error) {
      console.error("Resend error (sendProviderNotification):", error);
      return { success: false, error };
    }
    return { success: true, data };
  } catch (err) {
    console.error("sendProviderNotification unhandled error:", err);
    return { success: false, error: err };
  }
}