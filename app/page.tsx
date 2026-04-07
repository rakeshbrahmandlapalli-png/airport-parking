"use client";

import { useState, useEffect } from "react";
import { 
  Plane, 
  User, 
  Calendar, 
  Clock, 
  PlaneTakeoff,
  ShieldCheck,
  CreditCard,
  MapPin,
  CarFront,
  Star,
  Menu,
  X,
  ChevronRight,
  Info,
  ChevronDown,
  CheckCircle2,
  Tag
} from "lucide-react";
import Link from "next/link";
import MapModal from "@/components/MapModal";

export default function HomePage() {
  const [now, setNow] = useState(new Date());
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isMapOpen, setIsMapOpen] = useState(false);
  
  // --- SEARCH STATES ---
  const [airport, setAirport] = useState("Luton (LTN)");
  const [dropoffDate, setDropoffDate] = useState("");
  const [dropoffTime, setDropoffTime] = useState("");
  const [pickupDate, setPickupDate] = useState("");
  const [pickupTime, setPickupTime] = useState("18:00");
  
  const [isLoaded, setIsLoaded] = useState(false); 

  useEffect(() => {
    setTimeout(() => setIsLoaded(true), 100); 
    
    const today = new Date();
    setDropoffDate(today.toISOString().split("T")[0]);
    setDropoffTime(today.toTimeString().slice(0, 5));
    setPickupDate(today.toISOString().split("T")[0]);
    
    const timer = setInterval(() => setNow(new Date()), 60000);
    return () => clearInterval(timer);
  }, []);

  const todayStr = now.toISOString().split("T")[0];
  const currentTimeStr = now.toTimeString().slice(0, 5);

  const handleSearch = (e: React.FormEvent) => {
    if (dropoffDate === todayStr && dropoffTime < currentTimeStr) {
      e.preventDefault();
      alert("Drop-off time cannot be in the past!");
      return;
    }
    const start = new Date(`${dropoffDate}T${dropoffTime}`);
    const end = new Date(`${pickupDate}T${pickupTime}`);
    if (end <= start) {
      e.preventDefault();
      alert("Pick-up time must be after your Drop-off time!");
      return;
    }
  };

  useEffect(() => {
    if (isMenuOpen || isMapOpen) document.body.style.overflow = 'hidden';
    else document.body.style.overflow = 'unset';
  }, [isMenuOpen, isMapOpen]);

  return (
    <main className="min-h-screen bg-[#F8FAFC] font-sans selection:bg-blue-600 selection:text-white overflow-x-hidden">
      
      {/* 1. PREMIUM NAVBAR */}
      <nav className={`fixed top-0 w-full z-50 bg-white/70 backdrop-blur-xl border-b border-white/20 shadow-[0_4px_30px_rgba(0,0,0,0.03)] transition-all duration-1000 ${isLoaded ? 'translate-y-0 opacity-100' : '-translate-y-full opacity-0'}`}>
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          
          <Link href="/" className="flex items-center gap-2 text-blue-600 font-black tracking-tighter text-2xl uppercase z-50 cursor-pointer group">
            <Plane className="w-7 h-7 rotate-45 group-hover:-translate-y-1 group-hover:translate-x-1 transition-transform duration-300" /> 
            AIRPORT<span className="text-slate-900">VIP</span>
          </Link>
          
          <div className="hidden md:flex items-center gap-8">
            {["Services", "How it works", "Reviews"].map((item) => (
              <a key={item} href={`#${item.toLowerCase().replace(/ /g, '-')}`} className="text-[11px] font-black uppercase tracking-[0.15em] text-slate-500 hover:text-slate-900 transition-colors relative group">
                {item}
                <span className="absolute -bottom-2 left-0 w-0 h-[2px] bg-blue-600 transition-all duration-300 group-hover:w-full"></span>
              </a>
            ))}

            <div className="h-6 w-px bg-slate-200 ml-2"></div>

            <Link href="/manage" className="flex items-center gap-2 text-[11px] font-black uppercase tracking-[0.15em] text-white bg-slate-900 px-6 py-3 rounded-full hover:bg-blue-600 hover:shadow-[0_10px_20px_-10px_rgba(37,99,235,0.6)] transition-all duration-300 active:scale-95 ml-2">
              <User className="w-4 h-4" /> Manage Booking
            </Link>
          </div>

          <button onClick={() => setIsMenuOpen(true)} className="md:hidden z-50 p-2 text-slate-900 active:scale-90 transition-transform">
            <Menu className="w-6 h-6" />
          </button>
        </div>

        return (
    <main className="min-h-screen bg-[#F8FAFC] font-sans selection:bg-blue-600 selection:text-white overflow-x-hidden">
      
      <nav className={`fixed top-0 w-full z-[100] bg-white/80 backdrop-blur-xl border-b border-slate-200 transition-all duration-1000 ${isLoaded ? 'translate-y-0 opacity-100' : '-translate-y-full opacity-0'}`}>
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2 text-blue-600 font-black tracking-tighter text-2xl uppercase group">
            <Plane className="w-7 h-7 rotate-45 group-hover:translate-x-1 transition-transform" /> 
            AIRPORT<span className="text-slate-900">VIP</span>
          </Link>
          
          <div className="hidden md:flex items-center gap-8">
            <a href="#services" className="text-[11px] font-black uppercase tracking-widest text-slate-500 hover:text-blue-600">Services</a>
            <a href="#how-it-works" className="text-[11px] font-black uppercase tracking-widest text-slate-500 hover:text-blue-600">How it works</a>
            <a href="#reviews" className="text-[11px] font-black uppercase tracking-widest text-slate-500 hover:text-blue-600">Reviews</a>
            <div className="h-6 w-px bg-slate-200 ml-2"></div>
            <Link href="/manage" className="text-[11px] font-black uppercase tracking-widest text-white bg-slate-900 px-6 py-3 rounded-full hover:bg-blue-600 transition-all">
              Manage Booking
            </Link>
          </div>

          <button onClick={() => setIsMenuOpen(true)} className="md:hidden p-2 text-slate-900 bg-slate-100 rounded-xl">
            <Menu className="w-6 h-6" />
          </button>
        </div>

        {/* MOBILE MENU - FIXED & POLISHED */}
        <div className={`fixed inset-0 z-[1000] bg-white transition-all duration-500 flex flex-col ${isMenuOpen ? 'opacity-100 translate-x-0 visible' : 'opacity-0 translate-x-full invisible pointer-events-none'}`}>
          <div className="h-20 px-6 flex items-center justify-between border-b border-slate-100">
            <div className="flex items-center gap-2 text-blue-600 font-black tracking-tighter text-2xl uppercase">
              <Plane className="w-7 h-7 rotate-45" /> AIRPORTVIP
            </div>
            <button onClick={() => setIsMenuOpen(false)} className="p-3 text-slate-900 bg-slate-100 rounded-full">
              <X className="w-6 h-6" />
            </button>
          </div>
          <div className="flex flex-col px-8 pt-10 gap-8 flex-grow">
            <a href="#services" onClick={() => setIsMenuOpen(false)} className="flex items-center justify-between text-3xl font-black text-slate-900">Services <ChevronRight /></a>
            <a href="#how-it-works" onClick={() => setIsMenuOpen(false)} className="flex items-center justify-between text-3xl font-black text-slate-900">How it works <ChevronRight /></a>
            <a href="#reviews" onClick={() => setIsMenuOpen(false)} className="flex items-center justify-between text-3xl font-black text-slate-900">Reviews <ChevronRight /></a>
          </div>
          <div className="p-8 pb-10 border-t bg-white sticky bottom-0">
            <Link href="/manage" onClick={() => setIsMenuOpen(false)} className="w-full py-5 bg-blue-600 text-white font-black rounded-2xl text-center block text-lg">Manage Booking</Link>
          </div>
        </div>
      </nav>

      {/* 2. HERO SECTION */}
      <section className="relative min-h-[100svh] md:min-h-[850px] w-full flex items-center pt-28 pb-16 overflow-hidden bg-slate-950">
        <div className="absolute inset-0 z-0 overflow-hidden">
          <div className={`absolute inset-0 bg-cover bg-center transition-all duration-[3000ms] ease-out origin-center ${isLoaded ? 'scale-105 opacity-100 blur-0' : 'scale-150 opacity-0 blur-3xl'}`} style={{ backgroundImage: "url('https://images.unsplash.com/photo-1436491865332-7a61a109cc05?q=80&w=2074&auto=format&fit=crop')" }}></div>
          <div className={`absolute inset-0 bg-gradient-to-r from-slate-950 via-slate-900/80 to-transparent transition-opacity duration-[2500ms] ${isLoaded ? 'opacity-100' : 'opacity-0'}`}></div>
          <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-10 mix-blend-overlay"></div>
        </div>

        <div className="relative z-10 w-full max-w-7xl mx-auto px-6 grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
          
          <div className="lg:col-span-5 flex flex-col text-left">
            <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/10 border border-white/20 backdrop-blur-md w-fit mb-8 transition-all duration-1000 delay-200 ${isLoaded ? 'translate-y-0 opacity-100' : 'translate-y-10 opacity-0'}`}>
              <span className="flex h-2 w-2 rounded-full bg-blue-400 animate-pulse"></span>
              <span className="text-white text-[10px] font-black uppercase tracking-widest">Premium Terminal Drop-off</span>
            </div>
            
            <h1 className={`text-5xl md:text-[5rem] font-black text-white tracking-tighter mb-6 leading-[1.05] transition-all duration-1000 delay-300 ${isLoaded ? 'translate-y-0 opacity-100' : 'translate-y-10 opacity-0'}`}>
              Redefine your <br className="hidden lg:block" /><span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-blue-600">Departure.</span>
            </h1>
            
            <p className={`text-lg md:text-xl text-slate-300 mb-10 max-w-xl font-medium leading-relaxed transition-all duration-1000 delay-500 ${isLoaded ? 'translate-y-0 opacity-100' : 'translate-y-10 opacity-0'}`}>
              Luton and Heathrow's elite Meet & Greet service. Leave the keys with us, and step straight into the terminal.
            </p>
          </div>

          <div className={`lg:col-span-7 transition-all duration-1000 delay-700 ${isLoaded ? 'translate-y-0 opacity-100' : 'translate-y-12 opacity-0'}`}>
            <div className="bg-white/10 backdrop-blur-xl border border-white/20 rounded-[2rem] p-6 md:p-8 shadow-2xl relative overflow-hidden">
              <div className="absolute top-0 right-0 w-64 h-64 bg-blue-500/20 rounded-full blur-[80px] pointer-events-none"></div>
              
              <form action="/results" method="GET" onSubmit={handleSearch} className="relative z-10 flex flex-col gap-6">
                
                <div className="bg-white/5 border border-white/10 rounded-2xl p-4 hover:border-white/30 transition-colors group/input relative">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2 text-blue-300">
                      <MapPin className="w-4 h-4" />
                      <label className="text-[10px] font-black uppercase tracking-widest text-slate-300">Select Departure Airport</label>
                    </div>
                    <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-red-500/10 border border-red-500/20 text-red-400 text-[9px] font-black uppercase tracking-wider animate-pulse">
                      <span className="w-1.5 h-1.5 rounded-full bg-red-500"></span> Limited Spots
                    </div>
                  </div>
                  
                  <div className="relative">
                    <select name="airport" value={airport} onChange={(e) => setAirport(e.target.value)} className="w-full bg-transparent font-black text-white text-xl outline-none cursor-pointer appearance-none">
                      <option value="Luton (LTN)" className="text-slate-900">Luton Airport (LTN)</option>
                      <option value="Heathrow (LHR)" className="text-slate-900">Heathrow Airport (LHR)</option>
                    </select>
                    <ChevronDown className="absolute right-0 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 pointer-events-none" />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="bg-white/5 border border-white/10 rounded-2xl p-4 hover:border-white/30 transition-colors">
                    <div className="flex items-center gap-2 mb-3 text-blue-300">
                      <PlaneTakeoff className="w-4 h-4" />
                      <label className="text-[10px] font-black uppercase tracking-widest text-slate-300">Drop-off Vehicle</label>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <input 
                        type="date" name="dropoffDate" min={todayStr} value={dropoffDate} onChange={(e) => setDropoffDate(e.target.value)} 
                        className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2.5 font-bold text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none transition-all cursor-pointer [color-scheme:light]" style={{ color: "#0f172a" }}
                      />
                      <input 
                        type="time" name="dropoffTime" value={dropoffTime} onChange={(e) => setDropoffTime(e.target.value)} 
                        className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2.5 font-bold text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none transition-all cursor-pointer [color-scheme:light]" style={{ color: "#0f172a" }}
                      />
                    </div>
                  </div>

                  <div className="bg-white/5 border border-white/10 rounded-2xl p-4 hover:border-white/30 transition-colors">
                    <div className="flex items-center gap-2 mb-3 text-blue-300">
                      <Calendar className="w-4 h-4" />
                      <label className="text-[10px] font-black uppercase tracking-widest text-slate-300">Pick-up Vehicle</label>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <input 
                        type="date" name="pickupDate" min={dropoffDate || todayStr} value={pickupDate} onChange={(e) => setPickupDate(e.target.value)} 
                        className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2.5 font-bold text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none transition-all cursor-pointer [color-scheme:light]" style={{ color: "#0f172a" }}
                      />
                      <input 
                        type="time" name="pickupTime" value={pickupTime} onChange={(e) => setPickupTime(e.target.value)} 
                        className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2.5 font-bold text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none transition-all cursor-pointer [color-scheme:light]" style={{ color: "#0f172a" }}
                      />
                    </div>
                  </div>
                </div>

                <button type="submit" className="w-full h-[64px] bg-blue-600 hover:bg-blue-500 text-white font-black rounded-2xl shadow-[0_10px_30px_rgba(37,99,235,0.4)] flex items-center justify-center gap-3 transition-all active:scale-95 group/btn mt-2">
                  SECURE MY PARKING <SearchIcon className="w-5 h-5 group-hover/btn:translate-x-1 group-hover/btn:-translate-y-1 transition-transform" />
                </button>
              </form>
            </div>
            
            <button onClick={() => setIsMapOpen(true)} className="mt-6 flex items-center gap-2 text-slate-400 font-bold text-xs hover:text-white transition-colors">
              <Info className="w-4 h-4" /> View official meeting points for LTN & LHR
            </button>
          </div>
        </div>
      </section>

      {/* 2.5 LIVE AVAILABILITY & OFFERS DASHBOARD */}
      <section className="relative z-20 bg-slate-950 px-6 pb-20 pt-4">
        <div className="max-w-7xl mx-auto">
          <div className="bg-[#0f172a]/90 backdrop-blur-3xl border border-white/10 rounded-[2rem] p-6 md:p-8 shadow-2xl relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-600 via-purple-500 to-blue-600"></div>
            <div className="absolute -bottom-24 -right-24 w-64 h-64 bg-blue-500/20 rounded-full blur-[80px]"></div>

            <div className="flex flex-col lg:flex-row gap-8 items-stretch relative z-10">
              
              <div className="flex-1 w-full lg:pr-8 lg:border-r border-white/10 flex flex-col">
                <h3 className="flex items-center gap-2 text-white font-black uppercase tracking-widest text-xs mb-6">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span> Live Availability
                </h3>
                
                <div className="grid grid-cols-2 gap-4 flex-1">
                  <div className="bg-white/5 border border-white/10 rounded-2xl p-5 flex flex-col justify-center hover:bg-white/10 transition-colors h-full">
                    <div className="text-slate-400 text-[10px] font-bold uppercase tracking-widest mb-2 flex items-center justify-between">
                      Luton (LTN) <MapPin className="w-3 h-3 text-slate-500" />
                    </div>
                    <div className="text-3xl font-black text-red-400 mb-1">12</div>
                    <div className="text-xs text-slate-300 font-medium">Spots remaining</div>
                  </div>
                  
                  <div className="bg-white/5 border border-white/10 rounded-2xl p-5 flex flex-col justify-center hover:bg-white/10 transition-colors h-full">
                    <div className="text-slate-400 text-[10px] font-bold uppercase tracking-widest mb-2 flex items-center justify-between">
                      Heathrow T5 <MapPin className="w-3 h-3 text-slate-500" />
                    </div>
                    <div className="text-3xl font-black text-emerald-400 mb-1">45</div>
                    <div className="text-xs text-slate-300 font-medium">Spots remaining</div>
                  </div>
                </div>
              </div>

              <div className="flex-[1.5] w-full flex flex-col">
                <h3 className="flex items-center gap-2 text-white font-black uppercase tracking-widest text-xs mb-6">
                  <Tag className="w-4 h-4 text-blue-400" /> Active Promotions
                </h3>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 flex-1">
                  
                  <div className="relative bg-gradient-to-br from-blue-900/40 to-blue-600/10 border border-blue-500/30 rounded-2xl p-5 group hover:border-blue-400/50 transition-all overflow-hidden flex flex-col justify-between h-full">
                    <div className="absolute top-0 right-0 bg-blue-600 text-white text-[9px] font-black px-3 py-1.5 rounded-bl-xl uppercase tracking-widest shadow-md">Limited Time</div>
                    <div>
                      <div className="text-2xl font-black text-white mb-1">15% OFF</div>
                      <div className="text-sm text-blue-200 font-medium mb-4 pr-10">Valid on all Heathrow Terminal drop-offs.</div>
                    </div>
                    <div className="inline-flex items-center justify-center gap-2 bg-black/40 border border-white/10 text-white font-mono text-xs px-4 py-2 rounded-lg border-dashed w-fit">
                      CODE: <span className="text-blue-400 font-bold">T5SAVE15</span>
                    </div>
                  </div>

                  <div className="relative bg-gradient-to-br from-purple-900/40 to-purple-600/10 border border-purple-500/30 rounded-2xl p-5 group hover:border-purple-400/50 transition-all overflow-hidden flex flex-col justify-between h-full">
                    <div className="absolute top-0 right-0 bg-purple-600 text-white text-[9px] font-black px-3 py-1.5 rounded-bl-xl uppercase tracking-widest shadow-md">Premium Add-on</div>
                    <div>
                      <div className="text-[1.35rem] leading-tight font-black text-white mb-1">Free Interior Detail</div>
                      <div className="text-sm text-purple-200 font-medium mb-4 pr-10">Complimentary detail for stays over 5 days.</div>
                    </div>
                    <div className="inline-flex items-center justify-center gap-2 bg-black/40 border border-white/10 text-white font-mono text-xs px-4 py-2 rounded-lg border-dashed w-fit">
                      CODE: <span className="text-purple-400 font-bold">CLEANRETURN</span>
                    </div>
                  </div>

                </div>
              </div>

            </div>
          </div>
        </div>
      </section>

      {/* 3. CORE BENEFITS BANNER */}
      <div className="bg-slate-900 border-b border-white/10 py-10 md:py-14 relative z-20 shadow-2xl overflow-hidden">
        <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-5"></div>
        <div className="max-w-7xl mx-auto px-6 relative z-10">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 divide-y md:divide-y-0 md:divide-x divide-white/10">
            
            <div className="flex items-center gap-5 md:px-8 pt-4 md:pt-0 first:pt-0">
              <div className="w-14 h-14 rounded-full bg-blue-500/10 border border-blue-500/20 flex items-center justify-center flex-shrink-0">
                <CarFront className="w-6 h-6 text-blue-400" />
              </div>
              <div>
                <h4 className="text-white font-black text-lg tracking-tight mb-1">Valet At Terminal</h4>
                <p className="text-slate-400 text-sm font-medium leading-snug">Direct meet & greet right at the airport drop-off zone.</p>
              </div>
            </div>

            <div className="flex items-center gap-5 md:px-8 pt-8 md:pt-0">
              <div className="w-14 h-14 rounded-full bg-blue-500/10 border border-blue-500/20 flex items-center justify-center flex-shrink-0">
                <CreditCard className="w-6 h-6 text-blue-400" />
              </div>
              <div>
                <h4 className="text-white font-black text-lg tracking-tight mb-1">All-Inclusive Rates</h4>
                <p className="text-slate-400 text-sm font-medium leading-snug">Terminal entry and exit fees are fully covered by us.</p>
              </div>
            </div>

            <div className="flex items-center gap-5 md:px-8 pt-8 md:pt-0">
              <div className="w-14 h-14 rounded-full bg-blue-500/10 border border-blue-500/20 flex items-center justify-center flex-shrink-0">
                <ShieldCheck className="w-6 h-6 text-blue-400" />
              </div>
              <div>
                <h4 className="text-white font-black text-lg tracking-tight mb-1">Premier Secure Parking</h4>
                <p className="text-slate-400 text-sm font-medium leading-snug">Gated, fenced, and 24/7 manned facility security.</p>
              </div>
            </div>

          </div>
        </div>
      </div>

      {/* 4. THE BENTO BOX FEATURE GRID */}
      <section id="services" className="py-24 md:py-32 px-6">
        <div className="max-w-7xl mx-auto">
          
          <div className="mb-16">
            <h2 className="text-4xl md:text-5xl font-black text-slate-900 tracking-tight mb-4">
              The Standard of <span className="text-blue-600">Excellence.</span>
            </h2>
            <p className="text-lg text-slate-500 font-medium max-w-xl">
              We eliminated the shuttle buses and the long walks. Experience airport parking designed around your schedule.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 auto-rows-[280px]">
            
            <div className="md:col-span-2 md:row-span-2 bg-white rounded-[2rem] p-10 border border-slate-200 shadow-sm relative overflow-hidden group hover:border-blue-500/30 transition-colors">
              <div className="absolute top-0 right-0 w-96 h-96 bg-gradient-to-bl from-blue-50 to-transparent rounded-full -translate-y-1/2 translate-x-1/2 group-hover:scale-110 transition-transform duration-700"></div>
              <div className="relative z-10 flex flex-col h-full justify-between">
                <div className="w-16 h-16 bg-blue-600 rounded-2xl flex items-center justify-center shadow-lg shadow-blue-500/30 mb-6">
                  <Clock className="w-8 h-8 text-white stroke-[1.5]" />
                </div>
                <div>
                  <h3 className="text-3xl font-black text-slate-900 mb-4 tracking-tight">Zero Wait Time. <br/>Direct Terminal Access.</h3>
                  <p className="text-slate-500 font-medium leading-relaxed max-w-md text-lg">
                    Drive your vehicle straight to the Short Stay car park at your terminal. Hand the keys to our insured chauffeurs, and you are exactly a 2-minute walk from the departure gates.
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-[#0F172A] rounded-[2rem] p-8 relative overflow-hidden group">
              <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-10"></div>
              <div className="relative z-10 flex flex-col h-full justify-between">
                <ShieldCheck className="w-10 h-10 text-blue-400 stroke-[1.5]" />
                <div>
                  <h3 className="text-xl font-black text-white mb-2 tracking-tight">24/7 Secure Facility</h3>
                  <p className="text-slate-400 font-medium text-sm">Monitored facilities with full CCTV coverage, perimeter fencing, and regular patrols.</p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-[2rem] p-8 border border-slate-200 shadow-sm flex flex-col justify-between group hover:border-blue-500/30 transition-colors">
              <CreditCard className="w-10 h-10 text-slate-900 stroke-[1.5]" />
              <div>
                <h3 className="text-xl font-black text-slate-900 mb-2 tracking-tight">Transparent Pricing</h3>
                <ul className="space-y-2 mt-4">
                  {["No hidden drop-off fees", "Flexible cancellations", "Price match guarantee"].map((item, i) => (
                    <li key={i} className="flex items-center gap-2 text-sm text-slate-600 font-medium">
                      <CheckCircle2 className="w-4 h-4 text-blue-500" /> {item}
                    </li>
                  ))}
                </ul>
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* 4.5 HOW IT WORKS SECTION */}
      <section id="how-it-works" className="py-24 md:py-32 bg-slate-50 px-6 border-t border-slate-200">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16 md:mb-24">
            <h2 className="text-4xl md:text-5xl font-black text-slate-900 tracking-tight mb-4">
              Seamless Departure in <span className="text-blue-600">3 Steps.</span>
            </h2>
            <p className="text-lg text-slate-500 font-medium max-w-xl mx-auto leading-relaxed">
              Skip the shuttle buses and off-site lots. Experience true VIP convenience at Luton and Heathrow.
            </p>
          </div>

          <div className="relative">
            <div className="hidden md:block absolute top-12 left-[15%] right-[15%] h-[2px] bg-gradient-to-r from-transparent via-blue-200 to-transparent z-0"></div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-12 md:gap-8 relative z-10">
              {[
                { icon: MapPin, step: "01", title: "Book Online", desc: "Select your departure terminal and travel dates. Receive instant confirmation." },
                { icon: CarFront, step: "02", title: "Drive to Terminal", desc: "Head directly to the Short Stay car park exactly outside your departure terminal." },
                { icon: PlaneTakeoff, step: "03", title: "Hand Over Keys", desc: "Meet our insured chauffeur, hand over your keys, and walk to check-in in 2 minutes." }
              ].map((item, i) => (
                <div key={i} className="flex flex-col items-center text-center group">
                  <div className="relative mb-8">
                    <div className="absolute inset-0 bg-blue-500/20 rounded-full blur-xl opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
                    <div className="w-24 h-24 bg-white border border-slate-200 shadow-sm text-blue-600 rounded-full flex items-center justify-center relative transition-transform duration-500 group-hover:-translate-y-2 group-hover:border-blue-500/50">
                       <item.icon className="w-10 h-10 stroke-[1.5]" />
                    </div>
                    <div className="absolute -top-2 -right-2 w-10 h-10 bg-slate-900 rounded-full flex items-center justify-center font-black text-sm text-white shadow-lg border-4 border-[#F8FAFC] group-hover:scale-110 group-hover:bg-blue-600 transition-all">
                      {item.step}
                    </div>
                  </div>
                  <h3 className="text-2xl font-black text-slate-900 mb-3 tracking-tight group-hover:text-blue-600 transition-colors">
                    {item.title}
                  </h3>
                  <p className="text-base text-slate-500 font-medium leading-relaxed max-w-[280px]">
                    {item.desc}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* 5. REVIEWS */}
      <section id="reviews" className="py-24 md:py-32 bg-slate-950 px-6 relative overflow-hidden">
        <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-white/20 to-transparent"></div>
        <div className="max-w-7xl mx-auto relative z-10">
          
          <div className="flex flex-col md:flex-row justify-between items-end mb-16 gap-6">
             <div>
               <h2 className="text-4xl md:text-5xl font-black text-white tracking-tight mb-4">Preferred by <br className="hidden md:block"/>Professionals.</h2>
               <div className="flex gap-1">
                 {[1,2,3,4,5].map(i => <Star key={i} className="w-6 h-6 text-yellow-500 fill-current drop-shadow-[0_0_10px_rgba(234,179,8,0.4)]" />)}
               </div>
             </div>
             <p className="text-slate-400 font-medium max-w-sm text-lg">Based on verified 5-star reviews from business and leisure travelers.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {[
              { text: "Heathrow T5 can be a nightmare, but this Meet & Greet service was effortless. No shuttle buses, just straight to check-in. The driver was waiting exactly where promised.", name: "James D.", role: "LHR T5 Traveler", initials: "JD" },
              { text: "Used them for Luton parking. Extremely professional staff and the car was returned perfectly clean. Best service in LTN hands down.", name: "Sarah M.", role: "Luton Executive", initials: "SM" }
            ].map((rev, i) => (
              <div key={i} className="bg-white/[0.03] hover:bg-white/[0.06] transition-colors backdrop-blur-md p-8 md:p-10 rounded-[2rem] border border-white/10">
                <p className="text-xl text-slate-300 leading-relaxed mb-10 font-medium">"{rev.text}"</p>
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 bg-blue-600 rounded-full flex items-center justify-center font-black text-white text-lg shadow-lg">{rev.initials}</div>
                  <div className="flex flex-col">
                    <span className="font-black text-white">{rev.name}</span>
                    <span className="text-blue-400 font-bold uppercase tracking-widest text-[10px]">{rev.role}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 6. FOOTER */}
      <footer className="bg-slate-900 py-16 px-6 border-t border-white/10">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-8">
           <Link href="/" className="flex items-center gap-2 text-white font-black text-2xl uppercase tracking-tighter">
             <Plane className="w-6 h-6 text-blue-500 rotate-45" /> AIRPORT<span className="text-blue-500">VIP</span>
           </Link>
           <div className="flex flex-wrap justify-center gap-8 text-slate-400 text-[11px] font-black uppercase tracking-[0.2em]">
             <a href="#" className="hover:text-white transition-colors">Privacy Policy</a>
             <a href="#" className="hover:text-white transition-colors">Terms of Service</a>
             <a href="#" className="hover:text-white transition-colors">Contact Support</a>
           </div>
           <div className="text-slate-600 font-bold text-[10px] uppercase tracking-widest">
             © {new Date().getFullYear()} AirportVIP Global
           </div>
        </div>
      </footer>

      <MapModal isOpen={isMapOpen} onClose={() => setIsMapOpen(false)} />
    </main>
  );
}

// Internal SVG for the search button
function SearchIcon(props: any) {
  return (
    <svg 
      {...props} 
      xmlns="http://www.w3.org/2000/svg" 
      fill="none" viewBox="0 0 24 24" 
      strokeWidth={2.5} 
      stroke="currentColor"
    >
      <path strokeLinecap="round" strokeLinejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z" />
    </svg>
  );
}