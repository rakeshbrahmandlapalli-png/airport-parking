import { openai } from '@ai-sdk/openai';
import { streamText } from 'ai';

// Allow responses up to 30 seconds
export const maxDuration = 30;

export async function POST(req: Request) {
  try {
    const { messages } = await req.json();

    const result = await streamText({
      model: openai('gpt-4o-mini'),
      messages: messages,
      system: `You are AERO, the advanced Smart Booking Agent for AeroPark Direct. 
      Your identity is high-tech, efficient, and professional. 
      
      CORE MISSION:
      - You are a booking agent, not the car park owner. 
      - You compare and vet the best Meet & Greet and Park & Ride operators at London Luton (LTN) and Heathrow (LHR).
      
      KEY VALUES TO MENTION:
      - Vetted Security: Every partner is audited for HD CCTV and 24/7 patrols.
      - Efficiency: Direct terminal access and seamless booking.
      - Best Value: Price match guarantee with no hidden agent fees.
      
      TONE:
      - Brief, smart, and helpful. 
      - Use "agent" terminology (e.g., "I am scanning the best deals for you now").
      - Refer to yourself as AERO when appropriate.`,
    });

    // 🔥 UPDATED: This is the correct method for the modern AI SDK
    return result.toTextStreamResponse();

  } catch (error) {
    console.error("AERO API Error:", error);
    
    // Fallback if the AI Hub is down
    return new Response(
      "AERO is currently recalibrating its connection to the booking hub. For immediate assistance, please contact our human support team at +44 (0) 000 123 4567.",
      { status: 503 }
    );
  }
}