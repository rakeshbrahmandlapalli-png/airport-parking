import { logger } from "@/app/lib/logger";
import twilio from "twilio";
import {
  toUKE164,
  bookingConfirmationBody,
  missingFlightBody,
  dropoffDayBody,
  returnDayBody,
  reviewRequestBody,
  type MessageBooking,
} from "@/app/lib/messageTemplates";

// Message bodies live in app/lib/messageTemplates.ts so the admin Message Centre
// sends exactly the same wording as these automated senders.

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

export async function sendSMS(to: string, body: string): Promise<{ success: boolean; sid?: string; error?: string }> {
  const ctx = getClient();
  if (!ctx) return { success: false, error: "Twilio uninitialized" };
  try {
    const response = await ctx.client.messages.create({ from: ctx.fromNumber, to: toUKE164(to), body });
    logger.info(`[TWILIO SUCCESS] SMS dispatched: ${response.sid}`);
    return { success: true, sid: response.sid };
  } catch (error: any) {
    // Surface Twilio's actual code + message (e.g. 21408 = region not enabled in
    // Geo Permissions, 20003 = auth token wrong, 21606 = From number not SMS-capable).
    const detail = `code ${error?.code ?? "?"}: ${error?.message ?? error}`;
    logger.error(`[TWILIO ERROR] Failed to send SMS — ${detail} ${error?.moreInfo ?? ""}`);
    return { success: false, error: `Twilio ${detail}` };
  }
}

/**
 * Recent message history with one customer, newest first. Pulled live from
 * Twilio so it carries real delivery status (delivered / failed / undelivered)
 * and any inbound replies — no local mirror table to drift out of sync.
 */
export async function listMessagesFor(phone: string, limit = 20) {
  const ctx = getClient();
  if (!ctx) return { success: false, error: "Twilio uninitialized", messages: [] as any[] };
  const e164 = toUKE164(phone);
  try {
    const [outbound, inbound] = await Promise.all([
      ctx.client.messages.list({ to: e164, limit }),
      ctx.client.messages.list({ from: e164, limit }),
    ]);
    const messages = [...outbound, ...inbound]
      .map((m) => ({
        sid: m.sid,
        body: m.body,
        status: m.status,
        direction: String(m.direction || "").startsWith("inbound") ? "inbound" : "outbound",
        errorMessage: m.errorMessage || null,
        sentAt: (m.dateSent || m.dateCreated)?.toISOString?.() ?? null,
      }))
      .sort((a, b) => (b.sentAt || "").localeCompare(a.sentAt || ""))
      .slice(0, limit);
    return { success: true, messages };
  } catch (error: any) {
    logger.error(`[TWILIO ERROR] Failed to list messages — code ${error?.code ?? "?"}: ${error?.message ?? error}`);
    return { success: false, error: error?.message || "Failed to load messages", messages: [] as any[] };
  }
}

// 1. Instant confirmation — fires right after payment. Operator is usually not
//    assigned yet at this point, so it stays generic and points to the email.
export async function sendBookingConfirmationSMS(booking: MessageBooking) {
  if (!booking.phone_number) return { success: false, error: "No phone number on booking" };
  return sendSMS(booking.phone_number, bookingConfirmationBody(booking));
}

// 2. Missing-flight-number nudge (skips silently if a flight number is present).
export async function triggerMissingFlightAlert(booking: MessageBooking) {
  if (booking.flight_number && booking.flight_number.trim() !== "") {
    return { success: true, message: "Flight number present. Skipping alert." };
  }
  if (!booking.phone_number) return { success: false, error: "No phone number on booking" };
  return sendSMS(booking.phone_number, missingFlightBody(booking));
}

// 3. Drop-off day (morning). Operator-aware: assigned operator -> their arrival
//    instructions + number; no operator (we hold the car) -> our number.
export async function sendDropoffDaySMS(booking: MessageBooking, company: any | null) {
  if (!booking.phone_number) return { success: false, error: "No phone number on booking" };
  return sendSMS(booking.phone_number, dropoffDayBody(booking, company));
}

// 4. Return day (morning). Operator-aware, same rule as drop-off.
export async function sendReturnDaySMS(booking: MessageBooking, company: any | null) {
  if (!booking.phone_number) return { success: false, error: "No phone number on booking" };
  return sendSMS(booking.phone_number, returnDayBody(booking, company));
}

// 5. Review request — sent the day AFTER collection (by the daily cron), and also
//    on demand from the admin "Review SMS" button.
export async function sendReviewRequestSMS(booking: MessageBooking) {
  if (!booking.phone_number) return { success: false, error: "No phone number on booking" };
  return sendSMS(booking.phone_number, reviewRequestBody(booking));
}
