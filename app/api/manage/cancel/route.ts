import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { rateLimit, getClientIp } from "@/app/lib/rateLimit";
import { sendCancellationAlerts } from "@/app/lib/mail";
import { logger } from "@/app/lib/logger";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

/** The window promised on the About page: free cancellation up to 24h before
 *  drop-off. Enforced here as well as in the UI, because a button that is
 *  merely hidden is not a rule. */
const FREE_WINDOW_HOURS = 24;

/** Drop-off as a real moment, parsed the same way the manage page does it:
 *  the date is a plain YYYY-MM-DD and must be read as local, or a midnight
 *  booking shifts a day and the window is computed against the wrong date. */
function dropoffMoment(booking: any): Date | null {
  const raw = String(booking?.dropoff_date || "").split("T")[0];
  const [y, m, d] = raw.split("-").map(Number);
  if (!y || !m || !d) return null;
  const [hh, mm] = String(booking?.dropoff_time || "00:00").split(":").map(Number);
  return new Date(y, m - 1, d, hh || 0, mm || 0, 0, 0);
}

export async function POST(req: Request) {
  // Cancelling is destructive and low-frequency. Tighter than lookup.
  const ip = getClientIp(req);
  const rl = rateLimit(`manage-cancel:${ip}`, 5, 60_000);
  if (!rl.ok) {
    return NextResponse.json(
      { error: "Too many attempts. Please wait a minute and try again." },
      { status: 429, headers: { "Retry-After": String(rl.retryAfterSec) } }
    );
  }

  let body: any;
  try { body = await req.json(); }
  catch { return NextResponse.json({ error: "Invalid request." }, { status: 400 }); }

  const ref = String(body?.ref || "").toUpperCase().trim();
  const fullName = String(body?.fullName || "").trim();

  // Same proof of ownership as the lookup: reference AND name. A reference on
  // its own is guessable, and cancelling someone else's parking is a far worse
  // outcome than making them type their name.
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

    // Generic, exactly as lookup does — never reveal which half was wrong.
    if (!booking) {
      return NextResponse.json(
        { error: "Reservation not found. Please check your details and try again." },
        { status: 404 }
      );
    }

    // Already done. Answer as a success so a double-click or a refresh does not
    // look like a failure to someone who is already anxious about their money.
    if (String(booking.status || "").toLowerCase() === "cancelled") {
      return NextResponse.json({ booking, alreadyCancelled: true });
    }

    // Cancelling is ALWAYS allowed. An earlier version refused inside the
    // 24-hour window and told the customer to phone instead — which is exactly
    // the dead end that produced a Letter Before Action: a broken cancel route
    // plus a phone nobody answered. Someone who wants to cancel must always be
    // able to, whatever it means for the refund.
    //
    // The window now decides the MONEY, not the ability. Outside it the refund
    // is automatic and promised; inside it the booking still cancels but the
    // refund is reviewed, and the customer is told so plainly rather than
    // being blocked.
    const drop = dropoffMoment(booking);
    const hoursLeft = drop ? (drop.getTime() - Date.now()) / 3_600_000 : null;
    const insideWindow = hoursLeft !== null && hoursLeft < FREE_WINDOW_HOURS;

    // Only `status`, matching what the admin dashboard writes. A timestamp
    // column would be useful here, but writing to one that does not exist would
    // fail the whole update and leave the customer unable to cancel at all —
    // which is precisely the bug this route exists to fix. The LOG of when it
    // happened lives in the email trail until a column is added deliberately.
    const { data: updated, error: upErr } = await supabaseAdmin
      .from("bookings")
      .update({ status: "cancelled" })
      .eq("id", booking.id)
      .select("*")
      .maybeSingle();

    if (upErr) throw upErr;

    let company = null;
    if (booking.company_id) {
      const { data: c } = await supabaseAdmin
        .from("companies").select("*").eq("id", booking.company_id).maybeSingle();
      company = c || null;
    }

    // The refund itself is deliberately NOT automatic. It goes through Stripe by
    // hand so a person sees every one. But the customer is told that plainly on
    // the confirmation, and three people are emailed so it cannot be missed:
    // the customer, the office, and the OPERATOR — who is holding a space and a
    // slot for a car that is no longer coming.
    await sendCancellationAlerts(updated || booking, company, { insideWindow });

    return NextResponse.json({ booking: updated || booking, insideWindow });
  } catch (err) {
    logger.error("Cancellation failed:", err);
    return NextResponse.json(
      { error: "We couldn't cancel the booking just now. Please email info@aeroparkdirect.co.uk and we will do it for you." },
      { status: 500 }
    );
  }
}
