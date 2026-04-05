import { openai } from '@ai-sdk/openai';
import { streamText } from 'ai';

export const maxDuration = 30;

export async function POST(req: Request) {
  const { messages } = await req.json();

  try {
    // 🧠 ONLINE MODE (Tries to talk to OpenAI)
    const result = await streamText({
      model: openai('gpt-4o-mini'),
      messages,
      system: "You are a VIP Airport Parking assistant. Be professional and helpful.",
    });

    // Changed from toDataStreamResponse to toAIStreamResponse
    return result.toTextStreamResponse();
    
  } catch (error: any) {
    // 🛡️ OFFLINE/FAILSAFE MODE
    // This triggers if you have no money in OpenAI or if the key is missing
    console.error("OpenAI Error:", error);
    
    return new Response(
      "I'm currently in Guest Mode. Once my live AI connection is activated, I'll be able to give you real-time parking advice. How can I help you generally today?"
    );
  }
}