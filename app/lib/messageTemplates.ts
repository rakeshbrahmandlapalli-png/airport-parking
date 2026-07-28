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
  if (p.startsWith("+")) return p;
  if (p.startsWith("00")) return `+${p.slice(2)}`;
  if (p.startsWith("44")) return `+${p}`;
  if (p.startsWith("0")) return `+44${p.slice(1)}`;
  if (/^7\d{9}$/.test(p)) return `+44${p}`;
  return `+${p}`;
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

const isLutonAirport = (airport?: string) => !!airport?.toLowerCase().includes("luton");

/** Operators can store two contact numbers — include both when present. */
export function operatorPhones(company: any): string {
  const p1 = String(company?.phone_number || "").trim();
  const p2 = String(company?.phone_number_2 || "").trim();
  if (p1 && p2) return `${p1} or ${p2}`;
  return p1 || p2 || "";
}

/** Operator's on-arrival wording, airport-specific with sensible fallbacks. */
export function arrivalText(isLuton: boolean, company: any): string {
  return isLuton
    ? company?.on_arrival_ltn || company?.on_arrival || "Please call your parking provider 20 minutes before you arrive."
    : company?.on_arrival_lhr || company?.on_arrival || "Please call your parking provider 20 minutes before you arrive.";
}

/** Operator's on-return wording, airport-specific with sensible fallbacks. */
export function returnText(isLuton: boolean, company: any): string {
  return isLuton
    ? company?.on_return_ltn || company?.on_return || "Please call your parking provider after collecting your luggage."
    : company?.on_return_lhr || company?.on_return || "Please call your parking provider after collecting your luggage.";
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
  if (!company) {
    return `AeroPark Direct: Drop-off day for ref ${b.booking_ref}. When you arrive, call ${AGENT_NUMBER} and we'll meet you to take your car. Full details are in your email.`;
  }
  const phones = operatorPhones(company);
  const phone = phones ? ` Call ${phones} on arrival.` : "";
  return `AeroPark Direct: Drop-off day for ref ${b.booking_ref}. ${arrivalText(isLutonAirport(b.airport), company)}${phone} Full directions are in your email.`;
}

/** Return morning. Same operator-aware rule as drop-off. */
export function returnDayBody(b: MessageBooking, company: any | null): string {
  if (!company) {
    return `AeroPark Direct: Today's your return day, ref ${b.booking_ref}. Once you've collected your luggage, call ${AGENT_NUMBER} and your car and parking ticket will be ready.`;
  }
  const phones = operatorPhones(company);
  const phone = phones ? ` Call ${phones}.` : "";
  return `AeroPark Direct: Today's your return day, ref ${b.booking_ref}. ${returnText(isLutonAirport(b.airport), company)}${phone}`;
}

/** Trustpilot review request — sent the day after collection, or on demand. */
export function reviewRequestBody(b: MessageBooking): string {
  return `Hi ${firstName(b.full_name)}, thanks for parking with AeroPark Direct! We hope everything went smoothly. If you have 30 seconds, an honest review would mean a lot to us: ${REVIEW_LINK}`;
}

/** Invites a past customer to book again. Manual send only. */
export function rebookBody(b: MessageBooking): string {
  return `Hi ${firstName(b.full_name)}, great to hear from you! You can book your next trip in under a minute at www.aeroparkdirect.co.uk — your discount is applied automatically at checkout, nothing to enter. Any questions, just reply here.`;
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
