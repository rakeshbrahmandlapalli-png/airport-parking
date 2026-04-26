"use client";

import { CarFront, Building2, ShieldCheck, CheckCircle2 } from "lucide-react";
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
            Meet <strong>Aero</strong>, your digital concierge. Aero scans 100+ data points to ensure your provider is secure, vetted, and verified.
          </p>
          <div className="pt-6">
             <div className="inline-flex items-center gap-3 px-6 py-3 bg-slate-900 rounded-2xl">
                <div className="w-2 h-2 rounded-full bg-emerald-500 animate-ping"></div>
                <span className="text-white text-[10px] font-black uppercase tracking-widest">Aero is Online</span>
             </div>
          </div>
        </div>

        {/* ANIMATION SIDE */}
        <div 
          ref={containerRef}
          className="lg:col-span-7 relative h-[500px] w-full rounded-[4rem] bg-slate-950 shadow-3xl overflow-hidden flex items-center justify-center border border-white/5"
        >
          {/* Cyber Grid Background */}
          <div className="absolute inset-0 opacity-20 bg-[url('https://www.transparenttextures.com/patterns/grid-me.png')] pointer-events-none"></div>
          
          {/* 1. THE MASCOT: AERO */}
          <div className="relative z-30 flex flex-col items-center animate-float pointer-events-none">
            {/* Aero's Body */}
            <div className="w-32 h-32 md:w-40 md:h-40 rounded-[2.5rem] bg-gradient-to-br from-blue-600 to-blue-800 border-4 border-white/10 shadow-[0_0_50px_rgba(37,99,235,0.4)] flex items-center justify-center relative">
              
              {/* Aero's Digital Face (The Eyes that move) */}
              <div className="flex gap-4">
                <div ref={eyeLRef} className="w-3 h-7 bg-white rounded-full shadow-[0_0_15px_white] transition-none"></div>
                <div ref={eyeRRef} className="w-3 h-7 bg-white rounded-full shadow-[0_0_15px_white] transition-none"></div>
              </div>

              {/* Scanning Beams */}
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[300px] h-[300px]">
                 <div className="absolute inset-0 border border-blue-500/20 rounded-full animate-ping"></div>
                 <div className="absolute inset-0 border border-dashed border-blue-400/10 rounded-full animate-spin [animation-duration:10s]"></div>
              </div>
            </div>

            <div className="mt-8 w-20 h-2 bg-blue-500/20 blur-md rounded-full animate-pulse"></div>
          </div>

          {/* 2. THE VETTED PROVIDERS (Orbiting) */}
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="absolute animate-orbit [animation-duration:12s]">
              <div className="p-4 bg-slate-900/80 backdrop-blur-xl border border-white/10 rounded-2xl shadow-2xl flex flex-col items-center gap-1 group">
                <CarFront className="w-6 h-6 text-blue-400" />
                <CheckCircle2 className="w-3 h-3 text-emerald-500" />
              </div>
            </div>

            <div className="absolute animate-orbit [animation-duration:15s] [animation-delay:-5s]">
              <div className="p-4 bg-slate-900/80 backdrop-blur-xl border border-white/10 rounded-2xl shadow-2xl flex flex-col items-center gap-1">
                <Building2 className="w-6 h-6 text-purple-400" />
                <CheckCircle2 className="w-3 h-3 text-emerald-500" />
              </div>
            </div>

            <div className="absolute animate-orbit [animation-duration:18s] [animation-delay:-10s]">
              <div className="p-4 bg-slate-900/80 backdrop-blur-xl border border-white/10 rounded-2xl shadow-2xl flex flex-col items-center gap-1">
                <ShieldCheck className="w-6 h-6 text-emerald-400" />
                <CheckCircle2 className="w-3 h-3 text-emerald-500" />
              </div>
            </div>
          </div>

          {/* Bottom HUD */}
          <div className="absolute bottom-10 px-8 py-3 bg-black/40 backdrop-blur-xl border border-white/5 rounded-2xl pointer-events-none">
             <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] flex items-center gap-3">
               <span className="w-2 h-2 rounded-full bg-blue-500"></span> 
               Aero Search Engine: Active
             </span>
          </div>
        </div>

      </div>
    </section>
  );
}