import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import { checkGoogleAdsSetup } from "@/app/lib/googleAds";

// ============================================================================
// /api/admin/google-ads-check — admin-only diagnostic for the offline
// conversion pipeline. Confirms env vars, OAuth, developer-token access and the
// conversion action WITHOUT needing a test booking. Returns booleans + Google's
// own error text only — never any secret values.
// ============================================================================

/** Resolve the logged-in admin from the request's session cookie. */
async function requireAdmin(): Promise<boolean> {
  try {
    const cookieStore = await cookies();
    const supa = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      { cookies: { getAll: () => cookieStore.getAll(), setAll: () => {} } }
    );
    const { data: { user } } = await supa.auth.getUser();
    return !!user;
  } catch {
    return false;
  }
}

export async function GET() {
  if (!(await requireAdmin())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const result = await checkGoogleAdsSetup();
  return NextResponse.json(result);
}
