"use client";

import { CarFront, Building2, ShieldCheck, CheckCircle2, Star } from "lucide-react";
import { useEffect, useRef } from "react";

export default function AeroFeature() {
  const eyeLRef = useRef<HTMLDivElement>(null);
  const eyeRRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!eyeLRef.current || !eyeRRef.current || !containerRef.current) return;

      const rect = containerRef.current.getBoundingClientRect();
      
      // Calculate mouse position relative to the center of the Aero box
      const centerX = rect.left + rect.width / 2;
      const centerY = rect.top + rect.height / 2;
      
      // Calculate distance from center (-1 to 1)
      const x = (e.clientX - centerX) / (rect.width / 2);
      const y = (e.clientY - centerY) / (rect.height / 2);

      // Capped movement for eyes
      const moveX = Math.max(-12, Math.min(12, x * 15));
      const moveY = Math.max(-12, Math.min(12, y * 15));

      eyeLRef.current.style.transform = `translate(${moveX}px, ${moveY}px)`;
      eyeRRef.current.style.transform = `translate(${moveX}px, ${moveY}px)`;
    };

    window.addEventListener("mousemove", handleMouseMove);
    return () => window.removeEventListener("mousemove", handleMouseMove);
  }, []);

  return (
    <section className="py-24 bg-white overflow-hidden">
      <div className="max-w-7xl mx-auto px-6 grid grid-cols-1 lg:grid-cols-12 gap-16 items-center">
        
        {/* TEXT SIDE */}
        <div className="lg:col-span-5 space-y-6 flex flex-col items-center text-center lg:items-start lg:text-left">
          <h2 className="text-5xl md:text-7xl font-black text-slate-900 leading-[0.85] tracking-tighter uppercase">
            Smart <br/>
            <span className="text-blue-600">Vetting.</span>
          </h2>
          <p className="text-xl text-slate-500 font-medium leading-relaxed max-w-sm">
            Meet <strong>Aero</strong>, your digital concierge. Aero scans 100+ data points to ensure your provider is secure, and automatically applies your VIP loyalty discounts.
          </p>
          <div className="pt-6">
             <div className="inline-flex items-center gap-3 px-6 py-3 bg-slate-900 rounded-2xl">
                <div className="w-2 h-2 rounded-full bg-emerald-500 animate-ping"></div>
                <span className="text-white text-[10px] font-black uppercase tracking-widest">Aero is Online</span>
             </div>
          </div>
        </div>

        {/* ANIMATION SIDE — radar sits directly on the white page (no card) */}
        <div
          ref={containerRef}
          className="lg:col-span-7 relative h-[400px] md:h-[500px] w-full overflow-hidden flex items-center justify-center"
        >
          {/* 0. GROUNDING — soft radial depth + faint concentric rings (no box) */}
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none" aria-hidden="true">
            <div className="absolute w-[480px] h-[480px] rounded-full bg-[radial-gradient(circle,rgba(15,23,42,0.08)_0%,rgba(15,23,42,0.03)_45%,transparent_72%)]"></div>
            <div className="absolute w-[300px] h-[300px] rounded-full border border-slate-200"></div>
            <div className="absolute w-[440px] h-[440px] rounded-full border border-slate-100"></div>
          </div>

          {/* 1. THE MASCOT: AERO */}
          <div className="relative z-30 flex flex-col items-center animate-float pointer-events-none">
            {/* Aero's Body */}
            <div className="w-28 h-28 md:w-40 md:h-40 rounded-2xl bg-blue-600 border border-blue-500/20 shadow-[0_0_60px_rgba(37,99,235,0.35)] flex items-center justify-center relative">

              {/* Aero's Digital Face (The Eyes that move) */}
              <div className="flex gap-4">
                <div ref={eyeLRef} className="w-3 h-7 bg-white rounded-full shadow-[0_0_15px_white] transition-none"></div>
                <div ref={eyeRRef} className="w-3 h-7 bg-white rounded-full shadow-[0_0_15px_white] transition-none"></div>
              </div>

              {/* Scanning Beams — stronger so the radar reads on white */}
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[300px] h-[300px]">
                 <div className="absolute inset-0 border-2 border-blue-500/50 rounded-full animate-ping"></div>
                 <div className="absolute inset-0 border border-dashed border-blue-400/50 rounded-full animate-spin [animation-duration:10s]"></div>
              </div>
            </div>

            <div className="mt-8 w-20 h-2 bg-blue-500/20 blur-md rounded-full animate-pulse"></div>
          </div>

          {/* 2. THE VETTED PROVIDERS & FEATURES (Orbiting) — clean light chips */}
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="absolute animate-orbit [animation-duration:12s]">
              <div className="p-4 bg-white border border-slate-200 rounded-2xl shadow-md flex flex-col items-center gap-1">
                <CarFront className="w-6 h-6 text-blue-600" />
                <CheckCircle2 className="w-3 h-3 text-emerald-500" />
              </div>
            </div>

            <div className="absolute animate-orbit [animation-duration:15s] [animation-delay:-5s]">
              <div className="p-4 bg-white border border-slate-200 rounded-2xl shadow-md flex flex-col items-center gap-1">
                <Building2 className="w-6 h-6 text-indigo-600" />
                <CheckCircle2 className="w-3 h-3 text-emerald-500" />
              </div>
            </div>

            <div className="absolute animate-orbit [animation-duration:18s] [animation-delay:-10s]">
              <div className="p-4 bg-white border border-slate-200 rounded-2xl shadow-md flex flex-col items-center gap-1">
                <ShieldCheck className="w-6 h-6 text-emerald-600" />
                <CheckCircle2 className="w-3 h-3 text-emerald-500" />
              </div>
            </div>

            {/* VIP Loyalty Orbit Icon */}
            <div className="absolute animate-orbit [animation-duration:20s] [animation-delay:-7s]">
              <div className="p-4 bg-white border border-slate-200 rounded-2xl shadow-md flex flex-col items-center gap-1">
                <Star className="w-6 h-6 text-amber-500" />
                <CheckCircle2 className="w-3 h-3 text-emerald-500" />
              </div>
            </div>
          </div>

          {/* Bottom HUD — solid dark chip (high contrast on white) */}
          <div className="absolute bottom-6 md:bottom-10 px-6 py-3 bg-slate-900 rounded-2xl pointer-events-none">
             <span className="text-[10px] font-black text-slate-300 uppercase tracking-[0.3em] flex items-center gap-3">
               <span className="w-2 h-2 rounded-full bg-blue-500"></span>
               Aero Search Engine: Active
             </span>
          </div>
        </div>

      </div>
    </section>
  );
}