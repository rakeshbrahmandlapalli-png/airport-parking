// @ts-nocheck
import { NextResponse } from "next/server";
import Stripe from "stripe";
import { sendBookingReceipt, sendAmendmentAlerts, sendProviderNotification } from "@/app/lib/mail";
import { createClient } from "@supabase/supabase-js";
import { triggerMissingFlightAlert } from "@/app/lib/twilio";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);
const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET!;

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const ALLOWED_PARTNERS = ["APD", "24/7 Meet & Greet", "Airport Parking Bay"];

export async function POST(req: Request) {
  const body = await req.text();
  const signature = req.headers.get("stripe-signature")!;
  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(body, signature, endpointSecret);
  } catch (err: any) {
    console.error("Webhook signature verification failed:", err.message);
    return new NextResponse(`Webhook Error: ${err.message}`, { status: 400 });
  }

  const session = event.data.object as Stripe.Checkout.Session;

  if (event.type === "checkout.session.completed") {
    const m = session.metadata;

    try {
      if (m?.is_amendment === "true") {
        // ─── AMENDMENT ───────────────────────────────────────────────
        const { data: updatedBooking, error: amendErr } = await supabase
          .from("bookings")
          .update({
            pickup_date: m.new_pickup,
            total_price: session.amount_total ? session.amount_total / 100 : 0,
          })
          .eq("booking_ref", m.booking_ref)
          .select()
          .maybeSingle();

        if (amendErr) console.error("Amendment update error:", amendErr);

        if (updatedBooking) {
          const { data: comp } = await supabase
            .from("companies").select("*").eq("id", updatedBooking.company_id).maybeSingle();
          await sendAmendmentAlerts(updatedBooking, comp).catch((e) =>
            console.error("Amendment alerts failed:", e)
          );
        } else {
          console.warn("Amendment: no booking found for ref", m?.booking_ref);
        }
      } else {
        // ─── NEW BOOKING ─────────────────────────────────────────────

        // 1. Resolve company (by id, then by name)
        let resolvedCompany = null;
        if (m?.company_id && m.company_id !== "null" && m.company_id !== "") {
          const { data } = await supabase.from("companies").select("*").eq("id", m.company_id).maybeSingle();
          if (data) resolvedCompany = data;
        }
        if (!resolvedCompany && m?.provider_name) {
          const { data } = await supabase
            .from("companies").select("*").ilike("name", `%${m.provider_name}%`).limit(1).maybeSingle();
          if (data) resolvedCompany = data;
        }

        // 2. Build the row. Keep the ref we intend to write so we can detect
        //    whether THIS webhook won the insert race (for receipt de-dup).
        const myRef = m?.booking_ref || `APD-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
        const bookingData = {
          booking_ref: myRef,
          full_name: m?.full_name || "",
          email: m?.email || session.customer_details?.email || "",
          phone_number: m?.phone || session.customer_details?.phone || "",
          license_plate: m?.license_plate || "",
          car_make: m?.car_make || "",
          car_color: m?.car_color || "",
          airport: m?.airport || "Luton Airport (LTN)",
          terminal: m?.terminal || "Main Terminal",
          dropoff_date: m?.dropoff_date || new Date().toISOString(),
          pickup_date: m?.pickup_date || new Date().toISOString(),
          dropoff_time: m?.dropoff_time || "09:00",
          pickup_time: m?.pickup_time || "09:00",
          flight_number: m?.flight_number || "",
          service_type: m?.service_type || "Premium Meet & Greet",
          total_price: session.amount_total ? session.amount_total / 100 : 0, // server-verified by /api/checkout
          status: "confirmed",
          stripe_session_id: session.id,
          company_id: resolvedCompany ? resolvedCompany.id : null,
          promo_code: m?.promo_used || "None",
          fast_track_count: Number(m?.fast_track_count || 0),
        };

        // 3. UPSERT on stripe_session_id — never creates a duplicate even if the
        //    success page also writes. ignoreDuplicates = do nothing on conflict.
        const { error: upsertError } = await supabase
          .from("bookings")
          .upsert([bookingData], { onConflict: "stripe_session_id", ignoreDuplicates: true });
        if (upsertError) console.error("Webhook upsert error:", upsertError);

        // 4. Re-read the authoritative row (ours OR the success page's — whoever won)
        const { data: newBooking } = await supabase
          .from("bookings").select("*").eq("stripe_session_id", session.id).maybeSingle();

        if (newBooking) {
          // Did THIS webhook create the row? (its ref will match what we tried to insert)
          const webhookWon = newBooking.booking_ref === myRef;

          // 4a. Customer receipt — send only if the webhook won the race, so the
          //     customer never gets two receipts (the success page sends it otherwise).
          if (webhookWon) {
            sendBookingReceipt(newBooking, resolvedCompany).catch((err) =>
              console.error("Customer Email Failed:", err)
            );
          }

          // 4b. Provider notification — ALWAYS send (webhook is the only sender),
          //     regardless of who won the insert race.
          if (resolvedCompany && ALLOWED_PARTNERS.includes(resolvedCompany.name)) {
            sendProviderNotification(newBooking, resolvedCompany).catch((err) =>
              console.error("Provider Email Failed:", err)
            );
          }

          // 4c. Twilio alert — ALWAYS send (webhook-only).
          const TWILIO_ENABLED = false; // flip to true in July
          triggerMissingFlightAlert({
            full_name: newBooking.full_name,
            phone_number: newBooking.phone_number,
            booking_ref: newBooking.booking_ref,
            flight_number: newBooking.flight_number,
            car_make: newBooking.car_make,
          }).catch((err) => console.error("Twilio Trigger Failed:", err));
        } else {
          console.error("Webhook: could not read booking after upsert for session", session.id);
        }
      }
    } catch (dbError: any) {
      console.error("❌ FATAL WEBHOOK CRASH:", dbError.message);
    }
  }

  return new NextResponse(null, { status: 200 });
}