import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import Stripe from "stripe";
import { createServerClient } from "@supabase/ssr";
import { Resend } from "resend";
import { logger } from "@/app/lib/logger";
import { logAdminAction } from "@/app/lib/admin-logger";
import { emailShell, emailSection, paragraph, detailTable, emailButton, emailTokens } from "@/app/lib/receiptEmail";

const escMail = (v: unknown) =>
  String(v ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

// ============================================================================
// /api/admin/payment-link — mint a Stripe Checkout link from the admin Live
// Board, with every field set by the operator.
//
// Security model:
//  • ADMIN-ONLY: the caller must hold a valid Supabase session cookie (the
//    same gate proxy.ts enforces on /admin). No session → 401. This is why an
//    arbitrary price is acceptable here, unlike the public /api/checkout which
//    recomputes prices server-side: the price-setter IS the business owner.
//  • The session metadata uses the EXACT same contract as the public checkout,
//    so when the customer pays, the existing webhook does all fulfilment:
//    booking row, confirmation email, provider notify, conversion upload.
// ============================================================================

if (!process.env.STRIPE_SECRET_KEY) throw new Error("STRIPE_SECRET_KEY is not set");
// No apiVersion pin: use the account's default version. (The SDK's typed
// literal changes every release; the legacy checkout route only "passes" the
// old pin because it's @ts-nocheck'd.)
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);
const resend = new Resend(process.env.RESEND_API_KEY!);

const MAX_LINK_AMOUNT = 3000; // £ sanity cap for a single parking payment link

function metaStr(v: unknown, fallback = ""): string {
  const s = String(v ?? fallback).trim();
  return s.slice(0, 500);
}

function generateRef(): string {
  return "APD-" + Math.random().toString(36).substring(2, 8).toUpperCase();
}

/** Resolve the logged-in admin from the request's session cookie. */
async function requireAdmin(): Promise<{ id: string; email: string | null } | null> {
  try {
    const cookieStore = await cookies();
    const supa = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      { cookies: { getAll: () => cookieStore.getAll(), setAll: () => {} } }
    );
    const { data: { user } } = await supa.auth.getUser();
    return user ? { id: user.id, email: user.email ?? null } : null;
  } catch {
    return null;
  }
}

export async function POST(req: Request) {
  // ── 1. Admin gate ──────────────────────────────────────────────────────────
  const admin = await requireAdmin();
  if (!admin) {
    return NextResponse.json({ error: "Unauthorised." }, { status: 401 });
  }

  // ── 2. Parse + validate ────────────────────────────────────────────────────
  let body: Record<string, unknown>;
  try { body = await req.json(); }
  catch { return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 }); }

  const price = Math.round(Number(body.total_price) * 100) / 100;
  if (!Number.isFinite(price) || price <= 0) {
    return NextResponse.json({ error: "Price must be greater than £0." }, { status: 400 });
  }
  if (price > MAX_LINK_AMOUNT) {
    return NextResponse.json({ error: `Price exceeds the £${MAX_LINK_AMOUNT} link cap.` }, { status: 400 });
  }

  const email = metaStr(body.email).toLowerCase();
  const sendEmail = body.sendEmail === true;
  if (sendEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json({ error: "A valid customer email is required to send the link." }, { status: 400 });
  }

  const dropDate = metaStr(body.dropoff_date);
  const pickDate = metaStr(body.pickup_date);
  if (!dropDate || !pickDate) {
    return NextResponse.json({ error: "Drop-off and return dates are required." }, { status: 400 });
  }

  const airport      = metaStr(body.airport, "Luton Airport (LTN)");
  const fullName     = metaStr(body.full_name);
  const serviceType  = metaStr(body.service_type, "Meet & Greet");
  const providerName = metaStr(body.provider_name, "AeroPark Direct");
  const bookingRef   = generateRef();

  const baseUrl =
    (process.env.NEXT_PUBLIC_SITE_URL || process.env.NEXT_PUBLIC_BASE_URL || "https://www.aeroparkdirect.co.uk")
      .replace(/\/$/, "");

  // ── 3. Stripe session — SAME metadata contract as /api/checkout ───────────
  // The webhook fulfils this exactly like a normal booking.
  const stripeMetadata: Record<string, string> = {
    full_name:        fullName,
    email,
    phone:            metaStr(body.phone_number),
    license_plate:    metaStr(body.license_plate).toUpperCase(),
    car_make:         metaStr(body.car_make),
    car_color:        metaStr(body.car_color),
    airport,
    terminal:         metaStr(body.terminal, "Main Terminal"),
    dropoff_date:     dropDate,
    pickup_date:      pickDate,
    dropoff_time:     metaStr(body.dropoff_time, "09:00"),
    pickup_time:      metaStr(body.pickup_time, "09:00"),
    flight_number:    metaStr(body.flight_number).toUpperCase(),
    provider_name:    providerName,
    company_id:       metaStr(body.company_id === "ALL" ? "" : body.company_id),
    service_type:     serviceType,
    booking_ref:      bookingRef,
    is_amendment:     "false",
    promo_used:       "None",
    fast_track_count: metaStr(body.fast_track_count, "0"),
    attendant_commission: metaStr(body.attendant_commission, "0"),
    commission_percentage: metaStr(body.commission_percentage, "30"),
    lounge:           "no",
    gclid:            "",
    source:           "admin_payment_link",
  };

  let url: string;
  let expiresAt: number;
  try {
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      customer_email: email || undefined,
      phone_number_collection: { enabled: true },
      line_items: [{
        price_data: {
          currency: "gbp",
          product_data: {
            name: `AeroPark: ${airport}`,
            description: `${serviceType} — ${dropDate} to ${pickDate} (${bookingRef})`,
          },
          unit_amount: Math.round(price * 100),
        },
        quantity: 1,
      }],
      metadata: stripeMetadata,
      mode: "payment",
      success_url: `${baseUrl}/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: baseUrl,
    });
    if (!session.url) throw new Error("Stripe returned a session without a URL.");
    url = session.url;
    expiresAt = session.expires_at; // unix seconds — Checkout links live 24h
  } catch (err) {
    logger.error("admin payment-link: Stripe session failed", { err: err instanceof Error ? err.message : String(err) });
    return NextResponse.json({ error: "Payment provider error. Please try again." }, { status: 502 });
  }

  // ── 4. Optionally email the customer ───────────────────────────────────────
  let emailSent = false;
  if (sendEmail) {
    try {
      const firstName = fullName.split(" ")[0] || "there";
      await resend.emails.send({
        from: "AeroPark Direct <bookings@aeroparkdirect.co.uk>",
        to: email,
        replyTo: "info@aeroparkdirect.co.uk",
        subject: `Complete your parking booking — £${price.toFixed(2)} (${bookingRef})`,
        html: buildPayLinkEmail({ firstName, url, price, bookingRef, airport, serviceType, dropDate, pickDate }),
      });
      emailSent = true;
    } catch (err) {
      logger.error("admin payment-link: email failed", { err: err instanceof Error ? err.message : String(err) });
      // Link still works — surface emailSent:false so the UI can warn.
    }
  }

  // ── 5. Audit ledger ─────────────────────────────────────────────────────────
  await logAdminAction({
    actionType: "payment_link.create",
    entityType: "booking",
    entityId: bookingRef,
    metadata: {
      label: `Payment link ${bookingRef}${fullName ? ` · ${fullName}` : ""}`,
      after: `£${price.toFixed(2)} · ${airport} · ${serviceType}${emailSent ? " · emailed" : ""}`,
    },
  });

  return NextResponse.json({ url, bookingRef, emailSent, expiresAt });
}

// ─── PAY-LINK EMAIL ───────────────────────────────────────────────────────────

function buildPayLinkEmail(p: {
  firstName: string; url: string; price: number; bookingRef: string;
  airport: string; serviceType: string; dropDate: string; pickDate: string;
}): string {
  return emailShell({
    title: "Complete your booking",
    kicker: `Booking ${p.bookingRef}`,
    heading: `${p.firstName}, your booking is ready to pay`,
    preheader: `Secure payment link for your ${p.airport} parking, £${p.price.toFixed(2)}.`,
    bodyHtml:
      emailSection(
        paragraph("We have prepared your parking reservation. Check the details below, then pay securely to confirm your space.") +
          detailTable([
            ["Reference", escMail(p.bookingRef)],
            ["Airport", escMail(p.airport)],
            ["Service", escMail(p.serviceType)],
            ["Drop-off", escMail(p.dropDate)],
            ["Pick-up", escMail(p.pickDate)],
            ["Total", `£${p.price.toFixed(2)}`],
          ])
      ) +
      emailSection(
        emailButton(p.url, `Pay £${p.price.toFixed(2)} securely`) +
          `<p style="margin:12px 0 0;font-family:${emailTokens.FONT};font-size:12px;line-height:1.6;color:${emailTokens.MUTED};">Payment is handled by Stripe. This link is valid for 24 hours. Questions? Reply to this email or contact info@aeroparkdirect.co.uk.</p>`
      ),
  });
}
