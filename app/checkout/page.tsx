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

function CheckoutContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [isProcessing, setIsProcessing] = useState(false);
  const [isEditingSearch, setIsEditingSearch] = useState(false);
  
  // --- CAPTURE URL DATA ---
  const airport = searchParams.get("airport") || "Luton (LTN)";
  const type = searchParams.get("type") || "Premium Meet & Greet"; 
  const urlFlightNumber = searchParams.get("flightNumber") || "";
  const companyId = searchParams.get("companyId") || ""; 
  
  // The final calculated price is safely passed from the Results page.
  const baseRateFromUrl = Number(searchParams.get("price")) || 0;
  
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

  // 🟢 AUTO-APPLY LOYALTY DISCOUNT ON LOAD
  useEffect(() => {
    if (aiData.isFrequentFlyer && !discount.active) {
      setDiscount({ active: true, code: "AERO VIP", percent: 0.15 });
      setPromoMessage(aiData.loyaltyMessage || "Loyalty recognized! 15% discount auto-applied.");
      setIsPromoError(false);
    }
  }, [aiData.isFrequentFlyer, aiData.loyaltyMessage, discount.active]);

  const handleApplyPromo = (e: React.FormEvent) => {
    e.preventDefault();
    const code = promoInput.toUpperCase().trim();

    if (code === "LAUNCH10") {
      setDiscount({ active: true, code: "LAUNCH10", percent: 0.10 });
      setPromoMessage("Launch discount applied! 10% off.");
      setIsPromoError(false);
    } else if (code === "AERO") {
      setDiscount({ active: true, code: "AERO", percent: 0.15 });
      setPromoMessage("Aero VIP discount applied! 15% off.");
      setIsPromoError(false);
    } else if (code === "SECRET3" || code === "AERO3") {
      setDiscount({ active: true, code: "AERO3", percent: 0.03 });
      setPromoMessage("Secret Aero Discount Unlocked! 3% off.");
      setIsPromoError(false);
    } else {
      setDiscount({ active: false, code: "", percent: 0 });
      setPromoMessage("Invalid or expired promo code.");
      setIsPromoError(true);
    }
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

  // 🟢 FIXED: Date calculations use Math.abs to prevent negative numbers
  const calculateDays = () => {
    if (!dropDate || !pickDate) return 1;
    const start = new Date(dropDate);
    const end = new Date(pickDate);
    const diffTime = Math.abs(end.getTime() - start.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
    return diffDays <= 0 ? 1 : diffDays;
  };

  const bookingDays = calculateDays();
  const baseTotal = baseRateFromUrl; // Uses the dynamic price from the Results page
  const discountAmount = baseTotal * discount.percent;
  const addOnsTotal = (wantsLounge ? LOUNGE_PRICE : 0) + (wantsFastTrack ? FAST_TRACK_PRICE : 0);
  const finalTotal = (baseTotal - discountAmount) + addOnsTotal;

  const formatDate = (dateString: string | null) => {
    if (!dateString) return "--";
    return new Date(dateString).toLocaleDateString("en-GB", { weekday: 'short', day: 'numeric', month: 'short' });
  };

  // 🟢 FIXED: If they change dates on the checkout page, redirect back to Results to recalculate DB pricing
  const handleUpdateSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setIsEditingSearch(false);
    const query = new URLSearchParams(searchParams.toString());
    query.set("dropoffDate", dropDate);
    query.set("dropoffTime", dropTime);
    query.set("pickupDate", pickDate);
    query.set("pickupTime", pickTime);
    query.delete("price"); // Clear old price so Results page recalculates it
    router.push(`/results?${query.toString()}`);
  };

  // 🟢 STRIPE PAYMENT REDIRECT
  const handlePayment = async (e: React.FormEvent) => {
    e.preventDefault(); 
    if (!fullName || !email || !phone || !registration || !carMake || !dropDate || !pickDate) {
      alert("Please complete all required fields and ensure dates are selected.");
      return;
    }
    
    setIsProcessing(true);

    // Determines service type for the database to prevent null constraints
    let finalServiceType = "Meet & Greet";
    if (type.toLowerCase().includes("park")) finalServiceType = "Park & Ride";
    if (type.toLowerCase().includes("hotel")) finalServiceType = "Hotel & Parking";

    try {
      const response = await fetch('/api/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          price: finalTotal,
          airport: airport,
          provider: type,
          metadata: {
            // Keys expected by the Webhook for Prisma DB
            full_name: fullName,
            license_plate: registration.toUpperCase(),
            car_make: carMake,
            car_color: carColor,
            airport: airport,
            terminal: terminal,
            dropoff_date: dropDate,
            pickup_date: pickDate,
            company_id: companyId,
            service_type: finalServiceType,
            
            // Keys expected by the Success Page Fallback
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
            type
          }
        }),
      });

      const data = await response.json();

      if (data.error) throw new Error(data.error);

      if (data.url) {
        window.location.href = data.url;
      }

    } catch (error: any) {
      console.error("Payment failed:", error);
      alert(`Payment Error: ${error.message}`);
      setIsProcessing(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 md:py-12 relative z-10">
      
      {/* 🟢 AERO SECURE BANNER */}
      <div className="max-w-3xl mx-auto mb-8 bg-[#0B1121] border border-blue-900/40 rounded-2xl p-4 md:p-5 flex items-center gap-5 shadow-xl relative overflow-hidden">
        <div className="absolute -right-10 -top-10 w-32 h-32 bg-blue-600/20 rounded-full blur-3xl pointer-events-none"></div>
        <AeroAvatar state="idle" size="md" onClick={handleAeroClick} />
        <div className="relative z-10">
          <p className="text-[9px] font-black uppercase tracking-[0.2em] text-blue-400 mb-1 flex items-center gap-1.5"><CheckCircle2 className="w-3.5 h-3.5"/> Aero Secure Checkout</p>
          <p className="text-xs sm:text-sm text-slate-300 font-medium">
            {aiData.isFrequentFlyer ? "Welcome back! I've automatically applied your loyalty discount." : "Aero has locked your rate. Complete your details below."}
          </p>
        </div>
      </div>

      <div className="flex items-center justify-between mb-8 md:mb-10 max-w-3xl mx-auto px-2">
        <div className="flex flex-col items-center gap-2 flex-1 opacity-40">
          <div className="h-1 w-full bg-blue-600 rounded-full"></div>
          <span className="text-[9px] md:text-[10px] font-black uppercase text-blue-600 tracking-[0.2em] hidden xs:block">Select</span>
        </div>
        <div className="w-4 md:w-8 flex justify-center text-slate-300">—</div>
        <div className="flex flex-col items-center gap-2 flex-1">
          <div className="h-1.5 w-full bg-blue-600 rounded-full shadow-[0_0_12px_rgba(37,99,235,0.6)]"></div>
          <span className="text-[9px] md:text-[10px] font-black uppercase text-blue-600 tracking-[0.2em] hidden xs:block">Details & Pay</span>
        </div>
        <div className="w-4 md:w-8 flex justify-center text-slate-300">—</div>
        <div className="flex flex-col items-center gap-2 flex-1 opacity-30">
          <div className="h-1 w-full bg-slate-300 rounded-full"></div>
          <span className="text-[9px] md:text-[10px] font-black uppercase text-slate-500 tracking-[0.2em] hidden xs:block">Confirm</span>
        </div>
      </div>

      <div className="flex flex-col-reverse lg:flex-row gap-8 md:gap-10 items-start">
        
        <div className="flex-1 w-full">
          <form id="checkout-form" onSubmit={handlePayment} className="space-y-6 md:space-y-8">
            
            <div className="bg-white p-6 md:p-8 rounded-[2rem] border border-slate-200 shadow-sm relative overflow-hidden">
              <div className="flex items-center gap-3 mb-6 md:mb-8 pb-5 md:pb-6 border-b border-slate-100">
                <div className="w-10 h-10 md:w-12 md:h-12 bg-blue-50 rounded-xl flex items-center justify-center shrink-0">
                  <User className="w-5 h-5 md:w-6 md:h-6 text-blue-600" />
                </div>
                <div>
                  <h2 className="text-lg md:text-xl font-black text-slate-900 tracking-tight">1. Contact Information</h2>
                  <p className="text-[10px] md:text-xs font-bold text-slate-400 uppercase tracking-widest mt-1">Lead Passenger Details</p>
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-5">
                <div className="md:col-span-2">
                  <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2 ml-1">Full Name</label>
                  <input required type="text" value={fullName} onChange={(e) => setFullName(e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3.5 text-base font-bold text-slate-900 placeholder:text-slate-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none transition-all touch-manipulation shadow-[0_0_0_1000px_#f8fafc_inset] [-webkit-text-fill-color:#0f172a]" placeholder="James Bond" />
                </div>
                <div>
                  <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2 ml-1">Email Address</label>
                  <input required type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3.5 text-base font-bold text-slate-900 placeholder:text-slate-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none transition-all touch-manipulation shadow-[0_0_0_1000px_#f8fafc_inset] [-webkit-text-fill-color:#0f172a]" placeholder="james@example.com" />
                </div>
                <div>
                  <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2 ml-1">Mobile Number</label>
                  <input required type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3.5 text-base font-bold text-slate-900 placeholder:text-slate-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none transition-all touch-manipulation shadow-[0_0_0_1000px_#f8fafc_inset] [-webkit-text-fill-color:#0f172a]" placeholder="+44 7700 900000" />
                </div>
              </div>
            </div>

            <div className="bg-white p-6 md:p-8 rounded-[2rem] border border-slate-200 shadow-sm relative overflow-hidden">
              <div className="flex items-center gap-3 mb-6 md:mb-8 pb-5 md:pb-6 border-b border-slate-100">
                <div className="w-10 h-10 md:w-12 md:h-12 bg-blue-50 rounded-xl flex items-center justify-center shrink-0">
                  <CarFront className="w-5 h-5 md:w-6 md:h-6 text-blue-600" />
                </div>
                <div>
                  <h2 className="text-lg md:text-xl font-black text-slate-900 tracking-tight">2. Vehicle & Flight Details</h2>
                  <p className="text-[10px] md:text-xs font-bold text-slate-400 uppercase tracking-widest mt-1">So we know who to look for</p>
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-5 mb-4 md:mb-5">
                <div>
                  <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2 ml-1">Departure Terminal</label>
                  <div className="relative">
                    <select value={terminal} onChange={(e) => setTerminal(e.target.value)} className="w-full bg-blue-50 border border-blue-100 rounded-xl px-4 py-3.5 text-base font-black text-blue-900 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none transition-all appearance-none cursor-pointer touch-manipulation">
                      {airport.includes("Heathrow") ? (
                        <>
                          <option>Terminal 2</option>
                          <option>Terminal 3</option>
                          <option>Terminal 4</option>
                          <option>Terminal 5</option>
                        </>
                      ) : (
                        <option>Main Terminal</option>
                      )}
                    </select>
                  </div>
                </div>
                <div>
                  <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2 ml-1">Return Flight No. (Optional)</label>
                  <input type="text" value={flightNumber} onChange={(e) => setFlightNumber(e.target.value.toUpperCase())} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3.5 text-base font-bold text-slate-900 placeholder:text-slate-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none transition-all uppercase placeholder:normal-case touch-manipulation shadow-[0_0_0_1000px_#f8fafc_inset] [-webkit-text-fill-color:#0f172a]" placeholder="e.g. BA123" />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-5">
                <div className="md:col-span-3">
                  <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2 ml-1">Registration Plate</label>
                  <input required type="text" value={registration} onChange={(e) => setRegistration(e.target.value.toUpperCase())} className="w-full bg-[#fde047] border-2 border-yellow-400 rounded-xl px-4 py-4 font-black text-slate-900 text-lg md:text-2xl text-center uppercase tracking-[0.2em] focus:border-blue-500 focus:ring-4 focus:ring-blue-500/20 outline-none transition-all placeholder:text-yellow-600/50 shadow-[0_0_0_1000px_#fde047_inset] [-webkit-text-fill-color:#0f172a] touch-manipulation" placeholder="AB12 CDE" />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2 ml-1">Make & Model</label>
                  <input required type="text" value={carMake} onChange={(e) => setCarMake(e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3.5 text-base font-bold text-slate-900 placeholder:text-slate-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none transition-all touch-manipulation shadow-[0_0_0_1000px_#f8fafc_inset] [-webkit-text-fill-color:#0f172a]" placeholder="e.g. Range Rover Sport" />
                </div>
                <div>
                  <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2 ml-1">Color</label>
                  <input type="text" value={carColor} onChange={(e) => setCarColor(e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3.5 text-base font-bold text-slate-900 placeholder:text-slate-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none transition-all touch-manipulation shadow-[0_0_0_1000px_#f8fafc_inset] [-webkit-text-fill-color:#0f172a]" placeholder="e.g. Black" />
                </div>
              </div>
            </div>

            {/* 🟢 AI UPSELL SECTION */}
            {suggestedAncillaries.length > 0 && (
              <div className="bg-gradient-to-br from-indigo-50 to-purple-50 p-6 md:p-8 rounded-[2rem] border border-indigo-100 shadow-sm relative overflow-hidden">
                <div className="flex items-center gap-3 mb-6 pb-5 border-b border-indigo-200/50">
                  <div className="w-10 h-10 md:w-12 md:h-12 bg-indigo-600 rounded-xl flex items-center justify-center shrink-0 shadow-lg">
                    <Sparkles className="w-5 h-5 md:w-6 md:h-6 text-white" />
                  </div>
                  <div>
                    <h2 className="text-lg md:text-xl font-black text-indigo-900 tracking-tight">Enhance Your Trip</h2>
                    <p className="text-[10px] md:text-xs font-bold text-indigo-500 uppercase tracking-widest mt-1">Recommended for you</p>
                  </div>
                </div>

                <div className="space-y-3">
                  {suggestedAncillaries.includes("lounge") && (
                    <label className={`flex items-center justify-between p-4 rounded-xl border-2 cursor-pointer transition-all ${wantsLounge ? 'bg-indigo-600 border-indigo-600 text-white shadow-md' : 'bg-white border-transparent hover:border-indigo-200 text-slate-900'}`}>
                      <div className="flex items-center gap-3">
                        <Coffee className={`w-5 h-5 ${wantsLounge ? 'text-indigo-200' : 'text-indigo-500'}`} />
                        <div>
                          <p className="font-bold text-sm">VIP Airport Lounge</p>
                          <p className={`text-[10px] ${wantsLounge ? 'text-indigo-200' : 'text-slate-500'}`}>Relax before your flight</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <span className="font-black">+£{LOUNGE_PRICE.toFixed(2)}</span>
                        <input type="checkbox" checked={wantsLounge} onChange={() => setWantsLounge(!wantsLounge)} className="w-5 h-5 accent-indigo-400" />
                      </div>
                    </label>
                  )}

                  {suggestedAncillaries.includes("fast-track") && (
                    <label className={`flex items-center justify-between p-4 rounded-xl border-2 cursor-pointer transition-all ${wantsFastTrack ? 'bg-indigo-600 border-indigo-600 text-white shadow-md' : 'bg-white border-transparent hover:border-indigo-200 text-slate-900'}`}>
                      <div className="flex items-center gap-3">
                        <Zap className={`w-5 h-5 ${wantsFastTrack ? 'text-indigo-200' : 'text-amber-500'}`} />
                        <div>
                          <p className="font-bold text-sm">Fast Track Security</p>
                          <p className={`text-[10px] ${wantsFastTrack ? 'text-indigo-200' : 'text-slate-500'}`}>Skip the queues</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <span className="font-black">+£{FAST_TRACK_PRICE.toFixed(2)}</span>
                        <input type="checkbox" checked={wantsFastTrack} onChange={() => setWantsFastTrack(!wantsFastTrack)} className="w-5 h-5 accent-indigo-400" />
                      </div>
                    </label>
                  )}
                </div>
              </div>
            )}

            {/* 🟢 SECURE STRIPE REDIRECT SECTION */}
            <div className="bg-white p-6 md:p-8 rounded-[2rem] border border-slate-200 shadow-sm relative overflow-hidden">
              <div className="flex items-center justify-between mb-6 md:mb-8 pb-5 md:pb-6 border-b border-slate-100">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 md:w-12 md:h-12 bg-blue-50 rounded-xl flex items-center justify-center shrink-0">
                    <ShieldCheck className="w-5 h-5 md:w-6 md:h-6 text-blue-600" />
                  </div>
                  <div>
                    <h2 className="text-lg md:text-xl font-black text-slate-900 tracking-tight">3. Secure Payment</h2>
                    <p className="text-[10px] md:text-xs font-bold text-slate-400 uppercase tracking-widest mt-1">PCI Compliant Redirect</p>
                  </div>
                </div>
                <div className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 text-emerald-600 rounded-lg text-[9px] md:text-[10px] font-black uppercase tracking-widest border border-emerald-100">
                  <Lock className="w-3 h-3" /> Secure
                </div>
              </div>
              
              <div className="bg-blue-50 p-6 rounded-2xl border border-blue-100 flex items-center gap-4">
                <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center shadow-sm shrink-0">
                  <CreditCard className="w-6 h-6 text-blue-600" />
                </div>
                <p className="text-sm font-bold text-blue-900 leading-snug">
                  You will be redirected to <span className="text-blue-600">Stripe</span> to complete your payment securely. We never store your card details.
                </p>
              </div>
            </div>

            <div className="block lg:hidden mt-6 pb-6">
              <button 
                type="submit" 
                form="checkout-form"
                disabled={isProcessing}
                className="w-full h-16 bg-blue-600 hover:bg-blue-500 disabled:bg-blue-600/50 text-white font-black text-base rounded-2xl flex items-center justify-center gap-2 shadow-[0_10px_30px_rgba(37,99,235,0.4)] active:scale-95 transition-all uppercase tracking-widest touch-manipulation"
              >
                {isProcessing ? (
                  <><Loader2 className="w-5 h-5 animate-spin" /> Preparing...</>
                ) : (
                  <><Lock className="w-4 h-4" /> Pay £{finalTotal.toFixed(2)}</>
                )}
              </button>
            </div>

          </form>
        </div>

        <aside className="w-full lg:w-[400px] xl:w-[420px] lg:sticky lg:top-28">
          <div className="bg-[#0B1121] rounded-[2rem] md:rounded-[2.5rem] border border-blue-500/30 shadow-2xl overflow-hidden text-white relative">
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-400 to-blue-600"></div>
            
            <div className="p-6 md:p-8 lg:p-10">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-xl md:text-2xl font-black tracking-tight">Order Summary</h3>
                <button 
                  onClick={() => setIsEditingSearch(!isEditingSearch)}
                  className="text-[9px] font-black uppercase text-blue-400 border border-blue-400/30 px-2 py-1 rounded hover:bg-blue-400 hover:text-white transition-all flex items-center gap-1"
                >
                  <Settings2 className="w-3 h-3"/> {isEditingSearch ? "Close Edit" : "Modify Search"}
                </button>
              </div>

              {/* 🟢 DYNAMIC AI CONCIERGE TIP */}
            {aiData.aeroTip && (
              <div className="mb-6 bg-blue-500/10 border border-blue-500/30 rounded-2xl p-4 relative overflow-hidden group">
                <div className="absolute -right-4 -top-4 opacity-10 group-hover:scale-110 transition-transform">
                  <Sparkles className="w-12 h-12 text-blue-400" />
                </div>
                <div className="flex gap-3 items-start relative z-10">
                  <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center shrink-0 shadow-lg shadow-blue-900/20">
                    <Sparkles className="w-4 h-4 text-white" />
                  </div>
                  <div>
                    <p className="text-[9px] font-black uppercase tracking-widest text-blue-400 mb-1">Aero Intelligence</p>
                    <p className="text-[11px] font-bold text-blue-100 leading-relaxed italic">
                      "{aiData.aeroTip}"
                    </p>
                  </div>
                </div>
              </div>
            )}

              {/* 🟢 DYNAMIC AI BADGES IN SUMMARY */}
              <div className="flex flex-wrap gap-2 mb-6">
                <div className="bg-blue-500/10 text-blue-400 border border-blue-500/30 text-[8px] md:text-[9px] font-black uppercase tracking-widest px-3 py-1.5 rounded-full flex items-center gap-1.5 shadow-[0_0_15px_rgba(37,99,235,0.2)]">
                  <Sparkles className="w-3 h-3 fill-current" /> Aero Verified
                </div>
                {aiData.hasPet && (
                  <div className="bg-purple-500/20 text-purple-400 border border-purple-500/30 px-2 py-1.5 rounded text-[8px] font-black uppercase tracking-widest flex items-center gap-1.5">
                    <Sparkles className="w-2.5 h-2.5"/> Pet Friendly Choice
                  </div>
                )}
                {aiData.ulezRisk && airport.includes("Heathrow") && (
                  <div className="bg-red-500/20 text-red-400 border border-red-500/30 px-2 py-1.5 rounded text-[8px] font-black uppercase tracking-widest flex items-center gap-1.5">
                    <AlertCircle className="w-2.5 h-2.5"/> ULEZ Zone Alert
                  </div>
                )}
                {aiData.hasOversizedLuggage && (
                  <div className="bg-orange-500/20 text-orange-400 border border-orange-500/30 px-2 py-1.5 rounded text-[8px] font-black uppercase tracking-widest flex items-center gap-1.5">
                    <Footprints className="w-2.5 h-2.5"/> Large Luggage Pick
                  </div>
                )}
                {aiData.isCorporate && (
                  <div className="bg-slate-500/20 text-slate-300 border border-slate-500/30 px-2 py-1.5 rounded text-[8px] font-black uppercase tracking-widest flex items-center gap-1.5">
                    <ShieldCheck className="w-2.5 h-2.5"/> Business / VAT Ready
                  </div>
                )}
                {aiData.isLastMinute && (
                  <div className="bg-rose-500/20 text-rose-400 border border-rose-500/30 px-2 py-1.5 rounded text-[8px] font-black uppercase tracking-widest flex items-center gap-1.5 animate-pulse">
                    <Zap className="w-2.5 h-2.5"/> High Demand Spot
                  </div>
                )}
              </div>
              
              <div className="flex items-start gap-4 mb-6 md:mb-8 pb-6 md:pb-8 border-b border-white/10">
                <div className="w-12 h-12 md:w-14 md:h-14 bg-blue-600 rounded-2xl flex items-center justify-center flex-shrink-0 shadow-lg">
                  <PlaneTakeoff className="w-6 h-6 md:w-7 md:h-7 text-white" />
                </div>
                <div>
                  <p className="text-[9px] md:text-[10px] font-black uppercase tracking-widest text-blue-400 mb-1">{airport}</p>
                  <p className="font-black text-base md:text-lg leading-tight tracking-tight">{type}</p>
                </div>
              </div>

              {/* 🟢 EDITABLE SEARCH PANEL */}
              {isEditingSearch ? (
                <form onSubmit={handleUpdateSearch} className="space-y-4 mb-6 bg-white/5 p-4 rounded-2xl border border-white/10 animate-in fade-in zoom-in-95">
                  <div>
                    <label className="text-[9px] font-black uppercase text-slate-400 mb-2 block">Drop-off</label>
                    <div className="grid grid-cols-2 gap-2">
                      <input type="date" value={dropDate} onChange={(e)=>setDropDate(e.target.value)} className="bg-slate-800 text-white text-[10px] p-2 rounded-lg outline-none border border-white/10" required />
                      <input type="time" value={dropTime} onChange={(e)=>setDropTime(e.target.value)} className="bg-slate-800 text-white text-[10px] p-2 rounded-lg outline-none border border-white/10" required />
                    </div>
                  </div>
                  <div>
                    <label className="text-[9px] font-black uppercase text-slate-400 mb-2 block">Return</label>
                    <div className="grid grid-cols-2 gap-2">
                      <input type="date" min={dropDate} value={pickDate} onChange={(e)=>setPickDate(e.target.value)} className="bg-slate-800 text-white text-[10px] p-2 rounded-lg outline-none border border-white/10" required />
                      <input type="time" value={pickTime} onChange={(e)=>setPickTime(e.target.value)} className="bg-slate-800 text-white text-[10px] p-2 rounded-lg outline-none border border-white/10" required />
                    </div>
                  </div>
                  <button 
                    type="submit"
                    className="w-full py-2 bg-blue-600 text-[9px] font-black uppercase rounded-lg hover:bg-blue-500 transition-colors"
                  >
                    Update Search & Recalculate
                  </button>
                </form>
              ) : (
                <div className="space-y-4 md:space-y-5 mb-6 md:mb-8 pb-6 md:pb-8 border-b border-white/10">
                  <div className="flex justify-between items-center">
                    <div className="flex items-center gap-2 md:gap-3 text-slate-400">
                      <Calendar className="w-3.5 h-3.5 md:w-4 md:h-4 text-blue-500" /> <span className="text-[10px] md:text-[11px] font-black uppercase tracking-widest">Drop-off</span>
                    </div>
                    <div className="text-right">
                      <span className="block text-xs md:text-sm font-bold text-white">{formatDate(dropDate)}</span>
                      <span className="block text-[9px] md:text-[10px] text-slate-500 font-bold uppercase tracking-widest mt-0.5">{dropTime || "Time TBD"}</span>
                    </div>
                  </div>
                  <div className="flex justify-between items-center">
                    <div className="flex items-center gap-2 md:gap-3 text-slate-400">
                      <Calendar className="w-3.5 h-3.5 md:w-4 md:h-4 text-blue-500" /> <span className="text-[10px] md:text-[11px] font-black uppercase tracking-widest">Pick-up</span>
                    </div>
                    <div className="text-right">
                      <span className="block text-xs md:text-sm font-bold text-white">{formatDate(pickDate)}</span>
                      <span className="block text-[9px] md:text-[10px] text-slate-500 font-bold uppercase tracking-widest mt-0.5">{pickTime || "Time TBD"}</span>
                    </div>
                  </div>
                </div>
              )}

              {/* Promo Code Section */}
              {!aiData.isFrequentFlyer && (
                <div className="bg-white/5 border border-white/10 rounded-2xl p-4 md:p-5 mb-6 md:mb-8">
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-3 flex items-center gap-2">
                    <Tag className="w-3.5 h-3.5" /> Have a Promo Code?
                  </label>
                  
                  <form onSubmit={handleApplyPromo} className="flex gap-2">
                    <input 
                      type="text" 
                      value={promoInput}
                      onChange={(e) => setPromoInput(e.target.value)}
                      placeholder="Enter code" 
                      disabled={discount.active}
                      className="flex-1 w-full min-w-0 bg-white/5 border border-white/10 rounded-xl px-3 py-3 font-bold text-white text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 disabled:bg-white/5 disabled:text-slate-500 uppercase placeholder:text-slate-600 touch-manipulation"
                    />
                    {!discount.active ? (
                      <button type="submit" className="bg-blue-600 hover:bg-blue-500 text-white px-4 shrink-0 rounded-xl font-black text-xs uppercase tracking-widest transition-colors active:scale-95 touch-manipulation">
                        Apply
                      </button>
                    ) : (
                      <button type="button" onClick={() => { setDiscount({ active: false, code: "", percent: 0 }); setPromoInput(""); setPromoMessage(""); }} className="bg-red-500/20 hover:bg-red-500/30 text-red-400 border border-red-500/20 px-4 shrink-0 rounded-xl font-black text-xs uppercase tracking-widest transition-colors active:scale-95 touch-manipulation">
                        Remove
                      </button>
                    )}
                  </form>

                  {promoMessage && (
                    <div className={`mt-3 text-[10px] font-bold uppercase tracking-widest flex items-center gap-1.5 ${isPromoError ? 'text-red-400' : 'text-emerald-400'}`}>
                      {isPromoError ? <AlertCircle className="w-3.5 h-3.5" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
                      {promoMessage}
                    </div>
                  )}
                </div>
              )}

              {aiData.isFrequentFlyer && (
                <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-2xl p-4 md:p-5 mb-6 md:mb-8 text-center">
                  <Star className="w-6 h-6 text-emerald-400 mx-auto mb-2" />
                  <p className="text-emerald-400 font-bold text-xs uppercase tracking-widest">VIP Loyalty Active</p>
                  <p className="text-emerald-300/80 text-[10px] mt-1">{promoMessage}</p>
                </div>
              )}

              {/* 🟢 TOTALS INC. ADD-ONS */}
              <div className="space-y-3 md:space-y-4 mb-8 md:mb-10">
                <div className="flex justify-between text-xs md:text-sm text-slate-400 font-medium">
                  <span>Parking Rate ({bookingDays} {bookingDays === 1 ? "day" : "days"})</span>
                  <span className={`font-bold ${discount.active ? 'text-slate-500 line-through' : 'text-white'}`}>£{baseTotal.toFixed(2)}</span>
                </div>
                
                {discount.active && (
                  <div className="flex justify-between text-xs md:text-sm text-emerald-400 font-medium">
                    <span>Discount ({discount.code})</span>
                    <span className="font-bold">- £{discountAmount.toFixed(2)}</span>
                  </div>
                )}

                {wantsLounge && (
                  <div className="flex justify-between text-xs md:text-sm text-indigo-300 font-medium">
                    <span>VIP Lounge Access</span>
                    <span className="font-bold">+ £{LOUNGE_PRICE.toFixed(2)}</span>
                  </div>
                )}

                {wantsFastTrack && (
                  <div className="flex justify-between text-xs md:text-sm text-indigo-300 font-medium">
                    <span>Fast Track Security</span>
                    <span className="font-bold">+ £{FAST_TRACK_PRICE.toFixed(2)}</span>
                  </div>
                )}

                <div className="flex justify-between text-xs md:text-sm text-slate-400 font-medium pt-3 border-t border-white/10">
                  <span>Taxes & Airport Fees</span>
                  <span className="text-emerald-400 font-bold uppercase tracking-widest text-[9px] md:text-[10px]">Included</span>
                </div>
              </div>

              <div className="flex flex-col items-end mb-6 md:mb-8">
                <span className="text-[9px] md:text-[10px] font-black uppercase tracking-widest text-slate-500 mb-1">Total Due Today</span>
                <span className="text-4xl md:text-5xl font-black tracking-tighter text-blue-400 drop-shadow-md">£{finalTotal.toFixed(2)}</span>
              </div>

              <button 
                type="submit" 
                form="checkout-form"
                disabled={isProcessing}
                className="hidden lg:flex w-full h-14 md:h-16 bg-blue-600 hover:bg-blue-500 disabled:bg-blue-600/50 text-white font-black text-base md:text-lg rounded-2xl items-center justify-center gap-2 md:gap-3 shadow-[0_10px_30px_rgba(37,99,235,0.4)] active:scale-95 transition-all uppercase tracking-widest touch-manipulation"
              >
                {isProcessing ? (
                  <><Loader2 className="w-5 h-5 md:w-6 md:h-6 animate-spin" /> Connecting to Stripe...</>
                ) : (
                  <><Lock className="w-4 h-4 md:w-5 md:h-5" /> Proceed to Payment</>
                )}
              </button>
            </div>
          </div>

          <div className="mt-4 md:mt-6 flex flex-col gap-4">
              <div className="bg-white rounded-[1.5rem] p-5 md:p-6 border border-slate-200 shadow-sm flex items-start gap-3 md:gap-4">
                <div className="w-8 h-8 md:w-10 md:h-10 bg-emerald-50 text-emerald-600 rounded-xl flex items-center justify-center flex-shrink-0">
                  <ShieldCheck className="w-4 h-4 md:w-5 md:h-5" />
                </div>
                <div>
                  <p className="text-xs md:text-sm font-black text-slate-900 tracking-tight mb-1">Aero Booking Guarantee</p>
                  <p className="text-[11px] md:text-xs font-bold text-slate-500 leading-relaxed">Free cancellation up to <span className="text-blue-600">24 hours</span> before your drop-off. Encrypted by Stripe.</p>
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
      
      {/* Background glow logic for desktop */}
      <div className="fixed top-0 left-0 w-full h-full pointer-events-none z-0 flex justify-center overflow-hidden">
         <div className="w-full max-w-[1000px] h-96 bg-blue-600/5 blur-[120px] rounded-full absolute -top-48"></div>
      </div>

      <header className="sticky top-0 z-[100] bg-[#0A101D] border-b border-white/5 shadow-2xl backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 md:h-20 flex items-center justify-between">
          <Link href="/results" className="flex items-center gap-2 text-slate-400 hover:text-white transition-colors group touch-manipulation">
            <ArrowLeft className="w-4 h-4 md:w-5 md:h-5 lg:group-hover:-translate-x-1 transition-transform" />
            <span className="text-[9px] md:text-[10px] font-black uppercase tracking-widest hidden md:block">Back to Packages</span>
          </Link>
          
          <Link href="/" className="flex items-center gap-1.5 md:gap-2 text-white font-black tracking-tighter text-lg md:text-xl uppercase absolute left-1/2 -translate-x-1/2 touch-manipulation">
            <Plane className="w-5 h-5 md:w-6 md:h-6 text-blue-500 rotate-45" /> AEROPARK<span className="text-blue-500">DIRECT</span>
          </Link>

          <div className="flex items-center gap-1.5 md:gap-2 text-emerald-400">
             <Lock className="w-3.5 h-3.5 md:w-4 md:h-4" />
             <span className="text-[9px] md:text-[10px] font-black uppercase tracking-widest hidden xs:block">Secure Checkout</span>
          </div>
        </div>
      </header>

      <Suspense fallback={<div className="p-24 md:p-40 text-center font-black uppercase tracking-[0.2em] md:tracking-widest text-xs md:text-sm text-slate-400 animate-pulse">Aero is Initializing Checkout...</div>}>
        <CheckoutContent />
      </Suspense>
    </main>
  );
}