import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { getAdminUser } from "@/app/lib/adminAuth";
import { reportOfflineConversion, logConversionUpload, parseClickId } from "@/app/lib/googleAds";

// ─────────────────────────────────────────────────────────────────────────────
// Admin-only: re-send every paid ad booking from the last 89 days to Google Ads
// through the API. Recovers conversions the webhook failed to report (wrong
// setup at the time, iOS click ids sent in the wrong field, Google outage).
// Safe to press repeatedly: the Stripe session id is the order id, so Google
// answers an already-counted booking with a duplicate, never a second count.
//
//   POST /api/admin/conversions-resend
// ─────────────────────────────────────────────────────────────────────────────

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// Google accepts click conversions up to 90 days after the click; the booking
// comes after the click, so stop a day short.
const WINDOW_DAYS = 89;

export async function POST(req: Request) {
  const admin = await getAdminUser(req);
  if (!admin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const since = new Date(Date.now() - WINDOW_DAYS * 24 * 60 * 60 * 1000).toISOString();
  const { data, error } = await supabase
    .from("bookings")
    .select("booking_ref, gclid, created_at, total_price, stripe_session_id")
    .not("gclid", "is", null)
    .neq("gclid", "")
    .not("status", "in", "(pending,cancelled)")
    .gte("created_at", since)
    .order("created_at", { ascending: true });

  if (error) {
    return NextResponse.json({ error: "Could not load bookings." }, { status: 500 });
  }

  const results = [];
  for (const b of data || []) {
    const orderId = b.stripe_session_id || b.booking_ref;
    const value = Number(b.total_price) || 0;
    const result = await reportOfflineConversion({
      gclid: b.gclid,
      value,
      currency: "GBP",
      orderId,
      when: new Date(b.created_at),
    });
    await logConversionUpload(
      supabase,
      { orderId, bookingRef: b.booking_ref, clickId: b.gclid, value, source: "resend" },
      result
    );
    results.push({
      booking_ref: b.booking_ref,
      created_at: b.created_at,
      value,
      click_type: parseClickId(b.gclid)?.field ?? null,
      ...result,
    });
  }

  return NextResponse.json({ count: results.length, results });
}
