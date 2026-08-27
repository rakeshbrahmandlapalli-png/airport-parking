"use client";

import { useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft, Loader2, AlertTriangle, CheckCircle2, XCircle,
  Ticket, Calendar, Car, ShieldCheck, Mail,
} from "lucide-react";
import { logger } from "@/app/lib/logger";

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

function CancelInner() {
  const params = useSearchParams();

  // The reference arrives in the link from the manage page, so it is filled in
  // already. The name is still required — a reference alone is guessable, and
  // cancelling a stranger's parking is a far worse failure than one more field.
  // Read straight into the initial state rather than through an effect, so the
  // field is never briefly empty and there is no second render to go wrong.
  const [ref, setRef] = useState(() => (params.get("ref") || "").toUpperCase());
  const [fullName, setFullName] = useState("");
  const [booking, setBooking] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [tooLate, setTooLate] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [done, setDone] = useState(false);

  const find = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true); setError(""); setTooLate(false);
    try {
      const res = await fetch("/api/manage/lookup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ref, fullName }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data?.error || "Reservation not found."); setBooking(null); }
      else setBooking(data.booking);
    } catch (err) {
      logger.error("Cancel lookup failed:", err);
      setError("We couldn't reach the booking service. Please try again.");
    } finally { setLoading(false); }
  };

  const cancel = async () => {
    setConfirming(true); setError(""); setTooLate(false);
    try {
      const res = await fetch("/api/manage/cancel", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ref, fullName }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data?.error || "We couldn't cancel that booking.");
        if (data?.tooLate) setTooLate(true);
      } else {
        setBooking(data.booking);
        setDone(true);
      }
    } catch (err) {
      logger.error("Cancel failed:", err);
      setError("We couldn't reach the booking service. Please email info@aeroparkdirect.co.uk and we will cancel it for you.");
    } finally { setConfirming(false); }
  };

  const total = Number(booking?.total_price || 0).toFixed(2);

  return (
    <main className="min-h-screen bg-slate-50 py-12 md:py-20 px-4 md:px-6 font-sans selection:bg-blue-200">
      <div className="max-w-2xl mx-auto">

        <Link href="/manage" className="inline-flex items-center gap-2 text-slate-400 font-black text-[10px] uppercase tracking-widest hover:text-blue-600 transition-colors group mb-8">
          <ArrowLeft className="w-4 h-4 transition-transform group-hover:-translate-x-1" />
          Back to my booking
        </Link>

        {/* ── done ─────────────────────────────────────────── */}
        {done ? (
          <div className="bg-white rounded-[2rem] shadow-xl border border-slate-100 overflow-hidden">
            <div className="p-8 md:p-10 text-center">
              <div className="w-16 h-16 bg-emerald-50 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-6">
                <CheckCircle2 className="w-8 h-8" />
              </div>
              <h1 className="text-2xl md:text-3xl font-black tracking-tight text-slate-900 mb-2">
                Your booking is cancelled
              </h1>
              <p className="text-slate-500 font-mono font-bold mb-8">{booking?.booking_ref}</p>

              <div className="bg-slate-50 border border-slate-100 rounded-2xl p-6 text-left space-y-3">
                <div className="flex justify-between items-baseline">
                  <span className="text-slate-500 text-sm font-bold">Refund</span>
                  <span className="text-2xl font-black text-slate-900">£{total}</span>
                </div>
                <p className="text-sm text-slate-500 leading-relaxed">
                  Back to the card you paid with, normally within <strong className="text-slate-700">5 to 10 working days</strong> depending
                  on your bank. Nothing further is needed from you and you will not be charged anything more.
                </p>
              </div>

              <p className="text-sm text-slate-500 mt-6">
                A confirmation is on its way to your email. If the refund has not arrived
                in that time, reply to it and we will chase it.
              </p>
            </div>
          </div>
        ) : !booking ? (
          /* ── find the booking ───────────────────────────── */
          <div className="bg-white rounded-[2rem] shadow-xl border border-slate-100 overflow-hidden">
            <div className="p-8 md:p-10">
              <h1 className="text-2xl md:text-3xl font-black tracking-tight text-slate-900 mb-2">
                Cancel a booking
              </h1>
              <p className="text-slate-500 mb-8">
                Free of charge up to 24 hours before your drop-off.
              </p>

              <form onSubmit={find} className="space-y-5">
                <div>
                  <label className="block text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 mb-2">
                    Booking reference
                  </label>
                  <input
                    value={ref}
                    onChange={(e) => setRef(e.target.value.toUpperCase())}
                    required
                    placeholder="APD-00000"
                    className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl font-mono font-bold text-slate-900 outline-none focus:border-blue-500 focus:bg-white transition-all"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 mb-2">
                    Lead passenger name
                  </label>
                  <input
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    required
                    placeholder="As it appears on the booking"
                    className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl font-bold text-slate-900 outline-none focus:border-blue-500 focus:bg-white transition-all"
                  />
                </div>

                {error && (
                  <div className="flex items-start gap-3 p-4 bg-red-50 border border-red-100 rounded-2xl text-red-700 text-sm font-semibold">
                    <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" /> {error}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-slate-900 hover:bg-slate-800 disabled:bg-slate-300 text-white font-black rounded-2xl py-5 uppercase tracking-[0.2em] text-xs transition-all flex items-center justify-center gap-3"
                >
                  {loading
                    ? (<><Loader2 className="w-4 h-4 animate-spin" /> Finding your booking</>)
                    : (<>Find my booking</>)}
                </button>
              </form>
            </div>
          </div>
        ) : (
          /* ── confirm ────────────────────────────────────── */
          <div className="bg-white rounded-[2rem] shadow-xl border border-slate-100 overflow-hidden">
            <div className="p-6 md:p-8 bg-slate-900 text-white">
              <p className="text-[10px] font-black uppercase tracking-[0.3em] text-red-400 mb-1">
                Confirm cancellation
              </p>
              <h1 className="text-2xl md:text-4xl font-black tracking-tighter font-mono">
                {booking.booking_ref}
              </h1>
            </div>

            <div className="p-6 md:p-8 space-y-5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Detail icon={<Ticket className="w-4 h-4" />} label="Lead passenger" value={booking.full_name} />
                <Detail icon={<Car className="w-4 h-4" />} label="Vehicle" value={booking.license_plate || "—"} />
                <Detail icon={<Calendar className="w-4 h-4" />} label="Drop-off" value={`${formatDate(booking.dropoff_date)}${booking.dropoff_time ? ` · ${booking.dropoff_time}` : ""}`} />
                <Detail icon={<Calendar className="w-4 h-4" />} label="Return" value={`${formatDate(booking.pickup_date)}${booking.pickup_time ? ` · ${booking.pickup_time}` : ""}`} />
              </div>

              <div className="bg-emerald-50 border border-emerald-100 rounded-2xl p-5 flex items-start gap-3">
                <ShieldCheck className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                <div>
                  <p className="font-black text-slate-900">£{total} refunded in full</p>
                  <p className="text-sm text-slate-600 mt-1 leading-relaxed">
                    Back to the card you paid with, normally within 5 to 10 working days.
                    No cancellation fee.
                  </p>
                </div>
              </div>

              {error && (
                <div className="flex items-start gap-3 p-4 bg-red-50 border border-red-100 rounded-2xl text-red-700 text-sm font-semibold">
                  <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                  <div>
                    {error}
                    {tooLate && (
                      <Link href="/contact" className="block mt-2 underline font-black">
                        Contact us
                      </Link>
                    )}
                  </div>
                </div>
              )}

              <div className="flex flex-col sm:flex-row gap-3 pt-2">
                <button
                  onClick={cancel}
                  disabled={confirming}
                  className="flex-1 bg-red-600 hover:bg-red-700 disabled:bg-slate-300 text-white font-black rounded-2xl py-5 uppercase tracking-[0.2em] text-xs transition-all flex items-center justify-center gap-3"
                >
                  {confirming
                    ? (<><Loader2 className="w-4 h-4 animate-spin" /> Cancelling</>)
                    : (<><XCircle className="w-4 h-4" /> Yes, cancel this booking</>)}
                </button>
                <Link
                  href="/manage"
                  className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-black rounded-2xl py-5 uppercase tracking-[0.2em] text-xs transition-all flex items-center justify-center"
                >
                  Keep my booking
                </Link>
              </div>
            </div>
          </div>
        )}

        <p className="text-center text-sm text-slate-400 mt-8 flex items-center justify-center gap-2">
          <Mail className="w-3.5 h-3.5" />
          Trouble cancelling? Email{" "}
          <a href="mailto:info@aeroparkdirect.co.uk" className="text-blue-600 font-bold hover:underline">
            info@aeroparkdirect.co.uk
          </a>
        </p>
      </div>
    </main>
  );
}

function Detail({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="bg-slate-50 border border-slate-100 rounded-2xl p-4">
      <div className="flex items-center gap-2 text-slate-400 mb-1.5">
        {icon}
        <span className="text-[10px] font-black uppercase tracking-[0.15em]">{label}</span>
      </div>
      <p className="font-bold text-slate-900 break-words">{value}</p>
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
