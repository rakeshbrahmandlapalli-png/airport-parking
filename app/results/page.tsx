"use client";
import LaunchTimer from "@/components/LaunchTimer";
import { checkAvailability, getLaunchSlotsClaimed } from "../actions";
import { useSearchParams, useRouter } from "next/navigation";
import { 
  MapPin, Clock, ShieldCheck, ChevronRight, ThumbsUp, ArrowLeft,
  ChevronDown, Plane, Calendar, Footprints, User,
  Star, Ban, Bus, BedDouble, Info, PlaneTakeoff, 
  PlaneLanding, Map as MapIcon, Navigation, Loader2,
  AlertCircle, X, Shield, Sparkles, MessageSquare, Bot, Zap, Tag, CarFront, BatteryCharging, Briefcase, Percent, CheckCircle2
} from "lucide-react";
import Link from "next/link";
import { Suspense, useState, useMemo, useEffect } from "react";
import { supabase } from "../lib/supabase";

// ----------------------------------------------------------------------
// 🟢 NEW: SOCIAL PROOF TICKER (CONVERSION BOOSTER)
// ----------------------------------------------------------------------
function LiveActivity() {
  const [text, setText] = useState("John from London just booked Meet & Greet");
  const [visible, setVisible] = useState(false);
  
  useEffect(() => {
    const messages = [
      "Sarah from Luton just booked Meet & Greet",
      "Mike from Watford secured a 30% discount",
      "Emma from Milton Keynes just booked 24/7 parking",
      "David from St Albans joined as a Founding Member",
      "James from London just booked Park & Ride"
    ];
    let i = 0;
    
    setTimeout(() => setVisible(true), 2000);

    const interval = setInterval(() => {
      setVisible(false);
      setTimeout(() => {
        i = (i + 1) % messages.length;
        setText(messages[i]);
        setVisible(true);
      }, 500); 
    }, 12000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className={`fixed bottom-6 left-6 z-[998] hidden lg:flex transition-all duration-500 ${visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
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

// ----------------------------------------------------------------------
// 🟢 CUSTOM AERO AVATAR 
// ----------------------------------------------------------------------
function AeroAvatar({ size = "md", thinking = false }: { size?: "sm" | "md" | "lg" | "xl", thinking?: boolean }) {
  const sizeClasses = { sm: "w-8 h-8 rounded-lg", md: "w-14 h-14 rounded-2xl", lg: "w-20 h-20 rounded-3xl", xl: "w-32 h-32 rounded-[2.5rem]" };
  const eyeWidth = { sm: "w-1", md: "w-1.5", lg: "w-2", xl: "w-3.5" };
  const eyeHeight = { sm: "h-2.5", md: "h-4", lg: "h-6", xl: "h-10" };
  const gap = { sm: "gap-1", md: "gap-1.5", lg: "gap-2", xl: "gap-3" };

  return (
    <div className={`relative flex items-center justify-center shrink-0 ${sizeClasses[size]}`}>
      <div className={`absolute inset-0 bg-blue-500/40 blur-xl ${thinking ? 'animate-pulse scale-110' : ''}`}></div>
      <div className={`relative w-full h-full bg-gradient-to-br from-blue-400 via-blue-600 to-blue-700 flex items-center justify-center shadow-[0_0_25px_rgba(37,99,235,0.5)] overflow-hidden group border border-blue-300/30 ${sizeClasses[size]}`}>
        <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent pointer-events-none"></div>
        <div className={`absolute left-0 w-full h-[2px] bg-white/60 shadow-[0_0_10px_white] z-20 ${thinking ? 'animate-scan opacity-100' : 'opacity-0 group-hover:opacity-100 group-hover:animate-scan'}`}></div>
        <div className={`flex ${gap[size]} z-10 ${thinking ? 'animate-pulse' : ''}`}>
          <div className={`${eyeWidth[size]} ${eyeHeight[size]} bg-white rounded-full shadow-[0_0_10px_rgba(255,255,255,0.9)] transition-all duration-300`}></div>
          <div className={`${eyeWidth[size]} ${eyeHeight[size]} bg-white rounded-full shadow-[0_0_10px_rgba(255,255,255,0.9)] transition-all duration-300`}></div>
        </div>
        <div className="absolute top-2 right-2 flex items-center justify-center">
          <div className="w-1.5 h-1.5 bg-green-400 rounded-full shadow-[0_0_6px_#4ade80] animate-pulse"></div>
        </div>
      </div>
    </div>
  );
}

// ----------------------------------------------------------------------
// 🟢 ROBUST DATA PARSERS & PRICING ENGINE
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

const formatDate = (dateString: string | null) => {
  if (!dateString) return "--";
  return new Date(dateString).toLocaleDateString("en-GB", { weekday: 'short', day: 'numeric', month: 'short' });
};

// Centralized Pricing Logic (Hybrid)
const getCalculatedPrice = (option: any, duration: number, isHeathrow: boolean, pricingEngine: any[], dropDateObj: Date) => {
  const providerName = option.name.trim(); // Trim whitespace
  const dynamicProviders = ["APD", "Airport Parking Bay", "24/7 meet and greet", "24/7 Meet & Greet"];
  
  // 1. Check if provider is in list (Case insensitive)
  const isDynamic = dynamicProviders.some(p => p.toLowerCase() === providerName.toLowerCase());
  
  let rawPrice = 0;

  if (isDynamic && pricingEngine.length > 0) {
    const activeSet = pricingEngine.find(set => {
      const start = safeParseDate(set.StartDate);
      const end = safeParseDate(set.EndDate);
      return dropDateObj >= start && dropDateObj <= end;
    });

    if (activeSet) {
      const rateKey = duration <= 31 ? `Day${duration}` : "Day31";
      const dailyPrice = Number(activeSet[rateKey] || activeSet.StartingPrice || activeSet.Day1);
      
      let surcharge = 0;
      if (providerName.toLowerCase().includes("24/7")) surcharge = 5;
      if (providerName.toLowerCase() === "apd") surcharge = 8;
      
      rawPrice = dailyPrice + surcharge;
    } 
  } 

  if (rawPrice === 0) {
    // --- LEGACY MATH FALLBACK ---
    let tot = 0;
    const p1 = parsePrice(isHeathrow ? option.heathrow_price : option.luton_price, 0);
    const p2 = parsePrice(isHeathrow ? option.lhr_day2_price : option.ltn_day2_price, p1);
    const p5 = parsePrice(isHeathrow ? option.lhr_day5_price : option.ltn_day5_price, p2);
    const p8 = parsePrice(isHeathrow ? option.lhr_day8_price : option.ltn_day8_price, p5);
    const p11 = parsePrice(isHeathrow ? option.lhr_day11_price : option.ltn_day11_price, p8);
    const p14 = parsePrice(isHeathrow ? option.lhr_day14_price : option.ltn_day14_price, p11);
    const p17 = parsePrice(isHeathrow ? option.lhr_day17_price : option.ltn_day17_price, p14);
    const p22 = parsePrice(isHeathrow ? option.lhr_day22_price : option.ltn_day22_price, p17);
    const p32 = parsePrice(isHeathrow ? option.lhr_day32_price : option.ltn_day32_price, p22);

    if (duration <= 1) tot = p1;
    else if (duration === 2) tot = p2;
    else if (duration <= 5) tot = p2 + ((p5 - p2) / 3) * (duration - 2);
    else if (duration <= 8) tot = p5 + ((p8 - p5) / 3) * (duration - 5);
    else if (duration <= 11) tot = p8 + ((p11 - p8) / 3) * (duration - 8);
    else if (duration <= 14) tot = p11 + ((p14 - p11) / 3) * (duration - 11);
    else if (duration <= 17) tot = p14 + ((p17 - p14) / 3) * (duration - 14);
    else if (duration <= 22) tot = p17 + ((p22 - p17) / 5) * (duration - 17);
    else if (duration <= 32) tot = p22 + ((p32 - p22) / 10) * (duration - 32);
    else tot = p32 + ((p32 - p22) / 10) * (duration - 32); 
    
    rawPrice = tot;
  }

  // 🟢 APPLY MODIFIER FROM DATABASE
  const modifier = option.price_modifier || 1.0; 
  const finalPrice = (rawPrice * modifier) * 1.10; 
  const originalPrice = rawPrice * 1.10; 

  return { original: originalPrice, final: finalPrice, modifier };
};

// ----------------------------------------------------------------------
// 🟢 MODULAR COMPONENT: MODIFY SEARCH MODAL
// ----------------------------------------------------------------------
function ModifySearchModal({ 
  isEditModalOpen, setIsEditModalOpen, handleUpdateSearch,
  editAirport, setEditAirport, editDropDate, setEditDropDate, editDropTime, setEditDropTime,
  editPickDate, setEditPickDate, editPickTime, setEditPickTime
}: any) {
  if (!isEditModalOpen) return null;

  const inputStyle = "w-full bg-[#1A2235] border border-slate-700/50 hover:border-blue-500/50 rounded-xl px-5 py-4 text-sm text-white font-bold outline-none focus:ring-2 focus:ring-blue-500/50 transition-all shadow-[0_0_0_1000px_#1A2235_inset] [-webkit-text-fill-color:white] placeholder:text-slate-500 autofill:bg-[#1A2235] autofill:text-white autofill:shadow-[0_0_0_1000px_#1A2235_inset]";
  const selectStyle = "w-full appearance-none bg-[#1A2235] border border-slate-700/50 hover:border-blue-500/50 rounded-xl px-5 py-4 text-sm text-white font-bold outline-none cursor-pointer focus:ring-2 focus:ring-blue-500/50 transition-all shadow-[0_0_0_1000px_#1A2235_inset] [-webkit-text-fill-color:white] autofill:bg-[#1A2235] autofill:text-white autofill:shadow-[0_0_0_1000px_#1A2235_inset]";

  return (
    <div className="fixed inset-0 z-[200] bg-black/90 backdrop-blur-md flex items-end sm:items-center justify-center p-4 sm:p-8 animate-in fade-in overflow-hidden">
      <div className="bg-[#0F1523] border border-slate-800 w-full max-w-lg rounded-t-[2rem] sm:rounded-[2.5rem] p-8 sm:p-10 shadow-2xl animate-in slide-in-from-bottom-8 relative overflow-hidden">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h2 className="text-2xl font-black text-white tracking-tight">Modify Search</h2>
            <p className="text-[10px] font-bold text-blue-500 mt-1 tracking-widest uppercase">Aero is ready to re-scan</p>
          </div>
          <button onClick={() => setIsEditModalOpen(false)} className="p-3 bg-[#1A2235] text-slate-400 rounded-xl hover:text-white transition-colors border border-slate-700/50">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleUpdateSearch} className="space-y-6">
          <div className="space-y-2">
            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest block ml-1">Departure Airport</label>
            <div className="relative">
              <select value={editAirport} onChange={(e)=>setEditAirport(e.target.value)} className={selectStyle}>
                <option value="Luton (LTN)">Luton Airport (LTN)</option>
                <option value="Heathrow (LHR)">Heathrow Airport (LHR)</option>
              </select>
              <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 pointer-events-none" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 border-t border-slate-800/80 pt-6">
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest block ml-1">Drop-off Date</label>
              <input type="date" value={editDropDate} onChange={(e)=>setEditDropDate(e.target.value)} className={`${inputStyle} [color-scheme:dark]`} required />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest block ml-1">Time</label>
              <input type="time" value={editDropTime} onChange={(e)=>setEditDropTime(e.target.value)} className={`${inputStyle} [color-scheme:dark]`} required />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest block ml-1">Pick-up Date</label>
              <input type="date" min={editDropDate} value={editPickDate} onChange={(e)=>setEditPickDate(e.target.value)} className={`${inputStyle} [color-scheme:dark]`} required />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest block ml-1">Time</label>
              <input type="time" value={editPickTime} onChange={(e)=>setEditPickTime(e.target.value)} className={`${inputStyle} [color-scheme:dark]`} required />
            </div>
          </div>

          <button type="submit" className="w-full mt-4 py-4 bg-blue-600 hover:bg-blue-500 text-white font-black rounded-xl uppercase text-xs tracking-widest transition-all active:scale-95 shadow-lg shadow-blue-500/20">
            Update Search & Recalculate
          </button>
        </form>
      </div>
    </div>
  );
}

// ----------------------------------------------------------------------
// 1. PREMIUM PARKING CARD COMPONENT
// ----------------------------------------------------------------------
function ParkingCard({ option, duration, isHeathrow, handleBooking, aiData, calculatedPriceObj }: any) {
  const [activeTab, setActiveTab] = useState('overview');
  const { original, final, modifier } = calculatedPriceObj;
  
  const getBadgeIcon = (label: string) => {
    const l = label.toUpperCase();
    if (l.includes("WALK")) return Footprints;
    if (l.includes("BUS")) return Bus;
    if (l.includes("VALET")) return CarFront;
    if (l.includes("HOUR")) return Clock;
    if (l.includes("TERMINAL")) return Navigation;
    if (l.includes("FEE")) return Tag;
    if (l.includes("AERO")) return Sparkles;
    if (l.includes("FAST")) return Zap;
    if (l.includes("PET")) return Footprints;
    if (l.includes("SECURITY") || l.includes("SECURE")) return ShieldCheck;
    if (l.includes("MEET")) return User;
    if (l.includes("HOTEL")) return BedDouble;
    if (l.includes("CHARG")) return BatteryCharging;
    if (l.includes("LUGGAGE")) return Briefcase;
    if (l.includes("FREE") || l.includes("INCLUDED")) return CheckCircle2;
    if (l.includes("DISCOUNT") || l.includes("OFFER")) return Percent;
    if (l.includes("VIP")) return Star;
    return Info; 
  };

  const avgDailyRate = final / duration;
  const isDiscounted = modifier < 1.0;
  
  const isSoldOut = isHeathrow ? option.lhr_sold_out : option.ltn_sold_out;
  const isPremium = (isHeathrow ? option.lhr_featured : option.ltn_featured) || option.name.toLowerCase().includes("24/7");

  const cardBg = isPremium ? 'bg-gradient-to-br from-[#0B1120] to-[#0F1523]' : (isSoldOut ? 'bg-[#060A14]/50' : 'bg-[#0F1523]');
  const stubBg = isPremium ? 'bg-[#0F1523]/80' : (isSoldOut ? 'bg-[#060A14]/30' : 'bg-[#060A14]/60');
  const borderClass = isPremium ? 'border-slate-700/50' : (isSoldOut ? 'border-slate-800/50' : 'border-slate-800');
  const textPrimary = isPremium ? 'text-white' : (isSoldOut ? 'text-slate-500' : 'text-slate-100');
  
  const arrivalInstructions = isHeathrow ? option.on_arrival_lhr : option.on_arrival_ltn;
  const returnInstructions = isHeathrow ? option.on_return_lhr : option.on_return_ltn;
  const mapLocation = option.map_location || "Details provided at terminal";
  const currentReviews = isHeathrow ? (option.lhr_reviews || []) : (option.ltn_reviews || []);

  const isShortTrip = duration <= 3;
  const isLongTrip = duration >= 14;
  const isMeetGreet = option.category?.toLowerCase().includes('meet');
  const isParkRide = option.category?.toLowerCase().includes('ride');

  const safeMapLink = `http://googleusercontent.com/maps.google.com/maps?q=${encodeURIComponent((option.address || '') + ' ' + (option.postcode || ''))}`;

  return (
    <div className={`relative rounded-[1.5rem] md:rounded-[2rem] overflow-hidden flex flex-col lg:flex-row transition-all duration-500 group ${cardBg} border ${borderClass} ${isPremium ? 'shadow-[0_20px_40px_-15px_rgba(0,0,0,0.8)] lg:hover:shadow-[0_30px_60px_-15px_rgba(37,99,235,0.2)] lg:hover:border-blue-500/50 transform lg:-translate-x-2 lg:w-[calc(100%+16px)]' : (isSoldOut ? 'opacity-70 grayscale-[50%]' : 'shadow-2xl lg:hover:shadow-blue-900/20 lg:hover:border-slate-600 lg:hover:-translate-y-1')}`}>
      {isPremium && !isSoldOut && (
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-600 via-indigo-500 to-emerald-500 z-20"></div>
      )}

      <div className="flex-1 p-5 sm:p-6 md:p-8 lg:p-10 relative z-10 flex flex-col">
        <div className="mb-6 md:mb-8">
          <div className="flex flex-wrap gap-2 mb-4">
            
            {/* 🟢 NEW: DISCOUNT BADGE */}
            {isDiscounted && !isSoldOut && (
              <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded-lg text-[9px] font-black uppercase tracking-[0.2em] animate-pulse shadow-sm">
                <Tag className="w-3 h-3 fill-current" /> {Math.round((1 - modifier) * 100)}% Launch Special
              </div>
            )}

            {aiData.isLastMinute === 'true' && !isSoldOut && (
              <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-rose-500/10 text-rose-400 border border-rose-500/20 rounded-lg text-[9px] font-black uppercase tracking-[0.2em]">
                <Zap className="w-3 h-3 fill-current" /> High Demand
              </div>
            )}
            
            {isPremium && !isSoldOut && (
              <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-blue-500/10 text-blue-400 border border-blue-500/20 rounded-lg text-[9px] font-black uppercase tracking-[0.2em]">
                <Sparkles className="w-3 h-3 text-blue-400" /> {isShortTrip && isMeetGreet ? "Best Weekend Value" : isLongTrip && isParkRide ? "Best Long-Stay Saver" : "Aero Recommended"}
              </div>
            )}
            
            {aiData.ulezRisk === 'true' && isHeathrow && !isSoldOut && (
              <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-red-500/10 text-red-400 border border-red-500/20 rounded-lg text-[9px] font-black uppercase tracking-[0.2em]">
                <AlertCircle className="w-3 h-3" /> ULEZ Zone Warning
              </div>
            )}
          </div>

          <div className="flex items-center gap-3 sm:gap-4 mb-4">
            {option.logo_url && (
              <div className="w-12 h-12 sm:w-16 sm:h-16 bg-white rounded-xl flex items-center justify-center p-1.5 sm:p-2 shadow-md shrink-0">
                <img src={option.logo_url} alt={option.name} className="w-full h-full object-contain" onError={(e) => e.currentTarget.style.display = 'none'} />
              </div>
            )}
            <h2 className={`text-xl sm:text-3xl md:text-4xl font-black uppercase tracking-tight leading-none ${textPrimary}`}>
              {option.name}
            </h2>
          </div>
          
          <div className="flex flex-wrap items-center gap-2 sm:gap-3 mt-4">
            <div className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[9px] sm:text-[10px] font-black uppercase tracking-widest ${isPremium ? 'bg-[#1A2235] text-slate-300 border border-slate-700/50' : 'bg-slate-900/50 text-slate-400 border border-slate-800'}`}>
              <ThumbsUp className="w-3.5 h-3.5" /> {option.category?.replace('-', ' ')}
            </div>
            {(option.badges || [])
              .filter((b: any) => b.category === 'General' || b.category === option.category)
              .map((badge: any, index: number) => {
                const BadgeIcon = getBadgeIcon(badge.label); 
                return (
                  <div key={index} className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[9px] sm:text-[10px] font-black uppercase tracking-widest ${isPremium ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-emerald-500/5 text-emerald-500/80 border border-emerald-500/10'}`}>
                    <BadgeIcon className="w-3.5 h-3.5" /> {badge.label}
                  </div>
                );
              })
            }
          </div>
        </div>

        <details className="group/details mt-auto relative">
          <summary className={`inline-flex items-center gap-2 text-[11px] sm:text-xs font-black uppercase tracking-widest cursor-pointer list-none select-none transition-colors touch-manipulation [-webkit-tap-highlight-color:transparent] [&::-webkit-details-marker]:hidden ${isPremium ? 'text-blue-400 hover:text-blue-300' : 'text-slate-400 hover:text-white'}`}>
            <span>View Details, Instructions & Reviews</span>
            <ChevronDown className="w-4 h-4 transition-transform duration-300 group-open/details:rotate-180" />
          </summary>
          
          <div className={`mt-5 md:mt-6 rounded-2xl border overflow-hidden animate-in fade-in slide-in-from-top-4 duration-300 ${isPremium ? 'bg-[#060A14] border-slate-800' : 'bg-slate-900/40 border-slate-800'}`}>
            <div className={`flex flex-wrap items-center gap-1.5 sm:gap-2 p-2 sm:p-3 border-b overflow-x-auto no-scrollbar ${isPremium ? 'border-slate-800' : 'border-slate-800/50'}`}>
              {[
                { id: 'overview', label: 'Overview', Icon: Info },
                { id: 'arrival', label: 'Arrival', Icon: PlaneTakeoff },
                { id: 'return', label: 'Return', Icon: PlaneLanding },
                { id: 'map', label: 'Location', Icon: MapIcon },
                { id: 'reviews', label: `Reviews (${currentReviews.length})`, Icon: MessageSquare }
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={(e) => { e.preventDefault(); setActiveTab(tab.id); }}
                  className={`flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-2 text-[9px] sm:text-[10px] font-black uppercase tracking-widest rounded-lg transition-all whitespace-nowrap touch-manipulation ${
                    activeTab === tab.id 
                      ? (isPremium ? 'bg-blue-600 text-white shadow-md' : 'bg-slate-700 text-white shadow-sm') 
                      : (isPremium ? 'text-slate-400 hover:text-slate-200 hover:bg-white/5' : 'text-slate-500 hover:text-slate-300 hover:bg-white/5')
                  }`}
                >
                  <tab.Icon className="w-3 h-3 sm:w-3.5 sm:h-3.5 hidden xs:block" /> {tab.label}
                </button>
              ))}
            </div>

            <div className="p-4 sm:p-6 min-h-[100px]">
              {activeTab === 'overview' && (
                <div className={`text-xs sm:text-sm leading-relaxed ${isPremium ? 'text-slate-300' : 'text-slate-400'}`} dangerouslySetInnerHTML={{ __html: option.overview || "Professional secure parking service with 24/7 patrols. Approved compound." }} />
              )}
              {activeTab === 'arrival' && (
                <div className={`text-xs sm:text-sm leading-relaxed ${isPremium ? 'text-slate-300' : 'text-slate-400'}`} dangerouslySetInnerHTML={{ __html: arrivalInstructions || "Drive directly to the terminal and call 20 mins before arrival." }} />
              )}
              {activeTab === 'return' && (
                <div className={`text-xs sm:text-sm leading-relaxed ${isPremium ? 'text-slate-300' : 'text-slate-400'}`} dangerouslySetInnerHTML={{ __html: returnInstructions || "Call the dispatch team after clearing customs and collecting luggage." }} />
              )}
              {activeTab === 'map' && (
                <div className="flex flex-col sm:flex-row gap-4 sm:gap-6">
                  <div className="flex-1">
                    <h4 className={`text-[9px] sm:text-[10px] font-black uppercase tracking-widest mb-1 ${isPremium ? 'text-blue-400' : 'text-slate-300'}`}>Arrival Location</h4>
                    <p className={`text-xs sm:text-sm font-bold ${isPremium ? 'text-white' : 'text-slate-200'}`}>{option.address || mapLocation}</p>
                    <p className={`text-[11px] sm:text-xs mt-1 ${isPremium ? 'text-slate-400' : 'text-slate-500'}`}>Postcode: {option.postcode || (isHeathrow ? "TW6 1EW" : "LU2 9LY")}</p>
                    {!isSoldOut && option.address && (
                      <a href={safeMapLink} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 sm:gap-2 mt-3 sm:mt-4 text-[9px] sm:text-[10px] font-black uppercase text-blue-400 hover:text-blue-300 transition-colors touch-manipulation">
                        <Navigation className="w-3 h-3"/> Get Directions
                      </a>
                    )}
                  </div>
                  <div className="flex-1 h-32 sm:h-40 bg-[#0A101D] rounded-xl overflow-hidden relative border border-slate-800 flex items-center justify-center shadow-inner group cursor-pointer">
                    {option.map_url ? (
                      <iframe src={option.map_url} width="100%" height="100%" style={{ border: 0 }} allowFullScreen={false} loading="lazy" referrerPolicy="no-referrer-when-downgrade" className="grayscale opacity-70 group-hover:grayscale-0 group-hover:opacity-100 transition-all duration-500" />
                    ) : (
                      <div className="text-slate-500 text-[9px] sm:text-[10px] font-black uppercase flex flex-col items-center gap-2"><MapPin className="w-4 h-4 sm:w-5 sm:h-5"/> Map Preview</div>
                    )}
                  </div>
                </div>
              )}
              {activeTab === 'reviews' && (
                <div className="flex flex-col h-full">
                  <div className="space-y-4 max-h-60 overflow-y-auto custom-scrollbar pr-2 mb-6">
                     {currentReviews.length > 0 ? currentReviews.map((r: any) => (
                       <div key={r.id} className={`border-b ${isPremium ? 'border-slate-800' : 'border-slate-800/50'} pb-4 last:border-0`}>
                         
                         <div className="flex flex-wrap items-center justify-between gap-2 mb-1">
                           <div className={`flex items-center gap-2 font-bold text-xs ${isPremium ? 'text-blue-400' : 'text-slate-300'}`}>
                             {r.author} 
                             <span className="text-slate-600">•</span> 
                             <div className="flex text-amber-400 tracking-tighter">
                               <Star className="w-2.5 h-2.5 fill-current"/> {r.rating}/5
                             </div>
                           </div>
                           {r.date && (
                             <span className="text-[10px] font-bold tracking-wider text-slate-500">
                               {new Date(r.date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                             </span>
                           )}
                         </div>

                         <div className="flex items-center gap-2 mb-2">
                           {r.verified && (
                             <span className="inline-flex items-center gap-1 text-[9px] font-black uppercase tracking-widest text-emerald-500">
                               <CheckCircle2 className="w-3 h-3" /> Verified Booking
                             </span>
                           )}
                           {r.source && (
                             <span className="inline-flex items-center gap-1 text-[9px] font-black uppercase tracking-widest text-slate-400 bg-slate-800/50 px-1.5 py-0.5 rounded border border-slate-700/50">
                               {r.source}
                             </span>
                           )}
                         </div>

                         <p className={`text-xs leading-relaxed italic ${isPremium ? 'text-slate-300' : 'text-slate-400'}`}>"{r.comment}"</p>
                       </div>
                     )) : <p className={`text-xs ${isPremium ? 'text-slate-500' : 'text-slate-600'}`}>Aero verified: No recent customer reviews found.</p>}
                  </div>
                </div>
              )}
            </div>
          </div>
        </details>
      </div>

      <div className={`hidden lg:block w-px border-l border-dashed my-8 relative z-20 ${borderClass}`}>
        <div className={`absolute -top-10 -left-4 w-8 h-8 rounded-full ${isPremium ? 'bg-[#060A14]' : 'bg-[#0B1120]'}`}></div>
        <div className={`absolute -bottom-10 -left-4 w-8 h-8 rounded-full ${isPremium ? 'bg-[#060A14]' : 'bg-[#0B1120]'}`}></div>
      </div>

      <div className={`w-full lg:w-[320px] xl:w-[340px] p-5 sm:p-6 md:p-8 lg:p-10 shrink-0 relative z-10 flex flex-row lg:flex-col items-center lg:items-end justify-between lg:justify-center border-t border-dashed lg:border-t-0 lg:border-l transition-colors ${stubBg} ${borderClass}`}>
        <div className="text-left lg:text-right flex flex-col justify-center">
          <p className="text-[10px] sm:text-[11px] font-black uppercase tracking-[0.2em] mb-0.5 sm:mb-2 text-slate-500">Total Stay Cost</p>
          
          {/* 🟢 NEW: STRIKETHROUGH LOGIC */}
          <div className="flex flex-col items-start lg:items-end">
             {isDiscounted && !isSoldOut && (
                <p className="text-sm sm:text-base font-black text-slate-500 line-through mb-1">£{original.toFixed(2)}</p>
             )}
             <p className={`text-3xl sm:text-4xl lg:text-6xl font-black tracking-tighter ${isDiscounted ? 'text-emerald-400' : textPrimary} ${isSoldOut ? 'line-through opacity-30' : 'drop-shadow-md'}`}>
               £{final.toFixed(2)}
             </p>
          </div>

          <p className={`text-[9px] sm:text-[11px] font-bold uppercase tracking-widest mt-1 lg:mb-8 hidden lg:block ${isPremium ? 'text-blue-400' : 'text-slate-400'}`}>
            {isSoldOut ? 'Sold Out' : `Averaging £${avgDailyRate.toFixed(2)} / Day`}
          </p>
        </div>
        
        <div className="flex flex-col gap-2 lg:w-full">
          <button 
            disabled={isSoldOut}
            onClick={() => handleBooking(option, final)}
            className={`group h-12 sm:h-14 px-6 lg:w-full font-black rounded-xl flex items-center justify-center gap-2 sm:gap-3 uppercase tracking-[0.15em] text-[11px] sm:text-xs transition-all duration-300 active:scale-95 shadow-lg shrink-0 ${
              isSoldOut 
                ? 'bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-700' 
                : (isPremium ? 'bg-blue-600 hover:bg-blue-500 text-white shadow-blue-500/30 border border-blue-500' : 'bg-[#1A2235] text-white hover:bg-slate-700 border border-slate-700')
            }`}
          >
            {isSoldOut ? <Ban className="w-4 h-4"/> : <span className="relative z-10">Select</span>}
            {!isSoldOut && <ChevronRight className="w-4 h-4 relative z-10 transition-transform lg:group-hover:translate-x-1" />}
          </button>
          
          {/* 🟢 STRIPE TRUST BADGE */}
          {!isSoldOut && (
            <div className="flex items-center justify-center gap-1.5 mt-1 lg:mt-2 opacity-60">
              <ShieldCheck className="w-3.5 h-3.5 text-slate-400" />
              <span className="text-[8.5px] font-bold uppercase tracking-widest text-slate-400">Payments Secured by Stripe</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ----------------------------------------------------------------------
// 2. MAIN RESULTS CONTENT
// ----------------------------------------------------------------------
function ResultsContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  
  const [companies, setCompanies] = useState<any[]>([]);
  const [pricingEngine, setPricingEngine] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [slotsClaimed, setSlotsClaimed] = useState(12);
  
  const airport = searchParams.get("airport") || "Luton (LTN)";
  const dropoff = searchParams.get("dropoffDate") || "";
  const pickup = searchParams.get("pickupDate") || "";
  const serviceType = searchParams.get("type") || "meet-greet"; 
  const isHeathrow = airport.includes("Heathrow");

  const aiData = useMemo(() => ({
    isLastMinute: searchParams.get("isLastMinute"),
    ulezRisk: searchParams.get("ulezRisk"),
    isCorporate: searchParams.get("isCorporate"),
    hasOversizedLuggage: searchParams.get("hasOversizedLuggage"),
    hasHeightRisk: searchParams.get("hasHeightRisk"),
    isRedEye: searchParams.get("isRedEye"),
    hasPet: searchParams.get("hasPet"),
    travelGroupType: searchParams.get("travelGroupType") || "solo"
  }), [searchParams]);

  const aeroTip = searchParams.get("aeroTip") || "";

  const duration = useMemo(() => {
    if (!dropoff || !pickup) return 1;
    const start = safeParseDate(dropoff);
    const end = safeParseDate(pickup);
    if (isNaN(start.getTime()) || isNaN(end.getTime())) return 1;
    const diffTime = Math.abs(end.getTime() - start.getTime());
    const totalDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
    return totalDays <= 0 ? 1 : totalDays;
  }, [dropoff, pickup]);

  // Fetch both the Database and Google Sheets API simultaneously
  useEffect(() => {
  async function loadData() {
    setLoading(true);
    try {
      const [compRes, priceRes, slots] = await Promise.all([
        supabase.from('companies').select('*'),
        fetch('https://script.google.com/macros/s/AKfycbwd4zT_JLMbufzexsJ4GKtkyvVh5EvxUQ0XA_i5cg6f19QXFutErdrU3i57TIF-D8Ku/exec', { 
          redirect: "follow", 
          headers: { "Content-Type": "text/plain;charset=utf-8" } 
        }).then(res => res.json()).catch(() => []),
        getLaunchSlotsClaimed()
      ]);

      if (priceRes) setPricingEngine(priceRes);
      if (compRes.data) setCompanies(compRes.data);
      setSlotsClaimed(slots); 

    } catch(e) {
      console.error("Fetch error:", e);
    }
    
    await checkAvailability(airport, dropoff, pickup);
    setLoading(false);
  }
  loadData();
}, [airport, dropoff, pickup]);

  
  // Calculate and sort processed companies dynamically
  const processedCompanies = useMemo(() => {
  // 1. Filter based on your existing criteria
  const filtered = companies.filter(c => {
    const formattedCategory = c.category?.toLowerCase().replace(/ & /g, '-').replace(/\s+/g, '-').trim();
    const isCorrectCategory = formattedCategory === serviceType.toLowerCase();
    const isCorrectAirport = isHeathrow ? c.operates_at_heathrow === true : c.operates_at_luton === true;
    return isCorrectCategory && isCorrectAirport && c.is_active;
  });

  // 2. Define the date object for pricing
  const dropDateObj = safeParseDate(dropoff);

  // 3. Map to add the 'calculatedPriceObj' field 
  const withPrices = filtered.map(c => {
    const priceData = getCalculatedPrice(c, duration, isHeathrow, pricingEngine, dropDateObj);
    return { ...c, calculatedPriceObj: priceData };
  });

  // 4. Sort by the new final price
  withPrices.sort((a, b) => {
    const aSold = isHeathrow ? a.lhr_sold_out : a.ltn_sold_out;
    const bSold = isHeathrow ? b.lhr_sold_out : b.ltn_sold_out;
    if (aSold && !bSold) return 1;
    if (!aSold && bSold) return -1;
    
    const aFeatured = isHeathrow ? a.lhr_featured : a.ltn_featured;
    const bFeatured = isHeathrow ? b.lhr_featured : b.ltn_featured;
    if (aFeatured && !bFeatured) return -1;
    if (!aFeatured && bFeatured) return 1;
    
    return a.calculatedPriceObj.final - b.calculatedPriceObj.final;
  });

  return withPrices;
}, [companies, pricingEngine, serviceType, isHeathrow, duration, dropoff]);

  const handleBooking = (option: any, finalPrice: number) => {
    const query = new URLSearchParams(searchParams.toString());
    query.set('type', option.name);
    query.set('price', finalPrice.toString());
    query.set('companyId', option.id); 
    router.push(`/checkout?${query.toString()}`);
  };

  if (loading) return (
    <div className="max-w-4xl mx-auto py-32 md:py-40 text-center flex flex-col items-center px-4">
      <AeroAvatar thinking={true} size="lg" />
      <h2 className="text-xl md:text-2xl font-black uppercase tracking-[0.3em] text-white mt-8 animate-pulse">Aero is Scanning</h2>
      <p className="text-slate-400 mt-3 font-medium">Securing live compound availability for {airport}...</p>
    </div>
  );

  return (
    <div className="max-w-[1000px] mx-auto px-4 py-6 md:py-8">
      
      <div className="bg-[#0F1523] border border-blue-900/30 rounded-[2.5rem] p-5 md:p-7 flex flex-col sm:flex-row items-center gap-6 mb-10 shadow-2xl relative overflow-hidden">
        <div className="absolute -right-20 -top-20 w-64 h-64 bg-blue-600/10 rounded-full blur-[120px] pointer-events-none"></div>
        <AeroAvatar />
        <div className="text-center sm:text-left relative z-10 w-full">
          <p className="text-[10px] font-black uppercase tracking-[0.2em] text-blue-400 mb-1 flex items-center justify-center sm:justify-start gap-2">
            <Zap className="w-3 h-3 fill-current"/> Aero Concierge Active
          </p>
          <h3 className="text-white text-base md:text-xl font-bold leading-tight">
            I have securely verified <strong className="text-blue-400">{processedCompanies.length} approved compounds</strong> for your travel dates at {isHeathrow ? 'Heathrow' : 'Luton'}.
          </h3>
          
          {aeroTip && (
             <div className="mt-4 bg-[#1A2235] border border-blue-500/20 rounded-xl p-3 md:p-4 text-xs md:text-sm text-blue-200 flex items-start gap-3 shadow-inner">
               <p className="font-medium leading-relaxed">{aeroTip}</p>
             </div>
          )}
        </div>
      </div>

      <div className="relative mb-10 md:mb-16 max-w-2xl mx-auto px-2 mt-2 md:mt-4">
        <div className="absolute top-1/2 left-0 w-full h-1 bg-slate-800 -translate-y-1/2 rounded-full"></div>
        <div className="absolute top-1/2 left-0 w-[15%] h-1 bg-blue-600 -translate-y-1/2 rounded-full shadow-[0_0_12px_rgba(37,99,235,0.6)]"></div>
        <div className="relative z-10 flex justify-between items-center text-white font-bold">
          <div className="flex flex-col items-center gap-2">
            <div className="w-10 h-10 md:w-12 md:h-12 rounded-full bg-blue-600 text-white flex items-center justify-center font-black shadow-lg border-4 border-[#060A14]">1</div>
            <span className="text-[9px] md:text-[10px] font-black uppercase text-blue-600 tracking-[0.2em]">Select</span>
          </div>
          <div className="flex flex-col items-center gap-2 opacity-40">
            <div className="w-10 h-10 md:w-12 md:h-12 rounded-full bg-slate-800 text-slate-400 flex items-center justify-center font-black">2</div>
            <span className="text-[9px] md:text-[10px] font-black uppercase text-slate-400 tracking-[0.2em]">Details</span>
          </div>
          <div className="flex flex-col items-center gap-2 opacity-40">
            <div className="w-10 h-10 md:w-12 md:h-12 rounded-full bg-slate-800 text-slate-400 flex items-center justify-center font-black">3</div>
            <span className="text-[9px] md:text-[10px] font-black uppercase text-slate-400 tracking-[0.2em]">Payment</span>
          </div>
        </div>
      </div>
{/* 🟢 LAUNCH TIMER INTEGRATION */}
<div className="max-w-lg mx-auto">
 <LaunchTimer hours={72} slotsClaimed={slotsClaimed} totalSlots={15} />
</div>

      <div className="space-y-6 md:space-y-8">
        
        {processedCompanies.length === 0 ? (
          <div className="text-center py-16 md:py-24 bg-[#0F1523] rounded-[3rem] border border-dashed border-slate-700 px-6 relative overflow-hidden">
            {!serviceType.toLowerCase().includes("meet") ? (
              <>
                <div className="absolute -top-24 -right-24 w-64 h-64 bg-blue-600/10 rounded-full blur-[100px] pointer-events-none"></div>
                <div className="w-16 h-16 md:w-20 md:h-20 bg-[#1A2235] border border-slate-700 rounded-3xl flex items-center justify-center mx-auto mb-6 shadow-xl">
                  <Clock className="w-8 h-8 md:w-10 md:h-10 text-blue-400" />
                </div>
                <h3 className="text-2xl md:text-3xl font-black text-white tracking-tight mb-3">
                  {serviceType.toLowerCase().includes("hotel") ? "Hotel & Parking" : "Park & Ride"} is Coming Soon!
                </h3>
                <p className="text-slate-400 text-sm md:text-base font-medium max-w-lg mx-auto leading-relaxed mb-8">
                  We are currently onboarding the highest-rated operators for this service. In the meantime, treat yourself to our <strong className="text-white">Premium Meet & Greet</strong> service! Drive straight to the terminal—often for the same price as a standard bus transfer.
                </p>
                <button 
                  onClick={() => {
                    const query = new URLSearchParams(searchParams.toString());
                    query.set("type", "meet-greet");
                    router.push(`/results?${query.toString()}`);
                  }}
                  className="inline-flex items-center gap-3 px-8 py-4 bg-blue-600 hover:bg-blue-500 text-white font-black uppercase tracking-widest text-xs rounded-xl transition-all active:scale-95 shadow-[0_10px_20px_-10px_rgba(37,99,235,0.6)]"
                >
                  <CarFront className="w-4 h-4" /> View Meet & Greet Prices
                </button>
              </>
            ) : (
              <>
                <AlertCircle className="w-12 h-12 md:w-16 md:h-16 text-slate-600 mx-auto mb-4 md:mb-6" />
                <h3 className="text-xl md:text-2xl font-black text-white">No Active Providers Found</h3>
                <p className="text-slate-500 mt-2 text-sm max-w-md mx-auto">All our trusted compounds are currently fully booked for these exact dates. Try modifying your search dates or times.</p>
              </>
            )}
          </div>
        ) : (
          
          processedCompanies.map((option) => (
            <ParkingCard 
              key={option.id} 
              option={option} 
              duration={duration} 
              isHeathrow={isHeathrow}
              handleBooking={handleBooking}
              aiData={aiData}
              calculatedPriceObj={option.calculatedPriceObj} 
            />
          ))
        )}
      </div>
    </div>
  );
}

// ----------------------------------------------------------------------
// 3. MAIN PAGE WRAPPER (WITH MODAL AND LAYOUT)
// ----------------------------------------------------------------------
function AirportTitle() {
  const searchParams = useSearchParams();
  const airport = searchParams.get("airport") || "Luton (LTN)";
  const dropDate = searchParams.get("dropoffDate") || "";
  const pickDate = searchParams.get("pickupDate") || "";
  
  const formatShortDate = (dateStr: string) => {
    if (!dateStr) return "";
    const d = new Date(dateStr);
    return d.toLocaleDateString("en-GB", { day: "numeric", month: "short" });
  };

  const code = airport.includes("Heathrow") ? "LHR" : "LTN";
  const dateDisplay = dropDate && pickDate ? `${formatShortDate(dropDate)} - ${formatShortDate(pickDate)}` : "Selected";

  return (
    <div className="flex flex-col items-end">
      <span className="text-sm md:text-base font-black text-white tracking-widest leading-none mb-1 group-hover:text-blue-400 transition-colors">{code}</span>
      <span className="text-[7px] md:text-[8px] font-black text-blue-500 uppercase tracking-[0.2em] leading-none">{dateDisplay}</span>
    </div>
  );
}

function ResultsLayout() {
  const router = useRouter();
  const searchParams = useSearchParams();

  // --- MODAL STATE ---
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editAirport, setEditAirport] = useState("");
  const [editDropDate, setEditDropDate] = useState("");
  const [editDropTime, setEditDropTime] = useState("");
  const [editPickDate, setEditPickDate] = useState("");
  const [editPickTime, setEditPickTime] = useState("");

  useEffect(() => {
    if (isEditModalOpen) {
      setEditAirport(searchParams.get("airport") || "Luton (LTN)");
      setEditDropDate(searchParams.get("dropoffDate") || "");
      setEditDropTime(searchParams.get("dropoffTime") || "10:00");
      setEditPickDate(searchParams.get("pickupDate") || "");
      setEditPickTime(searchParams.get("pickupTime") || "10:00");
    }
  }, [isEditModalOpen, searchParams]);

  const handleUpdateSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setIsEditModalOpen(false);
    const query = new URLSearchParams({
      airport: editAirport,
      dropoffDate: editDropDate,
      dropoffTime: editDropTime,
      pickupDate: editPickDate,
      pickupTime: editPickTime,
      type: searchParams.get("type") || "meet-greet"
    }).toString();
    router.push(`/results?${query}`);
  };

  return (
    <main suppressHydrationWarning className="min-h-screen bg-[#0A101D] font-sans antialiased pb-24 md:pb-32 selection:bg-blue-500/30 overflow-x-hidden relative">
      <div className="fixed top-0 left-0 w-full h-full pointer-events-none z-0 flex justify-center overflow-hidden">
         <div className="w-full max-w-[1000px] h-96 bg-blue-600/5 blur-[120px] rounded-full absolute -top-48"></div>
      </div>

      <header className="sticky top-0 z-[100] bg-[#0A101D]/80 backdrop-blur-xl border-b border-white/5 h-16 md:h-20 flex items-center px-4 md:px-8 justify-between shadow-2xl">
        <Link href="/" className="text-slate-400 hover:text-white transition-colors flex items-center gap-2 group touch-manipulation">
          <ArrowLeft className="w-4 h-4 md:w-5 md:h-5 lg:group-hover:-translate-x-1 transition-transform" /> 
          <span className="text-[9px] md:text-[10px] font-black uppercase tracking-[0.2em] hidden md:block">Home</span>
        </Link>
        <Link href="/" className="flex items-center gap-1.5 md:gap-2 text-white font-black tracking-tighter text-xl md:text-2xl uppercase absolute left-1/2 -translate-x-1/2 group touch-manipulation">
          <Plane className="w-5 h-5 md:w-7 md:h-7 text-blue-500 rotate-45" />AEROPARK<span className="text-blue-500">DIRECT</span>
        </Link>
        
        <button onClick={() => setIsEditModalOpen(true)} className="text-right group touch-manipulation cursor-pointer">
          <AirportTitle />
        </button>
      </header>

      {/* 🟢 NEW: LIVE ACTIVITY SOCIAL PROOF */}
      <LiveActivity />

      <div className="relative z-10"><ResultsContent /></div>

      <ModifySearchModal 
        isEditModalOpen={isEditModalOpen} setIsEditModalOpen={setIsEditModalOpen}
        editAirport={editAirport} setEditAirport={setEditAirport}
        editDropDate={editDropDate} setEditDropDate={setEditDropDate}
        editDropTime={editDropTime} setEditDropTime={setEditDropTime}
        editPickDate={editPickDate} setEditPickDate={setEditPickDate}
        editPickTime={editPickTime} setEditPickTime={setEditPickTime}
        handleUpdateSearch={handleUpdateSearch}
      />
    </main>
  );
}

export default function ResultsPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#060A14] flex flex-col items-center justify-center font-black text-slate-400 uppercase tracking-[0.2em] text-xs">Aero is Initializing...</div>}>
      <ResultsLayout />
    </Suspense>
  );
}