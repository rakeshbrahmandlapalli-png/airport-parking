"use client";

import Link from "next/link";
import { ArrowLeft, Plane, Mail, MessageSquare, Clock, ShieldCheck, Zap, Send } from "lucide-react";
import { useState } from "react";

export default function ContactPage() {
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    // Logic for your info@aeroparkdirect.co.uk email will go here
    setTimeout(() => setIsSubmitting(false), 2000);
  };

  return (
    <main className="min-h-screen bg-[#0A101D] selection:bg-blue-500 selection:text-white overflow-x-hidden">
      {/* Dynamic Background Elements */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-[10%] -left-[10%] w-[40%] h-[40%] bg-blue-600/10 blur-[120px] rounded-full" />
        <div className="absolute top-[20%] -right-[5%] w-[30%] h-[30%] bg-indigo-600/10 blur-[120px] rounded-full" />
      </div>

      {/* Premium Header */}
      <nav className="relative z-50 bg-[#0A101D]/80 backdrop-blur-md border-b border-white/5 h-20 flex items-center px-6 sticky top-0">
        <div className="max-w-7xl mx-auto w-full flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2 text-slate-400 hover:text-white transition-all font-bold text-xs uppercase tracking-widest group">
            <ArrowLeft className="w-4 h-4 transition-transform group-hover:-translate-x-1" /> Back
          </Link>
          <div className="flex items-center gap-2 text-white font-black tracking-tighter text-2xl uppercase">
            <Plane className="w-6 h-6 text-blue-500 rotate-45" /> AERO<span className="text-blue-500">PARK</span>
          </div>
          <div className="hidden md:flex items-center gap-4">
            <div className="flex items-center gap-2 px-3 py-1 bg-emerald-500/10 border border-emerald-500/20 rounded-full">
              <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" />
              <span className="text-[10px] font-black text-emerald-500 uppercase tracking-widest">Systems Online</span>
            </div>
          </div>
        </div>
      </nav>

      <div className="relative z-10 max-w-7xl mx-auto px-6 py-12 md:py-24 grid grid-cols-1 lg:grid-cols-12 gap-16 items-start">
        
        {/* LEFT COLUMN: BRAND & INTEL */}
        <div className="lg:col-span-5">
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-blue-600/10 text-blue-400 border border-blue-500/20 rounded-full text-[10px] font-black uppercase tracking-[0.2em] mb-8">
            <Zap className="w-3 h-3 fill-current" /> Priority Support
          </div>
          
          <h1 className="text-5xl md:text-7xl font-black text-white mb-8 uppercase tracking-tighter leading-[0.9]">
            Mission <br/><span className="text-blue-500">Control.</span>
          </h1>
          
          <p className="text-xl text-slate-400 font-medium mb-12 max-w-md leading-relaxed">
            Direct access to the AeroPark support team. No bots, no delays—just rapid human assistance for your travel.
          </p>
          
          <div className="grid grid-cols-1 gap-4">
            <div className="group p-6 bg-white/5 border border-white/10 rounded-[2rem] hover:bg-white/10 transition-all duration-500">
              <div className="flex items-start justify-between mb-4">
                <div className="w-12 h-12 bg-blue-600 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-blue-600/20">
                  <Mail className="w-5 h-5" />
                </div>
                <span className="text-[10px] font-black text-blue-500 uppercase tracking-widest">Active Now</span>
              </div>
              <p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.15em] mb-1">Direct Line</p>
              <p className="text-xl font-black text-white tracking-tight">info@aeroparkdirect.co.uk</p>
            </div>

            <div className="p-6 bg-white/5 border border-white/10 rounded-[2rem]">
              <div className="flex items-center gap-4 mb-4">
                <div className="w-10 h-10 bg-slate-800 rounded-xl flex items-center justify-center text-slate-400">
                  <ShieldCheck className="w-5 h-5" />
                </div>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.15em]">Secure Infrastructure</p>
              </div>
              <p className="text-sm text-slate-500 font-medium leading-relaxed">
                All communications are encrypted and monitored for booking security.
              </p>
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN: THE TERMINAL FORM */}
        <div className="lg:col-span-7 bg-slate-900/40 backdrop-blur-xl rounded-[3rem] p-8 md:p-14 border border-white/10 shadow-2xl relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-blue-600/5 blur-[80px] -mr-32 -mt-32" />
          
          <div className="relative z-10">
            <div className="mb-10">
              <h3 className="text-2xl font-black text-white uppercase tracking-tight">New Inquiry</h3>
              <p className="text-slate-500 text-sm font-bold mt-1 uppercase tracking-widest">Est. Response: 15-45 Mins</p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 ml-1">Full Identity</label>
                  <input 
                    type="text" 
                    required 
                    className="w-full bg-white/5 border border-white/10 rounded-2xl px-5 py-4 font-bold text-white outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all placeholder:text-slate-700" 
                    placeholder="Enter your name" 
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 ml-1">Digital Mail</label>
                  <input 
                    type="email" 
                    required 
                    className="w-full bg-white/5 border border-white/10 rounded-2xl px-5 py-4 font-bold text-white outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all placeholder:text-slate-700" 
                    placeholder="name@email.com" 
                  />
                </div>
              </div>
              
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 ml-1">Booking Reference</label>
                <input 
                  type="text" 
                  className="w-full bg-white/5 border border-white/10 rounded-2xl px-5 py-4 font-bold text-white outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all placeholder:text-slate-700" 
                  placeholder="e.g. APD-10293 (If applicable)" 
                />
              </div>
              
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 ml-1">Inquiry Details</label>
                <textarea 
                  rows={5} 
                  required 
                  className="w-full bg-white/5 border border-white/10 rounded-2xl px-5 py-4 font-bold text-white outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all resize-none placeholder:text-slate-700" 
                  placeholder="Tell us how we can assist your journey..."
                />
              </div>

              <button 
                disabled={isSubmitting}
                type="submit" 
                className="group w-full h-18 bg-blue-600 hover:bg-blue-500 disabled:bg-slate-800 text-white font-black rounded-2xl shadow-2xl shadow-blue-600/20 active:scale-[0.98] transition-all uppercase tracking-[0.3em] text-[10px] py-5 flex items-center justify-center gap-3"
              >
                {isSubmitting ? (
                  <Clock className="w-4 h-4 animate-spin" />
                ) : (
                  <>
                    Initialize Transfer <Send className="w-3 h-3 transition-transform group-hover:translate-x-1 group-hover:-translate-y-1" />
                  </>
                )}
              </button>
            </form>
          </div>
        </div>
      </div>
    </main>
  );
}