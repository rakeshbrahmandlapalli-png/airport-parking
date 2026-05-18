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

import { openai } from '@ai-sdk/openai';
import { streamText, tool } from 'ai';
import { z } from 'zod';
import { createClient } from '@supabase/supabase-js';

// ─── SERVER-SIDE SUPABASE (service role — bypasses RLS) ──────────────────────
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export const maxDuration = 60;

// ─── AIRPORT NORMALISATION ───────────────────────────────────────────────────
type AirportCode = 'LTN' | 'LHR';

function normaliseAirport(raw: string): AirportCode {
  const s = raw.toLowerCase();
  if (s.includes('heathrow') || s.includes('lhr')) return 'LHR';
  return 'LTN';
}

// ─── ROUTE HANDLER ───────────────────────────────────────────────────────────
export async function POST(req: Request): Promise<Response> {
  try {
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
- ULEZ applies ONLY at Heathrow (LHR). Luton does NOT have ULEZ.
- If passengers include toddlers or elderly, always recommend a 45-minute buffer.

STEP 1 — PRICE QUESTIONS:
- When user asks about prices, call checkLivePrices immediately.
- Show results clearly: provider name, type, and daily rate.

STEP 2 — BEFORE BOOKING, collect all of:
  a) Airport (LTN or LHR)
  b) Drop-off date and time
  c) Pick-up date and time
  d) Travelling with a pet? (yes/no)
  e) Corporate trip? (yes/no)
  f) Is booking within 48 hours?
  g) Group type: solo, couple, family, or group

STEP 3 — ULEZ:
- LHR → ulezRisk=true unless user confirms ULEZ-exempt vehicle.
- LTN → ulezRisk=false always.

STEP 4 — BOOKING:
- Once all details collected, call buildCustomBooking immediately.
- Do not narrate — just execute the tool.
- After the URL is returned, present it as a clickable link.`,

      tools: {
        // ── TOOL 1 ──────────────────────────────────────────────────────
        checkLivePrices: tool({
          description: 'Fetch live daily parking rates for active partners.',
          parameters: z.object({
            airport: z.string().describe('Airport name or code: Luton, LTN, Heathrow, or LHR'),
          }),
          execute: async ({ airport }) => {
            const code = normaliseAirport(airport);
            console.log(`🚀 AERO DB — ${airport} → ${code}`);

            const { data, error } = await supabase
              .from('companies')
              .select('name, category, luton_price, heathrow_price')
              .eq('is_active', true);

            if (error || !data) {
              return { error: 'Database scan failed. Please try again.' };
            }

            const rates = data
              .map((c) => ({
                provider:  c.name,
                type:      c.category,
                dailyRate: code === 'LHR' ? c.heathrow_price : c.luton_price,
              }))
              .filter((c) => c.dailyRate !== null && Number(c.dailyRate) > 0);

            if (rates.length === 0) {
              return {
                airport: code,
                rates:   [],
                message: `No active providers for ${code}. Try the other airport or contact support.`,
              };
            }

            return {
              airport: code,
              rates,
              message: `Found ${rates.length} provider(s) for ${code}.`,
            };
          },
        }),

        // ── TOOL 2 ──────────────────────────────────────────────────────
        buildCustomBooking: tool({
          description: 'Build a pre-filled booking URL once all travel details are confirmed.',
          parameters: z.object({
            airport:         z.string().describe('LTN or LHR'),
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
              airport:         code,
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
            console.log(`🔗 AERO BOOKING: ${url}`);

            return { success: true, url };
          },
        }),
      },
    });

    return result.toDataStreamResponse();

  } catch (error) {
    console.error('AERO API Error:', error);
    return new Response(
      JSON.stringify({
        error:   'AERO is temporarily unavailable.',
        details: error instanceof Error ? error.message : 'Unknown error',
      }),
      { status: 503, headers: { 'Content-Type': 'application/json' } }
    );
  }
}