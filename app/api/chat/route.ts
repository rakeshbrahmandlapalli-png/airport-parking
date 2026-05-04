import { openai } from '@ai-sdk/openai';
import { streamText } from 'ai';
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
      - Warm, conversational, and deeply empathetic to the stress of flying.
      - Speak like a friendly local expert, not a stiff robot. 
      - Be reassuring. Use phrases like "Let's get this sorted for you" or "I'll make sure your car is in good hands."
      - Remain highly professional when discussing payments, security, or data.`,
      
      // 2. INJECT "HANDS" (FUNCTION CALLING)
      tools: {
        buildCustomBooking: {
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
          execute: async (args: any) => {
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
              message: "URL generated successfully. Present this markdown link to the user."
            };
          },
        } as any, // Safety net to prevent TS from complaining about the missing tool() wrapper
      },
    });

    return result.toTextStreamResponse();

  } catch (error) {
    console.error("AERO API Error:", error);
    return new Response(
      "AERO is currently recalibrating. For immediate assistance, please contact our support team.",
      { status: 503 }
    );
  }
}