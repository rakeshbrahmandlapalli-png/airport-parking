"use client";
import { Zap, CheckCircle2 } from "lucide-react";

interface TimerProps {
  // Legacy props kept so existing callers type-check; no longer used.
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
  /** "dark" (default) keeps the existing homepage look; "light" is used on
   *  the results page test. */
  theme?: "dark" | "light";
}

// Founding-member offer card.
// The countdown clock and "X spots left" scarcity were removed: the timer
// reset per visitor (never genuinely ended) and the slot count was a manual
// figure, so both were misleading. The genuine offer — the discount itself —
// stays, sourced from Admin → Settings.
export default function LaunchTimer({
  badge = "Founding Member Launch",
  title = "Founding Member Launch",
  subtitle = "Lifetime perks for our early customers",
  benefitTitle = "Founding Members Get",
  benefitValue = "20% Off + 5% Lifetime Discount",
  benefitNote = "Plus priority access to new features",
  theme = "dark",
}: TimerProps) {
  const light = theme === "light";
  return (
    <div className={`relative w-full overflow-hidden rounded-2xl border p-4 ${
      light ? "border-slate-200 bg-white shadow-sm" : "border-slate-800 bg-[#0B1120] shadow-[0_24px_48px_-12px_rgba(0,0,0,0.7)]"
    }`}>
      <span className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-[9px] font-black uppercase tracking-[0.15em] ${
        light ? "border-blue-200 bg-blue-50 text-blue-700" : "border-blue-500/20 bg-blue-500/[0.08] text-blue-400"
      }`}>
        <Zap className="h-3 w-3 fill-current" /> {badge}
      </span>

      <h3 className={`mt-2.5 text-base font-black tracking-tight ${light ? "text-slate-900" : "text-white"}`}>{title}</h3>
      <p className="mt-0.5 text-[11px] font-medium text-slate-500">{subtitle}</p>

      {/* VALUE PROPOSITION — the focal point */}
      <div className={`mt-3 rounded-2xl border px-4 py-4 text-center ${
        light ? "border-emerald-200 bg-emerald-50" : "border-emerald-500/20 bg-emerald-500/[0.06]"
      }`}>
        <p className={`text-[9px] font-black uppercase tracking-[0.15em] ${light ? "text-emerald-700" : "text-emerald-400/70"}`}>
          {benefitTitle}
        </p>
        <div className="mt-1.5 flex items-center justify-center gap-2">
          <CheckCircle2 className={`h-4 w-4 shrink-0 ${light ? "text-emerald-600" : "text-emerald-400"}`} />
          <p className={`text-base font-black leading-tight tracking-tight ${light ? "text-slate-900" : "text-white"}`}>{benefitValue}</p>
        </div>
        <p className="mt-1.5 text-[10px] font-medium text-slate-500">{benefitNote}</p>
      </div>
    </div>
  );
}
