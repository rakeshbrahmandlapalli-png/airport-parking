"use client";
import { useState, useEffect } from "react";
import { Zap, CheckCircle2, AlertOctagon } from "lucide-react";

interface TimerProps {
  hours?: number;
  slotsClaimed: number;
  totalSlots?: number;
}

export default function LaunchTimer({ hours = 72, slotsClaimed, totalSlots = 15 }: TimerProps) {
  const [timeLeft, setTimeLeft] = useState<number | null>(null);

  useEffect(() => {
    let endTime = localStorage.getItem("launch_timer_end");
    if (!endTime) {
      const now = new Date().getTime();
      endTime = (now + hours * 60 * 60 * 1000).toString();
      localStorage.setItem("launch_timer_end", endTime);
    }

    const interval = setInterval(() => {
      const now = new Date().getTime();
      const distance = parseInt(endTime!) - now;
      setTimeLeft(distance > 0 ? distance : 0);
    }, 1000);
    
    return () => clearInterval(interval);
  }, [hours]);

  if (timeLeft === null) return null; // Wait for hydration

  const hoursLeft = Math.floor((timeLeft % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  const minsLeft = Math.floor((timeLeft % (1000 * 60 * 60)) / (1000 * 60));
  const secsLeft = Math.floor((timeLeft % (1000 * 60)) / 1000);

  const slotsLeft = Math.max(0, totalSlots - slotsClaimed);
  const isCritical = slotsLeft <= 3;
  const percentage = Math.min(100, (slotsClaimed / totalSlots) * 100);

  return (
    <div className="relative bg-[#0F1523]/90 backdrop-blur-sm border border-blue-500/20 rounded-3xl p-6 md:p-8 shadow-[0_20px_40px_-15px_rgba(0,0,0,0.5)] mb-10 overflow-hidden group">
      {/* Animated Top Border */}
      <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-600 via-indigo-400 to-blue-600 opacity-80"></div>
      
      {/* Background Ambience */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(37,99,235,0.1),transparent_70%)] pointer-events-none"></div>

      <div className="flex flex-col items-center relative z-10" aria-live="polite">
        <div className="flex items-center gap-2 text-blue-400 font-black uppercase tracking-[0.2em] text-[10px] md:text-xs mb-6">
          <Zap className="w-4 h-4 fill-current animate-pulse" />
          Founding Member Launch
        </div>

        {/* Digital Clock Display */}
        <div className="flex items-center gap-3 md:gap-5 mb-8">
          {[
            { v: hoursLeft, l: "Hours" },
            { v: minsLeft, l: "Mins" },
            { v: secsLeft, l: "Secs" }
          ].map((item, i) => (
            <div key={i} className="flex flex-col items-center">
              <div className="bg-[#1A2235] text-white font-black text-4xl sm:text-5xl px-5 py-4 rounded-2xl border border-white/10 tabular-nums shadow-[0_4px_12px_rgba(0,0,0,0.3)] backdrop-blur-md">
                {item.v.toString().padStart(2, '0')}
              </div>
              <span className="text-[9px] font-black text-slate-500 uppercase tracking-[0.2em] mt-3">{item.l}</span>
            </div>
          ))}
        </div>

        {/* Lifetime Perk */}
        <div className="flex items-center justify-center gap-3 text-emerald-400 bg-emerald-500/5 px-6 py-3 rounded-xl border border-emerald-500/10 mb-8 w-full max-w-sm text-center">
           <CheckCircle2 className="w-5 h-5 shrink-0" />
           <p className="text-[10px] md:text-[11px] font-black uppercase tracking-widest leading-relaxed">
             Founding Members: <span className="text-white underline decoration-emerald-500/30 underline-offset-4">5% Lifetime Discount</span>
           </p>
        </div>

        {/* Scarcity Bar */}
        <div className="w-full max-w-sm bg-[#131A2B] p-4 rounded-2xl border border-white/5 shadow-inner">
          <div className="flex justify-between text-[10px] font-black uppercase tracking-widest mb-3 items-center">
            <span className={isCritical ? "text-amber-400 flex items-center gap-1.5 animate-pulse" : "text-slate-400"}>
              {isCritical && <AlertOctagon className="w-3 h-3" />}
              {isCritical ? `Only ${slotsLeft} Spots Left!` : "Availability"}
            </span>
            <span className="text-white tabular-nums">{slotsClaimed} / {totalSlots}</span>
          </div>
          
          <div className="w-full h-2.5 bg-slate-900 rounded-full overflow-hidden shadow-inner">
            <div 
              className={`h-full rounded-full transition-all duration-1000 ease-out ${
                isCritical 
                  ? "bg-amber-500 shadow-[0_0_15px_rgba(245,158,11,0.5)]" 
                  : "bg-emerald-500 shadow-[0_0_15px_rgba(16,185,129,0.3)]"
              }`}
              style={{ width: `${percentage}%` }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}