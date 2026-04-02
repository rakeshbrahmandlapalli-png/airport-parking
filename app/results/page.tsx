"use client";

import { useSearchParams, useRouter } from "next/navigation";
import { 
  MapPin, 
  Clock, 
  ShieldCheck, 
  Star, 
  ChevronRight, 
  ThumbsUp,
  Info,
  ArrowLeft,
  Filter,
  Headphones,
  ShieldAlert,
  CalendarCheck,
  XCircle,
  Flame,
  ChevronDown
} from "lucide-react";
import Link from "next/link";
import { Suspense, useState } from "react";

function ResultsContent() {
  const searchParams = useSearchParams();
  const [expandedId, setExpandedId] = useState<number | null>(null);
  
  // 1. Capture search data
  const dropoff = searchParams.get("dropoffDate") || "";
  const pickup = searchParams.get("pickupDate") || "";

  // 🚀 ULTIMATE NAVIGATION FIX
  const handleBooking = (option: any) => {
    // Check if dates exist, otherwise notify the developer/user
    if (!dropoff || !pickup) {
      alert("Search dates are missing. Please return to the home page and re-select dates.");
      return;
    }

    // Manual URL Construction
    const targetUrl = `/checkout?type=${encodeURIComponent(option.name)}&price=${option.price}&dropoffDate=${dropoff}&pickupDate=${pickup}`;
    
    console.log("FORCE NAVIGATING TO:", targetUrl);
    
    // Using window.location.href as the absolute fallback for un-clickable buttons
    window.location.href = targetUrl;
  };

  const parkingOptions = [
    {
      id: 1,
      name: "XYZ Meet & Greet",
      type: "Priority VIP Service",
      rating: 4.9,
      reviews: 1420,
      price: 89.99,
      spacesLeft: 3,
      features: [
        "All Barrier Charges Included",
        "Terminal Car Park 1 (Level 3)",
        "Priority Terminal Access",
        "Vehicle Visual Health Check",
        "Flight Delay Monitoring"
      ],
      walkTime: "3 Mins",
      isRecommended: true,
      barriersIncluded: true,
      details: "Meet our representative at Terminal Car Park 1, Level 3. We use the dedicated blue-badge/priority lanes for the fastest possible handover. All airport entry and exit fees are covered by us."
    },
    {
      id: 2,
      name: "123 Meet & Greet",
      type: "Standard VIP Service",
      rating: 4.7,
      reviews: 980,
      price: 72.50,
      spacesLeft: 7,
      features: [
        "Excludes Terminal Barrier Fees",
        "Terminal-Side Handover",
        "24/7 Phone Support",
        "Secure Perimeter Fencing",
        "Vetted & Uniformed Drivers"
      ],
      walkTime: "5 Mins",
      isRecommended: false,
      barriersIncluded: false,
      details: "Drive to Terminal Car Park 1 and follow signs for Level 3 Row A. Please note that Luton Airport charges a standard entry/exit fee at the barrier which is not included in this booking price."
    }
  ];

  return (
    <div className="max-w-4xl mx-auto px-4 py-6 md:py-10">
      
      {/* 1. PROGRESS STEPS */}
      <div className="flex items-center justify-between mb-10 px-4">
        <div className="flex flex-col items-center gap-2 flex-1">
          <div className="h-1.5 w-full bg-blue-600 rounded-full"></div>
          <span className="text-[10px] font-black uppercase text-blue-600 tracking-widest">Selection</span>
        </div>
        <div className="w-8 flex justify-center text-slate-300">—</div>
        <div className="flex flex-col items-center gap-2 flex-1 opacity-40">
          <div className="h-1.5 w-full bg-slate-200 rounded-full"></div>
          <span className="text-[10px] font-black uppercase text-slate-500 tracking-widest">Details</span>
        </div>
        <div className="w-8 flex justify-center text-slate-300">—</div>
        <div className="flex flex-col items-center gap-2 flex-1 opacity-40">
          <div className="h-1.5 w-full bg-slate-200 rounded-full"></div>
          <span className="text-[10px] font-black uppercase text-slate-500 tracking-widest">Payment</span>
        </div>
      </div>

      {/* Urgency Alert */}
      <div className="mb-8 flex items-center gap-3 bg-orange-50 border border-orange-100 p-4 rounded-2xl text-orange-800">
        <Flame className="w-5 h-5 fill-orange-500 text-orange-500" />
        <p className="text-sm font-bold">Luton is 85% booked for your dates. Secure your space now.</p>
      </div>

      {/* Option Cards */}
      <div className="space-y-6">
        {parkingOptions.map((option) => (
          <div key={option.id} className={`relative bg-white rounded-[2.5rem] border overflow-hidden transition-all hover:shadow-xl group ${option.isRecommended ? 'border-blue-200 shadow-sm' : 'border-slate-200'}`}>
            
            {option.isRecommended && (
              <div className="absolute top-6 right-8 bg-blue-600 text-white text-[10px] font-black uppercase tracking-widest px-4 py-1.5 rounded-full shadow-lg z-10 animate-pulse">
                Highly Recommended
              </div>
            )}

            <div className="p-8 md:p-10 pb-6">
              <div className="flex flex-col md:flex-row justify-between gap-6">
                
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-3">
                    <div className="flex text-yellow-400">
                      {[...Array(5)].map((_, i) => <Star key={i} className="w-3.5 h-3.5 fill-current" />)}
                    </div>
                    <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">{option.reviews} Reviews</span>
                  </div>

                  <h2 className="text-2xl font-black text-slate-900 mb-2 group-hover:text-blue-600 transition-colors tracking-tight">
                    {option.name}
                  </h2>
                  <p className="text-sm text-slate-500 font-bold mb-6 flex items-center gap-2">
                    <ThumbsUp className="w-4 h-4 text-blue-500" /> {option.type}
                  </p>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-6">
                    {option.features.map((feat, i) => (
                      <div key={i} className="flex items-center gap-2 text-[11px] font-black text-slate-500 uppercase tracking-wide">
                        {feat.includes("Excludes") ? (
                          <XCircle className="w-3.5 h-3.5 text-slate-300" />
                        ) : (
                          <CheckCircle className={`w-3.5 h-3.5 ${feat.includes("Barrier") ? 'text-green-500' : 'text-blue-500'}`} />
                        )}
                        {feat}
                      </div>
                    ))}
                  </div>
                </div>

                <div className="w-full md:w-56 flex flex-col justify-center items-center md:items-end border-t md:border-t-0 md:border-l border-slate-100 pt-6 md:pt-0 md:pl-10">
                  <div className="text-center md:text-right mb-6">
                    <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-1">Total Stay</p>
                    <div className="text-4xl font-black text-slate-900 tracking-tighter">
                      £{option.price.toFixed(2)}
                    </div>
                    
                    <div className="flex flex-col items-center md:items-end gap-2 mt-2">
                      {option.barriersIncluded ? (
                        <span className="text-[10px] font-bold text-green-600 bg-green-50 px-2 py-0.5 rounded-md flex items-center gap-1">
                          <ShieldAlert className="w-3 h-3" /> All Fees Included
                        </span>
                      ) : (
                        <span className="text-[10px] font-bold text-slate-400 bg-slate-100 px-2 py-0.5 rounded-md">
                          Standard Rate
                        </span>
                      )}
                    </div>
                  </div>

                  {/* 🚀 FIXED BUTTON WITH FORCE-OVERRIDE STYLES */}
                  <button 
                    onClick={() => handleBooking(option)}
                    className="relative z-50 w-full h-14 bg-blue-600 hover:bg-slate-900 text-white font-black rounded-2xl flex items-center justify-center gap-2 shadow-lg active:scale-95 transition-all text-sm uppercase tracking-widest cursor-pointer"
                    style={{ pointerEvents: 'auto', display: 'flex' }}
                  >
                    BOOK NOW <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
            
            {/* Info Toggle Section */}
            <div className="border-t border-slate-50 bg-slate-50/50">
              <button 
                onClick={() => setExpandedId(expandedId === option.id ? null : option.id)}
                className="w-full py-4 px-8 flex items-center justify-center gap-2 text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-blue-600 transition-colors"
              >
                {expandedId === option.id ? 'Hide Details' : 'View Arrival Instructions'}
                <ChevronDown className={`w-3.5 h-3.5 transition-transform ${expandedId === option.id ? 'rotate-180' : ''}`} />
              </button>
              {expandedId === option.id && (
                <div className="px-10 pb-8 pt-2">
                   <div className="p-6 bg-white rounded-2xl border border-slate-100 shadow-inner">
                    <div className="flex items-center gap-3 mb-3">
                      <div className="w-8 h-8 bg-blue-50 rounded-lg flex items-center justify-center">
                        <MapPin className="w-4 h-4 text-blue-600" />
                      </div>
                      <p className="text-[10px] font-black uppercase tracking-widest text-slate-900">Meeting Location</p>
                    </div>
                    <p className="text-xs font-bold text-slate-500 leading-relaxed">
                      Luton Airport (LTN). Terminal Car Park 1, Level 3, Row A. Look for the <strong className="text-blue-600 font-black">{option.name}</strong> representative. {option.details}
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Support Block */}
      <div className="mt-12 p-10 rounded-[3rem] bg-slate-900 text-white relative overflow-hidden">
        <div className="flex flex-col md:flex-row items-center justify-between gap-8 relative z-10 text-center md:text-left">
          <div className="flex flex-col md:flex-row items-center gap-6">
             <div className="w-16 h-16 bg-white/10 rounded-3xl flex items-center justify-center shadow-xl">
               <Headphones className="w-8 h-8 text-blue-400" />
             </div>
             <div>
               <p className="font-black text-xl mb-1 text-white">Need help choosing?</p>
               <p className="text-sm text-slate-400 font-medium leading-relaxed max-w-sm">Our Luton-based VIP team is standing by to help with your terminal handover details.</p>
             </div>
          </div>
          <button className="w-full md:w-auto px-10 py-4 bg-white text-slate-900 font-black rounded-2xl text-xs uppercase tracking-widest hover:bg-blue-600 hover:text-white transition-all shadow-xl">
            Live Assistance
          </button>
        </div>
      </div>
    </div>
  );
}

export default function ResultsPage() {
  return (
    <main className="min-h-screen bg-slate-50 font-sans">
      <header className="sticky top-0 z-[100] bg-white/80 backdrop-blur-md border-b border-slate-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 md:px-6 h-20 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/" className="p-2 hover:bg-slate-100 rounded-full transition-colors">
              <ArrowLeft className="w-5 h-5 text-slate-600" />
            </Link>
            <div className="flex flex-col">
              <span className="text-[10px] font-black uppercase tracking-widest text-blue-600">Luton Airport (LTN)</span>
              <div className="text-xs font-bold text-slate-400 tracking-tight">Premium Meet & Greet Search</div>
            </div>
          </div>
        </div>
      </header>

      <Suspense fallback={<div className="p-10 text-center font-bold text-slate-900 animate-pulse">Verifying availability...</div>}>
        <ResultsContent />
      </Suspense>
    </main>
  );
}

function CheckCircle({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="20 6 9 17 4 12" />
    </svg>
  );
}