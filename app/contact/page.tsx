"use client";

import Link from "next/link";
import { 
  ArrowLeft, Plane, Mail, MessageSquare, 
  Clock, ShieldCheck, Zap, Send, CheckCircle2,
  Globe, ArrowUpRight
} from "lucide-react";
import { useState, useEffect } from "react";

export default function ContactPage() {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSent, setIsSent] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    // Simulation of transmission to info@aeroparkdirect.co.uk
    setTimeout(() => {
      setIsSubmitting(false);
      setIsSent(true);
    }, 2000);
  };

  return (
    <main className="min-h-[100dvh] bg-[#05080F] text-white selection:bg-blue-500/30 overflow-x-hidden font-sans">
      
      {/* BACKGROUND AMBIENCE */}
      <div className="fixed inset-0 z-0">
        <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-blue-600/10 blur-[120px] rounded-full animate-pulse" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-indigo-600/10 blur-[120px] rounded-full" />
        <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-[0.03] pointer-events-none" />
      </div>

      {/* NAVIGATION */}
      <nav className="relative z-50 bg-[#05080F]/80 backdrop-blur-md border-b border-white/5 sticky top-0 h-16 md:h-20 flex items-center px-4 md:px-8">
        <div className="max-w-7xl mx-auto w-full flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2 text-slate-400 hover:text-white transition-all text-[10px] md:text-xs font-black uppercase tracking-[0.2em] group">
            <ArrowLeft className="w-4 h-4 transition-transform group-hover:-translate-x-1" /> 
            <span className="hidden xs:inline">Return to Hangar</span>
            <span className="xs:hidden">Back</span>
          </Link>
          
          <Link href="/" className="flex items-center gap-1.5 md:gap-2 font-black tracking-tighter text-lg md:text-2xl uppercase">
            <Plane className="w-5 h-5 md:w-6 md:h-6 text-blue-500 rotate-45" /> 
            AERO<span className="text-blue-500">PARK</span>
          </Link>

          <div className="flex items-center gap-2 px-2.5 py-1 bg-emerald-500/10 border border-emerald-500/20 rounded-full">
            <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" />
            <span className="text-[8px] md:text-[9px] font-black text-emerald-500 uppercase tracking-widest">Live</span>
          </div>
        </div>
      </nav>

      <div className="relative z-10 max-w-7xl mx-auto px-4 md:px-8 py-8 md:py-16">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 md:gap-16 items-start">
          
          {/* LEFT: INFORMATION CLUSTER */}
          <div className="lg:col-span-5 space-y-8 md:space-y-12">
            <div className="space-y-4">
              <div className="inline-flex items-center gap-2 px-3 py-1 bg-blue-600/10 text-blue-400 border border-blue-500/20 rounded-full text-[10px] font-black uppercase tracking-[0.2em]">
                <Globe className="w-3 h-3" /> Global Operations
              </div>
              <h1 className="text-5xl md:text-8xl font-black uppercase tracking-tighter leading-[0.85] italic">
                Get In <br />
                <span className="text-blue-500 not-italic">Touch.</span>
              </h1>
              <p className="text-slate-400 text-sm md:text-lg font-medium max-w-md leading-relaxed">
                Experience priority assistance for your Luton and Heathrow bookings. Our digital response team is standing by.
              </p>
            </div>

            {/* CONTACT CARDS */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-1 gap-4">
              <div className="group p-6 bg-white/[0.03] border border-white/10 rounded-[2rem] hover:bg-white/[0.07] transition-all duration-300">
                <div className="flex items-center gap-4 mb-4">
                  <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center shadow-lg shadow-blue-600/20">
                    <Mail className="w-5 h-5 text-white" />
                  </div>
                  <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Official Channel</span>
                </div>
                <p className="text-lg md:text-xl font-black tracking-tight text-white break-all">info@aeroparkdirect.co.uk</p>
              </div>

              <div className="p-6 bg-white/[0.03] border border-white/10 rounded-[2rem]">
                <div className="flex items-center gap-4 mb-4">
                  <div className="w-10 h-10 bg-slate-800 rounded-xl flex items-center justify-center">
                    <Clock className="w-5 h-5 text-slate-400" />
                  </div>
                  <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Average Wait</span>
                </div>
                <p className="text-lg md:text-xl font-black text-white italic tracking-tight">Rapid Response <span className="text-blue-500">&lt; 45m</span></p>
              </div>
            </div>
          </div>

          {/* RIGHT: THE INQUIRY TERMINAL */}
          <div className="lg:col-span-7 w-full">
            <div className="bg-gradient-to-br from-white/[0.08] to-transparent backdrop-blur-2xl rounded-[2.5rem] md:rounded-[3.5rem] p-6 md:p-12 border border-white/10 shadow-2xl relative overflow-hidden">
              
              {isSent ? (
                <div className="py-20 text-center animate-in fade-in zoom-in duration-500">
                  <div className="w-20 h-20 bg-emerald-500/20 text-emerald-500 rounded-full flex items-center justify-center mx-auto mb-6">
                    <CheckCircle2 className="w-10 h-10" />
                  </div>
                  <h3 className="text-3xl font-black uppercase tracking-tighter mb-2">Message Received</h3>
                  <p className="text-slate-400 font-bold uppercase text-[10px] tracking-widest">Our team will reach out to your inbox shortly.</p>
                  <button onClick={() => setIsSent(false)} className="mt-8 text-blue-500 font-black uppercase text-xs tracking-widest hover:underline">Send another update</button>
                </div>
              ) : (
                <>
                  <div className="mb-10 flex justify-between items-end">
                    <div>
                      <h3 className="text-2xl md:text-3xl font-black uppercase tracking-tighter">Inquiry Terminal</h3>
                      <p className="text-[10px] font-black text-blue-500 uppercase tracking-[0.2em] mt-1">Status: Ready for input</p>
                    </div>
                    <Zap className="w-6 h-6 text-blue-500/30 hidden sm:block" />
                  </div>

                  <form onSubmit={handleSubmit} className="space-y-5 md:space-y-6">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                      <div className="space-y-2">
                        <label className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-500 ml-1">Identity</label>
                        <input 
                          type="text" 
                          required 
                          className="w-full bg-white/[0.05] border border-white/10 rounded-2xl px-5 py-4 font-bold text-white outline-none focus:border-blue-500 focus:bg-white/[0.08] transition-all placeholder:text-slate-700 text-sm md:text-base" 
                          placeholder="Your Name" 
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-500 ml-1">Secure Email</label>
                        <input 
                          type="email" 
                          required 
                          className="w-full bg-white/[0.05] border border-white/10 rounded-2xl px-5 py-4 font-bold text-white outline-none focus:border-blue-500 focus:bg-white/[0.08] transition-all placeholder:text-slate-700 text-sm md:text-base" 
                          placeholder="Email Address" 
                        />
                      </div>
                    </div>
                    
                    <div className="space-y-2">
                      <label className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-500 ml-1">Booking Ref <span className="text-slate-700">(Optional)</span></label>
                      <input 
                        type="text" 
                        className="w-full bg-white/[0.05] border border-white/10 rounded-2xl px-5 py-4 font-bold text-white outline-none focus:border-blue-500 focus:bg-white/[0.08] transition-all placeholder:text-slate-700 text-sm md:text-base" 
                        placeholder="e.g. APD-99210" 
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <label className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-500 ml-1">Message Content</label>
                      <textarea 
                        rows={4} 
                        required 
                        className="w-full bg-white/[0.05] border border-white/10 rounded-2xl px-5 py-4 font-bold text-white outline-none focus:border-blue-500 focus:bg-white/[0.08] transition-all resize-none placeholder:text-slate-700 text-sm md:text-base" 
                        placeholder="How can our crew assist you?"
                      />
                    </div>

                    <button 
                      disabled={isSubmitting}
                      type="submit" 
                      className="group w-full bg-blue-600 hover:bg-blue-500 disabled:bg-slate-800 text-white font-black rounded-2xl shadow-[0_15px_30px_rgba(37,99,235,0.2)] active:scale-[0.97] transition-all uppercase tracking-[0.25em] text-[10px] md:text-xs py-5 flex items-center justify-center gap-3 relative overflow-hidden"
                    >
                      {isSubmitting ? (
                        <div className="flex items-center gap-2">
                          <Clock className="w-4 h-4 animate-spin" /> Transmitting...
                        </div>
                      ) : (
                        <>
                          Send Message <Send className="w-3.5 h-3.5 transition-transform group-hover:translate-x-1 group-hover:-translate-y-1" />
                        </>
                      )}
                    </button>
                  </form>
                </>
              )}
            </div>
            
            {/* FOOTER INFO */}
            <div className="mt-8 flex flex-wrap gap-6 justify-center lg:justify-start">
              <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-slate-500">
                <ShieldCheck className="w-4 h-4 text-blue-500" /> End-to-End Encryption
              </div>
              <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-slate-500">
                <ArrowUpRight className="w-4 h-4 text-blue-500" /> Direct Admin Support
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}