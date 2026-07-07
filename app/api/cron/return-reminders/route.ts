import { logger } from "@/app/lib/logger";
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { sendDropoffDaySMS, sendReturnDaySMS, sendReviewRequestSMS } from "@/app/lib/twilio";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const ACTIVE = ["confirmed", "parked", "completed"];

// Runs once daily (Vercel Cron, see vercel.json). Handles three touchpoints:
//   • drop-off day (today)      -> where-to-go + operator number (dropoff_sms_sent)
//   • return day (today)        -> collect-your-car + operator number (return_sms_sent)
//   • day AFTER return (return was yesterday) -> Trustpilot review request (review_sms_sent)
// Vercel auto-sends `Authorization: Bearer $CRON_SECRET` on cron invocations.
export async function GET(req: NextRequest) {
  const auth = req.headers.get("authorization");
  if (!process.env.CRON_SECRET || auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const todayUK = new Date().toLocaleDateString("en-CA", { timeZone: "Europe/London" });
  const yesterdayUK = new Date(Date.now() - 86_400_000).toLocaleDateString("en-CA", { timeZone: "Europe/London" });

  // Pull every booking with a milestone: drop-off today, return today, or return
  // yesterday (for the next-day review), in one query.
  const { data: bookings, error } = await supabase
    .from("bookings")
    .select("*")
    .or(`dropoff_date.eq.${todayUK},pickup_date.eq.${todayUK},pickup_date.eq.${yesterdayUK}`)
    .in("status", ACTIVE);

  if (error) {
    logger.error("[CRON reminders] Failed to fetch bookings:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  if (!bookings || bookings.length === 0) {
    return NextResponse.json({ message: "No milestone bookings today.", dropoff: 0, return: 0, review: 0 });
  }

  // Resolve operators once.
  const companyIds = Array.from(new Set(bookings.map((b) => b.company_id).filter(Boolean)));
  const { data: companies } = companyIds.length
    ? await supabase.from("companies").select("*").in("id", companyIds)
    : { data: [] as any[] };
  const companyMap = new Map((companies || []).map((c) => [c.id, c]));
  const companyFor = (b: any) => (b.company_id ? companyMap.get(b.company_id) || null : null);

  const stats = { dropoff: 0, return: 0, review: 0, failed: 0 };

  for (const b of bookings) {
    // Drop-off day
    if (b.dropoff_date === todayUK && !b.dropoff_sms_sent) {
      const r = await sendDropoffDaySMS(b, companyFor(b)).catch((e) => ({ success: false, error: String(e) }));
      if (r.success) { stats.dropoff++; await supabase.from("bookings").update({ dropoff_sms_sent: true }).eq("id", b.id); }
      else { stats.failed++; logger.error(`[CRON] drop-off SMS failed ${b.booking_ref}:`, r.error); }
    }

    // Return day — collect reminder
    if (b.pickup_date === todayUK && !b.return_sms_sent) {
      const r = await sendReturnDaySMS(b, companyFor(b)).catch((e) => ({ success: false, error: String(e) }));
      if (r.success) { stats.return++; await supabase.from("bookings").update({ return_sms_sent: true }).eq("id", b.id); }
      else { stats.failed++; logger.error(`[CRON] return SMS failed ${b.booking_ref}:`, r.error); }
    }

    // Day after return — review request
    if (b.pickup_date === yesterdayUK && !b.review_sms_sent) {
      const r = await sendReviewRequestSMS(b).catch((e) => ({ success: false, error: String(e) }));
      if (r.success) { stats.review++; await supabase.from("bookings").update({ review_sms_sent: true }).eq("id", b.id); }
      else { stats.failed++; logger.error(`[CRON] review SMS failed ${b.booking_ref}:`, r.error); }
    }
  }

  logger.info(`[CRON reminders] Done: ${JSON.stringify(stats)} across ${bookings.length} bookings.`);
  return NextResponse.json({ total: bookings.length, ...stats });
}
