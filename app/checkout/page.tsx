"use client";

import { supabase } from "../lib/supabase";
import { useState, Suspense, useEffect } from "react"; 
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";

import { 
  ShieldCheck, ArrowRight, ArrowLeft, Loader2, CarFront, User,
  MapPin, PlaneTakeoff, Plane, Lock, CreditCard, Calendar, Shield,
  Sparkles, Tag, AlertCircle, CheckCircle2, Coffee, Zap, Star,
  Settings2, Clock, Footprints, ChevronDown, Navigation
} from "lucide-react";

// ----------------------------------------------------------------------
// 🟢 CUSTOM AERO AVATAR 
// ----------------------------------------------------------------------
function AeroAvatar({ size = "md", state = "idle", onClick }: { size?: "sm" | "md" | "lg" | "xl", state?: "idle" | "scanning" | "success", onClick?: () => void }) {
  const sizeClasses = { sm: "w-8 h-8 rounded-lg", md: "w-14 h-14 rounded-2xl", lg: "w-20 h-20 rounded-3xl", xl: "w-32 h-32 rounded-[2.5rem]" };
  const gap = { sm: "gap-1", md: "gap-1.5", lg: "gap-2", xl: "gap-3" };
  const eyeSize = { sm: "w-1 h-2.5", md: "w-1.5 h-4", lg: "w-2 h-6", xl: "w-3.5 h-10" };

  return (
    <div 
      onClick={onClick}
      className={`relative flex items-center justify-center shrink-0 ${sizeClasses[size]} ${onClick ? 'cursor-pointer hover:scale-105 active:scale-95 transition-transform' : ''}`}
    >
      <div className={`absolute inset-0 bg-blue-500/40 blur-xl ${state === 'scanning' ? 'animate-pulse scale-125' : 'animate-pulse scale-105'}`}></div>
      <div className={`relative w-full h-full bg-gradient-to-br from-blue-500 to-blue-700 flex items-center justify-center shadow-[0_0_25px_rgba(37,99,235,0.5)] overflow-hidden ${sizeClasses[size]} transition-all duration-300`}>
        <div className={`absolute left-0 w-full h-[2px] bg-white/90 shadow-[0_0_15px_white] z-20 transition-opacity duration-300 ${state === 'scanning' ? 'opacity-100 animate-scan' : 'opacity-0'}`}></div>
        <div className={`flex ${gap[size]} z-10 items-center justify-center`}>
          <div className={`${eyeSize[size]} bg-white rounded-full shadow-[0_0_15px_rgba(255,255,255,1)]`}></div>
          <div className={`${eyeSize[size]} bg-white rounded-full shadow-[0_0_15px_rgba(255,255,255,1)]`}></div>
        </div>
      </div>
    </div>
  );
}

// ----------------------------------------------------------------------
// 🟢 ROBUST DATA PARSERS (Fixes Date & "0" Bugs)
// ----------------------------------------------------------------------
const parsePrice = (val: any, fallback: number) => {
  if (val === null || val === undefined) return fallback;
  const num = Number(val);
  return num > 0 ? num : fallback;
};

const safeParseDate = (dateStr: string) => {
  if (!dateStr) return new Date();
  if (dateStr.includes("/")) {
    const [day, month, year] = dateStr.split("/");
    return new Date(`${year}-${month}-${day}`);
  }
  return new Date(dateStr);
};

function CheckoutContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [isProcessing, setIsProcessing] = useState(false);
  const [isEditingSearch, setIsEditingSearch] = useState(false);
  
  // 🟢 AGGRESSIVE URL GRABBER
  const urlId = searchParams.get("companyId") || searchParams.get("id") || searchParams.get("providerId") || ""; 
  const urlName = searchParams.get("company") || searchParams.get("provider") || searchParams.get("name") || "";
  
  const airport = searchParams.get("airport") || "Luton (LTN)";
  const type = searchParams.get("type") || "Premium Meet & Greet"; 
  const urlFlightNumber = searchParams.get("flightNumber") || "";
  
  // 🟢 SECURE PRICING STATES
  const [company, setCompany] = useState<any>(null);
  const [resolvedId, setResolvedId] = useState(urlId); 
  const fallbackUrlPrice = Number(searchParams.get("price")) || 0; 
  
  // 🟢 AI DATA CAPTURE
  const aiData = {
    isFrequentFlyer: searchParams.get("isFrequentFlyer") === "true",
    loyaltyMessage: searchParams.get("loyaltyMessage") || "",
    hasPet: searchParams.get("hasPet") === "true",
    isCorporate: searchParams.get("isCorporate") === "true",
    hasOversizedLuggage: searchParams.get("hasOversizedLuggage") === "true",
    ulezRisk: searchParams.get("ulezRisk") === "true",
    isLastMinute: searchParams.get("isLastMinute") === "true",
    aeroTip: searchParams.get("aeroTip") || ""
  };

  const rawUpsells = searchParams.get("upsells") || "";
  const suggestedAncillaries = rawUpsells.split(',').filter(Boolean);

  // --- EDITABLE SEARCH STATES ---
  const [dropDate, setDropDate] = useState(searchParams.get("dropoffDate") || "");
  const [pickDate, setPickDate] = useState(searchParams.get("pickupDate") || "");
  const [dropTime, setDropTime] = useState(searchParams.get("dropoffTime") || "09:00");
  const [pickTime, setPickTime] = useState(searchParams.get("pickupTime") || "09:00");

  // --- FORM STATES ---
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState(""); 
  const [phone, setPhone] = useState("");
  const [terminal, setTerminal] = useState(airport.includes("Heathrow") ? "Terminal 2" : "Main Terminal");
  const [flightNumber, setFlightNumber] = useState(urlFlightNumber);
  const [registration, setRegistration] = useState(""); 
  const [carMake, setCarMake] = useState("");
  const [carColor, setCarColor] = useState("");

  // --- UPSELL STATES ---
  const [wantsLounge, setWantsLounge] = useState(false);
  const [wantsFastTrack, setWantsFastTrack] = useState(false);
  const LOUNGE_PRICE = 35.00;
  const FAST_TRACK_PRICE = 8.50;

  // --- PROMO CODE STATES ---
  const [promoInput, setPromoInput] = useState("");
  const [discount, setDiscount] = useState({ active: false, code: "", percent: 0 });
  const [promoMessage, setPromoMessage] = useState("");
  const [isPromoError, setIsPromoError] = useState(false);
  const [aeroClicks, setAeroClicks] = useState(0);
  const [isVerifyingPromo, setIsVerifyingPromo] = useState(false);

  // 🟢 AGGRESSIVE DATABASE SEARCH
  useEffect(() => {
    async function fetchCompanyData() {
      if (urlId) {
        const { data } = await supabase.from('companies').select('*').eq('id', urlId).maybeSingle();
        if (data) {
          setCompany(data);
          setResolvedId(data.id);
        }
      } else if (urlName) {
        const { data } = await supabase.from('companies').select('*').ilike('name', `%${urlName}%`).maybeSingle();
        if (data) {
          setCompany(data);
          setResolvedId(data.id);
        }
      }
    }
    fetchCompanyData();
  }, [urlId, urlName]);

  // 🟢 AUTO-SELECT TERMINAL FOR LUTON
  useEffect(() => {
    if (airport.toLowerCase().includes("luton")) {
      setTerminal("Main Terminal");
    }
  }, [airport]);

  // 🟢 AUTO-APPLY LOYALTY DISCOUNT ON LOAD
  useEffect(() => {
    if (aiData.isFrequentFlyer && !discount.active) {
      setDiscount({ active: true, code: "AERO VIP", percent: 0.15 });
      setPromoMessage(aiData.loyaltyMessage || "Loyalty recognized! 15% discount auto-applied.");
      setIsPromoError(false);
    }
  }, [aiData.isFrequentFlyer, aiData.loyaltyMessage, discount.active]);

  // 🚀 UPDATED PROMO CODE VERIFIER
  const handleApplyPromo = async (e: React.FormEvent) => {
    e.preventDefault();
    const code = promoInput.toUpperCase().trim();
    
    setIsVerifyingPromo(true); 

    if (code === "LAUNCH10") {
      setDiscount({ active: true, code: "LAUNCH10", percent: 0.10 });
      setPromoMessage("Launch discount applied! 10% off.");
      setIsPromoError(false);
      
    } else if (code === "AERO15") {
      
      if (!email.trim() || !email.includes('@')) {
        setDiscount({ active: false, code: "", percent: 0 });
        setPromoMessage("Please enter a valid Email Address above to verify your loyalty status.");
        setIsPromoError(true);
        setIsVerifyingPromo(false);
        return;
      }

      try {
        const response = await fetch('/api/verify-promo', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: email.trim() })
        });
        
        const { count } = await response.json();

        if (count >= 2) {
          setDiscount({ active: true, code: "AERO15", percent: 0.15 });
          setPromoMessage("Welcome back! 15% loyalty discount verified and applied.");
          setIsPromoError(false);
        } else {
          setDiscount({ active: false, code: "", percent: 0 });
          setPromoMessage(`AERO15 requires 2 past bookings. We only found ${count} for this email.`);
          setIsPromoError(true);
        }
      } catch (err) {
        setDiscount({ active: false, code: "", percent: 0 });
        setPromoMessage("Failed to verify email. Please try again.");
        setIsPromoError(true);
      }

    } else if (code === "SECRET3" || code === "AERO3") {
      setDiscount({ active: true, code: "AERO3", percent: 0.03 });
      setPromoMessage("Secret Aero Discount Unlocked! 3% off.");
      setIsPromoError(false);
      
    } else {
      setDiscount({ active: false, code: "", percent: 0 });
      setPromoMessage("Invalid or expired promo code.");
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

  // 🟢 ADVANCED TIER PRICING CALCULATION (8-TIER INTERPOLATION + 10% MARKUP)
  const calculateDays = () => {
    if (!dropDate || !pickDate) return 1;
    const start = safeParseDate(dropDate);
    const end = safeParseDate(pickDate);
    if (isNaN(start.getTime()) || isNaN(end.getTime())) return 1;
    const diffTime = Math.abs(end.getTime() - start.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1; 
    return diffDays <= 0 ? 1 : diffDays;
  };

  const getSecureBasePrice = () => {
    if (!company) return fallbackUrlPrice; 
    
    const duration = calculateDays();
    const isLuton = airport.toLowerCase().includes("luton");
    let totalPrice = 0;
    
    if (!isLuton) { // Heathrow Math
      const p1 = parsePrice(company.heathrow_price, 0);
      const p2 = parsePrice(company.lhr_day2_price, p1);
      const p5 = parsePrice(company.lhr_day5_price, p2);
      const p8 = parsePrice(company.lhr_day8_price, p5);
      const p11 = parsePrice(company.lhr_day11_price, p8);
      const p14 = parsePrice(company.lhr_day14_price, p11);
      const p17 = parsePrice(company.lhr_day17_price, p14);
      const p22 = parsePrice(company.lhr_day22_price, p17);
      const p32 = parsePrice(company.lhr_day32_price, p22);

      if (duration <= 1) totalPrice = p1;
      else if (duration === 2) totalPrice = p2;
      else if (duration <= 5) totalPrice = p2 + ((p5 - p2) / 3) * (duration - 2);
      else if (duration <= 8) totalPrice = p5 + ((p8 - p5) / 3) * (duration - 5);
      else if (duration <= 11) totalPrice = p8 + ((p11 - p8) / 3) * (duration - 8);
      else if (duration <= 14) totalPrice = p11 + ((p14 - p11) / 3) * (duration - 11);
      else if (duration <= 17) totalPrice = p14 + ((p17 - p14) / 3) * (duration - 14);
      else if (duration <= 22) totalPrice = p17 + ((p22 - p17) / 5) * (duration - 17);
      else if (duration <= 32) totalPrice = p22 + ((p32 - p22) / 10) * (duration - 22);
      else totalPrice = p32 + ((p32 - p22) / 10) * (duration - 32); 
    } else { // Luton Math
      const p1 = parsePrice(company.luton_price, 0);
      const p2 = parsePrice(company.ltn_day2_price, p1);
      const p5 = parsePrice(company.ltn_day5_price, p2);
      const p8 = parsePrice(company.ltn_day8_price, p5);
      const p11 = parsePrice(company.ltn_day11_price, p8);
      const p14 = parsePrice(company.ltn_day14_price, p11);
      const p17 = parsePrice(company.ltn_day17_price, p14);
      const p22 = parsePrice(company.ltn_day22_price, p17);
      const p32 = parsePrice(company.ltn_day32_price, p22);

      if (duration <= 1) totalPrice = p1;
      else if (duration === 2) totalPrice = p2;
      else if (duration <= 5) totalPrice = p2 + ((p5 - p2) / 3) * (duration - 2);
      else if (duration <= 8) totalPrice = p5 + ((p8 - p5) / 3) * (duration - 5);
      else if (duration <= 11) totalPrice = p8 + ((p11 - p8) / 3) * (duration - 8);
      else if (duration <= 14) totalPrice = p11 + ((p14 - p11) / 3) * (duration - 11);
      else if (duration <= 17) totalPrice = p14 + ((p17 - p14) / 3) * (duration - 14);
      else if (duration <= 22) totalPrice = p17 + ((p22 - p17) / 5) * (duration - 17);
      else if (duration <= 32) totalPrice = p22 + ((p32 - p22) / 10) * (duration - 22);
      else totalPrice = p32 + ((p32 - p22) / 10) * (duration - 32); 
    }

    // 🚀 Apply the identical 10% structural spike here to guarantee exact cross-page parity
    return totalPrice * 1.10;
  };

  const bookingDays = calculateDays();
  const baseTotal = getSecureBasePrice(); 
  const discountAmount = baseTotal * discount.percent;
  const addOnsTotal = (wantsLounge ? LOUNGE_PRICE : 0) + (wantsFastTrack ? FAST_TRACK_PRICE : 0);
  const finalTotal = (baseTotal - discountAmount) + addOnsTotal;

  const formatDate = (dateString: string | null) => {
    if (!dateString) return "--";
    return new Date(dateString).toLocaleDateString("en-GB", { weekday: 'short', day: 'numeric', month: 'short' });
  };

  const handleUpdateSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setIsEditingSearch(false);
    
    const query = new URLSearchParams(searchParams.toString());
    query.set("dropoffDate", dropDate);
    query.set("dropoffTime", dropTime);
    query.set("pickupDate", pickDate);
    query.set("pickupTime", pickTime);
    
    if (type) {
      query.set("type", type);
    }
    
    query.delete("price"); 
    
    // 🟢 FIX: Update the URL in place so the page doesn't reload/redirect
    router.replace(`${window.location.pathname}?${query.toString()}`);
  };

  // 🟢 STRIPE PAYMENT REDIRECT
  const handlePayment = async (e: React.FormEvent) => {
    e.preventDefault(); 
    if (!fullName || !email || !phone || !registration || !carMake || !dropDate || !pickDate) {
      alert("Please complete all required fields and ensure dates are selected.");
      return;
    }
    
    setIsProcessing(true);

    let finalServiceType = "Premium Meet & Greet";
    if (type.toLowerCase().includes("park & ride") || type.toLowerCase().includes("park and ride")) {
      finalServiceType = "Park & Ride";
    }
    if (type.toLowerCase().includes("hotel")) {
      finalServiceType = "Hotel & Parking";
    }

    const providerName = company ? company.name : (urlName || type || "AeroPark Direct");

    try {
      const response = await fetch('/api/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          price: finalTotal, 
          airport: airport,
          provider: providerName,
          metadata: {
            full_name: fullName,
            license_plate: registration.toUpperCase(),
            car_make: carMake,
            car_color: carColor,
            airport: airport,
            terminal: terminal, // 🟢 Sends just the string ("Terminal 5") safely
            dropoff_date: dropDate,
            pickup_date: pickDate,
            company_id: resolvedId, 
            service_type: finalServiceType,
            fullName,
            email,
            phone,
            registration: registration.toUpperCase(),
            carMake,
            carColor,
            flightNumber: flightNumber.toUpperCase(),
            dropDate,
            pickDate,
            dropTime,
            pickTime,
            type,
            promo_used: discount.code || "None",
          }
        }),
      });

      const data = await response.json();
      if (data.error) throw new Error(data.error);
      if (data.url) window.location.href = data.url;

    } catch (error: any) {
      console.error("Payment failed:", error);
      alert(`Payment Error: ${error.message}`);
      setIsProcessing(false);
    }
  };

  const lightInputCls = "w-full bg-white border border-slate-200 hover:border-blue-400 rounded-xl px-5 py-4 text-sm font-bold text-slate-900 placeholder:text-slate-400 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 outline-none transition-all touch-manipulation shadow-[0_0_0_1000px_#ffffff_inset] [-webkit-text-fill-color:#0f172a]";
  const yellowInputCls = "w-full bg-[#fde047] border-2 border-yellow-400 rounded-xl px-5 py-4 font-black text-slate-900 text-xl md:text-2xl text-center uppercase tracking-[0.2em] focus:border-blue-500 focus:ring-4 focus:ring-blue-500/20 outline-none transition-all placeholder:text-yellow-600/50 shadow-[0_0_0_1000px_#fde047_inset] [-webkit-text-fill-color:#0f172a] touch-manipulation";
  const darkInputCls = "w-full bg-[#131A2B] border border-slate-700/50 hover:border-blue-500/50 rounded-xl px-5 py-4 text-sm font-bold text-white placeholder:text-slate-500 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/50 outline-none transition-all shadow-[0_0_0_1000px_#131A2B_inset] [-webkit-text-fill-color:white]";

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 md:py-12 relative z-10">
      
      {/* 🟢 AERO SECURE BANNER */}
      <div className="max-w-3xl mx-auto mb-8 bg-[#0B1120]/80 backdrop-blur-xl border border-blue-900/40 rounded-3xl p-4 md:p-6 flex items-center gap-5 shadow-2xl relative overflow-hidden">
        <div className="absolute -right-10 -top-10 w-40 h-40 bg-blue-600/20 rounded-full blur-3xl pointer-events-none"></div>
        <AeroAvatar state="idle" size="md" onClick={handleAeroClick} />
        <div className="relative z-10">
          <p className="text-[10px] font-black uppercase tracking-[0.3em] text-blue-400 mb-1.5 flex items-center gap-2"><CheckCircle2 className="w-4 h-4"/> Aero Secure Checkout</p>
          <p className="text-sm md:text-base text-slate-300 font-medium">
            {aiData.isFrequentFlyer ? "Welcome back! I've automatically applied your loyalty discount." : "Aero has securely locked your rate. Complete your details below."}
          </p>
        </div>
      </div>

      <div className="flex items-center justify-between mb-10 max-w-3xl mx-auto px-4">
        <div className="flex flex-col items-center gap-2 flex-1 opacity-40">
          <div className="h-1.5 w-full bg-blue-600 rounded-full"></div>
          <span className="text-[10px] font-black uppercase text-blue-600 tracking-[0.2em] hidden xs:block">Select</span>
        </div>
        <div className="w-4 md:w-8 flex justify-center text-slate-300">—</div>
        <div className="flex flex-col items-center gap-2 flex-1">
          <div className="h-2 w-full bg-blue-600 rounded-full shadow-[0_0_15px_rgba(37,99,235,0.6)]"></div>
          <span className="text-[10px] font-black uppercase text-blue-600 tracking-[0.2em] hidden xs:block">Details & Pay</span>
        </div>
        <div className="w-4 md:w-8 flex justify-center text-slate-300">—</div>
        <div className="flex flex-col items-center gap-2 flex-1 opacity-30">
          <div className="h-1.5 w-full bg-slate-300 rounded-full"></div>
          <span className="text-[10px] font-black uppercase text-slate-500 tracking-[0.2em] hidden xs:block">Confirm</span>
        </div>
      </div>

      <div className="flex flex-col-reverse lg:flex-row gap-8 md:gap-10 items-start">
        
        <div className="flex-1 w-full">
          <form id="checkout-form" onSubmit={handlePayment} className="space-y-6 md:space-y-8">
            
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
                  <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2 ml-1">Full Name</label>
                  <input required type="text" value={fullName} onChange={(e) => setFullName(e.target.value)} className={lightInputCls} placeholder="James" />
                </div>
                <div>
                  <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2 ml-1">Email Address</label>
                  <input required type="email" value={email} onChange={(e) => setEmail(e.target.value)} className={lightInputCls} placeholder="james@example.com" />
                </div>
                <div>
                  <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2 ml-1">Mobile Number</label>
                  <input required type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} className={lightInputCls} placeholder="+44 7700 900000" />
                </div>
              </div>
            </div>

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
                  <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2 ml-1">Departure Terminal</label>
                  <div className="relative">
                    {/* 🟢 DYNAMIC TERMINAL RENDERER */}
                    <select value={terminal} onChange={(e) => setTerminal(e.target.value)} className={`${lightInputCls} appearance-none cursor-pointer pr-10`}>
                      {airport.toLowerCase().includes("luton") ? (
                        <option value="Main Terminal">Main Terminal</option>
                      ) : company?.terminal_data && Object.keys(company.terminal_data).length > 0 ? (
                        Object.keys(company.terminal_data).map((t) => (
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
                  <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2 ml-1">Return Flight No. (Optional)</label>
                  <input type="text" value={flightNumber} onChange={(e) => setFlightNumber(e.target.value.toUpperCase())} className={`${lightInputCls} uppercase placeholder:normal-case`} placeholder="e.g. BA123" />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-5 md:gap-6">
                <div className="md:col-span-3">
                  <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2 ml-1">Registration Plate</label>
                  <input required type="text" value={registration} onChange={(e) => setRegistration(e.target.value.toUpperCase())} className={yellowInputCls} placeholder="AB12 CDE" />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2 ml-1">Make & Model</label>
                  <input required type="text" value={carMake} onChange={(e) => setCarMake(e.target.value)} className={lightInputCls} placeholder="e.g. Range Rover Sport" />
                </div>
                <div>
                  <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2 ml-1">Color</label>
                  <input type="text" value={carColor} onChange={(e) => setCarColor(e.target.value)} className={lightInputCls} placeholder="e.g. Black" />
                </div>
              </div>
            </div>

            {/* 🟢 AI UPSELL SECTION */}
            {suggestedAncillaries.length > 0 && (
              <div className="bg-gradient-to-br from-indigo-50 to-purple-50 p-6 md:p-10 rounded-[2.5rem] border border-indigo-100 shadow-xl shadow-indigo-100/50 relative overflow-hidden">
                <div className="flex items-center gap-4 mb-8 pb-6 border-b border-indigo-200/50">
                  <div className="w-12 h-12 bg-indigo-600 rounded-2xl flex items-center justify-center shrink-0 shadow-lg shadow-indigo-500/30">
                    <Sparkles className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h2 className="text-xl md:text-2xl font-black text-indigo-900 tracking-tight">Enhance Your Trip</h2>
                    <p className="text-[10px] md:text-xs font-bold text-indigo-500 uppercase tracking-widest mt-1">Recommended for you</p>
                  </div>
                </div>

                <div className="space-y-4">
                  {suggestedAncillaries.includes("lounge") && (
                    <label className={`flex items-center justify-between p-5 rounded-2xl border-2 cursor-pointer transition-all ${wantsLounge ? 'bg-indigo-600 border-indigo-600 text-white shadow-xl shadow-indigo-500/20' : 'bg-white border-transparent hover:border-indigo-200 text-slate-900 shadow-sm'}`}>
                      <div className="flex items-center gap-4">
                        <Coffee className={`w-6 h-6 ${wantsLounge ? 'text-indigo-200' : 'text-indigo-500'}`} />
                        <div>
                          <p className="font-black text-base">VIP Airport Lounge</p>
                          <p className={`text-[11px] font-bold uppercase tracking-widest mt-1 ${wantsLounge ? 'text-indigo-200' : 'text-slate-500'}`}>Relax before your flight</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-5">
                        <span className="font-black text-lg">+£{LOUNGE_PRICE.toFixed(2)}</span>
                        <input type="checkbox" checked={wantsLounge} onChange={() => setWantsLounge(!wantsLounge)} className="w-6 h-6 accent-indigo-400" />
                      </div>
                    </label>
                  )}

                  {suggestedAncillaries.includes("fast-track") && (
                    <label className={`flex items-center justify-between p-5 rounded-2xl border-2 cursor-pointer transition-all ${wantsFastTrack ? 'bg-indigo-600 border-indigo-600 text-white shadow-xl shadow-indigo-500/20' : 'bg-white border-transparent hover:border-indigo-200 text-slate-900 shadow-sm'}`}>
                      <div className="flex items-center gap-4">
                        <Zap className={`w-6 h-6 ${wantsFastTrack ? 'text-indigo-200' : 'text-amber-500'}`} />
                        <div>
                          <p className="font-black text-base">Fast Track Security</p>
                          <p className={`text-[11px] font-bold uppercase tracking-widest mt-1 ${wantsFastTrack ? 'text-indigo-200' : 'text-slate-500'}`}>Skip the queues</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-5">
                        <span className="font-black text-lg">+£{FAST_TRACK_PRICE.toFixed(2)}</span>
                        <input type="checkbox" checked={wantsFastTrack} onChange={() => setWantsFastTrack(!wantsFastTrack)} className="w-6 h-6 accent-indigo-400" />
                      </div>
                    </label>
                  )}
                </div>
              </div>
            )}

            {/* 🟢 SECURE STRIPE REDIRECT SECTION */}
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

            <div className="block lg:hidden mt-6 pb-8">
              <button 
                type="submit" 
                form="checkout-form"
                disabled={isProcessing}
                className="w-full h-16 bg-blue-600 hover:bg-blue-500 disabled:bg-slate-700 text-white font-black text-base rounded-2xl flex items-center justify-center gap-3 shadow-[0_15px_30px_-5px_rgba(37,99,235,0.4)] active:scale-95 transition-all uppercase tracking-widest touch-manipulation"
              >
                {isProcessing ? (
                  <><Loader2 className="w-5 h-5 animate-spin" /> Preparing...</>
                ) : (
                  <><Lock className="w-5 h-5" /> Pay £{finalTotal.toFixed(2)}</>
                )}
              </button>
            </div>

          </form>
        </div>

        <aside className="w-full lg:w-[400px] xl:w-[420px] lg:sticky lg:top-28">
          <div className="bg-[#0B1120] rounded-[2.5rem] border border-slate-800 shadow-[0_30px_60px_-15px_rgba(0,0,0,0.6)] overflow-hidden text-white relative">
            <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-blue-500 via-indigo-500 to-blue-500"></div>
            
            <div className="p-8 md:p-10">
              <div className="flex justify-between items-center mb-8">
                <h3 className="text-2xl font-black tracking-tight">Order Summary</h3>
                <button 
                  onClick={() => setIsEditingSearch(!isEditingSearch)}
                  className="text-[9px] font-black uppercase text-blue-400 bg-blue-500/10 border border-blue-500/20 hover:bg-blue-500 hover:text-white px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 shadow-sm"
                >
                  <Settings2 className="w-3.5 h-3.5"/> {isEditingSearch ? "Close Edit" : "Modify"}
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
                      <p className="text-xs font-bold text-blue-100 leading-relaxed italic">
                        "{aiData.aeroTip}"
                      </p>
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
                    <Sparkles className="w-3.5 h-3.5"/> Pet Friendly Choice
                  </div>
                )}
                {aiData.ulezRisk && airport.includes("Heathrow") && (
                  <div className="bg-red-500/10 text-red-400 border border-red-500/20 px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest flex items-center gap-1.5">
                    <AlertCircle className="w-3.5 h-3.5"/> ULEZ Zone Alert
                  </div>
                )}
                {aiData.hasOversizedLuggage && (
                  <div className="bg-orange-500/10 text-orange-400 border border-orange-500/20 px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest flex items-center gap-1.5">
                    <Footprints className="w-3.5 h-3.5"/> Large Luggage Pick
                  </div>
                )}
                {aiData.isCorporate && (
                  <div className="bg-slate-800 text-slate-300 border border-slate-700 px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest flex items-center gap-1.5">
                    <ShieldCheck className="w-3.5 h-3.5"/> Business / VAT Ready
                  </div>
                )}
                {aiData.isLastMinute && (
                  <div className="bg-rose-500/10 text-rose-400 border border-rose-500/20 px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest flex items-center gap-1.5 animate-pulse">
                    <Zap className="w-3.5 h-3.5"/> High Demand Spot
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

              {isEditingSearch ? (
                <div className="space-y-4 mb-8 bg-[#131A2B] p-6 rounded-2xl border border-slate-800 animate-in fade-in zoom-in-95">
                  <div>
                    <label className="text-[10px] font-black uppercase text-slate-400 mb-2 block ml-1 tracking-widest">Drop-off</label>
                    <div className="grid grid-cols-2 gap-3">
                      <input type="date" value={dropDate} onChange={(e)=>setDropDate(e.target.value)} className={`${darkInputCls} [color-scheme:dark]`} />
                      <input type="time" value={dropTime} onChange={(e)=>setDropTime(e.target.value)} className={`${darkInputCls} [color-scheme:dark]`} />
                    </div>
                  </div>
                  <div>
                    <label className="text-[10px] font-black uppercase text-slate-400 mb-2 block ml-1 tracking-widest">Return</label>
                    <div className="grid grid-cols-2 gap-3">
                      <input type="date" value={pickDate} onChange={(e)=>setPickDate(e.target.value)} className={`${darkInputCls} [color-scheme:dark]`} />
                      <input type="time" value={pickTime} onChange={(e)=>setPickTime(e.target.value)} className={`${darkInputCls} [color-scheme:dark]`} />
                    </div>
                  </div>
                  <button 
                    onClick={handleUpdateSearch} 
                    className="w-full mt-2 py-3 bg-blue-600 text-[10px] font-black uppercase tracking-widest rounded-xl hover:bg-blue-500 transition-colors shadow-md shadow-blue-500/20"
                  >
                    Save & Recalculate
                  </button>
                </div>
              ) : (
                <div className="space-y-5 mb-8 pb-8 border-b border-slate-800">
                  <div className="flex justify-between items-center">
                    <div className="flex items-center gap-3 text-slate-400">
                      <Calendar className="w-4 h-4 text-blue-500" /> <span className="text-[10px] font-black uppercase tracking-widest">Drop-off</span>
                    </div>
                    <div className="text-right">
                      <span className="block text-sm font-bold text-white">{formatDate(dropDate)}</span>
                      <span className="block text-[10px] text-slate-500 font-bold uppercase tracking-widest mt-0.5">{dropTime || "Time TBD"}</span>
                    </div>
                  </div>
                  <div className="flex justify-between items-center">
                    <div className="flex items-center gap-3 text-slate-400">
                      <Calendar className="w-4 h-4 text-blue-500" /> <span className="text-[10px] font-black uppercase tracking-widest">Pick-up</span>
                    </div>
                    <div className="text-right">
                      <span className="block text-sm font-bold text-white">{formatDate(pickDate)}</span>
                      <span className="block text-[10px] text-slate-500 font-bold uppercase tracking-widest mt-0.5">{pickTime || "Time TBD"}</span>
                    </div>
                  </div>
                </div>
              )}

              {!aiData.isFrequentFlyer && (
                <div className="bg-[#131A2B] border border-slate-800 rounded-2xl p-5 mb-8">
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-3 flex items-center gap-2">
                    <Tag className="w-4 h-4" /> Have a Promo Code?
                  </label>
                  
                  <form onSubmit={handleApplyPromo} className="flex gap-3">
                    <input 
                      type="text" 
                      value={promoInput}
                      onChange={(e) => setPromoInput(e.target.value)}
                      placeholder="Enter code" 
                      disabled={discount.active || isVerifyingPromo}
                      className={`${darkInputCls} flex-1 uppercase`}
                    />
                    {!discount.active ? (
                      <button 
                        type="submit" 
                        disabled={isVerifyingPromo}
                        className="bg-slate-800 hover:bg-blue-600 disabled:bg-slate-700 text-white px-5 shrink-0 rounded-xl font-black text-[10px] uppercase tracking-widest transition-colors active:scale-95 shadow-sm flex items-center justify-center min-w-[80px]"
                      >
                        {isVerifyingPromo ? <Loader2 className="w-4 h-4 animate-spin" /> : "Apply"}
                      </button>
                    ) : (
                      <button type="button" onClick={() => { setDiscount({ active: false, code: "", percent: 0 }); setPromoInput(""); setPromoMessage(""); }} className="bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 px-5 shrink-0 rounded-xl font-black text-[10px] uppercase tracking-widest transition-colors active:scale-95 shadow-sm min-w-[80px]">
                        Remove
                      </button>
                    )}
                  </form>

                  {promoMessage && (
                    <div className={`mt-4 text-[10px] font-bold uppercase tracking-widest flex items-center gap-2 ${isPromoError ? 'text-red-400' : 'text-emerald-400'}`}>
                      {isPromoError ? <AlertCircle className="w-4 h-4 shrink-0" /> : <CheckCircle2 className="w-4 h-4 shrink-0" />}
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

              <div className="space-y-4 mb-10">
                <div className="flex justify-between text-sm text-slate-400 font-bold">
                  <span>Parking Rate ({bookingDays} {bookingDays === 1 ? "day" : "days"})</span>
                  <span className={`font-black ${discount.active ? 'text-slate-500 line-through' : 'text-white'}`}>£{baseTotal.toFixed(2)}</span>
                </div>
                
                {discount.active && (
                  <div className="flex justify-between text-sm text-emerald-400 font-bold">
                    <span>Discount ({discount.code})</span>
                    <span className="font-black">- £{discountAmount.toFixed(2)}</span>
                  </div>
                )}

                {wantsLounge && (
                  <div className="flex justify-between text-sm text-indigo-400 font-bold">
                    <span>VIP Lounge Access</span>
                    <span className="font-black">+ £{LOUNGE_PRICE.toFixed(2)}</span>
                  </div>
                )}

                {wantsFastTrack && (
                  <div className="flex justify-between text-sm text-amber-400 font-bold">
                    <span>Fast Track Security</span>
                    <span className="font-black">+ £{FAST_TRACK_PRICE.toFixed(2)}</span>
                  </div>
                )}

                <div className="flex justify-between text-sm text-slate-400 font-bold pt-4 border-t border-slate-800">
                  <span>Taxes & Airport Fees</span>
                  <span className="text-emerald-500 font-black uppercase tracking-widest text-[10px]">Included</span>
                </div>
              </div>

              <div className="flex flex-col items-end mb-8">
                <span className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-2">Total Due Today</span>
                <span className="text-5xl font-black tracking-tighter text-blue-400 drop-shadow-lg">£{finalTotal.toFixed(2)}</span>
              </div>

              <button 
                type="submit" 
                form="checkout-form"
                disabled={isProcessing}
                className="hidden lg:flex w-full h-16 bg-blue-600 hover:bg-blue-500 disabled:bg-slate-800 disabled:border disabled:border-slate-700 disabled:text-slate-500 text-white font-black text-lg rounded-2xl items-center justify-center gap-3 shadow-[0_15px_30px_-5px_rgba(37,99,235,0.4)] active:scale-95 transition-all uppercase tracking-widest touch-manipulation"
              >
                {isProcessing ? (
                  <><Loader2 className="w-6 h-6 animate-spin" /> Processing...</>
                ) : (
                  <><Lock className="w-5 h-5" /> Proceed to Payment</>
                )}
              </button>
            </div>
          </div>

          <div className="mt-6 flex flex-col gap-4">
              <div className="bg-white rounded-3xl p-6 border border-slate-800 shadow-lg flex items-start gap-4">
                <div className="w-10 h-10 bg-emerald-500/10 text-emerald-400 rounded-xl flex items-center justify-center flex-shrink-0">
                  <ShieldCheck className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-sm font-black text-white tracking-tight mb-1.5">Aero Booking Guarantee</p>
                  <p className="text-xs font-bold text-slate-400 leading-relaxed">Free cancellation up to <span className="text-blue-400">24 hours</span> before your drop-off. Encrypted by Stripe.</p>
                </div>
              </div>
          </div>
        </aside>

      </div>
    </div>
  );
}

export default function CheckoutPage() {
  return (
    <main suppressHydrationWarning className="min-h-[100dvh] bg-[#F8FAFC] font-sans antialiased pb-24 selection:bg-blue-200 selection:text-blue-900 overflow-x-hidden relative">
      <div className="fixed top-0 left-0 w-full h-full pointer-events-none z-0 flex justify-center overflow-hidden">
         <div className="w-full max-w-[1000px] h-96 bg-blue-600/5 blur-[120px] rounded-full absolute -top-48"></div>
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

      <Suspense fallback={<div className="p-32 md:p-48 text-center font-black uppercase tracking-[0.3em] text-sm text-slate-400 animate-pulse">Aero is Initializing Checkout...</div>}>
        <CheckoutContent />
      </Suspense>
    </main>
  );
}