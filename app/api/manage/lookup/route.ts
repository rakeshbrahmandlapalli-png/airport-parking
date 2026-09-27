import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { rateLimit, getClientIp } from "@/app/lib/rateLimit";
import { findOwnedBooking, isInsideFreeWindow, publicBooking, publicCompany } from "@/app/lib/manageBooking";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: Request) {
  // Tight limit — looking up bookings is a sensitive, low-frequency action.
  const ip = getClientIp(req);
  const rl = rateLimit(`manage-lookup:${ip}`, 10, 60_000);
  if (!rl.ok) {
    return NextResponse.json(
      { error: "Too many attempts. Please wait a minute and try again." },
      { status: 429, headers: { "Retry-After": String(rl.retryAfterSec) } }
    );
  }

  let body: any;
  try { body = await req.json(); } catch { return NextResponse.json({ error: "Invalid request." }, { status: 400 }); }

  const ref = String(body?.ref || "").toUpperCase().trim();
  const fullName = String(body?.fullName || "").trim();

  // Require BOTH the reference AND the name — proof of ownership. This stops
  // anyone enumerating bookings by name alone or by guessing references.
  if (!ref || fullName.length < 2) {
    return NextResponse.json(
      { error: "Please enter both your booking reference and the lead passenger name." },
      { status: 400 }
    );
  }

  try {
    const booking = await findOwnedBooking(supabaseAdmin, ref, fullName);

    if (!booking) {
      return NextResponse.json({ error: "Reservation not found. Please check your details and try again." }, { status: 404 });
    }

    let company = null;
    if (booking.company_id) {
      const { data: c } = await supabaseAdmin
        .from("companies")
        .select("name, phone_number, phone_number_2, on_arrival, on_arrival_ltn, on_arrival_lhr, on_return, on_return_ltn, on_return_lhr")
        .eq("id", booking.company_id)
        .maybeSingle();
      company = c || null;
    }

    // Only what the page shows. insideFreeWindow lets the cancel page say what
    // will happen to the money BEFORE the customer confirms.
    return NextResponse.json({
      booking: publicBooking(booking),
      company: publicCompany(company),
      insideFreeWindow: isInsideFreeWindow(booking),
    });
  } catch {
    return NextResponse.json({ error: "We couldn't reach the booking service. Please try again." }, { status: 500 });
  }
}
