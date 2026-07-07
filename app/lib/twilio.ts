import { logger } from "@/app/lib/logger";
import twilio from "twilio";

function getClient(): { client: ReturnType<typeof twilio>; fromNumber: string } | null {
  const rawSid = process.env.TWILIO_ACCOUNT_SID || "";
  const rawToken = process.env.TWILIO_AUTH_TOKEN || "";
  const fromNumber = (process.env.TWILIO_SMS_NUMBER || "").replace(/['"]/g, "").trim();

  const accountSid = rawSid.replace(/['"]/g, "").trim();
  const authToken = rawToken.replace(/['"]/g, "").trim();

  if (!accountSid.startsWith("AC") || !authToken || !fromNumber) {
    logger.error("Twilio disabled: SID, auth token, or SMS number missing in environment variables.");
    return null;
  }
  return { client: twilio(accountSid, authToken), fromNumber };
}

// UK local (0xxxx) -> E.164 (+44xxxx). Leaves already-international numbers alone.
function toUKE164(raw: string): string {
  let phone = (raw || "").trim();
  if (phone.startsWith("0")) phone = `+44${phone.slice(1)}`;
  if (!phone.startsWith("+")) phone = `+${phone}`;
  return phone;
}

async function sendSMS(to: string, body: string): Promise<{ success: boolean; sid?: string; error?: string }> {
  const ctx = getClient();
  if (!ctx) return { success: false, error: "Twilio uninitialized" };

  try {
    const response = await ctx.client.messages.create({
      from: ctx.fromNumber,
      to: toUKE164(to),
      body,
    });
    logger.info(`[TWILIO SUCCESS] SMS dispatched: ${response.sid}`);
    return { success: true, sid: response.sid };
  } catch (error: any) {
    logger.error("[TWILIO ERROR] Failed to send SMS:", error);
    return { success: false, error: error.message };
  }
}

// Sent right after a successful booking. Short by design — full details are in the email.
export async function sendBookingConfirmationSMS(booking: {
  full_name: string;
  phone_number: string;
  booking_ref: string;
  dropoff_date?: string;
  pickup_date?: string;
}) {
  if (!booking.phone_number) return { success: false, error: "No phone number on booking" };

  const drop = booking.dropoff_date
    ? new Date(booking.dropoff_date).toLocaleDateString("en-GB", { day: "2-digit", month: "short" })
    : "TBC";
  const pick = booking.pickup_date
    ? new Date(booking.pickup_date).toLocaleDateString("en-GB", { day: "2-digit", month: "short" })
    : "TBC";

  return sendSMS(
    booking.phone_number,
    `AeroPark Direct: Booking confirmed, ref ${booking.booking_ref}. Drop-off ${drop}, return ${pick}. Full details & instructions are in your email. Questions? Call 07868 277648.`
  );
}

// Missing-flight-number nudge (unchanged trigger condition, now real SMS not WhatsApp sandbox).
export async function triggerMissingFlightAlert(booking: {
  full_name: string;
  phone_number: string;
  booking_ref: string;
  flight_number?: string;
  car_make?: string;
}) {
  if (booking.flight_number && booking.flight_number.trim() !== "") {
    return { success: true, message: "Flight number present. Skipping alert." };
  }
  if (!booking.phone_number) return { success: false, error: "No phone number on booking" };

  return sendSMS(
    booking.phone_number,
    `Hi ${booking.full_name}, AeroPark Direct here. We're missing your return flight number for ref ${booking.booking_ref} — reply with it so we can track your landing and have your car ready on time.`
  );
}

// Sent the morning of the customer's return day. Whoever they should call depends on
// WHO is fulfilling the booking:
//  • An operator is assigned (company_id set) -> Rakesh is only the booking agent, so
//    the customer must call the OPERATOR'S own number, using the same on_return
//    instructions text the confirmation email already uses (mail.ts).
//  • No operator (direct/walk-in booking Rakesh personally fulfils) -> his own
//    AeroPark number, matching what he tells walk-in customers by hand.
export async function sendReturnDaySMS(booking: {
  full_name: string;
  phone_number: string;
  booking_ref: string;
  airport?: string;
}, company: any | null) {
  if (!booking.phone_number) return { success: false, error: "No phone number on booking" };

  const isLuton = booking.airport?.toLowerCase().includes("luton");

  let body: string;
  if (company) {
    const returnInstructions = isLuton
      ? (company.on_return_ltn || company.on_return || "Please call your parking provider after collecting your luggage.")
      : (company.on_return_lhr || company.on_return || "Please call your parking provider after collecting your luggage.");
    const phone = company.phone_number || "";
    body = `AeroPark Direct: Today's your return day, ref ${booking.booking_ref}. ${returnInstructions}${phone ? ` Call ${phone}.` : ""}`;
  } else {
    body = `AeroPark Direct: Today's your return day, ref ${booking.booking_ref}. Once you've collected your luggage, call 07868 277648 and your car and parking ticket will be ready.`;
  }

  return sendSMS(booking.phone_number, body);
}
