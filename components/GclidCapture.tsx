"use client";

import { useEffect } from "react";

/**
 * Captures Google click identifiers (gclid / wbraid / gbraid) from the landing
 * URL and stores them in a first-party cookie for 90 days. The checkout flow
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
      for (const key of ["gclid", "wbraid", "gbraid"]) {
        const value = params.get(key);
        if (value) {
          document.cookie =
            `ap_${key}=${encodeURIComponent(value)}; path=/; max-age=${60 * 60 * 24 * 90}; SameSite=Lax`;
        }
      }
    } catch {
      /* non-fatal — tracking only */
    }
  }, []);

  return null;
}
