"use client";

import { useEffect } from "react";

/**
 * Captures Google click identifiers (gclid / wbraid / gbraid) from the landing
 * URL and stores them in a first-party cookie for 90 days (set here and again
 * by the server, see app/api/click-id). The checkout flow
 * later reads `ap_gclid` and threads it into Stripe metadata so the webhook can
 * upload a server-side offline conversion — counting a conversion for every
 * paid booking, even when the shopper never returns to /success or has an
 * ad-blocker that breaks the client-side tag.
 */
export default function GclidCapture() {
  useEffect(() => {
    try {
      const params = new URLSearchParams(window.location.search);
      // gclid = standard click id; wbraid/gbraid = iOS/privacy click ids.
      const found: Record<string, string> = {};
      for (const key of ["gclid", "wbraid", "gbraid"]) {
        const value = params.get(key);
        if (value) {
          found[key] = value;
          document.cookie =
            `ap_${key}=${encodeURIComponent(value)}; path=/; max-age=${60 * 60 * 24 * 90}; SameSite=Lax`;
        }
      }
      // Safari keeps a script-set cookie for only 24 hours after an ad click,
      // so ask the server to set the same cookie too (app/api/click-id), which
      // it keeps for the full 90 days.
      if (Object.keys(found).length) {
        fetch("/api/click-id", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(found),
          keepalive: true,
        }).catch(() => { /* tracking only */ });
      }
    } catch {
      /* non-fatal — tracking only */
    }
  }, []);

  return null;
}
