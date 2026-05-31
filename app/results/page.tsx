"use client";

import LaunchTimer from "@/components/LaunchTimer";
import BookingStepper from "@/components/BookingStepper";
import ModifySearchModal from "@/components/ModifySearchModal";
import { checkAvailability, getLaunchSlotsClaimed } from "../actions";
import { useSearchParams, useRouter } from "next/navigation";
import {
  MapPin, Clock, ShieldCheck, ChevronRight, ThumbsUp, ArrowLeft,
  ChevronDown, Plane, Footprints, User, Star, Ban, Bus, BedDouble,
  Info, PlaneTakeoff, PlaneLanding, Map as MapIcon, Navigation,
  AlertCircle, Sparkles, MessageSquare, Zap, Tag, CarFront,
  BatteryCharging, Briefcase, Percent, CheckCircle2, Lock, Loader2
} from "lucide-react";
import Link from "next/link";
import { Suspense, useState, useMemo, useEffect, useRef } from "react";
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
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
          <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
        </div>
        {text}
      </div>
    </div>
  );
}

// ─── AERO AVATAR ──────────────────────────────────────────────────────────────
function AeroAvatar({ size = "md", thinking = false }: { size?: "sm" | "md" | "lg"; thinking?: boolean }) {
  const s  = { sm: "w-9 h-9 rounded-xl",   md: "w-12 h-12 rounded-2xl", lg: "w-20 h-20 rounded-3xl" };
  const ew = { sm: "w-1",                   md: "w-1.5",                  lg: "w-2" };
  const eh = { sm: "h-2.5",                 md: "h-3.5",                  lg: "h-6" };
  const g  = { sm: "gap-1",                 md: "gap-1.5",                lg: "gap-2" };
  return (
    <div className={`relative flex items-center justify-center shrink-0 ${s[size]}`}>
      <div className={`absolute inset-0 bg-blue-500/40 blur-xl ${thinking ? "animate-pulse scale-110" : ""}`} />
      <div className={`relative w-full h-full bg-gradient-to-br from-blue-400 via-blue-600 to-blue-700 flex items-center justify-center shadow-[0_0_25px_rgba(37,99,235,0.5)] overflow-hidden group border border-blue-300/30 ${s[size]}`}>
        <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent pointer-events-none" />
        <div className={`absolute left-0 w-full h-[2px] bg-white/60 z-20 ${thinking ? "animate-scan opacity-100" : "opacity-0 group-hover:opacity-100 group-hover:animate-scan"}`} />
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

const avgRating = (reviews: any[]) => {
  if (!reviews?.length) return null;
  return (reviews.reduce((s, r) => s + Number(r.rating || 0), 0) / reviews.length).toFixed(1);
};

// ─── COMPANY LOGO ─────────────────────────────────────────────────────────────
// Handles broken URLs gracefully with a letter-avatar fallback
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

// ─── DETAIL PANEL (expandable) ────────────────────────────────────────────────
function DetailPanel({ option, isHeathrow }: any) {
  const [activeTab, setActiveTab] = useState("overview");
  const arrivalInstructions = isHeathrow ? option.on_arrival_lhr : option.on_arrival_ltn;
  const returnInstructions  = isHeathrow ? option.on_return_lhr  : option.on_return_ltn;
  const currentReviews      = isHeathrow ? option.lhr_reviews || [] : option.ltn_reviews || [];
  const rating = avgRating(currentReviews);
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
            { id: "overview", label: "Overview",               Icon: Info },
            { id: "arrival",  label: "Arrival",                Icon: PlaneTakeoff },
            { id: "return",   label: "Return",                 Icon: PlaneLanding },
            { id: "map",      label: "Location",               Icon: MapIcon },
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
                    {r.source  && <span className="text-[9px] font-black uppercase text-slate-400 bg-slate-800/50 px-1.5 py-0.5 rounded">{r.source}</span>}
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
  const rating     = avgRating(reviews);

  const { original, final, modifier, source } = priceObj;
  const isDiscounted = original > final && !isSoldOut;
  const perDay = duration > 0 ? (final / duration) : final;

  // Promo badges
  const promoBadges: { label: string; color: string }[] = [];
  if (isDiscounted) {
    const savePct = Math.round(((original - final) / original) * 100);
    if (savePct > 0) promoBadges.push({ label: `${savePct}% Launch Special`, color: "bg-blue-500/20 text-blue-300 border-blue-500/30" });
  }
  if (isFeatured) promoBadges.push({ label: "Best Weekend Value", color: "bg-emerald-500/20 text-emerald-300 border-emerald-500/30" });

  // Feature badges
  const categoryLabel = option.category?.replace(/-/g, " ")?.replace(/\b\w/g, (c: string) => c.toUpperCase()) || "Meet Greet";
  const featureBadges = (option.badges || []).filter((b: any) => b.category === "General" || b.category === option.category);

  return (
    <div
      className={`rounded-2xl overflow-hidden border transition-all ${featured ? "border-blue-500/40 shadow-[0_0_40px_-10px_rgba(37,99,235,0.3)]" : "border-slate-800 hover:border-slate-700"} ${isSoldOut ? "opacity-60 grayscale-[30%]" : ""}`}
      style={{ background: "#0B1120" }}
    >
      {/* Top accent on featured */}
      {featured && <div className="h-[2px] bg-gradient-to-r from-blue-600 via-indigo-500 to-emerald-500" />}

      <div className="flex flex-col sm:flex-row">

        {/* ── LEFT: Company Info ───────────────────────────── */}
        <div className="flex-1 p-6 sm:p-8 flex flex-col gap-4">

          {/* Promo badges */}
          {promoBadges.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {promoBadges.map((b, i) => (
                <span key={i} className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest border ${b.color}`}>
                  <Sparkles className="w-3 h-3" /> {b.label}
                </span>
              ))}
            </div>
          )}

          {/* ── FIX: Logo + company name row ── */}
          <div className="flex items-center gap-4">
            <CompanyLogo logoUrl={option.logo_url} name={option.name} size="md" />
            <div className="min-w-0">
              <h2 className="text-2xl sm:text-3xl md:text-4xl font-black uppercase tracking-tight text-white leading-none truncate">
                {option.name}
              </h2>
              {/* Star rating row under name */}
              {rating && (
                <div className="flex items-center gap-1.5 mt-1.5">
                  <div className="flex items-center gap-0.5">
                    {[1,2,3,4,5].map(i => (
                      <Star key={i} className={`w-3 h-3 ${i <= Math.round(Number(rating)) ? "text-amber-400 fill-amber-400" : "text-slate-700"}`} />
                    ))}
                  </div>
                  <span className="text-[10px] font-black text-amber-400">{rating}</span>
                  <span className="text-[10px] font-bold text-slate-500">({reviews.length} reviews)</span>
                </div>
              )}
            </div>
          </div>

          {/* Feature badges */}
          <div className="flex flex-wrap gap-2">
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest bg-slate-800 text-slate-300 border border-slate-700">
              <ThumbsUp className="w-3 h-3" /> {categoryLabel}
            </span>
            {/* ── FIX: show API badge when price came from live feed ── */}
            {source === "api" && (
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                <Zap className="w-3 h-3" /> Live Rate
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

          {/* Details expander */}
          <div className="mt-auto pt-2">
            <DetailPanel option={option} isHeathrow={isHeathrow} />
          </div>
        </div>

        {/* ── RIGHT: Price Panel ───────────────────────────── */}
        <div
          className="sm:w-[240px] md:w-[260px] shrink-0 border-t sm:border-t-0 sm:border-l border-slate-800/80 flex flex-col"
          style={{ background: "#080E1C" }}
        >
          <div className="flex-1 p-6 flex flex-col items-center justify-center text-center gap-1">
            <p className="text-[9px] font-black uppercase tracking-[0.25em] text-slate-500 mb-1">Total Stay Cost</p>

            {/* ── FIX: show spinner while live rate is loading ── */}
            {liveRateLoading && option.api_token ? (
              <div className="flex flex-col items-center gap-2 py-3">
                <Loader2 className="w-6 h-6 text-emerald-400 animate-spin" />
                <p className="text-[10px] font-black text-emerald-400 uppercase tracking-widest animate-pulse">Fetching Live Rate...</p>
              </div>
            ) : (
              <>
                {/* Strikethrough original */}
                {isDiscounted && (
                  <p className="text-sm font-bold text-slate-500 line-through">£{original.toFixed(2)}</p>
                )}

                {/* Main price */}
                <p className={`font-black tracking-tighter leading-none ${isSoldOut ? "text-slate-500 line-through" : "text-emerald-400"} text-4xl sm:text-5xl`}>
                  {/* ── FIX: show £0 guard ── */}
                  {final <= 0 ? (
                    <span className="text-slate-500 text-2xl">Unavailable</span>
                  ) : (
                    <>£{final.toFixed(2)}</>
                  )}
                </p>

                {/* Per day */}
                {!isSoldOut && final > 0 && (
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">
                    Averaging £{perDay.toFixed(2)} / day
                  </p>
                )}

                {/* Source label */}
                {source === "api" && !isSoldOut && final > 0 && (
                  <p className="text-[8px] font-black uppercase tracking-widest text-emerald-600 mt-0.5 flex items-center gap-1">
                    <Zap className="w-2.5 h-2.5" /> Live price
                  </p>
                )}
              </>
            )}
          </div>

          {/* CTA */}
          <div className="p-4 pt-0 flex flex-col items-center gap-2">
            <button
              disabled={isSoldOut || liveRateLoading || final <= 0}
              onClick={() => handleBooking(option, priceObj.final)}
              className={`w-full h-12 font-black rounded-xl flex items-center justify-center gap-2 uppercase tracking-[0.15em] text-xs transition-all active:scale-95 ${
                isSoldOut
                  ? "bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-700"
                  : liveRateLoading || final <= 0
                  ? "bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-700"
                  : "bg-blue-600 hover:bg-blue-500 text-white shadow-[0_8px_20px_-5px_rgba(37,99,235,0.5)]"
              }`}
            >
              {isSoldOut
                ? <><Ban className="w-4 h-4" /> Sold Out</>
                : liveRateLoading
                ? <><Loader2 className="w-4 h-4 animate-spin" /> Loading...</>
                : final <= 0
                ? <><AlertCircle className="w-4 h-4" /> Unavailable</>
                : <>Select <ChevronRight className="w-4 h-4" /></>}
            </button>
            {!isSoldOut && final > 0 && (
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
// Prevents a single slow API provider from blocking the whole results page
async function fetchWithTimeout(url: string, options: RequestInit, timeoutMs = 8000): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, { ...options, signal: controller.signal });
    return res;
  } finally {
    clearTimeout(timer);
  }
}

// ─── MAIN RESULTS CONTENT ─────────────────────────────────────────────────────
function ResultsContent() {
  const searchParams = useSearchParams();
  const router       = useRouter();

  const [companies,          setCompanies]          = useState<any[]>([]);
  const [liveRatesByCompany, setLiveRatesByCompany] = useState<Record<string, any[]>>({});
  // ── FIX: track which companies are still loading their live rate ──
  const [liveLoadingIds,     setLiveLoadingIds]     = useState<Set<string>>(new Set());
  const [settings,           setSettings]           = useState<PricingSettings>(DEFAULT_SETTINGS);
  const [loading,            setLoading]            = useState(true);
  const [slotsClaimed,       setSlotsClaimed]       = useState(12);

  const airport     = searchParams.get("airport")      || "Luton (LTN)";
  const dropoff     = searchParams.get("dropoffDate")  || "";
  const pickup      = searchParams.get("pickupDate")   || "";
  const dropTime    = searchParams.get("dropoffTime")  || "09:00";
  const pickTime    = searchParams.get("pickupTime")   || "09:00";
  const serviceType = searchParams.get("type")         || "meet-greet";
  const isHeathrow  = airport.includes("Heathrow");
  const aeroTip     = searchParams.get("aeroTip")      || "";

  const duration = useMemo(() => calculateDays(dropoff, pickup), [dropoff, pickup]);

  useEffect(() => {
    async function loadData() {
      setLoading(true);
      setLiveRatesByCompany({});
      setLiveLoadingIds(new Set());

      try {
        const [compRes, slots, setRes] = await Promise.all([
          supabase.from("companies").select("*"),
          getLaunchSlotsClaimed(),
          supabase.from("settings").select("*").in("key", ["markup_enabled", "markup_percent"]),
        ]);

        const allCompanies = compRes.data || [];
        if (allCompanies.length) setCompanies(allCompanies);
        setSlotsClaimed(slots);

        if (setRes.data) {
          const en = setRes.data.find((r: any) => r.key === "markup_enabled");
          const pc = setRes.data.find((r: any) => r.key === "markup_percent");
          setSettings({
            markupEnabled: en ? en.value === "true" : true,
            markupPercent: pc ? Number(pc.value) || 10 : 10,
          });
        }

        // ── FIX: fetch live rates per-company independently so one
        //         slow/failing provider doesn't block the others
        if (dropoff && pickup) {
          // ── FIX: same-day guard — if drop & pickup are the same day,
          //         force pickup time to 23:59 so the API returns a result
          const isSameDay = dropoff === pickup;
          const apiPickTime = isSameDay ? "23:59" : pickTime;

          const apiCompanies = allCompanies.filter(
            (c: any) => c.api_token && (isHeathrow ? c.operates_at_heathrow : c.operates_at_luton)
          );

          if (apiCompanies.length > 0) {
            // Mark all API companies as loading
            setLiveLoadingIds(new Set(apiCompanies.map((c: any) => c.id)));

            // Fire each request independently — results drip in as each resolves
            apiCompanies.forEach(async (c: any) => {
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
                  8000 // 8-second per-provider timeout
                );

                if (res.ok) {
                  const json = await res.json();
                  // ── FIX: handle both {rates:[]} and direct array responses
                  const rates: any[] = Array.isArray(json?.rates)
                    ? json.rates
                    : Array.isArray(json)
                    ? json
                    : [];

                  setLiveRatesByCompany(prev => ({ ...prev, [c.id]: rates }));
                } else {
                  // Non-2xx: still clear the loading state, will fall back to pivot
                  console.warn(`Live API non-OK for ${c.name}: HTTP ${res.status}`);
                  setLiveRatesByCompany(prev => ({ ...prev, [c.id]: [] }));
                }
              } catch (e: any) {
                if (e?.name === "AbortError") {
                  console.warn(`Live API timed out for ${c.name}`);
                } else {
                  console.error(`Live API error for ${c.name}:`, e);
                }
                // On any error/timeout: fall back to pivot pricing
                setLiveRatesByCompany(prev => ({ ...prev, [c.id]: [] }));
              } finally {
                // ── FIX: remove this company from the loading set as soon as it's done
                setLiveLoadingIds(prev => {
                  const next = new Set(prev);
                  next.delete(c.id);
                  return next;
                });
              }
            });
          }
        }
      } catch (e) {
        console.error("Fetch error:", e);
      }

      await checkAvailability(airport, dropoff, pickup);
      setLoading(false);
    }

    loadData();
  }, [airport, dropoff, pickup, dropTime, pickTime, isHeathrow]);

  const processedCompanies = useMemo(() => {
    const filtered = companies.filter((c) => {
      const cat = c.category?.toLowerCase().replace(/ & /g, "-").replace(/\s+/g, "-").trim();
      return (
        cat === serviceType.toLowerCase() &&
        (isHeathrow ? c.operates_at_heathrow === true : c.operates_at_luton === true) &&
        c.is_active
      );
    });

    return filtered
      .map((c) => {
        const pr = computePrice({
          company:      c,
          airport,
          duration,
          dropDate:     dropoff,
          liveApiRates: liveRatesByCompany[c.id] || [],
          settings,
          fallbackPrice: 0,
        });
        return {
          ...c,
          calculatedPriceObj: {
            original: pr.original,
            final:    pr.final,
            modifier: pr.modifier,
            source:   pr.source ?? (pr.ok ? "pivot" : "none"),
          },
          _ok: pr.ok,
        };
      })
      .sort((a, b) => {
        const aSold = isHeathrow ? a.lhr_sold_out : a.ltn_sold_out;
        const bSold = isHeathrow ? b.lhr_sold_out : b.ltn_sold_out;
        if (aSold && !bSold) return 1;
        if (!aSold && bSold) return -1;
        const aFeat = isHeathrow ? a.lhr_featured : a.ltn_featured;
        const bFeat = isHeathrow ? b.lhr_featured : b.ltn_featured;
        if (aFeat && !bFeat) return -1;
        if (!aFeat && bFeat) return 1;
        // ── FIX: push £0/unavailable cards to bottom ──
        if (a.calculatedPriceObj.final <= 0 && b.calculatedPriceObj.final > 0) return 1;
        if (b.calculatedPriceObj.final <= 0 && a.calculatedPriceObj.final > 0) return -1;
        return a.calculatedPriceObj.final - b.calculatedPriceObj.final;
      });
  }, [companies, liveRatesByCompany, serviceType, isHeathrow, duration, dropoff, airport, settings]);

  const handleBooking = (option: any, finalPrice: number) => {
    const query = new URLSearchParams(searchParams.toString());
    query.set("type",      option.name);
    query.set("price",     finalPrice.toString());
    query.set("companyId", option.id);
    router.push(`/checkout?${query.toString()}`);
  };

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto py-32 text-center flex flex-col items-center px-4">
        <AeroAvatar thinking size="lg" />
        <h2 className="text-xl font-black uppercase tracking-[0.3em] text-white mt-8 animate-pulse">
          Aero is Scanning
        </h2>
        <p className="text-slate-400 mt-3 font-medium">
          Securing live compound availability for {airport}...
        </p>
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
          <div className="absolute -right-16 -top-16 w-48 h-48 bg-blue-600/10 rounded-full blur-[100px] pointer-events-none" />
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
            {/* ── FIX: show global live rate loading indicator ── */}
            {liveLoadingIds.size > 0 && (
              <p className="flex items-center gap-1.5 text-[9px] font-black text-emerald-400 uppercase tracking-widest mt-1.5 animate-pulse">
                <Loader2 className="w-3 h-3 animate-spin" />
                Fetching live rates ({liveLoadingIds.size} remaining)...
              </p>
            )}
          </div>
        </div>
        <div className="lg:w-[300px] shrink-0">
          <LaunchTimer hours={72} slotsClaimed={slotsClaimed} totalSlots={15} />
        </div>
      </div>

      {/* Results */}
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
                onClick={() => {
                  const q = new URLSearchParams(searchParams.toString());
                  q.set("type", "meet-greet");
                  router.push(`/results?${q.toString()}`);
                }}
                className="inline-flex items-center gap-3 px-8 py-4 bg-blue-600 hover:bg-blue-500 text-white font-black uppercase tracking-widest text-xs rounded-xl transition-all active:scale-95"
              >
                <CarFront className="w-4 h-4" /> View Meet & Greet Prices
              </button>
            </>
          ) : (
            <>
              <AlertCircle className="w-12 h-12 text-slate-600 mx-auto mb-4" />
              <h3 className="text-xl font-black text-white">No Active Providers Found</h3>
              <p className="text-slate-500 mt-2 text-sm max-w-md mx-auto">
                Try modifying your search dates or times.
              </p>
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
              // ── FIX: pass per-card loading state ──
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
    <main
      suppressHydrationWarning
      className="min-h-screen bg-[#060A14] font-sans antialiased pb-24 md:pb-32 selection:bg-blue-500/30 overflow-x-hidden relative"
    >
      <div className="fixed inset-0 pointer-events-none z-0 flex justify-center overflow-hidden">
        <div className="w-full max-w-[1000px] h-96 bg-blue-600/5 blur-[120px] rounded-full absolute -top-48" />
      </div>
      <header className="sticky top-0 z-[100] bg-[#060A14]/90 backdrop-blur-xl border-b border-white/5 h-16 md:h-20 flex items-center px-4 md:px-8 justify-between shadow-2xl">
        <Link href="/" className="text-slate-400 hover:text-white transition-colors flex items-center gap-2 group touch-manipulation">
          <ArrowLeft className="w-4 h-4 md:w-5 md:h-5 lg:group-hover:-translate-x-1 transition-transform" />
          <span className="text-[9px] md:text-[10px] font-black uppercase tracking-[0.2em] hidden md:block">Home</span>
        </Link>
        <Link
          href="/"
          className="flex items-center gap-1.5 md:gap-2 text-white font-black tracking-tighter text-xl md:text-2xl uppercase absolute left-1/2 -translate-x-1/2 touch-manipulation"
        >
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
    <Suspense
      fallback={
        <div className="min-h-screen bg-[#060A14] flex items-center justify-center font-black text-slate-400 uppercase tracking-[0.2em] text-xs">
          Aero is Initializing...
        </div>
      }
    >
      <ResultsLayout />
    </Suspense>
  );
}