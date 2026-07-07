import { logger } from "@/app/lib/logger";
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { sendReturnDaySMS } from "@/app/lib/twilio";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// Runs once daily (Vercel Cron, see vercel.json). Vercel automatically sends
// `Authorization: Bearer $CRON_SECRET` on cron-triggered invocations when a
// CRON_SECRET env var is set — this rejects any other caller.
export async function GET(req: NextRequest) {
  const auth = req.headers.get("authorization");
  if (!process.env.CRON_SECRET || auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // "Today" in UK local time — pickup_date is a calendar date, not a timestamp.
  const todayUK = new Date().toLocaleDateString("en-CA", { timeZone: "Europe/London" });

  const { data: bookings, error } = await supabase
    .from("bookings")
    .select("*")
    .eq("pickup_date", todayUK)
    .eq("return_sms_sent", false)
    .in("status", ["confirmed", "parked"]);

  if (error) {
    logger.error("[CRON return-reminders] Failed to fetch bookings:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  if (!bookings || bookings.length === 0) {
    return NextResponse.json({ sent: 0, failed: 0, message: "No return-day bookings today." });
  }

  const companyIds = Array.from(new Set(bookings.map((b) => b.company_id).filter(Boolean)));
  const { data: companies } = companyIds.length
    ? await supabase.from("companies").select("*").in("id", companyIds)
    : { data: [] as any[] };
  const companyMap = new Map((companies || []).map((c) => [c.id, c]));

  let sent = 0;
  let failed = 0;

  for (const booking of bookings) {
    const company = booking.company_id ? companyMap.get(booking.company_id) || null : null;
    const result = await sendReturnDaySMS(booking, company).catch((err) => {
      logger.error(`[CRON return-reminders] SMS threw for ${booking.booking_ref}:`, err);
      return { success: false, error: String(err) };
    });

    if (result.success) {
      sent += 1;
      await supabase.from("bookings").update({ return_sms_sent: true }).eq("id", booking.id);
    } else {
      failed += 1;
      logger.error(`[CRON return-reminders] Failed for ${booking.booking_ref}:`, result.error);
    }
  }

  logger.info(`[CRON return-reminders] Done: ${sent} sent, ${failed} failed, ${bookings.length} total.`);
  return NextResponse.json({ sent, failed, total: bookings.length });
}
