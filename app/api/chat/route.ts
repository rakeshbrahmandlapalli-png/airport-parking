// @ts-nocheck
import { openai } from '@ai-sdk/openai';
import { streamText, tool } from 'ai';
import { z } from 'zod';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export const maxDuration = 30;

export async function POST(req: Request) {
  try {
    const { messages } = await req.json();
    const currentDate = new Date().toLocaleString('en-GB', { timeZone: 'Europe/London' });

    const result = await streamText({
      model: openai('gpt-4o-mini') as any,
      messages: messages,
      // 🟢 PROPER WAY: Built-in loop protection. 
      // It allows the AI to call a tool and then respond in a single request.
      maxSteps: 5, 
      system: `You are AERO, the elite AI Concierge for AeroPark Direct.
      
      CURRENT REALITY:
      - The current date and time is: ${currentDate}.
      
      CORE MISSION & CAPABILITIES:
      - Compare and vet parking operators at London Luton (LTN) and Heathrow (LHR).
      - Warning: ULEZ applies ONLY at Heathrow (LHR). Luton (LTN) does NOT have ULEZ.
      - Safety: If passengers include toddlers or elderly, you MUST advise a 45-min buffer.
      
      HANDLING PRICE QUESTIONS:
      - If a user asks for a price/rate, call 'checkLivePrices' IMMEDIATELY.
      - Once the database results are in, provide the quote using the 'dailyRate' found.
      - Do NOT apologize for not having dates; just give the estimate and ask for their travel dates.
      
      CRITICAL COMMAND FOR BOOKING:
      - Once you have Airport AND Travel Dates, execute the 'buildCustomBooking' tool immediately.
      - Push the button and stop talking.`,
      
      tools: {
        checkLivePrices: tool({
          description: 'Fetch live daily parking rates from the Supabase database.',
          parameters: z.object({
            airport: z.string().describe("Luton or Heathrow"),
          }),
          execute: async ({ airport }) => {
            console.log("🚀 AERO DB SCAN TRIGGERED FOR:", airport);
            const { data, error } = await supabase.from('companies').select('name, category, luton_price, heathrow_price');
            
            if (error || !data) return { error: "Database scan failed." };

            const isHeathrow = airport.toLowerCase().includes("heathrow");
            const rates = data.map(c => ({
              provider: c.name,
              type: c.category,
              dailyRate: isHeathrow ? c.heathrow_price : c.luton_price
            })).filter(c => c.dailyRate && c.dailyRate > 0);

            return { 
              airport, 
              rates, 
              message: "Rates retrieved successfully. Display them to the user now." 
            };
          }
        }),

        buildCustomBooking: tool({
          description: 'Generates a custom URL to the Results Page.',
          parameters: z.object({
            airport: z.string().describe("Luton (LTN) or Heathrow (LHR)"),
            dropoffDate: z.string().describe("Format YYYY-MM-DD"),
            pickupDate: z.string().describe("Format YYYY-MM-DD"),
            hasPet: z.boolean().default(false),
            ulezRisk: z.boolean().default(false),
            isCorporate: z.boolean().default(false),
            isLastMinute: z.boolean().default(false),
            travelGroupType: z.string().default('family')
          }),
          execute: async (args) => {
            const params = new URLSearchParams({
              airport: args.airport,
              dropoffDate: args.dropoffDate,
              pickupDate: args.pickupDate,
              hasPet: String(args.hasPet),
              ulezRisk: String(args.ulezRisk),
              isCorporate: String(args.isCorporate),
              isLastMinute: String(args.isLastMinute),
              travelGroupType: args.travelGroupType
            });
            
            return { 
              success: true, 
              url: `/results?${params.toString()}`,
              message: "URL generated."
            };
          },
        }),
      },
    });

    // 🟢 PROPER WAY: Modern stream response for @ai-sdk/react
    return result.toDataStreamResponse();

  } catch (error) {
    console.error("AERO API Error:", error);
    return new Response(
      "AERO is currently recalibrating.",
      { status: 503 }
    );
  }
}