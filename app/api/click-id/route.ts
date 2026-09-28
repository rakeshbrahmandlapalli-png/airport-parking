import { type NextRequest, NextResponse } from "next/server";

// ─────────────────────────────────────────────────────────────────────────────
// Stores the Google Ads click id (gclid / wbraid / gbraid) in a cookie set by
// the server. components/GclidCapture.tsx also sets it from the browser, but
// Safari deletes script-set cookies after 24 hours when the visitor arrived
// from an ad link, so anyone who clicked an ad and booked the next day reached
// checkout without it and the sale couldn't be credited to the ad. Cookies set
// in a server response keep their full 90 days.
//
// Only the click id is stored: it identifies the ad click, not the person.
// ─────────────────────────────────────────────────────────────────────────────

const KEYS = ["gclid", "wbraid", "gbraid"] as const;
const MAX_AGE = 60 * 60 * 24 * 90; // Google accepts conversions up to 90 days after the click
const VALID = /^[A-Za-z0-9_\-.~]{10,300}$/;

export async function POST(req: NextRequest) {
  let body: Record<string, unknown> = {};
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false }, { status: 400 });
  }

  const res = NextResponse.json({ ok: true });
  let stored = 0;
  for (const key of KEYS) {
    const value = typeof body[key] === "string" ? (body[key] as string).trim() : "";
    if (!VALID.test(value)) continue;
    res.cookies.set({
      name: `ap_${key}`,
      value,
      path: "/",
      maxAge: MAX_AGE,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      // Read by the checkout page (app/checkout/page.tsx), so not httpOnly.
      httpOnly: false,
    });
    stored++;
  }
  return stored ? res : NextResponse.json({ ok: false }, { status: 400 });
}
