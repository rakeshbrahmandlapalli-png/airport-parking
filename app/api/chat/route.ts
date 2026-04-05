import { openai } from '@ai-sdk/openai';
import { streamText, createDataStreamResponse } from 'ai';

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

    // We turn the "Offline" message into a stream so the frontend "types" it out
    return createDataStreamResponse({
      execute: async (dataStream) => {
        dataStream.writeMessageAnnotation({
          type: 'status',
          value: 'offline-mode'
        });
        dataStream.writeText("I'm currently in Guest Mode. Once my live AI connection is activated, I'll be able to give you real-time parking advice. How can I help you generally today?");
      },
    });
  }
}