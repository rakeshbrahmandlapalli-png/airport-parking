import { logger } from "@/app/lib/logger";
import { NextResponse } from "next/server";
import Stripe from "stripe";
import { createClient } from "@supabase/supabase-js";
import { publicBooking, publicCompany } from "@/app/lib/manageBooking";
import { notifyNewBooking } from "@/app/lib/push";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// Verifies a paid Stripe session and ensures the booking row exists, returning
// the authoritative record. Replaces the old client-side anon upsert so the
// bookings table can be fully locked down from the public key.
// What the success page may see: the customer-facing fields, the customer's
// own email and phone (for Google Ads enhanced conversions), and the operator's
// name, phone numbers and instructions. Never the whole row.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function respond(row: any, created: boolean) {
  let company = null;
  if (row.company_id) {
    const { data } = await supabaseAdmin
      .from("companies")
      .select("name, phone_number, phone_number_2, on_arrival, on_arrival_ltn, on_arrival_lhr, on_return, on_return_ltn, on_return_lhr")
      .eq("id", row.company_id)
      .maybeSingle();
    company = publicCompany(data);
  }
  return NextResponse.json({
    booking: { ...publicBooking(row), email: row.email, phone_number: row.phone_number },
    company,
    created,
  });
}

export async function POST(req: Request) {
  let body: any;
  try { body = await req.json(); } catch { return NextResponse.json({ error: "Invalid request." }, { status: 400 }); }

  const sessionId = String(body?.sessionId || "").trim();
  // Stripe Checkout session ids look like cs_live_… / cs_test_… — validate shape.
  if (!/^cs_[A-Za-z0-9_]+$/.test(sessionId)) {
    return NextResponse.json({ error: "Invalid session." }, { status: 400 });
  }

  try {
    const session = await stripe.checkout.sessions.retrieve(sessionId);
    if (session.payment_status !== "paid") {
      return NextResponse.json({ status: "unpaid" }, { status: 402 });
    }

    const m = (session.metadata || {}) as Record<string, string>;
    const amount = (session.amount_total || 0) / 100;

    // Already written (by webhook or a previous sync)?
    const { data: existing } = await supabaseAdmin
      .from("bookings")
      .select("*")
      .eq("stripe_session_id", sessionId)
      .maybeSingle();

    if (existing) {
      return respond(existing, false);
    }

    // Same "was this actually bought as Exclusive" signal as the webhook's
    // primary path (app/api/webhook/route.ts) — decided once, at creation,
    // so the fee-covered promise survives a later reassignment to a normal
    // operator. See app/api/send/route.ts isExclusiveBooking.
    let companyName = "";
    if (m.company_id) {
      const { data: comp } = await supabaseAdmin
        .from("companies").select("name").eq("id", m.company_id).maybeSingle();
      companyName = comp?.name || "";
    }
    const isExclusive = (m.service_type || "").toLowerCase().includes('exclusive') || companyName.toLowerCase().includes('exclusive');

    const shortId = "APD-" + Math.random().toString(36).substring(2, 8).toUpperCase();
    const newRow = {
      booking_ref:       shortId,
      stripe_session_id: sessionId,
      full_name:         m.full_name   || "Valued Customer",
      email:             (session.customer_details?.email || m.email || "").trim().toLowerCase() || null,
      phone_number:      session.customer_details?.phone || m.phone || "N/A",
      license_plate:     m.license_plate || null,
      car_make:          m.car_make      || "N/A",
      car_color:         m.car_color     || "N/A",
      service_type:      m.service_type  || "Meet & Greet",
      dropoff_date:      m.dropoff_date  || null,
      dropoff_time:      m.dropoff_time  || null,
      pickup_date:       m.pickup_date   || null,
      pickup_time:       m.pickup_time   || null,
      total_price:       amount,
      flight_number:     m.flight_number || "TBC",
      airport:           m.airport       || "Luton (LTN)",
      terminal:          m.terminal      || "Main Terminal",
      company_id:        m.company_id    || null,
      fast_track_count:  Number(m.fast_track_count) || 0,
      attendant_commission: Number(m.attendant_commission) || 0,
      // Only persist an explicit commission % (admin walk-ins / payment links);
      // leave NULL for normal bookings so financials use the operator's own rate.
      commission_percentage:
        m.commission_percentage != null && m.commission_percentage !== ""
          ? Number(m.commission_percentage)
          : null,
      promo_code:        (m.promo_used && m.promo_used !== "None") ? m.promo_used : null,
      gclid:             m.gclid || null,
      ad_consent:        m.ad_consent === "granted" || m.ad_consent === "denied" ? m.ad_consent : null,
      status:            "confirmed",
      fees_covered:      isExclusive,
    };

    await supabaseAdmin
      .from("bookings")
      .upsert([newRow], { onConflict: "stripe_session_id", ignoreDuplicates: true });

    const { data: finalRow } = await supabaseAdmin
      .from("bookings")
      .select("*")
      .eq("stripe_session_id", sessionId)
      .maybeSingle();

    if (!finalRow) {
      return NextResponse.json({ error: "row-not-ready" }, { status: 503 });
    }

    // created = true only if THIS request inserted the row (so the client knows
    // whether to fire the fallback confirmation email).
    const created = finalRow.booking_ref === shortId;
    // This request wrote the booking (the webhook hasn't yet), so it announces
    // it; the webhook will see the row already exists and stay quiet.
    if (created) await notifyNewBooking(finalRow);
    return respond(finalRow, created);
  } catch (err: any) {
    logger.error("success/sync error:", err?.message);
    return NextResponse.json({ error: "Verification failed." }, { status: 500 });
  }
}
