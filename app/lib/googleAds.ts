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
//
// NOTE: GOOGLE_ADS_CONVERSION_ACTION_ID is the numeric conversion *action* id
// (Tools → Conversions → click the action → the number in the URL). It is NOT
// the gtag label ("lAsCCJO-0LYcEIDbntVD") used on the client side.

const GOOGLE_ADS_API_VERSION = "v18";

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
