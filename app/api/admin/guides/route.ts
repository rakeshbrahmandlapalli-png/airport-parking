import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { createClient } from "@supabase/supabase-js";
import { getAdminUser } from "@/app/lib/adminAuth";

// Admin-only CRUD for guides (/admin/guides). The table's RLS lets the public
// read published guides only; everything here uses the service role after an
// admin check, then refreshes the public pages so changes show straight away.
// The admin page records each change in the Activity log (audit-client).

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false, autoRefreshToken: false } }
);

const SLUG = /^[a-z0-9]+(-[a-z0-9]+)*$/;

function refreshPublicPages(slugs: string[]) {
  revalidatePath("/guides");
  revalidatePath("/sitemap.xml");
  for (const s of slugs) if (s) revalidatePath(`/guides/${s}`);
}

export async function GET(req: Request) {
  if (!(await getAdminUser(req))) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { data, error } = await supabase
    .from("guides")
    .select("id, slug, title, summary, body, airport, status, published_at, updated_at")
    .order("updated_at", { ascending: false });
  if (error) return NextResponse.json({ error: "Could not load guides." }, { status: 500 });
  return NextResponse.json({ guides: data || [] });
}

export async function POST(req: Request) {
  const admin = await getAdminUser(req);
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let b: Record<string, unknown>;
  try { b = await req.json(); } catch { return NextResponse.json({ error: "Bad request." }, { status: 400 }); }

  const id = typeof b.id === "string" && b.id ? b.id : null;
  const title = String(b.title || "").trim();
  const slug = String(b.slug || "").trim().toLowerCase();
  const summary = String(b.summary || "").trim();
  const body = String(b.body || "");
  const airport = b.airport === "LTN" || b.airport === "LHR" ? b.airport : null;
  const status = b.status === "published" ? "published" : "draft";

  if (title.length < 3 || title.length > 120) return NextResponse.json({ error: "The title needs 3 to 120 characters." }, { status: 400 });
  if (!SLUG.test(slug) || slug.length > 90) return NextResponse.json({ error: "The web address can only use lower-case letters, numbers and single dashes." }, { status: 400 });
  if (summary.length > 300) return NextResponse.json({ error: "The summary can be at most 300 characters." }, { status: 400 });
  if (status === "published" && body.trim().length < 200) return NextResponse.json({ error: "Write at least a few paragraphs before publishing." }, { status: 400 });

  let previous: { slug: string; status: string; published_at: string | null } | null = null;
  if (id) {
    const { data } = await supabase.from("guides").select("slug, status, published_at").eq("id", id).maybeSingle();
    previous = data;
  }

  const row = {
    title, slug, summary, body, airport, status,
    published_at: status === "published" ? (previous?.published_at || new Date().toISOString()) : previous?.published_at ?? null,
    updated_at: new Date().toISOString(),
    updated_by: admin.email ?? null,
  };

  const q = id
    ? supabase.from("guides").update(row).eq("id", id).select("*").single()
    : supabase.from("guides").insert(row).select("*").single();
  const { data, error } = await q;
  if (error) {
    const taken = error.code === "23505";
    return NextResponse.json({ error: taken ? "Another guide already uses that web address." : "Could not save the guide." }, { status: taken ? 409 : 500 });
  }

  refreshPublicPages([slug, previous?.slug || ""]);
  return NextResponse.json({ guide: data });
}

export async function DELETE(req: Request) {
  const admin = await getAdminUser(req);
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const id = new URL(req.url).searchParams.get("id");
  if (!id) return NextResponse.json({ error: "Missing id." }, { status: 400 });
  const { data } = await supabase.from("guides").select("slug, title").eq("id", id).maybeSingle();
  const { error } = await supabase.from("guides").delete().eq("id", id);
  if (error) return NextResponse.json({ error: "Could not delete the guide." }, { status: 500 });
  refreshPublicPages([data?.slug || ""]);
  return NextResponse.json({ ok: true });
}
