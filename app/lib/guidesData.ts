import "server-only";
import { createClient } from "@supabase/supabase-js";
import type { Guide } from "@/app/lib/guides";

// Public reads of published guides (anon key; RLS only returns published rows).
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  { auth: { persistSession: false, autoRefreshToken: false } }
);

const COLUMNS = "id, slug, title, summary, body, airport, status, published_at, updated_at";

export async function listPublishedGuides(): Promise<Guide[]> {
  const { data } = await supabase
    .from("guides")
    .select(COLUMNS)
    .eq("status", "published")
    .order("published_at", { ascending: false });
  return (data as Guide[]) || [];
}

export async function getPublishedGuide(slug: string): Promise<Guide | null> {
  const { data } = await supabase
    .from("guides")
    .select(COLUMNS)
    .eq("status", "published")
    .eq("slug", slug)
    .maybeSingle();
  return (data as Guide) || null;
}
