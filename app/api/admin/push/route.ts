import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { getAdminUser } from "@/app/lib/adminAuth";

// Turn new-booking notifications on (POST) or off (DELETE) for this device.
// Admin only. Rows are written with the service role; the table has no
// public access.

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false, autoRefreshToken: false } }
);

// A push endpoint is an https URL on the browser vendor's push service.
const isEndpoint = (v: unknown) => typeof v === "string" && /^https:\/\/\S{10,2000}$/.test(v);
const isKey = (v: unknown) => typeof v === "string" && /^[A-Za-z0-9_\-=]{8,512}$/.test(v);

export async function POST(req: Request) {
  const admin = await getAdminUser(req);
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let body: { subscription?: { endpoint?: unknown; keys?: { p256dh?: unknown; auth?: unknown } } };
  try { body = await req.json(); } catch { return NextResponse.json({ error: "Invalid request." }, { status: 400 }); }
  const s = body?.subscription;
  if (!isEndpoint(s?.endpoint) || !isKey(s?.keys?.p256dh) || !isKey(s?.keys?.auth)) {
    return NextResponse.json({ error: "Invalid subscription." }, { status: 400 });
  }

  const { error } = await supabaseAdmin.from("admin_push_subscriptions").upsert(
    [{
      endpoint: s!.endpoint as string,
      p256dh: s!.keys!.p256dh as string,
      auth: s!.keys!.auth as string,
      user_id: admin.id,
      user_email: admin.email ?? null,
      user_agent: (req.headers.get("user-agent") || "").slice(0, 300),
    }],
    { onConflict: "endpoint" },
  );
  if (error) return NextResponse.json({ error: "Could not save this device." }, { status: 500 });
  return NextResponse.json({ ok: true });
}

export async function DELETE(req: Request) {
  const admin = await getAdminUser(req);
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let body: { endpoint?: unknown };
  try { body = await req.json(); } catch { return NextResponse.json({ error: "Invalid request." }, { status: 400 }); }
  if (!isEndpoint(body?.endpoint)) return NextResponse.json({ error: "Invalid request." }, { status: 400 });

  await supabaseAdmin.from("admin_push_subscriptions").delete().eq("endpoint", body.endpoint as string);
  return NextResponse.json({ ok: true });
}
