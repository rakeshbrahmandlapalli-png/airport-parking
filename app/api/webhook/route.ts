// app/api/webhooks/stripe/route.ts - UPDATED with VIP Email Intercept

import { NextResponse } from "next/server";
import Stripe from "stripe";
import { sendBookingReceipt, sendAmendmentAlerts, sendProviderNotification } from "@/app/lib/mail";
import { createClient } from "@supabase/supabase-js";
import { triggerMissingFlightAlert } from "@/app/lib/twilio";
import { Resend } from "resend";
import { reportOfflineConversion } from "@/app/lib/googleAds";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);
const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET!;
const resend = new Resend(process.env.RESEND_API_KEY!);

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// 🟢 Allowed partners who receive automated booking assignments
const ALLOWED_PARTNERS = ["APD", "24/7 Meet & Greet", "Airport Parking Bay", "APD Exclusive"];

/**
 * 🟢 Idempotency gate - prevents duplicate processing
 * Returns true if NEW (first time), false if DUPLICATE (already seen)
 */
async function claimEvent(eventId: string, type: string): Promise<boolean> {
  try {
    const { error } = await supabase
      .from("processed_stripe_events")
      .insert([{ event_id: eventId, type }]);

    if (!error) return true; // NEW event

    // DUPLICATE (unique constraint)
    if ((error as any).code === "23505") {
      console.log(`[WEBHOOK] Duplicate Stripe event ${eventId} — skipping.`);
      return false;
    }

    // Other errors — fail OPEN (trust event)
    console.error("[WEBHOOK] claimEvent insert error (failing open):", error);
    return true;
  } catch (e) {
    console.error("[WEBHOOK] claimEvent threw (failing open):", e);
    return true;
  }
}

export async function POST(req: Request) {
  const body = await req.text();
  const signature = req.headers.get("stripe-signature");

  if (!signature) {
    return new NextResponse("Missing stripe-signature header", { status: 400 });
  }

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(body, signature, endpointSecret);
  } catch (err: any) {
    console.error("[WEBHOOK] Signature verification failed:", err.message);
    return new NextResponse(`Webhook Error: ${err.message}`, { status: 400 });
  }

  // 🟢 ONLY process checkout.session.completed
  if (event.type !== "checkout.session.completed") {
    return new NextResponse(null, { status: 200 });
  }

  // 🟢 IDEMPOTENCY: Gate before any processing
  const isFirstTime = await claimEvent(event.id, event.type);
  if (!isFirstTime) {
    console.log(`[WEBHOOK] Idempotency: skipping duplicate event ${event.id}`);
    return new NextResponse(null, { status: 200 });
  }

  const session = event.data.object as Stripe.Checkout.Session;
  const m = session.metadata ?? {};

  try {
    if (m.is_amendment === "true") {
      // ─── AMENDMENT FLOW ───────────────────────────────────────────
      console.log(`[WEBHOOK] Processing amendment for ${m.booking_ref}`);

      const oldTotal = Number(m.old_total) || 0;
      const extraCharged = Number(m.extra_charged) || 0;
      const newTotal = Math.round((oldTotal + extraCharged) * 100) / 100;

      const updatePayload: Record<string, any> = { total_price: newTotal };
      if (m.new_pickup) updatePayload.pickup_date = m.new_pickup;

      const { data: updatedBooking, error: amendErr } = await supabase
        .from("bookings")
        .update(updatePayload)
        .eq("booking_ref", m.booking_ref)
        .select()
        .maybeSingle();

      if (amendErr) {
        console.error(`[WEBHOOK] Amendment update failed for ${m.booking_ref}:`, amendErr);
      }

      if (updatedBooking) {
        const { data: comp } = await supabase
          .from("companies").select("*").eq("id", updatedBooking.company_id).maybeSingle();
        
        await sendAmendmentAlerts(updatedBooking, comp).catch((e) =>
          console.error("[WEBHOOK] Amendment alerts failed:", e)
        );
        console.log(`[WEBHOOK] Amendment processed for ${m.booking_ref}: £${newTotal}`);
      } else {
        console.warn(`[WEBHOOK] Amendment: no booking found for ref ${m.booking_ref}`);
      }
    } else {
      // ─── NEW BOOKING FLOW ─────────────────────────────────────────
      console.log(`[WEBHOOK] Processing new booking for session ${session.id}`);

      let resolvedCompany: any = null;
      if (m.company_id && m.company_id !== "null" && m.company_id !== "") {
        const { data } = await supabase
          .from("companies").select("*").eq("id", m.company_id).maybeSingle();
        if (data) resolvedCompany = data;
      }

      if (!resolvedCompany && m.provider_name) {
        const { data } = await supabase
          .from("companies").select("*").ilike("name", `%${m.provider_name}%`).maybeSingle();
        if (data) resolvedCompany = data;
      }

      const myRef = m.booking_ref || `APD-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;

      const bookingData = {
        booking_ref: myRef,
        full_name: m.full_name || "",
        email: m.email || session.customer_details?.email || "",
        phone_number: m.phone || session.customer_details?.phone || "",
        license_plate: m.license_plate || "",
        car_make: m.car_make || "",
        car_color: m.car_color || "",
        airport: m.airport || "Luton Airport (LTN)",
        terminal: m.terminal || "Main Terminal",
        dropoff_date: m.dropoff_date || new Date().toISOString(),
        pickup_date: m.pickup_date || new Date().toISOString(),
        dropoff_time: m.dropoff_time || "09:00",
        pickup_time: m.pickup_time || "09:00",
        flight_number: m.flight_number || "",
        service_type: m.service_type || "Premium Meet & Greet",
        total_price: session.amount_total ? session.amount_total / 100 : 0,
        status: "confirmed",
        stripe_session_id: session.id,
        company_id: resolvedCompany ? resolvedCompany.id : null,
        promo_code: m.promo_used || "None",
        fast_track_count: Number(m.fast_track_count || 0),
        gclid: m.gclid || null,
      };

      const { error: upsertError } = await supabase
        .from("bookings")
        .upsert([bookingData], { onConflict: "stripe_session_id", ignoreDuplicates: true });

      if (upsertError) {
        console.error(`❌ [WEBHOOK] BOOKING WRITE FAILED for ${session.id} (RLS / service-role issue):`, upsertError);
      } else {
        console.log(`✅ [WEBHOOK] Booking written to DB — service role bypassed RLS for session ${session.id}`);
      }

      const { data: newBooking } = await supabase
        .from("bookings").select("*").eq("stripe_session_id", session.id).maybeSingle();

      if (newBooking) {
        const webhookWon = newBooking.booking_ref === myRef;

        // 🟢 VIP CONCIERGE INTERCEPT LOGIC
        const isExclusive = newBooking.service_type?.toLowerCase().includes('exclusive') || resolvedCompany?.name?.toLowerCase().includes('exclusive');

        if (webhookWon) {
          if (isExclusive) {
            // Send the holding email for VIPs (no instructions yet)
            await resend.emails.send({
              from: 'AeroPark Direct <bookings@aeroparkdirect.co.uk>',
              to: newBooking.email,
              subject: `Booking Confirmed: AeroPark Direct Exclusive 👑`,
              html: `
                <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; color: #333;">
                  <h2 style="color: #2563eb;">Booking Confirmed: AeroPark Exclusive</h2>
                  <p>Dear ${newBooking.full_name},</p>
                  <p>Thank you for choosing the VIP standard! We have successfully received your booking and payment of <strong>£${newBooking.total_price}</strong>.</p>
                  <div style="background: #f8fafc; padding: 20px; border-radius: 8px; margin: 20px 0; border: 1px solid #e2e8f0;">
                    <h3 style="margin-top: 0;">What happens next?</h3>
                    <p>Our concierge team is currently matching your vehicle with one of our top-rated, fully-vetted parking partners for your dates.</p>
                    <p>We will email and text you your dedicated VIP driver's contact number and exact terminal meeting point <strong>24 hours before your flight</strong>.</p>
                    <p>Rest assured, your airport barrier and drop-off fees are fully covered by us!</p>
                  </div>
                  <p><strong>Booking Reference:</strong> ${newBooking.booking_ref}</p>
                </div>
              `
            }).catch((err) => console.error("[WEBHOOK] VIP Customer Email Failed:", err));
            console.log(`[WEBHOOK] Sent VIP holding email to customer for ${newBooking.booking_ref}`);
          } else {
            // Send standard receipt with immediate instructions
            await sendBookingReceipt(newBooking, resolvedCompany).catch((err) =>
              console.error("[WEBHOOK] Standard Customer Email Failed:", err)
            );
          }
        }

        // 🟢 PROVIDER NOTIFICATION CHECK
        // If it's an exclusive booking, we DO NOT send an automated provider email because
        // we haven't manually assigned the job yet.
        if (resolvedCompany && !isExclusive && ALLOWED_PARTNERS.includes(resolvedCompany.name)) {
          await sendProviderNotification(newBooking, resolvedCompany).catch((err) =>
            console.error("[WEBHOOK] Provider Email Failed:", err)
          );
          console.log(`[WEBHOOK] Provider notified: ${resolvedCompany.name}`);
        }

        // 🟢 Twilio gate (set to true in July when live)
        const TWILIO_ENABLED = false;
        if (TWILIO_ENABLED) {
          await triggerMissingFlightAlert({
            full_name: newBooking.full_name,
            phone_number: newBooking.phone_number,
            booking_ref: newBooking.booking_ref,
            flight_number: newBooking.flight_number,
            car_make: newBooking.car_make,
          }).catch((err) => console.error("[WEBHOOK] Twilio Trigger Failed:", err));
        }

        // 🟢 Server-side Google Ads conversion — fires for EVERY paid booking,
        // even if the shopper never returned to /success or blocks the tag.
        // Uses Stripe session id as orderId so it dedupes with the client-side
        // conversion (which also passes session id as transaction_id).
        if (m.gclid) {
          await reportOfflineConversion({
            gclid: m.gclid,
            value: Number(newBooking.total_price) || 0,
            currency: "GBP",
            orderId: session.id,
          }).catch((err) => console.error("[WEBHOOK] Google Ads conversion failed:", err));
        }

        console.log(`[WEBHOOK] Booking created: ${newBooking.booking_ref} (£${newBooking.total_price})`);
      } else {
        console.error(`[WEBHOOK] Failed to read booking after upsert for session ${session.id}`);
      }
    }
  } catch (dbError: any) {
    // 🟢 FATAL: Still return 200 so Stripe doesn't retry
    console.error("[WEBHOOK] FATAL ERROR:", dbError?.message || dbError);
  }

  return new NextResponse(null, { status: 200 });
}