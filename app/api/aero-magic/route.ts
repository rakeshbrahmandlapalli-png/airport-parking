import { openai } from '@ai-sdk/openai';
import { generateObject } from 'ai';
import { z } from 'zod';

export async function POST(req: Request) {
  try {
    const { prompt, currentDate } = await req.json();

    const { object } = await generateObject({
      model: openai('gpt-4o-mini'),
      system: `You are Aero, the elite AI Concierge for AeroPark Direct. 
      Your goal is to parse user intent and optimize their UK airport parking experience.

      CORE INTELLIGENCE MODULES:
      1. ULEZ AWARENESS: Heathrow is inside London ULEZ (£12.50/day for non-compliant cars). Luton is NOT. Flag 'ulezRisk' if Heathrow + older car mentioned.
      2. PACE OF TRAVEL: If 'toddlers', 'babies', or 'elderly' are mentioned, add a 45-min buffer to dropoffDate/Time.
      3. CUSTOMS & BAGGAGE: 
         - Domestic flight return: +45 min buffer. 
         - International/Long-haul: +90 min buffer.
         - Oversized (Golf/Skis/Surfing): Flag 'hasOversizedLuggage' and strongly push Meet & Greet.
      4. TERMINAL MAPPING: 
         - British Airways/Virgin: Usually Heathrow T5/T3. 
         - easyJet/Ryanair: Luton Main or Heathrow T2/T4.
      5. BUSINESS LOGIC: If 'work', 'business', or 'expense' mentioned, flag 'isCorporate'.
      6. PET LOGIC: If 'dog' or 'pet' mentioned, RESTRICT to Meet & Greet (Pets usually banned on Park & Ride shuttles).
      7. WINTER LOGIC: If currentDate is Nov-Feb, emphasize Meet & Greet to avoid cold shuttle waits.
      8. SCARCITY: If travel is within 48hrs of ${currentDate}, flag 'isLastMinute'.
      9. SPLIT PARTY: If user says they'll drop family first then park, push 'park-ride' as the cost-saver.
      10. DURATION ROI: Short trips (1-3 days) push Meet & Greet. Long trips (14+ days) push Park & Ride.`,
      
      schema: z.object({
        airport: z.string().describe("e.g., 'Luton (LTN)' or 'Heathrow (LHR)'"),
        dropoffDate: z.string(),
        dropoffTime: z.string(),
        pickupDate: z.string(),
        pickupTime: z.string(),
        terminal: z.string().nullable(),
        servicePreference: z.enum(['meet-greet', 'park-ride']).nullable(),
        
        // --- ADVANCED MAGIC FLAGS ---
        travelGroupType: z.enum(['solo', 'couple', 'family', 'group', 'corporate']),
        hasOversizedLuggage: z.boolean(),
        isRedEye: z.boolean(),
        isLastMinute: z.boolean(),
        isBudgetFocused: z.boolean(),
        isFrequentFlyer: z.boolean(),
        ulezRisk: z.boolean().describe("True if older car + Heathrow"),
        hasPet: z.boolean(),
        isWinter: z.boolean(),
        requiresCoveredParking: z.boolean().describe("True if luxury car mentioned"),
        
        // --- UI & TIPS ---
        aeroTip: z.string().describe("Bespoke advice based on their specific situation."),
        suggestedAncillaries: z.array(z.string()).describe("'lounge', 'fast-track'"),
        isReadyToBook: z.boolean().describe("True if we have enough to skip to checkout"),
        confidence: z.number()
      }),
      prompt: prompt,
    });

    return Response.json(object);

  } catch (error) {
    console.error("Aero Magic Error:", error);
    return Response.json({ error: "Aero recalibrating..." }, { status: 500 });
  }
}