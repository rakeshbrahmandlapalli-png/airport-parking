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
      
      RULES:
      1. Airports: "Luton (LTN)" or "Heathrow (LHR)". Default to "Luton (LTN)" if unsure.
      2. Times: Default to "10:00" for dropoff and "18:00" for pickup if not specified.
      3. Service Preference: Extract as either "meet-greet", "park-ride", or null.
      4. Flight Number: Extract the flight number if mentioned (e.g. "BA123", "EZ892"), otherwise null.
      5. Fast-Track (isReadyToBook): Set to true ONLY if they specify a service preference (like "meet and greet") AND you have valid dates.

      Return ONLY a valid JSON object. It must contain EXACTLY these keys:
      {
        "airport": "string",
        "dropoffDate": "YYYY-MM-DD",
        "dropoffTime": "HH:MM",
        "pickupDate": "YYYY-MM-DD",
        "pickupTime": "HH:MM",
        "servicePreference": "string | null",
        "flightNumber": "string | null",
        "isReadyToBook": boolean
      }`,
      prompt: prompt,
    });

    const jsonString = text.replace(/```json/g, '').replace(/```/g, '').trim();
    return Response.json(JSON.parse(jsonString));
  } catch (error) {
    console.error("Aero Magic Error:", error);
    return Response.json({ error: "Failed to parse intent" }, { status: 500 });
  }
}