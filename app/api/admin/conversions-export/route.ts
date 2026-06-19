import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { getAdminUser } from "@/app/lib/adminAuth";

// ─────────────────────────────────────────────────────────────────────────────
// Admin-only export of paid bookings as a Google Ads "Conversions from clicks"
// CSV. Upload it at Google Ads → Goals → Conversions → Uploads. Because it keys
// on the stored gclid, it records every booking that came from an ad regardless
// of cookie consent — no API/developer token required.
//
//   GET /api/admin/conversions-export?days=90&name=Native%20Stripe%20Purchase
// ─────────────────────────────────────────────────────────────────────────────

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const DEFAULT_CONVERSION_NAME = "Native Stripe Purchase";
const TIMEZONE = "Europe/London";

function csvField(v: string): string {
  return /[",\n\r]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v;
}

// yyyy-MM-dd HH:mm:ss in the TimeZone declared on the Parameters line.
function formatConversionTime(d: Date): string {
  const p = new Intl.DateTimeFormat("en-GB", {
    timeZone: TIMEZONE,
    year: "numeric", month: "2-digit", day: "2-digit",
    hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false,
  }).formatToParts(d).reduce<Record<string, string>>((acc, part) => {
    acc[part.type] = part.value;
    return acc;
  }, {});
  return `${p.year}-${p.month}-${p.day} ${p.hour}:${p.minute}:${p.second}`;
}

export async function GET(req: Request) {
  const admin = await getAdminUser(req);
  if (!admin) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const url = new URL(req.url);
  const conversionName = (url.searchParams.get("name") || DEFAULT_CONVERSION_NAME).trim() || DEFAULT_CONVERSION_NAME;
  // Google accepts click conversions up to 90 days after the click.
  const days = Math.min(90, Math.max(1, Number(url.searchParams.get("days")) || 90));
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();

  const { data, error } = await supabase
    .from("bookings")
    .select("gclid, created_at, total_price, status")
    .not("gclid", "is", null)
    .neq("status", "pending")
    .gte("created_at", since)
    .order("created_at", { ascending: false });

  if (error) {
    return NextResponse.json({ error: "Could not load bookings." }, { status: 500 });
  }

  const rows = (data || []).filter((b) => String(b.gclid || "").trim().length > 0);

  const lines: string[] = [];
  lines.push(`Parameters:TimeZone=${TIMEZONE}`);
  lines.push("Google Click ID,Conversion Name,Conversion Time,Conversion Value,Conversion Currency");
  for (const b of rows) {
    lines.push([
      csvField(String(b.gclid).trim()),
      csvField(conversionName),
      csvField(formatConversionTime(new Date(b.created_at))),
      (Number(b.total_price) || 0).toFixed(2),
      "GBP",
    ].join(","));
  }

  const csv = lines.join("\r\n") + "\r\n";
  const filename = `aeropark-conversions-${new Date().toISOString().slice(0, 10)}.csv`;

  return new NextResponse(csv, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "no-store",
    },
  });
}
