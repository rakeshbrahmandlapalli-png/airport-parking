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
  Calendar
} from "lucide-react";
import Link from "next/link";
import { Suspense, useState, useMemo } from "react";

function ResultsContent() {
  const searchParams = useSearchParams();
  const [expandedId, setExpandedId] = useState<number | null>(null);
  
  const airport = searchParams.get("airport") || "Luton (LTN)";
  const dropoff = searchParams.get("dropoffDate") || "";
  const pickup = searchParams.get("pickupDate") || "";
  const isHeathrow = airport.includes("Heathrow");

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
    const targetUrl = `/checkout?type=${encodeURIComponent(option.name)}&price=${option.dailyRate}&dropoffDate=${dropoff}&pickupDate=${pickup}&airport=${encodeURIComponent(airport)}`;
    window.location.href = targetUrl;
  };

  const parkingOptions = [
    {
      id: 1,
      name: isHeathrow ? "Heathrow Gold Meet & Greet" : "XYZ Meet & Greet",
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
      name: isHeathrow ? "Heathrow Standard Valet" : "123 Meet & Greet",
      type: "Standard VIP Service",
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

  return (
    <div className="max-w-4xl mx-auto px-4 py-6 md:py-10">
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

      <div className="mb-8 flex items-center justify-between bg-white border border-slate-200 p-5 rounded-[2rem] shadow-sm">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-blue-50 rounded-2xl flex items-center justify-center">
             <Calendar className="w-6 h-6 text-blue-600" />
          </div>
          <div>
            <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Booking Period</p>
            <p className="text-sm font-black text-slate-900">{duration} {duration === 1 ? 'Day' : 'Days'} Total</p>
          </div>
        </div>
        <div className="hidden md:block text-right">
           <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Airport</p>
           <p className="text-sm font-black text-blue-600 uppercase">{airport}</p>
        </div>
      </div>

      <div className="space-y-6">
        {parkingOptions.map((option) => {
          const totalPrice = option.dailyRate * duration;
          return (
            <div key={option.id} className={`relative bg-white rounded-[2.5rem] border overflow-hidden transition-all hover:shadow-2xl group ${option.isRecommended ? 'border-blue-200 shadow-md' : 'border-slate-200'}`}>
              {option.isRecommended && (
                <div className="absolute top-6 right-8 bg-blue-600 text-white text-[10px] font-black uppercase tracking-widest px-4 py-1.5 rounded-full shadow-lg z-10">
                  Premium Choice
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
                          {feat.includes("Excludes") ? <XCircle className="w-3.5 h-3.5 text-slate-300" /> : <CheckCircle className={`w-3.5 h-3.5 ${feat.includes("Barrier") ? 'text-green-500' : 'text-blue-500'}`} />}
                          {feat}
                        </div>
                      ))}
                    </div>
                  </div>
                  <div className="w-full md:w-56 flex flex-col justify-center items-center md:items-end border-t md:border-t-0 md:border-l border-slate-100 pt-6 md:pt-0 md:pl-10">
                    <div className="text-center md:text-right mb-6">
                      <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-1">Total Stay Cost</p>
                      <div className="text-4xl font-black text-slate-900 tracking-tighter">
                        £{totalPrice.toFixed(2)}
                      </div>
                      <p className="text-[10px] font-bold text-blue-500 uppercase mt-1">
                        £{option.dailyRate.toFixed(2)} / Day
                      </p>
                    </div>
                    <button onClick={() => handleBooking(option)} className="relative z-50 w-full h-14 bg-blue-600 hover:bg-slate-900 text-white font-black rounded-2xl flex items-center justify-center gap-2 shadow-lg active:scale-95 transition-all text-sm uppercase tracking-widest cursor-pointer">
                      SELECT <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
              <div className="border-t border-slate-50 bg-slate-50/50">
                <button onClick={() => setExpandedId(expandedId === option.id ? null : option.id)} className="w-full py-4 px-8 flex items-center justify-center gap-2 text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-blue-600 transition-colors">
                  {expandedId === option.id ? 'Close Instructions' : `Meeting point at ${airport}`}
                  <ChevronDown className={`w-3.5 h-3.5 transition-transform ${expandedId === option.id ? 'rotate-180' : ''}`} />
                </button>
                {expandedId === option.id && (
                  <div className="px-10 pb-8 pt-2">
                     <div className="p-6 bg-white rounded-3xl border border-slate-100 shadow-inner">
                      <div className="flex items-center gap-3 mb-3">
                        <div className="w-8 h-8 bg-blue-50 rounded-lg flex items-center justify-center">
                          <MapPin className="w-4 h-4 text-blue-600" />
                        </div>
                        <p className="text-[10px] font-black uppercase tracking-widest text-slate-900">{airport} Meeting Point</p>
                      </div>
                      <p className="text-xs font-bold text-slate-500 leading-relaxed">{option.details}</p>
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
              <div className="flex items-center gap-1.5">
                <Plane className="w-3 h-3 text-blue-600" />
                <Suspense fallback={<span>Loading...</span>}><AirportTitle /></Suspense>
              </div>
              <div className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Compare Live Parking Rates</div>
            </div>
          </div>
        </div>
      </header>
      <Suspense fallback={<div className="p-10 text-center font-bold text-slate-900 animate-pulse">Calculating rates...</div>}>
        <ResultsContent />
      </Suspense>
    </main>
  );
}

function AirportTitle() {
  const searchParams = useSearchParams();
  const airport = searchParams.get("airport") || "Luton (LTN)";
  return <span className="text-sm font-black text-slate-900 uppercase tracking-tight">{airport}</span>;
}

function CheckCircle({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="20 6 9 17 4 12" />
    </svg>
  );
}