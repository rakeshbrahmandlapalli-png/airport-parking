// @ts-nocheck
// app/api/create-extension-session/route.ts
//
// EXTENSION = (full price of NEW total duration) − (already-paid total) + £10 amendment fee.
// The server recomputes the new-duration price with the SAME engine as /api/checkout.
// The client-sent amount is IGNORED — never trust a price from the browser.

import { NextResponse } from "next/server";
import Stripe from "stripe";
import { createClient } from "@supabase/supabase-js";
import {
  computePrice,
  calculateDays,
  isApiCompany,
  DEFAULT_SETTINGS,
  loadPricingSettings,
} from "@/app/lib/pricing";

if (!process.env.STRIPE_SECRET_KEY) throw new Error("STRIPE_SECRET_KEY is not set");
if (!process.env.NEXT_PUBLIC_SUPABASE_URL) throw new Error("NEXT_PUBLIC_SUPABASE_URL is not set");
if (!process.env.SUPABASE_SERVICE_ROLE_KEY) throw new Error("SUPABASE_SERVICE_ROLE_KEY is not set");

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: "2024-04-10" }); // Keeping your standard Stripe version

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// ─── CONSTANTS (kept in sync with /api/checkout) ──────────────────────────────
const GATEWAY_URL = "https://luton247airportparking.co.uk/agent/get_parking_price";
// Moved out of source — set LUTON247_FALLBACK_TOKEN in your environment.
const FALLBACK_TOKEN = process.env.LUTON247_FALLBACK_TOKEN || process.env.LUTON247_API_TOKEN || "";
const AMENDMENT_FEE = 10.0;            // £10 flat amendment charge
const MIN_EXTRA_CHARGE = 0.5;          // don't create a Stripe session for trivially small diffs

function roundPennies(v: number): number {
  return Math.round(v * 100) / 100;
}

function isValidEmail(e: unknown): e is string {
  return typeof e === "string" && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e.trim());
}

export async function POST(req: Request) {
  try {
    // ── 1. Parse body ──────────────────────────────────────────────────────
    let body: any;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON in request body." }, { status: 400 });
    }

    // NOTE: we deliberately do NOT read `amount` from the client. Price is server-derived.
    const bookingRef = String(body.bookingRef || "").toUpperCase().trim();
    const newPickupDate = String(body.newPickupDate || "").trim();
    // quoteOnly = price the change and return the breakdown WITHOUT creating a Stripe session.
    const quoteOnly = body.quoteOnly === true;

    if (!bookingRef) {
      return NextResponse.json({ error: "Missing booking reference." }, { status: 400 });
    }
    if (!newPickupDate || !/^\d{4}-\d{2}-\d{2}/.test(newPickupDate)) {
      return NextResponse.json({ error: "Missing or invalid new pick-up date." }, { status: 400 });
    }

    // ── 2. Load the booking (server-trusted source of original total) ────────
    const { data: booking, error: bookingErr } = await supabaseAdmin
      .from("bookings")
      .select("*")
      .eq("booking_ref", bookingRef)
      .maybeSingle();

    if (bookingErr) {
      console.error("Extension: booking fetch error:", bookingErr);
      return NextResponse.json({ error: "Could not load your booking." }, { status: 500 });
    }
    if (!booking) {
      return NextResponse.json({ error: "Booking not found." }, { status: 404 });
    }
    if (booking.status === "cancelled") {
      return NextResponse.json({ error: "This booking has been cancelled and cannot be extended." }, { status: 409 });
    }

    // ── 3. Validate the new date extends the stay ────────────────────────────
    const dropDate = String(booking.dropoff_date || "").split("T")[0];
    const oldPickup = String(booking.pickup_date || "").split("T")[0];
    if (!dropDate) {
      return NextResponse.json({ error: "Booking is missing a drop-off date." }, { status: 409 });
    }
    if (newPickupDate <= oldPickup) {
      return NextResponse.json(
        { error: "The new pick-up date must be later than your current pick-up date." },
        { status: 400 }
      );
    }

    // ── 4. Resolve the email we'll send the Stripe receipt to ────────────────
    const candidateEmail =
      (isValidEmail(booking.email) && booking.email) ||
      (isValidEmail(body.customerEmail) && String(body.customerEmail).trim()) ||
      null;

    if (!candidateEmail) {
      return NextResponse.json(
        { error: "We don't have a valid email on file for this booking. Please contact support to extend." },
        { status: 422 }
      );
    }

    // ── 5. Load the company (trusted pricing source) ─────────────────────────
    let company: any = null;
    if (booking.company_id) {
      const { data, error } = await supabaseAdmin
        .from("companies")
        .select("*")
        .eq("id", booking.company_id)
        .maybeSingle();
      if (error) console.error("Extension: company fetch error:", error);
      company = data ?? null;
    }

    // ── 6. Load markup + auto-surge settings (same as checkout) ──────────────
    const settings = await loadPricingSettings(supabaseAdmin);

    // ── 7. Respect pricing_mode: only call live API for api-mode companies ───
    const dropTime = String(booking.dropoff_time || "09:00").slice(0, 5) || "09:00";
    let pickTime = String(booking.pickup_time || "09:00").slice(0, 5) || "09:00";
    if (dropDate === newPickupDate && dropTime >= pickTime) pickTime = "23:59";

    const useApi = isApiCompany(company) && company?.pricing_mode !== "pivot";

    let liveApiRates: any[] = [];
    if (useApi) {
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
            return_date: newPickupDate,
            return_time: pickTime,
          }),
        });
        if (apiRes.ok) {
          const text = await apiRes.text();
          let parsed: any;
          try { parsed = JSON.parse(text); } catch { /* non-JSON — ignore */ }
          if (Array.isArray(parsed)) liveApiRates = parsed;
          else if (parsed?.rates && Array.isArray(parsed.rates)) liveApiRates = parsed.rates;
          else if (parsed?.parking_price != null) liveApiRates = [parsed];
        } else {
          console.error(`Extension: API gateway HTTP ${apiRes.status}`);
        }
      } catch (e: any) {
        console.error("Extension: live API fetch failed:", e?.name === "AbortError" ? "timeout" : e);
      } finally {
        clearTimeout(timeout);
      }
    }

    // ── 8. Recompute the FULL new-duration price via the shared engine ───────
    const newDuration = calculateDays(dropDate, newPickupDate);
    if (newDuration <= 0) {
      return NextResponse.json({ error: "Could not work out the new duration." }, { status: 400 });
    }

    const priceResult = computePrice({
      company,
      providerName: booking.service_type,
      airport: booking.airport || "Luton (LTN)",
      duration: newDuration,
      dropDate,
      liveApiRates,
      settings,
      fallbackPrice: 0,
    });

    if (!priceResult.ok || priceResult.final <= 0) {
      console.error("Extension: price engine failed:", { bookingRef, newDuration, priceResult });
      return NextResponse.json(
        { error: "We couldn't confirm the new price right now. Please try again in a moment." },
        { status: 409 }
      );
    }

    let rawNewFinal = priceResult.final;

    // 🟢 EXACT FIX: Apply the Dynamic Surcharge to the server calculation
    // Ensures they pay the correct margin on the extended days
    if (company && company.dynamic_surcharge_percent) {
      const surcharge = Number(company.dynamic_surcharge_percent || 0);
      if (surcharge > 0) {
        rawNewFinal = rawNewFinal * (1 + (surcharge / 100));
      }
    }

    const newFullTotal = roundPennies(rawNewFinal);
    const alreadyPaid = roundPennies(Number(booking.total_price) || 0);

    // ── 9. Difference + £10 amendment fee ────────────────────────────────────
    let priceDifference = newFullTotal - alreadyPaid;
    if (priceDifference < 0) priceDifference = 0; // never refund automatically here
    const extraToCharge = roundPennies(priceDifference + AMENDMENT_FEE);

    if (extraToCharge < MIN_EXTRA_CHARGE) {
      return NextResponse.json(
        { error: "The change is too small to process online. Please contact support." },
        { status: 409 }
      );
    }

    const breakdown = {
      newDuration,
      newFullTotal,
      alreadyPaid,
      priceDifference: roundPennies(priceDifference),
      amendmentFee: AMENDMENT_FEE,
      extraToCharge,
    };

    // ── 10a. Quote-only: return the price without creating a Stripe session ──
    if (quoteOnly) {
      return NextResponse.json({ breakdown });
    }

    // ── 10. Build redirect URLs ──────────────────────────────────────────────
    const baseUrl = (
      process.env.NEXT_PUBLIC_SITE_URL ||
      process.env.NEXT_PUBLIC_BASE_URL ||
      "https://www.aeroparkdirect.co.uk"
    ).replace(/\/$/, "");

    // ── 11. Create the Stripe session with the SERVER-VERIFIED amount ────────
    const unitAmount = Math.round(extraToCharge * 100);
    if (unitAmount <= 0) {
      return NextResponse.json({ error: "Computed extension charge was zero." }, { status: 409 });
    }

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      phone_number_collection: { enabled: true },
      customer_email: candidateEmail,
      line_items: [
        {
          price_data: {
            currency: "gbp",
            product_data: {
              name: "AeroPark Direct - Booking Extension",
              description: `Ref: ${bookingRef} | New Return: ${newPickupDate} | Incl. £${AMENDMENT_FEE.toFixed(2)} amendment fee`,
            },
            unit_amount: unitAmount,
          },
          quantity: 1,
        },
      ],
      mode: "payment",
      metadata: {
        is_amendment: "true",
        booking_ref: bookingRef,
        new_pickup: newPickupDate,
        // Webhook uses these to set the correct new total (old + extra), NOT overwrite.
        old_total: alreadyPaid.toFixed(2),
        extra_charged: extraToCharge.toFixed(2),
        amendment_fee: AMENDMENT_FEE.toFixed(2),
        new_full_total: newFullTotal.toFixed(2),
        promo_used: "None",
      },
      success_url: `${baseUrl}/manage?ref=${encodeURIComponent(bookingRef)}&updated=true`,
      cancel_url: `${baseUrl}/manage`,
    });

    if (!session.url) {
      throw new Error("Stripe returned a session without a URL.");
    }

    // Return the server-computed breakdown so the client can show an accurate summary.
    return NextResponse.json({ url: session.url, breakdown });
  } catch (error: any) {
    console.error("Stripe Extension Error:", error);
    return NextResponse.json(
      { error: "An unexpected error occurred. Please try again." },
      { status: 500 }
    );
  }
}