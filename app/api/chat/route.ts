/**
 * AERO Concierge — API Route
 * Compatible with: ai@4.x · @ai-sdk/openai@1.x · @ai-sdk/react@1.x
 *
 * KEY FACTS ABOUT ai@4 vs the broken ai@6 you had:
 *
 * ✅ streamText()       — unchanged, still top-level import from 'ai'
 * ✅ tool()             — unchanged, still top-level import from 'ai'
 * ✅ maxSteps           — top-level streamText option (not nested)
 * ✅ toDataStreamResponse() — still exists on StreamTextResult
 * ✅ execute()          — returns Promise<object> in ai@4 (NOT string like ai@6 canary)
 * ✅ openai()           — from '@ai-sdk/openai' v1, no `as any` cast needed
 * ✅ SUPABASE_SERVICE_ROLE_KEY — server-only, never NEXT_PUBLIC_ on a route
 */

import { logger } from "@/app/lib/logger";
import { openai } from '@ai-sdk/openai';
import { streamText, tool } from 'ai';
import { z } from 'zod';
import { createClient } from '@supabase/supabase-js';
import { rateLimit, getClientIp } from '@/app/lib/rateLimit';

// ─── SERVER-SIDE SUPABASE (service role — bypasses RLS) ──────────────────────
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export const maxDuration = 60;

// Live price gateway (same source the results page uses).
const GATEWAY_URL = 'https://luton247airportparking.co.uk/agent/get_parking_price';

// ─── AIRPORT NORMALISATION ───────────────────────────────────────────────────
type AirportCode = 'LTN' | 'LHR';

function normaliseAirport(raw: string): AirportCode {
  const s = raw.toLowerCase();
  if (s.includes('heathrow') || s.includes('lhr')) return 'LHR';
  return 'LTN';
}

// The results page keys off the FULL airport label, not the code — passing a
// bare "LHR" makes it silently fall back to Luton. Always hand it the label.
function airportLabel(code: AirportCode): string {
  return code === 'LHR' ? 'Heathrow (LHR)' : 'Luton (LTN)';
}

// Pull a live dated price for a single company via the upstream gateway.
// Fails soft (returns null) so a slow/again gateway never blocks the chat.
async function fetchLivePrice(
  token: string,
  dropDate: string,
  dropTime: string,
  pickDate: string,
  pickTime: string,
): Promise<number | null> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 8000);
  try {
    const res = await fetch(GATEWAY_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      cache: 'no-store',
      signal: controller.signal,
      body: JSON.stringify({
        token_no: token,
        drop_date: dropDate,
        drop_time: dropTime || '09:00',
        return_date: pickDate,
        return_time: pickTime || '09:00',
      }),
    });
    const text = await res.text();
    let data: any;
    try { data = JSON.parse(text); } catch { return null; }
    const arr = Array.isArray(data) ? data : [data];
    const hit = arr.find((r: any) => r && r.parking_price != null);
    return hit ? Number(hit.parking_price) : null;
  } catch {
    return null;
  } finally {
    clearTimeout(timeout);
  }
}

// ─── ROUTE HANDLER ───────────────────────────────────────────────────────────
export async function POST(req: Request): Promise<Response> {
  try {
    // Rate limit — best-effort per-IP guard against runaway OpenAI cost.
    const ip = getClientIp(req);
    const rl = rateLimit(`chat:${ip}`, 30, 60_000);
    if (!rl.ok) {
      return new Response(
        JSON.stringify({ error: 'You are sending messages very fast. Please wait a moment.' }),
        { status: 429, headers: { 'Content-Type': 'application/json', 'Retry-After': String(rl.retryAfterSec) } }
      );
    }

    const { messages } = await req.json();
    const currentDate = new Date().toLocaleString('en-GB', { timeZone: 'Europe/London' });

    const result = streamText({
      model: openai('gpt-4o-mini'),
      messages,
      maxSteps: 5,

      system: `You are AERO, the elite AI Concierge for AeroPark Direct.

CURRENT DATE/TIME: ${currentDate}

CORE MISSION:
- Help users compare and book airport parking at London Luton (LTN) and Heathrow (LHR).
- We offer two services: Meet & Greet (driver meets you at the terminal, parks & returns your car) and Park & Ride (park yourself, short shuttle to terminal).
- ULEZ applies ONLY at Heathrow (LHR). Luton does NOT have ULEZ. The ULEZ charge is £12.50/day for non-compliant vehicles.
- If passengers include toddlers or elderly, always recommend a 45-minute buffer.
- Keep replies short, warm and specific. Use British English and the £ symbol.

SCOPE GUARDRAIL:
- You ONLY help with AeroPark Direct airport parking. If asked anything off-topic
  (general knowledge, other companies, jokes, coding, etc.), politely decline in one
  sentence and steer back to parking. Never invent information.

KEY POLICIES (answer these confidently — they are true):
- Free cancellation up to 24 hours before drop-off.
- All compounds have 24/7 CCTV, perimeter fencing, and are fully insured; photos taken on handover.
- Operators monitor live flight arrivals — if your return flight is delayed, your car is ready when you land at no extra charge.
- Pets are NOT allowed on Park & Ride shuttles → always recommend Meet & Greet for pet owners.
- To manage or amend a booking, direct users to the "Manage Booking" page.

STEP 1 — PRICE QUESTIONS:
- When the user asks about prices, call checkLivePrices.
- If you already know their drop-off and pick-up dates, pass them so you return an EXACT live total. Otherwise you'll return "from" daily guide rates.
- Show results clearly: provider name, service type, and price.

STEP 2 — PROMO CODES:
- If the user mentions a discount, voucher, promo, or "any deals?", call getActivePromo and tell them the live code and how much it saves, applied at checkout.

STEP 3 — BEFORE BOOKING, collect all of:
  a) Airport (Luton or Heathrow)
  b) Service: Meet & Greet or Park & Ride
  c) Drop-off date and time
  d) Pick-up date and time
  e) Travelling with a pet? (yes/no)
  f) Corporate trip? (yes/no)
  g) Group type: solo, couple, family, or group

STEP 4 — ULEZ:
- LHR → ulezRisk=true unless the user confirms a ULEZ-exempt vehicle.
- LTN → ulezRisk=false always.

STEP 5 — BOOKING:
- Once airport + service + both dates are known, call buildCustomBooking immediately.
- Do not narrate — just execute the tool.
- After the URL is returned, present it as a clickable link.

ESCALATION:
- If you cannot help (complaint, special request, anything outside parking booking),
  give the user our email info@aeroparkdirect.co.uk and offer to have the team follow up.`,

      tools: {
        // ── TOOL 1 ──────────────────────────────────────────────────────
        checkLivePrices: tool({
          description:
            'Fetch parking rates for active partners. If drop-off and pick-up dates are known, pass them to get an EXACT live total; otherwise returns "from" daily guide rates.',
          parameters: z.object({
            airport:     z.string().describe('Airport name or code: Luton, LTN, Heathrow, or LHR'),
            dropoffDate: z.string().optional().describe('YYYY-MM-DD, if known'),
            pickupDate:  z.string().optional().describe('YYYY-MM-DD, if known'),
            dropoffTime: z.string().optional().describe('HH:MM 24h, if known'),
            pickupTime:  z.string().optional().describe('HH:MM 24h, if known'),
          }),
          execute: async ({ airport, dropoffDate, pickupDate, dropoffTime, pickupTime }) => {
            const code = normaliseAirport(airport);
            logger.info(`🚀 AERO DB — ${airport} → ${code}`);

            const { data, error } = await supabase
              .from('companies')
              .select('name, category, luton_price, heathrow_price, api_token, pricing_mode, operates_at_luton, operates_at_heathrow')
              .eq('is_active', true);

            if (error || !data) {
              return { error: 'Database scan failed. Please try again.' };
            }

            const relevant = data.filter((c) =>
              code === 'LHR' ? c.operates_at_heathrow : c.operates_at_luton
            );

            const haveDates = Boolean(dropoffDate && pickupDate);
            const isSameDay = dropoffDate === pickupDate;
            const apiPickTime = isSameDay ? '23:59' : (pickupTime || '09:00');

            const rates = await Promise.all(
              relevant.map(async (c) => {
                const baseRate = code === 'LHR' ? c.heathrow_price : c.luton_price;
                let livePrice: number | null = null;

                // Only the live-API Luton compounds support exact dated quotes.
                if (haveDates && c.api_token && c.pricing_mode !== 'pivot') {
                  livePrice = await fetchLivePrice(
                    c.api_token,
                    dropoffDate as string,
                    dropoffTime || '09:00',
                    pickupDate as string,
                    apiPickTime,
                  );
                }

                return {
                  provider:  c.name,
                  type:      c.category,
                  dailyRate: baseRate,
                  total:     livePrice,            // exact live total for the dates, when available
                  priceType: livePrice != null ? 'total' : 'from-daily',
                };
              })
            );

            const filtered = rates.filter(
              (c) => (c.total != null && c.total > 0) || (c.dailyRate != null && Number(c.dailyRate) > 0)
            );

            if (filtered.length === 0) {
              return {
                airport: code,
                rates:   [],
                message: `No active providers for ${code}. Try the other airport or contact support.`,
              };
            }

            return {
              airport: code,
              rates:   filtered,
              dated:   haveDates,
              message: haveDates
                ? `Found ${filtered.length} option(s) for ${code} for your dates. Live totals shown where available.`
                : `Found ${filtered.length} provider(s) for ${code}. Share your dates for an exact total.`,
            };
          },
        }),

        // ── TOOL — PROMO LOOKUP ──────────────────────────────────────────
        getActivePromo: tool({
          description: 'Look up the current active promotional discount code, if any.',
          parameters: z.object({}),
          execute: async () => {
            const nowIso = new Date().toISOString();
            const { data, error } = await supabase
              .from('promotions')
              .select('code, discount_percent, expiry_date, is_active')
              .neq('is_active', false)
              .order('discount_percent', { ascending: false });

            if (error || !data?.length) {
              return { hasPromo: false, message: 'No public promo code is live right now, but prices are already competitive.' };
            }

            const live = data.find(
              (p) => !p.expiry_date || new Date(p.expiry_date) >= new Date(nowIso)
            );
            if (!live) {
              return { hasPromo: false, message: 'No active promo code at the moment.' };
            }

            return {
              hasPromo: true,
              code: live.code,
              discountPercent: Number(live.discount_percent),
              message: `Use code ${live.code} for ${Number(live.discount_percent)}% off — apply it at checkout.`,
            };
          },
        }),

        // ── TOOL 2 ──────────────────────────────────────────────────────
        buildCustomBooking: tool({
          description: 'Build a pre-filled booking URL once all travel details are confirmed.',
          parameters: z.object({
            airport:         z.string().describe('LTN or LHR'),
            servicePreference: z.enum(['meet-greet', 'park-ride']).default('meet-greet')
              .describe('Meet & Greet or Park & Ride'),
            dropoffDate:     z.string().describe('YYYY-MM-DD'),
            dropoffTime:     z.string().describe('HH:MM 24h'),
            pickupDate:      z.string().describe('YYYY-MM-DD'),
            pickupTime:      z.string().describe('HH:MM 24h'),
            hasPet:          z.boolean().default(false),
            ulezRisk:        z.boolean().default(false),
            isCorporate:     z.boolean().default(false),
            isLastMinute:    z.boolean().default(false),
            travelGroupType: z.enum(['solo', 'couple', 'family', 'group']).default('family'),
          }),
          execute: async (args) => {
            const code = normaliseAirport(args.airport);

            const params = new URLSearchParams({
              // FULL label — the results page keys off "Heathrow"/"Luton", not the code.
              airport:         airportLabel(code),
              type:            args.servicePreference,
              dropoffDate:     args.dropoffDate,
              dropoffTime:     args.dropoffTime,
              pickupDate:      args.pickupDate,
              pickupTime:      args.pickupTime,
              hasPet:          String(args.hasPet),
              ulezRisk:        String(args.ulezRisk),
              isCorporate:     String(args.isCorporate),
              isLastMinute:    String(args.isLastMinute),
              travelGroupType: args.travelGroupType,
            });

            const url = `/results?${params.toString()}`;
            logger.info(`🔗 AERO BOOKING: ${url}`);

            return { success: true, url };
          },
        }),
      },
    });

    return result.toDataStreamResponse();

  } catch (error) {
    logger.error('AERO API Error:', error);
    return new Response(
      JSON.stringify({
        error:   'AERO is temporarily unavailable.',
        details: error instanceof Error ? error.message : 'Unknown error',
      }),
      { status: 503, headers: { 'Content-Type': 'application/json' } }
    );
  }
}