// @ts-nocheck
import { NextResponse } from "next/server";
import Stripe from "stripe";
import { createClient } from "@supabase/supabase-js";
import {
  computePrice,
  calculateDays,
  isApiCompany,
  FAST_TRACK_PRICE,
  DEFAULT_SETTINGS,
  loadPricingSettings,
} from "@/app/lib/pricing";

// ─── CLIENTS ──────────────────────────────────────────────────────────────────

if (!process.env.STRIPE_SECRET_KEY) throw new Error("STRIPE_SECRET_KEY is not set");
if (!process.env.NEXT_PUBLIC_SUPABASE_URL) throw new Error("NEXT_PUBLIC_SUPABASE_URL is not set");
if (!process.env.SUPABASE_SERVICE_ROLE_KEY) throw new Error("SUPABASE_SERVICE_ROLE_KEY is not set");

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2024-04-10",
});

// Server-side Supabase (service role — bypasses RLS, never exposed to client)
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// ─── CONSTANTS ────────────────────────────────────────────────────────────────

const GATEWAY_URL = "https://luton247airportparking.co.uk/agent/get_parking_price";
const FALLBACK_TOKEN = "6a0b8fa913e0463e9ad0247";

/** Max difference (£) between client-sent total and server-recomputed total before we reject. */
const PRICE_TOLERANCE = 0.5;
const LOUNGE_PRICE = 35.0;

// ─── HELPERS ──────────────────────────────────────────────────────────────────

/** Safely coerce a value to a non-empty string for Stripe metadata (max 500 chars). */
function metaStr(v: unknown, fallback = ""): string {
  const s = String(v ?? fallback).trim();
  return s.slice(0, 500);
}

/** Parse an integer safely, returning a floor of 0. */
function safeInt(v: unknown, fallback = 0): number {
  const n = parseInt(String(v ?? ""), 10);
  return isNaN(n) || n < 0 ? fallback : n;
}

/** Round a price to exactly 2 decimal places. */
function roundPennies(v: number): number {
  return Math.round(v * 100) / 100;
}

// ─── MAIN HANDLER ─────────────────────────────────────────────────────────────

export async function POST(req: Request) {
  try {
    // ── 1. Parse & validate request body ──────────────────────────────────────
    let body: any;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON in request body." }, { status: 400 });
    }

    const { price, airport, provider, metadata, isAmendment } = body;

    // Basic structural checks
    if (!airport || typeof airport !== "string") {
      return NextResponse.json({ error: "Missing or invalid airport." }, { status: 400 });
    }
    if (typeof price !== "number" || isNaN(price) || price < 0) {
      return NextResponse.json({ error: "Missing or invalid price." }, { status: 400 });
    }
    if (!metadata || typeof metadata !== "object") {
      return NextResponse.json({ error: "Missing metadata." }, { status: 400 });
    }

    // ── 2. AMENDMENTS — trusted amount, skip price recompute ──────────────────
    // A date-change adjustment is a manually-set figure; charge what's sent.
    if (isAmendment) {
      if (price <= 0) {
        return NextResponse.json({ error: "Amendment price must be greater than zero." }, { status: 400 });
      }
      return createSession({ price, airport, provider, metadata, isAmendment: true });
    }

    // ── 3. NEW BOOKINGS — server-side price recompute ─────────────────────────
    const companyId = metaStr(metadata.company_id);
    const dropDate  = metaStr(metadata.dropoff_date || metadata.dropDate);
    const pickDate  = metaStr(metadata.pickup_date  || metadata.pickDate);
    const dropTime  = metaStr(metadata.dropoff_time || metadata.dropTime, "09:00") || "09:00";
    let   pickTime  = metaStr(metadata.pickup_time  || metadata.pickTime, "09:00") || "09:00";

    if (!dropDate || !pickDate) {
      return NextResponse.json({ error: "Missing drop-off or pick-up date." }, { status: 400 });
    }

    // Same-day guard: give the gateway a valid time range
    if (dropDate === pickDate && dropTime >= pickTime) pickTime = "23:59";

    const fastTrackCount = safeInt(metadata.fast_track_count);
    const promoCode = (
      metadata.promo_used &&
      String(metadata.promo_used).toUpperCase().trim() !== "NONE" &&
      String(metadata.promo_used).trim() !== ""
    )
      ? String(metadata.promo_used).toUpperCase().trim()
      : "";

    // ── 4. Load company (trusted pricing source) ───────────────────────────────
    let company: any = null;
    if (companyId) {
      const { data, error } = await supabaseAdmin
        .from("companies")
        .select("*")
        .eq("id", companyId)
        .maybeSingle();
      if (error) console.error("Company fetch error:", error);
      company = data ?? null;
    }

    if (!company) {
      console.warn(`No company found for id="${companyId}". Proceeding with null company (pivot fallback).`);
    }

    // ── 5. Load markup + auto-surge settings ───────────────────────────────────
    // Shared loader so the server charges exactly what the results page showed.
    const settings = await loadPricingSettings(supabaseAdmin);

    // ── 6. Live API fetch (for API-priced companies) ───────────────────────────
    let liveApiRates: any[] = [];

    if (isApiCompany(company) && dropDate && pickDate) {
      const token = company.api_token || process.env.LUTON247_API_TOKEN || FALLBACK_TOKEN;
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 7000);
      try {
        const apiRes = await fetch(GATEWAY_URL, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          cache: "no-store",
          signal: controller.signal,
          body: JSON.stringify({
            token_no: token,
            drop_date: dropDate,
            drop_time: dropTime,
            return_date: pickDate,
            return_time: pickTime,
          }),
        });

        if (!apiRes.ok) {
          console.error(`API gateway returned HTTP ${apiRes.status}`);
        } else {
          const text = await apiRes.text();
          let parsed: any;
          try { parsed = JSON.parse(text); } catch { /* non-JSON response — fall through */ }

          if (Array.isArray(parsed)) {
            liveApiRates = parsed;
          } else if (parsed?.rates && Array.isArray(parsed.rates)) {
            // FIX: support { rates: [...] } envelope shape too
            liveApiRates = parsed.rates;
          } else if (parsed?.parking_price != null) {
            liveApiRates = [parsed];
          }
        }
      } catch (e: any) {
        if (e?.name === "AbortError") {
          console.error("Server Checkout: live API fetch timed out after 7s");
        } else {
          console.error("Server Checkout: live API fetch failed:", e);
        }
        // liveApiRates stays [] — engine will fall back to pivot pricing
      } finally {
        clearTimeout(timeout);
      }
    }

    // ── 7. Recompute parking price via shared engine ───────────────────────────
    const duration = calculateDays(dropDate, pickDate);

    if (duration <= 0) {
      return NextResponse.json(
        { error: "Pick-up date must be after drop-off date." },
        { status: 400 }
      );
    }

    const priceResult = computePrice({
      company,
      providerName: provider || metaStr(metadata.service_type),
      airport,
      duration,
      dropDate,
      liveApiRates,
      settings,
      fallbackPrice: 0,
    });

    // If the price engine couldn't resolve a price, fail closed
    if (!priceResult.ok || priceResult.final <= 0) {
      console.error("Price engine failed:", {
        companyId,
        airport,
        duration,
        liveApiRates: liveApiRates.length,
        priceResult,
      });
      return NextResponse.json(
        {
          error:
            "We couldn't confirm pricing for this provider right now. Please try again in a moment.",
        },
        { status: 409 }
      );
    }

    // Surcharge is applied ONCE inside computePrice (pricing.ts) for both API
    // and pivot companies — so priceResult.final is already surcharge-inclusive.
    // This block previously re-multiplied by (1 + surcharge), which double-
    // charged pivot companies AND broke parity with the client on API companies
    // (client applies once, server was applying twice → 409 mismatch modal).
    // Fixed 2026-06: computePrice is the single source of truth.
    let serverTotal = priceResult.final;

    // ── 8. Re-validate promo code server-side (never trust client discount) ────
    let appliedPromo = "None";
    if (promoCode) {
      try {
        const { data: promo, error: promoErr } = await supabaseAdmin
          .from("promotions")
          .select("*")
          .eq("code", promoCode)
          .maybeSingle();

        if (promoErr) {
          console.error("Promo fetch error:", promoErr);
        }

        const now = new Date();
        const isActive = promo?.is_active !== false;
        const notExpired = !promo?.expiry_date || new Date(promo.expiry_date) >= now;
        // FIX: also check start date if the promo table has one
        const hasStarted = !promo?.start_date || new Date(promo.start_date) <= now;

        if (promo && isActive && notExpired && hasStarted) {
          const pct = Number(promo.discount_percent) / 100;
          // Sanity check: only apply a discount between 1% and 100%
          if (pct > 0 && pct <= 1) {
            serverTotal = serverTotal * (1 - pct);
            appliedPromo = promo.code;
          } else {
            console.warn(`Promo "${promoCode}" has invalid discount_percent: ${promo.discount_percent}`);
          }
        }
        // Unknown / expired / future codes are silently ignored (AERO3, AERO VIP, etc.)
      } catch (e) {
        console.error("Promo validation error:", e);
        // Don't apply discount if validation threw
      }
    }

    // ── 9. Add fast track (server-priced — 100% ours) ─────────────────────────
    if (fastTrackCount > 0) {
      serverTotal = serverTotal + fastTrackCount * FAST_TRACK_PRICE;
    }

    // ── 10. Add VIP Lounge if selected (£35 flat) ─────────────────────────────
    if (metaStr(metadata.lounge) === "yes") {
      serverTotal = serverTotal + LOUNGE_PRICE;
    }

    // ── 11. Final rounding ────────────────────────────────────────────────────
    serverTotal = roundPennies(serverTotal);

    if (serverTotal <= 0) {
      return NextResponse.json(
        { error: "Computed total is zero or negative — cannot create a checkout session." },
        { status: 409 }
      );
    }

    // ── 12. Price mismatch guard ───────────────────────────────────────────────
    const clientTotal = roundPennies(Number(price) || 0);

    if (Math.abs(clientTotal - serverTotal) > PRICE_TOLERANCE) {
      console.warn("Price mismatch rejected", {
        clientTotal,
        serverTotal,
        diff: Math.abs(clientTotal - serverTotal),
        companyId,
        provider,
        airport,
        priceSource: priceResult.source,
        promoCode,
        fastTrackCount,
        lounge: metadata.lounge,
      });
      return NextResponse.json(
        {
          error:
            "The price has updated since you loaded this page. Please go back and re-confirm your booking before paying.",
          serverPrice: serverTotal,
        },
        { status: 409 }
      );
    }

    // ── 13. Create Stripe session with the verified server total ──────────────
    return createSession({
      price: serverTotal,
      airport,
      provider,
      metadata: { ...metadata, promo_used: appliedPromo },
      isAmendment: false,
    });
  } catch (err: any) {
    console.error("Stripe Checkout unhandled error:", err);
    return NextResponse.json(
      { error: "An unexpected error occurred. Please try again." },
      { status: 500 }
    );
  }
}

// ─── SESSION CREATOR ──────────────────────────────────────────────────────────
// Called only with a TRUSTED, server-verified price.

interface CreateSessionParams {
  price: number;
  airport: string;
  provider: string;
  metadata: Record<string, any>;
  isAmendment: boolean;
}

async function createSession({
  price,
  airport,
  provider,
  metadata,
  isAmendment,
}: CreateSessionParams): Promise<NextResponse> {
  const productName = isAmendment
    ? `Booking Amendment: ${metaStr(metadata.booking_ref)}`
    : `AeroPark: ${airport}`;

  const productDesc = isAmendment
    ? `Date Change Adjustment — ${metaStr(provider)}`
    : `${metaStr(provider)} Parking Services`;

  const baseUrl =
    (process.env.NEXT_PUBLIC_SITE_URL || process.env.NEXT_PUBLIC_BASE_URL || "https://www.aeroparkdirect.co.uk")
      .replace(/\/$/, ""); // strip trailing slash

  const successPath = isAmendment
    ? `/manage?ref=${encodeURIComponent(metaStr(metadata.booking_ref))}&updated=true`
    : `/success?session_id={CHECKOUT_SESSION_ID}`;

  // FIX: Stripe metadata values must all be strings (max 500 chars each).
  // Normalise every field through metaStr() to prevent runtime errors.
  const stripeMetadata: Record<string, string> = {
    full_name:      metaStr(metadata.full_name),
    email:          metaStr(metadata.email),
    phone:          metaStr(metadata.phone),
    license_plate:  metaStr(metadata.registration || metadata.license_plate),
    car_make:       metaStr(metadata.car_make),
    car_color:      metaStr(metadata.car_color),
    airport:        metaStr(airport),
    terminal:       metaStr(metadata.terminal, "Main Terminal"),
    dropoff_date:   metaStr(metadata.dropoff_date),
    pickup_date:    metaStr(metadata.pickup_date),
    // FIX: original code had inconsistent key lookup (dropTime vs dropoff_time).
    // Normalise here so the webhook always gets the right value.
    dropoff_time:   metaStr(metadata.dropoff_time || metadata.dropTime, "09:00"),
    pickup_time:    metaStr(metadata.pickup_time  || metadata.pickTime, "09:00"),
    flight_number:  metaStr(metadata.flightNumber || metadata.flight_number),
    provider_name:  metaStr(provider),
    company_id:     metaStr(metadata.company_id),
    service_type:   metaStr(metadata.service_type, "Premium Meet & Greet"),
    booking_ref:    metaStr(metadata.booking_ref),
    is_amendment:   isAmendment ? "true" : "false",
    promo_used:     metaStr(metadata.promo_used, "None"),
    fast_track_count: metaStr(metadata.fast_track_count, "0"),
    lounge:         metaStr(metadata.lounge, "no"),
    gclid:          metaStr(metadata.gclid),
  };

  // Guard: Stripe allows max 50 metadata keys
  const keyCount = Object.keys(stripeMetadata).length;
  if (keyCount > 50) {
    console.error(`Stripe metadata has ${keyCount} keys — max is 50. Trim before production.`);
  }

  const unitAmount = Math.round(price * 100);
  if (unitAmount <= 0) {
    throw new Error(`Invalid unit_amount ${unitAmount} (price=${price})`);
  }

  try {
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      customer_email: metaStr(metadata.email) || undefined,
      phone_number_collection: { enabled: true },
      line_items: [
        {
          price_data: {
            currency: "gbp",
            product_data: {
              name: productName,
              description: productDesc,
            },
            unit_amount: unitAmount,
          },
          quantity: 1,
        },
      ],
      metadata: stripeMetadata,
      mode: "payment",
      success_url: `${baseUrl}${successPath}`,
      cancel_url: `${baseUrl}${isAmendment ? "/manage" : "/checkout"}`,
    });

    if (!session.url) {
      throw new Error("Stripe returned a session without a URL.");
    }

    return NextResponse.json({ url: session.url });
  } catch (err: any) {
    console.error("Stripe session creation failed:", err);
    // Surface Stripe-specific errors as 502 (upstream failure), not 500
    return NextResponse.json(
      { error: "Payment provider error. Please try again." },
      { status: 502 }
    );
  }
}