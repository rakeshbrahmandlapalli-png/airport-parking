import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import OpenAI from 'https://esm.sh/openai'

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const supabase = createClient(supabaseUrl, supabaseKey);

const openai = new OpenAI({ apiKey: Deno.env.get('OPENAI_API_KEY') });

serve(async (req) => {
  try {
    console.log("Aero Navigator triggered! Searching for bookings...");

    const todayStr = new Date().toISOString().split('T')[0];
    
    // This matches your actual database columns: dropoff_date and sms_sent
    const { data: bookings, error: dbError } = await supabase
      .from('bookings')
      .select('*, companies(*)')
      .eq('dropoff_date', todayStr)
      .eq('sms_sent', false);

    if (dbError) throw dbError;

    if (!bookings || bookings.length === 0) {
      console.log("No bookings found for today.");
      return new Response("No upcoming bookings right now.", { status: 200 });
    }

    for (const booking of bookings) {
      // Calculate hours away using your separate date and time columns
      const dropoffDateObj = new Date(`${booking.dropoff_date}T${booking.dropoff_time}`);
      const hoursAway = (dropoffDateObj.getTime() - Date.now()) / (1000 * 60 * 60);

      // Only process if booking is within 4.5 hours
      if (hoursAway < 0 || hoursAway > 4.5) {
        console.log(`Booking ${booking.id} is ${hoursAway.toFixed(1)} hours away. Skipping.`);
        continue;
      }

      console.log(`Processing AI for: ${booking.phone_number}`);

      const aiResponse = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [{
          role: "system",
          content: `You are Aero, a friendly concierge. Rewrite instructions for ${booking.airport}. Call ${booking.companies?.phone_number || 'driver'} 20 mins before. Short SMS format.`
        }, {
          role: "user",
          content: booking.companies?.arrival_instructions || "Proceed to terminal."
        }]
      });

      const smsText = aiResponse.choices[0].message.content;

      const twilioRes = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${Deno.env.get('TWILIO_SID')}/Messages.json`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Authorization': 'Basic ' + btoa(`${Deno.env.get('TWILIO_SID')}:${Deno.env.get('TWILIO_AUTH_TOKEN')}`)
        },
        body: new URLSearchParams({
          To: booking.phone_number,
          From: '+15709106509', // Your US Twilio Number
          Body: smsText || "Aero: Your driver is ready at the terminal."
        })
      });

      if (twilioRes.ok) {
        console.log(`✅ SMS sent to ${booking.phone_number}`);
        await supabase.from('bookings').update({ sms_sent: true }).eq('id', booking.id);
      }
    }

    return new Response("Done", { status: 200 });
  } catch (error) {
    console.error("Critical Error:", error);
    return new Response("Error", { status: 500 });
  }
})