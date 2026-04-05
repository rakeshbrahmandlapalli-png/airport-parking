import { openai } from '@ai-sdk/openai';
import { streamText } from 'ai';

export const maxDuration = 30;

export async function POST(req: Request) {
  try {
    const { messages } = await req.json();

    // 🧠 ONLINE MODE
    const result = await streamText({
      model: openai('gpt-4o-mini'),
      messages,
      system: "You are a VIP Airport Parking assistant. Be professional and helpful.",
    });

    return result.toTextStreamResponse();
    
  } catch (error: any) {
    // 🛡️ OFFLINE / FAILSAFE MODE
    console.error("Chatbot Error:", error);

    // This creates a simple text response that useChat can understand
    return new Response(
      "I'm currently in Guest Mode. Once my live AI connection is activated, I'll be able to give you real-time parking advice. How can I help you generally today?",
      {
        headers: { 'Content-Type': 'text/plain; charset=utf-8' },
      }
    );
  }
}