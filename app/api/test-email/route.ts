import { NextResponse } from "next/server";

// This route was a development-only email tester. It is intentionally disabled
// in production: it previously allowed anyone to trigger emails and leaked a
// personal address + dispatch phone numbers in source. To re-enable for local
// debugging, set ALLOW_TEST_EMAIL=true in your local environment only.
export async function GET() {
  if (process.env.ALLOW_TEST_EMAIL !== "true") {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  return NextResponse.json({ ok: true, message: "Test email route enabled (local only)." });
}
