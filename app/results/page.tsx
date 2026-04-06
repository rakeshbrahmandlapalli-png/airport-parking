"use client";

import { useSearchParams } from "next/navigation";
import { 
  MapPin, 
  Clock, 
  ShieldCheck, 
  Star, 
  ChevronRight, 
  ThumbsUp,
  ArrowLeft,
  Headphones,
  ShieldAlert,
  XCircle,
  Flame,
  ChevronDown,
  Plane,
  Calendar,
  AlertTriangle
} from "lucide-react";
import Link from "next/link";
import { Suspense, useState, useMemo, useEffect } from "react";

// Server action for inventory checking
import { checkAvailability } from "../actions";

function ResultsContent() {
  const searchParams = useSearchParams();
  const [expandedId, setExpandedId] = useState<number | null>(null);
  
  // Inventory States
  const [isChecking, setIsChecking] = useState(true);
  const [isAvailable, setIsAvailable] = useState(true);
  const [spotsLeft, setSpotsLeft] = useState<number | null>(null);
  
  const airport = searchParams.get("airport") || "Luton (LTN)";
  const dropoff = searchParams.get("dropoffDate") || "";
  const dropoffTime = searchParams.get("dropoffTime") || ""; // 🔥 ADDED TIME
  const pickup = searchParams.get("pickupDate") || "";
  const pickupTime = searchParams.get("pickupTime") || ""; // 🔥 ADDED TIME
  const isHeathrow = airport.includes("Heathrow");

  // Check database capacity on page load
  useEffect(() => {
    async function fetchInventory() {
      if (!dropoff || !pickup) {
        setIsChecking(false);
        return;
      }
      const inventory = await checkAvailability(airport, dropoff, pickup);
      setIsAvailable(inventory.isAvailable);
      setSpotsLeft(inventory.spotsLeft);
      setIsChecking(false);
    }
    fetchInventory();
  }, [airport, dropoff, pickup]);

  const duration = useMemo(() => {
    if (!dropoff || !pickup) return 1;
    const start = new Date(dropoff);
    const end = new Date(pickup);
    const diffTime = end.getTime() - start.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays <= 0 ? 1 : diffDays;
  }, [dropoff, pickup]);

  const handleBooking = (option: any) => {
    if (!dropoff || !pickup) {
      alert("Search dates are missing. Please return to the home page.");
      return;
    }
    // 🔥 UPDATED TARGET URL TO INCLUDE TIMES
    const targetUrl = `/checkout?type=${encodeURIComponent(option.name)}&price=${option.dailyRate}&dropoffDate=${dropoff}&dropoffTime=${dropoffTime}&pickupDate=${pickup}&pickupTime=${pickupTime}&airport=${encodeURIComponent(airport)}`;
    window.location.href = targetUrl;
  };

  const parkingOptions = [
    {
      id: 1,
      name: isHeathrow ? "Heathrow Gold Meet & Greet" : "VIP Executive Valet",
      type: "Priority VIP Service",
      rating: 4.9,
      reviews: isHeathrow ? 2105 : 1420,
      dailyRate: isHeathrow ? 35.00 : 28.50,
      features: [
        "All Barrier Charges Included",
        isHeathrow ? "Terminal 2, 3, 4 & 5 Access" : "Terminal Car Park 1 (Level 3)",
        "Priority Terminal Access",
        "Vehicle Visual Health Check",
        "Flight Delay Monitoring"
      ],
      isRecommended: true,
      barriersIncluded: true,
      details: isHeathrow 
        ? "Follow signs for Short Stay Passenger Drop-off. Our driver will meet you at the dedicated Off-Airport Meet & Greet area for your specific terminal."
        : "Meet our representative at Terminal Car Park 1, Level 3. We use dedicated priority lanes for the fastest possible handover."
    },
    {
      id: 2,
      name: isHeathrow ? "Heathrow Standard Valet" : "Standard Meet & Greet",
      type: "Standard Service",
      rating: 4.7,
      reviews: 980,
      dailyRate: isHeathrow ? 28.00 : 21.00,
      features: [
        "Excludes Terminal Barrier Fees",
        "Terminal-Side Handover",
        "24/7 Phone Support",
        "Secure Perimeter Fencing",
        "Vetted & Uniformed Drivers"
      ],
      isRecommended: false,
      barriersIncluded: false,
      details: isHeathrow
        ? "Drive to the Short Stay Car Park. Please note that Heathrow's £5 terminal drop-off fee is not included in this rate."
        : "Drive to Terminal Car Park 1 and follow signs for Level 3 Row A. Airport entry/exit fees are not included."
    }
  ];

  // 1. PREMIUM LOADING STATE
  if (isChecking) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-32 text-center flex flex-col items-center">
        <div className="relative w-20 h-20 mb-8">
          <div className="absolute inset-0 border-4 border-blue-100 rounded-full"></div>
          <div className="absolute inset-0 border-4 border-blue-600 rounded-full border-t-transparent animate-spin"></div>
          <Plane className="absolute inset-0 m-auto w-6 h-6 text-blue-600 animate-pulse" />
        </div>
        <h2 className="text-2xl font-black text-slate-900 tracking-tight mb-2">Accessing Secure Inventory...</h2>
        <p className="text-slate-500 font-medium">Checking live terminal availability for your dates.</p>
      </div>
    );
  }

  // 2. PREMIUM SOLD OUT STATE
  if (!isAvailable) {
    return (
      <div className="max-w-xl mx-auto px-4 py-20 text-center">
        <div className="w-24 h-24 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-8 shadow-inner border border-red-100">
          <XCircle className="w-10 h-10 text-red-500" />
        </div>
        <h2 className="text-4xl font-black text-slate-900 mb-4 tracking-tight">Fully Booked</h2>
        <p className="text-slate-500 font-medium leading-relaxed mb-10">
          Due to high demand, we have no remaining VIP spots at <span className="font-bold text-slate-900">{airport}</span> for these dates. 
        </p>
        <Link href="/" className="inline-flex items-center gap-2 bg-slate-900 text-white px-8 py-4 rounded-xl font-black uppercase tracking-widest text-xs hover:bg-blue-600 shadow-xl shadow-slate-900/20 transition-all active:scale-95">
          <ArrowLeft className="w-4 h-4" /> Change Travel Dates
        </Link>
      </div>
    );
  }

  // 3. RESULTS VIEW
  return (
    <div className="max-w-4xl mx-auto px-4 py-8 md:py-12">
      
      {/* High Demand Urgency Badge */}
      {spotsLeft !== null && spotsLeft <= 10 && (
        <div className="mb-8 bg-red-500 border border-red-600 p-4 rounded-2xl flex items-center justify-center gap-3 text-white shadow-[0_0_20px_rgba(239,68,68,0.3)] animate-pulse">
          <Flame className="w-5 h-5 fill-white" />
          <span className="text-xs font-black uppercase tracking-[0.15em]">
            High Demand: Only {spotsLeft} {spotsLeft === 1 ? 'spot' : 'spots'} remaining for your dates!
          </span>
        </div>
      )}

      {/* Stepper */}
      <div className="flex items-center justify-between mb-10 px-2 md:px-8">
        <div className="flex flex-col items-center gap-2 flex-1">
          <div className="h-1 w-full bg-blue-600 rounded-full"></div>
          <span className="text-[10px] font-black uppercase text-blue-600 tracking-[0.2em]">Select</span>
        </div>
        <div className="w-8 flex justify-center text-slate-300">—</div>
        <div className="flex flex-col items-center gap-2 flex-1 opacity-30">
          <div className="h-1 w-full bg-slate-300 rounded-full"></div>
          <span className="text-[10px] font-black uppercase text-slate-500 tracking-[0.2em]">Details</span>
        </div>
        <div className="w-8 flex justify-center text-slate-300">—</div>
        <div className="flex flex-col items-center gap-2 flex-1 opacity-30">
          <div className="h-1 w-full bg-slate-300 rounded-full"></div>
          <span className="text-[10px] font-black uppercase text-slate-500 tracking-[0.2em]">Pay</span>
        </div>
      </div>

      {/* Itinerary Summary */}
      <div className="mb-10 flex items-center justify-between bg-white border border-slate-200 p-6 rounded-[2rem] shadow-sm">
        <div className="flex items-center gap-5">
          <div className="w-12 h-12 bg-blue-50 rounded-2xl flex items-center justify-center border border-blue-100">
             <Calendar className="w-5 h-5 text-blue-600" />
          </div>
          <div>
            <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-1">Booking Duration</p>
            <p className="text-base font-black text-slate-900">{duration} {duration === 1 ? 'Day' : 'Days'} Total Stay</p>
          </div>
        </div>
        <div className="hidden md:block text-right border-l border-slate-100 pl-6">
           <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-1">Terminal</p>
           <p className="text-base font-black text-slate-900">{airport}</p>
        </div>
      </div>

      {/* Packages Grid */}
      <div className="space-y-6">
        {parkingOptions.map((option) => {
          const totalPrice = option.dailyRate * duration;
          const isPremium = option.isRecommended;

          return (
            <div key={option.id} className={`relative rounded-[2rem] border overflow-hidden transition-all duration-300 ${isPremium ? 'bg-slate-900 border-blue-500/30 shadow-2xl transform md:-translate-x-2 md:w-[calc(100%+16px)]' : 'bg-white border-slate-200 shadow-sm hover:border-blue-300'}`}>
              
              {isPremium && (
                <>
                  <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-400 to-blue-600"></div>
                  <div className="absolute top-6 right-6 md:right-10 bg-blue-600 text-white text-[9px] font-black uppercase tracking-widest px-4 py-1.5 rounded-full shadow-lg z-10">
                    Most Popular
                  </div>
                  <div className="absolute -top-24 -right-24 w-64 h-64 bg-blue-500/10 rounded-full blur-[80px] pointer-events-none"></div>
                </>
              )}

              <div className="p-8 md:p-10 pb-6 relative z-10">
                <div className="flex flex-col md:flex-row justify-between gap-8">
                  
                  {/* Left Side: Info */}
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-4">
                      <div className="flex text-yellow-400">
                        {[...Array(5)].map((_, i) => <Star key={i} className="w-3.5 h-3.5 fill-current drop-shadow-sm" />)}
                      </div>
                      <span className={`text-[10px] font-bold uppercase tracking-widest ${isPremium ? 'text-slate-400' : 'text-slate-500'}`}>
                        {option.reviews} Verified Reviews
                      </span>
                    </div>
                    
                    <h2 className={`text-3xl font-black mb-2 tracking-tight ${isPremium ? 'text-white' : 'text-slate-900'}`}>
                      {option.name}
                    </h2>
                    
                    <p className={`text-sm font-bold mb-8 flex items-center gap-2 ${isPremium ? 'text-blue-400' : 'text-slate-500'}`}>
                      <ThumbsUp className={`w-4 h-4 ${isPremium ? 'text-blue-400' : 'text-blue-500'}`} /> {option.type}
                    </p>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-2">
                      {option.features.map((feat, i) => (
                        <div key={i} className={`flex items-start gap-3 text-[11px] font-black uppercase tracking-wide leading-snug ${isPremium ? 'text-slate-300' : 'text-slate-600'}`}>
                          {feat.includes("Excludes") 
                            ? <XCircle className="w-4 h-4 text-slate-400/50 flex-shrink-0" /> 
                            : <CheckCircle className={`w-4 h-4 flex-shrink-0 ${isPremium ? 'text-blue-400' : 'text-blue-500'}`} />
                          }
                          {feat}
                        </div>
                      ))}
                    </div>
                  </div>
                  
                  {/* Right Side: Pricing & CTA */}
                  <div className={`w-full md:w-64 flex flex-col justify-center items-center md:items-end border-t md:border-t-0 md:border-l pt-8 md:pt-0 md:pl-10 ${isPremium ? 'border-white/10' : 'border-slate-100'}`}>
                    <div className="text-center md:text-right mb-6">
                      <p className={`text-[10px] font-black uppercase tracking-widest mb-1 ${isPremium ? 'text-slate-400' : 'text-slate-400'}`}>Total Stay Cost</p>
                      <div className={`text-5xl font-black tracking-tighter ${isPremium ? 'text-white' : 'text-slate-900'}`}>
                        £{totalPrice.toFixed(2)}
                      </div>
                      <p className={`text-[10px] font-bold uppercase mt-2 tracking-widest ${isPremium ? 'text-blue-400' : 'text-blue-600'}`}>
                        Just £{option.dailyRate.toFixed(2)} / Day
                      </p>
                    </div>
                    <button 
                      onClick={() => handleBooking(option)} 
                      className={`relative z-50 w-full h-14 font-black rounded-xl flex items-center justify-center gap-2 shadow-lg active:scale-95 transition-all text-sm uppercase tracking-widest cursor-pointer ${isPremium ? 'bg-blue-600 hover:bg-blue-500 text-white shadow-blue-900/50' : 'bg-slate-900 hover:bg-blue-600 text-white'}`}
                    >
                      SELECT <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>

                </div>
              </div>
              
              {/* Expandable Meeting Details */}
              <div className={`border-t ${isPremium ? 'border-white/10 bg-slate-900/50' : 'border-slate-100 bg-slate-50/50'}`}>
                <button 
                  onClick={() => setExpandedId(expandedId === option.id ? null : option.id)} 
                  className={`w-full py-5 px-8 flex items-center justify-center gap-2 text-[10px] font-black uppercase tracking-widest transition-colors ${isPremium ? 'text-slate-400 hover:text-white' : 'text-slate-500 hover:text-blue-600'}`}
                >
                  {expandedId === option.id ? 'Close Instructions' : `Meeting point at ${airport}`}
                  <ChevronDown className={`w-3.5 h-3.5 transition-transform ${expandedId === option.id ? 'rotate-180' : ''}`} />
                </button>
                
                {expandedId === option.id && (
                  <div className="px-6 md:px-10 pb-8 pt-2">
                     <div className={`p-6 rounded-2xl border ${isPremium ? 'bg-slate-800/50 border-slate-700/50' : 'bg-white border-slate-200 shadow-sm'}`}>
                      <div className="flex items-center gap-3 mb-3">
                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${isPremium ? 'bg-blue-500/20' : 'bg-blue-50'}`}>
                          <MapPin className={`w-4 h-4 ${isPremium ? 'text-blue-400' : 'text-blue-600'}`} />
                        </div>
                        <p className={`text-[10px] font-black uppercase tracking-widest ${isPremium ? 'text-white' : 'text-slate-900'}`}>{airport} Instructions</p>
                      </div>
                      <p className={`text-xs font-medium leading-relaxed ${isPremium ? 'text-slate-300' : 'text-slate-600'}`}>
                        {option.details}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ----------------------------------------------------------------------
// MAIN PAGE LAYOUT (The Header)
// ----------------------------------------------------------------------
export default function ResultsPage() {
  return (
    <main className="min-h-screen bg-[#F8FAFC] font-sans pb-24">
      {/* PREMIUM DARK NAVBAR */}
      <header className="sticky top-0 z-[100] bg-slate-950 border-b border-white/10 shadow-sm">
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2 text-slate-400 hover:text-white transition-colors group">
            <ArrowLeft className="w-5 h-5 group-hover:-translate-x-1 transition-transform" />
            <span className="text-[10px] font-black uppercase tracking-widest hidden md:block">Modify Search</span>
          </Link>
          
          <Link href="/" className="flex items-center gap-2 text-white font-black tracking-tighter text-xl uppercase absolute left-1/2 -translate-x-1/2">
            <Plane className="w-6 h-6 text-blue-500 rotate-45" /> AIRPORT<span className="text-blue-500">VIP</span>
          </Link>

          <div className="flex flex-col text-right">
             <Suspense fallback={<span className="text-xs text-slate-500">...</span>}>
               <AirportTitle />
             </Suspense>
          </div>
        </div>
      </header>

      <Suspense fallback={<div className="p-20 text-center font-black uppercase tracking-widest text-slate-400 animate-pulse">Initializing...</div>}>
        <ResultsContent />
      </Suspense>
    </main>
  );
}

function AirportTitle() {
  const searchParams = useSearchParams();
  const airport = searchParams.get("airport") || "Luton (LTN)";
  const isHeathrow = airport.includes("Heathrow");
  // Just grabbing the code (LTN or LHR) for a sleek display
  const code = isHeathrow ? "LHR" : "LTN";
  
  return (
    <>
      <span className="text-sm font-black text-white tracking-widest">{code}</span>
      <span className="text-[9px] font-bold text-blue-500 uppercase tracking-widest">Selected</span>
    </>
  );
}

// Helper SVG for standardizing the checkmarks
function CheckCircle({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="20 6 9 17 4 12" />
    </svg>
  );
}