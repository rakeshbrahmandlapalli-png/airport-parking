"use client";

import { useSearchParams } from "next/navigation";
import { 
  MapPin, Clock, ShieldCheck, ChevronRight, ThumbsUp, ArrowLeft,
  XCircle, Flame, ChevronDown, Plane, Calendar, Footprints,
  Check, Star, Ban, Bus, BedDouble, Info, PlaneTakeoff, 
  PlaneLanding, Map as MapIcon, Navigation, ExternalLink, Loader2,
  AlertCircle
} from "lucide-react";
import Link from "next/link";
import { Suspense, useState, useMemo, useEffect } from "react";
import { createClient } from "@supabase/supabase-js";
import { checkAvailability } from "../actions";

// Initialize Supabase directly
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

// ----------------------------------------------------------------------
// 1. PREMIUM PARKING CARD COMPONENT
// ----------------------------------------------------------------------
function ParkingCard({ option, duration, isHeathrow, handleBooking }: any) {
  const [activeTab, setActiveTab] = useState('overview');
  
  const dailyRate = isHeathrow ? (option.heathrow_price || 0) : (option.luton_price || 0);
  const totalPrice = dailyRate * duration;
  
  const isPremium = option.name.toLowerCase().includes("24/7") || option.is_recommended;
  const isSoldOut = option.is_sold_out;

  // Premium sleek styling vs Clean standard styling
  const cardBg = isPremium ? 'bg-gradient-to-br from-slate-900 to-slate-950' : (isSoldOut ? 'bg-slate-50' : 'bg-white');
  const stubBg = isPremium ? 'bg-slate-950/50' : (isSoldOut ? 'bg-slate-100/50' : 'bg-slate-50/80');
  const borderClass = isPremium ? 'border-slate-800' : (isSoldOut ? 'border-slate-200' : 'border-slate-200');
  const textPrimary = isPremium ? 'text-white' : (isSoldOut ? 'text-slate-400' : 'text-slate-900');
  
  const BadgeIcon = option.category?.toLowerCase().includes('bus') || option.category?.toLowerCase().includes('ride') ? Bus : option.category?.toLowerCase().includes('hotel') ? BedDouble : Footprints;

  return (
    <div className={`relative rounded-[2rem] overflow-hidden flex flex-col lg:flex-row transition-all duration-500 group ${cardBg} border ${borderClass} ${isPremium ? 'shadow-[0_20px_40px_-15px_rgba(15,23,42,0.3)] hover:shadow-[0_30px_60px_-15px_rgba(37,99,235,0.2)] hover:border-blue-900/50 transform md:-translate-x-2 md:w-[calc(100%+16px)]' : (isSoldOut ? 'opacity-80 grayscale-[20%]' : 'shadow-lg hover:shadow-xl hover:border-blue-200 hover:-translate-y-1')}`}>
      
      {/* VIP Glow Accent */}
      {isPremium && !isSoldOut && (
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-500 via-blue-400 to-indigo-500 z-20"></div>
      )}

      {/* LEFT SIDE: Details */}
      <div className="flex-1 p-8 md:p-10 relative z-10 flex flex-col">
        <div className="mb-8">
          {/* VIP Badge */}
          {isPremium && !isSoldOut && (
            <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-blue-500/10 text-blue-400 border border-blue-500/20 rounded-full text-[9px] font-black uppercase tracking-[0.2em] mb-4">
              <Star className="w-3 h-3 fill-current" /> Featured
            </div>
          )}

          <h2 className={`text-3xl md:text-4xl font-black uppercase tracking-tight mb-4 ${textPrimary}`}>
            {option.name}
          </h2>
          
          <div className="flex flex-wrap items-center gap-3">
            <div className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest ${isPremium ? 'bg-white/5 text-slate-300 border border-white/5' : 'bg-slate-50 text-slate-600 border border-slate-200'}`}>
              <ThumbsUp className="w-3.5 h-3.5" /> {option.category?.replace('-', ' ')}
            </div>
            <div className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest ${isPremium ? 'bg-white/5 text-slate-300 border border-white/5' : 'bg-slate-50 text-slate-600 border border-slate-200'}`}>
              <BadgeIcon className="w-3.5 h-3.5" /> {option.category?.toLowerCase().includes('meet') ? '5 mins walk to terminal' : 'Express Shuttle'}
            </div>
          </div>
        </div>

        {/* Expandable Details Area */}
        <details className="group/details mt-auto relative">
          <summary className={`inline-flex items-center gap-2 text-xs font-black uppercase tracking-widest cursor-pointer list-none select-none transition-colors [&::-webkit-details-marker]:hidden ${isPremium ? 'text-blue-400 hover:text-blue-300' : 'text-blue-600 hover:text-blue-700'}`}>
            <span>View Full Details & Instructions</span>
            <ChevronDown className="w-4 h-4 transition-transform duration-300 group-open/details:rotate-180" />
          </summary>
          
          <div className={`mt-6 rounded-2xl border overflow-hidden animate-in fade-in slide-in-from-top-4 duration-300 ${isPremium ? 'bg-slate-900/50 border-slate-800' : 'bg-slate-50 border-slate-200'}`}>
            {/* Modern Pill Tabs */}
            <div className={`flex flex-wrap items-center gap-2 p-3 border-b ${isPremium ? 'border-slate-800' : 'border-slate-200'}`}>
              {[
                { id: 'overview', label: 'Overview', icon: Info },
                { id: 'arrival', label: 'Arrival', icon: PlaneTakeoff },
                { id: 'return', label: 'Return', icon: PlaneLanding },
                { id: 'map', label: 'Location', icon: MapIcon }
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={(e) => { e.preventDefault(); setActiveTab(tab.id); }}
                  className={`flex items-center gap-2 px-4 py-2 text-[10px] font-black uppercase tracking-widest rounded-full transition-all ${
                    activeTab === tab.id 
                      ? (isPremium ? 'bg-blue-600 text-white shadow-lg shadow-blue-900/20' : 'bg-blue-600 text-white shadow-md') 
                      : (isPremium ? 'text-slate-400 hover:text-slate-200 hover:bg-white/5' : 'text-slate-500 hover:text-slate-900 hover:bg-white')
                  }`}
                >
                  <tab.icon className="w-3.5 h-3.5 hidden sm:block" /> {tab.label}
                </button>
              ))}
            </div>

            <div className="p-6">
              {activeTab === 'overview' && <p className={`text-sm leading-relaxed ${isPremium ? 'text-slate-300' : 'text-slate-600'}`}>{option.overview || "Professional secure parking service with 24/7 patrols."}</p>}
              {activeTab === 'arrival' && <p className={`text-sm leading-relaxed ${isPremium ? 'text-slate-300' : 'text-slate-600'}`}>{option.on_arrival || "Drive directly to the terminal and call 20 mins before arrival."}</p>}
              {activeTab === 'return' && <p className={`text-sm leading-relaxed ${isPremium ? 'text-slate-300' : 'text-slate-600'}`}>{option.on_return || "Call the dispatch team after clearing customs and collecting luggage."}</p>}
              {activeTab === 'map' && (
                <div className="flex flex-col sm:flex-row gap-6">
                  <div className="flex-1">
                    <h4 className={`text-[10px] font-black uppercase tracking-widest mb-1 ${isPremium ? 'text-blue-400' : 'text-blue-600'}`}>Arrival Location</h4>
                    <p className={`text-sm font-bold ${isPremium ? 'text-white' : 'text-slate-900'}`}>{isHeathrow ? "Heathrow Terminal Area" : "Luton Terminal Car Park 1"}</p>
                    <p className={`text-xs mt-1 ${isPremium ? 'text-slate-400' : 'text-slate-500'}`}>Postcode: {isHeathrow ? "TW6 1EW" : "LU2 9LY"}</p>
                    {!isSoldOut && (
                      <a href="https://maps.google.com" target="_blank" className="inline-flex items-center gap-2 mt-4 text-[10px] font-black uppercase text-blue-500 hover:text-blue-400 transition-colors"><Navigation className="w-3 h-3"/> Get Directions</a>
                    )}
                  </div>
                  <div className="flex-1 h-32 bg-slate-200/20 rounded-xl overflow-hidden relative border border-slate-200/10 flex items-center justify-center">
                    <div className="text-slate-400 text-[10px] font-black uppercase flex flex-col items-center gap-2"><MapPin className="w-5 h-5"/> Map Preview Unavailable</div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </details>
      </div>

      {/* THE TICKET DIVIDER (Perforated Edge) */}
      <div className={`hidden lg:block w-px border-l-2 border-dashed my-8 relative z-20 ${borderClass}`}>
        {/* Punch holes that match the background color */}
        <div className="absolute -top-10 -left-4 w-8 h-8 rounded-full bg-[#F8FAFC] shadow-[inset_0_-2px_4px_rgba(0,0,0,0.05)]"></div>
        <div className="absolute -bottom-10 -left-4 w-8 h-8 rounded-full bg-[#F8FAFC] shadow-[inset_0_2px_4px_rgba(0,0,0,0.05)]"></div>
      </div>

      {/* RIGHT SIDE: Pricing Stub */}
      <div className={`w-full lg:w-[340px] p-8 md:p-10 shrink-0 relative z-10 flex flex-col justify-center border-t border-dashed lg:border-t-0 transition-colors ${stubBg} ${borderClass}`}>
        <div className="text-left md:text-right w-full flex flex-col h-full justify-center">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.2em] mb-2 text-slate-400">Total Stay Cost</p>
            <p className={`text-5xl md:text-6xl font-black tracking-tighter mb-2 ${textPrimary} ${isSoldOut ? 'line-through opacity-30' : ''}`}>
              £{totalPrice.toFixed(2)}
            </p>
            <p className={`text-[11px] font-bold uppercase tracking-widest mb-8 ${isPremium ? 'text-blue-400' : 'text-blue-600'}`}>
              {isSoldOut ? 'Sold Out for these dates' : `Just £${dailyRate.toFixed(2)} / Day`}
            </p>
          </div>
          
          <button 
            disabled={isSoldOut}
            onClick={() => handleBooking(option, dailyRate)}
            className={`group w-full h-14 font-black rounded-xl flex items-center justify-center gap-3 uppercase tracking-[0.15em] text-xs transition-all duration-300 active:scale-95 overflow-hidden relative ${
              isSoldOut 
                ? 'bg-slate-200/10 text-slate-500 cursor-not-allowed border border-slate-200/20' 
                : (isPremium 
                    ? 'bg-white text-slate-900 hover:bg-blue-50 shadow-xl shadow-white/10' 
                    : 'bg-slate-900 hover:bg-blue-600 text-white shadow-xl shadow-slate-900/20')
            }`}
          >
            {isSoldOut ? <Ban className="w-4 h-4"/> : <span className="relative z-10">Select Option</span>}
            {!isSoldOut && <ChevronRight className="w-4 h-4 relative z-10 transition-transform group-hover:translate-x-1" />}
          </button>
        </div>
      </div>
    </div>
  );
}

// ----------------------------------------------------------------------
// 2. MAIN RESULTS CONTENT (AIRPORT SEPARATION LOGIC)
// ----------------------------------------------------------------------
function ResultsContent() {
  const searchParams = useSearchParams();
  
  const [companies, setCompanies] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [spotsLeft, setSpotsLeft] = useState<number | null>(null);
  
  const airport = searchParams.get("airport") || "Luton (LTN)";
  const dropoff = searchParams.get("dropoffDate") || "";
  const pickup = searchParams.get("pickupDate") || "";
  const serviceType = searchParams.get("type") || "meet-greet"; 
  const isHeathrow = airport.includes("Heathrow");

  useEffect(() => {
    async function getLiveRates() {
      const { data } = await supabase
        .from('companies')
        .select('*')
        .order('is_sold_out', { ascending: true });
      
      if (data) {
        const filtered = data.filter(c => {
          const formattedCategory = c.category
            ?.toLowerCase()
            .replace(/ & /g, '-')
            .replace(/\s+/g, '-')
            .trim();
            
          const isCorrectCategory = formattedCategory === serviceType.toLowerCase();
          const isCorrectAirport = isHeathrow ? c.operates_at_heathrow === true : c.operates_at_luton === true;

          return isCorrectCategory && isCorrectAirport;
        });
        setCompanies(filtered);
      }
      
      const inventory = await checkAvailability(airport, dropoff, pickup);
      setSpotsLeft(inventory.spotsLeft);
      setLoading(false);
    }
    getLiveRates();
  }, [serviceType, airport, dropoff, pickup]);

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
    window.location.href = `/checkout?${query.toString()}`;
  };

  if (loading) return (
    <div className="max-w-4xl mx-auto py-40 text-center flex flex-col items-center">
      <Loader2 className="w-12 h-12 animate-spin text-blue-600 mb-8" />
      <h2 className="text-2xl font-black uppercase tracking-[0.3em] text-slate-900">Validating Inventory</h2>
      <p className="text-slate-400 mt-3 font-medium">Securing live allocations for {isHeathrow ? 'Heathrow (LHR)' : 'Luton (LTN)'}...</p>
    </div>
  );

  return (
    <div className="max-w-[1000px] mx-auto px-4 py-8">
      {/* Sleek Stepper */}
      <div className="relative mb-16 max-w-2xl mx-auto px-2 mt-4">
        <div className="absolute top-1/2 left-0 w-full h-1 bg-slate-200 -translate-y-1/2 rounded-full"></div>
        <div className="absolute top-1/2 left-0 w-[15%] h-1 bg-blue-600 -translate-y-1/2 rounded-full shadow-[0_0_12px_rgba(37,99,235,0.6)] transition-all duration-1000"></div>
        <div className="relative z-10 flex justify-between items-center text-slate-900 font-bold">
          <div className="flex flex-col items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-blue-600 text-white flex items-center justify-center font-black shadow-lg shadow-blue-500/30 border-4 border-[#F8FAFC] text-lg transition-transform hover:scale-110 cursor-default">1</div>
            <span className="text-[10px] font-black uppercase text-blue-600 tracking-[0.2em]">Select</span>
          </div>
          <div className="flex flex-col items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-white text-slate-400 border-2 border-slate-200 flex items-center justify-center font-black text-lg">2</div>
            <span className="text-[10px] font-black uppercase text-slate-400 tracking-[0.2em]">Details</span>
          </div>
          <div className="flex flex-col items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-white text-slate-400 border-2 border-slate-200 flex items-center justify-center font-black text-lg">3</div>
            <span className="text-[10px] font-black uppercase text-slate-400 tracking-[0.2em]">Payment</span>
          </div>
        </div>
      </div>

      <div className="space-y-10">
        {companies.length === 0 ? (
          <div className="text-center py-24 bg-white rounded-[3rem] border border-dashed border-slate-300">
            <AlertCircle className="w-16 h-16 text-slate-200 mx-auto mb-6" />
            <h3 className="text-2xl font-black text-slate-900 mb-2 tracking-tight">No Active Providers</h3>
            <p className="text-slate-500 font-medium">This provider does not serve {isHeathrow ? 'Heathrow' : 'Luton'} for this category.</p>
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

// ----------------------------------------------------------------------
// 3. MAIN PAGE WRAPPER
// ----------------------------------------------------------------------
export default function ResultsPage() {
  return (
    <main className="min-h-screen bg-[#F8FAFC] font-sans pb-32 selection:bg-blue-200 selection:text-blue-900">
      {/* Top Navigation Bar */}
      <header className="sticky top-0 z-[100] bg-[#0A101D] border-b border-white/5 h-20 flex items-center px-8 justify-between shadow-2xl backdrop-blur-md">
        <Link href="/select-service" className="text-slate-400 hover:text-white transition-colors flex items-center gap-2 group">
          <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" /> 
          <span className="text-[10px] font-black uppercase tracking-[0.2em] hidden md:block">Back to Services</span>
        </Link>
        <Link href="/" className="flex items-center gap-2 text-white font-black tracking-tighter text-2xl uppercase absolute left-1/2 -translate-x-1/2 group">
          <Plane className="w-7 h-7 text-blue-500 rotate-45 group-hover:scale-110 transition-transform" />AEROPARK<span className="text-blue-500">DIRECT</span>
        </Link>
        <div className="text-right">
          <Suspense fallback={<div className="h-6 w-12 bg-slate-800 rounded animate-pulse" />}>
             <AirportTitle />
          </Suspense>
        </div>
      </header>

      <Suspense fallback={<div className="p-40 text-center text-slate-400 font-black uppercase tracking-[0.3em] animate-pulse">Initializing Interface...</div>}>
        <ResultsContent />
      </Suspense>
    </main>
  );
}

function AirportTitle() {
  const searchParams = useSearchParams();
  const airport = searchParams.get("airport") || "Luton (LTN)";
  const code = airport.includes("Heathrow") ? "LHR" : "LTN";
  return (
    <div className="flex flex-col items-end">
      <span className="text-base font-black text-white tracking-widest leading-none mb-1">{code}</span>
      <span className="text-[8px] font-black text-blue-500 uppercase tracking-[0.2em] leading-none">Selected</span>
    </div>
  );
}