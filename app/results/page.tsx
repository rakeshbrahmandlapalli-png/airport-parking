"use client";

import LaunchTimer from "@/components/LaunchTimer";
import BookingStepper from "@/components/BookingStepper";
import ModifySearchModal from "@/components/ModifySearchModal";
import { checkAvailability, getLaunchTimerConfig, type LaunchTimerConfig } from "../actions";
import { useSearchParams, useRouter } from "next/navigation";
import {
  MapPin, Clock, ShieldCheck, ChevronRight, ThumbsUp, ArrowLeft,
  ChevronDown, Plane, Footprints, User, Star, Ban, Bus, BedDouble,
  Info, PlaneTakeoff, PlaneLanding, Map as MapIcon, Navigation,
  AlertCircle, Sparkles, MessageSquare, Zap, Tag, CarFront,
  BatteryCharging, Briefcase, Percent, CheckCircle2, Lock, Loader2
} from "lucide-react";
import Link from "next/link";
import { Suspense, useState, useMemo, useEffect, useCallback } from "react";
import { supabase } from "../lib/supabase";
import { computePrice, calculateDays, DEFAULT_SETTINGS, type PricingSettings } from "../lib/pricing";

// ─── LIVE ACTIVITY TICKER ─────────────────────────────────────────────────────
function LiveActivity() {
  const [text, setText] = useState("John from London just booked Meet & Greet");
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const messages = [
      "Sarah from Luton just booked Meet & Greet",
      "Mike from Watford secured a 30% discount",
      "Emma from Milton Keynes just booked 24/7 parking",
      "David from St Albans joined as a Founding Member",
      "James from London just booked Park & Ride",
    ];
    let i = 0;
    setTimeout(() => setVisible(true), 2000);
    const interval = setInterval(() => {
      setVisible(false);
      setTimeout(() => { i = (i + 1) % messages.length; setText(messages[i]); setVisible(true); }, 500);
    }, 12000);
    return () => clearInterval(interval);
  }, []);
  return (
    <div className={`fixed bottom-6 left-6 z-[998] hidden lg:flex transition-all duration-500 ${visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"}`}>
      <div className="bg-white/90 backdrop-blur-md border border-slate-200 px-4 py-2.5 rounded-full shadow-lg flex items-center gap-2.5 text-[9px] font-black uppercase text-slate-700 tracking-widest">
        <div className="relative flex h-2 w-2">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
          <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
        </div>
        {text}
      </div>
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

// ─── BADGE ICON MAP ───────────────────────────────────────────────────────────
const getBadgeIcon = (label: string) => {
  const l = label.toUpperCase();
  if (l.includes("WALK"))                              return Footprints;
  if (l.includes("BUS"))                               return Bus;
  if (l.includes("VALET"))                             return CarFront;
  if (l.includes("HOUR"))                              return Clock;
  if (l.includes("TERMINAL"))                          return Navigation;
  if (l.includes("FEE"))                               return Tag;
  if (l.includes("AERO"))                              return Sparkles;
  if (l.includes("FAST"))                              return Zap;
  if (l.includes("PET"))                               return Footprints;
  if (l.includes("SECURITY") || l.includes("SECURE")) return ShieldCheck;
  if (l.includes("MEET"))                              return User;
  if (l.includes("HOTEL"))                             return BedDouble;
  if (l.includes("CHARG"))                             return BatteryCharging;
  if (l.includes("LUGGAGE"))                           return Briefcase;
  if (l.includes("FREE") || l.includes("CANCEL") || l.includes("INCLUDED")) return CheckCircle2;
  if (l.includes("DISCOUNT") || l.includes("OFFER"))  return Percent;
  if (l.includes("VIP") || l.includes("STAR"))        return Star;
  if (l.includes("HIDDEN") || l.includes("NO "))      return CheckCircle2;
  return Info;
};

const getAvgRating = (reviews: any[]) => {
  if (!reviews?.length) return null;
  return (reviews.reduce((s: number, r: any) => s + Number(r.rating || 0), 0) / reviews.length).toFixed(1);
};

// ─── COMPANY LOGO ─────────────────────────────────────────────────────────────
function CompanyLogo({ logoUrl, name, size = "md" }: { logoUrl?: string; name: string; size?: "sm" | "md" | "lg" }) {
  const [imgError, setImgError] = useState(false);
  useEffect(() => { setImgError(false); }, [logoUrl]);
  const sizes = {
    sm: "w-10 h-10 rounded-xl text-base",
    md: "w-14 h-14 rounded-2xl text-xl",
    lg: "w-16 h-16 rounded-2xl text-2xl",
  };
  if (logoUrl && !imgError) {
    return (
      <img
        src={logoUrl}
        alt={name}
        className={`${sizes[size]} object-contain bg-white p-1.5 border border-slate-700/50 shrink-0`}
        onError={() => setImgError(true)}
      />
    );
  }
  return (
    <div className={`${sizes[size]} bg-[#1A2235] border border-slate-700/50 flex items-center justify-center font-black text-slate-400 shrink-0`}>
      {name.charAt(0).toUpperCase()}
    </div>
  );
}

// ─── DETAIL PANEL ─────────────────────────────────────────────────────────────
function DetailPanel({ option, isHeathrow }: any) {
  const [activeTab, setActiveTab] = useState("overview");
  const arrivalInstructions = isHeathrow ? option.on_arrival_lhr : option.on_arrival_ltn;
  const returnInstructions  = isHeathrow ? option.on_return_lhr  : option.on_return_ltn;
  const currentReviews      = isHeathrow ? option.lhr_reviews || [] : option.ltn_reviews || [];
  const safeMapLink = `http://googleusercontent.com/maps.google.com/maps?q=${encodeURIComponent((option.address || "") + " " + (option.postcode || ""))}`;
  return (
    <details className="group/details">
      <summary className="inline-flex items-center gap-2 text-[11px] font-black uppercase tracking-widest cursor-pointer list-none select-none text-blue-400 hover:text-blue-300 transition-colors touch-manipulation [-webkit-tap-highlight-color:transparent] [&::-webkit-details-marker]:hidden">
        <span>View Details, Instructions &amp; Reviews</span>
        <ChevronDown className="w-4 h-4 transition-transform duration-300 group-open/details:rotate-180" />
      </summary>
      <div className="mt-4 rounded-2xl border border-slate-800 bg-[#060A14] overflow-hidden animate-in fade-in slide-in-from-top-4 duration-300">
        <div className="flex flex-wrap items-center gap-1.5 p-2 border-b border-slate-800 overflow-x-auto no-scrollbar">
          {[
            { id: "overview", label: "Overview",                           Icon: Info },
            { id: "arrival",  label: "Arrival",                            Icon: PlaneTakeoff },
            { id: "return",   label: "Return",                             Icon: PlaneLanding },
            { id: "map",      label: "Location",                           Icon: MapIcon },
            { id: "reviews",  label: `Reviews (${currentReviews.length})`, Icon: MessageSquare },
          ].map((tab) => (
            <button key={tab.id} onClick={(e) => { e.preventDefault(); setActiveTab(tab.id); }}
              className={`flex items-center gap-1.5 px-3 py-2 text-[9px] font-black uppercase tracking-widest rounded-lg transition-all whitespace-nowrap touch-manipulation ${activeTab === tab.id ? "bg-blue-600 text-white" : "text-slate-400 hover:text-slate-200 hover:bg-white/5"}`}>
              <tab.Icon className="w-3 h-3" /> {tab.label}
            </button>
          ))}
        </div>
        <div className="p-4 sm:p-6 min-h-[80px]">
          {activeTab === "overview" && <div className="text-xs leading-relaxed text-slate-300" dangerouslySetInnerHTML={{ __html: option.overview || "Professional secure parking service with 24/7 patrols." }} />}
          {activeTab === "arrival"  && <div className="text-xs leading-relaxed text-slate-300" dangerouslySetInnerHTML={{ __html: arrivalInstructions || "Drive directly to the terminal and call 20 mins before arrival." }} />}
          {activeTab === "return"   && <div className="text-xs leading-relaxed text-slate-300" dangerouslySetInnerHTML={{ __html: returnInstructions  || "Call the dispatch team after clearing customs." }} />}
          {activeTab === "map" && (
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="flex-1">
                <p className="text-[10px] font-black uppercase tracking-widest text-blue-400 mb-1">Arrival Location</p>
                <p className="text-sm font-bold text-white">{option.address || "Details provided at terminal"}</p>
                <p className="text-xs mt-1 text-slate-400">Postcode: {option.postcode || (isHeathrow ? "TW6 1EW" : "LU2 9LY")}</p>
                {option.address && (
                  <a href={safeMapLink} target="_blank" rel="noreferrer"
                    className="inline-flex items-center gap-1.5 mt-3 text-[10px] font-black uppercase text-blue-400 hover:text-blue-300 touch-manipulation">
                    <Navigation className="w-3 h-3" /> Get Directions
                  </a>
                )}
              </div>
              <div className="flex-1 h-32 sm:h-40 bg-[#0A101D] rounded-xl overflow-hidden relative border border-slate-800 flex items-center justify-center group cursor-pointer">
                {option.map_url
                  ? <iframe src={option.map_url} width="100%" height="100%" style={{ border: 0 }} loading="lazy" referrerPolicy="no-referrer-when-downgrade" className="grayscale opacity-70 group-hover:grayscale-0 group-hover:opacity-100 transition-all duration-500" />
                  : <div className="text-slate-500 text-[10px] font-black uppercase flex flex-col items-center gap-2"><MapPin className="w-5 h-5" /> Map Preview</div>}
              </div>
            </div>
          )}
          {activeTab === "reviews" && (
            <div className="space-y-4 max-h-60 overflow-y-auto pr-2">
              {currentReviews.length > 0 ? currentReviews.map((r: any) => (
                <div key={r.id} className="border-b border-slate-800 pb-4 last:border-0">
                  <div className="flex flex-wrap items-center justify-between gap-2 mb-1">
                    <div className="flex items-center gap-2 font-bold text-xs text-blue-400">
                      {r.author}<span className="text-slate-600">•</span>
                      <span className="flex items-center gap-0.5 text-amber-400"><Star className="w-2.5 h-2.5 fill-current" /> {r.rating}/5</span>
                    </div>
                    {r.date && <span className="text-[10px] font-bold text-slate-500">{new Date(r.date).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}</span>}
                  </div>
                  <div className="flex items-center gap-2 mb-1">
                    {r.verified && <span className="text-[9px] font-black uppercase text-emerald-500 flex items-center gap-1"><CheckCircle2 className="w-3 h-3" /> Verified</span>}
                    {r.source   && <span className="text-[9px] font-black uppercase text-slate-400 bg-slate-800/50 px-1.5 py-0.5 rounded">{r.source}</span>}
                  </div>
                  <p className="text-xs italic text-slate-300">"{r.comment}"</p>
                </div>
              )) : <p className="text-xs text-slate-500">No reviews yet.</p>}
            </div>
          )}
        </div>
      </div>
    </details>
  );
}

// ─── PARKING CARD ─────────────────────────────────────────────────────────────
function ParkingCard({
  option, duration, isHeathrow, handleBooking, featured = false, liveRateLoading = false,
}: {
  option: any; duration: number; isHeathrow: boolean;
  handleBooking: (o: any, price: number) => void;
  featured?: boolean; liveRateLoading?: boolean;
}) {
  const priceObj   = option.calculatedPriceObj;
  const isSoldOut  = isHeathrow ? option.lhr_sold_out  : option.ltn_sold_out;
  const isFeatured = isHeathrow ? option.lhr_featured  : option.ltn_featured;
  const reviews    = isHeathrow ? option.lhr_reviews || [] : option.ltn_reviews || [];
  const rating     = getAvgRating(reviews);
  const { original, final, source } = priceObj;
  const isDiscounted = original > final && !isSoldOut;
  const perDay = duration > 0 ? (final / duration) : final;

  // ── Pricing mode from admin: "api" | "pivot"
  // If pricing_mode === "api" and we are still loading → show spinner
  // If pricing_mode === "api" and load done but no price → show N/A (never show pivot)
  // If pricing_mode === "pivot" → always show pivot, never call API
  const pricingMode: "api" | "pivot" = option.pricing_mode === "pivot" ? "pivot" : "api";
  const isApiMode = pricingMode === "api";

  const promoBadges: { label: string; color: string }[] = [];
  if (isDiscounted) {
    const savePct = Math.round(((original - final) / original) * 100);
    if (savePct > 0) promoBadges.push({ label: `${savePct}% Launch Special`, color: "bg-blue-500/20 text-blue-300 border-blue-500/30" });
  }
  if (isFeatured) promoBadges.push({ label: "Best Weekend Value", color: "bg-emerald-500/20 text-emerald-300 border-emerald-500/30" });

  const categoryLabel = option.category?.replace(/-/g, " ")?.replace(/\b\w/g, (c: string) => c.toUpperCase()) || "Meet Greet";
  const featureBadges = (option.badges || []).filter((b: any) => b.category === "General" || b.category === option.category);

  // What to show in the price box
  const showSpinner  = isApiMode && liveRateLoading;
  const showPrice    = !showSpinner && final > 0 && !isSoldOut;
  const showNA       = !showSpinner && !isSoldOut && final <= 0;
  const canSelect    = !isSoldOut && !showSpinner && final > 0;

  return (
    <div
      className={`rounded-2xl overflow-hidden border transition-all ${featured ? "border-blue-500/40 shadow-[0_0_40px_-10px_rgba(37,99,235,0.3)]" : "border-slate-800 hover:border-slate-700"} ${isSoldOut ? "opacity-60 grayscale-[30%]" : ""}`}
      style={{ background: "#0B1120" }}
    >
      {featured && <div className="h-[2px] bg-gradient-to-r from-blue-600 via-indigo-500 to-emerald-500" />}
      <div className="flex flex-col sm:flex-row">

        {/* LEFT */}
        <div className="flex-1 p-6 sm:p-8 flex flex-col gap-4">
          {promoBadges.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {promoBadges.map((b, i) => (
                <span key={i} className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest border ${b.color}`}>
                  <Sparkles className="w-3 h-3" /> {b.label}
                </span>
              ))}
            </div>
          )}

          {/* Logo + name */}
          <div className="flex items-center gap-4">
            <CompanyLogo logoUrl={option.logo_url} name={option.name} size="md" />
            <div className="min-w-0">
              <h2 className="text-2xl sm:text-3xl md:text-4xl font-black uppercase tracking-tight text-white leading-none truncate">
                {option.name}
              </h2>
              {rating && (
                <div className="flex items-center gap-1.5 mt-1.5">
                  <div className="flex items-center gap-0.5">
                    {[1,2,3,4,5].map(i => (
                      <Star key={i} className={`w-3 h-3 ${i <= Math.round(Number(rating)) ? "text-amber-400 fill-amber-400" : "text-slate-700"}`} />
                    ))}
                  </div>
                  <span className="text-[10px] font-black text-amber-400">{rating}</span>
                  <span className="text-[10px] font-bold text-slate-500">({reviews.length})</span>
                </div>
              )}
            </div>
          </div>

          {/* Feature badges */}
          <div className="flex flex-wrap gap-2">
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest bg-slate-800 text-slate-300 border border-slate-700">
              <ThumbsUp className="w-3 h-3" /> {categoryLabel}
            </span>
            {source === "api" && (
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                <Zap className="w-3 h-3" /> Live Rate
              </span>
            )}
            {source === "pivot" && (
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest bg-slate-700/50 text-slate-400 border border-slate-600/30">
                <Clock className="w-3 h-3" /> Fixed Rate
              </span>
            )}
            {featureBadges.map((badge: any, i: number) => {
              const BadgeIcon = getBadgeIcon(badge.label);
              return (
                <span key={i} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  <BadgeIcon className="w-3 h-3" /> {badge.label}
                </span>
              );
            })}
          </div>

          <div className="mt-auto pt-2">
            <DetailPanel option={option} isHeathrow={isHeathrow} />
          </div>
        </div>

        {/* RIGHT: price */}
        <div className="sm:w-[240px] md:w-[260px] shrink-0 border-t sm:border-t-0 sm:border-l border-slate-800/80 flex flex-col" style={{ background: "#080E1C" }}>
          <div className="flex-1 p-6 flex flex-col items-center justify-center text-center gap-1">
            <p className="text-[9px] font-black uppercase tracking-[0.25em] text-slate-500 mb-1">Total Stay Cost</p>

            {showSpinner && (
              <div className="flex flex-col items-center gap-2 py-3">
                <Loader2 className="w-6 h-6 text-emerald-400 animate-spin" />
                <p className="text-[10px] font-black text-emerald-400 uppercase tracking-widest animate-pulse">
                  Fetching Live Rate...
                </p>
              </div>
            )}

            {showNA && (
              <div className="flex flex-col items-center gap-1 py-3">
                <AlertCircle className="w-5 h-5 text-slate-600" />
                <p className="text-slate-500 text-sm font-black">Rate Unavailable</p>
                <p className="text-[9px] text-slate-600 font-bold uppercase tracking-widest">
                  {isApiMode ? "API returned no price" : "No pivot data set"}
                </p>
              </div>
            )}

            {isSoldOut && (
              <p className="font-black tracking-tighter leading-none text-slate-500 line-through text-4xl sm:text-5xl">
                £{final > 0 ? final.toFixed(2) : "—"}
              </p>
            )}

            {showPrice && (
              <>
                {isDiscounted && (
                  <p className="text-sm font-bold text-slate-500 line-through">£{original.toFixed(2)}</p>
                )}
                <p className="font-black tracking-tighter leading-none text-emerald-400 text-4xl sm:text-5xl">
                  £{final.toFixed(2)}
                </p>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">
                  Averaging £{perDay.toFixed(2)} / day
                </p>
                {source === "api" && (
                  <p className="text-[8px] font-black uppercase tracking-widest text-emerald-600 mt-0.5 flex items-center gap-1">
                    <Zap className="w-2.5 h-2.5" /> Live price
                  </p>
                )}
              </>
            )}
          </div>

          <div className="p-4 pt-0 flex flex-col items-center gap-2">
            <button
              disabled={!canSelect}
              onClick={() => canSelect && handleBooking(option, final)}
              className={`w-full h-12 font-black rounded-xl flex items-center justify-center gap-2 uppercase tracking-[0.15em] text-xs transition-all active:scale-95 ${
                isSoldOut
                  ? "bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-700"
                  : showSpinner
                  ? "bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-700"
                  : showNA
                  ? "bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-700"
                  : "bg-blue-600 hover:bg-blue-500 text-white shadow-[0_8px_20px_-5px_rgba(37,99,235,0.5)]"
              }`}
            >
              {isSoldOut   ? <><Ban className="w-4 h-4" /> Sold Out</>
              : showSpinner ? <><Loader2 className="w-4 h-4 animate-spin" /> Loading...</>
              : showNA      ? <><AlertCircle className="w-4 h-4" /> Unavailable</>
              :               <>Select <ChevronRight className="w-4 h-4" /></>}
            </button>
            {canSelect && (
              <p className="flex items-center gap-1.5 text-[9px] font-bold text-slate-600 uppercase tracking-widest">
                <Lock className="w-3 h-3" /> Payments secured by Stripe
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── FETCH WITH TIMEOUT ───────────────────────────────────────────────────────
async function fetchWithTimeout(url: string, options: RequestInit, ms = 8000): Promise<Response> {
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

// ─── MAIN RESULTS CONTENT ─────────────────────────────────────────────────────
function ResultsContent() {
  const searchParams = useSearchParams();
  const router       = useRouter();

  const [companies,     setCompanies]     = useState<any[]>([]);
  const [settings,      setSettings]      = useState<PricingSettings>(DEFAULT_SETTINGS);
  const [timerConfig,   setTimerConfig]   = useState<LaunchTimerConfig | null>(null);
  const [loading,       setLoading]       = useState(true);

  // companyId → confirmed live price (number) or null (failed/no data)
  // Key presence means "request completed". Missing key means "still pending".
  const [livePrices,     setLivePrices]     = useState<Record<string, number | null>>({});
  const [liveLoadingIds, setLiveLoadingIds] = useState<Set<string>>(new Set());

  // Card order pinned at first load — never re-sorted after that
  const [pinnedOrder, setPinnedOrder] = useState<string[]>([]);

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
    const query = new URLSearchParams(searchParams.toString());
    query.set("type",      option.name);
    query.set("price",     finalPrice.toString());
    query.set("companyId", option.id);
    router.push(`/checkout?${query.toString()}`);
  }, [searchParams, router]);

  useEffect(() => {
    let cancelled = false;

    async function loadData() {
      setLoading(true);
      setLivePrices({});
      setLiveLoadingIds(new Set());
      setPinnedOrder([]);

      try {
        // STEP 1 — Fetch companies + settings (fast, blocks only the skeleton)
        const [compRes, setRes] = await Promise.all([
          supabase.from("companies").select("*"),
          supabase.from("settings").select("*").in("key", ["markup_enabled", "markup_percent"]),
        ]);
        if (cancelled) return;

        const allCompanies: any[] = compRes.data || [];
        setCompanies(allCompanies);

        let resolvedSettings = DEFAULT_SETTINGS;
        if (setRes.data) {
          const en = setRes.data.find((r: any) => r.key === "markup_enabled");
          const pc = setRes.data.find((r: any) => r.key === "markup_percent");
          resolvedSettings = {
            markupEnabled: en ? en.value === "true" : true,
            markupPercent: pc ? Number(pc.value) || 10 : 10,
          };
          setSettings(resolvedSettings);
        }

        // STEP 2 — Filter + sort by pivot price, pin order immediately
        const relevantCompanies = allCompanies.filter((c) => {
          const cat = c.category?.toLowerCase().replace(/ & /g, "-").replace(/\s+/g, "-").trim();
          return (
            cat === serviceType.toLowerCase() &&
            (isHeathrow ? c.operates_at_heathrow : c.operates_at_luton) &&
            c.is_active
          );
        });

        const initialSorted = [...relevantCompanies].sort((a, b) => {
          const aSold = isHeathrow ? a.lhr_sold_out : a.ltn_sold_out;
          const bSold = isHeathrow ? b.lhr_sold_out : b.ltn_sold_out;
          if (aSold && !bSold) return 1;
          if (!aSold && bSold) return -1;
          const aFeat = isHeathrow ? a.lhr_featured : a.ltn_featured;
          const bFeat = isHeathrow ? b.lhr_featured : b.ltn_featured;
          if (aFeat && !bFeat) return -1;
          if (!aFeat && bFeat) return 1;
          const aP = isHeathrow ? Number(a.heathrow_price || 0) : Number(a.luton_price || 0);
          const bP = isHeathrow ? Number(b.heathrow_price || 0) : Number(b.luton_price || 0);
          return aP - bP;
        });

        setPinnedOrder(initialSorted.map((c) => c.id));
        // ← PAGE IS VISIBLE NOW
        setLoading(false);

        // STEP 3 — Only fire API calls for companies with pricing_mode = "api"
        // pricing_mode = "pivot" → never call the API, always use pivot
        if (dropoff && pickup) {
          const isSameDay   = dropoff === pickup;
          const apiPickTime = isSameDay ? "23:59" : pickTime;

          // Only companies that are set to API mode AND have a token
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
                if (cancelled) return null;
                try {
                  const res = await fetchWithTimeout(
                    "/api/parking-api",
                    {
                      method: "POST",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({
                        token_no:    c.api_token,
                        drop_date:   dropoff,
                        drop_time:   dropTime,
                        return_date: pickup,
                        return_time: apiPickTime,
                      }),
                    },
                    9000
                  );
                  if (cancelled) return null;
                  if (res.ok) {
                    const json = await res.json();
                    const rawPrice = extractApiPrice(json);
                    if (rawPrice != null) return rawPrice; // success
                  } else {
                    console.warn(`API non-OK for ${c.name}: HTTP ${res.status} (attempt ${attempt})`);
                  }
                } catch (e: any) {
                  if (e?.name === "AbortError") console.warn(`API timed out for ${c.name} (attempt ${attempt})`);
                  else console.warn(`API error for ${c.name} (attempt ${attempt}):`, e?.message);
                }
                // No price yet — back off briefly, then retry (upstream is warmer now)
                if (attempt < MAX_ATTEMPTS && !cancelled) {
                  await new Promise((r) => setTimeout(r, 700 * attempt));
                }
              }
              return null;
            };

            apiCompanies.forEach(async (c) => {
              try {
                const rawPrice = await fetchRawPrice(c);
                const surcharge = Number(c.dynamic_surcharge_percent || 0);
                const adjusted  = rawPrice != null ? rawPrice * (1 + surcharge / 100) : null;
                if (!cancelled) setLivePrices(prev => ({ ...prev, [c.id]: adjusted }));
              } finally {
                if (!cancelled) {
                  setLiveLoadingIds(prev => {
                    const next = new Set(prev);
                    next.delete(c.id);
                    return next;
                  });
                }
              }
            });
          }
        }

        // STEP 4 — Background tasks (non-blocking)
        checkAvailability(airport, dropoff, pickup).catch(() => {});
        getLaunchTimerConfig().then((cfg) => { if (!cancelled) setTimerConfig(cfg); }).catch(() => {});

      } catch (e) {
        console.error("loadData error:", e);
        if (!cancelled) setLoading(false);
      }
    }

    loadData();
    return () => { cancelled = true; };
  }, [airport, dropoff, pickup, dropTime, pickTime, isHeathrow, serviceType]);

  const processedCompanies = useMemo(() => {
    if (!pinnedOrder.length || !companies.length) return [];
    const compMap = new Map(companies.map((c) => [c.id, c]));

    return pinnedOrder.map((id) => {
      const c = compMap.get(id);
      if (!c) return null;

      // ── Determine pricing mode for this company ──
      // pricing_mode field set in admin: "api" (default if token exists) or "pivot"
      const isApiMode = c.pricing_mode !== "pivot" && !!c.api_token;
      const isPivotMode = !isApiMode;

      let priceObj: { original: number; final: number; modifier: number; source: string };

      if (isApiMode) {
        // API mode: only use live price. If still loading or failed → price = 0 (N/A shown)
        const requestDone  = id in livePrices;           // true once fetch completed (success or fail)
        const adjustedLive = requestDone ? livePrices[id] : null;

        if (adjustedLive != null && adjustedLive > 0) {
          // Good API price — apply price_modifier + global markup
          const modifier = Number(c.price_modifier || 1);
          const markup   = settings.markupEnabled ? (1 + (settings.markupPercent || 10) / 100) : 1;
          const final    = adjustedLive * modifier * markup;
          const original = adjustedLive * markup; // without per-company modifier for strikethrough
          priceObj = { original, final, modifier, source: "api" };
        } else {
          // Either still loading OR API returned nothing → show N/A, never fall back to pivot
          priceObj = { original: 0, final: 0, modifier: 1, source: "api" };
        }
      } else {
        // Pivot mode: use computePrice with pivot data, never call API
        const pr = computePrice({
          company:      c,
          airport,
          duration,
          dropDate:     dropoff,
          liveApiRates: [],   // always empty — pivot mode never uses live rates
          settings,
          fallbackPrice: 0,
        });
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

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto py-32 text-center flex flex-col items-center px-4">
        <AeroAvatar thinking size="lg" />
        <h2 className="text-xl font-black uppercase tracking-[0.3em] text-white mt-8 animate-pulse">Aero is Scanning</h2>
        <p className="text-slate-400 mt-3 font-medium">Securing live compound availability for {airport}...</p>
      </div>
    );
  }

  return (
    <div className="max-w-[960px] mx-auto px-4 py-6 md:py-8">
      <div className="mb-10 mt-4">
        <BookingStepper currentStep={1} />
      </div>

      {/* Aero concierge bar + launch timer */}
      <div className="flex flex-col lg:flex-row gap-3 mb-8">
        <div className="flex-1 bg-[#0F1523] border border-blue-900/30 rounded-2xl p-4 sm:p-5 flex items-center gap-4 shadow-xl relative overflow-hidden">
          <div className="absolute -right-16 -top-16 w-48 h-48 bg-blue-600/10 rounded-full blur-[100100px] pointer-events-none" />
          <AeroAvatar size="md" />
          <div className="relative z-10 min-w-0">
            <p className="text-[9px] font-black uppercase tracking-[0.18em] text-blue-400 flex items-center gap-1.5">
              <Zap className="w-3 h-3 fill-current" /> Aero concierge · {processedCompanies.length} verified
            </p>
            <p className="text-white text-sm font-bold leading-snug mt-0.5">
              {processedCompanies.length > 0
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

      {processedCompanies.length === 0 ? (
        <div className="text-center py-16 md:py-24 bg-[#0F1523] rounded-[2.5rem] border border-dashed border-slate-700 px-6">
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
                <strong className="text-white">Premium Meet & Greet</strong> service is often the same price.
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
        <div className="space-y-4">
          {processedCompanies.map((option, idx) => (
            <ParkingCard
              key={option.id}
              option={option}
              duration={duration}
              isHeathrow={isHeathrow}
              handleBooking={handleBooking}
              featured={idx === 0}
              liveRateLoading={liveLoadingIds.has(option.id)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// ─── AIRPORT TITLE ────────────────────────────────────────────────────────────
function AirportTitle() {
  const searchParams = useSearchParams();
  const airport  = searchParams.get("airport")     || "Luton (LTN)";
  const dropDate = searchParams.get("dropoffDate") || "";
  const pickDate = searchParams.get("pickupDate")  || "";
  const fmt = (d: string) =>
    d ? new Date(d).toLocaleDateString("en-GB", { day: "numeric", month: "short" }) : "";
  const code = airport.includes("Heathrow") ? "LHR" : "LTN";
  return (
    <div className="flex flex-col items-end">
      <span className="text-sm md:text-base font-black text-white tracking-widest leading-none mb-1">{code}</span>
      <span className="text-[7px] md:text-[8px] font-black text-blue-500 uppercase tracking-[0.2em] leading-none">
        {dropDate && pickDate ? `${fmt(dropDate)} – ${fmt(pickDate)}` : "Selected"}
      </span>
    </div>
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
      <div className="relative z-10"><ResultsContent /></div>
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