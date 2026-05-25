"use client";
import { useState, useEffect } from "react";
import { Zap, X } from "lucide-react";

// 🟢 We tell the component it is going to receive "slotsClaimed" as a number
export default function LaunchNotification({ slotsClaimed }: { slotsClaimed: number }) {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    // Reveal after a short delay
    const timer = setTimeout(() => setIsVisible(true), 2500);
    return () => clearTimeout(timer);
  }, []);

  if (!isVisible) return null;

  return (
    <div className="fixed bottom-6 right-6 z-[999] max-w-[320px] animate-in slide-in-from-bottom-8 md:slide-in-from-right-8 fade-in duration-700">
      <div className="bg-[#0F1523] border border-blue-500/30 p-4 md:p-5 rounded-2xl shadow-[0_15px_30px_-5px_rgba(0,0,0,0.5)] flex items-start gap-4 relative overflow-hidden group">
        <div className="absolute top-0 right-0 w-24 h-24 bg-blue-600/10 rounded-full blur-[40px] pointer-events-none"></div>

        <div className="w-10 h-10 md:w-12 md:h-12 bg-blue-600 rounded-xl flex items-center justify-center shrink-0 shadow-inner">
          <Zap className="w-5 h-5 md:w-6 md:h-6 text-white animate-pulse" />
        </div>
        
        <div className="flex-1 pr-4">
          <h4 className="text-white font-black text-[10px] md:text-xs uppercase tracking-widest leading-tight">Founding Member Offer</h4>
          {/* 🟢 DYNAMIC SLOT MATH: 15 minus the database value (6) = 9 */}
          <p className="text-[10px] text-slate-400 font-bold mt-1.5 leading-relaxed">
            Only <span className="text-amber-400">{15 - slotsClaimed} slots left</span> to claim a lifetime 5% discount!
          </p>
        </div>
        
        <button 
          onClick={() => setIsVisible(false)} 
          className="absolute top-3 right-3 text-slate-500 hover:text-white bg-slate-800/50 hover:bg-slate-700 p-1.5 rounded-lg transition-all"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}