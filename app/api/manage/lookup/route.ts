import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { rateLimit, getClientIp } from "@/app/lib/rateLimit";

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
    const { data: rows, error } = await supabaseAdmin
      .from("bookings")
      .select("*")
      .eq("booking_ref", ref)
      .ilike("full_name", `%${fullName}%`)
      .order("created_at", { ascending: false })
      .limit(1);

    if (error) throw error;
    const booking = rows && rows.length ? rows[0] : null;

    // Generic message — never reveal whether the ref or the name was the mismatch.
    if (!booking) {
      return NextResponse.json({ error: "Reservation not found. Please check your details and try again." }, { status: 404 });
    }

    let company = null;
    if (booking.company_id) {
      const { data: c } = await supabaseAdmin
        .from("companies")
        .select("*")
        .eq("id", booking.company_id)
        .maybeSingle();
      company = c || null;
    }

    return NextResponse.json({ booking, company });
  } catch {
    return NextResponse.json({ error: "We couldn't reach the booking service. Please try again." }, { status: 500 });
  }
}
