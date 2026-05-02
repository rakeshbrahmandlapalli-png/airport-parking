import { openai } from '@ai-sdk/openai';
import { generateText } from 'ai';

export async function POST(req: Request) {
  try {
    const { prompt, currentDate } = await req.json();

    const { text } = await generateText({
      model: openai('gpt-4o-mini'),
      system: `You are Aero, a highly intelligent booking agent for UK airport parking. 
      Extract the booking details from the user's prompt. 
      The current date and time is: ${currentDate}.
      Allowed airports: "Luton (LTN)" or "Heathrow (LHR)". If not specified, default to "Luton (LTN)".
      If times aren't specified, use "10:00" for dropoff and "18:00" for pickup.
      Return ONLY a valid JSON object with no markdown formatting. It must contain EXACTLY these keys:
      {
        "airport": "string",
        "dropoffDate": "YYYY-MM-DD",
        "dropoffTime": "HH:MM",
        "pickupDate": "YYYY-MM-DD",
        "pickupTime": "HH:MM"
      }`,
      prompt: prompt,
    });

    // Clean up markdown formatting if the AI adds it
    const jsonString = text.replace(/```json/g, '').replace(/```/g, '').trim();
    
    return Response.json(JSON.parse(jsonString));
  } catch (error) {
    console.error("Aero Magic Error:", error);
    return Response.json({ error: "Failed to parse intent" }, { status: 500 });
  }
}