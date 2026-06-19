"use client";

// High-converting operator result card. Mobile-first (stacked → md:flex-row),
// CLS-locked price slot, skeleton (not spinner) for live-rate loading, and a
// 56px full-width CTA. Consumes the typed PricedCompany emitted by the engine.

import {
  ChevronRight, Lock, Ban, AlertCircle, Star, ThumbsUp, Zap, Clock,
  Sparkles, Percent,
} from "lucide-react";
import {
  type PricedCompany, getAvgRating, getBadgeIcon, buildHighlights, formatGBP,
} from "@/app/lib/domain";
import { OperatorDetailPanel } from "./OperatorDetailPanel";

interface OperatorCardProps {
  operator: PricedCompany;
  duration: number;
  isHeathrow: boolean;
  featured?: boolean;
  liveRateLoading?: boolean;
  onSelect: (operator: PricedCompany, finalPrice: number) => void;
}

export function OperatorCard({
  operator, duration, isHeathrow, featured = false, liveRateLoading = false, onSelect,
}: OperatorCardProps) {
  const { original, final, source } = operator.calculatedPriceObj;

  const isSoldOut = Boolean(isHeathrow ? operator.lhr_sold_out : operator.ltn_sold_out);
  const isFeatured = Boolean(isHeathrow ? operator.lhr_featured : operator.ltn_featured);
  const reviews = (isHeathrow ? operator.lhr_reviews : operator.ltn_reviews) ?? [];
  const rating = getAvgRating(reviews);
  const isMeetGreet = (operator.category ?? "").toLowerCase().includes("meet");
  const highlights = buildHighlights(operator, isMeetGreet);

  const isApiMode = operator.pricing_mode !== "pivot" && Boolean(operator.api_token);
  const showSkeleton = isApiMode && liveRateLoading;
  const showPrice = !showSkeleton && final > 0 && !isSoldOut;
  const showNA = !showSkeleton && !isSoldOut && final <= 0;
  const canSelect = showPrice;

  const isDiscounted = original > final && !isSoldOut;
  const savePct = isDiscounted ? Math.round(((original - final) / original) * 100) : 0;
  const perDay = duration > 0 ? final / duration : final;
  const categoryLabel =
    operator.category?.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()) ?? "Meet & Greet";

  return (
    <article
      className={`rounded-2xl overflow-hidden border bg-[#0B1120] transition-colors ${
        featured ? "border-blue-500/40 shadow-[0_0_40px_-12px_rgba(37,99,235,0.25)]" : "border-slate-800 hover:border-slate-700"
      } ${isSoldOut ? "opacity-60 grayscale-[30%]" : ""}`}
    >
      {featured && <div className="h-[3px] bg-gradient-to-r from-blue-600 via-indigo-500 to-emerald-500" />}

      <div className="flex flex-col md:flex-row">
        {/* ── LEFT: identity, trust, highlights ── */}
        <div className="flex-1 p-5 md:p-7">
          {(isFeatured || savePct > 0) && (
            <div className="mb-3 flex flex-wrap gap-2">
              {isFeatured ? (
                <span className="inline-flex items-center gap-1.5 rounded-full bg-[#064E3B] px-3 py-1 text-[9px] font-black uppercase tracking-widest text-emerald-400">
                  <Sparkles className="h-3 w-3" /> Best Weekend Value
                </span>
              ) : savePct > 0 ? (
                <span className="inline-flex items-center gap-1.5 rounded-full bg-[#1E3A8A] px-3 py-1 text-[9px] font-black uppercase tracking-widest text-blue-300">
                  <Percent className="h-3 w-3" /> {savePct}% Launch Special
                </span>
              ) : null}
            </div>
          )}

          {/* Logo + name + rating */}
          <div className="flex items-center gap-4">
            <OperatorLogo logoUrl={operator.logo_url} name={operator.name} />
            <div className="min-w-0">
              <h2 className="truncate text-xl font-black uppercase leading-tight tracking-tight text-white md:text-2xl">
                {operator.name}
              </h2>
              {rating !== null && (
                <div className="mt-1 flex items-center gap-1.5">
                  <span className="flex items-center gap-0.5 text-amber-400">
                    <Star className="h-3.5 w-3.5 fill-current" />
                    <span className="text-sm font-black">{rating.toFixed(1)}</span>
                  </span>
                  <span className="text-[11px] font-bold text-slate-500">
                    ({reviews.length} operator {reviews.length === 1 ? "review" : "reviews"})
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Trust badge row */}
          <div className="mt-4 flex flex-wrap gap-2">
            <Pill label={categoryLabel} icon={ThumbsUp} tone="slate" />
            {source === "api"
              ? <Pill label="Live Rate" icon={Zap} tone="emerald" />
              : <Pill label="Fixed Rate" icon={Clock} tone="slate" />}
          </div>

          {/* 3–4 selling-point bullets */}
          <ul className="mt-5 grid grid-cols-1 gap-2.5 sm:grid-cols-2">
            {highlights.map((point) => {
              const Icon = getBadgeIcon(point);
              return (
                <li key={point} className="flex items-center gap-2 text-[13px] font-bold text-slate-300">
                  <Icon className="h-4 w-4 shrink-0 text-emerald-400" />
                  <span className="leading-tight">{point}</span>
                </li>
              );
            })}
          </ul>

          <OperatorDetailPanel operator={operator} isHeathrow={isHeathrow} />
        </div>

        {/* ── RIGHT: price + CTA (CLS-locked) ── */}
        <div className="flex shrink-0 flex-col items-center justify-center border-t border-slate-800/80 bg-[#060B14] px-6 py-6 md:w-[290px] md:border-l md:border-t-0">
          <p className="mb-1.5 text-center text-[10px] font-black uppercase tracking-[0.25em] text-slate-500">
            Total Stay Cost
          </p>

          {/* Fixed-height slot prevents layout shift across all states */}
          <div className="flex min-h-[104px] w-full flex-col items-center justify-center">
            {showSkeleton && (
              <div className="w-full animate-pulse space-y-2.5" aria-hidden="true">
                <div className="mx-auto h-10 w-32 rounded-lg bg-slate-800" />
                <div className="mx-auto h-3 w-24 rounded bg-slate-800" />
              </div>
            )}

            {showNA && (
              <div className="flex flex-col items-center gap-1 text-center">
                <AlertCircle className="mb-1 h-6 w-6 text-slate-600" />
                <p className="text-lg font-black tracking-tight text-slate-400">Unavailable</p>
                <p className="text-[9px] font-bold uppercase tracking-widest text-slate-600">
                  {isApiMode ? "Rate offline" : "No price for these dates"}
                </p>
              </div>
            )}

            {isSoldOut && (
              <p className="text-4xl font-black leading-none tracking-tighter text-slate-500 line-through">
                {final > 0 ? formatGBP(final) : "—"}
              </p>
            )}

            {showPrice && (
              <div className="flex flex-col items-center text-center">
                {isDiscounted && (
                  <p className="text-sm font-bold text-slate-500 line-through">{formatGBP(original)}</p>
                )}
                <p className="text-[2.75rem] font-black leading-none tracking-tighter text-emerald-400">
                  {formatGBP(final)}
                </p>
                <p className="mt-1.5 text-[10px] font-black uppercase tracking-[0.1em] text-slate-400">
                  Avg {formatGBP(perDay)} / day
                </p>
              </div>
            )}
          </div>

          {/* Massive, unmissable CTA — 56px tall, full width */}
          <button
            type="button"
            disabled={!canSelect}
            onClick={() => canSelect && onSelect(operator, final)}
            className={`mt-4 flex h-14 w-full items-center justify-center gap-2 rounded-xl text-sm font-black uppercase tracking-[0.15em] transition-all touch-manipulation ${
              canSelect
                ? "bg-[#2563EB] text-white shadow-[0_8px_24px_-6px_rgba(37,99,235,0.6)] hover:bg-blue-500 active:scale-[0.98]"
                : "cursor-not-allowed border border-slate-700 bg-slate-800 text-slate-500"
            }`}
          >
            {isSoldOut ? <><Ban className="h-4 w-4" /> Sold Out</>
              : showSkeleton ? "Checking rate…"
              : showNA ? <><AlertCircle className="h-4 w-4" /> Unavailable</>
              : <>Select <ChevronRight className="h-4 w-4" /></>}
          </button>

          {canSelect && (
            <p className="mt-3 flex items-center justify-center gap-1.5 text-[9px] font-bold uppercase tracking-widest text-slate-600">
              <Lock className="h-3 w-3" /> Secured by Stripe
            </p>
          )}
        </div>
      </div>
    </article>
  );
}

// ── Local sub-components ──────────────────────────────────────────────────────

function OperatorLogo({ logoUrl, name }: { logoUrl?: string | null; name: string }) {
  if (logoUrl) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={logoUrl}
        alt={name}
        width={64}
        height={64}
        className="h-16 w-16 shrink-0 rounded-2xl bg-white object-contain"
        onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = "none"; }}
      />
    );
  }
  return (
    <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl border border-slate-700/50 bg-[#1A2235] text-xl font-black text-slate-400">
      {name.charAt(0).toUpperCase()}
    </div>
  );
}

function Pill({ label, icon: Icon, tone }: { label: string; icon: typeof ThumbsUp; tone: "slate" | "emerald" }) {
  const tones = {
    slate: "bg-slate-800 text-slate-300 border-slate-700",
    emerald: "bg-emerald-500/[0.06] text-emerald-400 border-emerald-500/20",
  } as const;
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-[9px] font-black uppercase tracking-widest ${tones[tone]}`}>
      <Icon className="h-3 w-3" /> {label}
    </span>
  );
}
