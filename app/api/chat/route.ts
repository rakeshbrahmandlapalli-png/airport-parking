import { openai } from '@ai-sdk/openai';
import { streamText } from 'ai';

export const maxDuration = 30;

export async function POST(req: Request) {
  const { messages } = await req.json();

  // 1. Check if the API Key exists in Vercel
  const apiKey = process.env.OPENAI_API_KEY;

  if (!apiKey || apiKey === "") {
    // 🛡️ OFFLINE MOCK MODE (No Key Found)
    return new Response(
      "Hello! I'm currently in 'Guest Mode' because my AI brain isn't connected to OpenAI yet. How can I help you with parking today?"
    );
  }

  try {
    // 🧠 ONLINE MODE (Tries to talk to OpenAI)
    const result = await streamText({
      model: openai('gpt-4o-mini'),
      messages,
      system: "You are a VIP Airport Parking assistant. Be professional and helpful.",
    });

    return result.toDataStreamResponse();
  } catch (error: any) {
    // 🛠️ FAILSAFE (If OpenAI says "No Credits" or "Error")
    console.error("OpenAI Error:", error);
    
    return new Response(
      "I'm having a bit of trouble connecting to my live database right now, but I can still help you with general parking info! What are you looking for?"
    );
  }
}