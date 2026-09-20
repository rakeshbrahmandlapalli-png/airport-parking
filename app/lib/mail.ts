import { logger } from "@/app/lib/logger";
import { AGENT_NUMBER } from "@/app/lib/messageTemplates";
import { detectAirport, instructionsFor, terminalKeyFor, operatesAt, AIRPORT_NAME } from "@/app/lib/airport";
import { Resend } from "resend";
import { createClient } from "@supabase/supabase-js";
import {
  renderReceiptHtml, renderReceiptText, emailShell, emailSection, paragraph,
  detailTable, noteBox, sectionHeading, emailButton as buildEmailButton, type ReceiptHtmlParams,
} from "@/app/lib/receiptEmail";

// ─── CLIENTS ──────────────────────────────────────────────────────────────────

if (!process.env.RESEND_API_KEY)               throw new Error("RESEND_API_KEY is not set");
if (!process.env.NEXT_PUBLIC_SUPABASE_URL)     throw new Error("NEXT_PUBLIC_SUPABASE_URL is not set");
if (!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) throw new Error("NEXT_PUBLIC_SUPABASE_ANON_KEY is not set");

const resend = new Resend(process.env.RESEND_API_KEY);

// Server-side mailer — prefer the service role so company look-ups keep working
// regardless of how strict the RLS policies are. Falls back to the anon key if
// the service role isn't configured (companies are public-read anyway).
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

// Fast-track price fallback — the live value is read from Platform Settings
// (settings table) at send time so it tracks the admin's configured price.
const FAST_TRACK_PRICE_DEFAULT = 8.00;

/** Read the live fast-track price from the settings table (admin-configurable). */
async function getFastTrackPrice(): Promise<number> {
  try {
    const { data } = await supabase
      .from("settings")
      .select("value")
      .eq("key", "fast_track_price")
      .maybeSingle();
    const v = Number(data?.value);
    return v > 0 ? v : FAST_TRACK_PRICE_DEFAULT;
  } catch {
    return FAST_TRACK_PRICE_DEFAULT;
  }
}

// ─── HELPERS ──────────────────────────────────────────────────────────────────

/**
 * Format a YYYY-MM-DD date string into a human-readable date.
 * FIX: parses as local date to avoid UTC midnight shifting the day in GMT+1.
 */
function formatEmailDate(dateStr: string | null | undefined): string {
  if (!dateStr) return "TBC";
  // FIX: handle full ISO timestamps ("2026-06-05T00:00:00Z") as well as plain
  // "YYYY-MM-DD" — splitting on "T" first prevents printing a raw ISO string.
  const datePart = String(dateStr).split("T")[0];
  const parts = datePart.split("-").map(Number);
  if (parts.length !== 3 || parts.some(isNaN)) return String(dateStr);
  const [y, m, d] = parts;
  return new Date(y, m - 1, d).toLocaleDateString("en-GB", {
    weekday: "short", day: "numeric", month: "short", year: "numeric",
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

// Escape HTML so attacker-controlled booking fields (name, plate, car, flight…)
// can't inject markup/links into the HTML emails we send to operators & admins.
// Use for any user-supplied value placed inside an email HTML body (NOT subjects,
// which are plain text).
function escapeHtml(v: unknown): string {
  return String(v ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}
/** str() + HTML escaping, for user data rendered into an email body. */
function escH(v: unknown, fallback = "N/A"): string {
  return escapeHtml(str(v, fallback));
}

/**
 * Resolve a booking email address from the booking row, consistently.
 * FIX: the original mixed booking.email and booking.customerEmail in several places.
 */
function resolveEmail(booking: any): string {
  return (booking.email || booking.customerEmail || "").trim().toLowerCase();
}

// ─── MAP / DIRECTIONS ENGINE ──────────────────────────────────────────────────
// A broken map link = a missed flight. Google Maps EMBED urls (…/maps/embed?pb=)
// are for <iframe> only — putting one in an <a href> opens a blank/broken page.
// This engine NEVER emits an embed url. It resolves the correct destination by
// SERVICE TYPE (Meet & Greet → terminal forecourt; Park & Ride → the off-airport
// compound) and returns a turn-by-turn directions link, with a bulletproof
// fallback chain that ignores junk data (e.g. an email pasted in `address`).

type ServiceKind = "park-ride" | "meet-greet";

function classifyService(serviceType?: string): ServiceKind {
  const s = (serviceType || "").toLowerCase();
  return /park\s*&?\s*ride|park.?and.?ride/.test(s) ? "park-ride" : "meet-greet";
}

/** First non-empty, trimmed string from the candidates. */
function firstClean(...vals: Array<unknown>): string {
  for (const v of vals) {
    const s = String(v ?? "").trim();
    if (s) return s;
  }
  return "";
}

/** Drop junk addresses (empty, too short, or a stray email in the address field). */
function sanitizeAddress(addr: string): string {
  const s = addr.trim();
  if (!s || s.includes("@") || s.length < 4) return "";
  return s;
}

/** Validate + normalise a UK postcode ("ub70jh" → "UB7 0JH"); "" if invalid. */
function sanitizePostcode(pc: string): string {
  const raw = pc.toUpperCase().replace(/\s+/g, "");
  const m = raw.match(/^([A-Z]{1,2}\d[A-Z\d]?)(\d[A-Z]{2})$/);
  return m ? `${m[1]} ${m[2]}` : "";
}

const isEmbedUrl = (url?: string): boolean => !!url && /\/maps\/embed/i.test(url);

/** A clickable maps link safe for an href (i.e. NOT an embed). */
function isNavigableMapsUrl(url?: string): boolean {
  return !!url && /^https?:\/\//i.test(url) && !isEmbedUrl(url) &&
    /(google\.[a-z.]+\/maps|maps\.app\.goo\.gl|goo\.gl\/maps)/i.test(url);
}

/** Pull "lat,lng" out of a Google embed pb string (…!2d<lng>…!3d<lat>…). */
function coordsFromEmbed(url?: string): string | null {
  if (!url) return null;
  const lng = url.match(/!2d(-?\d+(?:\.\d+)?)/);
  const lat = url.match(/!3d(-?\d+(?:\.\d+)?)/);
  return lat && lng ? `${lat[1]},${lng[1]}` : null;
}

export interface Destination {
  kind: ServiceKind;
  address: string;   // sanitised (junk removed)
  postcode: string;  // validated UK postcode or ""
  mapUrl: string;    // may be an embed — handled downstream, never href'd
}

/**
 * Resolve WHERE the customer should drive, by service type:
 *  - Meet & Greet → the terminal forecourt (terminal_data[terminal]), then company.
 *  - Park & Ride  → the off-airport compound (company.address) — never the terminal.
 */
export function resolveDestination(serviceType: string | undefined, company: any, terminalInfo: any): Destination {
  const kind = classifyService(serviceType);
  if (kind === "park-ride") {
    return {
      kind,
      address:  sanitizeAddress(firstClean(company?.address)),
      postcode: sanitizePostcode(firstClean(company?.postcode)),
      mapUrl:   firstClean(company?.map_url),
    };
  }
  return {
    kind,
    address:  sanitizeAddress(firstClean(terminalInfo?.address, company?.address)),
    postcode: sanitizePostcode(firstClean(terminalInfo?.postcode, company?.postcode)),
    mapUrl:   firstClean(terminalInfo?.map_url, company?.map_url),
  };
}

/**
 * Build a guaranteed-navigable Google Maps directions URL. Priority:
 *  1. An explicit, non-embed maps link on the destination.
 *  2. address + validated UK postcode (postcodes pin precisely; Meet & Greet
 *     also appends the airport name to disambiguate the terminal).
 *  3. exact coordinates parsed from an embed pb string.
 *  4. company name + airport (last resort).
 * Always returns a /maps/dir link — NEVER a /maps/embed url.
 */
export function buildDirectionsUrl(dest: Destination, companyName: string, airportName: string): string {
  const DIR = "https://www.google.com/maps/dir/?api=1&destination=";

  if (isNavigableMapsUrl(dest.mapUrl)) return dest.mapUrl;

  const hasPin = !!dest.postcode || dest.address.length > 4;
  if (hasPin) {
    // A Park & Ride compound is OFF-airport — don't muddy the query with the
    // airport name; its own postcode is the precise pin.
    const parts = dest.kind === "park-ride"
      ? [dest.address, dest.postcode]
      : [dest.address, dest.postcode, airportName];
    return DIR + encodeURIComponent(parts.filter(Boolean).join(", "));
  }

  const coords = coordsFromEmbed(dest.mapUrl);
  if (coords) return DIR + encodeURIComponent(coords);

  return DIR + encodeURIComponent(`${firstClean(companyName, "Airport Parking")} ${airportName}`.trim());
}

// ─── COMPANY RESOLVER ─────────────────────────────────────────────────────────

/**
 * If the caller didn't pass a company object, look it up from Supabase.
 * Falls back to a generic "Airport Parking Bay" record for test bookings.
 */
async function resolveCompany(booking: any, passedCompany: any): Promise<any> {
  if (passedCompany) return passedCompany;
  const code = detectAirport(booking?.airport);

  logger.warn("⚠️ Mailer: company object missing — fetching from DB.");

  try {
    if (booking.company_id && String(booking.company_id) !== "null") {
      const { data } = await supabase
        .from("companies")
        .select("*")
        .eq("id", booking.company_id)
        .maybeSingle();
      if (data) return data;
    }

    // Last-resort fallback for test bookings. "Airport Parking Bay" is a LUTON
    // operator, so this used to hand a Heathrow booking Luton instructions and a
    // Luton phone number. Only ever use it when it serves the booking's airport.
    const { data } = await supabase
      .from("companies")
      .select("*")
      .ilike("name", "%Airport Parking Bay%")
      .maybeSingle();
    if (data && operatesAt(data, code)) return data;
    logger.error(`resolveCompany: booking ${booking?.booking_ref} has no operator and no safe fallback for ${code ?? "an unknown airport"}`);
    return null;
  } catch (e) {
    logger.error("Company self-repair failed:", e);
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

    // Which airport, proved from the booking rather than assumed. Anything that
    // is not Luton used to be treated as Heathrow, so a blank or mistyped field
    // sent Luton customers Heathrow directions.
    const code = detectAirport(booking.airport);
    const isLuton = code === "LTN";
    if (!code) {
      logger.error(`sendBookingReceipt: booking ${booking.booking_ref} has an unrecognised airport ${JSON.stringify(booking.airport)} — operator instructions withheld`);
    }

    // Terminal lookup. No blind "Terminal 2" for Heathrow: reading the wrong
    // terminal's address is the same mistake in a smaller font.
    const terminalKey = terminalKeyFor(booking.terminal, code);
    const terminalInfo = terminalKey ? company?.terminal_data?.[terminalKey] : undefined;

    // Instructions, only ever the ones proved to belong to this airport.
    const arrival = instructionsFor(company, code, "arrival");
    const ret = instructionsFor(company, code, "return");
    for (const r of [arrival, ret]) {
      if (r.warning) logger.error(`sendBookingReceipt: booking ${booking.booking_ref} — ${r.warning}`);
    }
    const arrivalInstructions = arrival.text;
    const returnInstructions = ret.text;

    // Address & map — SERVICE-AWARE + embed-safe (see MAP / DIRECTIONS ENGINE).
    // Meet & Greet pins the terminal; Park & Ride pins the off-airport compound.
    // buildDirectionsUrl NEVER returns an iframe embed url, so the button always
    // opens real turn-by-turn directions.
    const destination = resolveDestination(str(booking.service_type, "Meet & Greet"), company, terminalInfo);
    const displayAddress  = destination.address || (code ? AIRPORT_NAME[code] : "");
    const displayPostcode = destination.postcode;
    const mapsLink = buildDirectionsUrl(
      destination,
      str(company?.name, "Airport Parking"),
      str(booking.airport, code ? AIRPORT_NAME[code] : ""),
    );

    // Phones — FIX: use canonical db field names (phone_number / phone_number_2)
    // If the operator has no number of their own (AeroPark Exclusive assigns a
    // partner later), fall back to OUR office line. It used to fall back to a
    // specific Luton operator's number, so a Heathrow customer was told to ring
    // a company with no record of them.
    const phone1     = str(company?.phone_number,   AGENT_NUMBER);
    const phone2     = str(company?.phone_number_2, "");
    const phone1Link = toTelLink(phone1);
    const phone2Link = toTelLink(phone2);

    // Dates & times — FIX: use only canonical snake_case field names
    const dropDate = formatEmailDate(booking.dropoff_date);
    const pickDate = formatEmailDate(booking.pickup_date);
    const dropTime = str(booking.dropoff_time, "TBC");
    const pickTime = str(booking.pickup_time,  "TBC");

    const licencePlate = str(booking.license_plate);

    // Receipt summary fields — the email previously showed no amount paid.
    const totalPaidNum = Number(booking.total_price || 0);
    const totalPaidStr = totalPaidNum > 0 ? `£${totalPaidNum.toFixed(2)}` : "Paid";
    const serviceType  = str(booking.service_type, "Meet & Greet");
    const flightNumber = str(booking.flight_number, "");

    const statusText  = isAmendment ? "Updated"   : "Confirmed";
    const statusColor = isAmendment ? "#3b82f6"   : "#059669";
    const statusBg    = isAmendment ? "#eff6ff"   : "#ecfdf5";

    const recipientEmail = resolveEmail(booking);
    if (!recipientEmail) {
      logger.error("sendBookingReceipt: no recipient email on booking", booking.booking_ref);
      return { success: false, error: "No recipient email" };
    }

    const receipt: ReceiptHtmlParams = {
      booking, company, isAmendment,
      terminalKey, displayAddress, displayPostcode, mapsLink,
      phone1, phone2, phone1Link, phone2Link,
      arrivalInstructions, returnInstructions,
      dropDate, pickDate, dropTime, pickTime,
      licencePlate, statusText, statusColor, statusBg,
      totalPaidStr, serviceType, flightNumber,
    };

    const { data, error } = await resend.emails.send({
      from:    "AeroPark Direct <info@aeroparkdirect.co.uk>",
      to:      [recipientEmail],
      // FIX: only BCC the Trustpilot review-invite address for NEW bookings —
      // an amendment shouldn't trigger a fresh review request.
      ...(isAmendment ? {} : { bcc: ["aeroparkdirect.co.uk+c6f8c1b490@invite.trustpilot.com"] }),
      subject: `Booking ${statusText.toLowerCase()}: ${booking.booking_ref} (${licencePlate})`,
      html: renderReceiptHtml(receipt),
      text: renderReceiptText(receipt),
    });

    if (error) {
      logger.error("Resend error (sendBookingReceipt):", error);
      return { success: false, error };
    }
    return { success: true, data };
  } catch (err) {
    logger.error("sendBookingReceipt unhandled error:", err);
    return { success: false, error: err };
  }
}

// ─── HTML BUILDER ─────────────────────────────────────────────────────────────
// The layout lives in receiptEmail.ts (pure functions, easy to preview and test).
// These stay exported so the /api/email-preview route keeps working.

export type { ReceiptHtmlParams };

export function buildReceiptHtml(p: ReceiptHtmlParams): string {
  return renderReceiptHtml(p);
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
      subject: `Booking amended ${booking.booking_ref}: new drop-off ${dropDateFmt}`,
      html: emailShell({
        title: `Booking amended ${escH(booking.booking_ref)}`,
        kicker: "Amendment",
        heading: "Booking amended: tell the operator",
        preheader: `${escH(booking.full_name)} changed their dates. New drop-off ${dropDateFmt}.`,
        internal: true,
        bodyHtml:
          emailSection(
            paragraph(`<strong>${escH(booking.full_name)}</strong> changed their dates. The customer has been sent an updated confirmation.`) +
            detailTable([
              ["Reference", escH(booking.booking_ref)],
              ["Registration", escH(booking.license_plate)],
              ["Operator", escH(company?.name, "unassigned")],
              ["New drop-off", `${dropDateFmt} at ${str(booking.dropoff_time, "TBC")}`],
              ["New return", `${pickDateFmt} at ${str(booking.pickup_time, "TBC")}`],
            ]),
          ) +
          emailSection(
            noteBox("Next step", "The operator is holding the original slot. Confirm the new dates with them, or the car arrives on a day nobody is expecting it."),
          ),
      }),
    });

    await sendBookingReceipt(booking, company, true);
  } catch (err) {
    logger.error("sendAmendmentAlerts failed:", err);
  }
}

// ─── SEND REVIEW REQUEST ──────────────────────────────────────────────────────

/**
 * Sends an automated post-trip review request.
 */
const TRUSTPILOT_REVIEW_URL = "https://www.trustpilot.com/evaluate/aeroparkdirect.co.uk";

export async function sendReviewRequest(
  customerEmail: string,
  customerName: string,
  bookingRef: string
): Promise<{ success: boolean; error?: any }> {
  try {
    const recipient = (customerEmail || "").trim().toLowerCase();
    if (!recipient) {
      logger.error("sendReviewRequest: no recipient email");
      return { success: false, error: "No recipient email" };
    }
    // .split(" ")[0] on an empty string returns "" — guard it.
    const firstName = (customerName || "").trim().split(" ")[0] || "there";

    await resend.emails.send({
      from:    "AeroPark Direct <info@aeroparkdirect.co.uk>",
      to:      recipient,
      replyTo: "info@aeroparkdirect.co.uk",
      subject: `${firstName}, how did we do? — ${bookingRef}`,
      html: buildReviewHtml(firstName, bookingRef),
    });
    return { success: true };
  } catch (err) {
    logger.error("sendReviewRequest failed:", err);
    return { success: false, error: err };
  }
}

// ─── REVIEW EMAIL HTML ────────────────────────────────────────────────────────
// Table-based + inline styles for broad email-client support. One job: get the
// customer to Trustpilot. The CTA is a single, full-width, unmissable button.

export function buildReviewHtml(firstName: string, bookingRef: string): string {
  const name = firstName && firstName !== "there" ? firstName : "";
  return emailShell({
    title: "How was your experience?",
    kicker: `Booking ${bookingRef}`,
    heading: name ? `${name}, how did we go?` : "How did we go?",
    preheader: `Your feedback on booking ${bookingRef} takes about a minute.`,
    bodyHtml:
      emailSection(
        paragraph(`Your car is back with you and booking <strong>${escapeHtml(bookingRef)}</strong> is complete. Thank you for choosing AeroPark Direct.`) +
        paragraph("We are a young company, so an honest review genuinely helps the next traveller decide which car park to trust. It takes about a minute, and we read every one.") +
        buildEmailButton(TRUSTPILOT_REVIEW_URL, "Write a review"),
      ) +
      emailSection(
        paragraph("If anything fell short, reply to this email instead and it comes straight to us. We would rather hear it from you and put it right."),
      ),
  });
}

// ─── SEND PROVIDER NOTIFICATION ───────────────────────────────────────────────

/**
 * Sends booking details to the parking provider.
 * Shows parking-only total — fast track revenue is hidden from the provider.
 * The fast-track price is read live from Platform Settings (getFastTrackPrice)
 * so the parking-only figure matches the admin's configured add-on price.
 */
export async function sendProviderNotification(
  booking: any,
  company: any
): Promise<{ success: boolean; data?: any; error?: any }> {
  try {
    if (!company?.name) {
      logger.warn("sendProviderNotification: missing company details.");
      return { success: false, error: "Missing company" };
    }

    const dropDate = formatEmailDate(booking.dropoff_date);
    const pickDate = formatEmailDate(booking.pickup_date);

    const fastTrackCount   = Number(booking.fast_track_count || 0);
    const fastTrackRevenue = fastTrackCount * (await getFastTrackPrice());
    const totalPaid        = Number(booking.total_price || 0);
    const attendantFee     = Number(booking.attendant_commission || 0);
    // Use the booking's explicit commission % if the admin set one (walk-ins /
    // payment links); otherwise fall back to the operator's own configured rate,
    // so this email matches the financials & remittance invoice exactly.
    const commissionPct    = booking.commission_percentage != null && booking.commission_percentage !== ""
      ? Number(booking.commission_percentage)
      : Number(company.commission_rate ?? 100);
    const parkingGross     = Math.max(0, totalPaid - fastTrackRevenue - attendantFee);
    const yourCommission   = parkingGross * (commissionPct / 100);
    const operatorPayout   = Math.max(0, parkingGross - yourCommission);
    const parkingTotal     = parkingGross.toFixed(2);

    // FIX: don't fall back silently to info@ — log clearly when provider has no email
    const providerEmail = company.email?.trim();
    if (!providerEmail) {
      logger.warn(`sendProviderNotification: company "${company.name}" has no email — falling back to info@`);
    }
    const recipientEmail = providerEmail || "info@aeroparkdirect.co.uk";

    const dropTime = str(booking.dropoff_time, "TBC");
    const pickTime = str(booking.pickup_time,  "TBC");

    const { data, error } = await resend.emails.send({
      from:    "AeroPark Bookings <info@aeroparkdirect.co.uk>",
      to:      recipientEmail,
      replyTo: "info@aeroparkdirect.co.uk",
      subject: `New booking ${booking.booking_ref}: ${str(booking.full_name)}, ${dropDate}`,
      html: emailShell({
        title: `New booking ${booking.booking_ref}`,
        kicker: escapeHtml(company.name),
        heading: "New parking reservation",
        preheader: `${str(booking.full_name)}, ${escH(booking.license_plate)}, drop-off ${dropDate} at ${dropTime}.`,
        internal: true,
        bodyHtml:
          emailSection(
            paragraph(`Booking <strong>${escapeHtml(String(booking.booking_ref))}</strong> has been paid for and confirmed. Please add it to your board.`) +
            detailTable([
              ["Customer", escH(booking.full_name)],
              ["Phone", escH(booking.phone_number)],
              ["Vehicle", `${escH(booking.car_make, "")} ${escH(booking.car_color, "")}`.trim() || "Not given"],
              ["Registration", escH(booking.license_plate)],
              ["Airport", escH(booking.airport, "Luton Airport (LTN)")],
              ["Terminal", escH(booking.terminal, "Not given")],
              ["Drop-off", `${dropDate} at ${dropTime}`],
              ["Pick-up", `${pickDate} at ${pickTime}`],
              ["Return flight", escH(booking.flight_number, "Not given")],
              ["Service", escH(booking.service_type, company.name)],
            ]),
          ) +
          emailSection(
            sectionHeading("Payout") +
            detailTable([
              ["Parking value", `£${parkingGross.toFixed(2)}`],
              ["Our commission", `${commissionPct}%`],
              ["Commission deducted", `-${`£${yourCommission.toFixed(2)}`}`],
              ["You receive", `<span style="font-size:17px;">${`£${operatorPayout.toFixed(2)}`}</span>`],
            ]),
          ) +
          emailSection(
            paragraph("Questions about this booking? Reply to this email and it reaches the AeroPark Direct office."),
          ),
      }),
    });
    if (error) {
      logger.error("Resend error (sendProviderNotification):", error);
      return { success: false, error };
    }
    return { success: true, data };
  } catch (err) {
    logger.error("sendProviderNotification unhandled error:", err);
    return { success: false, error: err };
  }
}
// ─── CANCELLATION ─────────────────────────────────────────────────────────────

/**
 * Everyone who needs to know, told at once: the customer, the office, and the
 * OPERATOR — who is holding a bay and a driver slot for a car that is no longer
 * coming, and who finds out from nobody else.
 *
 * `insideWindow` means the cancellation landed within 24 hours of drop-off. It
 * never blocks the cancellation — someone who wants to cancel must always be
 * able to — it only changes what is promised about the money. Outside the
 * window the refund is automatic and stated as a fact. Inside it, the booking
 * still cancels but the refund is reviewed, and the customer is told that
 * plainly rather than being sent away to a phone that may not answer.
 *
 * The refund is issued by hand in Stripe either way, so a person sees every one.
 */
export async function sendCancellationAlerts(
  booking: any,
  company: any,
  opts?: { insideWindow?: boolean }
): Promise<void> {
  const insideWindow = !!opts?.insideWindow;
  const ref = escH(booking?.booking_ref);
  const name = escH(booking?.full_name);
  const first = String(booking?.full_name || "there").trim().split(/\s+/)[0];
  const total = Number(booking?.total_price || 0).toFixed(2);
  const dropDateFmt = formatEmailDate(booking?.dropoff_date);
  const pickDateFmt = formatEmailDate(booking?.pickup_date);

  // ── the office ──────────────────────────────────────────────────────────
  // Carries an action and must not be lost if the customer's address bounces,
  // so it goes first and on its own.
  try {
    await resend.emails.send({
      from:    "AeroPark System <info@aeroparkdirect.co.uk>",
      to:      ["info@aeroparkdirect.co.uk"],
      subject: `${insideWindow ? "LATE CANCELLATION" : "CANCELLED"} ${escH(booking?.booking_ref)}: refund £${total}`,
      html: emailShell({
        title: `Cancellation ${escH(booking?.booking_ref)}`,
        kicker: insideWindow ? "Late cancellation" : "Cancellation",
        heading: insideWindow ? "Late cancellation: the refund needs a decision" : "Cancelled: refund needed",
        preheader: `${name} cancelled ${ref}. £${total} to refund.`,
        internal: true,
        bodyHtml:
          emailSection(
            paragraph(`<strong>${name}</strong> cancelled online. The booking is already marked cancelled.`) +
            detailTable([
              ["Reference", ref],
              ["Amount", `£${total}`],
              ["Was due", dropDateFmt],
              ["Operator", escH(company?.name, "unassigned")],
              ["Customer email", escH(booking?.email, "none on file")],
            ]),
          ) +
          emailSection(
            noteBox(
              insideWindow ? "What you promised them" : "Next step",
              insideWindow
                ? `This came in within 24 hours of drop-off. They have been told the refund is being reviewed and that you will reply within one working day. Decide, then refund in Stripe or email them.`
                : `Refund this in Stripe. They have been told it lands within 5 to 10 working days.`,
            ),
          ),
      }),
    });
  } catch (err) {
    logger.error("sendCancellationAlerts (office) failed:", err);
  }

  // ── the operator ────────────────────────────────────────────────────────
  // They are holding a space for this car. Money is none of their business
  // here, so this email carries none of it — only that it is not coming.
  const providerEmail = company?.email?.trim();
  if (providerEmail) {
    try {
      await resend.emails.send({
        from:    "AeroPark Bookings <info@aeroparkdirect.co.uk>",
        to:      [providerEmail],
        replyTo: "info@aeroparkdirect.co.uk",
        subject: `Cancelled ${escH(booking?.booking_ref)}: ${escH(booking?.full_name)}, ${dropDateFmt}`,
        html: emailShell({
          title: `Cancelled ${escH(booking?.booking_ref)}`,
          kicker: escapeHtml(String(company?.name ?? "")),
          heading: "Booking cancelled",
          preheader: `${escH(booking?.license_plate)} is no longer coming on ${dropDateFmt}.`,
          internal: true,
          bodyHtml:
            emailSection(
              paragraph("This car is <strong>no longer coming</strong>. Please free the space and update your board.") +
              detailTable([
                ["Reference", ref],
                ["Customer", name],
                ["Registration", escH(booking?.license_plate)],
                ["Vehicle", `${escH(booking?.car_make, "")} ${escH(booking?.car_color, "")}`.trim() || "Not given"],
                ["Was dropping off", `${dropDateFmt} at ${str(booking?.dropoff_time, "TBC")}`],
                ["Was returning", `${pickDateFmt} at ${str(booking?.pickup_time, "TBC")}`],
              ]),
            ),
        }),
      });
    } catch (err) {
      logger.error("sendCancellationAlerts (operator) failed:", err);
    }
  } else {
    logger.warn(
      `sendCancellationAlerts: operator "${company?.name || "unassigned"}" has no email — nobody told them to free the space`
    );
  }

  // ── the customer ────────────────────────────────────────────────────────
  const to = String(booking?.email || "").trim();
  if (!to) return;

  try {
    await resend.emails.send({
      from:    "AeroPark Direct <info@aeroparkdirect.co.uk>",
      to:      [to],
      replyTo: "info@aeroparkdirect.co.uk",
      subject: insideWindow
        ? `Booking ${booking?.booking_ref} cancelled`
        : `Booking ${booking?.booking_ref} cancelled: refund of £${total} on its way`,
      html: emailShell({
        title: "Your booking is cancelled",
        kicker: `Booking ${escH(booking?.booking_ref)}`,
        heading: "Your booking is cancelled",
        preheader: insideWindow
          ? `Reference ${ref}. We will be in touch about your refund within one working day.`
          : `Reference ${ref}. Your refund of £${total} is on its way.`,
        bodyHtml:
          emailSection(
            paragraph(`Dear ${escH(first, "customer")}, your booking <strong>${ref}</strong> has been cancelled. Nothing further is needed from you, and you will not be charged anything more.`) +
            (insideWindow
              ? noteBox(
                  "About your refund",
                  `Because this came in within 24 hours of your drop-off, your refund of £${total} is being reviewed rather than issued automatically. We will email you about it within one working day.`,
                )
              : noteBox(
                  `Refund of £${total}`,
                  "This goes back to the card you paid with, normally within 5 to 10 working days depending on your bank. If it has not arrived by then, reply to this email and we will chase it.",
                )),
          ) +
          emailSection(
            paragraph("Sorry we will not be looking after your car this time. If your plans change, you can book again at <a href=\"https://www.aeroparkdirect.co.uk\" style=\"color:#0B1120;font-weight:700;\">aeroparkdirect.co.uk</a>."),
          ),
      }),
    });
  } catch (err) {
    logger.error("sendCancellationAlerts (customer) failed:", err);
  }
}
