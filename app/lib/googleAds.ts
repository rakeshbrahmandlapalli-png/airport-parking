import { logger } from "@/app/lib/logger";
// app/lib/googleAds.ts
//
// Server-side Google Ads offline conversion upload (Click Conversions).
// Called from the Stripe webhook so EVERY paid booking reports a conversion —
// immune to ad-blockers, Safari ITP, and shoppers who never return to /success.
//
// Requires these env vars (all optional — if any are missing the upload is a
// graceful no-op, so the webhook never fails because of tracking):
//   GOOGLE_ADS_DEVELOPER_TOKEN      developer token from your Google Ads API centre
//   GOOGLE_ADS_CLIENT_ID            OAuth2 client id
//   GOOGLE_ADS_CLIENT_SECRET        OAuth2 client secret
//   GOOGLE_ADS_REFRESH_TOKEN        OAuth2 refresh token (offline access)
//   GOOGLE_ADS_CUSTOMER_ID          target account id, digits only (no dashes)
//   GOOGLE_ADS_CONVERSION_ACTION_ID numeric id of the conversion action to fill
//   GOOGLE_ADS_LOGIN_CUSTOMER_ID    (optional) MCC/manager id, digits only
//   GOOGLE_ADS_API_VERSION          (optional) e.g. "v23" — override when Google
//                                   ships a new version, no code change needed.
//
// NOTE: GOOGLE_ADS_CONVERSION_ACTION_ID is the numeric conversion *action* id
// (Tools → Conversions → click the action → the number in the URL). It is NOT
// the gtag label ("lAsCCJO-0LYcEIDbntVD") used on the client side.

// Google Ads REST API version (major version only, used in the URL path).
// Default tracks the current supported version (v23 as of mid-2026); Google
// sunsets old versions ~yearly, so set GOOGLE_ADS_API_VERSION in the env to bump
// it without redeploying code. https://developers.google.com/google-ads/api/docs/release-notes
const GOOGLE_ADS_API_VERSION = process.env.GOOGLE_ADS_API_VERSION || "v23";

interface OfflineConversionInput {
  gclid: string;
  value: number;
  currency?: string;
  /** Stripe session id — used as orderId so client + server dedupe to one conversion. */
  orderId: string;
  /** When the conversion happened. Defaults to now. */
  when?: Date;
}

function envConfig() {
  const {
    GOOGLE_ADS_DEVELOPER_TOKEN,
    GOOGLE_ADS_CLIENT_ID,
    GOOGLE_ADS_CLIENT_SECRET,
    GOOGLE_ADS_REFRESH_TOKEN,
    GOOGLE_ADS_CUSTOMER_ID,
    GOOGLE_ADS_CONVERSION_ACTION_ID,
    GOOGLE_ADS_LOGIN_CUSTOMER_ID,
  } = process.env;

  if (
    !GOOGLE_ADS_DEVELOPER_TOKEN ||
    !GOOGLE_ADS_CLIENT_ID ||
    !GOOGLE_ADS_CLIENT_SECRET ||
    !GOOGLE_ADS_REFRESH_TOKEN ||
    !GOOGLE_ADS_CUSTOMER_ID ||
    !GOOGLE_ADS_CONVERSION_ACTION_ID
  ) {
    return null;
  }

  return {
    developerToken: GOOGLE_ADS_DEVELOPER_TOKEN,
    clientId: GOOGLE_ADS_CLIENT_ID,
    clientSecret: GOOGLE_ADS_CLIENT_SECRET,
    refreshToken: GOOGLE_ADS_REFRESH_TOKEN,
    customerId: GOOGLE_ADS_CUSTOMER_ID.replace(/\D/g, ""),
    conversionActionId: GOOGLE_ADS_CONVERSION_ACTION_ID.replace(/\D/g, ""),
    loginCustomerId: (GOOGLE_ADS_LOGIN_CUSTOMER_ID || "").replace(/\D/g, ""),
  };
}

/** Exchange the long-lived refresh token for a short-lived access token. */
async function getAccessToken(cfg: NonNullable<ReturnType<typeof envConfig>>): Promise<string> {
  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: cfg.clientId,
      client_secret: cfg.clientSecret,
      refresh_token: cfg.refreshToken,
      grant_type: "refresh_token",
    }),
  });
  if (!res.ok) {
    throw new Error(`OAuth token exchange failed: HTTP ${res.status} ${await res.text()}`);
  }
  const json: any = await res.json();
  if (!json.access_token) throw new Error("OAuth token exchange returned no access_token");
  return json.access_token as string;
}

/** Format a Date as Google Ads requires: "yyyy-MM-dd HH:mm:ss+00:00". */
function formatConversionDateTime(d: Date): string {
  const iso = d.toISOString();          // 2026-06-04T12:00:00.000Z
  return iso.slice(0, 19).replace("T", " ") + "+00:00";
}

/**
 * Upload one click conversion to Google Ads. Never throws — logs and returns
 * a boolean so the caller (webhook) is never broken by a tracking failure.
 */
export async function reportOfflineConversion(input: OfflineConversionInput): Promise<boolean> {
  const cfg = envConfig();
  if (!cfg) {
    logger.info("[GoogleAds] Offline conversion skipped — API env vars not configured.");
    return false;
  }
  if (!input.gclid) {
    logger.info("[GoogleAds] Offline conversion skipped — no gclid on this booking.");
    return false;
  }

  try {
    const accessToken = await getAccessToken(cfg);

    const body = {
      conversions: [
        {
          gclid: input.gclid,
          conversionAction: `customers/${cfg.customerId}/conversionActions/${cfg.conversionActionId}`,
          conversionDateTime: formatConversionDateTime(input.when || new Date()),
          conversionValue: Number(input.value) || 0,
          currencyCode: input.currency || "GBP",
          orderId: input.orderId,
        },
      ],
      partialFailure: true,
    };

    const url =
      `https://googleads.googleapis.com/${GOOGLE_ADS_API_VERSION}` +
      `/customers/${cfg.customerId}:uploadClickConversions`;

    const headers: Record<string, string> = {
      Authorization: `Bearer ${accessToken}`,
      "developer-token": cfg.developerToken,
      "Content-Type": "application/json",
    };
    if (cfg.loginCustomerId) headers["login-customer-id"] = cfg.loginCustomerId;

    const res = await fetch(url, { method: "POST", headers, body: JSON.stringify(body) });
    const text = await res.text();

    if (!res.ok) {
      logger.error(`[GoogleAds] uploadClickConversions HTTP ${res.status}: ${text}`);
      return false;
    }

    // partialFailureError is surfaced in the 200 body, not the status code.
    let parsed: any;
    try { parsed = JSON.parse(text); } catch { parsed = null; }
    if (parsed?.partialFailureError) {
      logger.error("[GoogleAds] partial failure:", JSON.stringify(parsed.partialFailureError));
      return false;
    }

    logger.info(`[GoogleAds] Offline conversion uploaded: order=${input.orderId} value=${input.value}`);
    return true;
  } catch (e: any) {
    logger.error("[GoogleAds] Offline conversion upload threw:", e?.message || e);
    return false;
  }
}

// ─── SETUP DIAGNOSTIC ─────────────────────────────────────────────────────────
// Verifies the offline-conversion pipeline end to end WITHOUT needing a booking:
//  1) which env vars are present (booleans only — never values)
//  2) OAuth refresh-token exchange works (client id/secret/refresh token)
//  3) the developer token + customer id + conversion action are valid & ENABLED
// Returns a plain report the admin UI renders. Never throws.

const REQUIRED_ENV = [
  "GOOGLE_ADS_DEVELOPER_TOKEN",
  "GOOGLE_ADS_CLIENT_ID",
  "GOOGLE_ADS_CLIENT_SECRET",
  "GOOGLE_ADS_REFRESH_TOKEN",
  "GOOGLE_ADS_CUSTOMER_ID",
  "GOOGLE_ADS_CONVERSION_ACTION_ID",
] as const;

export interface GoogleAdsCheckResult {
  apiVersion: string;
  env: Record<string, boolean>;
  loginCustomerIdSet: boolean;
  oauth: { ok: boolean; error?: string };
  api: {
    ok: boolean;
    error?: string;
    conversionAction?: { id: string; name: string; status: string; type: string };
  };
  ready: boolean;
  hints: string[];
}

function googleAdsErrorHint(text: string): string {
  if (/DEVELOPER_TOKEN_NOT_APPROVED|not.*approved/i.test(text))
    return "Developer token isn't approved for Basic access yet — uploads to your live account won't work until Google approves it (1–2 days). Apply in API Center.";
  if (/USER_PERMISSION_DENIED|PERMISSION_DENIED/i.test(text))
    return "Permission denied — the Google account you authorised can't access this customer, or GOOGLE_ADS_LOGIN_CUSTOMER_ID (manager) is wrong/missing.";
  if (/NOT_FOUND|invalid.*customer|CustomerNotEnabled/i.test(text))
    return "Customer not found — check GOOGLE_ADS_CUSTOMER_ID is digits only (8109058894), and set GOOGLE_ADS_LOGIN_CUSTOMER_ID if you access via a manager account.";
  if (/UNIMPLEMENTED|version|NOT_FOUND.*v\d+/i.test(text))
    return "API version issue — set GOOGLE_ADS_API_VERSION to the current version.";
  if (/DEVELOPER_TOKEN_PROHIBITED|developer token is not/i.test(text))
    return "Developer token invalid — re-copy it from API Center.";
  return "Google Ads API rejected the request — see the error text for the exact reason.";
}

export async function checkGoogleAdsSetup(): Promise<GoogleAdsCheckResult> {
  const env: Record<string, boolean> = {};
  for (const k of REQUIRED_ENV) env[k] = !!process.env[k];
  const loginCustomerIdSet = !!process.env.GOOGLE_ADS_LOGIN_CUSTOMER_ID;
  const base = { apiVersion: GOOGLE_ADS_API_VERSION, env, loginCustomerIdSet };

  const cfg = envConfig();
  if (!cfg) {
    const missing = REQUIRED_ENV.filter((k) => !process.env[k]);
    return {
      ...base,
      oauth: { ok: false },
      api: { ok: false },
      ready: false,
      hints: [`Missing env vars: ${missing.join(", ")}. Add them in Vercel → Settings → Environment Variables (Production), then redeploy.`],
    };
  }

  // 2) OAuth
  let accessToken: string;
  try {
    accessToken = await getAccessToken(cfg);
  } catch (e: any) {
    return {
      ...base,
      oauth: { ok: false, error: (e?.message || String(e)).slice(0, 300) },
      api: { ok: false },
      ready: false,
      hints: ["OAuth failed — check GOOGLE_ADS_CLIENT_ID / CLIENT_SECRET / REFRESH_TOKEN. Re-generate the refresh token with the https://www.googleapis.com/auth/adwords scope."],
    };
  }

  // 3) Developer token + customer + conversion action
  try {
    const url = `https://googleads.googleapis.com/${GOOGLE_ADS_API_VERSION}/customers/${cfg.customerId}/googleAds:search`;
    const headers: Record<string, string> = {
      Authorization: `Bearer ${accessToken}`,
      "developer-token": cfg.developerToken,
      "Content-Type": "application/json",
    };
    if (cfg.loginCustomerId) headers["login-customer-id"] = cfg.loginCustomerId;
    const query =
      `SELECT conversion_action.id, conversion_action.name, conversion_action.status, conversion_action.type ` +
      `FROM conversion_action WHERE conversion_action.id = ${cfg.conversionActionId}`;

    const res = await fetch(url, { method: "POST", headers, body: JSON.stringify({ query }) });
    const text = await res.text();

    if (!res.ok) {
      return { ...base, oauth: { ok: true }, api: { ok: false, error: text.slice(0, 400) }, ready: false, hints: [googleAdsErrorHint(text)] };
    }

    let parsed: any;
    try { parsed = JSON.parse(text); } catch { parsed = null; }
    const row = parsed?.results?.[0]?.conversionAction;
    if (!row) {
      return {
        ...base,
        oauth: { ok: true },
        api: { ok: true },
        ready: false,
        hints: [`Connected, but conversion action ${cfg.conversionActionId} wasn't found in account ${cfg.customerId}. Re-check GOOGLE_ADS_CONVERSION_ACTION_ID (Goals → Conversions → your action → ctId in the URL).`],
      };
    }

    const ca = { id: String(row.id), name: String(row.name ?? ""), status: String(row.status ?? ""), type: String(row.type ?? "") };
    const hints = ca.status === "ENABLED"
      ? [`✓ Connected. Conversion action "${ca.name}" is ENABLED. Confirm it's set to Primary in Google Ads so it drives bidding.`]
      : [`Connected, but conversion action "${ca.name}" status is ${ca.status} — set it to ENABLED/Primary in Google Ads.`];

    return { ...base, oauth: { ok: true }, api: { ok: true, conversionAction: ca }, ready: ca.status === "ENABLED", hints };
  } catch (e: any) {
    return {
      ...base,
      oauth: { ok: true },
      api: { ok: false, error: (e?.message || String(e)).slice(0, 300) },
      ready: false,
      hints: ["The Google Ads API call threw before completing — check the error and your network/region restrictions."],
    };
  }
}
