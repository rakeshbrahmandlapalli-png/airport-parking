// @ts-nocheck
import { openai } from '@ai-sdk/openai';
import { streamText, tool } from 'ai';
import { z } from 'zod';
import { createClient } from '@supabase/supabase-js';

// 1. Initialize Supabase Connection
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export const maxDuration = 30;

export async function POST(req: Request) {
  try {
    const { messages } = await req.json();
    const currentDate = new Date().toLocaleString('en-GB', { timeZone: 'Europe/London' });

    // 🔴 THE CIRCUIT BREAKER
    // If the last message was a 'tool' result, it means we JUST got the data from Supabase.
    // We force toolChoice to 'none' so the AI is FORCED to speak the answer instead of looping.
    const lastMessage = messages[messages.length - 1];
    const isToolResult = lastMessage?.role === 'tool';
    const toolChoiceControl = isToolResult ? 'none' : 'auto';

    const result = await streamText({
      model: openai('gpt-4o-mini') as any,
      toolChoice: toolChoiceControl, 
      messages: messages,
      system: `You are AERO, the elite AI Concierge for AeroPark Direct.
      
      CURRENT REALITY:
      - The current date and time is: ${currentDate}.
      
      CORE MISSION & CAPABILITIES:
      - Compare and vet parking operators at London Luton (LTN) and Heathrow (LHR).
      - Warning: ULEZ applies ONLY at Heathrow (LHR). Luton (LTN) does NOT have ULEZ.
      - Safety: If passengers include toddlers or elderly, you MUST advise a 45-min buffer.
      
      HANDLING PRICE QUESTIONS:
      - If a user asks for a price/rate, call 'checkLivePrices' IMMEDIATELY.
      - Once the tool returns data, STOP. Provide the quote using the 'dailyRate' in the history.
      - Do NOT apologize for not having dates; just give the estimate and ask for their travel dates.
      
      CRITICAL COMMAND FOR BOOKING:
      - Once you have Airport AND Travel Dates, execute the 'buildCustomBooking' tool immediately.
      - Do not ask for confirmation. Push the button and stop talking.`,
      
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
              message: "DATA DISCOVERED. Use these rates to quote the user now. Do not call this tool again." 
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
              message: "URL generated successfully."
            };
          },
        }),
      },
    });

    // Matches your installed package version (ai@3.1.36)
    return result.toAIStreamResponse();

  } catch (error) {
    console.error("AERO API Error:", error);
    return new Response(
      "AERO is currently recalibrating. For immediate assistance, please contact our support team.",
      { status: 503 }
    );
  }
}