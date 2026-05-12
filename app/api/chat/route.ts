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

    // 🔴 THE BUG RESOLVER: THE "HARD STOP"
    // We look at the very last message. If it came from a "tool", it means
    // the database just finished scanning. In that case, we set toolChoice to 'none'
    // to FORCE the AI to stop scanning and start talking.
    const lastMessage = messages[messages.length - 1];
    const toolResultFound = lastMessage?.role === 'tool' || (lastMessage?.role === 'assistant' && lastMessage.tool_calls);
    const toolChoiceControl = toolResultFound ? 'none' : 'auto';

    // 2. Restore Full Power AI Instructions
    const result = await streamText({
      model: openai('gpt-4o-mini') as any,
      toolChoice: toolChoiceControl, // This stops the loop
      messages: messages,
      system: `You are AERO, the elite AI Concierge for AeroPark Direct.
      
      CURRENT REALITY:
      - The current date and time is: ${currentDate}.
      
      CORE MISSION & CAPABILITIES:
      - You compare and vet the best parking operators at London Luton (LTN) and Heathrow (LHR).
      - Warning: ULEZ applies ONLY at Heathrow (LHR) for older cars. Luton (LTN) does NOT have ULEZ.
      - Safety: If passengers include toddlers or elderly, you MUST advise a 45-min buffer.
      
      HANDLING PRICE QUESTIONS:
      - If a user asks for a price/rate (e.g., "What is the price for Luton?"):
        1. Immediately execute 'checkLivePrices' to scan the database.
        2. Once the database returns the results, STOP SCANNING.
        3. Use the 'dailyRate' to provide a confident estimate to the user.
        4. Do NOT apologize for not having dates; just give the estimate and ask for their travel dates.
      
      CRITICAL COMMAND FOR BOOKING:
      - Once you have the Airport AND the Travel Dates, you have all the data you need!
      - DO NOT say "I will generate the link" or "One moment". 
      - STOP TALKING and IMMEDIATELY execute the 'buildCustomBooking' tool. 
      - If you don't know the pet or corporate status, assume false. JUST PUSH THE BUTTON.
      
      BEHAVIORAL OVERRIDE:
      - If the chat history shows you just scanned the database, DO NOT scan again. 
      - Read the results from the previous tool call and provide the answer.`,
      
      tools: {
        // 🟢 RESTORED: THE LIVE SCANNER
        checkLivePrices: tool({
          description: 'Scans the Supabase database for live daily parking rates at Luton or Heathrow.',
          parameters: z.object({
            airport: z.string().describe("Must be 'Luton' or 'Heathrow'"),
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
              message: "DATA DISCOVERED. Do not call this tool again. Quote the dailyRate to the user now." 
            };
          }
        }),

        // 🔵 RESTORED: THE BOOKING BUTTON BUILDER
        buildCustomBooking: tool({
          description: 'Generates a custom URL to the Results Page based on the user intent.',
          parameters: z.object({
            airport: z.string().describe("Must be 'Luton (LTN)' or 'Heathrow (LHR)'"),
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

    // 🟢 Stable response method for version 3.1.36
    return result.toAIStreamResponse();

  } catch (error) {
    console.error("AERO API Error:", error);
    return new Response(
      "AERO is currently recalibrating. For immediate assistance, please contact our support team.",
      { status: 503 }
    );
  }
}