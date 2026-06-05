"use client";

import { Suspense, useEffect, useState, useMemo, useCallback, useRef } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "../lib/supabase";
import {
  computePrice,
  calculateDays,
  FAST_TRACK_PRICE,
  DEFAULT_SETTINGS,
  type PricingSettings,
} from "../lib/pricing";
import BookingStepper from "@/components/BookingStepper";
import ModifySearchModal from "@/components/ModifySearchModal";
import {
  ShieldCheck, ArrowLeft, Loader2, CarFront, User,
  PlaneTakeoff, Plane, Lock, CreditCard, Calendar,
  Sparkles, Tag, AlertCircle, CheckCircle2, Coffee, Zap, Star,
  Settings2, Footprints, ChevronDown, AlertTriangle,
} from "lucide-react";

// ─── STYLES ───────────────────────────────────────────────────────────────────

const lightInputCls = "w-full bg-white border border-slate-200 hover:border-blue-400 rounded-xl px-5 py-4 text-sm font-bold text-slate-900 placeholder:text-slate-400 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 outline-none transition-all touch-manipulation shadow-[0_0_0_1000px_#ffffff_inset] [-webkit-text-fill-color:#0f172a]";
const yellowInputCls = "w-full bg-[#fde047] border-2 border-yellow-400 rounded-xl px-5 py-4 font-black text-slate-900 text-xl md:text-2xl text-center uppercase tracking-[0.2em] focus:border-blue-500 focus:ring-4 focus:ring-blue-500/20 outline-none transition-all placeholder:text-yellow-600/50 shadow-[0_0_0_1000px_#fde047_inset] [-webkit-text-fill-color:#0f172a] touch-manipulation";
const darkInputCls = "w-full bg-[#131A2B] border border-slate-700/50 hover:border-blue-500/50 rounded-xl px-5 py-4 text-sm font-bold text-white placeholder:text-slate-500 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/50 outline-none transition-all shadow-[0_0_0_1000px_#131A2B_inset] [-webkit-text-fill-color:white]";

// ─── HELPERS ──────────────────────────────────────────────────────────────────

const formatDate = (dateString: string | null) => {
  if (!dateString) return "--";
  // FIX: parse as local date to avoid UTC-offset shifting the displayed day
  const [y, m, d] = dateString.split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString("en-GB", {
    weekday: "short", day: "numeric", month: "short",
  });
};

// ─── AERO AVATAR ──────────────────────────────────────────────────────────────

function AeroAvatar({
  size = "md",
  state = "idle",
  onClick,
}: {
  size?: "sm" | "md" | "lg" | "xl";
  state?: "idle" | "scanning" | "success";
  onClick?: () => void;
}) {
  const sizeClasses = { sm: "w-8 h-8 rounded-lg", md: "w-14 h-14 rounded-2xl", lg: "w-20 h-20 rounded-3xl", xl: "w-32 h-32 rounded-[2.5rem]" };
  const gap = { sm: "gap-1", md: "gap-1.5", lg: "gap-2", xl: "gap-3" };
  const eyeSize = { sm: "w-1 h-2.5", md: "w-1.5 h-4", lg: "w-2 h-6", xl: "w-3.5 h-10" };
  return (
    <div
      onClick={onClick}
      className={`relative flex items-center justify-center shrink-0 ${sizeClasses[size]} ${onClick ? "cursor-pointer hover:scale-105 active:scale-95 transition-transform" : ""}`}
    >
      <div className={`absolute inset-0 bg-blue-500/40 blur-xl ${state === "scanning" ? "animate-pulse scale-125" : "animate-pulse scale-105"}`} />
      <div className={`relative w-full h-full bg-gradient-to-br from-blue-500 to-blue-700 flex items-center justify-center shadow-[0_0_25px_rgba(37,99,235,0.5)] overflow-hidden ${sizeClasses[size]} transition-all duration-300`}>
        <div className={`absolute left-0 w-full h-[2px] bg-white/90 shadow-[0_0_15px_white] z-20 transition-opacity duration-300 ${state === "scanning" ? "opacity-100 animate-scan" : "opacity-0"}`} />
        <div className={`flex ${gap[size]} z-10 items-center justify-center`}>
          <div className={`${eyeSize[size]} bg-white rounded-full shadow-[0_0_15px_rgba(255,255,255,1)]`} />
          <div className={`${eyeSize[size]} bg-white rounded-full shadow-[0_0_15px_rgba(255,255,255,1)]`} />
        </div>
      </div>
    </div>
  );
}

// ─── PRICE MISMATCH BANNER (NEW) ─────────────────────────────────────────────

function PriceMismatchBanner({
  serverPrice,
  onAccept,
  onDecline,
}: {
  serverPrice: number;
  onAccept: () => void;
  onDecline: () => void;
}) {
  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-[500] flex items-center justify-center p-6">
      <div className="bg-[#0F1523] border border-amber-500/30 rounded-3xl p-8 max-w-md w-full shadow-2xl">
        <div className="flex items-center gap-4 mb-5">
          <div className="w-12 h-12 bg-amber-500/10 rounded-2xl flex items-center justify-center shrink-0">
            <AlertTriangle className="w-6 h-6 text-amber-400" />
          </div>
          <div>
            <h3 className="text-white font-black text-lg">Price Updated</h3>
            <p className="text-amber-400 text-xs font-bold uppercase tracking-widest">Live rate change detected</p>
          </div>
        </div>
        <p className="text-slate-300 text-sm font-bold leading-relaxed mb-6">
          The live price has changed since you loaded this page. The correct price is now{" "}
          <span className="text-white font-black text-lg">£{serverPrice.toFixed(2)}</span>.
          Would you like to continue with the updated price?
        </p>
        <div className="flex gap-3">
          <button
            onClick={onDecline}
            className="flex-1 py-3 rounded-xl bg-slate-800 text-slate-300 font-black text-xs uppercase tracking-widest hover:bg-slate-700 transition-colors border border-slate-700"
          >
            Go Back
          </button>
          <button
            onClick={onAccept}
            className="flex-1 py-3 rounded-xl bg-blue-600 text-white font-black text-xs uppercase tracking-widest hover:bg-blue-500 transition-colors shadow-lg shadow-blue-600/30"
          >
            Accept &amp; Pay £{serverPrice.toFixed(2)}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── CHECKOUT CONTENT ─────────────────────────────────────────────────────────

function CheckoutContent() {
  const [isMounted, setIsMounted] = useState(false);
  const searchParams = useSearchParams();
  const router = useRouter();

  useEffect(() => { setIsMounted(true); }, []);

  const [isProcessing, setIsProcessing] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [liveApiRates, setLiveApiRates] = useState<any[]>([]);
  // Tracks which company+dates the current liveApiRates belong to. Used to know
  // when the live quote is still being confirmed, so the price doesn't visibly
  // jump from the carried-over estimate to the live figure.
  const [ratesKey, setRatesKey] = useState("");
  const [settings, setSettings] = useState<PricingSettings>(DEFAULT_SETTINGS);

  // NEW: price mismatch state
  const [mismatchServerPrice, setMismatchServerPrice] = useState<number | null>(null);

  const urlId   = searchParams.get("companyId") || searchParams.get("id") || searchParams.get("providerId") || "";
  const urlName = searchParams.get("company") || searchParams.get("provider") || searchParams.get("name") || "";
  const airport = searchParams.get("airport") || "Luton (LTN)";
  const type    = searchParams.get("type") || "Premium Meet & Greet";
  const urlFlightNumber = searchParams.get("flightNumber") || "";

  const [dropDate, setDropDate] = useState(searchParams.get("dropoffDate") || "");
  const [pickDate, setPickDate] = useState(searchParams.get("pickupDate") || "");
  const [dropTime, setDropTime] = useState(searchParams.get("dropoffTime") || "09:00");
  const [pickTime, setPickTime] = useState(searchParams.get("pickupTime") || "09:00");

  const [company, setCompany]       = useState<any>(null);
  const [resolvedId, setResolvedId] = useState(urlId);

  // ── Fetch settings ──────────────────────────────────────────────────────────
  useEffect(() => {
    supabase
      .from("settings")
      .select("*")
      .in("key", ["markup_enabled", "markup_percent"])
      .then(({ data }) => {
        if (!data) return;
        const en = data.find((r: any) => r.key === "markup_enabled");
        const pc = data.find((r: any) => r.key === "markup_percent");
        setSettings({
          markupEnabled: en ? en.value === "true" : true,
          markupPercent: pc ? Number(pc.value) || 10 : 10,
        });
      });
  }, []);

  // ── Fetch company ───────────────────────────────────────────────────────────
  useEffect(() => {
    async function fetchCompanyData() {
      if (urlId) {
        const { data } = await supabase.from("companies").select("*").eq("id", urlId).maybeSingle();
        if (data) { setCompany(data); setResolvedId(data.id); }
      } else if (urlName) {
        const { data } = await supabase.from("companies").select("*").ilike("name", `%${urlName}%`).maybeSingle();
        if (data) { setCompany(data); setResolvedId(data.id); }
      }
    }
    fetchCompanyData();
  }, [urlId, urlName]);

  // ── Fetch live API rates ─────────────────────────────────────────────────────
  // FIX: use AbortController so stale in-flight requests don't overwrite newer ones
  useEffect(() => {
    const key = `${company?.id || ""}|${dropDate}|${dropTime}|${pickDate}|${pickTime}`;

    if (!company?.api_token || !airport.toLowerCase().includes("luton") || !dropDate || !pickDate) {
      setLiveApiRates([]);
      setRatesKey(key); // settled — no live quote needed for this provider
      return;
    }

    // FIX: same-day return-time logic now MATCHES the results page exactly, so
    // both pages query the gateway identically and return the same price.
    const isSameDay = dropDate === pickDate;
    const apiPickTime = isSameDay ? "23:59" : (pickTime || "09:00");

    const controller = new AbortController();

    fetch("/api/parking-api", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      signal: controller.signal,
      body: JSON.stringify({
        // Token resolved server-side from the company id.
        companyId:   company.id,
        drop_date:   dropDate,
        drop_time:   dropTime || "09:00",
        return_date: pickDate,
        return_time: apiPickTime,
      }),
    })
      .then(res => {
        if (!res.ok) throw new Error(`API proxy returned ${res.status}`);
        return res.json();
      })
      .then(data => {
        // Support both { rates: [...] } envelope and raw array
        const rates = Array.isArray(data) ? data : (Array.isArray(data?.rates) ? data.rates : []);
        setLiveApiRates(rates);
        setRatesKey(key);
      })
      .catch(err => {
        if (err.name !== "AbortError") {
          console.error("Live API Error:", err);
          setLiveApiRates([]);
          setRatesKey(key); // settled (failed) — fall back to estimate
        }
      });

    return () => controller.abort();
  }, [company, airport, dropDate, pickDate, dropTime, pickTime]);

  const fallbackUrlPrice = Number(searchParams.get("price")) || 0;

  const aiData = useMemo(() => ({
    isFrequentFlyer:      searchParams.get("isFrequentFlyer") === "true",
    loyaltyMessage:       searchParams.get("loyaltyMessage") || "",
    hasPet:               searchParams.get("hasPet") === "true",
    isCorporate:          searchParams.get("isCorporate") === "true",
    hasOversizedLuggage:  searchParams.get("hasOversizedLuggage") === "true",
    ulezRisk:             searchParams.get("ulezRisk") === "true",
    isLastMinute:         searchParams.get("isLastMinute") === "true",
    aeroTip:              searchParams.get("aeroTip") || "",
  }), [searchParams]);

  const suggestedAncillaries = useMemo(() => {
    const raw = (searchParams.get("upsells") || "").split(",").filter(Boolean);
    if (airport.toLowerCase().includes("luton") && !raw.includes("fast-track")) return [...raw, "fast-track"];
    return raw;
  }, [searchParams, airport]);

  // ── Form state ──────────────────────────────────────────────────────────────
  const [fullName,     setFullName]     = useState("");
  const [email,        setEmail]        = useState("");
  const [phone,        setPhone]        = useState("");
  const [terminal,     setTerminal]     = useState("Main Terminal");
  const [flightNumber, setFlightNumber] = useState(urlFlightNumber);
  const [registration, setRegistration] = useState("");
  const [carMake,      setCarMake]      = useState("");
  const [carColor,     setCarColor]     = useState("");

  const [wantsLounge,    setWantsLounge]    = useState(false);
  const LOUNGE_PRICE = 35.0;
  const [fastTrackCount, setFastTrackCount] = useState(0);

  const [promoInput,       setPromoInput]       = useState("");
  const [discount,         setDiscount]         = useState({ active: false, code: "", percent: 0 });
  const [promoMessage,     setPromoMessage]     = useState("");
  const [isPromoError,     setIsPromoError]     = useState(false);
  const [aeroClicks,       setAeroClicks]       = useState(0);
  const [isVerifyingPromo, setIsVerifyingPromo] = useState(false);

  // ── Validation errors (NEW) ──────────────────────────────────────────────────
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (airport.toLowerCase().includes("luton")) setTerminal("Main Terminal");
    else if (airport.toLowerCase().includes("heathrow")) setTerminal("Terminal 2");
  }, [airport]);

  // FIX: guard against applying loyalty discount if already manually discounted
  useEffect(() => {
    if (aiData.isFrequentFlyer && !discount.active) {
      setDiscount({ active: true, code: "AERO VIP", percent: 0.15 });
      setPromoMessage(aiData.loyaltyMessage || "Loyalty recognised! 15% discount auto-applied.");
      setIsPromoError(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [aiData.isFrequentFlyer, aiData.loyaltyMessage]);

  // ── Promo handler ────────────────────────────────────────────────────────────
  const handleApplyPromo = async (e: React.FormEvent) => {
    e.preventDefault();
    const code = promoInput.toUpperCase().trim();
    if (!code) { setPromoMessage("Please enter a code."); setIsPromoError(true); return; }
    setIsVerifyingPromo(true);
    try {
      const { data: promo, error } = await supabase
        .from("promotions").select("*").eq("code", code).maybeSingle(); // FIX: maybeSingle() doesn't throw on 0 rows

      if (error || !promo) {
        setDiscount({ active: false, code: "", percent: 0 });
        setPromoMessage("Invalid promo code.");
        setIsPromoError(true);
      } else if (promo.is_active === false) {
        setDiscount({ active: false, code: "", percent: 0 });
        setPromoMessage("This promo code is inactive.");
        setIsPromoError(true);
      } else if (promo.expiry_date && new Date(promo.expiry_date) < new Date()) {
        setDiscount({ active: false, code: "", percent: 0 });
        setPromoMessage("This promo code has expired.");
        setIsPromoError(true);
      } else {
        const pct = Number(promo.discount_percent) / 100;
        if (pct <= 0 || pct > 1) {
          setDiscount({ active: false, code: "", percent: 0 });
          setPromoMessage("This promo code is not valid.");
          setIsPromoError(true);
        } else {
          setDiscount({ active: true, code: promo.code, percent: pct });
          setPromoMessage(`${promo.discount_percent}% discount applied!`);
          setIsPromoError(false);
        }
      }
    } catch {
      setDiscount({ active: false, code: "", percent: 0 });
      setPromoMessage("Network error. Please try again.");
      setIsPromoError(true);
    }
    setIsVerifyingPromo(false);
  };

  const handleAeroClick = () => {
    if (discount.active && discount.percent >= 0.03) return;
    const newClicks = aeroClicks + 1;
    setAeroClicks(newClicks);
    if (newClicks === 3) {
      setDiscount({ active: true, code: "AERO3", percent: 0.03 });
      setPromoMessage("Secret Aero Discount Unlocked! 3% off.");
      setIsPromoError(false);
      setPromoInput("AERO3");
      setAeroClicks(0);
    }
  };

  // ── Pricing ──────────────────────────────────────────────────────────────────
  const bookingDays = useMemo(() => calculateDays(dropDate, pickDate), [dropDate, pickDate]);

  const priceData = useMemo(() => {
    const pr = computePrice({
      company,
      providerName: urlName || type || "AeroPark Direct",
      airport,
      duration:     bookingDays,
      dropDate,
      liveApiRates,
      settings,
      fallbackPrice: fallbackUrlPrice,
    });

    // 🟢 EXACT FIX: Apply the Dynamic Surcharge multiplier to the final checkout price
    const isApiMode = company && company.pricing_mode !== "pivot" && !!company.api_token;
    
    let finalTotal = pr.final;
    let originalTotal = pr.original;

    if (!isApiMode && company) {
      // If we are in manual pivot mode, apply the surcharge percent
      const surcharge = Number(company.dynamic_surcharge_percent || 0);
      const surchargeMultiplier = 1 + (surcharge / 100);

      finalTotal = finalTotal * surchargeMultiplier;
      originalTotal = originalTotal * surchargeMultiplier;
    }

    return { 
      original: originalTotal, 
      final: finalTotal, 
      modifier: pr.modifier 
    };
  }, [company, urlName, type, bookingDays, liveApiRates, dropDate, airport, fallbackUrlPrice, settings]);

  const discountAmount    = priceData.final * discount.percent;
  const totalFastTrackCost = fastTrackCount * FAST_TRACK_PRICE;
  const addOnsTotal       = (wantsLounge ? LOUNGE_PRICE : 0) + totalFastTrackCost;
  // FIX: clamp finalTotal to >= 0 so a huge promo can't produce a negative total
  const finalTotal        = Math.max(0, priceData.final - discountAmount + addOnsTotal);
  const isDiscounted      = priceData.modifier < 1.0;

  // ── Live-price resolution gate ────────────────────────────────────────────
  // True while we're still confirming the live gateway quote, so the UI shows a
  // "Confirming live price…" state instead of flashing the estimate then the
  // live figure. Covers: company still loading, and (for live-API Luton
  // providers) the live quote for the CURRENT dates not yet returned.
  const expectsLiveQuote = !!(company?.api_token && airport.toLowerCase().includes("luton") && dropDate && pickDate);
  const currentRatesKey  = `${company?.id || ""}|${dropDate}|${dropTime}|${pickDate}|${pickTime}`;
  const companyPending   = !!(urlId || urlName) && !company;
  const priceResolving   = companyPending || (expectsLiveQuote && ratesKey !== currentRatesKey);

  // ── Modify search ────────────────────────────────────────────────────────────
  const handleSearchUpdate = (newQueryString: string) => {
    setIsEditModalOpen(false);
    const newParams = new URLSearchParams(newQueryString);
    setDropDate(newParams.get("dropoffDate") || dropDate);
    setDropTime(newParams.get("dropoffTime") || dropTime);
    setPickDate(newParams.get("pickupDate")  || pickDate);
    setPickTime(newParams.get("pickupTime")  || pickTime);

    const query = new URLSearchParams(searchParams.toString());
    query.set("airport",     newParams.get("airport")     || airport);
    query.set("dropoffDate", newParams.get("dropoffDate") || dropDate);
    query.set("dropoffTime", newParams.get("dropoffTime") || dropTime);
    query.set("pickupDate",  newParams.get("pickupDate")  || pickDate);
    query.set("pickupTime",  newParams.get("pickupTime")  || pickTime);
    query.delete("price");
    router.replace(`${window.location.pathname}?${query.toString()}`);
  };

  const currentSearch = useMemo(() => ({
    airport, dropDate, dropTime, pickDate, pickTime, type,
  }), [airport, dropDate, dropTime, pickDate, pickTime, type]);

  // ── Validation (NEW) ─────────────────────────────────────────────────────────
  const validate = (): boolean => {
    const errors: Record<string, string> = {};
    if (!fullName.trim())    errors.fullName    = "Full name is required.";
    if (!email.trim())       errors.email       = "Email address is required.";
    else if (!/^\S+@\S+\.\S+$/.test(email)) errors.email = "Enter a valid email address.";
    if (!phone.trim())       errors.phone       = "Mobile number is required.";
    if (!registration.trim()) errors.registration = "Registration plate is required.";
    if (!carMake.trim())     errors.carMake     = "Make & model is required.";
    if (!dropDate)           errors.dropDate    = "Drop-off date is missing. Please modify search.";
    if (!pickDate)           errors.pickDate    = "Pick-up date is missing. Please modify search.";
    if (bookingDays <= 0)    errors.pickDate    = "Pick-up date must be after drop-off date.";
    if (finalTotal <= 0)     errors.price       = "Total price is invalid. Please go back and try again.";
    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // ── Payment ──────────────────────────────────────────────────────────────────
  // Ref keeps the verified price for the mismatch-accept flow
  const verifiedPriceRef = useRef<number | null>(null);

  const submitPayment = useCallback(async (overrideTotal?: number) => {
    setIsProcessing(true);
    setMismatchServerPrice(null);

    const chargeTotal = overrideTotal ?? finalTotal;
    const providerName = company ? company.name : (urlName || type || "AeroPark Direct");

    let finalServiceType = "Premium Meet & Greet";
    if (type.toLowerCase().includes("park & ride") || type.toLowerCase().includes("park and ride")) finalServiceType = "Park & Ride";
    if (type.toLowerCase().includes("hotel")) finalServiceType = "Hotel & Parking";

    // Pull the Google Ads click id captured on landing so the webhook can
    // report a server-side conversion (immune to ad-blockers / ITP).
    const readCookie = (name: string): string => {
      try {
        const m = document.cookie.match(new RegExp("(?:^|; )" + name + "=([^;]*)"));
        return m ? decodeURIComponent(m[1]) : "";
      } catch { return ""; }
    };
    const gclid = readCookie("ap_gclid") || readCookie("ap_wbraid") || readCookie("ap_gbraid");

    try {
      const response = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          price:    chargeTotal,
          airport,
          provider: providerName,
          metadata: {
            // Canonical fields (used by webhook)
            full_name:      fullName.trim(),
            email:          email.trim(),
            phone:          phone.trim(),
            license_plate:  registration.trim().toUpperCase(),
            car_make:       carMake.trim(),
            car_color:      carColor.trim(),
            airport,
            terminal,
            dropoff_date:   dropDate,
            pickup_date:    pickDate,
            dropoff_time:   dropTime,
            pickup_time:    pickTime,
            flight_number:  flightNumber.trim().toUpperCase(),
            company_id:     resolvedId,
            service_type:   finalServiceType,
            promo_used:     discount.code || "None",
            fast_track_count: String(fastTrackCount),
            lounge:         wantsLounge ? "yes" : "no",
            gclid,
            // FIX: removed duplicate camelCase keys — the route now normalises
            // everything via metaStr(); sending both keys caused ambiguity.
          },
        }),
      });

      const data = await response.json();

      // FIX: handle server-side price mismatch gracefully instead of alert()
      if (response.status === 409 && data.serverPrice != null) {
        verifiedPriceRef.current = data.serverPrice;
        setMismatchServerPrice(data.serverPrice);
        setIsProcessing(false);
        return;
      }

      if (!response.ok || data.error) {
        throw new Error(data.error || `Server error ${response.status}`);
      }

      if (data.url) {
        window.location.href = data.url;
      } else {
        throw new Error("No redirect URL received from payment provider.");
      }
    } catch (error: any) {
      console.error("Payment failed:", error);
      // FIX: use inline error state instead of alert()
      setFieldErrors(prev => ({ ...prev, _payment: error.message || "Payment failed. Please try again." }));
      setIsProcessing(false);
    }
  }, [
    finalTotal, company, urlName, type, airport, fullName, email, phone,
    registration, carMake, carColor, terminal, dropDate, pickDate, dropTime,
    pickTime, flightNumber, resolvedId, discount.code, fastTrackCount, wantsLounge,
  ]);

  const handlePayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) {
      // Scroll to first error
      const firstErrKey = Object.keys(fieldErrors)[0];
      document.getElementById(firstErrKey)?.scrollIntoView({ behavior: "smooth", block: "center" });
      return;
    }
    await submitPayment();
  };

  // When user accepts the new server price
  const handleAcceptMismatch = useCallback(() => {
    if (verifiedPriceRef.current != null) {
      submitPayment(verifiedPriceRef.current);
    }
  }, [submitPayment]);

  if (!isMounted) return <CheckoutSkeleton />;

  const hasDateIssue = dropDate && pickDate && bookingDays <= 0;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 md:py-12 relative z-10 animate-in fade-in duration-500">

      {/* Price mismatch modal */}
      {mismatchServerPrice !== null && (
        <PriceMismatchBanner
          serverPrice={mismatchServerPrice}
          onAccept={handleAcceptMismatch}
          onDecline={() => { setMismatchServerPrice(null); router.back(); }}
        />
      )}

      {/* AERO SECURE BANNER */}
      <div className="max-w-3xl mx-auto mb-8 bg-[#0B1120]/80 backdrop-blur-xl border border-blue-900/40 rounded-3xl p-4 md:p-6 flex items-center gap-5 shadow-2xl relative overflow-hidden">
        <div className="absolute -right-10 -top-10 w-40 h-40 bg-blue-600/20 rounded-full blur-3xl pointer-events-none" />
        <AeroAvatar state="idle" size="md" onClick={handleAeroClick} />
        <div className="relative z-10">
          <p className="text-[10px] font-black uppercase tracking-[0.3em] text-blue-400 mb-1.5 flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4" /> Aero Secure Checkout
          </p>
          <p className="text-sm md:text-base text-slate-300 font-medium">
            {aiData.isFrequentFlyer
              ? "Welcome back! I've automatically applied your loyalty discount."
              : "Aero has securely locked your rate. Complete your details below."}
          </p>
        </div>
      </div>

      {/* Date issue warning */}
      {hasDateIssue && (
        <div className="max-w-3xl mx-auto mb-6 bg-red-500/10 border border-red-500/30 rounded-2xl p-4 flex items-center gap-3">
          <AlertTriangle className="w-5 h-5 text-red-400 shrink-0" />
          <p className="text-sm font-bold text-red-400">
            Pick-up date must be after drop-off date. Please{" "}
            <button onClick={() => setIsEditModalOpen(true)} className="underline hover:text-red-300 transition-colors">
              modify your search
            </button>
            .
          </p>
        </div>
      )}

      {/* Payment-level error */}
      {fieldErrors._payment && (
        <div className="max-w-3xl mx-auto mb-6 bg-red-500/10 border border-red-500/30 rounded-2xl p-4 flex items-center gap-3">
          <AlertCircle className="w-5 h-5 text-red-400 shrink-0" />
          <p className="text-sm font-bold text-red-400">{fieldErrors._payment}</p>
        </div>
      )}

      <div className="mb-10">
        <BookingStepper
          currentStep={2}
          clickableSteps={true}
          onStepClick={(step) => {
            if (step === 1) router.push(`/results?${searchParams.toString()}`);
          }}
        />
      </div>

      <div className="flex flex-col-reverse lg:flex-row gap-8 md:gap-10 items-start">
        <div className="flex-1 w-full">
          <form id="checkout-form" onSubmit={handlePayment} noValidate className="space-y-6 md:space-y-8">

            {/* 1. CONTACT INFO */}
            <div className="bg-white p-6 md:p-10 rounded-[2.5rem] border border-slate-200 shadow-xl shadow-slate-200/50 relative overflow-hidden">
              <div className="flex items-center gap-4 mb-8 pb-6 border-b border-slate-100">
                <div className="w-12 h-12 bg-blue-50 rounded-2xl flex items-center justify-center shrink-0">
                  <User className="w-6 h-6 text-blue-600" />
                </div>
                <div>
                  <h2 className="text-xl md:text-2xl font-black text-slate-900 tracking-tight">1. Contact Information</h2>
                  <p className="text-[10px] md:text-xs font-bold text-slate-400 uppercase tracking-widest mt-1">Lead Passenger Details</p>
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5 md:gap-6">
                <div className="md:col-span-2">
                  <label htmlFor="fullName" className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2 ml-1">Full Name</label>
                  <input
                    id="fullName" required type="text"
                    value={fullName} onChange={e => setFullName(e.target.value)}
                    className={`${lightInputCls} ${fieldErrors.fullName ? "border-red-400 focus:border-red-400" : ""}`}
                    placeholder="Enter your full name"
                  />
                  {fieldErrors.fullName && <p className="text-red-500 text-xs font-bold mt-1.5 ml-1">{fieldErrors.fullName}</p>}
                </div>
                <div>
                  <label htmlFor="email" className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2 ml-1">Email Address</label>
                  <input
                    id="email" required type="email"
                    value={email} onChange={e => setEmail(e.target.value)}
                    className={`${lightInputCls} ${fieldErrors.email ? "border-red-400 focus:border-red-400" : ""}`}
                    placeholder="email@example.com"
                  />
                  {fieldErrors.email && <p className="text-red-500 text-xs font-bold mt-1.5 ml-1">{fieldErrors.email}</p>}
                </div>
                <div>
                  <label htmlFor="phone" className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2 ml-1">Mobile Number</label>
                  <input
                    id="phone" required type="tel"
                    value={phone} onChange={e => setPhone(e.target.value)}
                    className={`${lightInputCls} ${fieldErrors.phone ? "border-red-400 focus:border-red-400" : ""}`}
                    placeholder="Enter your mobile number"
                  />
                  {fieldErrors.phone && <p className="text-red-500 text-xs font-bold mt-1.5 ml-1">{fieldErrors.phone}</p>}
                </div>
              </div>
            </div>

            {/* 2. VEHICLE & FLIGHT */}
            <div className="bg-white p-6 md:p-10 rounded-[2.5rem] border border-slate-200 shadow-xl shadow-slate-200/50 relative overflow-hidden">
              <div className="flex items-center gap-4 mb-8 pb-6 border-b border-slate-100">
                <div className="w-12 h-12 bg-blue-50 rounded-2xl flex items-center justify-center shrink-0">
                  <CarFront className="w-6 h-6 text-blue-600" />
                </div>
                <div>
                  <h2 className="text-xl md:text-2xl font-black text-slate-900 tracking-tight">2. Vehicle & Flight Details</h2>
                  <p className="text-[10px] md:text-xs font-bold text-slate-400 uppercase tracking-widest mt-1">So we know who to look for</p>
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5 md:gap-6 mb-6">
                <div>
                  <label htmlFor="terminal" className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2 ml-1">Departure Terminal</label>
                  <div className="relative">
                    <select
                      id="terminal"
                      value={terminal} onChange={e => setTerminal(e.target.value)}
                      className={`${lightInputCls} appearance-none cursor-pointer pr-10`}
                    >
                      {airport.toLowerCase().includes("luton") ? (
                        <option value="Main Terminal">Main Terminal</option>
                      ) : company?.terminal_data && Object.keys(company.terminal_data).length > 0 ? (
                        Object.keys(company.terminal_data).map((t: string) => (
                          <option key={t} value={t}>{t}</option>
                        ))
                      ) : (
                        <>
                          <option value="Terminal 2">Terminal 2</option>
                          <option value="Terminal 3">Terminal 3</option>
                          <option value="Terminal 4">Terminal 4</option>
                          <option value="Terminal 5">Terminal 5</option>
                        </>
                      )}
                    </select>
                    <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 pointer-events-none" />
                  </div>
                </div>
                <div>
                  <label htmlFor="flightNumber" className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2 ml-1">Return Flight No. (Optional)</label>
                  <input
                    id="flightNumber" type="text"
                    value={flightNumber} onChange={e => setFlightNumber(e.target.value.toUpperCase())}
                    className={`${lightInputCls} uppercase placeholder:normal-case`}
                    placeholder="Enter flight number"
                  />
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-5 md:gap-6">
                <div className="md:col-span-3">
                  <label htmlFor="registration" className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2 ml-1">Registration Plate</label>
                  <input
                    id="registration" required type="text"
                    value={registration} onChange={e => setRegistration(e.target.value.toUpperCase())}
                    className={`${yellowInputCls} ${fieldErrors.registration ? "border-red-400" : ""}`}
                    placeholder="ENTER PLATE"
                  />
                  {fieldErrors.registration && <p className="text-red-500 text-xs font-bold mt-1.5 ml-1">{fieldErrors.registration}</p>}
                </div>
                <div className="md:col-span-2">
                  <label htmlFor="carMake" className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2 ml-1">Make &amp; Model</label>
                  <input
                    id="carMake" required type="text"
                    value={carMake} onChange={e => setCarMake(e.target.value)}
                    className={`${lightInputCls} ${fieldErrors.carMake ? "border-red-400 focus:border-red-400" : ""}`}
                    placeholder="Enter make and model"
                  />
                  {fieldErrors.carMake && <p className="text-red-500 text-xs font-bold mt-1.5 ml-1">{fieldErrors.carMake}</p>}
                </div>
                <div>
                  <label htmlFor="carColor" className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2 ml-1">Color</label>
                  <input
                    id="carColor" type="text"
                    value={carColor} onChange={e => setCarColor(e.target.value)}
                    className={lightInputCls}
                    placeholder="Enter color"
                  />
                </div>
              </div>
            </div>

            {/* UPSELLS */}
            {suggestedAncillaries.length > 0 && (
              <div className="bg-gradient-to-br from-[#FAFAFF] to-[#F3F4FB] p-6 md:p-10 rounded-[2.5rem] border border-indigo-100 shadow-[0_15px_40px_-15px_rgba(79,70,229,0.15)] relative overflow-hidden">
                <div className="flex items-center gap-4 mb-8 pb-6 border-b border-indigo-200/40">
                  <div className="w-12 h-12 bg-gradient-to-tr from-indigo-600 to-purple-600 rounded-2xl flex items-center justify-center shrink-0 shadow-lg shadow-indigo-500/30">
                    <Sparkles className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h2 className="text-xl md:text-2xl font-black text-slate-900 tracking-tight">Enhance Your Trip</h2>
                    <p className="text-[10px] md:text-xs font-bold text-indigo-500 uppercase tracking-widest mt-1">Aero Add-ons</p>
                  </div>
                </div>
                <div className="space-y-5">
                  {suggestedAncillaries.includes("lounge") && (
                    <label className={`p-5 rounded-2xl border-2 cursor-pointer transition-all duration-300 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${wantsLounge ? "border-indigo-500 bg-indigo-50/50 ring-4 ring-indigo-500/10" : "bg-white border-slate-100 hover:border-indigo-200"}`}>
                      <div className="flex items-center gap-4">
                        <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 transition-colors ${wantsLounge ? "bg-indigo-600 shadow-lg shadow-indigo-600/30" : "bg-indigo-50"}`}>
                          <Coffee className={`w-6 h-6 ${wantsLounge ? "text-white" : "text-indigo-600"}`} />
                        </div>
                        <div>
                          <p className="font-black text-slate-900 text-base md:text-lg tracking-tight">VIP Airport Lounge</p>
                          <p className="text-[11px] font-bold uppercase tracking-widest text-slate-500 mt-0.5">Relax before your flight</p>
                        </div>
                      </div>
                      <div className="flex items-center justify-between sm:justify-end gap-6 w-full sm:w-auto border-t border-slate-100 sm:border-0 pt-4 sm:pt-0">
                        <div className="text-left sm:text-right">
                          <span className="block font-black text-xl text-indigo-600">+£{LOUNGE_PRICE.toFixed(2)}</span>
                          <span className="block text-[10px] text-slate-400 font-bold uppercase tracking-widest">Per Person</span>
                        </div>
                        <div className={`w-14 h-8 rounded-full p-1 transition-colors duration-300 flex items-center shrink-0 ${wantsLounge ? "bg-indigo-600" : "bg-slate-200"}`}>
                          <div className={`w-6 h-6 bg-white rounded-full shadow-md transform transition-transform duration-300 flex items-center justify-center ${wantsLounge ? "translate-x-6" : "translate-x-0"}`}>
                            {wantsLounge && <CheckCircle2 className="w-4 h-4 text-indigo-600" />}
                          </div>
                        </div>
                        <input type="checkbox" className="sr-only" checked={wantsLounge} onChange={() => setWantsLounge(v => !v)} aria-label="Add VIP Lounge" />
                      </div>
                    </label>
                  )}

                  {suggestedAncillaries.includes("fast-track") && (
                    <div className={`p-5 rounded-2xl border-2 transition-all duration-300 shadow-sm ${fastTrackCount > 0 ? "border-amber-400 bg-amber-50/50 ring-4 ring-amber-400/10" : "bg-white border-slate-100 hover:border-amber-200"}`}>
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                        <div className="flex items-center gap-4">
                          <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 transition-colors ${fastTrackCount > 0 ? "bg-amber-500 shadow-lg shadow-amber-500/30" : "bg-amber-50"}`}>
                            <Zap className={`w-6 h-6 ${fastTrackCount > 0 ? "text-white" : "text-amber-500"}`} />
                          </div>
                          <div>
                            <p className="font-black text-slate-900 text-base md:text-lg tracking-tight">Fast Track Security</p>
                            <p className="text-[11px] font-bold uppercase tracking-widest text-slate-500 mt-0.5">Skip the queues</p>
                          </div>
                        </div>
                        <div className="flex items-center justify-between sm:justify-end gap-6 w-full sm:w-auto border-t border-slate-100 sm:border-0 pt-4 sm:pt-0">
                          <div className="text-left sm:text-right">
                            <span className="block font-black text-xl text-amber-600">+£{FAST_TRACK_PRICE.toFixed(2)}</span>
                            <span className="block text-[10px] text-slate-400 font-bold uppercase tracking-widest">Per Person</span>
                          </div>
                          <div className="flex items-center bg-slate-100 rounded-xl p-1 shadow-inner shrink-0">
                            <button
                              type="button"
                              onClick={() => setFastTrackCount(n => Math.max(0, n - 1))}
                              disabled={fastTrackCount === 0}
                              aria-label="Remove fast track"
                              className={`w-10 h-10 rounded-lg flex items-center justify-center font-black text-lg transition-all active:scale-95 ${fastTrackCount > 0 ? "bg-white text-slate-700 shadow hover:bg-slate-50 hover:text-amber-600" : "text-slate-400 cursor-not-allowed"}`}
                            >
                              &minus;
                            </button>
                            <span className="font-black text-lg w-10 text-center text-slate-800" aria-live="polite">{fastTrackCount}</span>
                            <button
                              type="button"
                              onClick={() => setFastTrackCount(n => Math.min(9, n + 1))}
                              disabled={fastTrackCount >= 9}
                              aria-label="Add fast track"
                              className="w-10 h-10 rounded-lg bg-white text-slate-700 font-black text-lg shadow hover:bg-slate-50 hover:text-amber-600 transition-all active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed"
                            >
                              +
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* 3. SECURE PAYMENT */}
            <div className="bg-white p-6 md:p-10 rounded-[2.5rem] border border-slate-200 shadow-xl shadow-slate-200/50 relative overflow-hidden">
              <div className="flex items-center justify-between mb-8 pb-6 border-b border-slate-100">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-blue-50 rounded-2xl flex items-center justify-center shrink-0">
                    <ShieldCheck className="w-6 h-6 text-blue-600" />
                  </div>
                  <div>
                    <h2 className="text-xl md:text-2xl font-black text-slate-900 tracking-tight">3. Secure Payment</h2>
                    <p className="text-[10px] md:text-xs font-bold text-slate-400 uppercase tracking-widest mt-1">PCI Compliant Redirect</p>
                  </div>
                </div>
                <div className="hidden sm:flex items-center gap-1.5 px-4 py-2 bg-emerald-50 text-emerald-600 rounded-xl text-[10px] font-black uppercase tracking-widest border border-emerald-100 shadow-sm">
                  <Lock className="w-3.5 h-3.5" /> Secure
                </div>
              </div>
              <div className="bg-blue-50 p-6 md:p-8 rounded-3xl border border-blue-100 flex items-center gap-5">
                <div className="w-14 h-14 bg-white rounded-full flex items-center justify-center shadow-md shrink-0">
                  <CreditCard className="w-6 h-6 text-blue-600" />
                </div>
                <p className="text-sm md:text-base font-bold text-blue-900 leading-relaxed">
                  You will be redirected to <span className="text-blue-600 font-black">Stripe</span> to complete your payment securely. We never store your card details on our servers.
                </p>
              </div>
            </div>

            {/* MOBILE PAY BUTTON */}
            <div className="block lg:hidden mt-6 pb-8">
              <button
                type="submit" form="checkout-form" disabled={isProcessing || !!hasDateIssue || priceResolving}
                className="w-full h-16 bg-blue-600 hover:bg-blue-500 disabled:bg-slate-700 text-white font-black text-base rounded-2xl flex items-center justify-center gap-3 shadow-[0_15px_30px_-5px_rgba(37,99,235,0.4)] active:scale-95 transition-all uppercase tracking-widest touch-manipulation"
              >
                {isProcessing
                  ? <><Loader2 className="w-5 h-5 animate-spin" /> Preparing...</>
                  : priceResolving
                  ? <><Loader2 className="w-5 h-5 animate-spin" /> Confirming price…</>
                  : <><Lock className="w-5 h-5" /> Pay £{finalTotal.toFixed(2)}</>}
              </button>
              <p className="text-center text-[10px] text-slate-400 mt-4 font-bold px-2 leading-relaxed">
                By clicking &ldquo;Pay&rdquo;, you accept our{" "}
                <Link href="/terms" target="_blank" className="text-blue-400 underline hover:text-blue-500">Terms &amp; Conditions</Link>.
              </p>
            </div>
          </form>
        </div>

        {/* SIDEBAR */}
        <aside className="w-full lg:w-[400px] xl:w-[420px] lg:sticky lg:top-28">
          <div className="bg-[#0B1120] rounded-[2.5rem] border border-slate-800 shadow-[0_30px_60px_-15px_rgba(0,0,0,0.6)] overflow-hidden text-white relative">
            <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-blue-500 via-indigo-500 to-blue-500" />
            <div className="p-8 md:p-10">
              <div className="flex justify-between items-center mb-8">
                <h3 className="text-2xl font-black tracking-tight">Order Summary</h3>
                <button
                  onClick={() => setIsEditModalOpen(true)}
                  className="text-[9px] font-black uppercase text-blue-400 bg-blue-500/10 border border-blue-500/20 hover:bg-blue-500 hover:text-white px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 shadow-sm"
                >
                  <Settings2 className="w-3.5 h-3.5" /> Modify
                </button>
              </div>

              {aiData.aeroTip && (
                <div className="mb-8 bg-blue-500/10 border border-blue-500/20 rounded-2xl p-5 relative overflow-hidden group">
                  <div className="absolute -right-4 -top-4 opacity-10 group-hover:scale-110 transition-transform">
                    <Sparkles className="w-16 h-16 text-blue-400" />
                  </div>
                  <div className="flex gap-4 items-start relative z-10">
                    <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center shrink-0 shadow-lg shadow-blue-900/40">
                      <Sparkles className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <p className="text-[9px] font-black uppercase tracking-widest text-blue-400 mb-1">Aero Intelligence</p>
                      <p className="text-xs font-bold text-blue-100 leading-relaxed italic">&ldquo;{aiData.aeroTip}&rdquo;</p>
                    </div>
                  </div>
                </div>
              )}

              <div className="flex flex-wrap gap-2.5 mb-8 border-b border-slate-800 pb-8">
                <div className="bg-blue-500/10 text-blue-400 border border-blue-500/20 text-[9px] font-black uppercase tracking-widest px-3 py-1.5 rounded-lg flex items-center gap-1.5 shadow-[0_0_15px_rgba(37,99,235,0.15)]">
                  <Sparkles className="w-3.5 h-3.5 fill-current" /> Aero Verified
                </div>
                {aiData.hasPet && (
                  <div className="bg-purple-500/10 text-purple-400 border border-purple-500/20 px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5" /> Pet Friendly
                  </div>
                )}
                {aiData.ulezRisk && airport.includes("Heathrow") && (
                  <div className="bg-red-500/10 text-red-400 border border-red-500/20 px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest flex items-center gap-1.5">
                    <AlertCircle className="w-3.5 h-3.5" /> ULEZ Alert
                  </div>
                )}
                {aiData.hasOversizedLuggage && (
                  <div className="bg-orange-500/10 text-orange-400 border border-orange-500/20 px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest flex items-center gap-1.5">
                    <Footprints className="w-3.5 h-3.5" /> Large Luggage
                  </div>
                )}
                {aiData.isCorporate && (
                  <div className="bg-slate-800 text-slate-300 border border-slate-700 px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest flex items-center gap-1.5">
                    <ShieldCheck className="w-3.5 h-3.5" /> Business / VAT
                  </div>
                )}
                {aiData.isLastMinute && (
                  <div className="bg-rose-500/10 text-rose-400 border border-rose-500/20 px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest flex items-center gap-1.5 animate-pulse">
                    <Zap className="w-3.5 h-3.5" /> High Demand
                  </div>
                )}
              </div>

              <div className="flex items-center gap-5 mb-8 pb-8 border-b border-slate-800">
                <div className="w-14 h-14 bg-blue-600 rounded-2xl flex items-center justify-center flex-shrink-0 shadow-lg shadow-blue-500/20">
                  <PlaneTakeoff className="w-7 h-7 text-white" />
                </div>
                <div>
                  <p className="text-[10px] font-black uppercase tracking-widest text-blue-400 mb-1">{airport}</p>
                  <p className="font-black text-xl leading-tight tracking-tight">{company ? company.name : (urlName || type)}</p>
                </div>
              </div>

              <div className="space-y-5 mb-8 pb-8 border-b border-slate-800">
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-3 text-slate-400">
                    <Calendar className="w-4 h-4 text-blue-500" />
                    <span className="text-[10px] font-black uppercase tracking-widest">Drop-off</span>
                  </div>
                  <div className="text-right">
                    <span className="block text-sm font-bold text-white">{formatDate(dropDate)}</span>
                    <span className="block text-[10px] text-slate-500 font-bold uppercase tracking-widest mt-0.5">{dropTime || "Time TBD"}</span>
                  </div>
                </div>
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-3 text-slate-400">
                    <Calendar className="w-4 h-4 text-blue-500" />
                    <span className="text-[10px] font-black uppercase tracking-widest">Pick-up</span>
                  </div>
                  <div className="text-right">
                    <span className="block text-sm font-bold text-white">{formatDate(pickDate)}</span>
                    <span className="block text-[10px] text-slate-500 font-bold uppercase tracking-widest mt-0.5">{pickTime || "Time TBD"}</span>
                  </div>
                </div>
              </div>

              {/* Promo Code */}
              {!aiData.isFrequentFlyer && (
                <div className="bg-[#131A2B] border border-slate-800 rounded-2xl p-5 mb-8">
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-3 flex items-center gap-2">
                    <Tag className="w-4 h-4" /> Have a Promo Code?
                  </label>
                  <form onSubmit={handleApplyPromo} className="flex gap-3">
                    <input
                      type="text"
                      value={promoInput}
                      onChange={e => setPromoInput(e.target.value)}
                      placeholder="Enter code"
                      disabled={discount.active || isVerifyingPromo}
                      className={`${darkInputCls} flex-1 uppercase`}
                    />
                    {!discount.active ? (
                      <button
                        type="submit" disabled={isVerifyingPromo}
                        className="bg-slate-800 hover:bg-blue-600 disabled:bg-slate-700 text-white px-5 shrink-0 rounded-xl font-black text-[10px] uppercase tracking-widest transition-colors active:scale-95 shadow-sm flex items-center justify-center min-w-[80px]"
                      >
                        {isVerifyingPromo ? <Loader2 className="w-4 h-4 animate-spin" /> : "Apply"}
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => { setDiscount({ active: false, code: "", percent: 0 }); setPromoInput(""); setPromoMessage(""); }}
                        className="bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 px-5 shrink-0 rounded-xl font-black text-[10px] uppercase tracking-widest transition-colors active:scale-95 shadow-sm min-w-[80px]"
                      >
                        Remove
                      </button>
                    )}
                  </form>
                  {promoMessage && (
                    <div className={`mt-4 text-[10px] font-bold uppercase tracking-widest flex items-center gap-2 ${isPromoError ? "text-red-400" : "text-emerald-400"}`}>
                      {isPromoError
                        ? <AlertCircle className="w-4 h-4 shrink-0" />
                        : <CheckCircle2 className="w-4 h-4 shrink-0" />}
                      <span className="leading-tight">{promoMessage}</span>
                    </div>
                  )}
                </div>
              )}

              {aiData.isFrequentFlyer && (
                <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-2xl p-6 mb-8 text-center">
                  <Star className="w-8 h-8 text-emerald-400 mx-auto mb-3" />
                  <p className="text-emerald-400 font-black text-xs uppercase tracking-widest">VIP Loyalty Active</p>
                  <p className="text-emerald-500/80 font-bold text-[11px] mt-2">{promoMessage}</p>
                </div>
              )}

              {/* Price breakdown */}
              <div className="space-y-4 mb-10">
                <div className="flex justify-between text-sm text-slate-400 font-bold">
                  <span>Parking Rate ({bookingDays} {bookingDays === 1 ? "day" : "days"})</span>
                  <div className="text-right">
                    {priceResolving ? (
                      <span className="inline-block h-4 w-16 rounded bg-slate-700/60 animate-pulse align-middle" />
                    ) : (
                      <>
                        {isDiscounted && (
                          <span className="text-xs text-slate-500 line-through block mb-0.5">£{priceData.original.toFixed(2)}</span>
                        )}
                        <span className={`font-black ${discount.active ? "text-slate-500 line-through" : isDiscounted ? "text-emerald-400" : "text-white"}`}>
                          £{priceData.final.toFixed(2)}
                        </span>
                      </>
                    )}
                  </div>
                </div>
                {discount.active && (
                  <div className="flex justify-between text-sm text-emerald-400 font-bold">
                    <span>Promo ({discount.code})</span>
                    <span className="font-black">- £{discountAmount.toFixed(2)}</span>
                  </div>
                )}
                {wantsLounge && (
                  <div className="flex justify-between text-sm text-indigo-400 font-bold">
                    <span>VIP Lounge Access</span>
                    <span className="font-black">+ £{LOUNGE_PRICE.toFixed(2)}</span>
                  </div>
                )}
                {fastTrackCount > 0 && (
                  <div className="flex justify-between text-sm text-amber-400 font-bold">
                    <span>Fast Track Security ({fastTrackCount}x)</span>
                    <span className="font-black">+ £{totalFastTrackCost.toFixed(2)}</span>
                  </div>
                )}
                <div className="flex justify-between text-sm text-slate-400 font-bold pt-4 border-t border-slate-800">
                  <span>Taxes &amp; Airport Fees</span>
                  <span className="text-emerald-500 font-black uppercase tracking-widest text-[10px]">Included</span>
                </div>
              </div>

              <div className="flex flex-col items-end mb-8">
                <span className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-2">Total Due Today</span>
                {priceResolving ? (
                  <span className="flex items-center gap-2 text-blue-400 text-lg font-black tracking-tight">
                    <Loader2 className="w-5 h-5 animate-spin" /> Confirming live price…
                  </span>
                ) : (
                  <span className="text-5xl font-black tracking-tighter text-blue-400 drop-shadow-lg">
                    £{finalTotal.toFixed(2)}
                  </span>
                )}
              </div>

              <div className="hidden lg:block">
                <button
                  type="submit" form="checkout-form"
                  disabled={isProcessing || !!hasDateIssue || priceResolving}
                  className="w-full h-16 bg-blue-600 hover:bg-blue-500 disabled:bg-slate-800 disabled:border disabled:border-slate-700 disabled:text-slate-500 text-white font-black text-lg rounded-2xl flex items-center justify-center gap-3 shadow-[0_15px_30px_-5px_rgba(37,99,235,0.4)] active:scale-95 transition-all uppercase tracking-widest touch-manipulation"
                >
                  {isProcessing
                    ? <><Loader2 className="w-6 h-6 animate-spin" /> Processing...</>
                    : priceResolving
                    ? <><Loader2 className="w-6 h-6 animate-spin" /> Confirming price…</>
                    : <><Lock className="w-5 h-5" /> Proceed to Payment</>}
                </button>
                <p className="text-center text-[10px] text-slate-500 mt-4 font-bold px-2 leading-relaxed">
                  By clicking &ldquo;Proceed to Payment&rdquo;, you accept our{" "}
                  <Link href="/terms" target="_blank" className="text-blue-400 underline hover:text-blue-300">Terms &amp; Conditions</Link>.
                </p>
              </div>
            </div>
          </div>

          <div className="mt-6 flex flex-col gap-4">
            <div className="bg-[#131A2B] rounded-3xl p-6 border border-slate-800 shadow-lg flex items-start gap-4">
              <div className="w-10 h-10 bg-emerald-500/10 text-emerald-400 rounded-xl flex items-center justify-center flex-shrink-0">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <div>
                <p className="text-sm font-black text-white tracking-tight mb-1.5">Aero Booking Guarantee</p>
                <p className="text-xs font-bold text-slate-400 leading-relaxed">
                  Free cancellation up to <span className="text-blue-400">24 hours</span> before your drop-off. Encrypted by Stripe.
                </p>
              </div>
            </div>
          </div>
        </aside>
      </div>

      <ModifySearchModal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        onSearchUpdate={handleSearchUpdate}
        currentSearch={currentSearch}
      />
    </div>
  );
}

// ─── SKELETON ─────────────────────────────────────────────────────────────────

function CheckoutSkeleton() {
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-12 relative z-10 w-full">
      <div className="flex flex-col-reverse lg:flex-row gap-10 items-start">
        <div className="flex-1 w-full space-y-8">
          <div className="bg-white p-10 rounded-[2.5rem] border border-slate-200 shadow-xl opacity-60">
            <div className="h-8 w-48 bg-slate-200 rounded animate-pulse mb-8" />
            <div className="grid grid-cols-2 gap-6">
              <div className="h-14 bg-slate-100 rounded-xl animate-pulse col-span-2" />
              <div className="h-14 bg-slate-100 rounded-xl animate-pulse" />
              <div className="h-14 bg-slate-100 rounded-xl animate-pulse" />
            </div>
          </div>
          <div className="bg-white p-10 rounded-[2.5rem] border border-slate-200 shadow-xl opacity-60">
            <div className="h-8 w-64 bg-slate-200 rounded animate-pulse mb-8" />
            <div className="grid grid-cols-2 gap-6">
              <div className="h-14 bg-slate-100 rounded-xl animate-pulse" />
              <div className="h-14 bg-slate-100 rounded-xl animate-pulse" />
              <div className="h-14 bg-yellow-100 rounded-xl animate-pulse col-span-2" />
            </div>
          </div>
        </div>
        <aside className="w-full lg:w-[420px] bg-[#0B1120] rounded-[2.5rem] border border-slate-800 p-10 shadow-2xl">
          <div className="h-8 w-40 bg-slate-800 rounded animate-pulse mb-10" />
          <div className="space-y-4 mb-10">
            <div className="h-4 w-full bg-slate-800 rounded animate-pulse" />
            <div className="h-4 w-3/4 bg-slate-800 rounded animate-pulse" />
          </div>
          <div className="h-16 w-full bg-blue-600/20 rounded-2xl animate-pulse" />
        </aside>
      </div>
    </div>
  );
}

// ─── PAGE ─────────────────────────────────────────────────────────────────────

export default function CheckoutPage() {
  return (
    <main
      suppressHydrationWarning
      className="min-h-[100dvh] bg-[#F8FAFC] font-sans antialiased pb-24 selection:bg-blue-200 selection:text-blue-900 overflow-x-hidden relative"
    >
      <div className="fixed top-0 left-0 w-full h-full pointer-events-none z-0 flex justify-center overflow-hidden">
        <div className="w-full max-w-[1000px] h-96 bg-blue-600/5 blur-[120px] rounded-full absolute -top-48" />
      </div>
      <header className="sticky top-0 z-[100] bg-[#0A101D] border-b border-slate-800 shadow-2xl backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 md:h-20 flex items-center justify-between">
          <Link href="/results" className="flex items-center gap-2 text-slate-400 hover:text-white transition-colors group touch-manipulation">
            <ArrowLeft className="w-4 h-4 md:w-5 md:h-5 lg:group-hover:-translate-x-1 transition-transform" />
            <span className="text-[10px] font-black uppercase tracking-widest hidden md:block">Back to Packages</span>
          </Link>
          <Link href="/" className="flex items-center gap-1.5 md:gap-2 text-white font-black tracking-tighter text-lg md:text-xl uppercase absolute left-1/2 -translate-x-1/2 touch-manipulation">
            <Plane className="w-5 h-5 md:w-6 md:h-6 text-blue-500 rotate-45" /> AEROPARK<span className="text-blue-500">DIRECT</span>
          </Link>
          <div className="flex items-center gap-2 text-emerald-400">
            <Lock className="w-4 h-4" />
            <span className="text-[10px] font-black uppercase tracking-widest hidden xs:block">Secure Checkout</span>
          </div>
        </div>
      </header>
      <Suspense fallback={<CheckoutSkeleton />}>
        <CheckoutContent />
      </Suspense>
    </main>
  );
}