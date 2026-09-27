"use client";

import { logger } from "@/app/lib/logger";
import { Suspense, useEffect, useState, useMemo, useCallback, useRef } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import { FunnelHeader, FunnelFooter, funnelSlotClass } from "@/components/site/FunnelChrome";
import { supabase } from "../lib/supabase";
import { useLivePromo } from "../lib/useLivePromo";
import {
  computePrice,
  calculateDays,
  loadPricingSettings,
  FAST_TRACK_PRICE,
  DEFAULT_SETTINGS,
  type PricingSettings,
} from "../lib/pricing";
import BookingStepper from "@/components/BookingStepper";
import ModifySearchModal from "@/components/ModifySearchModal";
import { AeroAvatar } from "@/components/AeroFeature";
import {
  ArrowLeft, Loader2, Lock, CreditCard, AlertCircle, CheckCircle2, Coffee, Zap, ChevronDown, AlertTriangle,
} from "lucide-react";

// ─── STYLES ───────────────────────────────────────────────────────────────────

const lightInputCls = "w-full h-12 bg-white border border-slate-300 rounded-lg px-3.5 text-base text-slate-900 placeholder:text-slate-400 focus:border-blue-600 focus:ring-2 focus:ring-blue-600/20 outline-none touch-manipulation shadow-[0_0_0_1000px_#ffffff_inset] [-webkit-text-fill-color:#0f172a] placeholder:[-webkit-text-fill-color:#94a3b8]";
// UK number-plate yellow, so the registration field is recognisable at a glance.
const plateInputCls = "w-full h-14 bg-[#fde047] border border-yellow-500 rounded-lg px-4 text-xl font-bold text-slate-900 text-center uppercase tracking-[0.15em] focus:border-blue-600 focus:ring-2 focus:ring-blue-600/30 outline-none placeholder:text-yellow-700/50 shadow-[0_0_0_1000px_#fde047_inset] [-webkit-text-fill-color:#0f172a] placeholder:[-webkit-text-fill-color:rgba(161,98,7,0.5)] touch-manipulation";
const darkInputCls = "w-full h-11 bg-white/5 border border-white/15 rounded-lg px-3 text-base text-white placeholder:text-slate-500 focus:border-blue-400 focus:ring-2 focus:ring-blue-400/30 outline-none shadow-[0_0_0_1000px_#141b2d_inset] [-webkit-text-fill-color:white] placeholder:[-webkit-text-fill-color:#64748b]";
const labelCls = "block text-sm font-medium text-slate-700 mb-1.5";
const errorInputCls = "border-red-500 focus:border-red-500 focus:ring-red-500/20";
const errorTextCls = "mt-1.5 text-sm text-red-600";
const chipCls = "rounded-md bg-white/10 px-2 py-1 text-slate-200";
const payButtonCls = "w-full h-14 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-400 disabled:text-slate-100 text-white font-semibold text-base rounded-lg flex items-center justify-center gap-2 touch-manipulation";

// ─── HELPERS ──────────────────────────────────────────────────────────────────

const formatDate = (dateString: string | null) => {
  if (!dateString) return "--";
  // FIX: parse as local date to avoid UTC-offset shifting the displayed day
  const [y, m, d] = dateString.split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString("en-GB", {
    weekday: "short", day: "numeric", month: "short",
  });
};

// ─── CARD BRANDS ──────────────────────────────────────────────────────────────

function CardBrands({ dark = false }: { dark?: boolean }) {
  return (
    <div className={`flex items-center gap-2 flex-wrap ${dark ? "" : "justify-center"}`}>
      <span className={`text-sm ${dark ? "text-slate-400" : "text-slate-500"}`}>We accept</span>
      <span className="inline-flex items-center justify-center bg-[#1a1f71] px-2.5 rounded text-white font-bold text-[10px] tracking-wider italic h-6 leading-none">VISA</span>
      <span className="inline-flex items-center justify-center bg-white border border-slate-200 px-2 rounded h-6" aria-label="Mastercard">
        <span className="block w-3.5 h-3.5 rounded-full bg-[#eb001b]" />
        <span className="block w-3.5 h-3.5 rounded-full bg-[#f79e1b] -ml-1.5 opacity-90" />
      </span>
      <span className="inline-flex items-center justify-center bg-[#007bc1] px-2.5 rounded text-white font-bold text-[10px] tracking-wider h-6 leading-none">AMEX</span>
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
    <div role="dialog" aria-modal="true" aria-labelledby="price-changed-heading" className="fixed inset-0 bg-slate-900/60 z-[500] flex items-center justify-center p-4">
      <div className="bg-white rounded-xl p-6 max-w-md w-full">
        <div className="flex items-center gap-3">
          <AlertTriangle className="w-6 h-6 text-amber-500 shrink-0" aria-hidden="true" />
          <h3 id="price-changed-heading" className="text-lg font-semibold text-slate-900">The price has changed</h3>
        </div>
        <p className="mt-3 text-slate-600 leading-relaxed">
          The price for your dates changed after this page loaded. It is now{" "}
          <span className="font-semibold text-slate-900">£{serverPrice.toFixed(2)}</span>. Do you want to continue at this price?
        </p>
        <div className="mt-6 flex gap-3">
          <button
            type="button"
            onClick={onDecline}
            className="flex-1 h-11 rounded-lg border border-slate-300 text-sm font-semibold text-slate-700 hover:bg-slate-50"
          >
            Go back
          </button>
          <button
            type="button"
            onClick={onAccept}
            className="flex-1 h-11 rounded-lg bg-blue-600 hover:bg-blue-700 text-sm font-semibold text-white"
          >
            Pay £{serverPrice.toFixed(2)}
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
  const type    = searchParams.get("type") || "Meet & Greet";
  const urlFlightNumber = searchParams.get("flightNumber") || "";

  const [dropDate, setDropDate] = useState(searchParams.get("dropoffDate") || "");
  const [pickDate, setPickDate] = useState(searchParams.get("pickupDate") || "");
  const [dropTime, setDropTime] = useState(searchParams.get("dropoffTime") || "09:00");
  const [pickTime, setPickTime] = useState(searchParams.get("pickupTime") || "09:00");

  const [company, setCompany]       = useState<any>(null);
  const [resolvedId, setResolvedId] = useState(urlId);

  // ── Fetch settings ──────────────────────────────────────────────────────────
  // Use the shared loader so markup, auto-surge AND add-on prices/tolerance all
  // come from the same source the server uses — keeps the displayed total and the
  // server price-guard in lockstep.
  useEffect(() => {
    loadPricingSettings(supabase).then(setSettings).catch(() => {});
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
          logger.error("Live API Error:", err);
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
  const [fastTrackCount, setFastTrackCount] = useState(0);
  // Live add-on prices from Platform Settings (fall back to defaults). Same values
  // the server charges, so the displayed total matches what Stripe collects.
  const LOUNGE_PRICE      = Number(settings.loungePrice)    > 0 ? Number(settings.loungePrice)    : 35.0;
  const fastTrackUnitCost = Number(settings.fastTrackPrice) > 0 ? Number(settings.fastTrackPrice) : FAST_TRACK_PRICE;

  const livePromo = useLivePromo();
  const [promoInput,       setPromoInput]       = useState("");
  const [discount,         setDiscount]         = useState({ active: false, code: "", percent: 0 });
  const [promoMessage,     setPromoMessage]     = useState("");
  const [isPromoError,     setIsPromoError]     = useState(false);
  const [isVerifyingPromo, setIsVerifyingPromo] = useState(false);

  // ── Validation errors (NEW) ──────────────────────────────────────────────────
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (airport.toLowerCase().includes("luton")) setTerminal("Main Terminal");
    else if (airport.toLowerCase().includes("heathrow")) setTerminal("Terminal 2");
  }, [airport]);

  // ── Promo handler ────────────────────────────────────────────────────────────
  const handleApplyPromo = async (e: React.FormEvent, override?: string) => {
    e.preventDefault();
    // `override` matters: applyLivePromo sets the input and calls straight
    // through, and React state does not update on the same tick - reading
    // promoInput there would send the PREVIOUS value, or nothing at all.
    const code = (override ?? promoInput).toUpperCase().trim();
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

  /** Apply the advertised code without making them type it. Goes through the
      SAME verification as typing it by hand - the banner is only a hint, the
      database is what decides. */
  const applyLivePromo = () => {
    if (!livePromo || discount.active) return;
    setPromoInput(livePromo.code);
    handleApplyPromo({ preventDefault() {} } as unknown as React.FormEvent, livePromo.code);
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

    // Surcharge is applied ONCE inside computePrice (pricing.ts) for both API
    // and pivot companies. This block previously re-multiplied pivot prices by
    // (1 + surcharge) AGAIN — double-charging. Fixed 2026-06: trust the engine
    // as the single source of truth, matching results + the server route.
    return {
      original: pr.original,
      final:    pr.final,
      modifier: pr.modifier,
    };
  }, [company, urlName, type, bookingDays, liveApiRates, dropDate, airport, fallbackUrlPrice, settings]);

  const discountAmount    = priceData.final * discount.percent;
  const totalFastTrackCost = fastTrackCount * fastTrackUnitCost;
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

    let finalServiceType = "Meet & Greet";
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
    // wbraid/gbraid (iOS click ids) are tagged with their type so the upload can
    // send them in the right field — Google rejects them in the gclid field.
    const wbraid = readCookie("ap_wbraid");
    const gbraid = readCookie("ap_gbraid");
    const gclid =
      readCookie("ap_gclid") ||
      (wbraid ? `wbraid:${wbraid}` : "") ||
      (gbraid ? `gbraid:${gbraid}` : "");

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
      logger.error("Payment failed:", error);
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

  const feesNote = ((airport.includes("Heathrow") ? company?.lhr_fees_note : company?.ltn_fees_note) ?? "").trim();

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6 md:py-10 relative z-10">

      {/* Price mismatch modal */}
      {mismatchServerPrice !== null && (
        <PriceMismatchBanner
          serverPrice={mismatchServerPrice}
          onAccept={handleAcceptMismatch}
          onDecline={() => { setMismatchServerPrice(null); router.back(); }}
        />
      )}

      <div className="mb-6 md:mb-8">
        <BookingStepper
          currentStep={searchParams.get("step") === "payment" ? 3 : 2}
          theme="light"
          clickableSteps={true}
          onStepClick={(step) => {
            if (step === 1) router.push(`/results?${searchParams.toString()}`);
          }}
        />
      </div>

      <div className="mb-6 md:mb-8">
        <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-slate-900">Complete your booking</h1>
        <p className="mt-2 text-slate-600">Fill in your details, then pay by card on the next page, which is run by Stripe.</p>
      </div>

      {/* Date issue warning */}
      {hasDateIssue && (
        <div role="alert" className="mb-6 rounded-lg border border-red-200 bg-red-50 p-4 flex items-start gap-3 text-sm text-red-700">
          <AlertTriangle className="w-5 h-5 shrink-0" aria-hidden="true" />
          <p>
            Pick-up must be after drop-off. Please{" "}
            <button type="button" onClick={() => setIsEditModalOpen(true)} className="font-semibold underline underline-offset-4">change your dates</button>.
          </p>
        </div>
      )}

      {/* Payment-level error */}
      {fieldErrors._payment && (
        <div role="alert" className="mb-6 rounded-lg border border-red-200 bg-red-50 p-4 flex items-start gap-3 text-sm text-red-700">
          <AlertCircle className="w-5 h-5 shrink-0" aria-hidden="true" />
          <p>{fieldErrors._payment}</p>
        </div>
      )}

      <div className="flex flex-col-reverse lg:flex-row gap-6 md:gap-8 items-start">
        <div className="flex-1 w-full min-w-0">
          <form id="checkout-form" onSubmit={handlePayment} noValidate className="space-y-6">

            {/*
              ── Live price confirmation status ────────────────────────────────
              Always rendered at constant height to prevent Cumulative Layout
              Shift. Only opacity and background transition — the surrounding
              form fields never move. aria-live="polite" announces the change
              to assistive technology without interrupting screen-reader flow.
            */}
            <div
              role="status"
              aria-live="polite"
              className={[
                "flex items-center gap-3 rounded-lg px-4 py-3 border",
                "transition-[opacity,background-color,border-color] duration-300",
                priceResolving
                  ? "bg-blue-50 border-blue-200 opacity-100"
                  : "bg-transparent border-transparent opacity-0 pointer-events-none select-none",
              ].join(" ")}
            >
              <Loader2 className={`w-4 h-4 text-blue-700 shrink-0 ${priceResolving ? "animate-spin" : ""}`} aria-hidden="true" />
              <p className="text-sm text-blue-800">Confirming the price for your dates. The pay button will be ready in a moment.</p>
            </div>

            <section aria-labelledby="details-heading" className="bg-white rounded-xl border border-slate-200">
              <div className="p-5 md:p-7">
                <h2 id="details-heading" className="text-lg md:text-xl font-semibold text-slate-900">Your details</h2>
                <p className="mt-1 text-sm text-slate-500">We&apos;ll send your confirmation to this email address.</p>
                <div className="mt-5 grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-5">
                  <div className="md:col-span-2">
                    <label htmlFor="fullName" className={labelCls}>Full name</label>
                    <input
                      id="fullName" required type="text" autoComplete="name"
                      value={fullName} onChange={e => setFullName(e.target.value)}
                      className={`${lightInputCls} ${fieldErrors.fullName ? errorInputCls : ""}`}
                    />
                    {fieldErrors.fullName && <p className={errorTextCls}>{fieldErrors.fullName}</p>}
                  </div>
                  <div>
                    <label htmlFor="email" className={labelCls}>Email</label>
                    <input
                      id="email" required type="email" autoComplete="email"
                      value={email} onChange={e => setEmail(e.target.value)}
                      className={`${lightInputCls} ${fieldErrors.email ? errorInputCls : ""}`}
                    />
                    {fieldErrors.email && <p className={errorTextCls}>{fieldErrors.email}</p>}
                  </div>
                  <div>
                    <label htmlFor="phone" className={labelCls}>Mobile number</label>
                    <input
                      id="phone" required type="tel" autoComplete="tel"
                      value={phone} onChange={e => setPhone(e.target.value)}
                      className={`${lightInputCls} ${fieldErrors.phone ? errorInputCls : ""}`}
                    />
                    {fieldErrors.phone && <p className={errorTextCls}>{fieldErrors.phone}</p>}
                  </div>
                </div>
              </div>

              <div className="border-t border-slate-200 p-5 md:p-7">
                <h2 className="text-lg md:text-xl font-semibold text-slate-900">Car and flight</h2>
                <p className="mt-1 text-sm text-slate-500">So the driver knows which car to look for and when you&apos;re back.</p>
                <div className="mt-5 grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-5">
                  <div>
                    <label htmlFor="terminal" className={labelCls}>Departure terminal</label>
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
                      <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 pointer-events-none" aria-hidden="true" />
                    </div>
                  </div>
                  <div>
                    <label htmlFor="flightNumber" className={labelCls}>
                      Return flight number <span className="font-normal text-slate-400">(optional)</span>
                    </label>
                    <input
                      id="flightNumber" type="text"
                      value={flightNumber} onChange={e => setFlightNumber(e.target.value.toUpperCase())}
                      className={`${lightInputCls} uppercase placeholder:normal-case`}
                      placeholder="e.g. EZY123"
                    />
                    <p className="mt-1.5 text-sm text-slate-500">So your operator knows when you&apos;re due back.</p>
                  </div>
                  <div className="md:col-span-2">
                    <label htmlFor="registration" className={labelCls}>Registration</label>
                    <input
                      id="registration" required type="text"
                      value={registration} onChange={e => setRegistration(e.target.value.toUpperCase())}
                      className={`${plateInputCls} ${fieldErrors.registration ? "border-red-500" : ""}`}
                      placeholder="AB12 CDE"
                    />
                    {fieldErrors.registration && <p className={errorTextCls}>{fieldErrors.registration}</p>}
                  </div>
                  <div>
                    <label htmlFor="carMake" className={labelCls}>Make and model</label>
                    <input
                      id="carMake" required type="text"
                      value={carMake} onChange={e => setCarMake(e.target.value)}
                      className={`${lightInputCls} ${fieldErrors.carMake ? errorInputCls : ""}`}
                      placeholder="e.g. Ford Focus"
                    />
                    {fieldErrors.carMake && <p className={errorTextCls}>{fieldErrors.carMake}</p>}
                  </div>
                  <div>
                    <label htmlFor="carColor" className={labelCls}>
                      Colour <span className="font-normal text-slate-400">(optional)</span>
                    </label>
                    <input
                      id="carColor" type="text"
                      value={carColor} onChange={e => setCarColor(e.target.value)}
                      className={lightInputCls}
                    />
                  </div>
                </div>
              </div>
            </section>

            <section aria-labelledby="extras-heading" className="bg-white rounded-xl border border-slate-200 p-5 md:p-7">
              <h2 id="extras-heading" className="text-lg md:text-xl font-semibold text-slate-900">Extras <span className="text-sm font-normal text-slate-500">(optional)</span></h2>

              <div className="mt-5 space-y-3">
                {/* Fast Track Security — live */}
                <div className={`rounded-lg border p-4 ${fastTrackCount > 0 ? "border-blue-600 bg-blue-50/50" : "border-slate-200"}`}>
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <Zap className="w-5 h-5 text-slate-500 shrink-0" aria-hidden="true" />
                      <div>
                        <p className="font-semibold text-slate-900">Fast Track security</p>
                        <p className="text-sm text-slate-500">Skip the main security queue</p>
                      </div>
                    </div>
                    <div className="flex items-center justify-between sm:justify-end gap-5">
                      <p className="text-sm text-slate-600"><span className="font-semibold text-slate-900 tabular-nums">£{fastTrackUnitCost.toFixed(2)}</span> per person</p>
                      <div className="flex items-center rounded-lg border border-slate-300 shrink-0">
                        <button
                          type="button"
                          onClick={() => setFastTrackCount(n => Math.max(0, n - 1))}
                          disabled={fastTrackCount === 0}
                          aria-label="Remove one Fast Track pass"
                          className="w-10 h-10 flex items-center justify-center text-lg text-slate-700 hover:bg-slate-100 disabled:text-slate-300 disabled:hover:bg-transparent rounded-l-lg"
                        >
                          &minus;
                        </button>
                        <span className="w-9 text-center font-semibold text-slate-900 tabular-nums" aria-live="polite">{fastTrackCount}</span>
                        <button
                          type="button"
                          onClick={() => setFastTrackCount(n => Math.min(9, n + 1))}
                          disabled={fastTrackCount >= 9}
                          aria-label="Add one Fast Track pass"
                          className="w-10 h-10 flex items-center justify-center text-lg text-slate-700 hover:bg-slate-100 disabled:text-slate-300 rounded-r-lg"
                        >
                          +
                        </button>
                      </div>
                    </div>
                  </div>
                </div>

                {/* VIP Airport Lounge — coming soon */}
                <div className="rounded-lg border border-slate-200 bg-slate-50 p-4 flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <Coffee className="w-5 h-5 text-slate-400 shrink-0" aria-hidden="true" />
                    <div>
                      <p className="font-semibold text-slate-500">Airport lounge</p>
                      <p className="text-sm text-slate-400">Relax before your flight</p>
                    </div>
                  </div>
                  <span className="text-sm text-slate-500 shrink-0">Coming soon</span>
                </div>
              </div>
            </section>

            <section aria-labelledby="payment-heading" className="bg-white rounded-xl border border-slate-200 p-5 md:p-7">
              <h2 id="payment-heading" className="text-lg md:text-xl font-semibold text-slate-900">Payment</h2>
              <p className="mt-2 flex items-start gap-3 text-slate-600 leading-relaxed">
                <CreditCard className="w-5 h-5 text-slate-400 shrink-0 mt-0.5" aria-hidden="true" />
                <span>When you press Pay you&apos;ll go to Stripe&apos;s secure payment page. We never see or store your card details.</span>
              </p>
            </section>

            {/* MOBILE PAY BUTTON */}
            <div className="block lg:hidden space-y-3 pb-4">
              {/* Trust strip right above the pay button — the point of highest hesitation. */}
              <p className="flex items-center justify-center gap-2 text-sm text-emerald-700">
                <CheckCircle2 className="w-4 h-4 shrink-0" aria-hidden="true" />
                Free cancellation up to 24 hours before drop-off
              </p>
              <CardBrands />
              <button
                type="submit" form="checkout-form" disabled={isProcessing || !!hasDateIssue || priceResolving}
                className={payButtonCls}
              >
                {isProcessing
                  ? <><Loader2 className="w-5 h-5 animate-spin" aria-hidden="true" /> Preparing payment…</>
                  : priceResolving
                  ? <><Loader2 className="w-5 h-5 animate-spin" aria-hidden="true" /> Confirming price…</>
                  : <><Lock className="w-5 h-5" aria-hidden="true" /> Pay £{finalTotal.toFixed(2)}</>}
              </button>
              <p className="text-center text-sm text-slate-500">
                By paying you accept our{" "}
                <Link href="/terms" target="_blank" className="text-slate-700 underline underline-offset-4">terms and conditions</Link>.
              </p>
            </div>
          </form>
        </div>

        {/* SIDEBAR */}
        <aside className="w-full lg:w-[380px] lg:sticky lg:top-24">
          <div className="bg-[#0B1120] rounded-xl text-white">
            <div className="p-5 md:p-7">
              <div className="flex items-center justify-between gap-4">
                <h2 className="text-lg font-semibold">Your booking</h2>
                <button
                  type="button"
                  onClick={() => setIsEditModalOpen(true)}
                  className="text-sm font-medium text-slate-300 hover:text-white underline underline-offset-4"
                >
                  Change
                </button>
              </div>

              <div className="mt-5 pb-5 border-b border-white/10">
                <p className="text-sm text-slate-400">{airport}</p>
                <p className="mt-0.5 text-lg font-semibold leading-snug">{company ? company.name : (urlName || type)}</p>
              </div>

              <dl className="py-5 space-y-3 border-b border-white/10 text-sm">
                <div className="flex justify-between gap-4">
                  <dt className="text-slate-400">Drop-off</dt>
                  <dd className="text-right">{formatDate(dropDate)}, {dropTime || "time to confirm"}</dd>
                </div>
                <div className="flex justify-between gap-4">
                  <dt className="text-slate-400">Pick-up</dt>
                  <dd className="text-right">{formatDate(pickDate)}, {pickTime || "time to confirm"}</dd>
                </div>
                <div className="flex justify-between gap-4">
                  <dt className="text-slate-400">Length of stay</dt>
                  <dd className="text-right">{bookingDays} {bookingDays === 1 ? "day" : "days"}</dd>
                </div>
              </dl>

              {/* What Aero picked up from the shopper's own search. These describe
                  the trip, not the operator. */}
              {(aiData.aeroTip || aiData.hasPet || (aiData.ulezRisk && airport.includes("Heathrow")) || aiData.hasOversizedLuggage || aiData.isCorporate || aiData.isLastMinute) && (
                <div className="py-5 border-b border-white/10">
                  <p className="flex items-center gap-2 text-sm font-semibold">
                    <AeroAvatar className="w-5 h-5" /> From your Aero search
                  </p>
                  {aiData.aeroTip && <p className="mt-2 text-sm text-slate-300 leading-relaxed">{aiData.aeroTip}</p>}
                  <ul className="mt-3 flex flex-wrap gap-2 text-xs">
                    {aiData.hasPet && <li className={chipCls}>Travelling with a pet</li>}
                    {aiData.ulezRisk && airport.includes("Heathrow") && <li className={chipCls}>ULEZ charge may apply</li>}
                    {aiData.hasOversizedLuggage && <li className={chipCls}>Large luggage</li>}
                    {aiData.isCorporate && <li className={chipCls}>Business trip</li>}
                    {aiData.isLastMinute && <li className={chipCls}>Last-minute booking</li>}
                  </ul>
                </div>
              )}

              {/* Promo Code */}
              <div className="py-5 border-b border-white/10">
                <label htmlFor="promo-code" className="text-sm font-medium text-slate-300">Promo code</label>
                {/* A code is being advertised and they have not used it. Say
                    so plainly, and let them apply it in one tap - they saw
                    this price struck through on the results page. */}
                {livePromo && !discount.active && (
                  <div className="mt-2 mb-3 rounded-lg border border-amber-400/40 bg-amber-400/10 p-3">
                    <p className="text-sm text-amber-100 leading-relaxed">
                      You haven&apos;t used your {Math.round(livePromo.percent * 100)}% code yet. Apply{" "}
                      <span className="font-semibold">{livePromo.code}</span> before you pay, or you&apos;ll be charged the full price.
                    </p>
                    <button
                      type="button"
                      onClick={applyLivePromo}
                      disabled={isVerifyingPromo}
                      className="mt-2.5 w-full h-10 rounded-lg bg-amber-400 hover:bg-amber-300 text-sm font-semibold text-slate-900 disabled:opacity-60"
                    >
                      {isVerifyingPromo ? "Applying…" : `Apply ${livePromo.code} and save ${Math.round(livePromo.percent * 100)}%`}
                    </button>
                  </div>
                )}

                <form onSubmit={handleApplyPromo} className="mt-2 flex gap-2">
                  <input
                    id="promo-code"
                    type="text"
                    value={promoInput}
                    onChange={e => setPromoInput(e.target.value)}
                    disabled={discount.active || isVerifyingPromo}
                    className={`${darkInputCls} flex-1 min-w-0 uppercase`}
                  />
                  {!discount.active ? (
                    <button
                      type="submit" disabled={isVerifyingPromo}
                      className="h-11 px-4 shrink-0 rounded-lg bg-white/10 hover:bg-white/20 text-sm font-semibold flex items-center justify-center min-w-[72px]"
                    >
                      {isVerifyingPromo ? <Loader2 className="w-4 h-4 animate-spin" /> : "Apply"}
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => { setDiscount({ active: false, code: "", percent: 0 }); setPromoInput(""); setPromoMessage(""); }}
                      className="h-11 px-4 shrink-0 rounded-lg border border-white/20 hover:bg-white/10 text-sm font-medium min-w-[72px]"
                    >
                      Remove
                    </button>
                  )}
                </form>
                {promoMessage && (
                  <p className={`mt-2 flex items-center gap-2 text-sm ${isPromoError ? "text-red-300" : "text-emerald-300"}`}>
                    {isPromoError
                      ? <AlertCircle className="w-4 h-4 shrink-0" aria-hidden="true" />
                      : <CheckCircle2 className="w-4 h-4 shrink-0" aria-hidden="true" />}
                    {promoMessage}
                  </p>
                )}
              </div>

              {/* Price breakdown */}
              <dl className="py-5 space-y-2.5 text-sm">
                <div className="flex justify-between gap-4">
                  <dt className="text-slate-300">Parking ({bookingDays} {bookingDays === 1 ? "day" : "days"})</dt>
                  <dd className="text-right tabular-nums">
                    {priceResolving ? (
                      <span className="inline-block h-4 w-16 rounded bg-white/10 animate-pulse align-middle" />
                    ) : (
                      <>
                        {isDiscounted && (
                          <span className="block text-xs text-slate-500 line-through">£{priceData.original.toFixed(2)}</span>
                        )}
                        <span className={discount.active ? "text-slate-500 line-through" : isDiscounted ? "text-emerald-300" : ""}>
                          £{priceData.final.toFixed(2)}
                        </span>
                      </>
                    )}
                  </dd>
                </div>
                {discount.active && (
                  <div className="flex justify-between gap-4 text-emerald-300">
                    <dt>Promo ({discount.code})</dt>
                    <dd className="tabular-nums">&minus;£{discountAmount.toFixed(2)}</dd>
                  </div>
                )}
                {wantsLounge && (
                  <div className="flex justify-between gap-4">
                    <dt className="text-slate-300">Airport lounge</dt>
                    <dd className="tabular-nums">£{LOUNGE_PRICE.toFixed(2)}</dd>
                  </div>
                )}
                {fastTrackCount > 0 && (
                  <div className="flex justify-between gap-4">
                    <dt className="text-slate-300">Fast Track security &times; {fastTrackCount}</dt>
                    <dd className="tabular-nums">£{totalFastTrackCost.toFixed(2)}</dd>
                  </div>
                )}
                {feesNote && (
                  <div className="flex justify-between gap-4">
                    <dt className="text-slate-300">Airport fee</dt>
                    <dd className="text-right text-amber-200">Paid on the day, see below</dd>
                  </div>
                )}
              </dl>

              <div className="pt-4 border-t border-white/10 flex items-end justify-between gap-4">
                <span className="text-sm text-slate-300">Total to pay now</span>
                {priceResolving ? (
                  <span className="flex items-center gap-2 text-slate-300">
                    <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" /> Confirming…
                  </span>
                ) : (
                  <span className="text-3xl font-bold tabular-nums">£{finalTotal.toFixed(2)}</span>
                )}
              </div>

              <div className="hidden lg:block mt-6 space-y-3">
                <p className="flex items-center gap-2 text-sm text-emerald-300">
                  <CheckCircle2 className="w-4 h-4 shrink-0" aria-hidden="true" />
                  Free cancellation up to 24 hours before drop-off
                </p>
                <CardBrands dark />
                <button
                  type="submit" form="checkout-form"
                  disabled={isProcessing || !!hasDateIssue || priceResolving}
                  className={payButtonCls}
                >
                  {isProcessing
                    ? <><Loader2 className="w-5 h-5 animate-spin" aria-hidden="true" /> Preparing payment…</>
                    : priceResolving
                    ? <><Loader2 className="w-5 h-5 animate-spin" aria-hidden="true" /> Confirming price…</>
                    : <><Lock className="w-5 h-5" aria-hidden="true" /> Pay £{finalTotal.toFixed(2)}</>}
                </button>
                <p className="text-center text-sm text-slate-400">
                  By paying you accept our{" "}
                  <Link href="/terms" target="_blank" className="text-slate-200 underline underline-offset-4">terms and conditions</Link>.
                </p>
              </div>
            </div>
          </div>

          {feesNote && (
            <div className="mt-4 rounded-xl border border-amber-300 bg-amber-50 p-4 flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" aria-hidden="true" />
              <div>
                <p className="text-sm font-semibold text-amber-900">Payable on the day</p>
                <p className="mt-1 text-sm text-amber-900 leading-relaxed">{feesNote}</p>
              </div>
            </div>
          )}
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
          <div className="bg-white p-10 rounded-2xl border border-slate-200 shadow-xl opacity-60">
            <div className="h-8 w-48 bg-slate-200 rounded animate-pulse mb-8" />
            <div className="grid grid-cols-2 gap-6">
              <div className="h-14 bg-slate-100 rounded-xl animate-pulse col-span-2" />
              <div className="h-14 bg-slate-100 rounded-xl animate-pulse" />
              <div className="h-14 bg-slate-100 rounded-xl animate-pulse" />
            </div>
          </div>
          <div className="bg-white p-10 rounded-2xl border border-slate-200 shadow-xl opacity-60">
            <div className="h-8 w-64 bg-slate-200 rounded animate-pulse mb-8" />
            <div className="grid grid-cols-2 gap-6">
              <div className="h-14 bg-slate-100 rounded-xl animate-pulse" />
              <div className="h-14 bg-slate-100 rounded-xl animate-pulse" />
              <div className="h-14 bg-yellow-100 rounded-xl animate-pulse col-span-2" />
            </div>
          </div>
        </div>
        <aside className="w-full lg:w-[420px] bg-[#0F1523] rounded-2xl border border-white/[0.06] p-10">
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
      className="min-h-[100dvh] bg-[#F8FAFC] font-sans antialiased selection:bg-blue-200 selection:text-blue-900 overflow-x-clip relative"
    >
      <FunnelHeader
        left={
          <Link href="/results" className={funnelSlotClass}>
            <ArrowLeft className="w-4 h-4" aria-hidden="true" />
            <span className="hidden sm:inline">Back to results</span>
          </Link>
        }
        right={
          <span className="flex items-center gap-2 text-sm font-medium text-slate-600">
            <Lock className="w-4 h-4 text-emerald-600" aria-hidden="true" />
            <span className="hidden sm:inline">Secure checkout</span>
          </span>
        }
      />
      <Suspense fallback={<CheckoutSkeleton />}>
        <CheckoutContent />
      </Suspense>
      <FunnelFooter />
    </main>
  );
}