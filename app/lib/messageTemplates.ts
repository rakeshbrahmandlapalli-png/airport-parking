/**
 * Customer message templates — the single source of truth for every SMS/WhatsApp
 * body we send about a booking.
 *
 * Deliberately free of server-only imports (no `twilio`, no `supabase`) so the
 * admin Message Centre can render an editable preview client-side while the
 * cron/webhook senders use the identical text server-side. One definition, so
 * the automated messages and the ones sent by hand can never drift apart.
 *
 * Kept emoji-free: an emoji forces an SMS into UCS-2 encoding, which cuts the
 * segment size from 160 to 70 characters and roughly doubles the cost.
 */

import { detectAirport, instructionsFor, operatesAt } from "@/app/lib/airport";

export const REVIEW_LINK = "https://uk.trustpilot.com/evaluate/aeroparkdirect.co.uk";
export const AGENT_NUMBER = "07868 277648";

/**
 * The booking fields the templates read. Callers pass whole booking rows, so
 * extra columns are tolerated — only these are actually used.
 */
export type MessageBooking = {
  full_name?: string;
  phone_number?: string;
  booking_ref?: string;
  airport?: string;
  terminal?: string;
  dropoff_date?: string;
  dropoff_time?: string;
  pickup_date?: string;
  pickup_time?: string;
  flight_number?: string;
  total_price?: number | string;
  [key: string]: unknown;
};

// ── Shared helpers ──────────────────────────────────────────────────────────

/**
 * Normalise a UK number to E.164 (+44…), tolerating however it was typed:
 * spaces/dashes, leading 0, 44, 0044, or a bare 10-digit mobile with no 0.
 */
export function toUKE164(raw: string): string {
  const p = (raw || "").replace(/[^\d+]/g, "");
  if (p.startsWith("+")) {
    // A "+" was NOT proof of a good number. A UK mobile saved as "7572463446"
    // and later given a "+" became "+7572463446" — read as Russia (+7), which
    // Twilio rejected on every message for that booking, forever, in silence.
    // Russian numbers carry 10 digits after the 7; this has 9. So exactly ten
    // digits beginning 7 is a UK mobile that lost its 44, and is repaired here.
    const digits = p.slice(1);
    if (/^7\d{9}$/.test(digits)) return `+44${digits}`;
    return p;
  }
  if (p.startsWith("00")) return `+${p.slice(2)}`;
  if (p.startsWith("44")) return `+${p}`;
  if (p.startsWith("0")) return `+44${p.slice(1)}`;
  if (/^7\d{9}$/.test(p)) return `+44${p}`;
  return `+${p}`;
}

/**
 * Can this number actually be texted? Checked BEFORE handing anything to
 * Twilio, so a bad number is reported against the booking instead of failing
 * quietly on every message (19% of one month's sends died this way).
 * UK numbers must be +44 plus ten digits; anything else needs a plausible
 * international length.
 */
export function isSendableNumber(raw: string): boolean {
  const e164 = toUKE164(raw);
  if (!/^\+\d+$/.test(e164)) return false;
  if (e164.startsWith("+44")) return /^\+44[1-9]\d{9}$/.test(e164);
  return /^\+\d{8,15}$/.test(e164);
}

/** wa.me deep-link form: international digits only, no leading +. */
export function toWhatsAppNumber(raw: string): string {
  return toUKE164(raw).replace(/^\+/, "");
}

const TITLES = ["mr", "mrs", "ms", "miss", "dr", "prof", "sir", "mx", "rev"];

/**
 * A natural first name to greet someone by.
 *
 * Naively taking the first word greets "Mrs M Turner" as "Hi Mrs" — so titles
 * are stripped first, and a name that's only an initial plus a surname
 * ("Mrs M Turner") is addressed formally as "Mrs Turner" rather than "M".
 */
export function greetingName(name?: string): string {
  const parts = (name || "").trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return "there";

  const bareTitle = parts[0].toLowerCase().replace(/\./g, "");
  const hasTitle = TITLES.includes(bareTitle);
  const rest = hasTitle ? parts.slice(1) : parts;
  if (!rest.length) return "there";

  // First token is just an initial — use the surname instead.
  if (rest[0].replace(/\./g, "").length === 1) {
    const surname = rest[rest.length - 1];
    return hasTitle ? `${parts[0].replace(/\.$/, "")} ${surname}` : surname;
  }
  return rest[0];
}

const firstName = greetingName;

const shortDate = (d?: string) =>
  d ? new Date(d).toLocaleDateString("en-GB", { day: "2-digit", month: "short" }) : "TBC";

const isLutonAirport = (airport?: string) => detectAirport(airport) === "LTN";

/** "07762569061" -> "07762 569061". Anything else is left as typed. */
export function prettyPhone(n: string): string {
  const d = String(n || "").replace(/\s/g, "");
  return /^0\d{10}$/.test(d) ? `${d.slice(0, 5)} ${d.slice(5)}` : String(n || "").trim();
}

/** "UB70JH" -> "UB7 0JH". Left alone if it isn't a UK postcode. */
export function prettyPostcode(p: string): string {
  const raw = String(p || "").toUpperCase().replace(/\s+/g, "");
  const m = raw.match(/^([A-Z]{1,2}\d[A-Z\d]?)(\d[A-Z]{2})$/);
  return m ? `${m[1]} ${m[2]}` : String(p || "").trim();
}

/**
 * Operators can store two contact numbers — include both when present, but only
 * once. AIRLINK has the same number in both columns and was telling customers
 * to "call 07878763005 or 07878763005".
 */
export function operatorPhones(company: any): string {
  const seen = [company?.phone_number, company?.phone_number_2]
    .map((p) => String(p || "").trim())
    .filter(Boolean)
    .filter((p, i, all) => all.findIndex((q) => q.replace(/\s/g, "") === p.replace(/\s/g, "")) === i)
    .map(prettyPhone);
  return seen.join(" or ");
}

/**
 * Operator instructions are stored as web copy: HTML tags, pictograms, a
 * paragraph per terminal. Pasted straight into a text message that became 2,642
 * characters of "<b>VEHICLE DROP OFF PROCEDURE</b><br/>" across 40 paid
 * segments. Text messages are now built from facts instead, and this reduces
 * any stored prose to something safe to put in one.
 */
export function plainText(raw: unknown): string {
  return String(raw ?? "")
    .replace(/<br\s*\/?>/gi, " ")
    .replace(/<[^>]+>/g, "")
    .replace(/&amp;/g, "&").replace(/&nbsp;/g, " ").replace(/&lt;/g, "<").replace(/&gt;/g, ">")
    .replace(/[\u{1F000}-\u{1FAFF}\u{2600}-\u{27BF}\u{2B00}-\u{2BFF}\u{2300}-\u{23FF}\u{FE0F}\u{200D}]/gu, "")
    .replace(/[‘’]/g, "'").replace(/[“”]/g, '"').replace(/[–—]/g, "-")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Where the customer physically goes. Meet & Greet is the booked terminal's own
 * entry; Park & Ride is the operator's compound. Short enough for one segment.
 */
export function placeFor(company: any, b: MessageBooking): string {
  // An operator that does not serve this airport must never name a place: that
  // is how someone drives to the wrong one.
  if (!operatesAt(company, detectAirport(b.airport))) return "";
  const isParkRide = String(company?.category || "").toLowerCase().includes("park");
  if (isParkRide) {
    const addr = plainText(company?.address);
    const pcode = plainText(company?.postcode);
    if (addr.includes("@") || addr.length < 6) return prettyPostcode(pcode);
    const street = addr.split(",").slice(0, 2).map((s) => s.trim()).filter(Boolean).join(", ");
    return [street, prettyPostcode(pcode)].filter(Boolean).join(", ");
  }
  const t = company?.terminal_data?.[String(b.terminal ?? "").trim()];
  return [plainText(t?.address), prettyPostcode(plainText(t?.postcode))].filter(Boolean).join(", ");
}

/**
 * How long before arrival the operator wants the call. Read from their own
 * wording ("call ... when you are 20 mins away"), because Park & Ride asks for
 * 30 and Meet & Greet for 20. Falls back rather than inventing a number.
 */
export function callAheadMinutes(company: any, isLuton: boolean): number | null {
  const m = plainText(arrivalText(isLuton, company)).match(/(\d{2})\s*min/i);
  const n = m ? Number(m[1]) : NaN;
  return n >= 5 && n <= 120 ? n : null;
}

/**
 * Operator's on-arrival wording for a given airport. Never falls through to the
 * other airport's text: see app/lib/airport.ts for why that matters.
 */
export function arrivalText(isLuton: boolean, company: any): string {
  return instructionsFor(company, isLuton ? "LTN" : "LHR", "arrival").text;
}

/** Operator's on-return wording, under the same rule. */
export function returnText(isLuton: boolean, company: any): string {
  return instructionsFor(company, isLuton ? "LTN" : "LHR", "return").text;
}

// ── Templates ───────────────────────────────────────────────────────────────

/** Sent automatically the moment payment lands. Operator usually unassigned. */
export function bookingConfirmationBody(b: MessageBooking): string {
  return `AeroPark Direct: Booking confirmed, ref ${b.booking_ref}. Drop-off ${shortDate(b.dropoff_date)}, return ${shortDate(b.pickup_date)}. Full details & instructions are in your email. Questions? Call ${AGENT_NUMBER}.`;
}

/** Chases a missing return flight number so the operator can track the landing. */
export function missingFlightBody(b: MessageBooking): string {
  return `Hi ${b.full_name || "there"}, AeroPark Direct here. We're missing your return flight number for ref ${b.booking_ref} — reply with it so we can track your landing and have your car ready on time.`;
}

/**
 * Drop-off morning. Operator-aware: an assigned operator's own instructions and
 * numbers, otherwise our number for bookings we hold ourselves.
 */
export function dropoffDayBody(b: MessageBooking, company: any | null): string {
  // Treat an operator that does not serve this booking's airport as no operator
  // at all: our own number is always better than another airport's directions.
  if (company && !operatesAt(company, detectAirport(b.airport))) company = null;
  const greeting = `Hi ${firstName(b.full_name)}, AeroPark Direct here. It's drop-off day for ref ${b.booking_ref}.`;
  if (!company) {
    return `${greeting} When you arrive, call ${AGENT_NUMBER} and we will meet you to take your car. Full details are in your email.`;
  }
  const mins = callAheadMinutes(company, isLutonAirport(b.airport));
  const phones = operatorPhones(company);
  const place = placeFor(company, b);
  return [
    greeting,
    place ? `Go to ${place}.` : "",
    phones ? `Call ${phones}${mins ? ` about ${mins} minutes before you arrive` : " when you arrive"}.` : "",
    "Full instructions are in your confirmation email.",
  ].filter(Boolean).join(" ");
}

/** Return morning. Same operator-aware rule as drop-off. */
export function returnDayBody(b: MessageBooking, company: any | null): string {
  if (company && !operatesAt(company, detectAirport(b.airport))) company = null;
  const greeting = `Hi ${firstName(b.full_name)}, AeroPark Direct here. It's return day for ref ${b.booking_ref}.`;
  if (!company) {
    return `${greeting} Once you have collected your luggage, call ${AGENT_NUMBER} and your car and parking ticket will be ready.`;
  }
  const phones = operatorPhones(company);
  const place = placeFor(company, b);
  return [
    greeting,
    phones
      ? `Call ${phones} when you land, then again once you have your bags, so your car is ready.`
      : "Call the number in your confirmation email when you land, then again once you have your bags.",
    place ? `Collection: ${place}.` : "",
  ].filter(Boolean).join(" ");
}

/** Trustpilot review request — sent the day after collection, or on demand. */
export function reviewRequestBody(b: MessageBooking): string {
  return `Hi ${firstName(b.full_name)}, thanks for parking with AeroPark Direct! We hope everything went smoothly. If you have 30 seconds, an honest review would mean a lot to us: ${REVIEW_LINK}`;
}

/**
 * Invites a past customer to book again. Manual send only.
 *
 * This one is marketing, not a booking message. PECR allows it to an existing
 * customer for a similar service (the "soft opt-in"), but only if every message
 * offers a way out — hence the last line. Do not remove it, and do not send
 * this to anyone who has not booked before.
 */
export function rebookBody(b: MessageBooking): string {
  return `Hi ${firstName(b.full_name)}, thanks again for parking with AeroPark Direct. You can book your next trip at www.aeroparkdirect.co.uk, and your discount is applied automatically at checkout. Reply STOP if you would rather not hear from us.`;
}

// ── Admin Message Centre catalogue ───────────────────────────────────────────

export type TemplateId =
  | "dropoff" | "return" | "review" | "flight" | "confirmation" | "rebook" | "custom";

export const MESSAGE_TEMPLATES: { id: TemplateId; label: string; hint: string }[] = [
  { id: "dropoff",      label: "Drop-off info",   hint: "Where to go + operator number" },
  { id: "return",       label: "Return info",     hint: "How to collect the car" },
  { id: "review",       label: "Review request",  hint: "Trustpilot link" },
  { id: "flight",       label: "Flight number",   hint: "Chase a missing flight number" },
  { id: "confirmation", label: "Confirmation",    hint: "Re-send booking confirmation" },
  { id: "rebook",       label: "Book again",      hint: "Invite a past customer back" },
  { id: "custom",       label: "Custom",          hint: "Write your own" },
];

/** Render a template for a booking. Returns "" for `custom` (blank canvas). */
export function renderTemplate(id: TemplateId, b: MessageBooking, company: any | null): string {
  switch (id) {
    case "dropoff":      return dropoffDayBody(b, company);
    case "return":       return returnDayBody(b, company);
    case "review":       return reviewRequestBody(b);
    case "flight":       return missingFlightBody(b);
    case "confirmation": return bookingConfirmationBody(b);
    case "rebook":       return rebookBody(b);
    default:             return "";
  }
}

// ── SMS cost/segment estimation ─────────────────────────────────────────────

// Characters representable in the GSM 03.38 alphabet (single-byte in SMS).
const GSM_CHARS =
  "@£$¥èéùìòÇ\nØø\rÅåΔ_ΦΓΛΩΠΨΣΘΞÆæßÉ !\"#¤%&'()*+,-./0123456789:;<=>?" +
  "¡ABCDEFGHIJKLMNOPQRSTUVWXYZÄÖÑÜ§¿abcdefghijklmnopqrstuvwxyzäöñüà";
const GSM_EXTENDED = "^{}\\[~]|€"; // these cost two characters each

/**
 * Estimate SMS segments. Any character outside GSM 03.38 (e.g. an emoji or a
 * curly quote) forces UCS-2 for the whole message: 70 chars per segment instead
 * of 160, so a stray emoji can double the send cost.
 */
export function smsInfo(text: string): { chars: number; segments: number; unicode: boolean } {
  let unicode = false;
  let weighted = 0;
  for (const ch of text) {
    if (GSM_EXTENDED.includes(ch)) weighted += 2;
    else if (GSM_CHARS.includes(ch)) weighted += 1;
    else { unicode = true; break; }
  }
  if (unicode) {
    const len = Array.from(text).length;
    return { chars: len, segments: len === 0 ? 0 : len <= 70 ? 1 : Math.ceil(len / 67), unicode: true };
  }
  return {
    chars: weighted,
    segments: weighted === 0 ? 0 : weighted <= 160 ? 1 : Math.ceil(weighted / 153),
    unicode: false,
  };
}
