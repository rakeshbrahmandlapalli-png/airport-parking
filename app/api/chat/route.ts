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

    // 🔴 THE CIRCUIT BREAKER: REFINED
    // If the last message was a tool result, we MUST force the AI to speak.
    // If we don't, it might try to "re-verify" the data by calling the tool again.
    const lastMessage = messages[messages.length - 1];
    const isToolResult = lastMessage?.role === 'tool';
    const toolChoiceControl = isToolResult ? 'none' : 'auto';

    // 2. Full Power AI Instructions with explicit Workflow
    const result = await streamText({
      model: openai('gpt-4o-mini') as any,
      toolChoice: toolChoiceControl, 
      messages: messages,
      system: `You are AERO, the elite AI Concierge for AeroPark Direct.
      
      CURRENT REALITY:
      - The current date and time is: ${currentDate}.
      
      WORKFLOW RULES:
      1. If the user asks for a price, call 'checkLivePrices' IMMEDIATELY.
      2. As soon as you receive the tool results, YOU ARE FINISHED SCANNING.
      3. Do NOT call the tool a second time. Use the dailyRate from the history to quote the user.
      4. Always advise a 45-min buffer for toddlers/elderly.
      5. ULEZ only applies at Heathrow (LHR).
      
      QUOTING STYLE:
      - Be confident. Say: "I've scanned our live database. Meet & Greet at [Airport] is currently starting at £[Rate] per day."
      - Follow up by asking for their specific travel dates so you can build their link.
      
      CRITICAL COMMAND FOR BOOKING:
      - Once you have Airport + Dates, STOP TALKING and execute 'buildCustomBooking'.
      - Do not ask for confirmation. Push the button.`,
      
      tools: {
        checkLivePrices: tool({
          description: 'Fetch live daily parking rates from Supabase.',
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

            // Returning a concise summary helps the AI not get confused by big data objects
            return { 
              airport, 
              rates, 
              status: "SUCCESS",
              finalInstruction: "You have the data. Provide the quote to the user now. DO NOT call this tool again." 
            };
          }
        }),

        buildCustomBooking: tool({
          description: 'Generates a custom URL to the Results Page.',
          parameters: z.object({
            airport: z.string().describe("Luton (LTN) or Heathrow (LHR)"),
            dropoffDate: z.string().describe("YYYY-MM-DD"),
            pickupDate: z.string().describe("YYYY-MM-DD"),
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

    return result.toAIStreamResponse();

  } catch (error) {
    console.error("AERO API Error:", error);
    return new Response(
      "AERO is currently recalibrating. For immediate assistance, please contact our support team.",
      { status: 503 }
    );
  }
}