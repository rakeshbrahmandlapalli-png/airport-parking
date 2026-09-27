import { NextResponse } from "next/server";
import { getAdminUser } from "@/app/lib/adminAuth";
import { checkGoogleAdsSetup } from "@/app/lib/googleAds";

// ============================================================================
// /api/admin/google-ads-check — admin-only diagnostic for the offline
// conversion pipeline. Confirms env vars, OAuth, developer-token access and the
// conversion action WITHOUT needing a test booking. Returns booleans + Google's
// own error text only — never any secret values.
// ============================================================================

export async function GET(req: Request) {
  if (!(await getAdminUser(req))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const result = await checkGoogleAdsSetup();
  return NextResponse.json(result);
}
