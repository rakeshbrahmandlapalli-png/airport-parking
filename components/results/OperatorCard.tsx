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
      className={`rounded-xl overflow-hidden border bg-white transition-colors ${
        featured ? "border-blue-600" : "border-slate-200 hover:border-slate-300"
      } ${isSoldOut ? "opacity-60 grayscale-[30%]" : ""}`}
    >
      <div className="flex flex-col md:flex-row">
        {/* ── LEFT: identity, trust, highlights ── */}
        <div className="flex-1 min-w-0 p-5 md:p-6">
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
            className="group flex w-full min-w-0 items-center gap-3 md:gap-4 text-left"
            aria-label={`Show details for ${operator.name}`}
          >
            <OperatorLogo logoUrl={operator.logo_url} name={operator.name} />
            <h2 className="min-w-0 text-lg font-semibold leading-snug text-slate-900 underline-offset-4 group-hover:underline md:text-xl">
              {operator.name}
            </h2>
          </button>

          {/* Selling points — one flowing line, not a spec-sheet grid */}
          <ul className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-sm text-slate-700">
            {highlights.map((point) => (
              <li key={point} className="inline-flex items-start gap-1.5">
                <Check className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" aria-hidden="true" /> {point}
              </li>
            ))}
          </ul>


          <OperatorDetailPanel operator={operator} isHeathrow={isHeathrow} />

          {/* Mandatory extra fees stay visible next to the price (UK drip-pricing
              rules), below the instructions link rather than above it. */}
          {feesNote && (
            <p className="mt-3 flex items-start gap-1.5 text-sm leading-snug text-amber-800">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" aria-hidden="true" />
              <span><span className="font-semibold">Paid on the day:</span> {feesNote}</span>
            </p>
          )}
        </div>

        {/* ── RIGHT: price + CTA (CLS-locked) ── */}
        <div className="flex shrink-0 flex-col justify-center border-t border-slate-200 bg-slate-50 px-5 py-5 md:w-[260px] md:border-l md:border-t-0 md:px-6">
          <p className="text-sm text-slate-500">
            Total for {duration} {duration === 1 ? "day" : "days"}
          </p>

          {/* Fixed-height slot prevents layout shift across all states */}
          <div className="flex min-h-[84px] w-full flex-col justify-center">
            {showSkeleton && (
              <div className="w-full animate-pulse space-y-2.5" aria-hidden="true">
                <div className="h-9 w-32 rounded-md bg-slate-200" />
                <div className="h-3 w-24 rounded bg-slate-200" />
              </div>
            )}

            {showNA && (
              <div>
                <p className="text-lg font-semibold text-slate-500">Not available</p>
                <p className="text-sm text-slate-500">
                  {isApiMode ? "We couldn't get a price just now." : "No price for these dates."}
                </p>
              </div>
            )}

            {isSoldOut && (
              <p className="text-3xl font-bold leading-none text-slate-400 line-through">
                {final > 0 ? formatGBP(final) : "—"}
              </p>
            )}

            {showPrice && (
              <div className="flex flex-col">
                {/* With a code live, the struck price is the one they pay
                    WITHOUT it — that is the saving they are being shown. The
                    operator's own original would be a third number on one card
                    and helps nobody. */}
                {withCode !== null ? (
                  <p className="text-sm text-slate-500 line-through">{formatGBP(final)}</p>
                ) : isDiscounted ? (
                  <p className="text-sm text-slate-500 line-through">{formatGBP(original)}</p>
                ) : null}

                <p className="text-3xl font-bold leading-tight tabular-nums text-slate-900">
                  {formatGBP(withCode ?? final)}
                </p>

                {withCode !== null && (
                  <p className="mt-1 self-start rounded-md bg-emerald-50 px-2 py-0.5 text-sm font-medium text-emerald-800">
                    with code {promo!.code}
                  </p>
                )}

                <p className="mt-1 text-sm text-slate-500 tabular-nums">
                  {formatGBP((withCode ?? final) / Math.max(1, duration))} a day
                </p>
              </div>
            )}
          </div>

          {/* Massive, unmissable CTA — 56px tall, full width */}
          <button
            type="button"
            disabled={!canSelect}
            onClick={() => canSelect && onSelect(operator, final)}
            className={`mt-4 flex h-12 w-full items-center justify-center gap-1.5 rounded-lg text-base font-semibold touch-manipulation ${
              canSelect
                ? "bg-blue-600 text-white hover:bg-blue-700"
                : "cursor-not-allowed border border-slate-300 bg-white text-slate-400"
            }`}
          >
            {isSoldOut ? <><Ban className="h-4 w-4" aria-hidden="true" /> Sold out</>
              : showSkeleton ? "Checking rate…"
              : showNA ? "Not available"
              : <>Select <ChevronRight className="h-4 w-4" aria-hidden="true" /></>}
          </button>

          {canSelect && (
            <p className="mt-2 flex items-center justify-center gap-1.5 text-xs text-slate-500">
              <Lock className="h-3 w-3" aria-hidden="true" /> Secure card payment by Stripe
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
        className="h-12 w-12 md:h-14 md:w-14 shrink-0 rounded-lg border border-slate-100 bg-white object-contain"
        onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = "none"; }}
      />
    );
  }
  return (
    <div className="flex h-12 w-12 md:h-14 md:w-14 shrink-0 items-center justify-center rounded-lg border border-slate-200 bg-slate-100 text-lg font-semibold text-slate-500">
      {name.charAt(0).toUpperCase()}
    </div>
  );
}
