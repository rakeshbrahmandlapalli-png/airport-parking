import twilio from "twilio";

export async function triggerMissingFlightAlert(booking: {
  full_name: string;
  phone_number: string;
  booking_ref: string;
  flight_number?: string;
  car_make?: string;
}) {
  // 1. Safety Guard: If there is a flight number, do absolutely nothing
  if (booking.flight_number && booking.flight_number.trim() !== "") {
    return { success: true, message: "Flight number present. Skipping alert." };
  }

  // 2. Dynamically grab keys AT RUNTIME (fixes the Vercel build caching bug)
  const rawSid = process.env.TWILIO_ACCOUNT_SID || "";
  const rawToken = process.env.TWILIO_AUTH_TOKEN || "";
  const twilioNumber = process.env.TWILIO_WHATSAPP_NUMBER || "";

  const accountSid = rawSid.replace(/['"]/g, '').trim();
  const authToken = rawToken.replace(/['"]/g, '').trim();

  // 3. Validate and Initialize
  if (!accountSid.startsWith("AC") || !authToken) {
    console.error("Twilio disabled: Account SID is missing or invalid in environment variables.");
    return { success: false, error: "Twilio uninitialized" };
  }

  const client = twilio(accountSid, authToken);

  try {
    // Clean UK phone format for WhatsApp (+44)
    let formattedPhone = booking.phone_number.trim();
    if (formattedPhone.startsWith("0")) {
      formattedPhone = `+44${formattedPhone.slice(1)}`;
    }
    if (!formattedPhone.startsWith("+")) {
      formattedPhone = `+${formattedPhone}`;
    }

    // Dispatch the live Sandbox message
    const response = await client.messages.create({
      from: `whatsapp:${twilioNumber}`,
      to: `whatsapp:${formattedPhone}`,
      body: `Hi ${booking.full_name}, this is AeroPark Direct. ✈️\n\nWe are organizing your travel itinerary, but noticed your return flight number is missing. \n\nPlease reply directly to this message with your flight number so the operators can track your landing and ensure your vehicle is ready on time! \n\nRef: ${booking.booking_ref}`
    });

    console.log(`[TWILIO SUCCESS] Dispatched message SID: ${response.sid}`);
    return { success: true, sid: response.sid };

  } catch (error: any) {
    console.error("[TWILIO ERROR] Failed to send WhatsApp message:", error);
    return { success: false, error: error.message };
  }
}