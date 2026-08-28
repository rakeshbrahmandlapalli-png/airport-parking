"use client";

import { logger } from "@/app/lib/logger";
import { useState, useEffect } from "react";
import {
  Ticket, Calendar, Loader2, ArrowRight, Printer, User, MapPin,
  CheckCircle2, Car, PlaneTakeoff, Lock,
  ArrowLeft, Receipt, Search, AlertCircle, Edit2,
  XCircle, Phone, Info
} from "lucide-react";
import Link from "next/link";
import { sanitizeHtml } from "../lib/sanitizeHtml";

// Parse YYYY-MM-DD as a LOCAL date (avoids the UTC midnight day-shift bug).
function parseLocalDate(dateStr: string): Date {
  if (!dateStr) return new Date();
  const datePart = String(dateStr).split("T")[0];
  const [y, m, d] = datePart.split("-").map(Number);
  if (y && m && d) return new Date(y, m - 1, d);
  const fb = new Date(dateStr);
  return isNaN(fb.getTime()) ? new Date() : fb;
}

function formatDate(dateStr: string) {
  return parseLocalDate(dateStr).toLocaleDateString("en-GB", {
    day: "numeric", month: "short", year: "numeric",
  });
}

export default function ManageBooking() {
  const [ref, setRef] = useState("");
  const [fullName, setFullName] = useState("");
  const [booking, setBooking] = useState<any>(null);
  const [company, setCompany] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [isEditingFlight, setIsEditingFlight] = useState(false);
  const [newFlightNum, setNewFlightNum] = useState("");
  const [flightUpdateLoading, setFlightUpdateLoading] = useState(false);

  const findBooking = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    setBooking(null);
    setCompany(null);

    try {
      // Looked up server-side (service role) so the bookings table is never
      // exposed to the public key. Both ref AND name are required as proof.
      const res = await fetch("/api/manage/lookup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ref: ref.trim(), fullName: fullName.trim() }),
      });
      const result = await res.json();

      if (!res.ok || !result.booking) {
        setError(result.error || "Reservation not found. Please try again with different details.");
      } else {
        setBooking(result.booking);
        setNewFlightNum(result.booking.flight_number || "");
        if (result.company) setCompany(result.company);
      }
    } catch (err: any) {
      logger.error("Search Error:", err);
      setError("An error occurred while connecting to the booking service.");
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateFlight = async () => {
    if (!newFlightNum.trim() || newFlightNum === booking.flight_number) {
      setIsEditingFlight(false);
      return;
    }
    setFlightUpdateLoading(true);
    try {
      const upd = await fetch("/api/manage/update-flight", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ref: booking.booking_ref,
          fullName: booking.full_name,
          flightNumber: newFlightNum.toUpperCase(),
        }),
      });
      if (!upd.ok) { const e = await upd.json().catch(() => ({})); throw new Error(e.error || "Update failed"); }

      await fetch("/api/notify-admin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "FLIGHT_CHANGE",
          ref: booking.booking_ref,
          oldFlight: booking.flight_number,
          newFlight: newFlightNum.toUpperCase(),
        }),
      });

      setBooking({ ...booking, flight_number: newFlightNum.toUpperCase() });
      setIsEditingFlight(false);
    } catch (err: any) {
      alert("Failed to update flight details.");
    } finally {
      setFlightUpdateLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-slate-50 py-12 md:py-20 px-4 md:px-6 font-sans selection:bg-blue-200">

      <style>{`
        @media print {
          body * { visibility: hidden; }
          #print-section, #print-section * { visibility: visible; }
          #print-section {
            position: absolute; left: 0; top: 0; width: 100%;
            background-color: white !important;
          }
          #print-section p, #print-section span, #print-section h2, #print-section h3, #print-section div { color: black !important; }
          .print\\:hidden, .print-hidden { display: none !important; }
          .print\\:block { display: block !important; }
        }
      `}</style>

      <div className="max-w-3xl mx-auto mb-12 print-hidden">
        <Link href="/" className="inline-flex items-center gap-2 text-slate-400 font-black text-[10px] uppercase tracking-widest hover:text-blue-600 transition-colors group">
          <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" /> Return Home
        </Link>
      </div>

      <div className="max-w-2xl mx-auto relative z-10 w-full">
        {!booking ? (
          <div className="bg-white rounded-[2rem] md:rounded-[3rem] p-6 md:p-12 shadow-xl border border-slate-100 text-center relative overflow-hidden print-hidden">
            <div className="absolute top-0 right-0 w-64 h-64 bg-blue-500/5 rounded-full blur-[80px] pointer-events-none"></div>

            <div className="w-16 h-16 bg-blue-600 text-white rounded-2xl flex items-center justify-center mb-8 mx-auto shadow-lg shadow-blue-200 relative z-10">
              <Search className="w-8 h-8" />
            </div>
            <h1 className="text-2xl md:text-3xl font-black text-slate-900 mb-2 uppercase tracking-tight relative z-10">Manage Trip</h1>
            <p className="text-slate-500 font-bold text-xs md:text-sm mb-10 relative z-10">Provide either your reference or name to continue.</p>

            <form onSubmit={findBooking} className="space-y-5 text-left relative z-10">
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest ml-1 text-blue-600">Reference Number</label>
                <input
                  type="text" placeholder="APD-XXXXXX" autoComplete="off"
                  className="w-full p-4 md:p-5 bg-slate-50 rounded-2xl font-bold outline-none focus:ring-2 focus:ring-blue-500 transition-all text-slate-900 border border-transparent focus:bg-white uppercase shadow-[0_0_0_1000px_#f8fafc_inset] [-webkit-text-fill-color:#0f172a]"
                  value={ref}
                  onChange={(e) => setRef(e.target.value.toUpperCase())}
                />
              </div>

              <div className="relative py-2 flex items-center">
                <div className="flex-grow border-t border-slate-100"></div>
                <span className="flex-shrink mx-4 text-[9px] font-black text-slate-300 uppercase tracking-widest">OR</span>
                <div className="flex-grow border-t border-slate-100"></div>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Full Name</label>
                <input
                  type="text" placeholder="Enter name used for booking" autoComplete="off"
                  className="w-full p-4 md:p-5 bg-slate-50 rounded-2xl font-bold outline-none focus:ring-2 focus:ring-blue-500 transition-all text-slate-900 border border-transparent focus:bg-white shadow-[0_0_0_1000px_#f8fafc_inset] [-webkit-text-fill-color:#0f172a]"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                />
              </div>

              {error && (
                <div className="p-4 bg-red-50 rounded-xl border border-red-100 flex items-center gap-3">
                  <AlertCircle className="w-5 h-5 text-red-500 shrink-0" />
                  <p className="text-red-600 text-xs font-bold leading-relaxed">{error}</p>
                </div>
              )}

              <button
                type="submit"
                disabled={loading || (!ref.trim() && !fullName.trim())}
                className="w-full py-5 bg-blue-600 text-white rounded-2xl font-black text-sm uppercase tracking-[0.2em] hover:bg-blue-500 transition-all flex items-center justify-center gap-3 mt-6 disabled:opacity-50 disabled:bg-slate-300 active:scale-95"
              >
                {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <>Access My Booking <ArrowRight className="w-4 h-4" /></>}
              </button>
            </form>
          </div>
        ) : (
          <div id="print-section" className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500 w-full">
            <div className="bg-white rounded-[2rem] md:rounded-[3rem] shadow-2xl border border-slate-100 overflow-hidden">

              <div className="p-6 md:p-10 bg-slate-900 text-white flex flex-col md:flex-row justify-between items-start md:items-center gap-4 relative overflow-hidden">
                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-400 to-blue-600 print-hidden"></div>
                <div className="relative z-10 w-full flex justify-between items-center">
                  <div>
                    <div className="flex items-center gap-2 mb-1 print-hidden">
                      <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                      <p className="text-blue-400 font-black text-[10px] uppercase tracking-[0.3em]">Booking Active</p>
                    </div>
                    <h2 className="text-3xl md:text-5xl font-black tracking-tighter font-mono text-white print:text-black">{booking.booking_ref}</h2>
                  </div>
                  {/* Always offered, never hidden. This button used to disappear
                      inside 24 hours and be replaced by "Contact Support" — which
                      is the dead end that produced a Letter Before Action, because
                      the phone went unanswered. The 24-hour rule decides the
                      REFUND, not whether someone may cancel, and that is now
                      handled on the cancel page and in the API. */}
                  <div className="print-hidden">
                    <Link href={`/cancel?ref=${booking.booking_ref}`} className="px-4 py-2 bg-red-500/10 text-red-400 hover:bg-red-500 hover:text-white border border-red-500/20 rounded-lg text-xs font-black uppercase tracking-wider transition-all">
                      Cancel Booking
                    </Link>
                  </div>
                </div>
              </div>

              <div className="p-6 md:p-10 space-y-8">
                <div className="bg-slate-50 rounded-[2rem] p-6 border border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-5">
                  <div className="flex items-center gap-5">
                    <div className="w-14 h-14 bg-blue-100 text-blue-600 rounded-2xl flex items-center justify-center shrink-0">
                      <PlaneTakeoff className="w-6 h-6" />
                    </div>
                    <div>
                      <p className="text-slate-400 font-black text-[10px] uppercase tracking-widest mb-0.5">Location</p>
                      <p className="text-xl font-black text-slate-900 tracking-tight">{booking.airport}</p>
                      <p className="text-blue-600 font-black text-sm">{booking.terminal}</p>
                    </div>
                  </div>

                  <div className="pl-0 md:pl-6 md:border-l border-slate-200 w-full md:w-auto">
                    <p className="text-slate-400 font-black text-[10px] uppercase tracking-widest mb-1 flex items-center justify-between">
                      Return Flight Number
                      {!isEditingFlight && (
                        <button onClick={() => setIsEditingFlight(true)} className="text-blue-600 hover:text-blue-800 flex items-center gap-1 print-hidden">
                          <Edit2 className="w-3 h-3" /> Edit
                        </button>
                      )}
                    </p>
                    {isEditingFlight ? (
                      <div className="flex items-center gap-2 mt-1 print-hidden">
                        <input
                          type="text" value={newFlightNum}
                          onChange={(e) => setNewFlightNum(e.target.value)}
                          className="p-2 text-sm border border-slate-300 rounded-lg font-bold w-32 uppercase shadow-[0_0_0_1000px_#ffffff_inset] [-webkit-text-fill-color:#0f172a]"
                          placeholder="e.g. EZY123"
                        />
                        <button onClick={handleUpdateFlight} disabled={flightUpdateLoading} className="p-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
                          {flightUpdateLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                        </button>
                        <button onClick={() => setIsEditingFlight(false)} className="p-2 bg-slate-200 text-slate-600 rounded-lg hover:bg-slate-300">
                          <XCircle className="w-4 h-4" />
                        </button>
                      </div>
                    ) : (
                      <p className="text-xl font-black text-slate-900 tracking-tight">{booking.flight_number || "Not Provided"}</p>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-10">
                  <div className="space-y-6">
                    <div>
                      <p className="text-slate-400 font-black text-[10px] uppercase tracking-widest mb-2 flex items-center gap-2">
                        <User className="w-3.5 h-3.5 text-blue-500" /> Lead Passenger
                      </p>
                      <p className="text-xl font-black text-slate-900 tracking-tight">{booking.full_name}</p>
                    </div>
                    <div>
                      <p className="text-slate-400 font-black text-[10px] uppercase tracking-widest mb-2 flex items-center gap-2">
                        <Car className="w-3.5 h-3.5 text-blue-500" /> Vehicle Registered
                      </p>
                      <p className="text-xl font-black text-slate-900 tracking-tight uppercase">{booking.license_plate}</p>
                      <p className="text-sm font-bold text-slate-500">{booking.car_make}</p>
                    </div>
                  </div>

                  <div className="bg-slate-50 p-6 md:p-8 rounded-[2rem] border border-slate-100 flex flex-col justify-center items-start md:items-end">
                    <p className="text-slate-400 font-black text-[10px] uppercase tracking-widest mb-2">Total Paid</p>
                    <p className="text-4xl md:text-5xl font-black text-slate-900 tracking-tighter">£{Number(booking.total_price).toFixed(2)}</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-0 border-2 border-slate-100 rounded-[2.5rem] overflow-hidden">
                  <div className="p-4 md:p-8 bg-white border-r-2 border-slate-100">
                    <p className="text-[9px] font-black text-blue-600 uppercase tracking-[0.2em] mb-2">Drop-off</p>
                    <p className="text-sm md:text-lg font-black text-slate-900">{formatDate(booking.dropoff_date)}</p>
                    <p className="text-xl md:text-2xl font-black text-slate-900 mt-1">{booking.dropoff_time || "12:00"}</p>
                  </div>
                  <div className="p-4 md:p-8 bg-slate-50/50 flex flex-col items-end">
                    <p className="text-[9px] font-black text-slate-500 uppercase tracking-[0.2em] mb-2">Pick-up</p>
                    <p className="text-sm md:text-lg font-black text-slate-900 text-right">{formatDate(booking.pickup_date)}</p>
                    <p className="text-xl md:text-2xl font-black text-slate-900 mt-1">{booking.pickup_time || "12:00"}</p>
                  </div>
                </div>

                <div className="mt-8 bg-blue-50/50 border border-blue-100 rounded-[2rem] p-6 hidden print:block mb-8">
                  <h3 className="font-black text-blue-900 mb-4 flex items-center gap-2"><Info className="w-5 h-5" /> Arrival & Return Instructions</h3>
                  <div className="space-y-4">
                    {company ? (
                      <>
                        <div>
                          <p className="text-xs font-black text-blue-800 uppercase tracking-wider mb-1">Company Contact</p>
                          <p className="text-lg font-bold text-slate-900">
                            {company.phone_number || "Check Confirmation Email"}
                            {company.phone_number_2 ? ` / ${company.phone_number_2}` : ""}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs font-black text-blue-800 uppercase tracking-wider mb-1">On Arrival</p>
                          <div
                            className="text-sm text-slate-700 whitespace-pre-wrap"
                            dangerouslySetInnerHTML={{
                              __html: sanitizeHtml(booking.airport?.toLowerCase().includes("luton")
                                ? (company.on_arrival_ltn || company.on_arrival || "Refer to confirmation email")
                                : (company.on_arrival_lhr || company.on_arrival || "Refer to confirmation email"))
                            }}
                          />
                        </div>
                        <div>
                          <p className="text-xs font-black text-blue-800 uppercase tracking-wider mb-1">On Return</p>
                          <div
                            className="text-sm text-slate-700 whitespace-pre-wrap"
                            dangerouslySetInnerHTML={{
                              __html: sanitizeHtml(booking.airport?.toLowerCase().includes("luton")
                                ? (company.on_return_ltn || company.on_return || "Refer to confirmation email")
                                : (company.on_return_lhr || company.on_return || "Refer to confirmation email"))
                            }}
                          />
                        </div>
                      </>
                    ) : (
                      <p className="text-sm text-slate-700">Please refer to your confirmation email for specific drop-off and pick-up instructions.</p>
                    )}
                  </div>
                </div>

                {/* Dates are NOT changed here.
                    The operator holds the car and the yard space, so they are the
                    only ones who can say whether a different date is possible.
                    Letting the customer move a date on this page and take payment
                    for it created bookings the operator had never agreed to.
                    Everything routes to them; we are the last resort, not the
                    first. */}
                <div className="print-hidden bg-slate-50 border border-slate-200 rounded-[2rem] p-6">
                  <div className="flex items-start gap-4">
                    <div className="w-10 h-10 bg-white border border-slate-200 rounded-xl flex items-center justify-center shrink-0">
                      <Phone className="w-5 h-5 text-slate-500" />
                    </div>
                    <div>
                      <h3 className="font-black text-slate-900 tracking-tight mb-1">
                        Need to change your dates?
                      </h3>
                      <p className="text-sm text-slate-600 leading-relaxed">
                        Please call your operator directly on the number in your
                        confirmation email. They hold your space, so they are the
                        only ones who can arrange a change or an extension.
                      </p>
                      <p className="text-sm text-slate-500 leading-relaxed mt-3">
                        If you cannot reach them, email{" "}
                        <a href="mailto:info@aeroparkdirect.co.uk" className="text-blue-600 font-bold hover:underline">
                          info@aeroparkdirect.co.uk
                        </a>{" "}
                        and we will step in.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 print-hidden w-full">
              <button onClick={() => window.print()} className="w-full py-5 bg-white border border-slate-200 text-slate-900 rounded-2xl font-black text-xs uppercase tracking-widest flex items-center justify-center gap-3">
                <Printer className="w-4 h-4" /> Print PDF Voucher
              </button>
              <button onClick={() => { setBooking(null); setCompany(null); setRef(""); setFullName(""); }} className="w-full py-5 bg-slate-900 text-white rounded-2xl font-black text-xs uppercase tracking-widest">
                Lookup Another
              </button>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}