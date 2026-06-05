import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { rateLimit, getClientIp } from "@/app/lib/rateLimit";

// Service-role client — server-only. Lets us return an aggregate count
// WITHOUT exposing the bookings table to the public anon key.
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(req: Request) {
  const ip = getClientIp(req);
  const rl = rateLimit(`booking-count:${ip}`, 60, 60_000);
  if (!rl.ok) {
    return NextResponse.json({ count: 0 }, { status: 429, headers: { "Retry-After": String(rl.retryAfterSec) } });
  }

  try {
    const { count } = await supabaseAdmin
      .from("bookings")
      .select("*", { count: "exact", head: true })
      .neq("status", "cancelled");

    return NextResponse.json(
      { count: count || 0 },
      { headers: { "Cache-Control": "public, max-age=15, s-maxage=15" } }
    );
  } catch {
    // Never leak internals; just return a safe zero.
    return NextResponse.json({ count: 0 });
  }
}
