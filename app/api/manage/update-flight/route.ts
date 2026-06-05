import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { rateLimit, getClientIp } from "@/app/lib/rateLimit";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: Request) {
  const ip = getClientIp(req);
  const rl = rateLimit(`manage-update:${ip}`, 15, 60_000);
  if (!rl.ok) {
    return NextResponse.json(
      { error: "Too many requests. Please wait a moment." },
      { status: 429, headers: { "Retry-After": String(rl.retryAfterSec) } }
    );
  }

  let body: any;
  try { body = await req.json(); } catch { return NextResponse.json({ error: "Invalid request." }, { status: 400 }); }

  const ref = String(body?.ref || "").toUpperCase().trim();
  const fullName = String(body?.fullName || "").trim();
  const flightNumber = String(body?.flightNumber || "").toUpperCase().trim().slice(0, 12);

  if (!ref || fullName.length < 2) {
    return NextResponse.json({ error: "Verification details missing." }, { status: 400 });
  }
  // Allow letters, digits, spaces and hyphens only — never let arbitrary input through.
  if (flightNumber && !/^[A-Z0-9 \-]{2,12}$/.test(flightNumber)) {
    return NextResponse.json({ error: "Please enter a valid flight number." }, { status: 400 });
  }

  try {
    // Re-verify ownership (ref + name) before mutating anything.
    const { data: match } = await supabaseAdmin
      .from("bookings")
      .select("id")
      .eq("booking_ref", ref)
      .ilike("full_name", `%${fullName}%`)
      .limit(1)
      .maybeSingle();

    if (!match) {
      return NextResponse.json({ error: "Reservation not found." }, { status: 404 });
    }

    const { error } = await supabaseAdmin
      .from("bookings")
      .update({ flight_number: flightNumber })
      .eq("id", match.id);

    if (error) throw error;
    return NextResponse.json({ success: true, flightNumber });
  } catch {
    return NextResponse.json({ error: "Could not update your flight. Please try again." }, { status: 500 });
  }
}
