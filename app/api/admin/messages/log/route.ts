import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { getAdminUser } from "@/app/lib/adminAuth";
import { listAllMessages } from "@/app/lib/twilio";
import { toUKE164 } from "@/app/lib/messageTemplates";

/**
 * Account-wide SMS log for the admin Messages page.
 *
 * Twilio only knows phone numbers, so each message is matched back against the
 * bookings table to attach a customer name and booking reference — otherwise
 * the log is an unreadable wall of digits. Matching is done on the normalised
 * E.164 form so numbers stored as "07…", "7…" or "+447…" all resolve.
 */

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(req: Request) {
  const admin = await getAdminUser(req);
  if (!admin) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });

  const limit = Math.min(Number(new URL(req.url).searchParams.get("limit")) || 100, 200);

  const [log, bookingsRes] = await Promise.all([
    listAllMessages(limit),
    supabase
      .from("bookings")
      .select("booking_ref, full_name, phone_number, airport, status")
      .not("phone_number", "is", null)
      .order("created_at", { ascending: false }),
  ]);

  // Newest booking wins for a repeat customer's number.
  const byPhone = new Map<string, any>();
  for (const b of bookingsRes.data || []) {
    const key = toUKE164(String(b.phone_number || ""));
    if (key && !byPhone.has(key)) byPhone.set(key, b);
  }

  const messages = log.messages.map((m) => {
    const match = byPhone.get(toUKE164(String(m.counterparty || "")));
    return {
      ...m,
      customerName: match?.full_name || null,
      bookingRef: match?.booking_ref || null,
      airport: match?.airport || null,
    };
  });

  return NextResponse.json({
    messages,
    error: log.success ? null : log.error,
    unmatchedCount: messages.filter((m) => !m.bookingRef).length,
  });
}
