"use client";

// ─────────────────────────────────────────────────────────────────────────────
// Cookie consent banner — PECR / UK GDPR compliant via Google Consent Mode v2.
//
// How it works:
//  • app/layout.tsx sets consent DEFAULT = denied (beforeInteractive) so GA4,
//    Google Ads and Clarity load in "denied" mode and set no cookies until the
//    user opts in.
//  • This component reads the stored choice and calls gtag('consent','update')
//    to grant the categories the user allowed. Microsoft Clarity (which uses
//    cookies/recordings) is only injected once Analytics is granted.
//  • "Reject" is exactly as easy as "Accept", as the ICO requires.
//
// Re-open later from anywhere with:  window.dispatchEvent(new Event("apd:cookie-settings"))
// e.g. a "Cookie settings" link in your footer.
// ─────────────────────────────────────────────────────────────────────────────

import { useEffect, useState } from "react";
import Link from "next/link";
import { Cookie, X } from "lucide-react";

const STORAGE_KEY = "apd_consent_v1";
const CLARITY_ID = "wssgetz48e";

type Prefs = { analytics: boolean; marketing: boolean };

declare global {
  interface Window {
    gtag?: (...args: unknown[]) => void;
    clarity?: (...args: unknown[]) => void;
  }
}

function readStored(): Prefs | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const p = JSON.parse(raw);
    return { analytics: !!p.analytics, marketing: !!p.marketing };
  } catch {
    return null;
  }
}

let clarityLoaded = false;
function loadClarity() {
  if (clarityLoaded || typeof window === "undefined") return;
  if (window.clarity) { clarityLoaded = true; return; }
  clarityLoaded = true;
  (function (c: any, l: Document, a: string, r: string, i: string) {
    c[a] = c[a] || function () { (c[a].q = c[a].q || []).push(arguments); };
    const t = l.createElement(r) as HTMLScriptElement;
    t.async = true;
    t.src = "https://www.clarity.ms/tag/" + i;
    const y = l.getElementsByTagName(r)[0];
    y.parentNode?.insertBefore(t, y);
  })(window, document, "clarity", "script", CLARITY_ID);
}

/** Push the user's choice into Google Consent Mode and fire dependent tags. */
function applyConsent(prefs: Prefs) {
  if (typeof window === "undefined") return;
  window.gtag?.("consent", "update", {
    analytics_storage: prefs.analytics ? "granted" : "denied",
    ad_storage: prefs.marketing ? "granted" : "denied",
    ad_user_data: prefs.marketing ? "granted" : "denied",
    ad_personalization: prefs.marketing ? "granted" : "denied",
  });
  // NOTE: Microsoft Clarity is intentionally NOT gated by consent — it is loaded
  // for every visitor on mount (see the effect below). Product decision for a new
  // site that wants heatmap/session data from day one. Google Analytics & Ads
  // remain consent-gated through Consent Mode v2 above. See compliance note in
  // the team docs before relying on this for UK/EU traffic.
}

export default function CookieConsent() {
  const [open, setOpen] = useState(false);
  const [showPrefs, setShowPrefs] = useState(false);
  const [analytics, setAnalytics] = useState(true);
  const [marketing, setMarketing] = useState(true);

  // On mount: apply any stored choice, otherwise show the banner.
  useEffect(() => {
    // Microsoft Clarity runs for ALL visitors regardless of consent (new-site
    // product decision). GA4 / Google Ads stay consent-gated below.
    loadClarity();

    const stored = readStored();
    if (stored) {
      applyConsent(stored);
    } else {
      setOpen(true);
    }
    // Allow re-opening from a footer link, etc.
    const reopen = () => {
      const current = readStored();
      setAnalytics(current ? current.analytics : true);
      setMarketing(current ? current.marketing : true);
      setShowPrefs(true);
      setOpen(true);
    };
    window.addEventListener("apd:cookie-settings", reopen);
    return () => window.removeEventListener("apd:cookie-settings", reopen);
  }, []);

  const persist = (prefs: Prefs) => {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(prefs)); } catch { /* ignore */ }
    applyConsent(prefs);
    setOpen(false);
    setShowPrefs(false);
  };

  const acceptAll = () => persist({ analytics: true, marketing: true });
  const rejectAll = () => persist({ analytics: false, marketing: false });
  const savePrefs = () => persist({ analytics, marketing });

  if (!open) return null;

  const toggleRow = (
    label: string,
    desc: string,
    checked: boolean,
    onChange?: (v: boolean) => void,
    disabled?: boolean,
  ) => (
    <label className={`flex items-center justify-between gap-4 ${disabled ? "opacity-50" : "cursor-pointer"}`}>
      <span>
        <span className="block text-[13px] font-medium text-white">{label}</span>
        <span className="block text-[11px] leading-snug text-slate-400">{desc}</span>
      </span>
      <input
        type="checkbox"
        checked={checked}
        disabled={disabled}
        onChange={(e) => onChange?.(e.target.checked)}
        className="h-3.5 w-3.5 shrink-0 accent-blue-600"
      />
    </label>
  );

  return (
    <div className="fixed bottom-4 left-4 right-4 sm:right-auto z-[9999] pointer-events-none">
      <div className="pointer-events-auto sm:w-[380px] rounded-xl border border-slate-700/60 bg-[#0B1120] shadow-lg shadow-black/40">
        <div className="p-4">
          <div className="flex items-center gap-2">
            <Cookie className="w-4 h-4 text-blue-400 shrink-0" aria-hidden="true" />
            <h2 className="text-[13px] font-medium text-white">Cookies</h2>
            <button
              onClick={rejectAll}
              aria-label="Reject non-essential cookies and close"
              className="ml-auto -mr-1 p-1 text-slate-500 hover:text-slate-300 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <p className="mt-2 text-[12px] leading-relaxed text-slate-400">
            We use essential cookies to run the site and, with your consent, analytics and advertising
            cookies to improve it.{" "}
            <Link href="/privacy" className="text-blue-400 hover:underline">Privacy Policy</Link>.
          </p>

          {showPrefs && (
            <div className="mt-3 space-y-3 border-t border-slate-700/60 pt-3">
              {toggleRow("Essential", "Required for booking and checkout. Always on.", true, undefined, true)}
              {toggleRow("Analytics", "Google Analytics usage statistics.", analytics, setAnalytics)}
              {toggleRow("Marketing", "Google Ads conversion measurement.", marketing, setMarketing)}
            </div>
          )}

          <div className="mt-4 flex items-center gap-2">
            <button
              onClick={showPrefs ? savePrefs : acceptAll}
              className="flex-1 h-9 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-[12px] font-semibold transition-colors"
            >
              {showPrefs ? "Save" : "Accept"}
            </button>
            <button
              onClick={rejectAll}
              className="flex-1 h-9 rounded-lg border border-slate-600 hover:border-slate-400 text-slate-200 text-[12px] font-semibold transition-colors"
            >
              Reject
            </button>
            {!showPrefs && (
              <button
                onClick={() => setShowPrefs(true)}
                className="h-9 px-2.5 text-slate-400 hover:text-white text-[12px] font-medium transition-colors"
              >
                Manage
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
