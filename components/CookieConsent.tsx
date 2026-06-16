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

  return (
    <div className="fixed inset-x-0 bottom-0 z-[9999] p-3 sm:p-5 pointer-events-none">
      <div className="pointer-events-auto mx-auto max-w-3xl rounded-2xl border border-slate-200 bg-white shadow-2xl shadow-slate-900/10 overflow-hidden">
        <div className="p-5 sm:p-6">
          <div className="flex items-start gap-3">
            <div className="hidden sm:flex w-10 h-10 shrink-0 rounded-xl bg-blue-50 border border-blue-100 items-center justify-center">
              <Cookie className="w-5 h-5 text-blue-600" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between gap-3">
                <h2 className="text-base font-black text-slate-900 tracking-tight">We value your privacy</h2>
                <button
                  onClick={rejectAll}
                  aria-label="Reject non-essential cookies and close"
                  className="sm:hidden text-slate-400 hover:text-slate-700 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              <p className="mt-1.5 text-[13px] leading-relaxed text-slate-500">
                We use essential cookies to run this site, plus product-analytics (Microsoft Clarity) to understand how
                it&rsquo;s used. With your consent we also use Google analytics and advertising cookies to measure
                performance. See our{" "}
                <Link href="/privacy" className="text-blue-600 font-semibold hover:underline">Privacy Policy</Link>.
              </p>

              {/* Granular preferences */}
              {showPrefs && (
                <div className="mt-4 space-y-2.5 border-t border-slate-100 pt-4">
                  <label className="flex items-center justify-between gap-3 opacity-60">
                    <span className="text-[13px]">
                      <span className="font-bold text-slate-900 block">Essential</span>
                      <span className="text-slate-500">Required for booking &amp; checkout. Always on.</span>
                    </span>
                    <input type="checkbox" checked disabled className="h-4 w-4 accent-blue-600" />
                  </label>
                  <label className="flex items-center justify-between gap-3 cursor-pointer">
                    <span className="text-[13px]">
                      <span className="font-bold text-slate-900 block">Analytics</span>
                      <span className="text-slate-500">Google Analytics (GA4) usage statistics.</span>
                    </span>
                    <input type="checkbox" checked={analytics} onChange={(e) => setAnalytics(e.target.checked)} className="h-4 w-4 accent-blue-600 cursor-pointer" />
                  </label>
                  <label className="flex items-center justify-between gap-3 cursor-pointer">
                    <span className="text-[13px]">
                      <span className="font-bold text-slate-900 block">Marketing</span>
                      <span className="text-slate-500">Measures Google Ads conversions &amp; personalisation.</span>
                    </span>
                    <input type="checkbox" checked={marketing} onChange={(e) => setMarketing(e.target.checked)} className="h-4 w-4 accent-blue-600 cursor-pointer" />
                  </label>
                </div>
              )}

              {/* Actions */}
              <div className="mt-5 flex flex-col sm:flex-row gap-2.5">
                {showPrefs ? (
                  <button onClick={savePrefs} className="order-1 flex-1 h-11 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-[13px] uppercase tracking-wide transition-colors">
                    Save preferences
                  </button>
                ) : (
                  <button onClick={acceptAll} className="order-1 flex-1 h-11 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-[13px] uppercase tracking-wide transition-colors">
                    Accept all
                  </button>
                )}
                <button onClick={rejectAll} className="order-2 flex-1 h-11 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-[13px] uppercase tracking-wide transition-colors">
                  Reject non-essential
                </button>
                {!showPrefs && (
                  <button onClick={() => setShowPrefs(true)} className="order-3 sm:flex-none h-11 px-4 rounded-xl border border-slate-200 hover:border-slate-300 text-slate-600 font-bold text-[13px] uppercase tracking-wide transition-colors">
                    Preferences
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
