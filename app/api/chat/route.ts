import { openai } from '@ai-sdk/openai';
import { generateText } from 'ai';

export const maxDuration = 30;

export async function POST(req: Request) {
  try {
    const { messages } = await req.json();
    const userPrompt = messages[messages.length - 1].content;

    // 🧠 TRY ONLINE MODE
    const { text } = await generateText({
      model: openai('gpt-4o-mini'),
      prompt: userPrompt,
      system: "You are a VIP Airport Parking assistant. Be brief and professional.",
    });

    return new Response(text);

  } catch (error) {
    // 🛡️ OFFLINE GUEST MODE (Fast Fallback)
    return new Response(
      "I'm currently in Guest Mode (Offline).I'll be able to give you real-time advice! How can I help you generally?"
    );
  }
}