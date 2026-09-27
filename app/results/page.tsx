"use client";

import { logger } from "@/app/lib/logger";
import { AeroAvatar } from "@/components/AeroFeature";
import BookingStepper from "@/components/BookingStepper";
import ModifySearchModal from "@/components/ModifySearchModal";
import { checkAvailability, getLaunchTimerConfig, type LaunchTimerConfig } from "../actions";
import { useSearchParams, useRouter } from "next/navigation";
import {
  Clock, ArrowLeft, Phone, AlertCircle, CarFront, CheckCircle2, Loader2,
  Mail, Send,
} from "lucide-react";
import Link from "next/link";
import { FunnelHeader, FunnelFooter, funnelSlotClass } from "@/components/site/FunnelChrome";
import { COMPANY } from "@/app/lib/company";
import { Suspense, useState, useMemo, useEffect, useCallback, useRef, useLayoutEffect } from "react";
import { supabase } from "../lib/supabase";
import { computePrice, calculateDays, loadPricingSettings, DEFAULT_SETTINGS, type PricingSettings } from "../lib/pricing";
import { type PricedCompany, type SortKey, sortCompanies } from "../lib/domain";
import { OperatorCard } from "@/components/results/OperatorCard";
import { useLivePromo } from "../lib/useLivePromo";
import { FilterBar } from "@/components/results/FilterBar";
import { SearchSummaryHeader } from "@/components/results/SearchSummaryHeader";

// ─── RESULTS SESSION CACHE ─────────────────────────────────────────────────────
// Snapshots the loaded results per search so returning from Checkout is instant —
// no "Aero is Scanning" loader, no re-fetch.
type ResultsCache = {
  companies: any[];
  settings: PricingSettings;
  pinnedOrder: string[];
  livePrices: Record<string, number | null>;
};
function resultsCacheKey(sp: URLSearchParams): string {
  return `apd_results_v2|${sp.get("airport") || ""}|${sp.get("dropoffDate") || ""}|${sp.get("pickupDate") || ""}|${sp.get("dropoffTime") || ""}|${sp.get("pickupTime") || ""}|${sp.get("type") || ""}`;
}
function readResultsCache(sp: URLSearchParams): ResultsCache | null {
  if (typeof window === "undefined") return null;
  try { const raw = sessionStorage.getItem(resultsCacheKey(sp)); return raw ? (JSON.parse(raw) as ResultsCache) : null; }
  catch { return null; }
}
function writeResultsCache(sp: URLSearchParams, data: ResultsCache): void {
  if (typeof window === "undefined") return;
  try { sessionStorage.setItem(resultsCacheKey(sp), JSON.stringify(data)); } catch { /* quota — ignore */ }
}
// Map the URL ?step= value to the BookingStepper index (1 Select · 2 Details · 3 Payment).
function stepToIndex(step: string | null): 1 | 2 | 3 {
  if (step === "details") return 2;
  if (step === "payment") return 3;
  return 1;
}

// MODULE-LEVEL cache (persists across client navigation while the SPA is alive).
// Back-navigation hits this Map and renders instantly — never re-fetches.
const apiCache = new Map<string, ResultsCache>();

// useLayoutEffect emits an SSR warning because it can't run on the server. Alias
// to useEffect on the server so our client-only cache-hydration effect stays
// warning-free while still running before paint in the browser.
const useIsomorphicLayoutEffect = typeof window !== "undefined" ? useLayoutEffect : useEffect;

// Fixed-size skeleton card — reserves the same footprint as a real result card so
// the layout never shifts ("jumps") between loading and loaded states.
function ResultsCardSkeleton() {
  return (
    <div className="bg-white border border-slate-200 rounded-xl p-5 md:p-6 animate-pulse" aria-hidden="true">
      <div className="flex items-center gap-4">
        <div className="w-16 h-16 rounded-2xl bg-slate-200 shrink-0" />
        <div className="flex-1 space-y-2.5">
          <div className="h-4 w-2/5 bg-slate-200 rounded" />
          <div className="h-3 w-1/4 bg-slate-200 rounded" />
        </div>
        <div className="h-10 w-24 bg-slate-200 rounded-xl shrink-0" />
      </div>
      <div className="mt-5 space-y-2.5">
        <div className="h-3 w-full bg-slate-200 rounded" />
        <div className="h-3 w-3/4 bg-slate-200 rounded" />
      </div>
      <div className="mt-5 h-12 w-full bg-slate-200 rounded-xl" />
    </div>
  );
}


// NOTE: getBadgeIcon / getAvgRating moved to @/app/lib/domain; CompanyLogo,
// DetailPanel and ParkingCard were extracted to @/components/results/* as part
// of the senior-audit component split. ParkingCard → OperatorCard.


// ─── FETCH WITH TIMEOUT ───────────────────────────────────────────────────────
// 🟢 TIMEOUT COMPRESSED: Lowered to 3500ms to immediately unblock UI performance
async function fetchWithTimeout(url: string, options: RequestInit, ms = 3500): Promise<Response> {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), ms);
  try {
    return await fetch(url, { ...options, signal: ctrl.signal });
  } finally {
    clearTimeout(t);
  }
}

// ─── EXTRACT PRICE FROM API RESPONSE ─────────────────────────────────────────
function extractApiPrice(json: any): number | null {
  if (Array.isArray(json?.rates)) {
    const hit = json.rates.find((r: any) => r?.parking_price != null);
    if (hit) return Number(hit.parking_price);
  }
  if (Array.isArray(json)) {
    const hit = json.find((r: any) => r?.parking_price != null);
    if (hit) return Number(hit.parking_price);
  }
  if (json?.price != null) return Number(json.price);
  if (json?.total != null) return Number(json.total);
  return null;
}

// ─── EMAIL ME THIS QUOTE ──────────────────────────────────────────────────────
function EmailQuoteCard({
  airport, dropoffDate, pickupDate, dropoffTime, pickupTime, serviceType, fromPrice,
}: {
  airport: string; dropoffDate: string; pickupDate: string;
  dropoffTime: string; pickupTime: string; serviceType: string; fromPrice?: number;
}) {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "sending" | "sent" | "error">("idle");
  const [error, setError] = useState("");

  const valid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!valid || status === "sending") return;
    setStatus("sending");
    setError("");
    try {
      const res = await fetch("/api/email-quote", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: email.trim(),
          airport, dropoffDate, pickupDate, dropoffTime, pickupTime, serviceType,
          fromPrice: fromPrice ?? "",
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok && data?.success) {
        setStatus("sent");
        try {
          (window as any).gtag?.("event", "generate_lead", {
            currency: "GBP",
            value: fromPrice ?? 0,
          });
        } catch { /* analytics is best-effort */ }
      } else {
        setStatus("error");
        setError(data?.error || "Couldn't send your quote. Please try again.");
      }
    } catch {
      setStatus("error");
      setError("Network error. Please try again.");
    }
  };

  if (status === "sent") {
    return (
      <div className="mt-6 bg-white border border-emerald-200 rounded-xl p-5 sm:p-6 flex items-start gap-3">
        <CheckCircle2 className="w-6 h-6 text-emerald-600 shrink-0" aria-hidden="true" />
        <div>
          <p className="text-slate-900 font-semibold">Quote sent. Check your inbox.</p>
          <p className="text-slate-500 text-sm mt-0.5">
            We&apos;ve emailed your {airport} prices with a link back to them. Prices can change, so the link always shows the latest.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="mt-6 bg-white border border-slate-200 rounded-xl p-5 sm:p-6">
      <div className="flex flex-col sm:flex-row sm:items-center gap-4">
        <div className="flex items-center gap-4 flex-1 min-w-0">
          <Mail className="w-6 h-6 text-slate-400 shrink-0" aria-hidden="true" />
          <div className="min-w-0">
            <p className="text-slate-900 font-semibold leading-tight">Not ready to book? Email yourself these prices</p>
            <p className="text-slate-500 text-sm mt-0.5">
              We&apos;ll send them with a link that brings you back to this search.
            </p>
          </div>
        </div>
        <form onSubmit={submit} className="flex flex-col sm:flex-row gap-2.5 sm:w-[360px] shrink-0">
          <input
            type="email"
            value={email}
            onChange={(e) => { setEmail(e.target.value); if (status === "error") setStatus("idle"); }}
            placeholder="your@email.com"
            autoComplete="email"
            aria-label="Your email address"
            className="w-full sm:flex-1 min-w-0 h-11 bg-white border border-slate-300 focus:border-blue-600 focus:ring-2 focus:ring-blue-600/20 rounded-lg px-3 text-base text-slate-900 placeholder-slate-400 outline-none"
          />
          <button
            type="submit"
            disabled={!valid || status === "sending"}
            className="inline-flex items-center justify-center gap-2 h-11 px-4 bg-[#0B1120] hover:bg-slate-800 disabled:bg-slate-300 disabled:cursor-not-allowed text-white font-semibold text-sm rounded-lg shrink-0"
          >
            {status === "sending"
              ? <><Loader2 className="w-4 h-4 animate-spin" /> Sending</>
              : <><Send className="w-4 h-4" /> Send</>}
          </button>
        </form>
      </div>
      {status === "error" && (
        <p role="alert" className="text-red-600 text-sm mt-3 sm:text-right">{error}</p>
      )}
    </div>
  );
}

// ─── MAIN RESULTS CONTENT ─────────────────────────────────────────────────────
function ResultsContent({ onEditSearch }: { onEditSearch: () => void }) {
  const searchParams = useSearchParams();
  const router       = useRouter();

  // The code the site is advertising. Shown on each card as a struck-through
  // price so the saving is visible while choosing; it is still entered and
  // verified at checkout, never applied silently on their behalf.
  const livePromo    = useLivePromo();

  // IMPORTANT: never read sessionStorage during render. The server has no
  // sessionStorage, so a render-time read makes the client's first render differ
  // from the server's HTML on a hard refresh → hydration mismatch. We initialise with
  // the SAME defaults the server uses, then re-apply any cached snapshot in a
  // layout effect below (post-hydration, pre-paint) so back-nav stays flash-free.
  const [companies,     setCompanies]     = useState<any[]>([]);
  const [settings,      setSettings]      = useState<PricingSettings>(DEFAULT_SETTINGS);
  const [timerConfig,   setTimerConfig]   = useState<LaunchTimerConfig | null>(null);
  const [loading,       setLoading]       = useState(true);

  const [livePrices,     setLivePrices]     = useState<Record<string, number | null>>({});
  const [liveLoadingIds, setLiveLoadingIds] = useState<Set<string>>(new Set());
  const [pinnedOrder, setPinnedOrder] = useState<string[]>([]);
  const [sortKey, setSortKey] = useState<SortKey>("recommended");

  // Hydrate from the cached snapshot before the browser paints — so a refresh or
  // back-navigation with a warm cache shows results instantly (no skeleton flash)
  // — and crucially AFTER hydration, so it can never cause a server/client diff.
  const didHydrateCache = useRef(false);
  useIsomorphicLayoutEffect(() => {
    if (didHydrateCache.current) return;
    didHydrateCache.current = true;
    const cached = readResultsCache(searchParams);
    if (cached) {
      setCompanies(cached.companies);
      setSettings(cached.settings);
      setPinnedOrder(cached.pinnedOrder);
      setLivePrices(cached.livePrices || {});
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const airport     = searchParams.get("airport")      || "Luton (LTN)";
  const dropoff     = searchParams.get("dropoffDate")  || "";
  const pickup      = searchParams.get("pickupDate")   || "";
  const dropTime    = searchParams.get("dropoffTime")  || "09:00";
  const pickTime    = searchParams.get("pickupTime")   || "09:00";
  const serviceType = searchParams.get("type")         || "meet-greet";
  const isHeathrow  = airport.includes("Heathrow");
  const aeroTip     = searchParams.get("aeroTip")      || "";

  const duration = useMemo(() => calculateDays(dropoff, pickup), [dropoff, pickup]);

  const handleBooking = useCallback((option: any, finalPrice: number) => {
    // Snapshot the fully-loaded results so returning here is instant.
    writeResultsCache(searchParams, { companies, settings, pinnedOrder, livePrices });
    const query = new URLSearchParams(searchParams.toString());
    query.set("type",      option.name);
    query.set("price",     finalPrice.toString());
    query.set("companyId", option.id);
    query.set("step",      "details");
    router.push(`/checkout?${query.toString()}`);
  }, [searchParams, router, companies, settings, pinnedOrder, livePrices]);

  const isFetching = useRef(false);
  const abortRef   = useRef<AbortController | null>(null);

  // Triggered ONLY when the URL search params change (deps locked below). Checks
  // the module cache first; only fetches on a genuine miss → no re-render loop.
  const loadResults = useCallback(() => {
    const cacheKey = resultsCacheKey(searchParams);

    // 1. MODULE CACHE (in-session) → then sessionStorage (survives a reload).
    const cached = apiCache.get(cacheKey) || readResultsCache(searchParams);
    if (cached) {
      apiCache.set(cacheKey, cached);
      setCompanies(cached.companies);
      setSettings(cached.settings);
      setPinnedOrder(cached.pinnedOrder);
      setLivePrices(cached.livePrices || {});
      setLiveLoadingIds(new Set());
      setLoading(false);
      getLaunchTimerConfig().then(setTimerConfig).catch(() => {});

      // STALE-WHILE-REVALIDATE — render the cached snapshot instantly (no flash),
      // then silently refresh the company records + pricing settings. This is a
      // cheap Supabase read (NOT the paid live gateway), so any admin change —
      // price_modifier, dynamic_surcharge_percent, pivot rates, markup — shows up
      // on the next render without waiting for the cache to expire. The expensive
      // live-API prices are reused from the cached snapshot, so we never re-bill.
      (async () => {
        try {
          const [compRes, freshSettings] = await Promise.all([
            supabase.from("companies").select("*"),
            loadPricingSettings(supabase),
          ]);
          const freshCompanies: any[] = compRes.data || [];
          if (!freshCompanies.length) return;
          setCompanies(freshCompanies);
          setSettings(freshSettings);
          const next: ResultsCache = {
            companies: freshCompanies,
            settings: freshSettings,
            pinnedOrder: cached.pinnedOrder,
            livePrices: cached.livePrices || {},
          };
          apiCache.set(cacheKey, next);
          writeResultsCache(searchParams, next);
        } catch { /* keep showing cached data on any refresh error */ }
      })();
      return; // cache hit → render instantly; refresh happens in background
    }

    // 2. FETCH LOCK — never run two fetches concurrently.
    if (isFetching.current) return;
    isFetching.current = true;

    // 5. ABORT CONTROLLER — cancel any request still in flight from a prior key.
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    const signal = controller.signal;
    const liveAccum: Record<string, number | null> = {};

    async function loadData() {
      setLoading(true);
      setLivePrices({});
      setLiveLoadingIds(new Set());
      setPinnedOrder([]);

      try {
        // STEP 1 — Fetch companies + settings (fast, blocks only the skeleton)
        const [compRes, resolvedSettings] = await Promise.all([
          supabase.from("companies").select("*").abortSignal(signal),
          loadPricingSettings(supabase),
        ]);
        if (signal.aborted) return;

        const allCompanies: any[] = compRes.data || [];
        setCompanies(allCompanies);
        setSettings(resolvedSettings);

        const relevantCompanies = allCompanies.filter((c) => {
          const cat = c.category?.toLowerCase().replace(/ & /g, "-").replace(/\s+/g, "-").trim();
          return (
            cat === serviceType.toLowerCase() &&
            (isHeathrow ? c.operates_at_heathrow : c.operates_at_luton) &&
            c.is_active
          );
        });

        const initialSorted = [...relevantCompanies].sort((a, b) => {
          const aFeat = isHeathrow ? a.lhr_featured : a.ltn_featured;
          const bFeat = isHeathrow ? b.lhr_featured : b.ltn_featured;
          if (aFeat && !bFeat) return -1;
          if (!aFeat && bFeat) return 1;
          const aSold = isHeathrow ? a.lhr_sold_out : a.ltn_sold_out;
          const bSold = isHeathrow ? b.lhr_sold_out : b.ltn_sold_out;
          if (aSold && !bSold) return 1;
          if (!aSold && bSold) return -1;
          const aP = isHeathrow ? Number(a.heathrow_price || 0) : Number(a.luton_price || 0);
          const bP = isHeathrow ? Number(b.heathrow_price || 0) : Number(b.luton_price || 0);
          return aP - bP;
        });

        const order = initialSorted.map((c) => c.id);
        setPinnedOrder(order);
        setLoading(false);

        // Cache the base snapshot now; live prices merge in below.
        const snapshot: ResultsCache = { companies: allCompanies, settings: resolvedSettings, pinnedOrder: order, livePrices: {} };
        apiCache.set(cacheKey, snapshot);
        writeResultsCache(searchParams, snapshot);
        const persist = () => { snapshot.livePrices = { ...liveAccum }; apiCache.set(cacheKey, snapshot); writeResultsCache(searchParams, snapshot); };

        if (dropoff && pickup) {
          const isSameDay   = dropoff === pickup;
          const apiPickTime = isSameDay ? "23:59" : pickTime;

          const apiCompanies = relevantCompanies.filter(
            (c) => c.api_token && c.pricing_mode !== "pivot"
          );

          if (apiCompanies.length > 0) {
            setLiveLoadingIds(new Set(apiCompanies.map((c) => c.id)));

            // The upstream gateway is often slow on a COLD request and fast once
            // warm — which is why a manual refresh "fixed" missing prices before.
            // Retry up to 3 times so a cold timeout self-recovers automatically.
            const MAX_ATTEMPTS = 3;

            const fetchRawPrice = async (c: any): Promise<number | null> => {
              for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
                if (signal.aborted) return null;
                try {
                  const res = await fetchWithTimeout(
                    "/api/parking-api",
                    {
                      method: "POST",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({
                        // Server resolves the token from the company id — the
                        // browser no longer needs to send the secret token.
                        companyId:   c.id,
                        drop_date:   dropoff,
                        drop_time:   dropTime,
                        return_date: pickup,
                        return_time: apiPickTime,
                      }),
                    },
                    9000
                  );
                  if (signal.aborted) return null;
                  if (res.ok) {
                    const json = await res.json();
                    const rawPrice = extractApiPrice(json);
                    if (rawPrice != null) return rawPrice; // success
                  } else {
                    logger.warn(`API non-OK for ${c.name}: HTTP ${res.status} (attempt ${attempt})`);
                  }
                } catch (e: any) {
                  if (e?.name === "AbortError") logger.warn(`API timed out for ${c.name} (attempt ${attempt})`);
                  else logger.warn(`API error for ${c.name} (attempt ${attempt}):`, e?.message);
                }
                // No price yet — back off briefly, then retry (upstream is warmer now)
                if (attempt < MAX_ATTEMPTS && !signal.aborted) {
                  await new Promise((r) => setTimeout(r, 700 * attempt));
                }
              }
              return null;
            };

            // COST FIX: all providers can share ONE upstream token. Group them by
            // token and fetch the raw rate ONCE per unique token, then reuse that
            // single result for every provider on it — so we never bill the
            // operator for 4 identical gateway calls per search.
            const tokenGroups = new Map<string, any[]>();
            for (const c of apiCompanies) {
              const key = String(c.api_token);
              const arr = tokenGroups.get(key);
              if (arr) arr.push(c); else tokenGroups.set(key, [c]);
            }

            tokenGroups.forEach(async (group) => {
              const rep = group[0]; // one representative gateway call per token
              let rawPrice: number | null = null;
              try {
                rawPrice = await fetchRawPrice(rep);
              } finally {
                if (!signal.aborted) {
                  // Apply the single raw rate to every provider on this token,
                  // Store the raw gateway price per company — surcharge is applied
                  // in processedCompanies so the modifier→surcharge order is preserved.
                  const updates: Record<string, number | null> = {};
                  for (const c of group) {
                    updates[c.id] = rawPrice != null && rawPrice > 0 ? rawPrice : null;
                  }
                  Object.assign(liveAccum, updates);
                  setLivePrices((prev) => ({ ...prev, ...updates }));
                  setLiveLoadingIds((prev) => {
                    const nextSet = new Set(prev);
                    for (const c of group) nextSet.delete(c.id);
                    return nextSet;
                  });
                  persist(); // keep the cache snapshot in sync with live prices
                }
              }
            });
          }
        }

        checkAvailability(airport, dropoff, pickup).catch(() => {});
        getLaunchTimerConfig().then((cfg) => { if (!signal.aborted) setTimerConfig(cfg); }).catch(() => {});

      } catch (e) {
        if (!signal.aborted) { logger.error("loadResults error:", e); setLoading(false); }
      } finally {
        isFetching.current = false;
      }
    }

    loadData();
  }, [searchParams, airport, dropoff, pickup, dropTime, pickTime, isHeathrow, serviceType]);

  // 3. Fire ONLY when the memoized loader changes (i.e. the URL params changed).
  //    AbortController cancels any in-flight request on unmount / param change.
  useEffect(() => {
    loadResults();
    return () => { abortRef.current?.abort(); isFetching.current = false; };
  }, [loadResults]);

  const processedCompanies = useMemo(() => {
    if (!pinnedOrder.length || !companies.length) return [];
    const compMap = new Map(companies.map((c) => [c.id, c]));

    return pinnedOrder.map((id) => {
      const c = compMap.get(id);
      if (!c) return null;

      const isApiMode = c.pricing_mode !== "pivot" && !!c.api_token;

      let priceObj: { original: number; final: number; modifier: number; source: string };

      if (isApiMode) {
        // ── API Mode: No Pivot Fallback Permitted ──
        const requestDone  = id in livePrices;           
        const adjustedLive = requestDone ? livePrices[id] : null;

        if (adjustedLive != null && adjustedLive > 0) {
          // adjustedLive is the raw gateway price (no surcharge baked in).
          // Order: modifier first → surcharge → markup, matching pricing.ts.
          const modifier      = Number(c.price_modifier || 1);
          const surchargeRate = Number(c.dynamic_surcharge_percent || 0) / 100;
          const markup        = settings.markupEnabled ? (1 + (settings.markupPercent || 10) / 100) : 1;
          const original = adjustedLive * (1 + surchargeRate) * markup;          // no modifier → strikethrough price
          const final    = adjustedLive * modifier * (1 + surchargeRate) * markup; // modifier → surcharge → markup
          priceObj = { original, final, modifier, source: "api" };
        } else {
          // If still loading or API returned nothing/timed out → Fail Closed (price box displays Unavailable)
          priceObj = { original: 0, final: 0, modifier: 1, source: "api" };
        }
      } else {
        // ── Pivot Mode: Use Manual Rate Matrices ──
        const pr = computePrice({
          company:      c,
          airport,
          duration,
          dropDate:     dropoff,
          liveApiRates: [],   
          settings,
          fallbackPrice: 0,
        });

        // Surcharge is applied ONCE inside computePrice (pricing.ts) for both
        // API and pivot companies. This branch previously multiplied by
        // (1 + surcharge) AGAIN — double-charging pivot companies ((1+s)²
        // instead of (1+s)). Fixed 2026-06: computePrice is the single source
        // of truth, matching checkout/page.tsx and api/checkout/route.ts.
        priceObj = {
          original: pr.original,
          final:    pr.final,
          modifier: pr.modifier,
          source:   pr.ok ? "pivot" : "none",
        };
      }

      return { ...c, calculatedPriceObj: priceObj };
    }).filter(Boolean) as any[];
  }, [pinnedOrder, companies, livePrices, settings, airport, duration, dropoff]);

  // Pure client-side view transform over the engine's authoritative output.
  // "recommended" keeps the engine's pinned order; price/rating only re-sort.
  // An operator with no price (or sold out) can't be booked, so it never leads
  // the list or wears "Recommended". Still-loading live rates keep their place
  // so cards don't jump around while prices arrive.
  const isBookable = useCallback((o: PricedCompany) => {
    const soldOut = Boolean(isHeathrow ? o.lhr_sold_out : o.ltn_sold_out);
    return !soldOut && (liveLoadingIds.has(o.id) || (o.calculatedPriceObj?.final ?? 0) > 0);
  }, [isHeathrow, liveLoadingIds]);

  const visibleOperators = useMemo<PricedCompany[]>(() => {
    const sorted = sortCompanies(processedCompanies as PricedCompany[], sortKey);
    return [...sorted.filter(isBookable), ...sorted.filter((o) => !isBookable(o))];
  }, [processedCompanies, sortKey, isBookable]);
  const bookableCount = visibleOperators.filter(isBookable).length;

  return (
    <div className="max-w-[1000px] mx-auto px-4 py-6 md:py-8">
      <div className="mb-10 mt-4">
        <BookingStepper currentStep={stepToIndex(searchParams.get("step"))} theme="light" />
      </div>

      <SearchSummaryHeader
        airport={airport}
        dropoff={dropoff}
        pickup={pickup}
        nights={duration}
        serviceType={serviceType}
        onEdit={onEditSearch}
      />

      {/* Aero concierge — a status line, not a notification card */}
      <div className="flex items-start gap-3 mb-6">
        <button
          type="button"
          onClick={() => window.dispatchEvent(new Event("aero:open-chat"))}
          aria-label="Ask Aero a question"
          title="Ask Aero a question"
          className="shrink-0 rounded-lg focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2"
        >
          <AeroAvatar className="w-8 h-8" />
        </button>
        <div className="min-w-0 text-sm leading-relaxed">
          <p className="text-slate-800">
            {loading
              ? "Finding operators for your dates…"
              : bookableCount > 0
              ? `${bookableCount} ${bookableCount === 1 ? "operator has" : "operators have"} prices for your dates at ${isHeathrow ? "Heathrow" : "Luton"}.`
              : `No operators have prices for these dates at ${isHeathrow ? "Heathrow" : "Luton"} yet.`}
            {!loading && (
              <button
                type="button"
                onClick={() => window.dispatchEvent(new Event("aero:open-chat"))}
                className="ml-2 font-semibold text-blue-700 underline-offset-4 hover:underline"
              >
                Ask Aero
              </button>
            )}
          </p>
          {aeroTip && <p className="text-slate-600 mt-1">{aeroTip}</p>}
          {liveLoadingIds.size > 0 && (
            <p className="flex items-center gap-1.5 text-slate-500 mt-1">
              <Loader2 className="w-3.5 h-3.5 animate-spin" aria-hidden="true" />
              Getting live prices from {liveLoadingIds.size} {liveLoadingIds.size === 1 ? "operator" : "operators"}…
            </p>
          )}
          {timerConfig?.enabled && timerConfig.benefitValue && (
            <p className="text-slate-500 mt-1">
              Founding customer offer: <span className="font-medium text-slate-800">{timerConfig.benefitValue.split("+").map((x) => x.trim()).filter(Boolean).join(" + ")}</span>
            </p>
          )}
        </div>
      </div>

      {loading ? (
        <div className="space-y-5" aria-busy="true">
          <ResultsCardSkeleton />
          <ResultsCardSkeleton />
          <ResultsCardSkeleton />
        </div>
      ) : visibleOperators.length === 0 ? (
        <div className="text-center py-14 md:py-20 bg-white rounded-xl border border-slate-200 px-6">
          {!serviceType.toLowerCase().includes("meet") ? (
            <>
              <Clock className="w-8 h-8 text-slate-400 mx-auto" aria-hidden="true" />
              <h2 className="mt-4 text-xl font-semibold text-slate-900">
                {serviceType.toLowerCase().includes("hotel") ? "Hotel & Parking" : "Park & Ride"} is coming soon here
              </h2>
              <p className="mt-2 text-slate-600 max-w-lg mx-auto">
                We&apos;re adding operators. In the meantime, you can book Meet &amp; Greet for the same dates.
              </p>
              <button
                type="button"
                onClick={() => { const q = new URLSearchParams(searchParams.toString()); q.set("type", "meet-greet"); router.push(`/results?${q.toString()}`); }}
                className="mt-6 inline-flex items-center gap-2 h-11 px-5 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg"
              >
                <CarFront className="w-4 h-4" aria-hidden="true" /> See Meet &amp; Greet prices
              </button>
            </>
          ) : (
            <>
              <AlertCircle className="w-8 h-8 text-slate-400 mx-auto" aria-hidden="true" />
              <h2 className="mt-4 text-xl font-semibold text-slate-900">No operators available for these dates</h2>
              <p className="text-slate-600 mt-2 max-w-md mx-auto">Try different dates or times, or call us on {COMPANY.phoneDisplay}.</p>
            </>
          )}
        </div>
      ) : (
        <>
          {visibleOperators.length > 1 && (
            <FilterBar value={sortKey} onChange={setSortKey} count={visibleOperators.length} />
          )}
          <div className="space-y-5">
            {visibleOperators.map((operator, idx) => (
              <OperatorCard
                key={operator.id}
                operator={operator}
                duration={duration}
                isHeathrow={isHeathrow}
                promo={livePromo}
                onSelect={handleBooking}
                featured={sortKey === "recommended" && idx === 0 && isBookable(operator)}
                liveRateLoading={liveLoadingIds.has(operator.id)}
              />
            ))}
          </div>
        </>
      )}

      {visibleOperators.length > 0 && (
        <EmailQuoteCard
          airport={airport}
          dropoffDate={dropoff}
          pickupDate={pickup}
          dropoffTime={dropTime}
          pickupTime={pickTime}
          serviceType={serviceType}
          fromPrice={Number(visibleOperators[0]?.calculatedPriceObj?.final) || undefined}
        />
      )}
    </div>
  );
}

// ─── AIRPORT TITLE ────────────────────────────────────────────────────────────
// Compact, persistent airport-code badge for the sticky header. The full search
// context (dates · nights · service) + Edit now live in <SearchSummaryHeader/>,
// so this no longer repeats the dates — it just keeps the airport visible while
// the user scrolls the operator list.
// ─── LAYOUT ───────────────────────────────────────────────────────────────────
function ResultsLayout() {
  const router       = useRouter();
  const searchParams = useSearchParams();
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);

  const currentSearch = useMemo(() => ({
    airport:  searchParams.get("airport")     || "Luton (LTN)",
    dropDate: searchParams.get("dropoffDate") || "",
    dropTime: searchParams.get("dropoffTime") || "10:00",
    pickDate: searchParams.get("pickupDate")  || "",
    pickTime: searchParams.get("pickupTime")  || "10:00",
    type:     searchParams.get("type")        || "meet-greet",
  }), [searchParams]);

  return (
    <main suppressHydrationWarning className="min-h-screen bg-slate-50 font-sans antialiased selection:bg-blue-500/30 overflow-x-clip relative">
      <FunnelHeader
        left={
          <Link href="/" className={funnelSlotClass}>
            <ArrowLeft className="w-4 h-4" aria-hidden="true" />
            <span className="hidden sm:inline">Home</span>
          </Link>
        }
        right={
          <a href={COMPANY.phoneHref} className={funnelSlotClass}>
            <Phone className="w-4 h-4" aria-hidden="true" />
            <span className="hidden md:inline">{COMPANY.phoneDisplay}</span>
          </a>
        }
      />
      <div className="relative z-10 pb-24 md:pb-32"><ResultsContent onEditSearch={() => setIsEditModalOpen(true)} /></div>
      <ModifySearchModal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        onSearchUpdate={(qs) => { setIsEditModalOpen(false); router.push(`/results?${qs}`); }}
        currentSearch={currentSearch}
      />
      <FunnelFooter />
    </main>
  );
}

export default function ResultsPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-slate-50 flex items-center justify-center text-sm text-slate-500">
        Loading prices…
      </div>
    }>
      <ResultsLayout />
    </Suspense>
  );
}