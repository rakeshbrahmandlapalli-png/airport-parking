"use client";

import { logger } from "@/app/lib/logger";
import LaunchTimer from "@/components/LaunchTimer";
import BookingStepper from "@/components/BookingStepper";
import ModifySearchModal from "@/components/ModifySearchModal";
import { checkAvailability, getLaunchTimerConfig, type LaunchTimerConfig } from "../actions";
import { useSearchParams, useRouter } from "next/navigation";
import {
  Clock, ArrowLeft, Plane, AlertCircle, Zap, CarFront, CheckCircle2, Loader2,
  Mail, Send,
} from "lucide-react";
import Link from "next/link";
import { Suspense, useState, useMemo, useEffect, useCallback, useRef, useLayoutEffect } from "react";
import { supabase } from "../lib/supabase";
import { computePrice, calculateDays, loadPricingSettings, DEFAULT_SETTINGS, type PricingSettings } from "../lib/pricing";
import { type PricedCompany, type SortKey, sortCompanies } from "../lib/domain";
import { OperatorCard } from "@/components/results/OperatorCard";
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
    <div className="bg-[#0F1523] border border-slate-800 rounded-2xl p-5 md:p-6 animate-pulse" aria-hidden="true">
      <div className="flex items-center gap-4">
        <div className="w-16 h-16 rounded-2xl bg-slate-800 shrink-0" />
        <div className="flex-1 space-y-2.5">
          <div className="h-4 w-2/5 bg-slate-800 rounded" />
          <div className="h-3 w-1/4 bg-slate-800 rounded" />
        </div>
        <div className="h-10 w-24 bg-slate-800 rounded-xl shrink-0" />
      </div>
      <div className="mt-5 space-y-2.5">
        <div className="h-3 w-full bg-slate-800 rounded" />
        <div className="h-3 w-3/4 bg-slate-800 rounded" />
      </div>
      <div className="mt-5 h-12 w-full bg-slate-800 rounded-xl" />
    </div>
  );
}


// ─── AERO AVATAR ──────────────────────────────────────────────────────────────
function AeroAvatar({ size = "md", thinking = false }: { size?: "sm" | "md" | "lg"; thinking?: boolean }) {
  const s  = { sm: "w-9 h-9 rounded-xl",  md: "w-12 h-12 rounded-2xl", lg: "w-20 h-20 rounded-3xl" };
  const ew = { sm: "w-1",                  md: "w-1.5",                  lg: "w-2" };
  const eh = { sm: "h-2.5",                md: "h-3.5",                  lg: "h-6" };
  const g  = { sm: "gap-1",                md: "gap-1.5",                lg: "gap-2" };
  return (
    <div className={`relative flex items-center justify-center shrink-0 ${s[size]}`}>
      <div className={`absolute inset-0 bg-blue-500/40 blur-xl ${thinking ? "animate-pulse scale-110" : ""}`} />
      <div className={`relative w-full h-full bg-gradient-to-br from-blue-400 via-blue-600 to-blue-700 flex items-center justify-center shadow-[0_0_25px_rgba(37,99,235,0.5)] overflow-hidden group border border-blue-300/30 ${s[size]}`}>
        <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent pointer-events-none" />
        <div className={`flex ${g[size]} z-10 ${thinking ? "animate-pulse" : ""}`}>
          <div className={`${ew[size]} ${eh[size]} bg-white rounded-full shadow-[0_0_10px_rgba(255,255,255,0.9)]`} />
          <div className={`${ew[size]} ${eh[size]} bg-white rounded-full shadow-[0_0_10px_rgba(255,255,255,0.9)]`} />
        </div>
      </div>
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
      <div className="mt-6 bg-[#0F1523] border border-emerald-700/40 rounded-3xl p-6 sm:p-7 flex items-center gap-4">
        <div className="w-12 h-12 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center shrink-0">
          <CheckCircle2 className="w-6 h-6 text-emerald-400" />
        </div>
        <div>
          <p className="text-white font-black text-base">Quote sent — check your inbox</p>
          <p className="text-slate-400 text-sm mt-0.5">
            We've emailed your {airport} quote. Your prices and free cancellation are held — book whenever you're ready.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="mt-6 bg-gradient-to-br from-[#0F1523] to-[#0B1220] border border-blue-900/40 rounded-3xl p-6 sm:p-7 shadow-xl relative overflow-hidden">
      <div className="absolute -right-12 -top-12 w-40 h-40 bg-blue-600/10 rounded-full blur-3xl pointer-events-none" />
      <div className="relative z-10 flex flex-col sm:flex-row sm:items-center gap-5">
        <div className="flex items-center gap-4 flex-1 min-w-0">
          <div className="w-12 h-12 rounded-2xl bg-blue-500/15 border border-blue-500/30 flex items-center justify-center shrink-0">
            <Mail className="w-6 h-6 text-blue-400" />
          </div>
          <div className="min-w-0">
            <p className="text-white font-black text-base leading-tight">Not ready to book? Email me this quote</p>
            <p className="text-slate-400 text-sm mt-0.5">
              We'll send your prices and a link to pick up exactly where you left off.
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
            className="flex-1 bg-[#070B14] border border-slate-700 focus:border-blue-500 rounded-xl px-4 py-3 text-sm text-white placeholder-slate-500 outline-none transition-colors"
          />
          <button
            type="submit"
            disabled={!valid || status === "sending"}
            className="inline-flex items-center justify-center gap-2 px-5 py-3 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-black uppercase tracking-widest text-[11px] rounded-xl transition-all active:scale-95 shrink-0"
          >
            {status === "sending"
              ? <><Loader2 className="w-4 h-4 animate-spin" /> Sending</>
              : <><Send className="w-4 h-4" /> Send</>}
          </button>
        </form>
      </div>
      {status === "error" && (
        <p className="relative z-10 text-rose-400 text-xs font-semibold mt-3 sm:text-right">{error}</p>
      )}
    </div>
  );
}

// ─── MAIN RESULTS CONTENT ─────────────────────────────────────────────────────
function ResultsContent({ onEditSearch }: { onEditSearch: () => void }) {
  const searchParams = useSearchParams();
  const router       = useRouter();

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
  const visibleOperators = useMemo<PricedCompany[]>(
    () => sortCompanies(processedCompanies as PricedCompany[], sortKey, isHeathrow),
    [processedCompanies, sortKey, isHeathrow],
  );

  return (
    <div className="max-w-[1000px] mx-auto px-4 py-6 md:py-8">
      <div className="mb-10 mt-4">
        <BookingStepper currentStep={stepToIndex(searchParams.get("step"))} />
      </div>

      <SearchSummaryHeader
        airport={airport}
        dropoff={dropoff}
        pickup={pickup}
        nights={duration}
        serviceType={serviceType}
        onEdit={onEditSearch}
      />

      {/* Aero concierge bar + launch timer */}
      <div className="flex flex-col lg:flex-row gap-3 mb-8">
        <div className="flex-1 bg-[#0F1523] border border-blue-900/30 rounded-2xl p-4 sm:p-5 flex items-center gap-4 shadow-xl relative overflow-hidden">
          <div className="absolute -right-16 -top-16 w-48 h-48 bg-blue-600/10 rounded-full blur-[100px] pointer-events-none" />
          <AeroAvatar size="md" />
          <div className="relative z-10 min-w-0">
            <p className="text-[9px] font-black uppercase tracking-[0.18em] text-blue-400 flex items-center gap-1.5">
              <Zap className="w-3 h-3 fill-current" /> Aero concierge · {visibleOperators.length} verified
            </p>
            <p className="text-white text-sm font-bold leading-snug mt-0.5">
              {visibleOperators.length > 0
                ? `All approved & secured for your dates at ${isHeathrow ? "Heathrow" : "Luton"}.`
                : "Scanning approved compounds..."}
            </p>
            {aeroTip && <p className="text-blue-200/80 text-xs font-medium mt-1.5 leading-relaxed">{aeroTip}</p>}
            {liveLoadingIds.size > 0 && (
              <p className="flex items-center gap-1.5 text-[9px] font-black text-emerald-400 uppercase tracking-widest mt-1.5 animate-pulse">
                <Loader2 className="w-3 h-3 animate-spin" />
                Updating live rates ({liveLoadingIds.size} remaining)...
              </p>
            )}
          </div>
        </div>
        {timerConfig?.enabled && (
          <div className="lg:w-[300px] shrink-0">
            <LaunchTimer
              hours={timerConfig.hours}
              slotsClaimed={timerConfig.slotsClaimed}
              totalSlots={timerConfig.slotsTotal}
              badge={timerConfig.badge}
              title={timerConfig.title}
              subtitle={timerConfig.subtitle}
              benefitTitle={timerConfig.benefitTitle}
              benefitValue={timerConfig.benefitValue}
              benefitNote={timerConfig.benefitNote}
            />
          </div>
        )}
      </div>

      {loading ? (
        <div className="space-y-5" aria-busy="true">
          <ResultsCardSkeleton />
          <ResultsCardSkeleton />
          <ResultsCardSkeleton />
        </div>
      ) : visibleOperators.length === 0 ? (
        <div className="text-center py-16 md:py-24 bg-[#0F1523] rounded-2xl border border-dashed border-slate-700 px-6">
          {!serviceType.toLowerCase().includes("meet") ? (
            <>
              <div className="w-16 h-16 bg-[#1A2235] border border-slate-700 rounded-3xl flex items-center justify-center mx-auto mb-6">
                <Clock className="w-8 h-8 text-blue-400" />
              </div>
              <h3 className="text-2xl font-black text-white mb-3">
                {serviceType.toLowerCase().includes("hotel") ? "Hotel & Parking" : "Park & Ride"} Coming Soon!
              </h3>
              <p className="text-slate-400 text-sm max-w-lg mx-auto mb-8">
                We're onboarding top operators. In the meantime, our{" "}
                <strong className="text-white">Meet & Greet</strong> service is often the same price.
              </p>
              <button
                onClick={() => { const q = new URLSearchParams(searchParams.toString()); q.set("type", "meet-greet"); router.push(`/results?${q.toString()}`); }}
                className="inline-flex items-center gap-3 px-8 py-4 bg-blue-600 hover:bg-blue-500 text-white font-black uppercase tracking-widest text-xs rounded-xl transition-all active:scale-95"
              >
                <CarFront className="w-4 h-4" /> View Meet & Greet Prices
              </button>
            </>
          ) : (
            <>
              <AlertCircle className="w-12 h-12 text-slate-600 mx-auto mb-4" />
              <h3 className="text-xl font-black text-white">No Active Providers Found</h3>
              <p className="text-slate-500 mt-2 text-sm max-w-md mx-auto">Try modifying your search dates or times.</p>
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
                onSelect={handleBooking}
                featured={sortKey === "recommended" && idx === 0}
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
function AirportTitle() {
  const searchParams = useSearchParams();
  const airport = searchParams.get("airport") || "Luton (LTN)";
  const code = airport.includes("Heathrow") ? "LHR" : "LTN";
  return (
    <span className="text-sm md:text-base font-black text-white tracking-widest leading-none">{code}</span>
  );
}

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
    <main suppressHydrationWarning className="min-h-screen bg-[#060A14] font-sans antialiased pb-24 md:pb-32 selection:bg-blue-500/30 overflow-x-hidden relative">
      <div className="fixed inset-0 pointer-events-none z-0 flex justify-center overflow-hidden">
        <div className="w-full max-w-[1000px] h-96 bg-blue-600/5 blur-[120px] rounded-full absolute -top-48" />
      </div>
      <header className="sticky top-0 z-[100] bg-[#060A14]/90 backdrop-blur-xl border-b border-white/5 h-16 md:h-20 flex items-center px-4 md:px-8 justify-between shadow-2xl">
        <Link href="/" className="text-slate-400 hover:text-white transition-colors flex items-center gap-2 group touch-manipulation">
          <ArrowLeft className="w-4 h-4 md:w-5 md:h-5 lg:group-hover:-translate-x-1 transition-transform" />
          <span className="text-[9px] md:text-[10px] font-black uppercase tracking-[0.2em] hidden md:block">Home</span>
        </Link>
        <Link href="/" className="flex items-center gap-1.5 md:gap-2 text-white font-black tracking-tighter text-xl md:text-2xl uppercase absolute left-1/2 -translate-x-1/2 touch-manipulation">
          <Plane className="w-5 h-5 md:w-7 md:h-7 text-blue-500 rotate-45" /> AEROPARK<span className="text-blue-500">DIRECT</span>
        </Link>
        <button onClick={() => setIsEditModalOpen(true)} className="text-right touch-manipulation cursor-pointer">
          <AirportTitle />
        </button>
      </header>
      <div className="relative z-10"><ResultsContent onEditSearch={() => setIsEditModalOpen(true)} /></div>
      <ModifySearchModal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        onSearchUpdate={(qs) => { setIsEditModalOpen(false); router.push(`/results?${qs}`); }}
        currentSearch={currentSearch}
      />
    </main>
  );
}

export default function ResultsPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-[#060A14] flex items-center justify-center font-black text-slate-400 uppercase tracking-[0.2em] text-xs">
        Aero is Initializing...
      </div>
    }>
      <ResultsLayout />
    </Suspense>
  );
}