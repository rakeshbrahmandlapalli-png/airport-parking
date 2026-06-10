"use client";
import { useState, useEffect } from "react";
import { Zap, CheckCircle2, AlertTriangle } from "lucide-react";

interface TimerProps {
  hours?: number;
  slotsClaimed?: number;
  totalSlots?: number;
  onTimerEnd?: () => void;
  badge?: string;
  title?: string;
  subtitle?: string;
  benefitTitle?: string;
  benefitValue?: string;
  benefitNote?: string;
}

export default function LaunchTimer({
  hours = 72,
  slotsClaimed = 6,
  totalSlots = 15,
  onTimerEnd,
  badge = "Live Launch Event",
  title = "Founding Member Launch",
  subtitle = "Secure your spot · lifetime perks",
  benefitTitle = "Founding Members Get",
  benefitValue = "20% Off + 5% Lifetime Discount",
  benefitNote = "Plus priority access to new features",
}: TimerProps) {
  const [timeLeft, setTimeLeft] = useState<number | null>(null);
  const [mounted, setMounted] = useState(false);

  const validHours = Math.max(1, Math.min(8760, hours));
  const validTotal = Math.max(1, totalSlots);
  const validClaimed = Math.max(0, Math.min(validTotal, slotsClaimed));
  const slotsLeft = validTotal - validClaimed;
  const isCritical = slotsLeft <= 3;
  const slotPct = Math.round((validClaimed / validTotal) * 100);

  const d = timeLeft ? Math.floor(timeLeft / 86400000) : 0;
  const h = timeLeft ? Math.floor((timeLeft % 86400000) / 3600000) : 0;
  const m = timeLeft ? Math.floor((timeLeft % 3600000) / 60000) : 0;
  const s = timeLeft ? Math.floor((timeLeft % 60000) / 1000) : 0;

  useEffect(() => { setMounted(true); }, []);

  // Timer logic preserved verbatim from the previous implementation — it works,
  // so it stays. (Persisted countdown via localStorage; see P0.3 audit note about
  // moving this to a real server-sourced campaign end-date.)
  useEffect(() => {
    if (!mounted) return;
    const KEY = `ap_lct_v1_${validHours}`;
    let end: number | null = null;
    try {
      const stored = localStorage.getItem(KEY);
      if (stored) {
        end = parseInt(stored, 10);
        if (isNaN(end) || end <= Date.now()) { localStorage.removeItem(KEY); end = null; }
      }
      if (!end) { end = Date.now() + validHours * 3600000; localStorage.setItem(KEY, String(end)); }
    } catch { end = Date.now() + validHours * 3600000; }
    const endTime = end;
    setTimeLeft(Math.max(0, endTime - Date.now()));
    const interval = setInterval(() => {
      const rem = Math.max(0, endTime - Date.now());
      setTimeLeft(rem);
      if (rem === 0) onTimerEnd?.();
    }, 1000);
    return () => clearInterval(interval);
  }, [mounted, validHours, onTimerEnd]);

  const pad = (n: number) => String(n).padStart(2, "0");

  // CLS-safe skeleton — reserves the same footprint as the live card.
  if (!mounted || timeLeft === null) {
    return (
      <div className="mx-auto h-[340px] max-w-[420px] animate-pulse rounded-2xl border border-slate-800 bg-[#0B1120]" />
    );
  }

  const units = [
    { v: d, l: "Days" },
    { v: h, l: "Hrs" },
    { v: m, l: "Min" },
    { v: s, l: "Sec" },
  ];

  return (
    <div className="relative mx-auto max-w-[420px] overflow-hidden rounded-2xl border border-slate-800 bg-[#0B1120] p-5 shadow-[0_24px_48px_-12px_rgba(0,0,0,0.7)]">
      {/* Hairline top glow — the single premium flourish */}
      <div className="pointer-events-none absolute inset-x-[15%] top-0 h-px bg-gradient-to-r from-transparent via-blue-500/50 to-transparent" />

      <span className="inline-flex items-center gap-1.5 rounded-full border border-blue-500/20 bg-blue-500/[0.08] px-3 py-1 text-[9px] font-black uppercase tracking-[0.15em] text-blue-400">
        <Zap className="h-3 w-3 fill-current" /> {badge}
      </span>

      <h3 className="mt-3 text-base font-black tracking-tight text-white">{title}</h3>
      <p className="mt-0.5 text-[11px] font-medium text-slate-500">{subtitle}</p>

      {/* COUNTDOWN — even 4-cell grid, single typeface, tabular-nums prevents width jitter */}
      <div className="mt-4 grid grid-cols-4 gap-2">
        {units.map((u) => (
          <div key={u.l} className="rounded-xl border border-slate-800 bg-[#070D18] py-2.5">
            <span className="block text-center font-mono text-2xl font-black leading-none tabular-nums text-white">
              {pad(u.v)}
            </span>
            <span className="mt-1.5 block text-center text-[9px] font-black uppercase tracking-widest text-slate-600">
              {u.l}
            </span>
          </div>
        ))}
      </div>

      {/* VALUE PROPOSITION — the focal point */}
      <div className="mt-4 rounded-2xl border border-emerald-500/20 bg-emerald-500/[0.06] px-4 py-4 text-center">
        <p className="text-[10px] font-black uppercase tracking-[0.15em] text-emerald-400/70">
          {benefitTitle}
        </p>
        <div className="mt-1.5 flex items-center justify-center gap-2">
          <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-400" />
          <p className="text-lg font-black leading-tight tracking-tight text-white">{benefitValue}</p>
        </div>
        <p className="mt-1.5 text-[11px] font-medium text-slate-500">{benefitNote}</p>
      </div>

      {/* SCARCITY — one bar, no redundant "% filled" line */}
      <div className="mt-4">
        <div className="mb-2 flex items-center justify-between">
          <span className={`flex items-center gap-1 text-[10px] font-black uppercase tracking-widest ${isCritical ? "text-amber-400" : "text-slate-500"}`}>
            {isCritical && <AlertTriangle className="h-3 w-3" />}
            {isCritical ? `Only ${slotsLeft} spots left` : "Founding spots"}
          </span>
          <span className="tabular-nums text-[11px] font-bold text-slate-400">
            {validClaimed}/{validTotal}
          </span>
        </div>
        <div className="h-1.5 overflow-hidden rounded-full bg-slate-800">
          {/* The ONLY inline style: a runtime-computed width Tailwind can't express statically. */}
          <div
            className={`h-full rounded-full transition-[width] duration-700 ${isCritical ? "bg-amber-400" : "bg-emerald-400"}`}
            style={{ width: `${slotPct}%` }}
          />
        </div>
      </div>
    </div>
  );
}
