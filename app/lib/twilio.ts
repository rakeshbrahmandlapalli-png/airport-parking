import { logger } from "@/app/lib/logger";
import twilio from "twilio";

const REVIEW_LINK = "https://uk.trustpilot.com/evaluate/aeroparkdirect.co.uk";
const AGENT_NUMBER = "07868 277648";

function getClient(): { client: ReturnType<typeof twilio>; fromNumber: string; messagingServiceSid: string } | null {
  const rawSid = process.env.TWILIO_ACCOUNT_SID || "";
  const rawToken = process.env.TWILIO_AUTH_TOKEN || "";
  const fromNumber = (process.env.TWILIO_SMS_NUMBER || "").replace(/['"]/g, "").trim();
  const messagingServiceSid = (process.env.TWILIO_MESSAGING_SERVICE_SID || "").replace(/['"]/g, "").trim();

  const accountSid = rawSid.replace(/['"]/g, "").trim();
  const authToken = rawToken.replace(/['"]/g, "").trim();

  if (!accountSid.startsWith("AC") || !authToken || !fromNumber) {
    logger.error("Twilio disabled: SID, auth token, or SMS number missing in environment variables.");
    return null;
  }
  return { client: twilio(accountSid, authToken), fromNumber, messagingServiceSid };
}

// UK local (0xxxx) -> E.164 (+44xxxx). Leaves already-international numbers alone.
function toUKE164(raw: string): string {
  let phone = (raw || "").trim();
  if (phone.startsWith("0")) phone = `+44${phone.slice(1)}`;
  if (!phone.startsWith("+")) phone = `+${phone}`;
  return phone;
}

// Interpret a "YYYY-MM-DD" + "HH:mm" as Europe/London local wall-clock time and
// return the matching UTC instant (handles BST/GMT automatically).
function londonToUTC(dateStr: string, timeStr: string): Date | null {
  if (!dateStr) return null;
  const [y, m, d] = dateStr.split("-").map(Number);
  const [hh, mm] = (timeStr || "12:00").split(":").map(Number);
  if (!y || !m || !d) return null;
  const utcGuess = Date.UTC(y, m - 1, d, hh || 0, mm || 0);
  const asUTC = new Date(utcGuess);
  const offsetMs =
    new Date(asUTC.toLocaleString("en-US", { timeZone: "Europe/London" })).getTime() -
    new Date(asUTC.toLocaleString("en-US", { timeZone: "UTC" })).getTime();
  return new Date(utcGuess - offsetMs);
}

async function sendSMS(to: string, body: string): Promise<{ success: boolean; sid?: string; error?: string }> {
  const ctx = getClient();
  if (!ctx) return { success: false, error: "Twilio uninitialized" };
  try {
    const response = await ctx.client.messages.create({ from: ctx.fromNumber, to: toUKE164(to), body });
    logger.info(`[TWILIO SUCCESS] SMS dispatched: ${response.sid}`);
    return { success: true, sid: response.sid };
  } catch (error: any) {
    logger.error("[TWILIO ERROR] Failed to send SMS:", error);
    return { success: false, error: error.message };
  }
}

// Schedule an SMS for a future instant via a Messaging Service (Twilio requires a
// Messaging Service, not a plain "from" number, for scheduled sends). Falls back
// to sending immediately if sendAt is within Twilio's 15-min minimum, or if no
// Messaging Service is configured.
async function scheduleSMS(to: string, body: string, sendAt: Date): Promise<{ success: boolean; sid?: string; scheduled?: boolean; error?: string }> {
  const ctx = getClient();
  if (!ctx) return { success: false, error: "Twilio uninitialized" };

  const minsAhead = (sendAt.getTime() - Date.now()) / 60000;
  const canSchedule = ctx.messagingServiceSid && minsAhead >= 16 && minsAhead <= 7 * 24 * 60;

  try {
    if (canSchedule) {
      const response = await ctx.client.messages.create({
        messagingServiceSid: ctx.messagingServiceSid,
        to: toUKE164(to),
        body,
        scheduleType: "fixed",
        sendAt,
      });
      logger.info(`[TWILIO SUCCESS] SMS scheduled for ${sendAt.toISOString()}: ${response.sid}`);
      return { success: true, sid: response.sid, scheduled: true };
    }
    // No messaging service, or the target time is already (near) now — send immediately.
    const immediate = await sendSMS(to, body);
    return { ...immediate, scheduled: false };
  } catch (error: any) {
    logger.error("[TWILIO ERROR] Failed to schedule SMS:", error);
    return { success: false, error: error.message };
  }
}

// Operator instructions helper — mirrors app/lib/mail.ts field priority.
function arrivalText(isLuton: boolean, company: any): string {
  return isLuton
    ? (company?.on_arrival_ltn || company?.on_arrival || "Please call your parking provider 20 minutes before you arrive.")
    : (company?.on_arrival_lhr || company?.on_arrival || "Please call your parking provider 20 minutes before you arrive.");
}
function returnText(isLuton: boolean, company: any): string {
  return isLuton
    ? (company?.on_return_ltn || company?.on_return || "Please call your parking provider after collecting your luggage.")
    : (company?.on_return_lhr || company?.on_return || "Please call your parking provider after collecting your luggage.");
}

// 1. Instant confirmation — fires right after payment. Operator is usually not
//    assigned yet at this point, so it stays generic and points to the email.
export async function sendBookingConfirmationSMS(booking: {
  full_name: string; phone_number: string; booking_ref: string; dropoff_date?: string; pickup_date?: string;
}) {
  if (!booking.phone_number) return { success: false, error: "No phone number on booking" };
  const drop = booking.dropoff_date ? new Date(booking.dropoff_date).toLocaleDateString("en-GB", { day: "2-digit", month: "short" }) : "TBC";
  const pick = booking.pickup_date ? new Date(booking.pickup_date).toLocaleDateString("en-GB", { day: "2-digit", month: "short" }) : "TBC";
  return sendSMS(
    booking.phone_number,
    `AeroPark Direct: Booking confirmed, ref ${booking.booking_ref}. Drop-off ${drop}, return ${pick}. Full details & instructions are in your email. Questions? Call ${AGENT_NUMBER}.`
  );
}

// 2. Missing-flight-number nudge (skips silently if a flight number is present).
export async function triggerMissingFlightAlert(booking: {
  full_name: string; phone_number: string; booking_ref: string; flight_number?: string; car_make?: string;
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

// 3. Drop-off day (morning). Operator-aware: assigned operator -> their arrival
//    instructions + number; no operator (Rakesh's own hold) -> his number.
export async function sendDropoffDaySMS(booking: {
  full_name: string; phone_number: string; booking_ref: string; airport?: string;
}, company: any | null) {
  if (!booking.phone_number) return { success: false, error: "No phone number on booking" };
  const isLuton = !!booking.airport?.toLowerCase().includes("luton");
  let body: string;
  if (company) {
    const phone = company.phone_number ? ` Call ${company.phone_number} on arrival.` : "";
    body = `AeroPark Direct: Drop-off day for ref ${booking.booking_ref}. ${arrivalText(isLuton, company)}${phone} Full directions are in your email.`;
  } else {
    body = `AeroPark Direct: Drop-off day for ref ${booking.booking_ref}. When you arrive, call ${AGENT_NUMBER} and we'll meet you to take your car. Full details are in your email.`;
  }
  return sendSMS(booking.phone_number, body);
}

// 4. Return day (morning). Operator-aware, same rule as drop-off.
export async function sendReturnDaySMS(booking: {
  full_name: string; phone_number: string; booking_ref: string; airport?: string;
}, company: any | null) {
  if (!booking.phone_number) return { success: false, error: "No phone number on booking" };
  const isLuton = !!booking.airport?.toLowerCase().includes("luton");
  let body: string;
  if (company) {
    const phone = company.phone_number ? ` Call ${company.phone_number}.` : "";
    body = `AeroPark Direct: Today's your return day, ref ${booking.booking_ref}. ${returnText(isLuton, company)}${phone}`;
  } else {
    body = `AeroPark Direct: Today's your return day, ref ${booking.booking_ref}. Once you've collected your luggage, call ${AGENT_NUMBER} and your car and parking ticket will be ready.`;
  }
  return sendSMS(booking.phone_number, body);
}

// 5. Review request — scheduled for 2 hours after their collection time
//    (pickup_date + pickup_time + 2h, London time).
export async function scheduleReviewRequestSMS(booking: {
  full_name: string; phone_number: string; booking_ref: string; pickup_date?: string; pickup_time?: string;
}) {
  if (!booking.phone_number) return { success: false, error: "No phone number on booking" };
  const collection = londonToUTC(booking.pickup_date || "", booking.pickup_time || "12:00");
  if (!collection) return { success: false, error: "No valid pickup date/time" };
  const sendAt = new Date(collection.getTime() + 2 * 60 * 60 * 1000);
  const firstName = (booking.full_name || "there").split(" ")[0];
  const body = `Hi ${firstName}, thanks for parking with AeroPark Direct! We hope everything went smoothly. If you have 30 seconds, an honest review would mean a lot to us: ${REVIEW_LINK}`;
  return scheduleSMS(booking.phone_number, body, sendAt);
}
