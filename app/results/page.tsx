"use client";

import { useState, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import BookingStepper from "../../components/BookingStepper"; // 🔥 Import the Stepper
import { 
  Check, 
  ShieldCheck, 
  Star, 
  Car, 
  ArrowRight, 
  CalendarDays, 
  Clock,
  Zap,
  Loader2
} from "lucide-react";

function ResultsContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [loadingId, setLoadingId] = useState<string | null>(null);
  
  const dropoffDate = searchParams.get("dropoffDate") || "2026-03-28";
  const pickupDate = searchParams.get("pickupDate") || "2026-03-31";

  const tiers = [
    { 
      id: "abc", 
      name: "abc meet & greet", 
      price: 8, 
      icon: ShieldCheck, 
      tag: "Value", 
      glow: "from-emerald-400/20 to-teal-400/20",
      btnColor: "bg-slate-900 hover:bg-emerald-600" 
    },
    { 
      id: "xyz", 
      name: "xyz meet & greet", 
      price: 12, 
      icon: Star, 
      tag: "Popular", 
      glow: "from-blue-600/30 to-cyan-400/30",
      btnColor: "bg-blue-600 hover:bg-blue-700" 
    },
    { 
      id: "123", 
      name: "123 meet & greet", 
      price: 22, 
      icon: Car, 
      tag: "Luxury", 
      glow: "from-indigo-600/30 to-purple-500/30",
      btnColor: "bg-slate-900 hover:bg-indigo-600" 
    },
  ];

  const handleSelect = (tierId: string, tierName: string, price: number) => {
    setLoadingId(tierId);
    setTimeout(() => {
      router.push(`/checkout?type=${encodeURIComponent(tierName)}&dropoffDate=${dropoffDate}&pickupDate=${pickupDate}&price=${price}`);
    }, 800);
  };

  return (
    <main className="min-h-screen bg-slate-50 pb-24">
      {/* INTERACTIVE HEADER */}
      <div className="bg-slate-900/95 backdrop-blur-md text-white py-6 px-6 sticky top-0 z-50 border-b border-white/10 shadow-2xl">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <div className="flex gap-8 items-center bg-white/5 px-6 py-2 rounded-2xl border border-white/10">
            <div className="flex items-center gap-3">
              <CalendarDays className="w-4 h-4 text-blue-400" />
              <span className="text-xs font-black uppercase tracking-widest">{dropoffDate}</span>
            </div>
            <div className="w-px h-4 bg-white/20"></div>
            <div className="flex items-center gap-3">
              <Clock className="w-4 h-4 text-blue-400" />
              <span className="text-xs font-black uppercase tracking-widest">{pickupDate}</span>
            </div>
          </div>
          <button onClick={() => router.push('/')} className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 hover:text-white transition-colors">
            Modify Search
          </button>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-12">
        
        {/* 🔥 STEPPER INTEGRATION */}
        <div className="mb-12">
            <BookingStepper currentStep={1} />
        </div>

        <div className="mb-16">
          <h1 className="text-5xl font-black text-slate-900 tracking-tighter mb-4">Choose your space.</h1>
          <p className="text-slate-400 font-bold text-lg tracking-tight">Vetted, secure parking found for your journey.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-10">
          {tiers.map((tier) => (
            <div key={tier.id} className="relative group">
              <div className={`absolute -inset-4 bg-gradient-to-tr ${tier.glow} rounded-[4rem] blur-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-700 pointer-events-none`}></div>

              <div className={`relative bg-white rounded-[3.2rem] p-10 shadow-xl border transition-all duration-500 h-full flex flex-col hover:-translate-y-2 ${
                tier.id === 'xyz' ? 'border-blue-500/20 scale-105 z-10' : 'border-slate-100' 
              }`}>
                
                <div className="flex justify-between items-start mb-10">
                  <div className={`px-5 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest ${
                    tier.id === 'xyz' ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/30' : 'bg-slate-100 text-slate-500' 
                  }`}>
                    {tier.tag}
                  </div>
                  <div className="flex items-center gap-1 text-orange-500 font-black text-[10px] uppercase animate-pulse">
                    <Zap className="w-3 h-3 fill-current" /> High Demand
                  </div>
                </div>

                <div className={`w-16 h-16 rounded-[1.5rem] flex items-center justify-center mb-8 shadow-inner transition-transform group-hover:rotate-6 duration-500 ${
                  tier.id === 'xyz' ? 'bg-blue-50 text-blue-600' : 'bg-slate-50 text-slate-400' 
                }`}>
                  <tier.icon className="w-8 h-8" />
                </div>

                <h2 className="text-2xl font-black text-slate-900 mb-2 capitalize">{tier.name}</h2>
                <div className="flex items-baseline gap-1 mb-10">
                  <span className="text-6xl font-black text-slate-900 tracking-tighter">£{tier.price}</span>
                  <span className="text-slate-400 font-bold text-2xl">.00</span>
                  <span className="text-slate-400 text-[10px] ml-2 uppercase font-black tracking-widest">per day</span>
                </div>

                <div className="space-y-5 mb-12 flex-1">
                  {["24/7 Security Patrols", "Instant Confirmation", "Free Shuttle Service"].map((feat, i) => (
                    <div key={i} className="flex items-center gap-4 text-slate-700 font-bold text-sm">
                      <div className="w-6 h-6 bg-emerald-50 text-emerald-500 rounded-full flex items-center justify-center shrink-0">
                        <Check className="w-3.5 h-3.5" strokeWidth={4} />
                      </div>
                      {feat}
                    </div>
                  ))}
                </div>

                <button 
                  onClick={() => handleSelect(tier.id, tier.name, tier.price)} 
                  disabled={loadingId !== null}
                  className={`
                    relative overflow-hidden w-full py-6 rounded-[2rem] font-black text-xl shadow-2xl 
                    transition-all duration-300 flex items-center justify-center gap-3 active:scale-95
                    ${tier.btnColor} text-white
                    ${loadingId === tier.id ? 'opacity-90 cursor-wait' : ''}
                  `}
                >
                  {loadingId === tier.id ? (
                    <>
                      <Loader2 className="w-6 h-6 animate-spin" />
                      <span className="tracking-tight">Processing...</span>
                    </>
                  ) : (
                    <>
                      <span>Select Plan</span>
                      <ArrowRight className="w-6 h-6 group-hover:translate-x-2 transition-transform" />
                    </>
                  )}
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}

export default function ResultsPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 text-slate-400">
        <Loader2 className="w-10 h-10 animate-spin mb-4 text-blue-600" />
        <p className="font-bold tracking-widest uppercase text-xs">Loading available spaces...</p>
      </div>
    }>
      <ResultsContent />
    </Suspense>
  );
}