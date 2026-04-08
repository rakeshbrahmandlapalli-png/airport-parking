import { openai } from '@ai-sdk/openai';
import { streamText } from 'ai';

// Allow responses up to 30 seconds
export const maxDuration = 30;

export async function POST(req: Request) {
  try {
    // Extract the conversation history from the frontend
    const { messages } = await req.json();

    // 🧠 LIVE MODE: Stream the response back for real-time typing
    const result = await streamText({
      model: openai('gpt-4o-mini'),
      messages: messages, // Passes the full history so the bot has memory
      system: `You are the exclusive AI assistant for Airport VIP, a premium Meet & Greet parking service for London Luton (LTN) and Heathrow (LHR). 
      Be brief, highly professional, polite, and helpful. 
      Key info: No shuttle buses, direct terminal access, 24/7 secure compound, price match guarantee.`,
    });

    // 🛠️ THE FIX: Using toTextStreamResponse() to match your installed SDK version
    return result.toTextStreamResponse();

  } catch (error) {
    console.error("AI API Error:", error);
    
    // 🛡️ OFFLINE/ERROR MODE (Fast Fallback)
    // If OpenAI fails or runs out of funds, this prevents your site from crashing
    return new Response(
      "I'm currently experiencing a connection delay. Please contact our 24/7 support team at +44 (0) 000 123 4567 for immediate assistance with your booking.",
      { status: 503 }
    );
  }
}