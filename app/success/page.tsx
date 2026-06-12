"use client";

import { logger } from "@/app/lib/logger";
import { Suspense, useEffect, useState, useRef, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import {
  CheckCircle2, Printer, Mail, MapPin, ArrowRight, Download,
  Loader2, Phone, Clock, CreditCard, AlertCircle, ShieldCheck, Plane,
  Car, Calendar,
} from "lucide-react";

// ─── HELPERS ──────────────────────────────────────────────────────────────────

function formatDate(dateStr: string | null | undefined): string {
  if (!dateStr) return "TBC";
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

// ─── LOADING SKELETON ─────────────────────────────────────────────────────────

function VerifyingSkeleton() {
  return (
    <div className="relative z-10 max-w-2xl w-full animate-in fade-in duration-500">
      <div className="bg-white rounded-[2.5rem] md:rounded-[3rem] p-6 sm:p-8 md:p-12 shadow-2xl border border-slate-200 text-center relative overflow-hidden">
        <div className="relative mb-8">
          <div className="w-20 h-20 md:w-24 md:h-24 bg-slate-100 rounded-full mx-auto animate-pulse flex items-center justify-center">
            <Loader2 className="w-8 h-8 text-slate-300 animate-spin" />
          </div>
        </div>
        <div className="h-10 md:h-12 w-3/4 bg-slate-200 rounded-xl mx-auto mb-4 animate-pulse" />
        <div className="h-4 w-1/2 bg-slate-100 rounded-full mx-auto mb-10 animate-pulse" />
        <div className="bg-[#0B1120] rounded-[2rem] p-6 md:p-8 text-left mb-10 relative overflow-hidden shadow-2xl">
          <div className="absolute top-0 left-0 w-full h-1 bg-slate-800" />
          <div className="flex justify-between items-start mb-8">
            <div className="space-y-2">
              <div className="h-3 w-24 bg-slate-800 rounded animate-pulse" />
              <div className="h-8 w-48 bg-slate-700 rounded-lg animate-pulse" />
            </div>
            <div className="w-12 h-12 bg-slate-800 rounded-2xl animate-pulse" />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 border-t border-white/10 pt-8">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="flex gap-3">
                <div className="w-4 h-4 bg-slate-800 rounded animate-pulse mt-1" />
                <div className="space-y-2 flex-1">
                  <div className="h-2 w-16 bg-slate-800 rounded animate-pulse" />
                  <div className="h-4 w-32 bg-slate-700 rounded animate-pulse" />
                </div>
              </div>
            ))}
          </div>
        </div>
        <div className="h-32 w-full bg-slate-50 rounded-[2rem] border border-slate-100 animate-pulse mb-10" />
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="h-14 w-full bg-slate-100 rounded-2xl animate-pulse" />
          <div className="h-14 w-full bg-blue-100 rounded-2xl animate-pulse" />
        </div>
      </div>
    </div>
  );
}

// ─── MAIN CONTENT ─────────────────────────────────────────────────────────────

function SuccessContent() {
  const searchParams = useSearchParams();
  const sessionId = searchParams.get("session_id");

  const [booking, setBooking]   = useState<any>(null);
  const [status, setStatus]     = useState<"verifying" | "success" | "error">("verifying");
  const [errorMsg, setErrorMsg] = useState("");

  // FIX: prevent double Google Ads conversion fire on StrictMode double-invoke
  const conversionFiredRef = useRef(false);

  // FIX: extracted into useCallback so the effect dep array is stable
  const finalizePayment = useCallback(async (signal: AbortSignal) => {
    if (!sessionId) {
      setStatus("error");
      setErrorMsg("No session ID found. Please check your email or contact support.");
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
          "Your payment was received. We're still preparing your booking — please check your email for the voucher or visit Manage My Booking."
        );
      } else {
        setErrorMsg(
          "Your payment was successful, but we had trouble loading your booking details. Please check your email for the voucher."
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
  if (status === "verifying") return <VerifyingSkeleton />;

  // ── ERROR / SOFT-FAIL STATE ────────────────────────────────────────────────
  if (status === "error") {
    return (
      <div className="bg-white rounded-[2.5rem] p-8 md:p-12 shadow-2xl border border-amber-100 text-center max-w-lg mx-auto relative overflow-hidden">
        <div className="absolute -top-24 -right-24 w-56 h-56 bg-amber-400/10 rounded-full blur-[80px] pointer-events-none" />
        <div className="w-20 h-20 bg-amber-50 text-amber-500 rounded-full flex items-center justify-center mx-auto mb-6 border-4 border-amber-100">
          <ShieldCheck className="w-10 h-10" />
        </div>
        <h2 className="text-2xl font-black text-slate-900 mb-2 tracking-tight">Payment Received</h2>
        <p className="text-slate-500 font-medium mb-8 leading-relaxed">{errorMsg}</p>
        <div className="flex flex-col sm:flex-row gap-3">
          <Link
            href="/manage"
            className="flex-1 py-4 bg-slate-900 hover:bg-slate-800 transition-colors text-white rounded-2xl font-black uppercase tracking-widest text-xs inline-flex items-center justify-center gap-2"
          >
            Manage My Booking <ArrowRight className="w-4 h-4" />
          </Link>
          <Link
            href="/contact"
            className="flex-1 py-4 bg-white border border-slate-200 hover:bg-slate-50 transition-colors text-slate-700 rounded-2xl font-black uppercase tracking-widest text-xs inline-flex items-center justify-center gap-2"
          >
            Contact Support
          </Link>
        </div>
      </div>
    );
  }

  // ── SUCCESS STATE ──────────────────────────────────────────────────────────
  const bookingId  = booking?.booking_ref  || "APD-PROCESSING";
  const airport    = booking?.airport      || "Luton (LTN)";
  const terminal   = booking?.terminal     || "Main Terminal";
  const totalPrice = booking?.total_price  ? `£${Number(booking.total_price).toFixed(2)}` : "Paid";
  const isHeathrow = airport.toLowerCase().includes("heathrow");

  const dropDateStr = formatDate(booking?.dropoff_date);
  const pickDateStr = formatDate(booking?.pickup_date);
  const dropTime    = formatTime(booking?.dropoff_time);
  const pickTime    = formatTime(booking?.pickup_time);
  const plate       = booking?.license_plate || "N/A";
  const carMake     = booking?.car_make      || "N/A";

  return (
    <div className="relative z-10 max-w-2xl w-full animate-in fade-in zoom-in-95 duration-700">
      <div className="bg-white rounded-[2.5rem] md:rounded-[3rem] p-6 sm:p-8 md:p-12 shadow-2xl border border-slate-200 text-center relative overflow-hidden">
        <div className="absolute -top-32 -right-32 w-64 h-64 bg-emerald-500/10 rounded-full blur-[80px] pointer-events-none" />

        {/* Success icon */}
        <div className="relative mb-8">
          <div className="w-20 h-20 md:w-24 md:h-24 bg-emerald-50 border-4 border-emerald-100 text-emerald-500 rounded-full flex items-center justify-center mx-auto shadow-lg">
            <CheckCircle2 className="w-10 h-10 md:w-12 md:h-12" strokeWidth={2.5} />
          </div>
        </div>

        <h1 className="text-3xl sm:text-4xl md:text-5xl font-black text-slate-900 mb-4 tracking-tight">
          Booking Confirmed.
        </h1>
        <p className="text-slate-500 font-medium mb-10 text-sm sm:text-base md:text-lg max-w-md mx-auto">
          Your premium parking space is reserved. Your itinerary and receipt have been sent to your inbox.
        </p>

        {/* DARK VOUCHER TICKET */}
        <div className="bg-[#0B1120] rounded-[2rem] text-left text-white mb-10 relative overflow-hidden shadow-2xl">
          <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-blue-500 via-indigo-400 to-emerald-400" />

          <div className="p-6 md:p-8">
            {/* Header row */}
            <div className="flex justify-between items-start mb-8">
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 mb-1.5 flex items-center gap-2">
                  <Plane className="w-3.5 h-3.5 text-blue-400 rotate-45" /> Booking Reference
                </p>
                <p className="text-3xl md:text-4xl font-black text-blue-400 tracking-[0.15em] font-mono">
                  {bookingId}
                </p>
              </div>
              <button
                onClick={() => window.print()}
                aria-label="Print voucher"
                className="w-12 h-12 bg-white/10 rounded-2xl flex items-center justify-center border border-white/10 hover:bg-white/20 transition-colors cursor-pointer shrink-0"
              >
                <Printer className="w-5 h-5 text-white" />
              </button>
            </div>

            {/* Detail grid — FIX: now shows actual dates, times, plate, car */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-5 border-t border-white/10 pt-8">
              <div className="flex items-start gap-3">
                <MapPin className="w-4 h-4 text-blue-400 shrink-0 mt-1" />
                <div>
                  <p className="text-[9px] font-black uppercase tracking-widest text-slate-400">Airport</p>
                  <p className="text-sm font-bold text-white">{airport}</p>
                  <p className="text-[10px] text-blue-400 font-bold uppercase tracking-widest">{terminal}</p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <CreditCard className="w-4 h-4 text-emerald-400 shrink-0 mt-1" />
                <div>
                  <p className="text-[9px] font-black uppercase tracking-widest text-slate-400">Total Paid</p>
                  <p className="text-sm font-bold text-emerald-400">{totalPrice}</p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <Calendar className="w-4 h-4 text-blue-400 shrink-0 mt-1" />
                <div>
                  <p className="text-[9px] font-black uppercase tracking-widest text-slate-400">Drop-off</p>
                  <p className="text-sm font-bold text-white">{dropDateStr}</p>
                  {dropTime && <p className="text-[10px] text-blue-400 font-bold">{dropTime}</p>}
                </div>
              </div>

              <div className="flex items-start gap-3">
                <Calendar className="w-4 h-4 text-purple-400 shrink-0 mt-1" />
                <div>
                  <p className="text-[9px] font-black uppercase tracking-widest text-slate-400">Pick-up</p>
                  <p className="text-sm font-bold text-white">{pickDateStr}</p>
                  {pickTime && <p className="text-[10px] text-purple-400 font-bold">{pickTime}</p>}
                </div>
              </div>

              <div className="flex items-start gap-3">
                <Car className="w-4 h-4 text-amber-400 shrink-0 mt-1" />
                <div>
                  <p className="text-[9px] font-black uppercase tracking-widest text-slate-400">Vehicle</p>
                  <p className="text-sm font-bold text-white font-mono tracking-widest">{plate}</p>
                  <p className="text-[10px] text-slate-400 font-bold">{carMake}</p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <Mail className="w-4 h-4 text-blue-400 shrink-0 mt-1" />
                <div>
                  <p className="text-[9px] font-black uppercase tracking-widest text-slate-400">Voucher</p>
                  <p className="text-sm font-bold text-white">Sent to email</p>
                </div>
              </div>
            </div>
          </div>

          {/* Perforated tear-line */}
          <div className="relative">
            <div className="absolute -left-3 top-1/2 -translate-y-1/2 w-6 h-6 bg-white rounded-full" />
            <div className="absolute -right-3 top-1/2 -translate-y-1/2 w-6 h-6 bg-white rounded-full" />
            <div className="border-t border-dashed border-white/15 mx-8" />
          </div>

          <div className="p-6 md:p-8 flex items-center gap-3">
            <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
            <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
              Free cancellation up to 24h before drop-off · Encrypted by Stripe
            </p>
          </div>
        </div>

        {/* ARRIVAL INSTRUCTIONS */}
        <div className="bg-slate-50 rounded-[2rem] p-6 md:p-8 text-left border border-slate-200 mb-10">
          <h4 className="text-slate-900 font-black text-sm uppercase tracking-widest mb-6 flex items-center gap-3">
            <Phone className="w-5 h-5 text-blue-600" /> Essential Arrival Info
          </h4>
          <ul className="space-y-6">
            <li className="flex gap-4 items-start relative">
              <div className="absolute left-[11px] top-6 bottom-[-24px] w-px bg-slate-200" />
              <div className="w-6 h-6 bg-slate-900 text-white rounded-full flex-shrink-0 flex items-center justify-center text-[10px] font-black relative z-10">
                1
              </div>
              <p className="text-slate-600 text-sm font-bold leading-relaxed pt-0.5">
                Call the chauffeur exactly{" "}
                <span className="bg-blue-100 text-blue-700 px-2 py-0.5 rounded font-black">20–30 MINS</span>{" "}
                before you reach the airport terminal. The number is inside your email voucher.
              </p>
            </li>
            <li className="flex gap-4 items-start">
              <div className="w-6 h-6 bg-slate-900 text-white rounded-full flex-shrink-0 flex items-center justify-center text-[10px] font-black relative z-10">
                2
              </div>
              <p className="text-slate-600 text-sm font-bold leading-relaxed pt-0.5">
                {isHeathrow ? (
                  <>
                    Head directly to the{" "}
                    <span className="font-black text-slate-900">{terminal} Short Stay Car Park</span>{" "}
                    and follow signs for &ldquo;Off-Airport Meet &amp; Greet&rdquo;.
                  </>
                ) : (
                  <>
                    Follow signs for{" "}
                    <span className="font-black text-slate-900">&ldquo;Terminal Car Park 1&rdquo;</span>{" "}
                    and proceed to the designated Meet &amp; Greet area on{" "}
                    <span className="font-black text-slate-900">Level 3</span>.
                  </>
                )}
              </p>
            </li>
          </ul>
        </div>

        {/* ACTION BUTTONS */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <button
            onClick={() => window.print()}
            className="w-full py-4 bg-white border border-slate-200 text-slate-900 font-black rounded-2xl flex items-center justify-center gap-3 hover:bg-slate-50 transition-all text-xs uppercase tracking-widest shadow-sm active:scale-95"
          >
            <Download className="w-4 h-4" /> Save Receipt
          </button>
          <Link
            href="/"
            className="w-full py-4 bg-blue-600 text-white font-black rounded-2xl flex items-center justify-center gap-3 hover:bg-blue-500 shadow-lg shadow-blue-500/30 transition-all text-xs uppercase tracking-widest active:scale-95"
          >
            Finish <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </div>

      <p className="mt-8 text-center text-slate-400 font-bold text-[10px] uppercase tracking-widest">
        Need assistance?{" "}
        <Link href="/contact" className="text-blue-500 hover:underline ml-1">
          Contact Concierge
        </Link>
      </p>
    </div>
  );
}

// ─── PAGE ─────────────────────────────────────────────────────────────────────

export default function SuccessPage() {
  return (
    <main className="min-h-screen bg-[#F8FAFC] flex flex-col items-center justify-center p-4 sm:p-6 relative font-sans antialiased overflow-hidden">
      <div className="absolute top-0 left-0 w-full h-96 bg-gradient-to-b from-blue-600/5 to-transparent" />
      <Suspense
        fallback={
          <div className="flex flex-col items-center justify-center min-h-screen z-10 relative">
            <Loader2 className="w-10 h-10 text-blue-600 animate-spin mb-4" />
            <p className="font-black uppercase text-xs tracking-widest text-slate-400">Loading Reservation...</p>
          </div>
        }
      >
        <SuccessContent />
      </Suspense>
    </main>
  );
}