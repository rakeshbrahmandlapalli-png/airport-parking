"use server";

import { redirect } from "next/navigation";
import Stripe from "stripe";
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

// ─── BOOKING REF GENERATOR ────────────────────────────────────────────────────
// 🟢 FIXED: crypto.randomUUID is available in Node 18+ / Edge runtime
const generateRef = (): string => {
  try {
    // Use Node crypto for a collision-safe ref
    const { randomBytes } = require("crypto");
    return "APD-" + randomBytes(4).toString("hex").toUpperCase();
  } catch {
    // Fallback: still better than Math.random()
    return "APD-" + Date.now().toString(36).toUpperCase();
  }
};

// ============================================================================
// LAUNCH TIMER — slots claimed
// ============================================================================
export async function getLaunchSlotsClaimed(): Promise<number> {
  try {
    const { data, error } = await supabasePublic
      .from("settings")
      .select("value")
      .eq("key", "slots_claimed")
      .maybeSingle();

    if (error || !data) return 12;
    return parseInt(data.value || "12", 10);
  } catch {
    return 12;
  }
}

// 🟢 NEW: Fetch both slots values in one call so LaunchTimer gets both
export async function getLaunchSlots(): Promise<{ claimed: number; total: number }> {
  try {
    const { data } = await supabasePublic
      .from("settings")
      .select("key, value")
      .in("key", ["slots_claimed", "slots_total"]);

    const get = (key: string, fallback: number) =>
      parseInt(data?.find((r: any) => r.key === key)?.value || String(fallback), 10);

    return { claimed: get("slots_claimed", 12), total: get("slots_total", 15) };
  } catch {
    return { claimed: 12, total: 15 };
  }
}

// 🟢 NEW: Full launch-timer config (enabled, hours, slots, and all text)
export interface LaunchTimerConfig {
  enabled: boolean;
  hours: number;
  slotsClaimed: number;
  slotsTotal: number;
  badge: string;
  title: string;
  subtitle: string;
  benefitTitle: string;
  benefitValue: string;
  benefitNote: string;
}

const TIMER_DEFAULTS: LaunchTimerConfig = {
  enabled: true,
  hours: 72,
  slotsClaimed: 12,
  slotsTotal: 15,
  badge: "Live Launch Event",
  title: "Founding Member Launch",
  subtitle: "Secure your spot · 5% lifetime discount",
  benefitTitle: "Founding Members Get",
  benefitValue: "5% Lifetime Discount",
  benefitNote: "Plus priority access to new features",
};

export async function getLaunchTimerConfig(): Promise<LaunchTimerConfig> {
  try {
    const { data } = await supabasePublic
      .from("settings")
      .select("key, value")
      .in("key", [
        "timer_enabled", "timer_hours", "slots_claimed", "slots_total",
        "timer_badge", "timer_title", "timer_subtitle",
        "timer_benefit_title", "timer_benefit_value", "timer_benefit_note",
      ]);

    const get = (key: string) => data?.find((r: any) => r.key === key)?.value;
    const str = (key: string, fallback: string) => {
      const v = get(key);
      return v != null && v !== "" ? v : fallback;
    };
    const num = (key: string, fallback: number) => {
      const v = parseInt(get(key) || "", 10);
      return isNaN(v) ? fallback : v;
    };

    return {
      enabled: get("timer_enabled") !== "false",
      hours: num("timer_hours", TIMER_DEFAULTS.hours),
      slotsClaimed: num("slots_claimed", TIMER_DEFAULTS.slotsClaimed),
      slotsTotal: num("slots_total", TIMER_DEFAULTS.slotsTotal),
      badge: str("timer_badge", TIMER_DEFAULTS.badge),
      title: str("timer_title", TIMER_DEFAULTS.title),
      subtitle: str("timer_subtitle", TIMER_DEFAULTS.subtitle),
      benefitTitle: str("timer_benefit_title", TIMER_DEFAULTS.benefitTitle),
      benefitValue: str("timer_benefit_value", TIMER_DEFAULTS.benefitValue),
      benefitNote: str("timer_benefit_note", TIMER_DEFAULTS.benefitNote),
    };
  } catch {
    return TIMER_DEFAULTS;
  }
}

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

// ============================================================================
// CREATE CHECKOUT SESSION
// Legacy server action — kept for backwards compatibility.
// The primary checkout flow uses /api/checkout route instead.
// ============================================================================
export async function createCheckoutSession(formData: FormData) {
  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY as string);

  // ── Extract form fields ────────────────────────────────────────────────────
  const customerName  = formData.get("customerName")  as string;
  const customerEmail = formData.get("customerEmail")  as string;
  const customerPhone = formData.get("customerPhone")  as string;
  const flightNumber  = formData.get("flightNumber")   as string;
  const licensePlate  = formData.get("licensePlate")   as string;
  const carMake       = (formData.get("carMake")       as string) || "";
  const carColor      = (formData.get("carColor")      as string) || "";
  const promoUsed     = (formData.get("promoUsed")     as string) || "";
  const fastTrackCount = parseInt((formData.get("fastTrackCount") as string) || "0", 10);
  const parkingType   = (formData.get("parkingType")   as string) || "standard";
  const totalPrice    = parseFloat((formData.get("totalPrice")   as string) || "0");
  const airport       = (formData.get("airport")       as string) || "Luton Airport (LTN)";
  const terminal      = (formData.get("terminal")      as string) || "Main Terminal";
  const dropoffDateStr = formData.get("dropoffDate")   as string;
  const pickupDateStr  = formData.get("pickupDate")    as string;
  const companyId     = (formData.get("companyId")     as string) || "";

  const dropoffDate = safeParseDate(dropoffDateStr);
  const pickupDate  = safeParseDate(pickupDateStr);

  // 🟢 FIXED: Collision-safe booking ref
  const bookingRef = generateRef();

  let sessionUrl = "";

  try {
    // ── 1. Resolve company ─────────────────────────────────────────────────
    let company: any = null;
    if (companyId && companyId !== "null") {
      const { data } = await supabaseAdmin.from("companies").select("*").eq("id", companyId).maybeSingle();
      company = data;
    }
    if (!company && parkingType) {
      const { data } = await supabaseAdmin.from("companies").select("*").ilike("name", `%${parkingType}%`).maybeSingle();
      company = data;
    }

    // ── 2. 🟢 FIXED: Create Stripe session FIRST (so we get the session_id) ─
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      line_items: [
        {
          price_data: {
            currency: "gbp",
            product_data: {
              name: `AeroPark Direct: ${company?.name || parkingType.toUpperCase()}`,
              description: `Flight: ${flightNumber} | Plate: ${licensePlate} | Ref: ${bookingRef}`,
            },
            unit_amount: Math.round(totalPrice * 100),
          },
          quantity: 1,
        },
      ],
      metadata: {
        booking_ref:      bookingRef,
        company_id:       company?.id    || "",
        provider_name:    company?.name  || parkingType,
        terminal,
        promo_used:       promoUsed,
        fast_track_count: fastTrackCount.toString(),
      },
      mode: "payment",
      success_url: `${process.env.NEXT_PUBLIC_BASE_URL || "https://www.aeroparkdirect.co.uk"}/success?session_id={CHECKOUT_SESSION_ID}&ref=${bookingRef}`,
      cancel_url:  `${process.env.NEXT_PUBLIC_BASE_URL || "https://www.aeroparkdirect.co.uk"}/checkout?type=${parkingType}`,
      customer_email: customerEmail,
    });

    sessionUrl = session.url as string;

    // ── 3. 🟢 FIXED: Insert booking AFTER session created, WITH session_id ─
    const { error: insertError } = await supabaseAdmin.from("bookings").insert([{
      booking_ref:      bookingRef,
      stripe_session_id: session.id,   // 🟢 Now saved correctly for webhook matching
      full_name:        customerName,
      email:            customerEmail,
      phone_number:     customerPhone,
      flight_number:    flightNumber,
      license_plate:    licensePlate,
      car_make:         carMake,
      car_color:        carColor,
      promo_used:       promoUsed,
      service_type:     parkingType,
      total_price:      totalPrice,
      fast_track_count: fastTrackCount,
      status:           "pending",     // Webhook updates to "paid" on success
      airport,
      terminal,
      dropoff_date:     dropoffDate.toISOString(),
      pickup_date:      pickupDate.toISOString(),
      company_id:       company?.id || null,
    }]);

    if (insertError) {
      // Log but don't block — Stripe session exists, webhook will still fire
      logger.error("Booking DB insert failed (session still valid):", insertError.message);
    }

  } catch (err) {
    logger.error("createCheckoutSession failed:", err);
    return; // Returns undefined — caller should handle gracefully
  }

  // ── 4. Redirect to Stripe ─────────────────────────────────────────────────
  if (sessionUrl) redirect(sessionUrl);
}