"use client";

// High-converting operator result card. Mobile-first (stacked → md:flex-row),
// CLS-locked price slot, skeleton (not spinner) for live-rate loading, and a
// 56px full-width CTA. Consumes the typed PricedCompany emitted by the engine.

import { ChevronRight, Lock, Ban, AlertCircle, Check } from "lucide-react";
import { type PricedCompany, buildHighlights, formatGBP } from "@/app/lib/domain";
import { OperatorDetailPanel } from "./OperatorDetailPanel";

interface OperatorCardProps {
  operator: PricedCompany;
  duration: number;
  isHeathrow: boolean;
  featured?: boolean;
  liveRateLoading?: boolean;
  /** The code the site is advertising, if any. Shown here as a struck-through
   *  price so the saving is visible while choosing — but it is NOT applied for
   *  them: they still enter it at checkout, which is where it is verified. */
  promo?: { code: string; percent: number } | null;
  onSelect: (operator: PricedCompany, finalPrice: number) => void;
}

export function OperatorCard({
  operator, duration, isHeathrow, featured = false, liveRateLoading = false,
  promo = null, onSelect,
}: OperatorCardProps) {
  const { original, final } = operator.calculatedPriceObj;

  const isSoldOut = Boolean(isHeathrow ? operator.lhr_sold_out : operator.ltn_sold_out);
  const isMeetGreet = (operator.category ?? "").toLowerCase().includes("meet");
  const feesNote = ((isHeathrow ? operator.lhr_fees_note : operator.ltn_fees_note) ?? "").trim();
  const highlights = buildHighlights(operator, isMeetGreet, 4, feesNote);

  const isApiMode = operator.pricing_mode !== "pivot" && Boolean(operator.api_token);
  const showSkeleton = isApiMode && liveRateLoading;
  const showPrice = !showSkeleton && final > 0 && !isSoldOut;
  const showNA = !showSkeleton && !isSoldOut && final <= 0;
  const canSelect = showPrice;

  const isDiscounted = original > final && !isSoldOut;
  const savePct = isDiscounted ? Math.round(((original - final) / original) * 100) : 0;

  // Checkout takes the promo off the parking rate before any add-ons, so this
  // is the same arithmetic and the same number they will be charged. Rounded to
  // the penny here so the card can never show a figure a penny off the till.
  const withCode = promo && showPrice
    ? Math.round(final * (1 - promo.percent) * 100) / 100
    : null;
  const perDay = duration > 0 ? final / duration : final;

  return (
    <article
      className={`rounded-2xl overflow-hidden border bg-white transition-colors ${
        featured ? "border-blue-500/60" : "border-slate-200 hover:border-slate-300"
      } ${isSoldOut ? "opacity-60 grayscale-[30%]" : ""}`}
    >
      {featured && <div className="h-[3px] bg-blue-500" />}

      <div className="flex flex-col md:flex-row">
        {/* ── LEFT: identity, trust, highlights ── */}
        <div className="flex-1 p-5 md:p-7">
          {(featured || savePct > 0) && (
            <div className="mb-3 flex flex-wrap gap-2">
              {featured ? (
                <span className="rounded-md bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700">
                  Recommended
                </span>
              ) : savePct > 0 ? (
                <span className="rounded-md bg-blue-50 px-2.5 py-1 text-xs font-semibold text-blue-700">
                  {savePct}% off right now
                </span>
              ) : null}
            </div>
          )}

          {/* Logo + name. No star rating: the stored reviews were seeded
              placeholders, not real customers, so no rating is shown until
              genuine reviews exist. */}
          {/* Clicking the operator opens their details — people click the name
              expecting more, and a name that does nothing is a dead click. */}
          <button
            type="button"
            onClick={(e) => {
              const details = e.currentTarget.closest("article")?.querySelector("details");
              if (details) details.open = !details.open;
            }}
            className="group flex w-full min-w-0 items-center gap-4 text-left"
            aria-label={`Show details for ${operator.name}`}
          >
            <OperatorLogo logoUrl={operator.logo_url} name={operator.name} />
            <h2 className="min-w-0 truncate text-xl font-black uppercase leading-tight tracking-tight text-slate-900 underline-offset-4 decoration-2 group-hover:underline md:text-2xl">
              {operator.name}
            </h2>
          </button>

          {/* Selling points — one flowing line, not a spec-sheet grid */}
          <p className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-[13px] font-bold text-slate-700">
            {highlights.map((point) => (
              <span key={point} className="inline-flex items-center gap-1.5 whitespace-nowrap">
                <Check className="h-3.5 w-3.5 shrink-0 text-emerald-500" /> {point}
              </span>
            ))}
          </p>

          {feesNote && (
            <div className="mt-4 flex items-start gap-2 rounded-xl border border-amber-300 bg-amber-50 px-3.5 py-3">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
              <p className="text-[13px] font-bold leading-snug text-amber-900">{feesNote}</p>
            </div>
          )}

          <OperatorDetailPanel operator={operator} isHeathrow={isHeathrow} />
        </div>

        {/* ── RIGHT: price + CTA (CLS-locked) ── */}
        <div className="flex shrink-0 flex-col items-center justify-center border-t border-slate-200 bg-slate-50 px-6 py-6 md:w-[290px] md:border-l md:border-t-0">
          <p className="mb-1.5 text-center text-[10px] font-black uppercase tracking-[0.25em] text-slate-500">
            Total Stay Cost
          </p>

          {/* Fixed-height slot prevents layout shift across all states */}
          <div className="flex min-h-[104px] w-full flex-col items-center justify-center">
            {showSkeleton && (
              <div className="w-full animate-pulse space-y-2.5" aria-hidden="true">
                <div className="mx-auto h-10 w-32 rounded-lg bg-slate-200" />
                <div className="mx-auto h-3 w-24 rounded bg-slate-200" />
              </div>
            )}

            {showNA && (
              <div className="flex flex-col items-center gap-1 text-center">
                <AlertCircle className="mb-1 h-6 w-6 text-slate-400" />
                <p className="text-lg font-black tracking-tight text-slate-500">Unavailable</p>
                <p className="text-[9px] font-bold uppercase tracking-widest text-slate-400">
                  {isApiMode ? "Rate offline" : "No price for these dates"}
                </p>
              </div>
            )}

            {isSoldOut && (
              <p className="text-4xl font-black leading-none tracking-tighter text-slate-400 line-through">
                {final > 0 ? formatGBP(final) : "—"}
              </p>
            )}

            {showPrice && (
              <div className="flex flex-col items-center text-center">
                {/* With a code live, the struck price is the one they pay
                    WITHOUT it — that is the saving they are being shown. The
                    operator's own original would be a third number on one card
                    and helps nobody. */}
                {withCode !== null ? (
                  <p className="text-sm font-bold text-slate-400 line-through">{formatGBP(final)}</p>
                ) : isDiscounted ? (
                  <p className="text-sm font-bold text-slate-400 line-through">{formatGBP(original)}</p>
                ) : null}

                <p className="text-[2.75rem] font-black leading-none tracking-tighter text-emerald-600">
                  {formatGBP(withCode ?? final)}
                </p>

                {withCode !== null && (
                  <p className="mt-1 rounded-md bg-emerald-50 px-2 py-0.5 text-[10px] font-black uppercase tracking-[0.08em] text-emerald-700">
                    with code {promo!.code}
                  </p>
                )}

                <p className="mt-1.5 text-[10px] font-black uppercase tracking-[0.1em] text-slate-500">
                  Avg {formatGBP((withCode ?? final) / Math.max(1, duration))} / day
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
                ? "bg-[#2563EB] text-white shadow-[0_8px_24px_-6px_rgba(37,99,235,0.35)] hover:bg-blue-500 active:scale-[0.98]"
                : "cursor-not-allowed border border-slate-300 bg-slate-100 text-slate-400"
            }`}
          >
            {isSoldOut ? <><Ban className="h-4 w-4" /> Sold Out</>
              : showSkeleton ? "Checking rate…"
              : showNA ? <><AlertCircle className="h-4 w-4" /> Unavailable</>
              : <>Select <ChevronRight className="h-4 w-4" /></>}
          </button>

          {canSelect && (
            <p className="mt-3 flex items-center justify-center gap-1.5 text-[9px] font-bold uppercase tracking-widest text-slate-400">
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
    <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl border border-slate-200 bg-slate-100 text-xl font-black text-slate-500">
      {name.charAt(0).toUpperCase()}
    </div>
  );
}
