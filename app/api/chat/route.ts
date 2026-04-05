import { openai } from '@ai-sdk/openai';
import { generateText } from 'ai';

export const maxDuration = 30;

export async function POST(req: Request) {
  try {
    const { messages } = await req.json();
    const lastMessage = messages[messages.length - 1].content;

    // 1. If you DON'T have credits/key yet, this will fail and go to 'catch'
    const { text } = await generateText({
      model: openai('gpt-4o-mini'),
      system: "You are a VIP Airport Parking assistant.",
      prompt: lastMessage,
    });

    return new Response(text);
    
  } catch (error) {
    // 🛡️ OFFLINE GUEST MODE
    // This is what will play right now since you haven't added credits!
    return new Response(
      "Hello! I'm your VIP Assistant. I'm currently in Guest Mode until my AI connection is funded, but I can tell you that we offer premium Meet & Greet services at Luton and Heathrow!"
    );
  }
}