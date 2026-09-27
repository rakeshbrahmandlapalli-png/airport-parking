"use client";

import { useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import SiteHeader from "@/components/site/SiteHeader";
import SiteFooter from "@/components/site/SiteFooter";
import { Loader2, AlertCircle, CheckCircle2 } from "lucide-react";
import { logger } from "@/app/lib/logger";
import { COMPANY } from "@/app/lib/company";

// Parse YYYY-MM-DD as a LOCAL date. Reading it as UTC shifts a midnight booking
// back a day, which would show someone the wrong drop-off on the one screen
// where they are checking they are cancelling the right thing.
function parseLocalDate(dateStr: string): Date {
  if (!dateStr) return new Date();
  const [y, m, d] = String(dateStr).split("T")[0].split("-").map(Number);
  if (y && m && d) return new Date(y, m - 1, d);
  const fb = new Date(dateStr);
  return isNaN(fb.getTime()) ? new Date() : fb;
}

function formatDate(dateStr: string) {
  return parseLocalDate(dateStr).toLocaleDateString("en-GB", {
    weekday: "short", day: "numeric", month: "short", year: "numeric",
  });
}

const inputCls = "w-full h-12 rounded-lg border border-slate-300 bg-white px-3.5 text-base text-slate-900 placeholder:text-slate-400 outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-600/20 shadow-[0_0_0_1000px_#ffffff_inset] [-webkit-text-fill-color:#0f172a] placeholder:[-webkit-text-fill-color:#94a3b8]";
const labelCls = "block text-sm font-medium text-slate-700 mb-1.5";

function CancelInner() {
  const params = useSearchParams();

  // The reference arrives in the link from the manage page, so it is filled in
  // already. The name is still required — a reference alone is guessable, and
  // cancelling a stranger's parking is a far worse failure than one more field.
  // Read straight into the initial state rather than through an effect, so the
  // field is never briefly empty and there is no second render to go wrong.
  const [ref, setRef] = useState(() => (params.get("ref") || "").toUpperCase());
  const [fullName, setFullName] = useState("");
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [booking, setBooking] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  // Within 24h of drop-off. It never blocks cancelling - it only changes what
  // we promise about the money. Known from the lookup, so the customer sees
  // the right promise BEFORE confirming, and confirmed again by the cancel call.
  const [insideWindow, setInsideWindow] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [done, setDone] = useState(false);

  const find = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true); setError("");
    try {
      const res = await fetch("/api/manage/lookup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ref, fullName }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data?.error || "We couldn't find that booking."); setBooking(null); }
      else { setBooking(data.booking); setInsideWindow(!!data.insideFreeWindow); }
    } catch (err) {
      logger.error("Cancel lookup failed:", err);
      setError("We couldn't reach the booking service. Please try again.");
    } finally { setLoading(false); }
  };

  const cancel = async () => {
    setConfirming(true); setError("");
    try {
      const res = await fetch("/api/manage/cancel", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ref, fullName }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data?.error || "We couldn't cancel that booking.");
      } else {
        setBooking(data.booking);
        if (typeof data.insideWindow === "boolean") setInsideWindow(data.insideWindow);
        setDone(true);
      }
    } catch (err) {
      logger.error("Cancel failed:", err);
      setError(`We couldn't reach the booking service. Please email ${COMPANY.email} and we will cancel it for you.`);
    } finally { setConfirming(false); }
  };

  const total = Number(booking?.total_price || 0).toFixed(2);
  const status = String(booking?.status || "").toLowerCase();
  const alreadyCancelled = !done && status === "cancelled";
  const completed = !done && status === "completed";

  return (
    <>
      <SiteHeader />
      <main className="min-h-[60vh] bg-slate-50 py-10 md:py-16 px-4 md:px-6 font-sans text-slate-900">
        <div className="max-w-2xl mx-auto">

          {done ? (
            /* ── done ─────────────────────────────────────────── */
            <section className="bg-white rounded-xl border border-slate-200 p-6 md:p-8">
              <CheckCircle2 className="w-8 h-8 text-emerald-600" aria-hidden="true" />
              <h1 className="mt-4 text-2xl md:text-3xl font-bold tracking-tight">Your booking is cancelled</h1>
              <p className="mt-1 font-mono text-slate-600">{booking?.booking_ref}</p>

              {/* The cancellation always succeeds. Only the promise about the
                  money changes, and it is never dressed up as more certain than
                  it is — an unkept refund promise is what turns a cancellation
                  into a complaint. */}
              <RefundNote insideWindow={insideWindow} total={total} done />

              <p className="mt-6 text-slate-600 leading-relaxed">
                A confirmation is on its way to your email, and your parking operator has been told. If you don&apos;t
                hear from us as described, reply to that email and we&apos;ll pick it up.
              </p>
            </section>
          ) : !booking ? (
            /* ── find the booking ───────────────────────────── */
            <section className="bg-white rounded-xl border border-slate-200 p-6 md:p-8">
              <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Cancel a booking</h1>
              <p className="mt-2 text-slate-600 leading-relaxed">
                Cancelling is free up to 24 hours before your drop-off time. You can cancel at any time; inside 24
                hours we review the refund and come back to you within one working day.
              </p>

              <form onSubmit={find} className="mt-6 space-y-4">
                <div>
                  <label htmlFor="cancel-ref" className={labelCls}>Booking reference</label>
                  <input
                    id="cancel-ref"
                    value={ref}
                    onChange={(e) => setRef(e.target.value.toUpperCase())}
                    required
                    autoComplete="off"
                    placeholder="e.g. APD-ABC123"
                    className={`${inputCls} font-mono uppercase placeholder:normal-case placeholder:font-sans`}
                  />
                </div>
                <div>
                  <label htmlFor="cancel-name" className={labelCls}>Lead passenger name</label>
                  <input
                    id="cancel-name"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    required
                    autoComplete="name"
                    className={inputCls}
                  />
                  <p className="mt-1.5 text-sm text-slate-500">Your surname is enough.</p>
                </div>

                {error && (
                  <p role="alert" className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2.5 text-sm text-red-700">
                    <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" aria-hidden="true" /> {error}
                  </p>
                )}

                <button
                  type="submit"
                  disabled={loading || !ref.trim() || fullName.trim().length < 2}
                  className="w-full h-12 rounded-lg bg-[#0B1120] hover:bg-slate-800 disabled:bg-slate-300 text-white font-semibold flex items-center justify-center gap-2"
                >
                  {loading ? <><Loader2 className="w-5 h-5 animate-spin" aria-hidden="true" /> Finding your booking…</> : "Find my booking"}
                </button>
              </form>
            </section>
          ) : alreadyCancelled || completed ? (
            /* ── nothing to cancel ──────────────────────────── */
            <section className="bg-white rounded-xl border border-slate-200 p-6 md:p-8">
              <h1 className="text-2xl md:text-3xl font-bold tracking-tight">
                {alreadyCancelled ? "This booking is already cancelled" : "This booking has already been completed"}
              </h1>
              <p className="mt-1 font-mono text-slate-600">{booking.booking_ref}</p>
              <p className="mt-4 text-slate-600 leading-relaxed">
                {alreadyCancelled
                  ? "There's nothing more to do. If you're waiting on a refund and haven't heard from us, email "
                  : "The parking has already taken place, so it can't be cancelled here. If something went wrong, email "}
                <a href={`mailto:${COMPANY.email}`} className="text-slate-900 underline underline-offset-4">{COMPANY.email}</a>.
              </p>
            </section>
          ) : (
            /* ── confirm ────────────────────────────────────── */
            <section className="bg-white rounded-xl border border-slate-200">
              <div className="p-5 md:p-7 border-b border-slate-200">
                <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Cancel this booking?</h1>
                <p className="mt-1 font-mono text-slate-600">{booking.booking_ref}</p>
              </div>

              <dl className="divide-y divide-slate-100">
                <Detail label="Lead passenger" value={booking.full_name} />
                <Detail label="Airport" value={`${booking.airport || ""}${booking.terminal ? `, ${booking.terminal}` : ""}`} />
                <Detail label="Drop-off" value={`${formatDate(booking.dropoff_date)}${booking.dropoff_time ? `, ${booking.dropoff_time}` : ""}`} />
                <Detail label="Pick-up" value={`${formatDate(booking.pickup_date)}${booking.pickup_time ? `, ${booking.pickup_time}` : ""}`} />
                <Detail label="Car" value={booking.license_plate || "—"} />
              </dl>

              <div className="p-5 md:p-7 border-t border-slate-200">
                <RefundNote insideWindow={insideWindow} total={total} />

                {error && (
                  <p role="alert" className="mt-4 flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2.5 text-sm text-red-700">
                    <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" aria-hidden="true" /> {error}
                  </p>
                )}

                <div className="mt-6 flex flex-col sm:flex-row gap-3">
                  <button
                    type="button"
                    onClick={cancel}
                    disabled={confirming}
                    className="h-12 px-5 rounded-lg bg-red-600 hover:bg-red-700 disabled:bg-slate-300 text-white font-semibold inline-flex items-center justify-center gap-2"
                  >
                    {confirming ? <><Loader2 className="w-5 h-5 animate-spin" aria-hidden="true" /> Cancelling…</> : "Yes, cancel this booking"}
                  </button>
                  <Link
                    href="/manage"
                    className="h-12 px-5 rounded-lg border border-slate-300 bg-white text-slate-900 font-semibold inline-flex items-center justify-center hover:bg-slate-50"
                  >
                    Keep my booking
                  </Link>
                </div>
              </div>
            </section>
          )}

          <p className="mt-6 text-sm text-slate-500">
            Trouble cancelling? Email{" "}
            <a href={`mailto:${COMPANY.email}`} className="text-slate-700 underline underline-offset-4">{COMPANY.email}</a>{" "}
            or call {COMPANY.phoneDisplay}.
          </p>
        </div>
      </main>
      <SiteFooter />
    </>
  );
}

/** What happens to the money. Before confirming it says what WILL happen; after,
 *  what has happened. Inside the 24-hour window the refund is reviewed, never
 *  promised. */
function RefundNote({ insideWindow, total, done = false }: { insideWindow: boolean; total: string; done?: boolean }) {
  if (insideWindow) {
    return (
      <div className={`${done ? "mt-6" : ""} rounded-lg border border-amber-200 bg-amber-50 p-4`}>
        <p className="font-semibold text-amber-900">Refund of £{total} {done ? "is" : "will be"} reviewed</p>
        <p className="mt-1 text-sm text-amber-900 leading-relaxed">
          Your drop-off is less than 24 hours away, so the refund is reviewed rather than issued automatically.
          We&apos;ll email you about it within one working day. You won&apos;t be charged anything more.
        </p>
      </div>
    );
  }
  return (
    <div className={`${done ? "mt-6" : ""} rounded-lg border border-emerald-200 bg-emerald-50 p-4`}>
      <p className="font-semibold text-emerald-900">£{total} {done ? "is being" : "will be"} refunded in full</p>
      <p className="mt-1 text-sm text-emerald-900 leading-relaxed">
        Back to the card you paid with, normally within 5 to 10 working days depending on your bank. There&apos;s no
        cancellation fee.
      </p>
    </div>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div className="px-5 md:px-7 py-3 grid grid-cols-[120px_1fr] sm:grid-cols-[160px_1fr] gap-3">
      <dt className="text-sm text-slate-500 pt-0.5">{label}</dt>
      <dd className="text-slate-900 min-w-0 break-words">{value}</dd>
    </div>
  );
}

export default function CancelPage() {
  // useSearchParams needs a Suspense boundary in the App Router, or the whole
  // route opts out of static rendering and the build warns.
  return (
    <Suspense fallback={
      <main className="min-h-screen bg-slate-50 flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-slate-400" />
      </main>
    }>
      <CancelInner />
    </Suspense>
  );
}
