"use client";
import { useRouter } from "next/navigation";
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
  const router = useRouter();
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
    e.preventDefault();

    if (dropoffDate === todayStr && dropoffTime < currentTimeStr) {
      alert("Drop-off time cannot be in the past!");
      return;
    }
    const start = new Date(`${dropoffDate}T${dropoffTime}`);
    const end = new Date(`${pickupDate}T${pickupTime}`);
    if (end <= start) {
      alert("Pick-up time must be after your Drop-off time!");
      return;
    }

    const query = new URLSearchParams({
      airport,
      dropoffDate,
      dropoffTime,
      pickupDate,
      pickupTime
    }).toString();

    router.push(`/select-service?${query}`);
  };

  return (
    <main className="min-h-screen bg-[#F8FAFC] font-sans selection:bg-blue-600 selection:text-white overflow-x-hidden">
      {/* 1. PREMIUM NAVBAR */}
      <nav className={`fixed top-0 w-full z-[100] bg-white/80 backdrop-blur-xl border-b border-slate-200 transition-all duration-1000 ${isLoaded ? 'translate-y-0 opacity-100' : '-translate-y-full opacity-0'}`}>
        <div className="max-w-7xl mx-auto px-4 md:px-6 h-20 flex items-center justify-between">
          
          <Link href="/" className="flex items-center z-50">
            <Image 
              src="/logo.png" 
              alt="AeroPark Direct"
              width={350} 
              height={120}
              priority
              className="h-16 md:h-24 w-auto object-contain scale-110 md:scale-[1.35] origin-left mix-blend-multiply" 
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
          
          <button onClick={() => setIsMenuOpen(true)} className="md:hidden p-2.5 text-slate-900 bg-slate-100 rounded-xl active:scale-90 transition-transform">
            <Menu className="w-6 h-6" />
          </button>
        </div>
      </nav>

      {/* MOBILE MENU */}
      <div 
        className={`md:hidden fixed inset-0 z-[9999] bg-white transition-all duration-500 ease-in-out flex flex-col ${
          isMenuOpen ? 'opacity-100 translate-x-0 visible' : 'opacity-0 translate-x-full invisible pointer-events-none'
        }`}
      >
        <div className="h-20 px-6 flex items-center justify-between border-b border-slate-100 shrink-0">
          <Link href="/" onClick={() => setIsMenuOpen(false)} className="flex items-center">
            <Image 
              src="/logo.png" 
              alt="AeroPark Direct"
              width={250}
              height={80}
              className="h-16 w-auto object-contain scale-110 origin-left mix-blend-multiply" 
            />
          </Link>
          <button onClick={() => setIsMenuOpen(false)} className="p-3 text-slate-900 bg-slate-100 rounded-full">
            <X className="w-6 h-6" />
          </button>
        </div>
        
        <div className="flex flex-col px-8 py-12 gap-2 flex-grow overflow-y-auto bg-white">
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-4">Main Menu</p>
          
          <a href="#services" onClick={() => setIsMenuOpen(false)} className="flex items-center justify-between py-6 text-2xl font-black text-slate-900 border-b border-slate-50">
            Services <ChevronRight className="w-6 h-6 text-blue-500" />
          </a>
          
          <a href="#how-it-works" onClick={() => setIsMenuOpen(false)} className="flex items-center justify-between py-6 text-2xl font-black text-slate-900 border-b border-slate-50">
            How it works <ChevronRight className="w-6 h-6 text-blue-500" />
          </a>

          <Link href="/manage" onClick={() => setIsMenuOpen(false)} className="flex items-center justify-between py-6 text-2xl font-black text-slate-900">
            Manage Trip <ChevronRight className="w-6 h-6 text-blue-500" />
          </Link>
        </div>

        <div className="p-8 pb-10 border-t border-slate-100 bg-white shrink-0">
          <Link 
            href="/manage" 
            onClick={() => setIsMenuOpen(false)} 
            className="w-full py-4 bg-blue-600 text-white font-black rounded-2xl text-lg flex items-center justify-center shadow-xl shadow-blue-200 active:scale-95 transition-transform"
          >
            Sign In to Booking
          </Link>
        </div>
      </div>
        

      {/* 2. IMMERSIVE HERO SECTION */}
      <section className="relative min-h-[100svh] w-full flex items-center justify-center overflow-hidden bg-slate-950 pt-28 pb-12 md:py-20">
        <div className="absolute inset-0 z-0 overflow-hidden">
          <div className={`absolute inset-0 bg-cover bg-center transition-all duration-[3000ms] ease-out origin-center ${isLoaded ? 'scale-105 opacity-100' : 'scale-150 opacity-0'}`} style={{ backgroundImage: "url('https://images.unsplash.com/photo-1436491865332-7a61a109cc05?q=80&w=2074&auto=format&fit=crop')" }}></div>
          <div className={`absolute inset-0 bg-gradient-to-b md:bg-gradient-to-r from-slate-950 via-slate-900/80 md:via-slate-900/60 to-transparent transition-opacity duration-[2500ms] ${isLoaded ? 'opacity-100' : 'opacity-0'}`}></div>
          <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-10 mix-blend-overlay"></div>
        </div>

        <div className="relative z-10 w-full max-w-7xl mx-auto px-4 sm:px-6 md:px-12 grid grid-cols-1 lg:grid-cols-12 gap-8 md:gap-12 items-center mt-6 md:mt-0">
          
          {/* Hero Text */}
          <div className={`lg:col-span-7 flex flex-col justify-center transition-all duration-1000 delay-300 ${isLoaded ? 'translate-y-0 opacity-100' : 'translate-y-10 opacity-0'}`}>
            <div className="inline-flex items-center gap-2 px-3 py-1.5 md:px-4 md:py-2 rounded-full bg-white/10 border border-white/20 backdrop-blur-md w-fit mb-6 md:mb-8">
              <span className="flex h-2 w-2 rounded-full bg-blue-400 animate-pulse"></span>
              <span className="text-white text-[9px] md:text-[10px] font-black uppercase tracking-widest">AEROPARK DIRECT</span>
            </div>

            <h1 className="text-4xl sm:text-5xl md:text-7xl font-bold text-white mb-4 md:mb-8 leading-[1.1] tracking-tight">
              Redefine your <br className="hidden sm:block" />
              <span className="text-blue-500">Departure.</span>
            </h1>

            <div className="space-y-4 md:space-y-6 max-w-xl">
              <p className="text-base sm:text-lg md:text-xl text-white leading-relaxed font-semibold opacity-90">
                Parking should be simple, secure, and completely stress-free. We connect you with trusted providers, ensuring your vehicle is in safe hands while you travel.
              </p>
              
              <p className="text-sm sm:text-base md:text-lg text-gray-300 leading-relaxed font-light hidden sm:block">
                Whether planning in advance or booking last minute, find the 
                right parking option tailored to your journey—quick, clear, and reliable.
              </p>

              <div className="flex items-center gap-4 pt-4 md:pt-6 border-t border-white/10">
                <p className="text-blue-400 font-bold tracking-widest uppercase text-[10px] md:text-xs">
                  Reliable • Secure • Simple
                </p>
              </div>
            </div>
          </div>

          {/* Booking Form - Highly Mobile Optimized */}
          <div className={`lg:col-span-5 flex justify-center lg:justify-end transition-all duration-1000 delay-700 w-full ${isLoaded ? 'translate-y-0 opacity-100' : 'translate-y-12 opacity-0'}`}>
            <div className="w-full max-w-[480px] bg-white/10 backdrop-blur-2xl border border-white/20 rounded-[2rem] md:rounded-[2.5rem] p-5 sm:p-6 md:p-8 shadow-2xl relative overflow-hidden">
              <div className="absolute top-0 right-0 w-64 h-64 bg-blue-500/20 rounded-full blur-[80px] pointer-events-none"></div>
              
              <form action="/results" method="GET" onSubmit={handleSearch} className="relative z-10 flex flex-col gap-4 md:gap-5">
                
                <div className="bg-white/5 border border-white/10 rounded-2xl p-3 md:p-4 group/input transition-colors hover:bg-white/10">
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-[9px] md:text-[10px] font-black uppercase tracking-widest text-slate-300">Select Departure Airport</label>
                    <div className="px-2 py-0.5 rounded-full bg-red-500/10 border border-red-500/20 text-red-400 text-[8px] md:text-[9px] font-black uppercase tracking-wider animate-pulse">Limited Spots</div>
                  </div>
                  <div className="relative">
                    <select name="airport" value={airport} onChange={(e) => setAirport(e.target.value)} className="w-full bg-transparent font-black text-white text-lg sm:text-xl md:text-2xl outline-none cursor-pointer appearance-none relative z-10">
                      <option value="Luton (LTN)" className="text-slate-900">Luton Airport (LTN)</option>
                      <option value="Heathrow (LHR)" className="text-slate-900">Heathrow Airport (LHR)</option>
                    </select>
                    <ChevronDown className="absolute right-0 top-1/2 -translate-y-1/2 w-4 h-4 md:w-5 md:h-5 text-slate-400 pointer-events-none" />
                  </div>
                </div>

                <div className="space-y-3 md:space-y-4">
                  {/* Drop-off Card */}
                  <div className="bg-white/5 border border-white/10 rounded-2xl p-3 md:p-4 transition-all focus-within:border-blue-500/50">
                    <div className="flex items-center gap-2 mb-2 md:mb-3 text-blue-300">
                      <PlaneTakeoff className="w-3.5 h-3.5 md:w-4 md:h-4" />
                      <label className="text-[9px] md:text-[10px] font-black uppercase tracking-widest text-slate-300">Drop-off</label>
                    </div>
                    {/* flex-row guarantees they stay side-by-side. w-28 limits time width so date fits */}
                    <div className="flex flex-row gap-2 h-12 md:h-11">
                      <input type="date" name="dropoffDate" min={todayStr} value={dropoffDate} onChange={(e) => setDropoffDate(e.target.value)} className="flex-1 min-w-0 bg-white text-slate-900 rounded-xl px-2 md:px-3 font-bold text-base md:text-sm outline-none focus:ring-2 focus:ring-blue-500" />
                      <input type="time" name="dropoffTime" value={dropoffTime} onChange={(e) => setDropoffTime(e.target.value)} className="w-28 sm:w-32 bg-white text-slate-900 rounded-xl px-2 font-bold text-base md:text-sm outline-none focus:ring-2 focus:ring-blue-500" />
                    </div>
                  </div>

                  {/* Pick-up Card */}
                  <div className="bg-white/5 border border-white/10 rounded-2xl p-3 md:p-4 transition-all focus-within:border-blue-500/50">
                    <div className="flex items-center gap-2 mb-2 md:mb-3 text-blue-300">
                      <Calendar className="w-3.5 h-3.5 md:w-4 md:h-4" />
                      <label className="text-[9px] md:text-[10px] font-black uppercase tracking-widest text-slate-300">Pick-up</label>
                    </div>
                    <div className="flex flex-row gap-2 h-12 md:h-11">
                      <input type="date" name="pickupDate" min={dropoffDate || todayStr} value={pickupDate} onChange={(e) => setPickupDate(e.target.value)} className="flex-1 min-w-0 bg-white text-slate-900 rounded-xl px-2 md:px-3 font-bold text-base md:text-sm outline-none focus:ring-2 focus:ring-blue-500" />
                      <input type="time" name="pickupTime" value={pickupTime} onChange={(e) => setPickupTime(e.target.value)} className="w-28 sm:w-32 bg-white text-slate-900 rounded-xl px-2 font-bold text-base md:text-sm outline-none focus:ring-2 focus:ring-blue-500" />
                    </div>
                  </div>
                </div>

                <button type="submit" className="w-full h-14 md:h-16 bg-blue-600 hover:bg-blue-500 text-white font-black rounded-2xl shadow-xl shadow-blue-600/20 active:scale-[0.98] transition-all flex items-center justify-center gap-2 md:gap-3 uppercase text-xs md:text-sm tracking-widest mt-1 md:mt-2">
                  Secure Parking <Search className="w-4 h-4 md:w-5 md:h-5" />
                </button>
              </form>
            </div>
            
            <button onClick={() => setIsMapOpen(true)} className="absolute -bottom-10 md:-bottom-12 flex items-center gap-2 text-slate-400 font-bold text-[10px] md:text-xs hover:text-white transition-colors w-full justify-center lg:justify-end pr-4">
              <Info className="w-3 h-3 md:w-4 md:h-4" /> .
            </button>
          </div>

        </div>
      </section>

      <section className="hidden relative z-20 -mt-12 px-6"> 
        {/* Hidden section preserved per your original code */}
      </section>

      {/* 3. CORE BENEFITS BANNER */}
      <div className="bg-slate-900 border-b border-white/10 py-10 md:py-14 relative z-20 shadow-2xl overflow-hidden">
        <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-5"></div>
        <div className="max-w-7xl mx-auto px-4 md:px-6 relative z-10">
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6 md:gap-8 divide-y sm:divide-y-0 md:divide-x divide-white/10">
            
            <div className="flex items-center gap-4 md:gap-5 md:px-8 pt-0">
              <div className="w-12 h-12 md:w-14 md:h-14 rounded-full bg-blue-500/10 border border-blue-500/20 flex items-center justify-center flex-shrink-0">
                <CarFront className="w-5 h-5 md:w-6 md:h-6 text-blue-400" />
              </div>
              <div>
                <h4 className="text-white font-black text-base md:text-lg tracking-tight mb-0.5 md:mb-1">Valet At Terminal</h4>
                <p className="text-slate-400 text-xs md:text-sm font-medium leading-snug">Direct meet & greet right at the airport drop-off zone.</p>
              </div>
            </div>

            <div className="flex items-center gap-4 md:gap-5 md:px-8 pt-6 sm:pt-0">
              <div className="w-12 h-12 md:w-14 md:h-14 rounded-full bg-blue-500/10 border border-blue-500/20 flex items-center justify-center flex-shrink-0">
                <CreditCard className="w-5 h-5 md:w-6 md:h-6 text-blue-400" />
              </div>
              <div>
                <h4 className="text-white font-black text-base md:text-lg tracking-tight mb-0.5 md:mb-1">All-Inclusive Rates</h4>
                <p className="text-slate-400 text-xs md:text-sm font-medium leading-snug">Terminal entry and exit fees are fully covered by us.</p>
              </div>
            </div>

            <div className="flex items-center gap-4 md:gap-5 md:px-8 pt-6 md:pt-0 sm:col-span-2 md:col-span-1 sm:border-t sm:border-white/10 md:border-t-0 sm:mt-2 md:mt-0">
              <div className="w-12 h-12 md:w-14 md:h-14 rounded-full bg-blue-500/10 border border-blue-500/20 flex items-center justify-center flex-shrink-0">
                <ShieldCheck className="w-5 h-5 md:w-6 md:h-6 text-blue-400" />
              </div>
              <div>
                <h4 className="text-white font-black text-base md:text-lg tracking-tight mb-0.5 md:mb-1">Premier Secure Parking</h4>
                <p className="text-slate-400 text-xs md:text-sm font-medium leading-snug">Gated, fenced, and 24/7 manned facility security.</p>
              </div>
            </div>

          </div>
        </div>
      </div>

      {/* 4. THE BENTO BOX */}
      <section id="services" className="py-16 md:py-24 px-4 md:px-6 bg-white">
        <div className="max-w-7xl mx-auto">
          <div className="mb-10 md:mb-16">
            <h2 className="text-3xl sm:text-4xl md:text-6xl font-black text-slate-900 tracking-tighter mb-4 md:mb-6 uppercase">
              The Standard of <br />
              <span className="text-blue-600">Excellence.</span>
            </h2>
            <p className="text-base md:text-lg text-slate-500 font-medium max-w-xl leading-relaxed border-l-4 border-blue-600 pl-4 md:pl-6">
              We eliminated shuttle buses. Experience airport parking designed around your schedule, not ours.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6">
            <div className="md:col-span-2 bg-slate-50 rounded-[2rem] md:rounded-[3rem] p-6 sm:p-8 md:p-14 border border-slate-100 relative overflow-hidden flex flex-col justify-between min-h-[400px] md:min-h-[500px]">
              <div className="absolute top-0 right-0 w-64 md:w-96 h-64 md:h-96 bg-blue-100/40 rounded-full blur-[80px] md:blur-[100px] -mr-10 md:-mr-20 -mt-10 md:-mt-20 pointer-events-none"></div>
              
              <div className="relative z-10">
                <div className="w-14 h-14 md:w-20 md:h-20 bg-blue-600 rounded-[1.5rem] md:rounded-[2rem] flex items-center justify-center shadow-xl md:shadow-2xl shadow-blue-500/20 mb-6 md:mb-10 text-white">
                  <Clock className="w-6 h-6 md:w-10 md:h-10" />
                </div>
                <h3 className="text-3xl sm:text-4xl md:text-5xl font-black text-slate-900 mb-4 md:mb-8 tracking-tight leading-none">
                  Zero Wait Time. <br/>Direct Access.
                </h3>
                <p className="text-slate-500 font-semibold text-base sm:text-lg md:text-xl leading-relaxed max-w-lg">
                  Hand your keys to our vetted chauffeurs exactly at terminal check-in. 
                  Walk 2 minutes to the gate. It's that simple.
                </p>
              </div>
              
              <div className="relative z-10 mt-8 md:mt-10">
                <span className="px-4 md:px-5 py-2 bg-white border border-slate-200 rounded-full text-[9px] md:text-[10px] font-black uppercase tracking-widest text-slate-400 inline-block">
                  Terminal 2, 3, 4, 5 & LTN
                </span>
              </div>
            </div>

            <div className="md:col-span-1 flex flex-col gap-4 md:gap-6">
              <div className="flex-1 bg-[#0F172A] rounded-[2rem] md:rounded-[3rem] p-6 md:p-10 flex flex-col justify-between group overflow-hidden relative">
                <div className="absolute bottom-0 right-0 w-32 h-32 bg-blue-500/10 rounded-full blur-3xl group-hover:bg-blue-500/20 transition-all duration-500"></div>
                <ShieldCheck className="w-10 h-10 md:w-14 md:h-14 text-blue-400 mb-6 md:mb-8" />
                <div>
                  <h3 className="text-xl md:text-2xl font-black text-white mb-2 md:mb-4 uppercase tracking-tight">24/7 Security</h3>
                  <p className="text-slate-400 text-xs md:text-sm font-medium leading-relaxed">
                    Your vehicle is moved to a private compound with HD CCTV and manned regular patrols.
                  </p>
                </div>
              </div>

              <div className="flex-1 bg-white rounded-[2rem] md:rounded-[3rem] p-6 md:p-10 border border-slate-200 shadow-sm flex flex-col justify-between group hover:border-blue-600 transition-colors duration-300">
                <CreditCard className="w-10 h-10 md:w-14 md:h-14 text-slate-900 mb-6 md:mb-0 group-hover:scale-110 transition-transform duration-300" />
                <div>
                  <h3 className="text-xl md:text-2xl font-black text-slate-900 mb-4 md:mb-6 uppercase tracking-tight">Pricing</h3>
                  <ul className="space-y-3 md:space-y-4">
                    {["Price match guarantee", "No hidden drop-off fees"].map((item, idx) => (
                      <li key={idx} className="flex items-center gap-2 md:gap-3 text-[10px] md:text-xs text-slate-600 font-black uppercase tracking-wider">
                        <CheckCircle2 className="w-3.5 h-3.5 md:w-4 md:h-4 text-emerald-500 shrink-0" /> {item}
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
      <section className="py-16 md:py-24 bg-white">
        <div className="max-w-7xl mx-auto px-4 md:px-6 text-center">
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-black text-slate-900 tracking-tight mb-10 md:mb-20">
            Seamless Departure in <span className="text-blue-600">3 Steps.</span>
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-10 md:gap-12 relative">
            <div className="relative group">
              <div className="w-20 h-20 md:w-24 md:h-24 bg-white border-2 border-slate-100 rounded-full flex items-center justify-center mx-auto mb-6 md:mb-8 shadow-xl group-hover:border-blue-500 transition-all duration-500 relative z-10">
                <Search className="w-8 h-8 md:w-10 md:h-10 text-blue-600" />
                <div className="absolute -top-1 -right-1 md:-top-2 md:-right-2 w-6 h-6 md:w-8 md:h-8 bg-slate-900 text-white rounded-full flex items-center justify-center text-[10px] md:text-xs font-black">01</div>
              </div>
              <h3 className="text-xl md:text-2xl font-black text-slate-900 mb-2 md:mb-4 tracking-tight">1. Choose</h3>
              <p className="text-slate-500 font-bold text-xs md:text-sm leading-relaxed max-w-[240px] mx-auto">
                Tell us your airport, date and time, and we'll do the rest.
              </p>
            </div>

            <div className="relative group">
              <div className="w-20 h-20 md:w-24 md:h-24 bg-white border-2 border-slate-100 rounded-full flex items-center justify-center mx-auto mb-6 md:mb-8 shadow-xl group-hover:border-blue-500 transition-all duration-500 relative z-10">
                <CreditCard className="w-8 h-8 md:w-10 md:h-10 text-blue-600" />
                <div className="absolute -top-1 -right-1 md:-top-2 md:-right-2 w-6 h-6 md:w-8 md:h-8 bg-slate-900 text-white rounded-full flex items-center justify-center text-[10px] md:text-xs font-black">02</div>
              </div>
              <h3 className="text-xl md:text-2xl font-black text-slate-900 mb-2 md:mb-4 tracking-tight">2. Book</h3>
              <p className="text-slate-500 font-bold text-xs md:text-sm leading-relaxed max-w-[240px] mx-auto">
                Choose your preferred option and complete your booking securely in minutes.
              </p>
            </div>

            <div className="relative group">
              <div className="w-20 h-20 md:w-24 md:h-24 bg-white border-2 border-slate-100 rounded-full flex items-center justify-center mx-auto mb-6 md:mb-8 shadow-xl group-hover:border-blue-500 transition-all duration-500 relative z-10">
                <Car className="w-8 h-8 md:w-10 md:h-10 text-blue-600" />
                <div className="absolute -top-1 -right-1 md:-top-2 md:-right-2 w-6 h-6 md:w-8 md:h-8 bg-slate-900 text-white rounded-full flex items-center justify-center text-[10px] md:text-xs font-black">03</div>
              </div>
              <h3 className="text-xl md:text-2xl font-black text-slate-900 mb-2 md:mb-4 tracking-tight">3. Park</h3>
              <p className="text-slate-500 font-bold text-xs md:text-sm leading-relaxed max-w-[240px] mx-auto">
                Arrive at your parking location, follow the instructions, and you’re ready to go.
              </p>
            </div>

            <div className="hidden md:block absolute top-12 left-0 w-full h-[2px] bg-slate-100 -z-0"></div>
          </div>
        </div>
      </section>

      {/* 6. FOOTER */}
      <footer className="bg-[#0B1121] py-8 md:py-14 px-4 md:px-6 border-t border-white/5">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6 md:gap-4">
           
           <Link href="/" className="flex items-center w-full md:w-1/3 justify-center md:justify-start">
             <div className="bg-white px-2.5 py-1.5 rounded-lg shadow-sm">
               <Image 
                 src="/footer.jpg" 
                 alt="AeroPark Direct"
                 width={200}
                 height={60}
                 className="h-6 md:h-9 w-auto object-contain" 
               />
             </div>
           </Link>
           
           <div className="flex flex-wrap justify-center gap-4 md:gap-10 text-slate-300/80 text-[9px] md:text-[11px] font-bold uppercase tracking-[0.15em] md:tracking-[0.2em] w-full md:w-1/3">
             <Link href="/privacy" className="hover:text-white transition-colors">Privacy Policy</Link>
             <Link href="/terms" className="hover:text-white transition-colors">Terms</Link>
             <Link href="/contact" className="hover:text-white transition-colors">Support</Link>
           </div>
           
           <div className="text-slate-500/70 font-bold text-[8px] md:text-[10px] uppercase tracking-[0.15em] md:tracking-widest w-full md:w-1/3 text-center md:text-right">
             © {new Date().getFullYear()} AeroPark Direct
           </div>
           
        </div>
      </footer>

      <MapModal isOpen={isMapOpen} onClose={() => setIsMapOpen(false)} />
    </main>
  );
}