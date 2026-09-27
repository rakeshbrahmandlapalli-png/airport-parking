"use client";

import { logger } from "@/app/lib/logger";
import { useState } from "react";
import { Loader2, Printer, AlertCircle, Phone, Pencil } from "lucide-react";
import Link from "next/link";
import SiteHeader from "@/components/site/SiteHeader";
import SiteFooter from "@/components/site/SiteFooter";
import { sanitizeHtml } from "../lib/sanitizeHtml";
import { COMPANY } from "../lib/company";

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
    weekday: "short", day: "numeric", month: "short", year: "numeric",
  });
}

const STATUS: Record<string, { label: string; cls: string }> = {
  pending:   { label: "Awaiting payment", cls: "bg-amber-50 text-amber-800 border-amber-200" },
  confirmed: { label: "Confirmed",        cls: "bg-emerald-50 text-emerald-800 border-emerald-200" },
  parked:    { label: "Car parked",       cls: "bg-blue-50 text-blue-800 border-blue-200" },
  completed: { label: "Completed",        cls: "bg-slate-100 text-slate-700 border-slate-200" },
  cancelled: { label: "Cancelled",        cls: "bg-red-50 text-red-700 border-red-200" },
};

const inputCls = "w-full h-12 rounded-lg border border-slate-300 bg-white px-3.5 text-base text-slate-900 placeholder:text-slate-400 outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-600/20 shadow-[0_0_0_1000px_#ffffff_inset] [-webkit-text-fill-color:#0f172a] placeholder:[-webkit-text-fill-color:#94a3b8]";
const labelCls = "block text-sm font-medium text-slate-700 mb-1.5";

export default function ManageBooking() {
  const [ref, setRef] = useState("");
  const [fullName, setFullName] = useState("");
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [booking, setBooking] = useState<any>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [company, setCompany] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [isEditingFlight, setIsEditingFlight] = useState(false);
  const [newFlightNum, setNewFlightNum] = useState("");
  const [flightUpdateLoading, setFlightUpdateLoading] = useState(false);
  const [flightError, setFlightError] = useState("");

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
        setError(result.error || "We couldn't find that booking. Please check your details and try again.");
      } else {
        setBooking(result.booking);
        setNewFlightNum(result.booking.flight_number || "");
        if (result.company) setCompany(result.company);
      }
    } catch (err) {
      logger.error("Search Error:", err);
      setError("We couldn't reach the booking service. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateFlight = async () => {
    setFlightError("");
    if (!newFlightNum.trim() || newFlightNum.toUpperCase() === booking.flight_number) {
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
    } catch (err) {
      setFlightError(err instanceof Error && err.message !== "Update failed" ? err.message : "We couldn't update your flight number. Please try again.");
    } finally {
      setFlightUpdateLoading(false);
    }
  };

  const status = STATUS[String(booking?.status || "").toLowerCase()] ?? null;
  const canCancel = booking && !["cancelled", "completed"].includes(String(booking.status || "").toLowerCase());
  const isLuton = String(booking?.airport || "").toLowerCase().includes("luton");
  const phones = [company?.phone_number, company?.phone_number_2].filter(Boolean) as string[];

  return (
    <>
      <SiteHeader />
      <main className="min-h-[60vh] bg-slate-50 py-10 md:py-16 px-4 md:px-6 font-sans text-slate-900">

        <style>{`
          @media print {
            body * { visibility: hidden; }
            #print-section, #print-section * { visibility: visible; }
            #print-section {
              position: absolute; left: 0; top: 0; width: 100%;
              background-color: white !important;
            }
            #print-section p, #print-section span, #print-section h2, #print-section h3, #print-section div, #print-section dd, #print-section dt { color: black !important; }
            .print\\:hidden, .print-hidden { display: none !important; }
            .print\\:block { display: block !important; }
          }
        `}</style>

        <div className="max-w-2xl mx-auto w-full">
          {!booking ? (
            <div className="bg-white rounded-xl border border-slate-200 p-6 md:p-8 print-hidden">
              <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Manage your booking</h1>
              <p className="mt-2 text-slate-600">
                Enter your booking reference and the lead passenger&apos;s name. Both are in your confirmation email.
              </p>

              <form onSubmit={findBooking} className="mt-6 space-y-4">
                <div>
                  <label htmlFor="manage-ref" className={labelCls}>Booking reference</label>
                  <input
                    id="manage-ref" type="text" placeholder="e.g. APD-ABC123" autoComplete="off" required
                    className={`${inputCls} uppercase placeholder:normal-case`}
                    value={ref}
                    onChange={(e) => setRef(e.target.value.toUpperCase())}
                  />
                </div>
                <div>
                  <label htmlFor="manage-name" className={labelCls}>Lead passenger name</label>
                  <input
                    id="manage-name" type="text" autoComplete="name" required
                    className={inputCls}
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
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
                  className="w-full h-12 rounded-lg bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 text-white font-semibold flex items-center justify-center gap-2"
                >
                  {loading ? <><Loader2 className="w-5 h-5 animate-spin" aria-hidden="true" /> Finding your booking…</> : "Find my booking"}
                </button>
              </form>

              <p className="mt-6 text-sm text-slate-500">
                Want to cancel? <Link href="/cancel" className="text-slate-700 underline underline-offset-4">Cancel a booking</Link>.
                Can&apos;t find your reference? Call {COMPANY.phoneDisplay} or email{" "}
                <a href={`mailto:${COMPANY.email}`} className="text-slate-700 underline underline-offset-4">{COMPANY.email}</a>.
              </p>
            </div>
          ) : (
            <div id="print-section" className="space-y-4 w-full">
              <section className="bg-white rounded-xl border border-slate-200">
                <div className="p-5 md:p-7 border-b border-slate-200 flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="text-sm text-slate-500">Booking reference</p>
                    <h1 className="mt-0.5 text-2xl md:text-3xl font-bold tracking-tight font-mono">{booking.booking_ref}</h1>
                  </div>
                  {status && (
                    <span className={`rounded-md border px-2.5 py-1 text-sm font-medium ${status.cls}`}>{status.label}</span>
                  )}
                </div>

                <dl className="divide-y divide-slate-100">
                  <Row label="Parking">
                    {booking.service_type || "Airport parking"}{company?.name ? ` with ${company.name}` : ""}
                  </Row>
                  <Row label="Airport">
                    {booking.airport}{booking.terminal ? `, ${booking.terminal}` : ""}
                  </Row>
                  <Row label="Drop-off">
                    {formatDate(booking.dropoff_date)}{booking.dropoff_time ? `, ${booking.dropoff_time}` : ""}
                  </Row>
                  <Row label="Pick-up">
                    {formatDate(booking.pickup_date)}{booking.pickup_time ? `, ${booking.pickup_time}` : ""}
                  </Row>
                  <Row label="Return flight">
                    {isEditingFlight ? (
                      <span className="flex flex-wrap items-center gap-2 print-hidden">
                        <label htmlFor="flight-edit" className="sr-only">Return flight number</label>
                        <input
                          id="flight-edit" type="text" value={newFlightNum}
                          onChange={(e) => setNewFlightNum(e.target.value.toUpperCase())}
                          className="h-10 w-36 rounded-lg border border-slate-300 px-3 text-base uppercase placeholder:normal-case shadow-[0_0_0_1000px_#ffffff_inset] [-webkit-text-fill-color:#0f172a] placeholder:[-webkit-text-fill-color:#94a3b8]"
                          placeholder="e.g. EZY123"
                        />
                        <button type="button" onClick={handleUpdateFlight} disabled={flightUpdateLoading} className="h-10 px-3.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold inline-flex items-center gap-1.5">
                          {flightUpdateLoading && <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />} Save
                        </button>
                        <button type="button" onClick={() => { setIsEditingFlight(false); setFlightError(""); setNewFlightNum(booking.flight_number || ""); }} className="h-10 px-3.5 rounded-lg border border-slate-300 text-sm font-medium text-slate-700 hover:bg-slate-50">
                          Cancel
                        </button>
                      </span>
                    ) : (
                      <span className="flex items-center gap-3">
                        {booking.flight_number || <span className="text-slate-500">Not added</span>}
                        {canCancel && (
                          <button type="button" onClick={() => setIsEditingFlight(true)} className="inline-flex items-center gap-1 text-sm font-medium text-blue-700 hover:underline underline-offset-4 print-hidden">
                            <Pencil className="w-3.5 h-3.5" aria-hidden="true" /> {booking.flight_number ? "Change" : "Add"}
                          </button>
                        )}
                      </span>
                    )}
                    {flightError && <span role="alert" className="block mt-1.5 text-sm text-red-600">{flightError}</span>}
                  </Row>
                  <Row label="Lead passenger">{booking.full_name}</Row>
                  <Row label="Car">
                    <span className="font-mono uppercase">{booking.license_plate}</span>
                    {booking.car_make ? <span className="text-slate-600">, {booking.car_make}</span> : null}
                  </Row>
                  <Row label="Total paid">
                    <span className="font-semibold tabular-nums">£{Number(booking.total_price).toFixed(2)}</span>
                  </Row>
                </dl>
              </section>

              {phones.length > 0 && (
                <section className="bg-white rounded-xl border border-slate-200 p-5 md:p-7">
                  <h2 className="text-lg font-semibold">Your operator{company?.name ? `: ${company.name}` : ""}</h2>
                  <p className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1">
                    <Phone className="w-4 h-4 text-slate-400" aria-hidden="true" />
                    {phones.map((ph) => (
                      <a key={ph} href={`tel:${ph.replace(/\s+/g, "")}`} className="font-medium text-slate-900 hover:underline underline-offset-4">{ph}</a>
                    ))}
                  </p>
                  <p className="mt-2 text-sm text-slate-600">Call them on the day, or if you need to change your dates.</p>
                </section>
              )}

              {/* Printed only: the instructions to have in hand on the day. */}
              <section className="hidden print:block rounded-xl border border-slate-200 p-6">
                <h2 className="font-bold mb-4">Arrival and return instructions</h2>
                {company ? (
                  <div className="space-y-4 text-sm">
                    <div>
                      <p className="font-semibold mb-1">On arrival</p>
                      <div
                        className="whitespace-pre-wrap"
                        dangerouslySetInnerHTML={{
                          __html: sanitizeHtml(isLuton
                            ? (company.on_arrival_ltn || company.on_arrival || "See your confirmation email.")
                            : (company.on_arrival_lhr || company.on_arrival || "See your confirmation email."))
                        }}
                      />
                    </div>
                    <div>
                      <p className="font-semibold mb-1">On return</p>
                      <div
                        className="whitespace-pre-wrap"
                        dangerouslySetInnerHTML={{
                          __html: sanitizeHtml(isLuton
                            ? (company.on_return_ltn || company.on_return || "See your confirmation email.")
                            : (company.on_return_lhr || company.on_return || "See your confirmation email."))
                        }}
                      />
                    </div>
                  </div>
                ) : (
                  <p className="text-sm">See your confirmation email for drop-off and pick-up instructions.</p>
                )}
              </section>

              {/* Dates are NOT changed here.
                  The operator holds the car and the yard space, so they are the
                  only ones who can say whether a different date is possible.
                  Letting the customer move a date on this page and take payment
                  for it created bookings the operator had never agreed to.
                  Everything routes to them; we are the last resort, not the
                  first. */}
              {canCancel && (
                <section className="print-hidden bg-white rounded-xl border border-slate-200 p-5 md:p-7">
                  <h2 className="text-lg font-semibold">Need to change your dates?</h2>
                  <p className="mt-2 text-slate-600 leading-relaxed">
                    Call your operator on the number {phones.length > 0 ? "above" : "in your confirmation email"}. They hold
                    your space, so they&apos;re the only ones who can arrange a change or an extension. If you can&apos;t reach
                    them, email <a href={`mailto:${COMPANY.email}`} className="text-slate-900 underline underline-offset-4">{COMPANY.email}</a>{" "}
                    and we&apos;ll step in.
                  </p>
                </section>
              )}

              <div className="flex flex-col sm:flex-row gap-3 print-hidden">
                <button type="button" onClick={() => window.print()} className="h-11 px-5 rounded-lg border border-slate-300 bg-white text-sm font-semibold text-slate-900 hover:bg-slate-50 inline-flex items-center justify-center gap-2">
                  <Printer className="w-4 h-4" aria-hidden="true" /> Print booking
                </button>
                {/* Always offered while the booking is live. This button used to
                    disappear inside 24 hours and be replaced by "Contact Support",
                    the dead end that produced a Letter Before Action. The 24-hour
                    rule decides the REFUND, not whether someone may cancel. */}
                {canCancel && (
                  <Link href={`/cancel?ref=${booking.booking_ref}`} className="h-11 px-5 rounded-lg border border-red-200 bg-white text-sm font-semibold text-red-700 hover:bg-red-50 inline-flex items-center justify-center">
                    Cancel booking
                  </Link>
                )}
                <button type="button" onClick={() => { setBooking(null); setCompany(null); setRef(""); setFullName(""); setIsEditingFlight(false); setFlightError(""); }} className="sm:ml-auto h-11 px-5 rounded-lg text-sm font-medium text-slate-600 hover:text-slate-900">
                  Look up another booking
                </button>
              </div>
            </div>
          )}
        </div>
      </main>
      <SiteFooter />
    </>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="px-5 md:px-7 py-3.5 grid grid-cols-[120px_1fr] sm:grid-cols-[160px_1fr] gap-3">
      <dt className="text-sm text-slate-500 pt-0.5">{label}</dt>
      <dd className="text-slate-900 min-w-0 break-words">{children}</dd>
    </div>
  );
}
