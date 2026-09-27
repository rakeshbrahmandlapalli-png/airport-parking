"use server";

import { createClient } from "@supabase/supabase-js";
import { logger } from "@/app/lib/logger";

// ─── SUPABASE CLIENTS ────────────────────────────────────────────────────────
// 🟢 PUBLIC client — for safe reads (slots, availability checks)
const supabasePublic = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

// 🟢 SERVICE ROLE client — for server-side writes (bypasses RLS safely)
// Never expose this key to the browser. Only used in "use server" context.
if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
  throw new Error("SUPABASE_SERVICE_ROLE_KEY is not set. Add it to your environment variables.");
}
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// ─── SAFE DATE PARSER ────────────────────────────────────────────────────────
const safeParseDate = (dateStr: string): Date => {
  if (!dateStr) return new Date();
  if (dateStr.includes("/")) {
    const [day, month, year] = dateStr.split("/");
    const d = new Date(`${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`);
    return isNaN(d.getTime()) ? new Date() : d;
  }
  const d = new Date(dateStr);
  return isNaN(d.getTime()) ? new Date() : d;
};

// ============================================================================
// INVENTORY CHECK — used by results page
// ============================================================================
export async function checkAvailability(
  airport: string,
  dropoffStr: string,
  pickupStr: string
): Promise<{ isAvailable: boolean; spotsLeft: number }> {
  const MAX_CAPACITY = 50;
  const FAIL_OPEN = { isAvailable: true, spotsLeft: MAX_CAPACITY }; // 🟢 FIXED: fail open

  try {
    if (!dropoffStr || !pickupStr) return FAIL_OPEN;

    const requestedStart = safeParseDate(dropoffStr);
    const requestedEnd   = safeParseDate(pickupStr);

    if (isNaN(requestedStart.getTime()) || isNaN(requestedEnd.getTime())) {
      return FAIL_OPEN;
    }

    const { count, error } = await supabasePublic
      .from("bookings")
      .select("*", { count: "exact", head: true })
      .eq("airport", airport)
      .neq("status", "cancelled")
      .lte("dropoff_date", requestedEnd.toISOString())
      .gte("pickup_date", requestedStart.toISOString());

    if (error) throw error;

    const overlapping = count || 0;
    const spotsLeft   = Math.max(0, MAX_CAPACITY - overlapping);

    return { isAvailable: overlapping < MAX_CAPACITY, spotsLeft };
  } catch (err) {
    logger.error("Availability check failed — failing open:", err);
    return FAIL_OPEN; // 🟢 FIXED: was failing CLOSED (blocking real bookings)
  }
}

// The checkout flow lives entirely in the /api/checkout route, which recomputes
// the price server-side before creating a Stripe session. The previous legacy
// server action here trusted a client-supplied total and has been removed so it
// can't be invoked as a price-bypass path.