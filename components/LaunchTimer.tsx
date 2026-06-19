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
}: TimerProps) {
  return (
    <div className="relative w-full overflow-hidden rounded-2xl border border-slate-800 bg-[#0B1120] p-4 shadow-[0_24px_48px_-12px_rgba(0,0,0,0.7)]">
      {/* Hairline top glow — the single premium flourish */}
      <div className="pointer-events-none absolute inset-x-[15%] top-0 h-px bg-gradient-to-r from-transparent via-blue-500/50 to-transparent" />

      <span className="inline-flex items-center gap-1.5 rounded-full border border-blue-500/20 bg-blue-500/[0.08] px-3 py-1 text-[9px] font-black uppercase tracking-[0.15em] text-blue-400">
        <Zap className="h-3 w-3 fill-current" /> {badge}
      </span>

      <h3 className="mt-2.5 text-base font-black tracking-tight text-white">{title}</h3>
      <p className="mt-0.5 text-[11px] font-medium text-slate-500">{subtitle}</p>

      {/* VALUE PROPOSITION — the focal point */}
      <div className="mt-3 rounded-2xl border border-emerald-500/20 bg-emerald-500/[0.06] px-4 py-4 text-center">
        <p className="text-[9px] font-black uppercase tracking-[0.15em] text-emerald-400/70">
          {benefitTitle}
        </p>
        <div className="mt-1.5 flex items-center justify-center gap-2">
          <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-400" />
          <p className="text-base font-black leading-tight tracking-tight text-white">{benefitValue}</p>
        </div>
        <p className="mt-1.5 text-[10px] font-medium text-slate-500">{benefitNote}</p>
      </div>
    </div>
  );
}
