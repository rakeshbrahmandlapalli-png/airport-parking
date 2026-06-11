"use client";

// ============================================================================
// /preview — Landing page redesign concept (single-file, drop-in preview).
// Visit http://localhost:3000/preview
//
// Design rules honoured (CLAUDE.md):
//  • No glassmorphism / backdrop blurs — depth comes from layered SOLID panels,
//    hairline borders and coloured shadow glows.
//  • No radius beyond rounded-2xl. Deep solid surfaces (#060A14 / #0B1120 /
//    #0F1523). High contrast everywhere.
//  • Aero avatar is the mascot — integrated, not decorative confetti.
// ============================================================================

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Plane, ShieldCheck, Zap, ChevronRight, Star, Clock, KeyRound,
  CalendarDays, ArrowRight, CheckCircle2, Sparkles, PhoneCall,
} from "lucide-react";

// ─── THE MASCOT (Aero avatar, brand asset) ────────────────────────────────────

function AeroFace({ size = 56, scanning = false }: { size?: number; scanning?: boolean }) {
  const eye = Math.round(size * 0.11);
  const eyeH = Math.round(size * 0.3);
  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      <div className="absolute inset-0 rounded-2xl bg-blue-500/40 blur-xl" aria-hidden="true" />
      <div
        className="relative flex h-full w-full items-center justify-center overflow-hidden rounded-2xl border border-blue-300/30 bg-gradient-to-br from-blue-400 via-blue-600 to-blue-800 shadow-[0_0_30px_rgba(37,99,235,0.45)]"
      >
        {scanning && (
          <div className="absolute left-0 top-0 h-[2px] w-full bg-white/90 shadow-[0_0_12px_#fff]" style={{ animation: "aeroScan 2.2s ease-in-out infinite" }} />
        )}
        <div className="z-10 flex items-center justify-center" style={{ gap: Math.max(4, size * 0.1) }}>
          <span className="rounded-full bg-white shadow-[0_0_12px_rgba(255,255,255,0.95)]" style={{ width: eye, height: eyeH }} />
          <span className="rounded-full bg-white shadow-[0_0_12px_rgba(255,255,255,0.95)]" style={{ width: eye, height: eyeH }} />
        </div>
      </div>
    </div>
  );
}

// ─── TRUSTPILOT STARS ─────────────────────────────────────────────────────────

function TrustStars({ size = "md" }: { size?: "sm" | "md" }) {
  const box = size === "sm" ? "h-5 w-5" : "h-7 w-7";
  const icon = size === "sm" ? "h-3.5 w-3.5" : "h-4.5 w-4.5";
  return (
    <div className="flex gap-[3px]">
      {[0, 1, 2, 3, 4].map((i) => (
        <span key={i} className={`flex ${box} items-center justify-center bg-[#00B67A]`}>
          <Star className={`${icon} fill-white text-white`} style={size === "sm" ? { width: 12, height: 12 } : { width: 15, height: 15 }} />
        </span>
      ))}
    </div>
  );
}

// ─── BOOKING CONSOLE ──────────────────────────────────────────────────────────

type Airport = "Luton (LTN)" | "Heathrow (LHR)";
type Service = "meet-greet" | "park-ride";

const inputCls =
  "h-12 w-full rounded-xl border border-slate-700 bg-[#0B1220] px-3.5 text-sm font-bold text-white outline-none transition-colors [color-scheme:dark] hover:border-slate-500 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/30 touch-manipulation";

function addDays(base: string, days: number): string {
  const [y, m, d] = base.split("-").map(Number);
  const dt = new Date(y, m - 1, d);
  dt.setDate(dt.getDate() + days);
  const mm = String(dt.getMonth() + 1).padStart(2, "0");
  const dd = String(dt.getDate()).padStart(2, "0");
  return `${dt.getFullYear()}-${mm}-${dd}`;
}

function BookingConsole() {
  const router = useRouter();

  const [airport, setAirport] = useState<Airport>("Luton (LTN)");
  const [service, setService] = useState<Service>("meet-greet");
  const [dropDate, setDropDate] = useState("");
  const [pickDate, setPickDate] = useState("");
  const [dropTime, setDropTime] = useState("10:00");
  const [pickTime, setPickTime] = useState("10:00");
  const [scanning, setScanning] = useState(false);

  // Defaults set after mount so SSR markup can never mismatch around midnight.
  useEffect(() => {
    const now = new Date();
    const mm = String(now.getMonth() + 1).padStart(2, "0");
    const dd = String(now.getDate()).padStart(2, "0");
    const today = `${now.getFullYear()}-${mm}-${dd}`;
    setDropDate((v) => v || addDays(today, 7));
    setPickDate((v) => v || addDays(today, 14));
  }, []);

  const nights = useMemo(() => {
    if (!dropDate || !pickDate) return 0;
    const a = new Date(dropDate).getTime();
    const b = new Date(pickDate).getTime();
    return Math.max(0, Math.round((b - a) / 86400000));
  }, [dropDate, pickDate]);

  const setDuration = (days: number) => {
    if (!dropDate) return;
    setPickDate(addDays(dropDate, days));
  };

  const launch = () => {
    if (!dropDate || !pickDate || nights <= 0) return;
    setScanning(true);
    const q = new URLSearchParams({
      airport,
      type: service,
      dropoffDate: dropDate,
      dropoffTime: dropTime,
      pickupDate: pickDate,
      pickupTime: pickTime,
    });
    // Brief beat so the user SEES Aero engage before the route change.
    window.setTimeout(() => router.push(`/results?${q.toString()}`), 650);
  };

  const seg = (active: boolean) =>
    `h-11 flex-1 rounded-xl text-[11px] font-black uppercase tracking-widest transition-all touch-manipulation ${
      active
        ? "bg-blue-600 text-white shadow-[0_8px_20px_-6px_rgba(37,99,235,0.55)]"
        : "bg-[#0B1220] text-slate-400 border border-slate-700 hover:text-slate-200 hover:border-slate-500"
    }`;

  return (
    <div id="console" className="relative">
      {/* Layered backdrop panel — depth without blur */}
      <div className="absolute -inset-x-3 -bottom-3 top-6 rounded-2xl border border-slate-800 bg-[#0B1120]" aria-hidden="true" />

      {/* Mascot breaking out of the card */}
      <div className="absolute -top-7 left-6 z-20 flex items-end gap-3">
        <AeroFace size={56} scanning />
        <div className="mb-1 rounded-xl rounded-bl-none border border-blue-500/25 bg-[#101A30] px-3 py-1.5 shadow-[0_10px_25px_-10px_rgba(0,0,0,0.8)]">
          <p className="text-[10px] font-black uppercase tracking-widest text-blue-300">
            {scanning ? "Scanning 100+ data points…" : "Aero is ready"}
          </p>
        </div>
      </div>

      <div className="relative z-10 rounded-2xl border border-slate-700/80 bg-[#0F1523] p-5 pt-10 shadow-[0_40px_80px_-30px_rgba(0,0,0,0.9),0_0_0_1px_rgba(37,99,235,0.08)] sm:p-6 sm:pt-11">
        {/* Airport */}
        <p className="mb-2 text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">Airport</p>
        <div className="mb-4 flex gap-2">
          <button type="button" onClick={() => setAirport("Luton (LTN)")} className={seg(airport === "Luton (LTN)")}>
            Luton · LTN
          </button>
          <button type="button" onClick={() => setAirport("Heathrow (LHR)")} className={seg(airport === "Heathrow (LHR)")}>
            Heathrow · LHR
          </button>
        </div>

        {/* Service */}
        <p className="mb-2 text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">Service</p>
        <div className="mb-5 flex gap-2">
          <button type="button" onClick={() => setService("meet-greet")} className={seg(service === "meet-greet")}>
            Meet &amp; Greet
          </button>
          <button type="button" onClick={() => setService("park-ride")} className={seg(service === "park-ride")}>
            Park &amp; Ride
          </button>
        </div>

        {/* Dates */}
        <div className="grid grid-cols-[1.4fr_1fr] gap-2.5">
          <div>
            <label htmlFor="pv-drop" className="mb-1.5 block text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">
              Drop-off
            </label>
            <input id="pv-drop" type="date" value={dropDate} onChange={(e) => setDropDate(e.target.value)} className={inputCls} />
          </div>
          <div>
            <label htmlFor="pv-droptime" className="mb-1.5 block text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">
              Time
            </label>
            <input id="pv-droptime" type="time" value={dropTime} onChange={(e) => setDropTime(e.target.value)} className={inputCls} />
          </div>
          <div>
            <label htmlFor="pv-pick" className="mb-1.5 block text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">
              Return
            </label>
            <input id="pv-pick" type="date" value={pickDate} onChange={(e) => setPickDate(e.target.value)} className={inputCls} />
          </div>
          <div>
            <label htmlFor="pv-picktime" className="mb-1.5 block text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">
              Time
            </label>
            <input id="pv-picktime" type="time" value={pickTime} onChange={(e) => setPickTime(e.target.value)} className={inputCls} />
          </div>
        </div>

        {/* Quick durations */}
        <div className="mt-3.5 flex flex-wrap items-center gap-2">
          <span className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-600">Quick:</span>
          {[
            { label: "Weekend", d: 3 },
            { label: "1 week", d: 7 },
            { label: "2 weeks", d: 14 },
          ].map((c) => (
            <button
              key={c.d}
              type="button"
              onClick={() => setDuration(c.d)}
              className="h-9 rounded-lg border border-slate-700 bg-[#0B1220] px-3 text-[10px] font-black uppercase tracking-widest text-slate-300 transition-colors hover:border-blue-500 hover:text-white touch-manipulation"
            >
              {c.label}
            </button>
          ))}
          {nights > 0 && (
            <span className="ml-auto rounded-lg bg-blue-500/10 px-2.5 py-1.5 text-[10px] font-black uppercase tracking-widest text-blue-300">
              {nights} {nights === 1 ? "day" : "days"}
            </span>
          )}
        </div>

        {/* CTA */}
        <button
          type="button"
          onClick={launch}
          disabled={scanning || nights <= 0}
          className="mt-5 flex h-14 w-full items-center justify-center gap-2.5 rounded-xl bg-blue-600 text-sm font-black uppercase tracking-[0.18em] text-white shadow-[0_18px_35px_-10px_rgba(37,99,235,0.6)] transition-all hover:bg-blue-500 active:scale-[0.98] disabled:cursor-not-allowed disabled:bg-slate-800 disabled:text-slate-500 disabled:shadow-none touch-manipulation"
        >
          {scanning ? (
            <>
              <Sparkles className="h-4.5 w-4.5" style={{ width: 18, height: 18 }} />
              Aero is scanning…
            </>
          ) : (
            <>
              <Zap className="fill-current" style={{ width: 18, height: 18 }} />
              Scan live prices
              <ArrowRight style={{ width: 18, height: 18 }} />
            </>
          )}
        </button>

        <div className="mt-4 flex items-center justify-center gap-4 text-[10px] font-bold uppercase tracking-widest text-slate-500">
          <span className="flex items-center gap-1.5"><CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" /> Free cancellation</span>
          <span className="flex items-center gap-1.5"><ShieldCheck className="h-3.5 w-3.5 text-emerald-400" /> No card needed yet</span>
        </div>
      </div>
    </div>
  );
}

// ─── PAGE ─────────────────────────────────────────────────────────────────────

const OPERATORS = ["APD", "24/7 Meet & Greet", "Airport Parking Bay", "OnPark", "Kangaroo", "Platinum", "Simple", "AIRLINK"];

const REVIEWS = [
  { name: "Sarah M.", detail: "Luton · Meet & Greet · 8 days", quote: "Driver was waiting before we even parked up. Keys handed over, bags out, inside the terminal in four minutes flat." },
  { name: "James T.", detail: "Heathrow · Park & Ride · 5 days", quote: "Shuttle was already loading when we arrived. Car came back cleaner than I left it. Genuinely effortless." },
  { name: "Priya K.", detail: "Luton · Meet & Greet · 14 days", quote: "Flight delayed two hours — one text and the pickup was rearranged without any fuss or extra charge." },
];

export default function PreviewLanding() {
  return (
    <main className="min-h-screen bg-[#060A14] font-sans text-white antialiased selection:bg-blue-500/30">
      {/* Keyframes for the mascot scan line (self-contained) */}
      <style>{`
        @keyframes aeroScan { 0%,100% { transform: translateY(2px); opacity:.0 } 15% {opacity:.95} 50% { transform: translateY(50px); opacity:.95 } 85% {opacity:.95} }
      `}</style>

      {/* Ambient glow — fixed, never blurs content */}
      <div className="pointer-events-none fixed inset-x-0 top-0 z-0 flex justify-center" aria-hidden="true">
        <div className="h-[420px] w-full max-w-[900px] -translate-y-1/2 rounded-full bg-blue-600/10 blur-[140px]" />
      </div>

      {/* ── NAV ── */}
      <header className="relative z-20 border-b border-white/5">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-5 md:h-20">
          <span className="flex items-center gap-2 text-lg font-black uppercase tracking-tighter md:text-xl">
            <Plane className="h-5 w-5 rotate-45 text-blue-500" />
            AEROPARK<span className="text-blue-500">DIRECT</span>
          </span>
          <div className="hidden items-center gap-6 text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 md:flex">
            <span className="flex items-center gap-1.5"><ShieldCheck className="h-3.5 w-3.5 text-emerald-400" /> Fully insured</span>
            <span className="flex items-center gap-1.5"><Clock className="h-3.5 w-3.5 text-blue-400" /> 24/7 support</span>
            <a href="#console" className="flex h-10 items-center rounded-xl bg-blue-600 px-4 text-white transition-colors hover:bg-blue-500">
              Book now
            </a>
          </div>
        </div>
      </header>

      {/* ── HERO — asymmetric split, console overlaps the baseline rule ── */}
      <section className="relative z-10 mx-auto max-w-6xl px-5 pb-10 pt-10 md:pb-16 md:pt-16">
        <div className="grid grid-cols-1 gap-14 lg:grid-cols-12 lg:gap-8">
          {/* LEFT — 7 cols */}
          <div className="lg:col-span-7">
            <p className="mb-5 inline-flex items-center gap-2 rounded-full border border-blue-500/25 bg-blue-500/[0.07] px-3.5 py-1.5 text-[10px] font-black uppercase tracking-[0.25em] text-blue-300">
              <Sparkles className="h-3.5 w-3.5" /> Aero · AI parking concierge
            </p>

            <h1 className="text-[2.7rem] font-black leading-[0.98] tracking-tighter sm:text-6xl xl:text-[4.4rem]">
              Park like
              <span className="block font-serif font-normal italic tracking-tight text-blue-400">someone&rsquo;s expecting you.</span>
            </h1>

            <p className="mt-6 max-w-xl text-base leading-relaxed text-slate-400 md:text-lg">
              Aero scans <span className="font-bold text-white">100+ live data points</span> across vetted
              Luton &amp; Heathrow operators — prices, reviews, transfer times — and hands you the best deal.
              Drive up, hand over your keys, fly.
            </p>

            {/* Trustpilot block */}
            <a
              href="https://www.trustpilot.com/review/aeroparkdirect.co.uk"
              target="_blank"
              rel="noreferrer"
              className="mt-8 inline-flex flex-wrap items-center gap-x-4 gap-y-2 rounded-2xl border border-slate-800 bg-[#0B1120] px-5 py-4 transition-colors hover:border-slate-600"
            >
              <TrustStars />
              <span className="text-sm font-black">Excellent</span>
              <span className="text-xs font-bold text-slate-400">
                4.8 / 5 &nbsp;·&nbsp; 300+ reviews on <span className="font-black text-white">Trustpilot</span>
              </span>
            </a>

            {/* Stat strip — offset hairline, asymmetric rhythm */}
            <div className="mt-10 grid max-w-xl grid-cols-3 divide-x divide-slate-800 border-t border-slate-800 pt-6">
              {[
                { k: "100+", v: "data points scanned" },
                { k: "4 min", v: "avg. terminal handover" },
                { k: "£0", v: "cancellation fees" },
              ].map((s) => (
                <div key={s.k} className="px-4 first:pl-0">
                  <p className="text-2xl font-black tabular-nums tracking-tight md:text-3xl">{s.k}</p>
                  <p className="mt-1 text-[10px] font-bold uppercase tracking-widest text-slate-500">{s.v}</p>
                </div>
              ))}
            </div>
          </div>

          {/* RIGHT — 5 cols, console */}
          <div className="lg:col-span-5 lg:pt-6">
            <BookingConsole />
          </div>
        </div>

        {/* Operator rail */}
        <div className="mt-16 border-t border-slate-800/80 pt-6">
          <p className="mb-4 text-[10px] font-black uppercase tracking-[0.25em] text-slate-600">
            Operators on the Aero grid
          </p>
          <div className="flex flex-wrap items-center gap-x-8 gap-y-3">
            {OPERATORS.map((o) => (
              <span key={o} className="text-sm font-black uppercase tracking-widest text-slate-500 transition-colors hover:text-slate-300">
                {o}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* ── HOW IT WORKS — staggered, oversized ghost numerals ── */}
      <section className="relative z-10 mx-auto max-w-6xl px-5 py-14 md:py-20">
        <div className="mb-10 flex items-end justify-between gap-4">
          <h2 className="max-w-md text-3xl font-black leading-tight tracking-tighter md:text-4xl">
            Three steps. <span className="text-slate-500">Zero circling the car park.</span>
          </h2>
          <AeroFace size={44} />
        </div>

        <div className="grid grid-cols-1 gap-5 md:grid-cols-3">
          {[
            { n: "01", t: "Tell Aero your dates", d: "Airport, drop-off, return. That's everything Aero needs to start scanning the grid.", Icon: CalendarDays },
            { n: "02", t: "Aero ranks the grid", d: "Live prices, verified reviews and transfer times across every vetted operator — ranked for your trip.", Icon: Zap, lift: true },
            { n: "03", t: "Hand over the keys", d: "Your driver meets you at the terminal — or the shuttle's waiting. Insured, vetted, tracked.", Icon: KeyRound },
          ].map(({ n, t, d, Icon, lift }) => (
            <div
              key={n}
              className={`relative overflow-hidden rounded-2xl border border-slate-800 bg-[#0B1120] p-6 transition-colors hover:border-slate-600 ${lift ? "md:-translate-y-4 md:border-blue-500/30 md:shadow-[0_30px_60px_-25px_rgba(37,99,235,0.35)]" : ""}`}
            >
              <span className="pointer-events-none absolute -right-2 -top-6 text-[7rem] font-black leading-none tracking-tighter text-white/[0.04]" aria-hidden="true">
                {n}
              </span>
              <div className="mb-5 flex h-11 w-11 items-center justify-center rounded-xl border border-blue-500/25 bg-blue-500/10">
                <Icon className="h-5 w-5 text-blue-400" />
              </div>
              <h3 className="text-lg font-black tracking-tight">{t}</h3>
              <p className="mt-2 text-sm leading-relaxed text-slate-400">{d}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── REVIEW WALL ── */}
      <section className="relative z-10 mx-auto max-w-6xl px-5 py-10 md:py-14">
        <div className="mb-8 flex flex-wrap items-center gap-4">
          <TrustStars size="sm" />
          <p className="text-sm font-black uppercase tracking-widest text-slate-300">What travellers say</p>
          <a
            href="https://www.trustpilot.com/review/aeroparkdirect.co.uk"
            target="_blank"
            rel="noreferrer"
            className="ml-auto text-[11px] font-black uppercase tracking-widest text-blue-400 hover:text-blue-300"
          >
            All reviews →
          </a>
        </div>
        <div className="grid grid-cols-1 gap-5 md:grid-cols-3">
          {REVIEWS.map((r) => (
            <figure key={r.name} className="flex flex-col rounded-2xl border border-slate-800 bg-[#0F1523] p-6">
              <TrustStars size="sm" />
              <blockquote className="mt-4 flex-1 text-sm leading-relaxed text-slate-300">&ldquo;{r.quote}&rdquo;</blockquote>
              <figcaption className="mt-5 border-t border-slate-800 pt-4">
                <p className="text-sm font-black">{r.name}</p>
                <p className="mt-0.5 text-[10px] font-bold uppercase tracking-widest text-slate-500">{r.detail}</p>
              </figcaption>
            </figure>
          ))}
        </div>
      </section>

      {/* ── FINAL CTA ── */}
      <section className="relative z-10 mx-auto max-w-6xl px-5 pb-16 pt-6 md:pb-24">
        <div className="relative overflow-hidden rounded-2xl border border-blue-500/30 bg-gradient-to-br from-[#0c1730] to-[#0B1120] p-8 md:p-12">
          <div className="pointer-events-none absolute -right-16 -top-16 h-64 w-64 rounded-full bg-blue-600/15 blur-[90px]" aria-hidden="true" />
          <div className="relative flex flex-col items-start gap-6 md:flex-row md:items-center md:justify-between">
            <div className="flex items-center gap-5">
              <AeroFace size={64} scanning />
              <div>
                <h2 className="text-2xl font-black tracking-tighter md:text-3xl">Your dates. Aero&rsquo;s grid.</h2>
                <p className="mt-1 text-sm font-medium text-slate-400">Live prices in under ten seconds — no account, no card.</p>
              </div>
            </div>
            <a
              href="#console"
              className="flex h-14 items-center gap-2.5 rounded-xl bg-blue-600 px-7 text-sm font-black uppercase tracking-[0.18em] text-white shadow-[0_18px_35px_-10px_rgba(37,99,235,0.6)] transition-all hover:bg-blue-500 active:scale-[0.98] touch-manipulation"
            >
              Scan my dates <ChevronRight className="h-4 w-4" />
            </a>
          </div>
        </div>

        <footer className="mt-10 flex flex-col items-center justify-between gap-3 border-t border-slate-800/80 pt-6 text-[11px] font-bold text-slate-600 md:flex-row">
          <span>© {new Date().getFullYear()} AeroPark Direct Ltd · Luton &amp; Heathrow</span>
          <span className="flex items-center gap-4">
            <span className="flex items-center gap-1.5"><ShieldCheck className="h-3.5 w-3.5" /> Stripe secured</span>
            <a href="mailto:info@aeroparkdirect.co.uk" className="flex items-center gap-1.5 hover:text-slate-400">
              <PhoneCall className="h-3.5 w-3.5" /> info@aeroparkdirect.co.uk
            </a>
          </span>
        </footer>
      </section>
    </main>
  );
}
