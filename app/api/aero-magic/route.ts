import { openai } from '@ai-sdk/openai';
import { generateObject } from 'ai';
import { z } from 'zod';
import { NextRequest } from 'next/server';
import { rateLimit, getClientIp } from '@/app/lib/rateLimit';

// ─── CONSTANTS ────────────────────────────────────────────────────────────────
const MAX_PROMPT_LENGTH = 1000;
const MODEL = 'gpt-4o-mini';
const FALLBACK_MODEL = 'gpt-4o';
// Generous enough for a real person refining a search, tight enough to stop abuse.
const RATE_LIMIT = 15;
const RATE_WINDOW_MS = 60_000;

// ─── HELPERS ──────────────────────────────────────────────────────────────────
const formatDateForSystem = (isoStr: string): string => {
  const d = new Date(isoStr);
  if (isNaN(d.getTime())) return isoStr;
  return d.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
};

const UK_SCHOOL_HOLIDAYS = [
  { name: "February Half Term", start: [1, 14], end: [1, 21] },
  { name: "Easter",             start: [3, 1],  end: [3, 18] },
  { name: "May Half Term",      start: [4, 24], end: [4, 30] },
  { name: "Summer Holidays",    start: [7, 20], end: [8, 31] },
  { name: "October Half Term",  start: [9, 25], end: [10, 2] },
  { name: "Christmas",          start: [11, 20], end: [11, 31] },
];

const getNearestHoliday = (date: Date): string | null => {
  const m = date.getMonth(), day = date.getDate();
  for (const h of UK_SCHOOL_HOLIDAYS) {
    const [sm, sd] = h.start; const [em, ed] = h.end;
    if ((m === sm && day >= sd) || (m === em && day <= ed) || (m > sm && m < em)) return h.name;
  }
  return null;
};

// ─── SCHEMA ───────────────────────────────────────────────────────────────────
const AeroSchema = z.object({
  // Core booking — 🟢 format-enforced
  airport:     z.string().describe("Must be exactly 'Luton (LTN)' or 'Heathrow (LHR)'"),
  dropoffDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).describe("YYYY-MM-DD only"),
  dropoffTime: z.string().regex(/^\d{2}:\d{2}$/).describe("HH:MM 24-hour only"),
  pickupDate:  z.string().regex(/^\d{4}-\d{2}-\d{2}$/).describe("YYYY-MM-DD only"),
  pickupTime:  z.string().regex(/^\d{2}:\d{2}$/).describe("HH:MM 24-hour only"),
  terminal:    z.string().nullable(),

  // Service
  servicePreference: z.enum(['meet-greet', 'park-ride']).nullable(),

  // Flights
  flightNumber: z.string().nullable().describe("Uppercase, no spaces. e.g. 'BA123'. Null if not mentioned."),
  returnFlight: z.string().nullable().describe("Return flight number if mentioned, else null."),

  // Travel profile
  travelGroupType:        z.enum(['solo', 'couple', 'family', 'group', 'corporate']),
  numberOfTravellers:     z.number().int().min(1).max(50).describe("Estimated headcount, default 1"),
  hasOversizedLuggage:    z.boolean(),
  isRedEye:               z.boolean().describe("Flight before 06:00 or after 22:00"),
  isLastMinute:           z.boolean().describe("Travel within 48 hours of current date"),
  isBudgetFocused:        z.boolean().describe("User mentions cheap, budget, save, discount"),
  isFrequentFlyer:        z.boolean().describe("Business class, lounge, miles, frequent flyer mentioned"),
  ulezRisk:               z.boolean().describe("Heathrow + older/diesel car = ULEZ risk"),
  hasPet:                 z.boolean(),
  isWinter:               z.boolean().describe("Travel Nov-Feb"),
  requiresCoveredParking: z.boolean().describe("Luxury or expensive car mentioned"),
  isSchoolHoliday:        z.boolean().describe("Travel falls in UK school holiday period"),
  isCorporate:            z.boolean().describe("Work trip, expenses, business mentioned"),
  hasPromoCode:           z.boolean().describe("User mentions promo, discount code, voucher"),
  needsAccessibility:     z.boolean().describe("Wheelchair, mobility, disabled, blue badge mentioned"),

  // Pricing intelligence
  estimatedDays: z.number().int().min(0).describe("Parking days: pickupDate minus dropoffDate"),
  priceCategory: z.enum(['budget', 'standard', 'premium']),

  // UI
  aeroTip:              z.string().max(300).describe("Specific tip mentioning their airport/service/situation. NOT generic."),
  suggestedAncillaries: z.array(z.enum(['lounge', 'fast-track'])).describe("Only suggest if genuinely relevant"),
  isReadyToBook:        z.boolean().describe("TRUE only when airport + both dates + explicit service preference all present"),
  confidence:           z.number().min(0).max(1),
  parsedSummary:        z.string().describe("One sentence summary of what Aero understood."),
});

export type AeroResponse = z.infer<typeof AeroSchema>;

// ─── POST HANDLER ─────────────────────────────────────────────────────────────
export async function POST(req: NextRequest) {

  // 0. Rate limit — best-effort per-IP guard against runaway OpenAI cost.
  const ip = getClientIp(req);
  const rl = rateLimit(`aero-magic:${ip}`, RATE_LIMIT, RATE_WINDOW_MS);
  if (!rl.ok) {
    return Response.json(
      { error: "You're searching very fast. Please wait a few seconds and try again." },
      { status: 429, headers: { 'Retry-After': String(rl.retryAfterSec) } }
    );
  }

  // 1. Parse body
  let body: any;
  try { body = await req.json(); }
  catch { return Response.json({ error: "Invalid JSON." }, { status: 400 }); }

  const { prompt, currentDate } = body;

  if (!prompt || typeof prompt !== 'string') {
    return Response.json({ error: "Missing 'prompt' field." }, { status: 400 });
  }

  const trimmedPrompt = prompt.trim().slice(0, MAX_PROMPT_LENGTH);
  if (!trimmedPrompt) {
    return Response.json({ error: "Prompt is empty." }, { status: 400 });
  }

  // 2. Enrich date context
  const now = currentDate ? new Date(currentDate) : new Date();
  const formattedNow   = formatDateForSystem(now.toISOString());
  const monthNum       = now.getMonth() + 1;
  const isWinterNow    = monthNum >= 11 || monthNum <= 2;
  const nearestHoliday = getNearestHoliday(now);
  const in48hrs        = new Date(now.getTime() + 48 * 3600 * 1000).toISOString().split('T')[0];
  const todayStr       = now.toISOString().split('T')[0];

  // 3. System prompt
  const systemPrompt = `You are Aero, the elite AI concierge for AeroPark Direct — a UK airport parking agent serving Luton (LTN) and Heathrow (LHR).

TODAY: ${formattedNow}
SEASON: ${isWinterNow ? 'WINTER (Nov-Feb) — cold, dark mornings. Strong bias towards Meet & Greet.' : 'Warmer season.'}
${nearestHoliday ? `SCHOOL HOLIDAY: We are in/near ${nearestHoliday} — high demand, families travelling, last-minute risk.` : 'School term time — standard demand.'}
LAST MINUTE THRESHOLD: Any travel on or before ${in48hrs} counts as last-minute.

═══ INTELLIGENCE MODULES ═══

[1] DATE & TIME PARSING — CRITICAL
  - Output dates as YYYY-MM-DD and times as HH:MM (24-hour). No exceptions.
  - Relative dates: "next Friday", "this weekend", "in 2 weeks" → calculate from ${todayStr}.
  - "Morning" → 07:00. "Afternoon" → 14:00. "Evening" → 19:00. "Red-eye" / "early flight" → 04:00.
  - "Landing at 22:00" → pickupTime = 22:00 + buffer (domestic +45min = 22:45, international +90min = 23:30).
  - Domestic return: +45 min buffer on pickupTime. International / long-haul: +90 min.
  - estimatedDays = (pickupDate - dropoffDate) in calendar days.

[2] AIRPORT DETECTION
  - BA (BA*/BAW), Virgin (VS*/VIR) → Heathrow. BA is usually T5, Virgin is T3.
  - easyJet (EZY/U2), Ryanair (FR/RYR), Wizz (W6/WZZ), TUI (BY) → Luton.
  - Jet2 (LS) → Luton primarily.
  - If ambiguous → default Luton (LTN), set confidence ≤ 0.65.
  - Airport output MUST be exactly "Luton (LTN)" or "Heathrow (LHR)". Nothing else.

[3] SERVICE SELECTION
  - hasPet=true → ALWAYS meet-greet (pets banned on Park & Ride).
  - hasOversizedLuggage=true → ALWAYS meet-greet.
  - isRedEye=true + isWinter=true → strongly prefer meet-greet.
  - isBudgetFocused=true + estimatedDays≥7 → suggest park-ride (saves money on long stays).
  - estimatedDays≤3 → meet-greet is typically more cost-effective.
  - estimatedDays≥14 → park-ride for cost savings.
  - isCorporate=true → meet-greet + fast-track.
  - needsAccessibility=true → meet-greet.
  - Family with toddlers/elderly → meet-greet + add 45 min dropoff buffer.
  - requiresCoveredParking=true → meet-greet.

[4] ULEZ (Heathrow only)
  - If airport=Heathrow AND user mentions older car / diesel / petrol car → ulezRisk=true.
  - Mention £12.50/day ULEZ charge in aeroTip if relevant.

[5] PRICING INTELLIGENCE
  - budget: user mentions cheap/discount/save + park-ride or short stay.
  - premium: business, lounge, luxury car, first class mentioned.
  - standard: everything else.

[6] UPSELLS — only when genuinely relevant
  - fast-track: tight connection (<2hr), business traveller, or family with young kids.
  - lounge: frequent flyer, corporate, very early flight (before 06:00), user mentions waiting.
  - Suggest both only if STRONG case for both.

[7] PROMO AWARENESS
  - "promo", "discount code", "voucher", "deal" → hasPromoCode=true.
  - Mention in aeroTip: "Apply your promo code at checkout for the discount."

[8] SCHOOL HOLIDAYS
  - If travel dates fall in a UK school holiday → isSchoolHoliday=true.
  - Mention in aeroTip that availability may be limited.

[9] CONFIDENCE SCORING
  - 0.9-1.0: Airport, both dates, times, and service all explicitly stated.
  - 0.7-0.9: Airport + dates clear; service inferred from context.
  - 0.5-0.7: Airport assumed or dates vague (e.g. "next week").
  - <0.5: Critical info missing. Always set isReadyToBook=false.

[10] AERO TIP — MUST be specific, NOT generic
  - Mention their actual airport, dates, or situation.
  - Good: "A 04:30 easyJet from Luton in December means a 3am pickup from home — Meet & Greet means your car is steps away when you land."
  - Bad: "We recommend Meet & Greet for a smooth experience."
  - Max 280 characters.

[11] parsedSummary
  - Exactly one sentence. Include: service type, airport, duration, group type.
  - e.g. "Meet & Greet at Heathrow T5 for 2, 7 nights from June 10, flight BA123."

[12] isReadyToBook — TRUE only when ALL four are explicit:
  1. Valid airport ("Luton (LTN)" or "Heathrow (LHR)")
  2. dropoffDate is a real YYYY-MM-DD
  3. pickupDate is a real YYYY-MM-DD
  4. servicePreference is 'meet-greet' or 'park-ride'
  If ANY is vague, assumed, or missing → FALSE.

[13] SCOPE GUARDRAIL
  - You ONLY handle airport parking searches for Luton (LTN) and Heathrow (LHR).
  - If the prompt is off-topic (jokes, general questions, other airports, anything
    unrelated to parking), still return valid JSON: default airport "Luton (LTN)",
    set confidence ≤ 0.2, isReadyToBook=false, and put a polite redirect in aeroTip
    like "I'm Aero — I help with Luton & Heathrow parking. Tell me your dates and I'll find you a price." Do not invent dates for off-topic prompts; use today + 7 days as neutral placeholders.`;

  // 4. Call AI — with one fallback to a stronger model if the mini model
  //    rate-limits or fails to produce schema-valid output.
  try {
    let object: AeroResponse;
    let usage: any;
    try {
      const r = await generateObject({
        model:  openai(MODEL),
        system: systemPrompt,
        schema: AeroSchema,
        prompt: trimmedPrompt,
      });
      object = r.object;
      usage  = r.usage;
    } catch (primaryErr: any) {
      console.warn('[Aero Magic] Primary model failed, retrying with fallback:', primaryErr?.message);
      const r = await generateObject({
        model:  openai(FALLBACK_MODEL),
        system: systemPrompt,
        schema: AeroSchema,
        prompt: trimmedPrompt,
      });
      object = r.object;
      usage  = r.usage;
    }

    // Dev logging
    if (process.env.NODE_ENV === 'development') {
      console.log(`[Aero Magic] Prompt: "${trimmedPrompt.slice(0, 80)}..." | Confidence: ${object.confidence} | Tokens: ${JSON.stringify(usage)} | Summary: ${object.parsedSummary}`);
    }

    // 5. Validate dropoffDate is not in the past
    if (object.dropoffDate && object.dropoffDate < todayStr) {
      return Response.json({
        error: `Aero detected a drop-off date in the past (${object.dropoffDate}). Please clarify your dates.`,
        parsed: object.parsedSummary,
        confidence: object.confidence,
      }, { status: 422 });
    }

    return Response.json(object);

  } catch (err: any) {
    const msg = err?.message || '';
    console.error('[Aero Magic] Error:', msg);

    if (err?.status === 429 || msg.includes('rate limit')) {
      return Response.json({ error: "Aero is at capacity. Please try the manual search form or retry in a moment." }, { status: 429 });
    }
    if (err?.status === 401 || msg.includes('API key')) {
      return Response.json({ error: "Aero is temporarily offline. Please use the manual search form." }, { status: 503 });
    }
    if (msg.includes('context length') || msg.includes('token')) {
      return Response.json({ error: "Your request was too detailed for Aero. Please shorten it and try again." }, { status: 413 });
    }

    return Response.json({ error: "Aero encountered an unexpected error. Please use the manual form below." }, { status: 500 });
  }
}