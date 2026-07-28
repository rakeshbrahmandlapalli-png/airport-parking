import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { getAdminUser } from "@/app/lib/adminAuth";
import { rateLimit, getClientIp } from "@/app/lib/rateLimit";
import { sendSMS, listMessagesFor } from "@/app/lib/twilio";
import { logger } from "@/app/lib/logger";

/**
 * Admin Message Centre.
 *
 *   GET  ?ref=APD-XXXXXX   -> recent SMS history with that customer
 *   POST { ref, body }     -> send an SMS to that customer
 *
 * Both are admin-only. The destination number is always resolved from the
 * booking row server-side and never taken from the request, so this endpoint
 * can only ever message a real customer of ours — it can't be turned into an
 * open SMS relay by tampering with the payload.
 */

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const MAX_BODY_CHARS = 1200; // ~8 SMS segments; a hard stop on runaway cost

async function loadBooking(ref: unknown) {
  const bookingRef = String(ref || "").toUpperCase().trim();
  if (!bookingRef) return null;
  const { data } = await supabase
    .from("bookings")
    .select("booking_ref, full_name, phone_number")
    .eq("booking_ref", bookingRef)
    .maybeSingle();
  return data;
}

export async function GET(req: Request) {
  const admin = await getAdminUser(req);
  if (!admin) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });

  const ref = new URL(req.url).searchParams.get("ref");
  const booking = await loadBooking(ref);
  if (!booking) return NextResponse.json({ error: "Booking not found" }, { status: 404 });
  if (!(booking.phone_number || "").trim()) {
    return NextResponse.json({ messages: [], error: "Booking has no phone number" });
  }

  const result = await listMessagesFor(booking.phone_number);
  return NextResponse.json({ messages: result.messages, error: result.success ? null : result.error });
}

export async function POST(req: Request) {
  const rl = rateLimit(`admin-messages:${getClientIp(req)}`, 30, 60_000);
  if (!rl.ok) {
    return NextResponse.json(
      { error: "Too many messages sent. Wait a moment." },
      { status: 429, headers: { "Retry-After": String(rl.retryAfterSec) } }
    );
  }

  const admin = await getAdminUser(req);
  if (!admin) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });

  let payload: any;
  try { payload = await req.json(); } catch { payload = {}; }

  const body = String(payload?.body || "").trim();
  if (!body) return NextResponse.json({ error: "Message body is empty" }, { status: 400 });
  if (body.length > MAX_BODY_CHARS) {
    return NextResponse.json({ error: `Message too long (max ${MAX_BODY_CHARS} characters)` }, { status: 400 });
  }

  const booking = await loadBooking(payload?.ref);
  if (!booking) return NextResponse.json({ error: "Booking not found" }, { status: 404 });
  if (!(booking.phone_number || "").trim()) {
    return NextResponse.json({ error: "Booking has no phone number" }, { status: 400 });
  }

  const result = await sendSMS(booking.phone_number, body);
  if (!result.success) {
    return NextResponse.json({ error: result.error || "Failed to send SMS" }, { status: 500 });
  }

  logger.info(`[MESSAGE CENTRE] ${admin.email} sent SMS to ${booking.booking_ref} (${result.sid})`);
  return NextResponse.json({ success: true, sid: result.sid });
}
