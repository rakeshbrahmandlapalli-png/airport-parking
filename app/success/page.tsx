"use client";

import { logger } from "@/app/lib/logger";
import { Suspense, useEffect, useState, useRef, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { CheckCircle2, Printer, Loader2, Phone, AlertCircle } from "lucide-react";
import SiteHeader from "@/components/site/SiteHeader";
import SiteFooter from "@/components/site/SiteFooter";
import { COMPANY } from "@/app/lib/company";
import { sanitizeHtml } from "@/app/lib/sanitizeHtml";

// ─── HELPERS ──────────────────────────────────────────────────────────────────

function formatDate(dateStr: string | null | undefined): string {
  if (!dateStr) return "";
  // FIX: parse as local date to avoid UTC midnight shifting the day
  const [y, m, d] = dateStr.split("-").map(Number);
  if (!y || !m || !d) return dateStr;
  return new Date(y, m - 1, d).toLocaleDateString("en-GB", {
    weekday: "short", day: "numeric", month: "short", year: "numeric",
  });
}

function formatTime(t: string | null | undefined): string {
  if (!t) return "";
  // Normalise "HH:MM:SS" → "HH:MM"
  return t.slice(0, 5);
}

// ─── GOOGLE ADS ───────────────────────────────────────────────────────────────
// FIX: extracted so it can't be called multiple times (ref-guard in caller)

interface ConversionUser {
  email?: string | null;
  phone?: string | null;
}

function fireGoogleAdsConversion(
  value: number,
  transactionId: string,
  user: ConversionUser = {},
  attempt = 0
) {
  try {
    const gtag = (window as any).gtag;

    // gtag.js loads `afterInteractive`, which can resolve AFTER this runs on a
    // fast connection. Retry for ~10s instead of silently dropping the
    // conversion (critical during a live ad campaign).
    if (typeof gtag !== "function") {
      if (attempt < 20) {
        setTimeout(() => fireGoogleAdsConversion(value, transactionId, user, attempt + 1), 500);
      } else {
        logger.warn("Google Ads gtag never became available — conversion not sent.");
      }
      return;
    }

    // ── Enhanced Conversions ──────────────────────────────────────────────
    // Provide first-party data so Google can recover attribution that Safari
    // ITP / ad-blockers would otherwise break. gtag normalises + SHA-256 hashes
    // this client-side before sending — raw PII never leaves the browser.
    // (Requires "Enhanced Conversions" enabled in the Google Ads UI, gtag method.)
    const userData: Record<string, string> = {};
    const email = (user.email || "").trim().toLowerCase();
    if (email) userData.email = email;
    const phone = normalisePhoneE164(user.phone);
    if (phone) userData.phone_number = phone;
    if (Object.keys(userData).length > 0) {
      gtag("set", "user_data", userData);
    }

    // 1. Google Ads conversion (for campaign bidding / ROAS)
    gtag("event", "conversion", {
      // ✅ YOUR EXACT NATIVE GOOGLE ADS LABEL
      send_to: "AW-18163936640/lAsCCJO-0LYcEIDbntVD",
      value: value || 0,
      currency: "GBP",
      transaction_id: transactionId,
    });

    // 2. GA4 ecommerce purchase (so revenue/transactions show in GA4)
    gtag("event", "purchase", {
      transaction_id: transactionId,
      value: value || 0,
      currency: "GBP",
    });

    logger.info("Google Ads conversion + GA4 purchase fired:", value);
  } catch (e) {
    logger.error("Failed to fire Google Ads conversion:", e);
  }
}

// Best-effort UK → E.164 (+44...) for Enhanced Conversions phone matching.
function normalisePhoneE164(raw: string | null | undefined): string {
  if (!raw) return "";
  let p = String(raw).replace(/[^\d+]/g, "");
  if (!p) return "";
  if (p.startsWith("+")) return p;
  if (p.startsWith("00")) return "+" + p.slice(2);
  if (p.startsWith("0")) return "+44" + p.slice(1); // UK national → +44
  if (p.startsWith("44")) return "+" + p;
  return "+" + p;
}

// ─── MAIN CONTENT ─────────────────────────────────────────────────────────────

function SuccessContent() {
  const searchParams = useSearchParams();
  const sessionId = searchParams.get("session_id");

  const [booking, setBooking]   = useState<any>(null);
  const [company, setCompany]   = useState<any>(null);
  const [status, setStatus]     = useState<"verifying" | "success" | "error">("verifying");
  const [errorMsg, setErrorMsg] = useState("");

  // FIX: prevent double Google Ads conversion fire on StrictMode double-invoke
  const conversionFiredRef = useRef(false);

  // FIX: extracted into useCallback so the effect dep array is stable
  const finalizePayment = useCallback(async (signal: AbortSignal) => {
    if (!sessionId) {
      setStatus("error");
      setErrorMsg("We couldn't find your payment details on this page. If you've paid, your confirmation email has everything you need.");
      return;
    }

    try {
      // 1. Verify session server-side
      const verifyRes = await fetch(`/api/verify-session?session_id=${encodeURIComponent(sessionId)}`, { signal });
      if (signal.aborted) return;

      // FIX: handle non-JSON responses from the verify endpoint gracefully
      const contentType = verifyRes.headers.get("content-type") || "";
      let data: any = {};
      if (contentType.includes("application/json")) {
        data = await verifyRes.json();
      } else {
        throw new Error(`Unexpected response from verify-session: ${verifyRes.status}`);
      }

      if (!verifyRes.ok || data.status !== "success") {
        throw new Error(data.error || `Payment verification failed (${verifyRes.status}).`);
      }

      // 2–4. Ensure the booking row exists and fetch it — entirely server-side
      // (service role). The bookings table needs no public access.
      const syncRes = await fetch("/api/success/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId }),
        signal,
      });
      if (signal.aborted) return;

      const syncData = await syncRes.json().catch(() => ({}));
      if (!syncRes.ok || !syncData.booking) {
        throw new Error(syncData.error === "row-not-ready" ? "row-not-ready" : (syncData.error || "Could not load your booking."));
      }

      const finalRow = syncData.booking;
      const created  = Boolean(syncData.created);

      // 5. Send confirmation email only if this request created the row
      if (created) {
        try {
          await fetch("/api/send", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ booking: finalRow, isAmendment: false }),
          });
        } catch (e) {
          logger.error("Confirmation email failed:", e);
          // Non-fatal — booking is still confirmed
        }
      }

      if (signal.aborted) return;
      setBooking(finalRow);
      setCompany(syncData.company || null);
      setStatus("success");

      if (!conversionFiredRef.current) {
        conversionFiredRef.current = true;
        fireGoogleAdsConversion(Number(finalRow.total_price) || 0, sessionId, {
          email: finalRow.email,
          phone: finalRow.phone_number,
        });
      }
    } catch (err: any) {
      if (signal.aborted) return;
      logger.error("Finalization error:", err);

      if (err?.name === "AbortError") return;

      // FIX: distinguish "row not ready" from a real error — both are soft fails
      if (err.message === "row-not-ready") {
        setErrorMsg(
          "Your payment went through. We're still preparing your booking, so your confirmation email may take a few minutes. You can also look it up on the Manage booking page."
        );
      } else {
        setErrorMsg(
          "Your payment went through, but we couldn't load your booking details here. Your confirmation email has everything you need."
        );
      }
      setStatus("error");
    }
  }, [sessionId]);

  useEffect(() => {
    const controller = new AbortController();
    finalizePayment(controller.signal);
    return () => controller.abort();
  }, [finalizePayment]);

  // ── VERIFYING STATE ────────────────────────────────────────────────────────
  if (status === "verifying") {
    return (
      <div className="bg-white rounded-xl border border-slate-200 p-8 text-center" role="status" aria-live="polite">
        <Loader2 className="w-7 h-7 text-slate-400 animate-spin mx-auto" aria-hidden="true" />
        <p className="mt-4 text-lg font-semibold text-slate-900">Confirming your payment…</p>
        <p className="mt-1 text-slate-600">This usually takes a few seconds. Please don&apos;t close this page.</p>
      </div>
    );
  }

  // ── ERROR / SOFT-FAIL STATE ────────────────────────────────────────────────
  if (status === "error") {
    return (
      <div className="bg-white rounded-xl border border-slate-200 p-6 md:p-8">
        <AlertCircle className="w-7 h-7 text-amber-500" aria-hidden="true" />
        <h1 className="mt-4 text-2xl font-bold tracking-tight text-slate-900">We&apos;ve got your payment</h1>
        <p className="mt-2 text-slate-600 leading-relaxed">{errorMsg}</p>
        <div className="mt-6 flex flex-col sm:flex-row gap-3">
          <Link href="/manage" className="h-11 px-5 rounded-lg bg-[#0B1120] hover:bg-slate-800 text-white font-semibold inline-flex items-center justify-center">
            Manage booking
          </Link>
          <Link href="/contact" className="h-11 px-5 rounded-lg border border-slate-300 bg-white text-slate-900 font-semibold inline-flex items-center justify-center hover:bg-slate-50">
            Contact us
          </Link>
        </div>
      </div>
    );
  }

  // ── SUCCESS STATE ──────────────────────────────────────────────────────────
  // Only real values are shown. Placeholders written by the sync fallback
  // ("N/A", "TBC") are treated as missing rather than displayed.
  const real = (v: unknown) => {
    const t = String(v ?? "").trim();
    return t && !["N/A", "TBC", "VALUED CUSTOMER"].includes(t.toUpperCase()) ? t : "";
  };
  const airport    = real(booking?.airport);
  const terminal   = real(booking?.terminal);
  const isLuton    = airport.toLowerCase().includes("luton");
  const phones     = [company?.phone_number, company?.phone_number_2].map(real).filter(Boolean);
  const arrival    = company ? (isLuton ? (company.on_arrival_ltn || company.on_arrival) : (company.on_arrival_lhr || company.on_arrival)) : "";
  const onReturn   = company ? (isLuton ? (company.on_return_ltn || company.on_return) : (company.on_return_lhr || company.on_return)) : "";
  const email      = real(booking?.email);

  const rows: [string, string][] = [
    ["Parking", `${real(booking?.service_type) || "Airport parking"}${real(company?.name) ? ` with ${company.name}` : ""}`],
    ["Airport", [airport, terminal].filter(Boolean).join(", ")],
    ["Drop-off", [formatDate(booking?.dropoff_date), formatTime(booking?.dropoff_time)].filter(Boolean).join(", ")],
    ["Pick-up", [formatDate(booking?.pickup_date), formatTime(booking?.pickup_time)].filter(Boolean).join(", ")],
    ["Car", [real(booking?.license_plate), real(booking?.car_make)].filter(Boolean).join(", ")],
    ["Return flight", real(booking?.flight_number)],
    ["Total paid", booking?.total_price ? `£${Number(booking.total_price).toFixed(2)}` : ""],
  ];

  return (
    <div className="space-y-4">
      <section className="bg-white rounded-xl border border-slate-200">
        <div className="p-6 md:p-8 border-b border-slate-200">
          <CheckCircle2 className="w-8 h-8 text-emerald-600" aria-hidden="true" />
          <h1 className="mt-4 text-2xl md:text-3xl font-bold tracking-tight text-slate-900">Your booking is confirmed</h1>
          <p className="mt-2 text-slate-600 leading-relaxed">
            {email
              ? <>We&apos;ve sent your confirmation to <span className="font-medium text-slate-900">{email}</span>. Keep it handy: it has your reference and the operator&apos;s contact numbers for the day.</>
              : <>Your confirmation email is on its way. Keep it handy: it has your reference and the operator&apos;s contact numbers for the day.</>}
          </p>
          {booking?.booking_ref && (
            <div className="mt-5">
              <p className="text-sm text-slate-500">Booking reference</p>
              <p className="mt-0.5 text-2xl md:text-3xl font-bold font-mono tracking-tight text-slate-900">{booking.booking_ref}</p>
            </div>
          )}
        </div>

        <dl className="divide-y divide-slate-100">
          {rows.filter(([, v]) => v).map(([label, value]) => (
            <div key={label} className="px-6 md:px-8 py-3.5 grid grid-cols-[120px_1fr] sm:grid-cols-[160px_1fr] gap-3">
              <dt className="text-sm text-slate-500 pt-0.5">{label}</dt>
              <dd className="text-slate-900 min-w-0 break-words">{value}</dd>
            </div>
          ))}
        </dl>
      </section>

      {/* The operator's own instructions, as set in admin. Nothing generic:
          made-up steps (a fixed "call 20–30 mins before", one car park for
          every operator) are wrong for some operators and for Park & Ride. */}
      <section className="bg-white rounded-xl border border-slate-200 p-6 md:p-8">
        <h2 className="text-lg font-semibold text-slate-900">On the day</h2>
        {phones.length > 0 && (
          <p className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1">
            <Phone className="w-4 h-4 text-slate-400" aria-hidden="true" />
            <span className="text-slate-600">{real(company?.name) || "Your operator"}:</span>
            {phones.map((ph) => (
              <a key={ph} href={`tel:${ph.replace(/\s+/g, "")}`} className="font-medium text-slate-900 hover:underline underline-offset-4">{ph}</a>
            ))}
          </p>
        )}
        {arrival || onReturn ? (
          <div className="mt-4 space-y-4 text-slate-700">
            {arrival && (
              <div>
                <h3 className="font-semibold text-slate-900">When you arrive</h3>
                <div className="mt-1 text-sm leading-relaxed whitespace-pre-wrap" dangerouslySetInnerHTML={{ __html: sanitizeHtml(arrival) }} />
              </div>
            )}
            {onReturn && (
              <div>
                <h3 className="font-semibold text-slate-900">When you get back</h3>
                <div className="mt-1 text-sm leading-relaxed whitespace-pre-wrap" dangerouslySetInnerHTML={{ __html: sanitizeHtml(onReturn) }} />
              </div>
            )}
          </div>
        ) : (
          <p className="mt-3 text-slate-600 leading-relaxed">Your confirmation email has the directions and the meeting point for your operator.</p>
        )}
      </section>

      <section className="bg-white rounded-xl border border-slate-200 p-6 md:p-8 print:hidden">
        <h2 className="text-lg font-semibold text-slate-900">Changes and cancellations</h2>
        <p className="mt-2 text-slate-600 leading-relaxed">
          You can add your return flight or cancel from <Link href="/manage" className="text-slate-900 underline underline-offset-4">Manage booking</Link>.
          Cancelling is free up to 24 hours before drop-off. To change your dates, call your operator.
        </p>
      </section>

      <div className="flex flex-col sm:flex-row gap-3 print:hidden">
        <button type="button" onClick={() => window.print()} className="h-11 px-5 rounded-lg border border-slate-300 bg-white text-sm font-semibold text-slate-900 hover:bg-slate-50 inline-flex items-center justify-center gap-2">
          <Printer className="w-4 h-4" aria-hidden="true" /> Print confirmation
        </button>
        <Link href="/manage" className="h-11 px-5 rounded-lg bg-[#0B1120] hover:bg-slate-800 text-sm font-semibold text-white inline-flex items-center justify-center">
          Manage booking
        </Link>
      </div>

      <p className="text-sm text-slate-500 print:hidden">
        Questions? Call {COMPANY.phoneDisplay} or email{" "}
        <a href={`mailto:${COMPANY.email}`} className="text-slate-700 underline underline-offset-4">{COMPANY.email}</a>.
      </p>
    </div>
  );
}

// ─── PAGE ─────────────────────────────────────────────────────────────────────

export default function SuccessPage() {
  return (
    <>
      <SiteHeader />
      <main className="min-h-[60vh] bg-slate-50 py-10 md:py-16 px-4 md:px-6 font-sans antialiased text-slate-900">
        <div className="max-w-2xl mx-auto">
          <Suspense
            fallback={
              <div className="bg-white rounded-xl border border-slate-200 p-8 text-center">
                <Loader2 className="w-7 h-7 text-slate-400 animate-spin mx-auto" aria-hidden="true" />
                <p className="mt-4 text-slate-600">Loading your booking…</p>
              </div>
            }
          >
            <SuccessContent />
          </Suspense>
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
