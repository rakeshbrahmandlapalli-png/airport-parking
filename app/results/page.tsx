"use client";

import { useSearchParams, useRouter } from "next/navigation";
import { 
  MapPin, Clock, ShieldCheck, ChevronRight, ThumbsUp, ArrowLeft,
  ChevronDown, Plane, Calendar, Footprints,
  Star, Ban, Bus, BedDouble, Info, PlaneTakeoff, 
  PlaneLanding, Map as MapIcon, Navigation, Loader2,
  AlertCircle, X, Shield, Sparkles, MessageSquare, Bot, Zap
} from "lucide-react";
import Link from "next/link";
import { Suspense, useState, useMemo, useEffect } from "react";
import { supabase } from "../lib/supabase";
import { checkAvailability } from "../actions";

// ----------------------------------------------------------------------
// 🟢 CUSTOM AERO AVATAR (Matches Homepage Design)
// ----------------------------------------------------------------------
function AeroAvatar({ size = "md", thinking = false }: { size?: "sm" | "md" | "lg" | "xl", thinking?: boolean }) {
  const sizeClasses = { sm: "w-8 h-8 rounded-lg", md: "w-14 h-14 rounded-2xl", lg: "w-20 h-20 rounded-3xl", xl: "w-32 h-32 rounded-[2.5rem]" };
  const eyeWidth = { sm: "w-1", md: "w-1.5", lg: "w-2", xl: "w-3.5" };
  const eyeHeight = { sm: "h-2.5", md: "h-4", lg: "h-6", xl: "h-10" };
  const gap = { sm: "gap-1", md: "gap-1.5", lg: "gap-2", xl: "gap-3" };

  return (
    <div className={`relative flex items-center justify-center shrink-0 ${sizeClasses[size]}`}>
      {/* Outer Glow Ring */}
      <div className={`absolute inset-0 bg-blue-500/40 blur-xl ${thinking ? 'animate-pulse scale-110' : ''}`}></div>
      
      {/* Main Body - Sleek Blue Gradient matching your image */}
      <div className={`relative w-full h-full bg-gradient-to-br from-blue-400 via-blue-600 to-blue-700 flex items-center justify-center shadow-[0_0_25px_rgba(37,99,235,0.5)] overflow-hidden group border border-blue-300/30 ${sizeClasses[size]}`}>
        
        {/* Subtle Inner Glow */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent pointer-events-none"></div>

        {/* Scanning Line Effect (Activates on hover or when thinking) */}
        <div className={`absolute left-0 w-full h-[2px] bg-white/60 shadow-[0_0_10px_white] z-20 ${thinking ? 'animate-scan opacity-100' : 'opacity-0 group-hover:opacity-100 group-hover:animate-scan'}`}></div>
        
        {/* Aero's Eyes (Two glowing white pills) */}
        <div className={`flex ${gap[size]} z-10 ${thinking ? 'animate-pulse' : ''}`}>
          {/* Left Eye */}
          <div className={`${eyeWidth[size]} ${eyeHeight[size]} bg-white rounded-full shadow-[0_0_10px_rgba(255,255,255,0.9)] transition-all duration-300`}></div>
          {/* Right Eye */}
          <div className={`${eyeWidth[size]} ${eyeHeight[size]} bg-white rounded-full shadow-[0_0_10px_rgba(255,255,255,0.9)] transition-all duration-300`}></div>
        </div>

        {/* Online Status Light (Top right corner) */}
        <div className="absolute top-2 right-2 flex items-center justify-center">
          <div className="w-1.5 h-1.5 bg-green-400 rounded-full shadow-[0_0_6px_#4ade80] animate-pulse"></div>
        </div>
      </div>
    </div>
  );
}

// ----------------------------------------------------------------------
// 1. PREMIUM PARKING CARD COMPONENT
// ----------------------------------------------------------------------
function ParkingCard({ option, duration, isHeathrow, handleBooking }: any) {
  const [activeTab, setActiveTab] = useState('overview');
  
  const dailyRate = isHeathrow ? (option.heathrow_price || 0) : (option.luton_price || 0);
  const totalPrice = dailyRate * duration;
  
  const isSoldOut = isHeathrow ? option.lhr_sold_out : option.ltn_sold_out;
  const isPremium = (isHeathrow ? option.lhr_featured : option.ltn_featured) || option.name.toLowerCase().includes("24/7");

  const cardBg = isPremium ? 'bg-gradient-to-br from-[#0B1121] to-[#0f172a]' : (isSoldOut ? 'bg-slate-50' : 'bg-white');
  const stubBg = isPremium ? 'bg-[#0f172a]/80' : (isSoldOut ? 'bg-slate-100/50' : 'bg-slate-50/80');
  const borderClass = isPremium ? 'border-slate-800' : (isSoldOut ? 'border-slate-200' : 'border-slate-200');
  const textPrimary = isPremium ? 'text-white' : (isSoldOut ? 'text-slate-400' : 'text-slate-900');
  
  const BadgeIcon = option.category?.toLowerCase().includes('bus') || option.category?.toLowerCase().includes('ride') ? Bus : option.category?.toLowerCase().includes('hotel') ? BedDouble : Footprints;

  const arrivalInstructions = isHeathrow ? option.on_arrival_lhr : option.on_arrival_ltn;
  const returnInstructions = isHeathrow ? option.on_return_lhr : option.on_return_ltn;
  const mapLocation = option.map_location || (isHeathrow ? "Heathrow Terminal Area" : "Luton Terminal Car Park 1");
  const currentReviews = isHeathrow ? (option.lhr_reviews || []) : (option.ltn_reviews || []);
  
  return (
    <div className={`relative rounded-[2rem] overflow-hidden flex flex-col lg:flex-row transition-all duration-500 group ${cardBg} border ${borderClass} ${isPremium ? 'shadow-[0_20px_40px_-15px_rgba(15,23,42,0.8)] lg:hover:shadow-[0_30px_60px_-15px_rgba(37,99,235,0.3)] lg:hover:border-blue-900/80 transform lg:-translate-x-2 lg:w-[calc(100%+16px)]' : (isSoldOut ? 'opacity-80 grayscale-[20%]' : 'shadow-lg lg:hover:shadow-xl lg:hover:border-blue-200 lg:hover:-translate-y-1')}`}>
      {isPremium && !isSoldOut && (
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-600 via-indigo-500 to-purple-600 z-20"></div>
      )}

      <div className="flex-1 p-6 md:p-8 lg:p-10 relative z-10 flex flex-col">
        <div className="mb-6 md:mb-8">
          {isPremium && !isSoldOut && (
            <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-gradient-to-r from-blue-600/20 to-indigo-600/20 text-blue-400 border border-blue-500/20 rounded-full text-[9px] font-black uppercase tracking-[0.2em] mb-4 shadow-[0_0_15px_rgba(37,99,235,0.2)]">
              <Sparkles className="w-3 h-3 text-blue-400" /> Aero Recommended
            </div>
          )}

          <h2 className={`text-2xl sm:text-3xl md:text-4xl font-black uppercase tracking-tight mb-4 ${textPrimary}`}>
            {option.name}
          </h2>
          
          <div className="flex flex-wrap items-center gap-2 sm:gap-3">
            <div className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[9px] sm:text-[10px] font-black uppercase tracking-widest ${isPremium ? 'bg-white/5 text-slate-300 border border-white/5' : 'bg-slate-50 text-slate-600 border border-slate-200'}`}>
              <ThumbsUp className="w-3.5 h-3.5" /> {option.category?.replace('-', ' ')}
            </div>
            <div className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[9px] sm:text-[10px] font-black uppercase tracking-widest ${isPremium ? 'bg-white/5 text-slate-300 border border-white/5' : 'bg-slate-50 text-slate-600 border border-slate-200'}`}>
              <BadgeIcon className="w-3.5 h-3.5" /> Terminal Verified
            </div>
          </div>
        </div>

        <details className="group/details mt-auto relative">
          <summary className={`inline-flex items-center gap-2 text-[11px] sm:text-xs font-black uppercase tracking-widest cursor-pointer list-none select-none transition-colors touch-manipulation [-webkit-tap-highlight-color:transparent] [&::-webkit-details-marker]:hidden ${isPremium ? 'text-blue-400 hover:text-blue-300' : 'text-blue-600 hover:text-blue-700'}`}>
            <span>View Details, Instructions & Reviews</span>
            <ChevronDown className="w-4 h-4 transition-transform duration-300 group-open/details:rotate-180" />
          </summary>
          
          <div className={`mt-5 md:mt-6 rounded-2xl border overflow-hidden animate-in fade-in slide-in-from-top-4 duration-300 ${isPremium ? 'bg-slate-900/50 border-slate-800' : 'bg-slate-50 border-slate-200'}`}>
            <div className={`flex flex-wrap items-center gap-1.5 sm:gap-2 p-2 sm:p-3 border-b overflow-x-auto no-scrollbar ${isPremium ? 'border-slate-800' : 'border-slate-200'}`}>
              {[
                { id: 'overview', label: 'Overview', icon: Info },
                { id: 'arrival', label: 'Arrival', icon: PlaneTakeoff },
                { id: 'return', label: 'Return', icon: PlaneLanding },
                { id: 'map', label: 'Location', icon: MapIcon },
                { id: 'reviews', label: `Reviews (${currentReviews.length})`, icon: MessageSquare }
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={(e) => { e.preventDefault(); setActiveTab(tab.id); }}
                  className={`flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-2 text-[9px] sm:text-[10px] font-black uppercase tracking-widest rounded-full transition-all whitespace-nowrap touch-manipulation ${
                    activeTab === tab.id 
                      ? (isPremium ? 'bg-blue-600 text-white shadow-lg' : 'bg-blue-600 text-white shadow-md') 
                      : (isPremium ? 'text-slate-400 hover:text-slate-200 hover:bg-white/5' : 'text-slate-500 hover:text-slate-900 hover:bg-white')
                  }`}
                >
                  <tab.icon className="w-3 h-3 sm:w-3.5 sm:h-3.5 hidden xs:block" /> {tab.label}
                </button>
              ))}
            </div>

            <div className="p-4 sm:p-6 min-h-[100px]">
              {activeTab === 'overview' && <p className={`text-xs sm:text-sm leading-relaxed ${isPremium ? 'text-slate-300' : 'text-slate-600'}`}>{option.overview || "Professional secure parking service with 24/7 patrols. Detailed instructions will be provided upon booking."}</p>}
              
              {activeTab === 'arrival' && <p className={`text-xs sm:text-sm leading-relaxed ${isPremium ? 'text-slate-300' : 'text-slate-600'}`}>{arrivalInstructions || "Drive directly to the terminal and call 20 mins before arrival."}</p>}
              
              {activeTab === 'return' && <p className={`text-xs sm:text-sm leading-relaxed ${isPremium ? 'text-slate-300' : 'text-slate-600'}`}>{returnInstructions || "Call the dispatch team after clearing customs and collecting luggage."}</p>}
              
              {activeTab === 'map' && (
                <div className="flex flex-col sm:flex-row gap-4 sm:gap-6">
                  <div className="flex-1">
                    <h4 className={`text-[9px] sm:text-[10px] font-black uppercase tracking-widest mb-1 ${isPremium ? 'text-blue-400' : 'text-blue-600'}`}>Arrival Location</h4>
                    <p className={`text-xs sm:text-sm font-bold ${isPremium ? 'text-white' : 'text-slate-900'}`}>{mapLocation}</p>
                    <p className={`text-[11px] sm:text-xs mt-1 ${isPremium ? 'text-slate-400' : 'text-slate-500'}`}>Postcode: {isHeathrow ? "TW6 1EW" : "LU2 9LY"}</p>
                    {!isSoldOut && (
                      <a href="https://maps.google.com" target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 sm:gap-2 mt-3 sm:mt-4 text-[9px] sm:text-[10px] font-black uppercase text-blue-500 hover:text-blue-400 transition-colors touch-manipulation"><Navigation className="w-3 h-3"/> Get Directions</a>
                    )}
                  </div>
                  <div className="flex-1 h-24 sm:h-32 bg-slate-200/20 rounded-xl overflow-hidden relative border border-slate-200/10 flex items-center justify-center">
                    <div className="text-slate-400 text-[9px] sm:text-[10px] font-black uppercase flex flex-col items-center gap-2"><MapPin className="w-4 h-4 sm:w-5 sm:h-5"/> Map Preview</div>
                  </div>
                </div>
              )}

              {activeTab === 'reviews' && (
                <div className="space-y-4 max-h-60 overflow-y-auto no-scrollbar">
                   {currentReviews.length > 0 ? currentReviews.map((r: any) => (
                     <div key={r.id} className={`border-b ${isPremium ? 'border-white/5' : 'border-slate-100'} pb-4 last:border-0 animate-in fade-in slide-in-from-bottom-2 duration-300`}>
                       <div className={`flex items-center gap-2 font-bold text-xs ${isPremium ? 'text-blue-400' : 'text-blue-600'}`}>{r.author} • <div className="flex text-amber-400 tracking-tighter"><Star className="w-2.5 h-2.5 fill-current"/> {r.rating}/5</div></div>
                       <p className={`mt-1 text-xs leading-relaxed italic ${isPremium ? 'text-slate-400' : 'text-slate-500'}`}>"{r.comment}"</p>
                     </div>
                   )) : <p className={`text-xs ${isPremium ? 'text-slate-500' : 'text-slate-400'}`}>Aero verified: No recent customer reviews for this provider at {isHeathrow ? 'Heathrow' : 'Luton'}.</p>}
                </div>
              )}
            </div>
          </div>
        </details>
      </div>

      <div className={`hidden lg:block w-px border-l-2 border-dashed my-8 relative z-20 ${borderClass}`}>
        <div className={`absolute -top-10 -left-4 w-8 h-8 rounded-full ${isPremium ? 'bg-[#0A101D] shadow-[inset_0_-2px_4px_rgba(0,0,0,0.5)]' : 'bg-[#F8FAFC] shadow-[inset_0_-2px_4px_rgba(0,0,0,0.05)]'}`}></div>
        <div className={`absolute -bottom-10 -left-4 w-8 h-8 rounded-full ${isPremium ? 'bg-[#0A101D] shadow-[inset_0_2px_4px_rgba(0,0,0,0.5)]' : 'bg-[#F8FAFC] shadow-[inset_0_2px_4px_rgba(0,0,0,0.05)]'}`}></div>
      </div>

      <div className={`w-full lg:w-[320px] xl:w-[340px] p-6 md:p-8 lg:p-10 shrink-0 relative z-10 flex flex-col justify-center border-t border-dashed lg:border-t-0 lg:border-l transition-colors ${stubBg} ${borderClass}`}>
        <div className="text-left lg:text-right w-full flex flex-col h-full justify-center">
          <div>
            <p className="text-[9px] sm:text-[10px] font-black uppercase tracking-[0.2em] mb-1 sm:mb-2 text-slate-500">Total Stay Cost</p>
            <p className={`text-4xl sm:text-5xl lg:text-6xl font-black tracking-tighter mb-2 ${textPrimary} ${isSoldOut ? 'line-through opacity-30' : ''}`}>
              £{totalPrice.toFixed(2)}
            </p>
            <p className={`text-[10px] sm:text-[11px] font-bold uppercase tracking-widest mb-6 lg:mb-8 ${isPremium ? 'text-blue-400' : 'text-blue-600'}`}>
              {isSoldOut ? 'Sold Out for these dates' : `Just £${dailyRate.toFixed(2)} / Day`}
            </p>
          </div>
          
          <button 
            disabled={isSoldOut}
            onClick={() => handleBooking(option, dailyRate)}
            className={`group touch-manipulation [-webkit-tap-highlight-color:transparent] w-full h-12 sm:h-14 font-black rounded-xl flex items-center justify-center gap-2 sm:gap-3 uppercase tracking-[0.15em] text-[10px] sm:text-xs transition-all duration-300 active:scale-95 overflow-hidden relative ${
              isSoldOut 
                ? 'bg-slate-200/10 text-slate-500 cursor-not-allowed border border-slate-200/20' 
                : (isPremium 
                  ? 'bg-blue-600 hover:bg-blue-500 text-white shadow-[0_0_20px_rgba(37,99,235,0.4)] border border-blue-500' 
                  : 'bg-[#0B1121] lg:hover:bg-blue-600 text-white shadow-xl shadow-slate-900/20')
            }`}
          >
            {isSoldOut ? <Ban className="w-3.5 h-3.5 sm:w-4 sm:h-4"/> : <span className="relative z-10">Select Option</span>}
            {!isSoldOut && <ChevronRight className="w-3.5 h-3.5 sm:w-4 sm:h-4 relative z-10 transition-transform lg:group-hover:translate-x-1" />}
          </button>
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
  const [loading, setLoading] = useState(true);
  
  const airport = searchParams.get("airport") || "Luton (LTN)";
  const dropoff = searchParams.get("dropoffDate") || "";
  const pickup = searchParams.get("pickupDate") || "";
  const serviceType = searchParams.get("type") || "meet-greet"; 
  const isHeathrow = airport.includes("Heathrow");

  useEffect(() => {
    async function getLiveRates() {
      setLoading(true);
      const { data } = await supabase
        .from('companies')
        .select('*');
      
      if (data) {
        const filtered = data.filter(c => {
          const formattedCategory = c.category?.toLowerCase().replace(/ & /g, '-').replace(/\s+/g, '-').trim();
          const isCorrectCategory = formattedCategory === serviceType.toLowerCase();
          const isCorrectAirport = isHeathrow ? c.operates_at_heathrow === true : c.operates_at_luton === true;
          return isCorrectCategory && isCorrectAirport && c.is_active;
        });

        // Independent Sorting Logic
        filtered.sort((a, b) => {
           const aSoldOut = isHeathrow ? a.lhr_sold_out : a.ltn_sold_out;
           const bSoldOut = isHeathrow ? b.lhr_sold_out : b.ltn_sold_out;
           if (aSoldOut && !bSoldOut) return 1;
           if (!aSoldOut && bSoldOut) return -1;
           return 0;
        });

        setCompanies(filtered);
      }
      
      await checkAvailability(airport, dropoff, pickup);
      setLoading(false);
    }
    getLiveRates();
  }, [serviceType, airport, dropoff, pickup, isHeathrow]);

  const duration = useMemo(() => {
    if (!dropoff || !pickup) return 1;
    const diff = new Date(pickup).getTime() - new Date(dropoff).getTime();
    const days = Math.ceil(diff / (1000 * 60 * 60 * 24));
    return days <= 0 ? 1 : days;
  }, [dropoff, pickup]);

  const handleBooking = (option: any, rate: number) => {
    const query = new URLSearchParams(searchParams.toString());
    query.set('type', option.name);
    query.set('price', rate.toString());
    router.push(`/checkout?${query.toString()}`);
  };

  if (loading) return (
    <div className="max-w-4xl mx-auto py-32 md:py-40 text-center flex flex-col items-center px-4">
      <AeroAvatar thinking={true} size="lg" />
      <h2 className="text-xl md:text-2xl font-black uppercase tracking-[0.3em] text-white mt-8 animate-pulse">Aero is Scanning</h2>
      <p className="text-slate-400 mt-3 font-medium text-sm md:text-base">Securing live compound availability for {isHeathrow ? 'Heathrow (LHR)' : 'Luton (LTN)'}...</p>
    </div>
  );

  return (
    <div className="max-w-[1000px] mx-auto px-4 py-6 md:py-8">
      
      {/* 🟢 AERO CONCIERGE BANNER WITH MASCOT */}
      <div className="bg-[#0B1121] border border-blue-900/40 rounded-[2.5rem] p-5 md:p-7 flex flex-col sm:flex-row items-center gap-6 mb-10 shadow-2xl relative overflow-hidden">
        <div className="absolute -right-20 -top-20 w-64 h-64 bg-blue-600/10 rounded-full blur-[120px] pointer-events-none"></div>
        <AeroAvatar />
        <div className="text-center sm:text-left relative z-10">
          <p className="text-[10px] font-black uppercase tracking-[0.2em] text-blue-400 mb-1 flex items-center justify-center sm:justify-start gap-2">
            <Zap className="w-3 h-3 fill-current"/> Aero Concierge Active
          </p>
          <h3 className="text-white text-base md:text-xl font-bold leading-tight">
            I have securely verified <strong className="text-blue-400">{companies.length} approved compounds</strong> for your travel dates at {isHeathrow ? 'Heathrow' : 'Luton'}.
          </h3>
        </div>
      </div>

      {/* Sleek Stepper */}
      <div className="relative mb-10 md:mb-16 max-w-2xl mx-auto px-2 mt-2 md:mt-4">
        <div className="absolute top-1/2 left-0 w-full h-1 bg-slate-800 -translate-y-1/2 rounded-full"></div>
        <div className="absolute top-1/2 left-0 w-[15%] h-1 bg-blue-600 -translate-y-1/2 rounded-full shadow-[0_0_12px_rgba(37,99,235,0.6)] transition-all duration-1000"></div>
        <div className="relative z-10 flex justify-between items-center text-white font-bold">
          <div className="flex flex-col items-center gap-2">
            <div className="w-10 h-10 md:w-12 md:h-12 rounded-full bg-blue-600 text-white flex items-center justify-center font-black shadow-lg border-4 border-[#0A101D]">1</div>
            <span className="text-[9px] md:text-[10px] font-black uppercase text-blue-600 tracking-[0.2em]">Select</span>
          </div>
          <div className="flex flex-col items-center gap-2 opacity-30">
            <div className="w-10 h-10 md:w-12 md:h-12 rounded-full bg-slate-800 text-slate-400 flex items-center justify-center font-black">2</div>
            <span className="text-[9px] md:text-[10px] font-black uppercase text-slate-400 tracking-[0.2em]">Details</span>
          </div>
          <div className="flex flex-col items-center gap-2 opacity-30">
            <div className="w-10 h-10 md:w-12 md:h-12 rounded-full bg-slate-800 text-slate-400 flex items-center justify-center font-black">3</div>
            <span className="text-[9px] md:text-[10px] font-black uppercase text-slate-400 tracking-[0.2em]">Payment</span>
          </div>
        </div>
      </div>

      <div className="space-y-6 md:space-y-10">
        {companies.length === 0 ? (
          <div className="text-center py-16 md:py-24 bg-[#0B1121] rounded-[3rem] border border-dashed border-slate-700">
            <AlertCircle className="w-12 h-12 md:w-16 md:h-16 text-slate-700 mx-auto mb-4 md:mb-6" />
            <h3 className="text-xl md:text-2xl font-black text-white mb-2 tracking-tight">No Active Providers</h3>
            <p className="text-slate-500 font-medium text-sm md:text-base">Aero could not locate availability for {isHeathrow ? 'Heathrow' : 'Luton'} on these dates.</p>
          </div>
        ) : (
          companies.map((option) => (
            <ParkingCard 
              key={option.id} 
              option={option} 
              duration={duration} 
              isHeathrow={isHeathrow}
              handleBooking={handleBooking}
            />
          ))
        )}
      </div>
    </div>
  );
}

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
      <span className="text-sm md:text-base font-black text-white tracking-widest leading-none mb-0.5 md:mb-1 group-hover:text-blue-400 transition-colors">{code}</span>
      <span className="text-[7px] md:text-[8px] font-black text-blue-500 uppercase tracking-[0.2em] leading-none">{dateDisplay}</span>
    </div>
  );
}

// ----------------------------------------------------------------------
// 3. MAIN PAGE WRAPPER (WITH MODAL AND SUSPENSE)
// ----------------------------------------------------------------------
function ResultsLayout() {
  const router = useRouter();
  const searchParams = useSearchParams();

  // --- MODAL STATE ---
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editAirport, setEditAirport] = useState(searchParams.get("airport") || "Luton (LTN)");
  const [editDropDate, setEditDropDate] = useState(searchParams.get("dropoffDate") || "");
  const [editDropTime, setEditDropTime] = useState(searchParams.get("dropoffTime") || "");
  const [editPickDate, setEditPickDate] = useState(searchParams.get("pickupDate") || "");
  const [editPickTime, setEditPickTime] = useState(searchParams.get("pickupTime") || "");

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
    <main suppressHydrationWarning className="min-h-[100dvh] bg-[#0A101D] font-sans antialiased pb-24 md:pb-32 selection:bg-blue-500/30 selection:text-white overflow-x-hidden relative">
      {/* Background ambient glow */}
      <div className="fixed top-0 left-0 w-full h-full pointer-events-none z-0 flex justify-center overflow-hidden">
         <div className="w-full max-w-[1000px] h-96 bg-blue-600/5 blur-[120px] rounded-full absolute -top-48"></div>
      </div>

      <header className="sticky top-0 z-[100] bg-[#0A101D]/80 backdrop-blur-xl border-b border-white/5 h-16 md:h-20 flex items-center px-4 md:px-8 justify-between shadow-2xl">
        <Link href="/select-service" className="text-slate-400 hover:text-white transition-colors flex items-center gap-2 group touch-manipulation">
          <ArrowLeft className="w-4 h-4 md:w-5 md:h-5 lg:group-hover:-translate-x-1 transition-transform" /> 
          <span className="text-[9px] md:text-[10px] font-black uppercase tracking-[0.2em] hidden md:block">Edit Search</span>
        </Link>
        <Link href="/" className="flex items-center gap-1.5 md:gap-2 text-white font-black tracking-tighter text-xl md:text-2xl uppercase absolute left-1/2 -translate-x-1/2 group touch-manipulation">
          <Plane className="w-5 h-5 md:w-7 md:h-7 text-blue-500 rotate-45 lg:group-hover:scale-110 transition-transform" />AEROPARK<span className="text-blue-500">DIRECT</span>
        </Link>
        
        <button onClick={() => setIsEditModalOpen(true)} className="text-right group touch-manipulation cursor-pointer">
          <AirportTitle />
        </button>
      </header>

      <div className="relative z-10">
        <ResultsContent />
      </div>

      {/* 🟢 FIXED: MODIFY SEARCH MODAL (Dark text visibility fixed & iOS zoom prevented) */}
      {isEditModalOpen && (
        <div className="fixed inset-0 z-[200] bg-black/90 backdrop-blur-md flex items-end sm:items-center justify-center sm:p-4 animate-in fade-in">
          <div className="bg-white border border-slate-200 w-full max-w-lg rounded-t-[2rem] sm:rounded-[2.5rem] p-6 sm:p-8 md:p-12 shadow-2xl animate-in slide-in-from-bottom-8 duration-300 relative">
            <div className="flex justify-between items-center mb-8">
              <div>
                <h2 className="text-2xl font-black text-slate-900 tracking-tight leading-none">Modify Search</h2>
                <p className="text-[10px] font-black uppercase text-slate-400 mt-2 tracking-widest">Aero is ready to re-scan for you</p>
              </div>
              <button onClick={() => setIsEditModalOpen(false)} className="p-2.5 bg-slate-100 text-slate-400 rounded-full hover:bg-slate-200 hover:text-slate-900 transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleUpdateSearch} className="space-y-4">
              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">Departure Airport</label>
                <select value={editAirport} onChange={(e)=>setEditAirport(e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-4 font-bold text-slate-900 text-base outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 appearance-none">
                  <option value="Luton (LTN)">Luton Airport (LTN)</option>
                  <option value="Heathrow (LHR)">Heathrow Airport (LHR)</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4 border-t border-slate-50 pt-6">
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">Drop-off Date</label>
                  <input type="date" value={editDropDate} onChange={(e)=>setEditDropDate(e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-4 font-bold text-slate-900 text-base outline-none focus:border-blue-500" required />
                </div>
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">Time</label>
                  <input type="time" value={editDropTime} onChange={(e)=>setEditDropTime(e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-4 font-bold text-slate-900 text-base outline-none focus:border-blue-500" required />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">Pick-up Date</label>
                  <input type="date" min={editDropDate} value={editPickDate} onChange={(e)=>setEditPickDate(e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-4 font-bold text-slate-900 text-base outline-none focus:border-blue-500" required />
                </div>
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">Time</label>
                  <input type="time" value={editPickTime} onChange={(e)=>setEditPickTime(e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-4 font-bold text-slate-900 text-base outline-none focus:border-blue-500" required />
                </div>
              </div>

              <button type="submit" className="w-full mt-6 py-4 md:py-5 bg-blue-600 hover:bg-blue-500 text-white font-black rounded-2xl text-xs sm:text-sm uppercase tracking-widest transition-all active:scale-95 shadow-xl shadow-blue-600/30">
                Update Search
              </button>
            </form>
          </div>
        </div>
      )}
    </main>
  );
}

export default function ResultsPage() {
  return (
    <Suspense fallback={<div className="min-h-[100dvh] bg-[#0A101D] flex flex-col items-center justify-center font-black text-slate-400 uppercase tracking-[0.2em] text-xs">Aero is Initializing...</div>}>
      <ResultsLayout />
    </Suspense>
  );
}