import { openai } from '@ai-sdk/openai';
import { streamText, tool } from 'ai';
import { z } from 'zod';

// Allow responses up to 30 seconds
export const maxDuration = 30;

export async function POST(req: Request) {
  try {
    const { messages } = await req.json();
    
    // 1. INJECT TIME AWARENESS
    const currentDate = new Date().toLocaleString('en-GB', { timeZone: 'Europe/London' });

    const result = await streamText({
      model: openai('gpt-4o-mini'),
      messages: messages,
      system: `You are AERO, the elite AI Concierge for AeroPark Direct.
      Your identity is high-tech, highly empathetic, and professional.
      
      CURRENT REALITY:
      - The current date and time is: ${currentDate}. Use this to understand "tomorrow", "next week", and calculate winter months or last-minute urgency.
      
      CORE MISSION & CAPABILITIES:
      - You compare and vet the best Meet & Greet and Park & Ride operators at London Luton (LTN) and Heathrow (LHR).
      - You protect the user: Warn about ULEZ at Heathrow for older cars.
      - You anticipate needs: If they have toddlers/elderly, advise a 45-min buffer. If they have dogs, warn that shuttles ban pets and push Meet & Greet.
      
      YOUR SUPERPOWER (TOOLS):
      - If a user gives you their travel details (Airport, Dates, etc.), DO NOT just tell them the price. 
      - ALWAYS use the 'buildCustomBooking' tool to generate a tailored search link for them. 
      - Format the link beautifully in markdown like this: [👉 View Your Custom Parking Options](link)
      
      TONE:
      - Brief, smart, and helpful. Speak like an elite private concierge.`,
      
      // 2. INJECT "HANDS" (FUNCTION CALLING)
      tools: {
        buildCustomBooking: tool({
          description: 'Generates a custom URL to the Results Page based on the user intent.',
          parameters: z.object({
            airport: z.string().describe("Must be 'Luton (LTN)' or 'Heathrow (LHR)'"),
            dropoffDate: z.string().describe("Format YYYY-MM-DD"),
            pickupDate: z.string().describe("Format YYYY-MM-DD"),
            hasPet: z.boolean().describe("True if traveling with a pet"),
            ulezRisk: z.boolean().describe("True if going to Heathrow with an older vehicle"),
            isCorporate: z.boolean().describe("True if traveling for business/work"),
            isLastMinute: z.boolean().describe("True if travel is within 48 hours"),
            travelGroupType: z.enum(['solo', 'couple', 'family', 'group', 'corporate'])
          }),
          execute: async ({ airport, dropoffDate, pickupDate, hasPet, ulezRisk, isCorporate, isLastMinute, travelGroupType }) => {
            // This function takes what the AI learned from the chat and builds a URL to your Results Page!
            const params = new URLSearchParams({
              airport,
              dropoffDate,
              pickupDate,
              hasPet: String(hasPet),
              ulezRisk: String(ulezRisk),
              isCorporate: String(isCorporate),
              isLastMinute: String(isLastMinute),
              travelGroupType
            });
            
            // Return the URL back to the AI so it can show it to the user
            return { 
              success: true, 
              url: `/results?${params.toString()}`,
              message: "URL generated successfully. Present this markdown link to the user."
            };
          },
        }),
      },
    });

    return result.toTextStreamResponse();

  } catch (error) {
    console.error("AERO API Error:", error);
    return new Response(
      "AERO is currently recalibrating. For immediate assistance, please contact our support team at +44 (0) 000 123 4567.",
      { status: 503 }
    );
  }
}