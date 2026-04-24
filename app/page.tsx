"use client";

import { useState, useEffect } from "react";
import { 
  User, 
  Calendar, 
  Clock, 
  PlaneTakeoff,
  ShieldCheck,
  CreditCard,
  MapPin,
  CarFront,
  Menu,
  X,
  ChevronRight,
  Info,
  ChevronDown,
  CheckCircle2,
  Tag,
  Search,
  Car
} from "lucide-react";
import Link from "next/link";
import Image from "next/image";
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
      <nav className={`fixed top-0 w-full z-[100] bg-white/80 backdrop-blur-xl border-b border-slate-200 transition-all duration-1000 ${isLoaded ? 'translate-y-0 opacity-100' : '-translate-y-full opacity-0'}`}>
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          
          <Link href="/" className="flex items-center z-50">
            <Image 
              src="/logo.png" /* Or whatever the original file is named */
              alt="AeroPark Direct"
              width={350} 
              height={120}
              priority
              /* This is the magic line. mix-blend-multiply forces the white to turn invisible! */
              className="h-20 md:h-24 w-auto object-contain scale-[1.35] origin-left mix-blend-multiply" 
            />
          </Link>
          
          <div className="hidden md:flex items-center gap-8">
            {["Services", "How it works"].map((item) => (
              <a key={item} href={`#${item.toLowerCase().replace(/ /g, '-')}`} className="text-[11px] font-black uppercase tracking-[0.15em] text-slate-500 hover:text-slate-900 transition-colors relative group">
                {item}
                <span className="absolute -bottom-2 left-0 w-0 h-[2px] bg-blue-600 transition-all duration-300 group-hover:w-full"></span>
              </a>
            ))}

            <div className="h-6 w-px bg-slate-200 ml-2"></div>

            <Link href="/manage" className="flex items-center gap-2 text-[11px] font-black uppercase tracking-[0.15em] text-white bg-slate-900 px-6 py-3 rounded-full hover:bg-blue-600 transition-all active:scale-95 ml-2">
              <User className="w-4 h-4" /> Manage Booking
            </Link>
          </div>
          

          <button onClick={() => setIsMenuOpen(true)} className="md:hidden p-2 text-slate-900 bg-slate-100 rounded-xl active:scale-90 transition-transform">
            <Menu className="w-6 h-6" />
          </button>
        </div>
        </nav>

        {/* MOBILE MENU - FULLY REPAIRED */}
        <div 
          className={`md:hidden fixed inset-0 z-[9999] bg-white transition-all duration-500 ease-in-out flex flex-col ${
            isMenuOpen ? 'opacity-100 translate-x-0 visible' : 'opacity-0 translate-x-full invisible pointer-events-none'
          }`}
        >
          {/* 1. Header */}
          <div className="h-20 px-6 flex items-center justify-between border-b border-slate-100 shrink-0">
            <Link href="/" onClick={() => setIsMenuOpen(false)} className="flex items-center">
              <Image 
                src="/logo.png" /* Make sure this filename matches too! */
                alt="AeroPark Direct"
                width={250}
                height={80}
                /* MOBILE SIZING AND SCALE */
                className="h-16 md:h-18 w-auto object-contain scale-[1.35] origin-left mix-blend-multiply" 
                />
            </Link>
            <button onClick={() => setIsMenuOpen(false)} className="p-3 text-slate-900 bg-slate-100 rounded-full">
              <X className="w-6 h-6" />
            </button>
          </div>
          
          {/* 2. Menu Links - Forced Visibility */}
          <div className="flex flex-col px-8 py-12 gap-2 flex-grow overflow-y-auto bg-white">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-4">Main Menu</p>
            
            <a href="#services" onClick={() => setIsMenuOpen(false)} className="flex items-center justify-between py-6 text-3xl font-black text-slate-900 border-b border-slate-50">
              Services <ChevronRight className="w-8 h-8 text-blue-500" />
            </a>
            
            <a href="#how-it-works" onClick={() => setIsMenuOpen(false)} className="flex items-center justify-between py-6 text-3xl font-black text-slate-900 border-b border-slate-50">
              How it works <ChevronRight className="w-8 h-8 text-blue-500" />
            </a>

            <Link href="/manage" onClick={() => setIsMenuOpen(false)} className="flex items-center justify-between py-6 text-3xl font-black text-slate-900">
              Manage Trip <ChevronRight className="w-8 h-8 text-blue-500" />
            </Link>
          </div>

          {/* 3. Sticky Bottom Button */}
          <div className="p-8 pb-10 border-t border-slate-100 bg-white shrink-0">
            <Link 
              href="/manage" 
              onClick={() => setIsMenuOpen(false)} 
              className="w-full py-5 bg-blue-600 text-white font-black rounded-2xl text-lg flex items-center justify-center shadow-xl shadow-blue-200 active:scale-95 transition-transform"
            >
              Sign In to Booking
            </Link>
          </div>
        </div>
        

     {/* 2. IMMERSIVE HERO SECTION */}
      <section className="relative min-h-screen w-full flex items-center justify-center overflow-hidden bg-slate-950 py-20">
        {/* Enhanced Background with Dual Gradients */}
        <div className="absolute inset-0 z-0 overflow-hidden">
          <div className={`absolute inset-0 bg-cover bg-center transition-all duration-[3000ms] ease-out origin-center ${isLoaded ? 'scale-105 opacity-100' : 'scale-150 opacity-0'}`} style={{ backgroundImage: "url('https://images.unsplash.com/photo-1436491865332-7a61a109cc05?q=80&w=2074&auto=format&fit=crop')" }}></div>
          {/* Dark overlay on the left for text readability, clear on the right for the plane */}
          <div className={`absolute inset-0 bg-gradient-to-r from-slate-950 via-slate-900/60 to-transparent transition-opacity duration-[2500ms] ${isLoaded ? 'opacity-100' : 'opacity-0'}`}></div>
          <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-10 mix-blend-overlay"></div>
        </div>

        <div className="relative z-10 w-full max-w-7xl mx-auto px-6 md:px-12 grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
          
          {/* Hero Text - Wider 7-column span */}
          <div className={`lg:col-span-7 flex flex-col justify-center transition-all duration-1000 delay-300 ${isLoaded ? 'translate-y-0 opacity-100' : 'translate-y-10 opacity-0'}`}>
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/10 border border-white/20 backdrop-blur-md w-fit mb-8">
              <span className="flex h-2 w-2 rounded-full bg-blue-400 animate-pulse"></span>
              <span className="text-white text-[10px] font-black uppercase tracking-widest">Premium Terminal Drop-off</span>
            </div>

            <h1 className="text-5xl md:text-7xl font-bold text-white mb-8 leading-[1.1] tracking-tight">
              Redefine your <br />
              <span className="text-blue-500">Departure.</span>
            </h1>

            <div className="space-y-6 max-w-xl">
              <p className="text-xl text-white leading-relaxed font-semibold opacity-90">
                Parking should be simple, secure, and completely stress-free. We connect you with trusted providers, ensuring your vehicle is in safe hands while you travel.
              </p>
              
              <p className="text-lg text-gray-300 leading-relaxed font-light">
                Whether planning in advance or booking last minute, find the 
                right parking option tailored to your journey—quick, clear, and reliable.
              </p>

              <div className="flex items-center gap-4 pt-6 border-t border-white/10">
                <p className="text-blue-400 font-bold tracking-widest uppercase text-xs">
                  Reliable • Secure • Simple
                </p>
              </div>
            </div>
          </div>

          {/* Booking Form - Compact 5-column span */}
          <div className={`lg:col-span-5 flex justify-center lg:justify-end transition-all duration-1000 delay-700 ${isLoaded ? 'translate-y-0 opacity-100' : 'translate-y-12 opacity-0'}`}>
            <div className="w-full max-w-[480px] bg-white/10 backdrop-blur-2xl border border-white/20 rounded-[2.5rem] p-6 md:p-8 shadow-2xl relative overflow-hidden">
              {/* Internal Glow Effect */}
              <div className="absolute top-0 right-0 w-64 h-64 bg-blue-500/20 rounded-full blur-[80px] pointer-events-none"></div>
              
              <form action="/results" method="GET" onSubmit={handleSearch} className="relative z-10 flex flex-col gap-5">
                
                {/* Airport Selector */}
                <div className="bg-white/5 border border-white/10 rounded-2xl p-4 group/input transition-colors hover:bg-white/10">
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-300">Select Departure Airport</label>
                    <div className="px-2 py-0.5 rounded-full bg-red-500/10 border border-red-500/20 text-red-400 text-[9px] font-black uppercase tracking-wider animate-pulse">Limited Spots</div>
                  </div>
                  <div className="relative">
                    <select name="airport" value={airport} onChange={(e) => setAirport(e.target.value)} className="w-full bg-transparent font-black text-white text-xl md:text-2xl outline-none cursor-pointer appearance-none relative z-10">
                      <option value="Luton (LTN)" className="text-slate-900">Luton Airport (LTN)</option>
                      <option value="Heathrow (LHR)" className="text-slate-900">Heathrow Airport (LHR)</option>
                    </select>
                    <ChevronDown className="absolute right-0 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 pointer-events-none" />
                  </div>
                </div>

                {/* Date & Time Stacks */}
                <div className="space-y-4">
                  {/* Drop-off Card */}
                  <div className="bg-white/5 border border-white/10 rounded-2xl p-4 transition-all focus-within:border-blue-500/50">
                    <div className="flex items-center gap-2 mb-3 text-blue-300">
                      <PlaneTakeoff className="w-4 h-4" />
                      <label className="text-[10px] font-black uppercase tracking-widest text-slate-300">Drop-off</label>
                    </div>
                    <div className="flex gap-2 h-11">
                      <input type="date" name="dropoffDate" min={todayStr} value={dropoffDate} onChange={(e) => setDropoffDate(e.target.value)} className="w-full bg-white text-slate-900 rounded-xl px-3 font-bold text-sm outline-none focus:ring-2 focus:ring-blue-500" />
                      <input type="time" name="dropoffTime" value={dropoffTime} onChange={(e) => setDropoffTime(e.target.value)} className="w-32 bg-white text-slate-900 rounded-xl px-2 font-bold text-sm outline-none focus:ring-2 focus:ring-blue-500" />
                    </div>
                  </div>

                  {/* Pick-up Card */}
                  <div className="bg-white/5 border border-white/10 rounded-2xl p-4 transition-all focus-within:border-blue-500/50">
                    <div className="flex items-center gap-2 mb-3 text-blue-300">
                      <Calendar className="w-4 h-4" />
                      <label className="text-[10px] font-black uppercase tracking-widest text-slate-300">Pick-up</label>
                    </div>
                    <div className="flex gap-2 h-11">
                      <input type="date" name="pickupDate" min={dropoffDate || todayStr} value={pickupDate} onChange={(e) => setPickupDate(e.target.value)} className="w-full bg-white text-slate-900 rounded-xl px-3 font-bold text-sm outline-none focus:ring-2 focus:ring-blue-500" />
                      <input type="time" name="pickupTime" value={pickupTime} onChange={(e) => setPickupTime(e.target.value)} className="w-32 bg-white text-slate-900 rounded-xl px-2 font-bold text-sm outline-none focus:ring-2 focus:ring-blue-500" />
                    </div>
                  </div>
                </div>

                <button type="submit" className="w-full h-14 md:h-16 bg-blue-600 hover:bg-blue-500 text-white font-black rounded-2xl shadow-xl shadow-blue-600/20 active:scale-[0.98] transition-all flex items-center justify-center gap-3 uppercase text-sm tracking-widest mt-2">
                  Secure My Parking <Search className="w-5 h-5" />
                </button>
              </form>
            </div>
            
            {/* Contextual Link */}
            <button onClick={() => setIsMapOpen(true)} className="absolute -bottom-12 flex items-center gap-2 text-slate-400 font-bold text-xs hover:text-white transition-colors w-full justify-center lg:justify-end pr-4">
              <Info className="w-4 h-4" /> .
            </button>
          </div>

        </div>
      </section>
<section className="hidden relative z-20 -mt-12 px-6"> 
  {/* The rest of the code remains but won't show on screen      will use later */}

      {/* 2.5 LIVE AVAILABILITY SECTION */}
      <section className="relative z-20 bg-slate-950 px-6 pb-20 pt-4">
        <div className="max-w-7xl mx-auto">
          <div className="bg-[#0f172a]/90 backdrop-blur-3xl border border-white/10 rounded-[2rem] p-6 md:p-8 shadow-2xl relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-600 via-purple-500 to-blue-600"></div>
            <div className="flex flex-col lg:flex-row gap-8 items-stretch relative z-10">
              <div className="flex-1 w-full lg:pr-8 lg:border-r border-white/10 flex flex-col">
                <h3 className="flex items-center gap-2 text-white font-black uppercase tracking-widest text-[10px] mb-6"><span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span> Live Availability</h3>
                <div className="grid grid-cols-2 gap-4 flex-1">
                  <div className="bg-white/5 border border-white/10 rounded-2xl p-5 flex flex-col justify-center h-full">
                    <div className="text-slate-400 text-[10px] font-bold uppercase tracking-widest mb-2 flex items-center justify-between">Luton (LTN) <MapPin className="w-3 h-3 text-slate-500" /></div>
                    <div className="text-3xl font-black text-red-400 mb-1">12</div>
                    <div className="text-[10px] text-slate-400 font-black uppercase">Spots Left</div>
                  </div>
                  <div className="bg-white/5 border border-white/10 rounded-2xl p-5 flex flex-col justify-center h-full">
                    <div className="text-slate-400 text-[10px] font-bold uppercase tracking-widest mb-2 flex items-center justify-between">Heathrow T5 <MapPin className="w-3 h-3 text-slate-500" /></div>
                    <div className="text-3xl font-black text-emerald-400 mb-1">45</div>
                    <div className="text-[10px] text-slate-400 font-black uppercase">Spots Left</div>
                  </div>
                </div>
              </div>
              <div className="flex-[1.5] w-full flex flex-col text-white">
                <h3 className="flex items-center gap-2 text-white font-black uppercase tracking-widest text-[10px] mb-6"><Tag className="w-4 h-4 text-blue-400" /> Active Promotions</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 flex-1">
                  <div className="relative bg-gradient-to-br from-blue-900/40 to-blue-600/10 border border-blue-500/30 rounded-2xl p-5 overflow-hidden flex flex-col justify-between h-full">
                    <div><div className="text-2xl font-black mb-1">15% OFF</div><div className="text-sm text-blue-200 font-medium">LHR Terminal drop-offs.</div></div>
                    <div className="bg-black/40 border border-white/10 font-mono text-xs px-4 py-2 rounded-lg border-dashed w-fit mt-4">CODE: T5SAVE15</div>
                  </div>
                  <div className="relative bg-gradient-to-br from-purple-900/40 to-purple-600/10 border border-purple-500/30 rounded-2xl p-5 overflow-hidden flex flex-col justify-between h-full">
                    <div><div className="text-2xl font-black mb-1">Free Valet</div><div className="text-sm text-purple-200 font-medium">Stays over 5 days.</div></div>
                    <div className="bg-black/40 border border-white/10 font-mono text-xs px-4 py-2 rounded-lg border-dashed w-fit mt-4">CODE: CLEANRETURN</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
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

      {/* 4. THE BENTO BOX - REFINED GRID */}
      <section id="services" className="py-24 px-6 bg-white">
        <div className="max-w-7xl mx-auto">
          {/* Header Section */}
          <div className="mb-16">
            <h2 className="text-4xl md:text-6xl font-black text-slate-900 tracking-tighter mb-6 uppercase">
              The Standard of <br />
              <span className="text-blue-600">Excellence.</span>
            </h2>
            <p className="text-lg text-slate-500 font-medium max-w-xl leading-relaxed border-l-4 border-blue-600 pl-6">
              We eliminated shuttle buses. Experience airport parking designed around your schedule, not ours.
            </p>
          </div>

          {/* Grid Container */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            
            {/* Primary Large Card - 2/3 of the width */}
            <div className="md:col-span-2 bg-slate-50 rounded-[3rem] p-8 md:p-14 border border-slate-100 relative overflow-hidden flex flex-col justify-between min-h-[500px]">
              {/* Subtle Ambient Glow */}
              <div className="absolute top-0 right-0 w-96 h-96 bg-blue-100/40 rounded-full blur-[100px] -mr-20 -mt-20 pointer-events-none"></div>
              
              <div className="relative z-10">
                <div className="w-16 h-16 md:w-20 md:h-20 bg-blue-600 rounded-[2rem] flex items-center justify-center shadow-2xl shadow-blue-500/20 mb-10 text-white">
                  <Clock className="w-8 h-8 md:w-10 md:h-10" />
                </div>
                <h3 className="text-4xl md:text-5xl font-black text-slate-900 mb-8 tracking-tight leading-none">
                  Zero Wait Time. <br/>Direct Access.
                </h3>
                <p className="text-slate-500 font-semibold text-lg md:text-xl leading-relaxed max-w-lg">
                  Hand your keys to our vetted chauffeurs exactly at terminal check-in. 
                  Walk 2 minutes to the gate. It's that simple.
                </p>
              </div>
              
              {/* Action Badge */}
              <div className="relative z-10 mt-10">
                <span className="px-5 py-2 bg-white border border-slate-200 rounded-full text-[10px] font-black uppercase tracking-widest text-slate-400">
                  Terminal 2, 3, 4, 5 & LTN
                </span>
              </div>
            </div>

            {/* Right Column - Stacked Small Cards */}
            <div className="md:col-span-1 flex flex-col gap-6">
              
              {/* Security Card */}
              <div className="flex-1 bg-[#0F172A] rounded-[3rem] p-8 md:p-10 flex flex-col justify-between group overflow-hidden relative">
                <div className="absolute bottom-0 right-0 w-32 h-32 bg-blue-500/10 rounded-full blur-3xl group-hover:bg-blue-500/20 transition-all duration-500"></div>
                <ShieldCheck className="w-14 h-14 text-blue-400 mb-8" />
                <div>
                  <h3 className="text-2xl font-black text-white mb-4 uppercase tracking-tight">24/7 Security</h3>
                  <p className="text-slate-400 text-sm font-medium leading-relaxed">
                    Your vehicle is moved to a private compound with HD CCTV and manned regular patrols.
                  </p>
                </div>
              </div>

              {/* Pricing Card */}
              <div className="flex-1 bg-white rounded-[3rem] p-8 md:p-10 border border-slate-200 shadow-sm flex flex-col justify-between group hover:border-blue-600 transition-colors duration-300">
                <CreditCard className="w-14 h-14 text-slate-900 group-hover:scale-110 transition-transform duration-300" />
                <div>
                  <h3 className="text-2xl font-black text-slate-900 mb-6 uppercase tracking-tight">Pricing</h3>
                  <ul className="space-y-4">
                    {["Price match guarantee", "No hidden drop-off fees"].map((item, idx) => (
                      <li key={idx} className="flex items-center gap-3 text-xs text-slate-600 font-black uppercase tracking-wider">
                        <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" /> {item}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>

            </div>
          </div>
        </div>
      </section>

      {/* 4.5 HOW IT WORKS SECTION */}
      <section className="py-24 bg-white">
  <div className="max-w-7xl mx-auto px-6 text-center">
    {/* Header */}
    <h2 className="text-4xl md:text-5xl font-black text-slate-900 tracking-tight mb-4">
      Seamless Departure in <span className="text-blue-600">3 Steps.</span>
    </h2>
    <p className="text-slate-500 font-medium max-w-2xl mx-auto mb-20">
      
    </p>

    {/* Steps Grid */}
    <div className="grid grid-cols-1 md:grid-cols-3 gap-12 relative">
      
      {/* Step 1 */}
      <div className="relative group">
        <div className="w-24 h-24 bg-white border-2 border-slate-100 rounded-full flex items-center justify-center mx-auto mb-8 shadow-xl group-hover:border-blue-500 transition-all duration-500 relative z-10">
          <Search className="w-10 h-10 text-blue-600" />
          <div className="absolute -top-2 -right-2 w-8 h-8 bg-slate-900 text-white rounded-full flex items-center justify-center text-xs font-black">01</div>
        </div>
        <h3 className="text-2xl font-black text-slate-900 mb-4 tracking-tight">1. Choose</h3>
        <p className="text-slate-500 font-bold text-sm leading-relaxed max-w-[240px] mx-auto">
          Tell us your airport, date and time, and we'll do the rest.
        </p>
      </div>

      {/* Step 2 */}
      <div className="relative group">
        <div className="w-24 h-24 bg-white border-2 border-slate-100 rounded-full flex items-center justify-center mx-auto mb-8 shadow-xl group-hover:border-blue-500 transition-all duration-500 relative z-10">
          <CreditCard className="w-10 h-10 text-blue-600" />
          <div className="absolute -top-2 -right-2 w-8 h-8 bg-slate-900 text-white rounded-full flex items-center justify-center text-xs font-black">02</div>
        </div>
        <h3 className="text-2xl font-black text-slate-900 mb-4 tracking-tight">2. Book</h3>
        <p className="text-slate-500 font-bold text-sm leading-relaxed max-w-[240px] mx-auto">
          Choose your preferred option and complete your booking securely in minutes.
        </p>
      </div>

      {/* Step 3 */}
      <div className="relative group">
        <div className="w-24 h-24 bg-white border-2 border-slate-100 rounded-full flex items-center justify-center mx-auto mb-8 shadow-xl group-hover:border-blue-500 transition-all duration-500 relative z-10">
          <Car className="w-10 h-10 text-blue-600" />
          <div className="absolute -top-2 -right-2 w-8 h-8 bg-slate-900 text-white rounded-full flex items-center justify-center text-xs font-black">03</div>
        </div>
        <h3 className="text-2xl font-black text-slate-900 mb-4 tracking-tight">3. Park</h3>
        <p className="text-slate-500 font-bold text-sm leading-relaxed max-w-[240px] mx-auto">
          Arrive at your parking location, follow the instructions, and you’re ready to go.
        </p>
      </div>

      {/* Decorative Connector Line (Hidden on mobile) */}
      <div className="hidden md:block absolute top-12 left-0 w-full h-[2px] bg-slate-100 -z-0"></div>
    </div>
  </div>
</section>

      {/* 6. FOOTER */}
      <footer className="bg-[#0B1121] py-10 md:py-14 px-6 border-t border-white/5">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-8 md:gap-4">
           
           <Link href="/" className="flex items-center w-full md:w-1/3 justify-center md:justify-start">
             <div className="bg-white px-2.5 py-1.5 rounded-lg shadow-sm">
               <Image 
                 src="/footer.jpg" /* Ensure your filename matches */
                 alt="AeroPark Direct"
                 width={200}
                 height={60}
                 /* Reduced height from h-10/12 down to h-7/9 */
                 className="h-7 md:h-9 w-auto object-contain" 
               />
             </div>
           </Link>
           
           {/* UPDATED: Using Next.js Links pointing to real routes */}
           <div className="flex flex-wrap justify-center gap-6 md:gap-10 text-slate-300/80 text-[10px] md:text-[11px] font-bold uppercase tracking-[0.15em] md:tracking-[0.2em] w-full md:w-1/3">
             <Link href="/privacy" className="hover:text-white transition-colors">Privacy Policy</Link>
             <Link href="/terms" className="hover:text-white transition-colors">Terms of Service</Link>
             <Link href="/contact" className="hover:text-white transition-colors">Contact Support</Link>
           </div>
           
           <div className="text-slate-500/70 font-bold text-[9px] md:text-[10px] uppercase tracking-[0.15em] md:tracking-widest w-full md:w-1/3 text-center md:text-right">
             © {new Date().getFullYear()} AeroPark Direct
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