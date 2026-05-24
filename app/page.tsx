"use client";
import { useRouter } from "next/navigation";
import { useState, useEffect, useRef } from "react";
import AeroFeature from "@/components/AeroFeature";
import { supabase } from "./lib/supabase"; 
import { 
  User, 
  Calendar, 
  PlaneTakeoff,
  ShieldCheck,
  Star,
  CreditCard,
  Menu,
  X,
  ChevronRight,
  Info,
  ChevronDown,
  Search,
  Car,
  Mic,
  Sparkles,
  Loader2,
  ArrowRight,
  Plane,
  CheckCircle2,
  Zap,
  HelpCircle
} from "lucide-react";
import Link from "next/link";
import Image from "next/image";
import MapModal from "@/components/MapModal";
import PriceMatchModal from "@/components/PriceMatchModal";

export default function HomePage() {
  const router = useRouter();
  
  const [now, setNow] = useState<Date | null>(null); 
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isMapOpen, setIsMapOpen] = useState(false);
  const [isPriceMatchOpen, setIsPriceMatchOpen] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false); 

  // --- SEARCH STATES ---
  const [activeTab, setActiveTab] = useState<'manual' | 'magic'>('manual');
  const [airport, setAirport] = useState("Luton (LTN)");
  const [dropoffDate, setDropoffDate] = useState("");
  const [dropoffTime, setDropoffTime] = useState("");
  const [pickupDate, setPickupDate] = useState("");
  const [pickupTime, setPickupTime] = useState("18:00");

  // --- MAGIC AI STATES ---
  const [magicText, setMagicText] = useState("");
  const [isListening, setIsListening] = useState(false);
  const [isThinking, setIsThinking] = useState(false);
  const [fastTrackStatus, setFastTrackStatus] = useState(""); 

  // --- FAQ STATE ---
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  useEffect(() => {
    const today = new Date();
    setNow(today);
    
    setDropoffDate(today.toISOString().split("T")[0]);
    setDropoffTime(today.toTimeString().slice(0, 5));
    setPickupDate(today.toISOString().split("T")[0]);
    
    setIsLoaded(true);

    const timer = setInterval(() => setNow(new Date()), 60000);
    return () => clearInterval(timer);
  }, []);

  const todayStr = now?.toISOString().split("T")[0] || "";
  const currentTimeStr = now?.toTimeString().slice(0, 5) || "";

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
      airport, dropoffDate, dropoffTime, pickupDate, pickupTime
    }).toString();
    
    router.push(`/select-service?${query}`);
  };

  const startListening = (e: React.MouseEvent) => {
    e.preventDefault(); 
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert("Your browser doesn't support Voice Search. Please type your request instead!");
      return;
    }

    try {
      const recognition = new SpeechRecognition();
      recognition.continuous = false;
      recognition.lang = 'en-GB';
      
      recognition.onstart = () => setIsListening(true);
      recognition.onresult = (event: any) => {
        setMagicText(event.results[0][0].transcript);
        setIsListening(false);
      };
      recognition.onerror = (event: any) => {
        setIsListening(false);
        if (event.error === 'not-allowed') {
          alert("Microphone access blocked! Look for the tiny camera/mic icon in your URL bar to allow access.");
        }
      };
      recognition.onend = () => setIsListening(false);
      recognition.start();
    } catch (err) {
      setIsListening(false);
    }
  };

  const handleMagicSubmit = async () => {
    if (!magicText.trim()) return;
    setIsThinking(true);
    setFastTrackStatus("Aero is parsing your request...");

    try {
      const res = await fetch('/api/aero-magic', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: magicText, currentDate: new Date().toISOString() })
      });
      const data = await res.json();
      
      if (data.airport && data.dropoffDate) {
        
        const baseParams: any = {
          airport: data.airport,
          dropoffDate: data.dropoffDate,
          dropoffTime: data.dropoffTime,
          pickupDate: data.pickupDate,
          pickupTime: data.pickupTime,
          terminal: data.terminal || '',
          travelGroupType: data.travelGroupType,
          hasOversizedLuggage: String(data.hasOversizedLuggage || false),
          isRedEye: String(data.isRedEye || false),
          isLastMinute: String(data.isLastMinute || false),
          isBudgetFocused: String(data.isBudgetFocused || false),
          isFrequentFlyer: String(data.isFrequentFlyer || false),
          ulezRisk: String(data.ulezRisk || false),
          hasPet: String(data.hasPet || false),
          isWinter: String(data.isWinter || false),
          requiresCoveredParking: String(data.requiresCoveredParking || false),
          aeroTip: data.aeroTip || '',
          upsells: data.suggestedAncillaries?.join(',') || '',
          isCorporate: String(data.travelGroupType === 'corporate')
        };

        if (data.servicePreference) baseParams.type = data.servicePreference;
        if (data.flightNumber) baseParams.flightNumber = data.flightNumber.toUpperCase();

        if (data.isReadyToBook && data.servicePreference) {
           setFastTrackStatus("Fast-Track Activated. Finding best operator...");
           const isHeathrow = data.airport.includes("Heathrow");
           
           const { data: companies } = await supabase.from('companies').select('*');
           
           if (companies) {
              const available = companies.filter(c => {
                 const cat = c.category?.toLowerCase().replace(/ & /g, '-').replace(/\s+/g, '-').trim();
                 const rightCat = cat === data.servicePreference;
                 const rightAir = isHeathrow ? c.operates_at_heathrow : c.operates_at_luton;
                 const soldOut = isHeathrow ? c.lhr_sold_out : c.ltn_sold_out;
                 return rightCat && rightAir && c.is_active && !soldOut;
              });

              if (available.length > 0) {
                 available.sort((a, b) => {
                    const aPremium = isHeathrow ? a.lhr_featured : a.ltn_featured;
                    const bPremium = isHeathrow ? b.lhr_featured : b.ltn_featured;
                    if (aPremium && !bPremium) return -1;
                    if (!aPremium && bPremium) return 1;
                    return 0;
                 });

                 const bestOption = available[0];
                 const dailyRate = isHeathrow ? bestOption.heathrow_price : bestOption.luton_price;

                 setFastTrackStatus(`Secured ${bestOption.name}. Teleporting to Checkout...`);

                 const checkoutQuery = new URLSearchParams({
                   ...baseParams,
                   type: bestOption.name,
                   price: dailyRate.toString(),
                 }).toString();

                 router.push(`/checkout?${checkoutQuery}`);
                 return; 
              }
           }
        }

        setFastTrackStatus("Loading available operators...");
        const query = new URLSearchParams(baseParams).toString();
        router.push(`/results?${query}`);

      } else {
        alert("Aero couldn't fully understand that. Please try typing it differently.");
        setIsThinking(false);
      }
    } catch (e) {
      alert("AI Services are taking a break. Please use Manual Search.");
      setIsThinking(false);
    }
  };

  const faqs = [
    {
      q: "What is an Airport Parking Agent?",
      a: "As booking agents, we curate and contract only top-rated, fully insured airport parking providers. We handle your logistics, customer support, and gate verification so you bypass unvetted operators entirely."
    },
    {
      q: "How does the Aero Magic Search work?",
      a: "Our signature Aero Magic engine uses neural parsing. Instead of selecting filters manually, you can simply type or speak your flight details and preferences. The AI dynamically calculates your drop-off logistics instantly."
    },
    {
      q: "What happens if my return flight is delayed?",
      a: "Aero Bot actively tracks live aviation networks. If your flight arrives early or late, your handover logistics are updated automatically on our dispatcher panel so your vehicle awaits you custom-timed."
    },
    {
      q: "How safe is my vehicle during my trip?",
      a: "We perform strict audits on every parking partner compound. All vehicles are housed securely in sites protected by round-the-clock CCTV configurations, perimeter security fencing, and dynamic guard controls."
    },
    {
      q: "How do I claim a Best Price Match?",
      a: "If you discover an identical operator profile with cheaper rates within 24 hours of selection, click 'Claim Price Match' above. Our platform notifies our desk instantly to verify and credit the margin difference directly back to you."
    }
  ];

  return (
    <main suppressHydrationWarning className="min-h-[100dvh] bg-[#F8FAFC] font-sans antialiased selection:bg-blue-600 selection:text-white overflow-x-hidden">
      
      {/* 🟢 1. PREMIUM NAVBAR - STICKY AND PINNED */}
      <nav className={`sticky top-0 w-full z-[100] bg-white/80 backdrop-blur-xl border-b border-slate-200 transition-all duration-1000 ${isLoaded ? 'translate-y-0 opacity-100' : '-translate-y-full opacity-0'}`}>
        <div className="max-w-7xl mx-auto px-4 md:px-6 h-20 md:h-24 flex items-center justify-between overflow-hidden">
          
          <Link href="/" className="flex items-center z-50 overflow-visible touch-manipulation [-webkit-tap-highlight-color:transparent]">
            <Image 
              src="/logo.png" 
              alt="AeroPark Direct"
              width={400} 
              height={120}
              priority
              className="h-12 md:h-20 w-auto object-contain scale-[1.8] md:scale-[1.35] origin-left mix-blend-multiply -translate-x-4 md:translate-x-0 ml-6 md:ml-0" 
            />
          </Link>
          
          <div className="hidden md:flex items-center gap-8">
            <a href="#services" className="text-[11px] font-black uppercase tracking-[0.15em] text-slate-500 hover:text-slate-900 transition-colors relative group">
              Services
              <span className="absolute -bottom-2 left-0 w-0 h-[2px] bg-blue-600 transition-all duration-300 group-hover:w-full"></span>
            </a>
            <Link href="/how-it-works" className="text-[11px] font-black uppercase tracking-[0.15em] text-slate-500 hover:text-slate-900 transition-colors relative group">
              How it works
              <span className="absolute -bottom-2 left-0 w-0 h-[2px] bg-blue-600 transition-all duration-300 group-hover:w-full"></span>
            </Link>
                
            <div className="h-6 w-px bg-slate-200 ml-2"></div>

            <Link href="/manage" className="flex items-center gap-2 text-[11px] font-black uppercase tracking-[0.15em] text-white bg-slate-900 px-6 py-3 rounded-full hover:bg-blue-600 transition-all active:scale-95 ml-2 touch-manipulation">
              <User className="w-4 h-4" /> Manage Booking
            </Link>
          </div>
          
          <button onClick={() => setIsMenuOpen(true)} className="md:hidden p-2.5 text-slate-900 bg-slate-100 rounded-xl active:scale-90 transition-transform relative z-50 touch-manipulation [-webkit-tap-highlight-color:transparent]">
            <Menu className="w-6 h-6" />
          </button>
        </div>
      </nav>
      

      {/* MOBILE MENU */}
      <div className={`md:hidden fixed inset-0 z-[9999] bg-white transition-all duration-500 ease-in-out flex flex-col ${isMenuOpen ? 'opacity-100 translate-x-0 visible' : 'opacity-0 translate-x-full invisible pointer-events-none'}`}>
        <div className="h-20 px-6 flex items-center justify-between border-b border-slate-100 shrink-0 overflow-hidden">
          <Link href="/" onClick={() => setIsMenuOpen(false)} className="flex items-center overflow-visible touch-manipulation [-webkit-tap-highlight-color:transparent]">
            <Image 
              src="/logo.png" 
              alt="AeroPark Direct"
              width={250}
              height={80}
              className="h-12 w-auto object-contain scale-[1.8] origin-left mix-blend-multiply -translate-x-4 ml-6" 
            />
          </Link>
          <button onClick={() => setIsMenuOpen(false)} className="p-3 text-slate-900 bg-slate-100 rounded-full touch-manipulation [-webkit-tap-highlight-color:transparent]">
            <X className="w-6 h-6" />
          </button>
        </div>
        
        <div className="flex flex-col px-8 py-12 gap-2 flex-grow overflow-y-auto bg-white">
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-4">Main Menu</p>
          
          <a href="#services" onClick={() => setIsMenuOpen(false)} className="flex items-center justify-between py-6 text-2xl font-black text-slate-900 border-b border-slate-50 touch-manipulation [-webkit-tap-highlight-color:transparent]">
            Services <ChevronRight className="w-6 h-6 text-blue-500" />
          </a>
          
          <Link href="/how-it-works" onClick={() => setIsMenuOpen(false)} className="flex items-center justify-between py-6 text-2xl font-black text-slate-900 border-b border-slate-50 touch-manipulation [-webkit-tap-highlight-color:transparent]">
            How it works <ChevronRight className="w-6 h-6 text-blue-500" />
          </Link>

          <Link href="/manage" onClick={() => setIsMenuOpen(false)} className="flex items-center justify-between py-6 text-2xl font-black text-slate-900 touch-manipulation [-webkit-tap-highlight-color:transparent]">
            Manage Trip <ChevronRight className="w-6 h-6 text-blue-500" />
          </Link>
        </div>

        <div className="p-8 pb-10 border-t border-slate-100 bg-white shrink-0">
          <Link 
            href="/manage" 
            onClick={() => setIsMenuOpen(false)} 
            className="w-full py-4 bg-blue-600 text-white font-black rounded-2xl text-lg flex items-center justify-center shadow-xl shadow-blue-200 active:scale-95 transition-transform touch-manipulation [-webkit-tap-highlight-color:transparent]"
          >
            Sign In to Booking
          </Link>
        </div>
      </div>

      {/* 🟢 2. IMMERSIVE HERO SECTION */}
      <section className="relative min-h-[100dvh] w-full flex items-center justify-center overflow-hidden bg-slate-950 pt-24 pb-12 md:py-20">
        <div className="absolute inset-0 z-0 overflow-hidden">
          <div className={`absolute inset-0 bg-cover bg-center transition-all duration-[3000ms] ease-out origin-center ${isLoaded ? 'scale-105 opacity-100' : 'scale-150 opacity-0'}`} style={{ backgroundImage: "url('https://images.unsplash.com/photo-1436491865332-7a61a109cc05?q=80&w=2074&auto=format&fit=crop')" }}></div>
          <div className={`absolute inset-0 bg-gradient-to-b md:bg-gradient-to-r from-slate-950 via-slate-900/80 md:via-slate-900/60 to-transparent transition-opacity duration-[2500ms] ${isLoaded ? 'opacity-100' : 'opacity-0'}`}></div>
          <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-10 mix-blend-overlay"></div>
        </div>

        <div className="relative z-10 w-full max-w-7xl mx-auto px-4 sm:px-6 md:px-12 grid grid-cols-1 lg:grid-cols-12 gap-8 md:gap-12 items-center mt-6 md:mt-0">
          
          {/* Hero Text */}
          <div className={`lg:col-span-7 flex flex-col items-center text-center lg:items-start lg:text-left justify-center transition-all duration-1000 delay-300 ${isLoaded ? 'translate-y-0 opacity-100' : 'translate-y-10 opacity-0'}`}>
            <div className="inline-flex items-center gap-2 px-3 py-1.5 md:px-4 md:py-2 rounded-full bg-white/10 border border-white/20 backdrop-blur-md w-fit mb-6 md:mb-8">
              <span className="flex h-2 w-2 rounded-full bg-blue-400 animate-pulse"></span>
              <span className="text-white text-[9px] md:text-[10px] font-black uppercase tracking-widest">AEROPARK DIRECT</span>
            </div>

            <h1 className="text-4xl sm:text-5xl md:text-7xl font-bold text-white mb-4 md:mb-8 leading-[1.1] tracking-tight">
              Redefine your <br className="hidden sm:block" />
              <span className="text-blue-500">Departure.</span>
            </h1>

            <div className="space-y-4 md:space-y-6 max-w-xl flex flex-col items-center lg:items-start">
              <p className="text-base sm:text-lg md:text-xl text-white leading-relaxed font-semibold opacity-90">
                Parking should be simple, secure, and completely stress-free. We connect you with trusted providers, ensuring your vehicle is in safe hands while you travel.
              </p>
              
              <p className="text-sm sm:text-base md:text-lg text-gray-300 leading-relaxed font-light hidden sm:block">
                Whether planning in advance or booking last minute, find the right parking option tailored to your journey—quick, clear, and reliable.
              </p>

              <div className="flex items-center justify-center lg:justify-start gap-4 pt-4 md:pt-6 border-t border-white/10 w-3/4 lg:w-full">
                <p className="text-blue-400 font-bold tracking-widest uppercase text-[10px] md:text-xs">
                  Reliable • Secure • Simple
                </p>
              </div>
            </div>
          </div>

          {/* Booking Form - With Redesigned Sleek Omni-Search */}
          <div className={`lg:col-span-5 flex justify-center lg:justify-end transition-all duration-1000 delay-700 w-full ${isLoaded ? 'translate-y-0 opacity-100' : 'translate-y-12 opacity-0'}`}>
            <div className="w-full max-w-[480px] bg-white/10 backdrop-blur-2xl border border-white/20 rounded-[2rem] md:rounded-[2.5rem] p-5 sm:p-6 md:p-8 shadow-2xl relative overflow-hidden flex flex-col">
              <div className="absolute top-0 right-0 w-64 h-64 bg-blue-500/20 rounded-full blur-[80px] pointer-events-none"></div>
              
              <div className="relative z-10 w-full">
                
                {/* 🌟 1. SLEEK AERO MAGIC SEARCH */}
                <div className="mb-6 md:mb-8">
                  <label className="flex items-center justify-center gap-2 text-[10px] md:text-xs font-black uppercase tracking-widest text-blue-300 mb-4">
                    <Sparkles className="w-3.5 h-3.5 animate-pulse" /> Aero Magic Search
                  </label>
                  
                  <div className="relative flex items-center bg-[#0B1121]/60 backdrop-blur-md border border-white/20 focus-within:border-blue-500 focus-within:ring-4 focus-within:ring-blue-500/20 rounded-2xl p-1.5 transition-all shadow-inner group">
                    <input 
                      type="text"
                      value={magicText}
                      onChange={(e) => setMagicText(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleMagicSubmit()}
                      placeholder={isListening ? "Listening... Speak now" : "e.g. Meet and Greet at Heathrow next Friday, flight BA123..."}
                      autoComplete="off"
                      spellCheck="false"
                      className="flex-1 w-full min-w-0 bg-transparent text-white text-sm md:text-base px-4 py-3 outline-none placeholder:text-slate-400 font-medium touch-manipulation"
                      style={{ background: 'transparent', color: 'white' }}
                    />
                    
                    <div className="flex items-center gap-1 shrink-0">
                      <button 
                        type="button"
                        onClick={startListening} 
                        className={`p-3 rounded-xl transition-all touch-manipulation flex items-center justify-center ${isListening ? 'bg-red-500/20 text-red-400 animate-pulse' : 'bg-transparent hover:bg-white/10 text-slate-400 hover:text-white'}`}
                      >
                        <Mic className="w-5 h-5" />
                      </button>
                      
                      <button 
                        type="button"
                        onClick={handleMagicSubmit} 
                        disabled={isThinking || !magicText.trim()}
                        className="px-4 py-3 bg-blue-600 hover:bg-blue-500 disabled:bg-slate-700 disabled:text-slate-400 text-white rounded-xl font-black transition-all flex items-center justify-center touch-manipulation"
                      >
                        {isThinking ? <Loader2 className="w-5 h-5 animate-spin"/> : <ArrowRight className="w-5 h-5"/>}
                      </button>
                    </div>
                  </div>
                  <p className="text-center text-[8px] md:text-[9px] text-blue-300/70 uppercase tracking-widest mt-2 h-4">
                    {isThinking ? fastTrackStatus : "✨ Powered by Aero Intelligence"}
                  </p>
                </div>

                {/* ➖ SUBTLE DIVIDER ➖ */}
                <div className="flex items-center gap-4 mb-6 md:mb-8 opacity-60">
                  <div className="h-px bg-white/20 flex-1"></div>
                  <span className="text-[9px] uppercase tracking-[0.2em] text-slate-300 font-black whitespace-nowrap">Or select manually</span>
                  <div className="h-px bg-white/20 flex-1"></div>
                </div>

                {/* 2. MANUAL FORM */}
                <form action="/results" method="GET" onSubmit={handleSearch} className="relative z-10 flex flex-col gap-4 md:gap-5 animate-in fade-in slide-in-from-bottom-4 duration-300">
                  <div className="bg-white/5 border border-white/10 rounded-2xl p-3 md:p-4 group/input transition-colors hover:bg-white/10">
                    <div className="flex items-center justify-between mb-2">
                      <label className="text-[9px] md:text-[10px] font-black uppercase tracking-widest text-slate-300">Select Departure Airport</label>
                    </div>
                    <div className="relative">
                      <select name="airport" value={airport} onChange={(e) => setAirport(e.target.value)} className="w-full bg-transparent font-black text-white text-lg sm:text-xl md:text-2xl outline-none cursor-pointer appearance-none relative z-10 touch-manipulation [-webkit-tap-highlight-color:transparent]">
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
                      <div className="grid grid-cols-[3fr_2fr] gap-2 h-12 md:h-11">
                        <input type="date" name="dropoffDate" min={todayStr} value={dropoffDate} onChange={(e) => setDropoffDate(e.target.value)} className="w-full bg-white text-slate-900 rounded-xl px-2 md:px-3 font-bold text-base md:text-sm outline-none focus:ring-2 focus:ring-blue-500 touch-manipulation" />
                        <input type="time" name="dropoffTime" value={dropoffTime} onChange={(e) => setDropoffTime(e.target.value)} className="w-full bg-white text-slate-900 rounded-xl px-2 font-bold text-base md:text-sm outline-none focus:ring-2 focus:ring-blue-500 touch-manipulation" />
                      </div>
                    </div>

                    {/* Pick-up Card */}
                    <div className="bg-white/5 border border-white/10 rounded-2xl p-3 md:p-4 transition-all focus-within:border-blue-500/50">
                      <div className="flex items-center gap-2 mb-2 md:mb-3 text-blue-300">
                        <Calendar className="w-3.5 h-3.5 md:w-4 md:h-4" />
                        <label className="text-[9px] md:text-[10px] font-black uppercase tracking-widest text-slate-300">Pick-up</label>
                      </div>
                      <div className="grid grid-cols-[3fr_2fr] gap-2 h-12 md:h-11">
                        <input type="date" name="pickupDate" min={dropoffDate || todayStr} value={pickupDate} onChange={(e) => setPickupDate(e.target.value)} className="w-full bg-white text-slate-900 rounded-xl px-2 md:px-3 font-bold text-base md:text-sm outline-none focus:ring-2 focus:ring-blue-500 touch-manipulation" />
                        <input type="time" name="pickupTime" value={pickupTime} onChange={(e) => setPickupTime(e.target.value)} className="w-full bg-white text-slate-900 rounded-xl px-2 font-bold text-base md:text-sm outline-none focus:ring-2 focus:ring-blue-500 touch-manipulation" />
                      </div>
                    </div>
                  </div>

                  <button type="submit" className="w-full h-14 md:h-16 bg-blue-600 hover:bg-blue-500 text-white font-black rounded-2xl shadow-xl shadow-blue-600/20 active:scale-[0.98] transition-all flex items-center justify-center gap-2 md:gap-3 uppercase text-xs md:text-sm tracking-widest mt-1 md:mt-2 touch-manipulation [-webkit-tap-highlight-color:transparent]">
                    Secure Parking <Search className="w-4 h-4 md:w-5 md:h-5" />
                  </button>
                </form>

                {/* 🟢 THE LIVE PULSE ACTIVITY */}
                <div className="mt-5 p-3.5 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="relative flex h-2 w-2">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                    </div>
                    <span className="text-[9px] font-black uppercase tracking-widest text-emerald-400">Aero Live Update</span>
                  </div>
                  <p className="text-[9px] text-slate-300 font-bold">12 travelers booked in the last hour</p>
                </div>

              </div>
            </div>
            
            <button onClick={() => setIsMapOpen(true)} className="absolute -bottom-10 md:-bottom-12 flex items-center gap-2 text-slate-400 font-bold text-[10px] md:text-xs hover:text-white transition-colors w-full justify-center lg:justify-end pr-4 touch-manipulation [-webkit-tap-highlight-color:transparent]">
              <Info className="w-3 h-3 md:w-4 md:h-4" /> View Map Instructions
            </button>
          </div>

        </div>
      </section>

      {/* 🟢 3. THE SMART VETTING SECTION */}
      <AeroFeature />

      {/* 🟢 AIRPORT SEO HUB */}
      <section className="py-16 md:py-24 bg-[#0A101D] px-4 md:px-6">
        <div className="max-w-7xl mx-auto">
          <h2 className="text-3xl md:text-5xl font-black text-white mb-12 tracking-tight text-center">
            Popular <span className="text-blue-500">Destinations</span>
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-8">
            {[
              { 
                name: "Luton Airport Parking", 
                code: "LTN", 
                desc: "Fast, reliable Meet & Greet services. Drive straight to the terminal forecourt.",
                query: "Luton (LTN)"
              },
              { 
                name: "Heathrow Airport Parking", 
                code: "LHR", 
                desc: "Premium chauffeur-style parking across all terminals. Your car, in safe hands.",
                query: "Heathrow (LHR)"
              }
            ].map((airport, i) => (
              <Link 
                key={i} 
                href={`/select-service?airport=${encodeURIComponent(airport.query)}&dropoffDate=${todayStr}&pickupDate=${todayStr}`}
                className="group bg-[#0F1523] border border-slate-800 hover:border-blue-500/50 p-8 rounded-[2rem] transition-all duration-300 hover:shadow-[0_20px_50px_-10px_rgba(37,99,235,0.2)] block"
              >
                <div className="flex justify-between items-start mb-6">
                  <div className="w-16 h-16 bg-blue-600/10 rounded-2xl flex items-center justify-center text-blue-500">
                    <Plane className="w-8 h-8" />
                  </div>
                  <span className="text-3xl font-black text-slate-700 group-hover:text-blue-500 transition-colors">
                    {airport.code}
                  </span>
                </div>
                <h3 className="text-2xl font-black text-white mb-3">{airport.name}</h3>
                <p className="text-slate-400 font-medium mb-6">{airport.desc}</p>
                <div className="flex items-center text-blue-500 font-black uppercase text-xs tracking-widest group-hover:gap-4 transition-all">
                  Book Parking <ArrowRight className="w-4 h-4 ml-2" />
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* 🟢 PRICE MATCH & AI SPOTLIGHT */}
      <section className="py-16 md:py-24 px-4 bg-[#0A101D] border-t border-white/5">
        <div className="max-w-7xl mx-auto">
          
          {/* Price Match Container connected to Modal */}
          <div className="bg-blue-600 rounded-[2rem] p-8 md:p-12 text-white flex flex-col md:flex-row items-center justify-between gap-6 mb-16">
            <div>
              <h3 className="text-2xl font-black mb-2 uppercase tracking-tight">Best Price Guarantee</h3>
              <p className="text-blue-100 text-sm font-medium">Found a cheaper price for the same service? Let us know, and we'll match it.</p>
            </div>
            <button 
              onClick={() => setIsPriceMatchOpen(true)}
              className="bg-white text-blue-600 font-black px-8 py-4 rounded-xl text-xs uppercase tracking-widest hover:scale-105 transition-transform"
            >
              Claim Price Match
            </button>
          </div>

          {/* Aero Intelligence Spotlight */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 text-center">
            {[
              { title: "Flight Monitoring", desc: "Aero Bot tracks your flight. If you land late, your parking schedule updates automatically." },
              { title: "Terminal-Specific", desc: "We map you to the exact row, saving you time walking through crowded car parks." },
              { title: "Secure Handover", desc: "Every driver is DBS checked and photos are taken upon entry to ensure complete peace of mind." }
            ].map((feature, i) => (
              <div key={i} className="p-6 bg-[#0F1523] border border-slate-800 rounded-2xl hover:border-blue-500/30 transition-all">
                <h4 className="text-white font-black mb-2">{feature.title}</h4>
                <p className="text-slate-500 text-sm font-medium leading-relaxed">{feature.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 4. THE BENTO BOX */}
      <section id="services" className="py-16 md:py-24 px-4 md:px-6 bg-white">
        <div className="max-w-7xl mx-auto">
          <div className="mb-10 md:mb-16 flex flex-col items-center text-center lg:items-start lg:text-left">
            <h2 className="text-3xl sm:text-4xl md:text-6xl font-black text-slate-900 tracking-tighter mb-4 md:mb-6 uppercase">
              The Standard of <br />
              <span className="text-blue-600">Excellence.</span>
            </h2>
            <p className="text-base md:text-lg text-slate-500 font-medium max-w-xl leading-relaxed border-t-4 lg:border-t-0 lg:border-l-4 border-blue-600 pt-4 lg:pt-0 pl-0 lg:pl-6">
              From premium Meet & Greet to cost-effective Park & Ride. Find the perfect parking solution tailored to your schedule and budget.
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 md:gap-6 mb-4 md:mb-6">
            <div className="lg:col-span-2 bg-slate-50 rounded-[2rem] md:rounded-[3rem] p-6 sm:p-8 md:p-14 border border-slate-100 relative overflow-hidden flex flex-col justify-center min-h-[400px] md:min-h-[500px]">
              <div className="absolute top-0 right-0 w-64 md:w-96 h-64 md:h-96 bg-blue-100/40 rounded-full blur-[80px] md:blur-[100px] -mr-10 md:-mr-20 -mt-10 md:-mt-20 pointer-events-none"></div>
              
              <div className="relative z-10 flex flex-col items-center text-center lg:items-start lg:text-left">
                <div className="w-14 h-14 md:w-20 md:h-20 bg-blue-600 rounded-[1.5rem] md:rounded-[2rem] flex items-center justify-center shadow-xl md:shadow-2xl shadow-blue-500/20 mb-6 md:mb-10 text-white">
                  <Car className="w-6 h-6 md:w-10 md:h-10" />
                </div>
                <h3 className="text-3xl sm:text-4xl md:text-5xl font-black text-slate-900 mb-4 md:mb-8 tracking-tight leading-[1.1]">
                  Compare Trusted <br className="hidden sm:block"/>Airport Parking Operators.
                </h3>
                <p className="text-slate-500 font-semibold text-base sm:text-lg md:text-xl leading-relaxed max-w-lg">
                  We bring the top-rated providers together in one place so you can find the perfect balance of convenience and value for your trip.
                </p>
              </div>
            </div>

            <div className="lg:col-span-1 flex flex-col gap-4 md:gap-6">
              <div className="flex-1 bg-[#0F172A] rounded-[2rem] md:rounded-[3rem] p-6 md:p-8 flex flex-col justify-between items-center text-center lg:items-start lg:text-left group overflow-hidden relative">
                <div className="absolute bottom-0 right-0 w-32 h-32 bg-blue-500/10 rounded-full blur-3xl group-hover:bg-blue-500/20 transition-all duration-500"></div>
                <ShieldCheck className="w-10 h-10 md:w-12 md:h-12 text-blue-400 mb-4 md:mb-6" />
                <div>
                  <h3 className="text-xl md:text-2xl font-black text-white mb-2 md:mb-3 uppercase tracking-tight">24/7 Security</h3>
                  <p className="text-slate-400 text-xs md:text-sm font-medium leading-relaxed">
                    We ensure all operators are equipped with CCTV and on-site measures to safeguard your vehicle at all times.
                  </p>
                </div>
              </div>

              <div className="flex-1 bg-white rounded-[2rem] md:rounded-[3rem] p-6 md:p-8 border border-slate-200 shadow-sm flex flex-col justify-between items-center text-center lg:items-start lg:text-left group hover:border-blue-600 transition-colors duration-300">
                <CreditCard className="w-10 h-10 md:w-12 md:h-12 text-slate-900 mb-4 md:mb-6 group-hover:scale-110 transition-transform duration-300" />
                <div>
                  <h3 className="text-xl md:text-2xl font-black text-slate-900 mb-3 md:mb-4 uppercase tracking-tight">Great Value</h3>
                  <p className="text-slate-600 text-xs md:text-sm font-medium leading-relaxed">No hidden fees, ever. Our prices are transparent, with a price match guarantee for the best value on your airport parking.</p>
                </div>
              </div>
              
              <div className="flex-1 bg-slate-50 rounded-[2rem] md:rounded-[3rem] p-6 md:p-8 border border-slate-200 shadow-sm flex flex-col justify-between items-center text-center lg:items-start lg:text-left group hover:border-amber-500 transition-colors duration-300">
                <Star className="w-10 h-10 md:w-12 md:h-12 text-amber-400 mb-4 md:mb-6 group-hover:scale-110 transition-transform duration-300 fill-current" />
                <div>
                  <h3 className="text-xl md:text-2xl font-black text-slate-900 mb-2 md:mb-3 uppercase tracking-tight">Reliable Trust</h3>
                  <p className="text-slate-500 text-xs md:text-sm font-medium leading-relaxed">
                    Customer rated security you can rely on. Book with confidence.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 4.5 HOW IT WORKS SECTION */}
      <section className="py-16 md:py-24 bg-white border-t border-slate-100">
        <div className="max-w-7xl mx-auto px-4 md:px-6 text-center">
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-black text-slate-900 tracking-tight mb-10 md:mb-20">
            Seamless Departure in <span className="text-blue-600">3 Steps.</span>
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-10 md:gap-12 relative">
            <div className="relative group">
              <div className="w-20 h-20 md:w-24 md:h-24 bg-white border-2 border-slate-100 rounded-full flex items-center justify-center mx-auto mb-6 md:mb-8 shadow-xl group-hover:border-blue-500 transition-all duration-500 relative z-10">
                <Search className="w-8 h-8 md:w-10 md:h-10 text-blue-600" />
              </div>
              <h3 className="text-xl md:text-2xl font-black text-slate-900 mb-2 md:mb-4 tracking-tight">1. Choose</h3>
              <p className="text-slate-500 font-bold text-xs md:text-sm leading-relaxed max-w-[240px] mx-auto">
                Tell us your airport, date and time, and we'll do the rest.
              </p>
            </div>

            <div className="relative group">
              <div className="w-20 h-20 md:w-24 md:h-24 bg-white border-2 border-slate-100 rounded-full flex items-center justify-center mx-auto mb-6 md:mb-8 shadow-xl group-hover:border-blue-500 transition-all duration-500 relative z-10">
                <CreditCard className="w-8 h-8 md:w-10 md:h-10 text-blue-600" />
              </div>
              <h3 className="text-xl md:text-2xl font-black text-slate-900 mb-2 md:mb-4 tracking-tight">2. Book</h3>
              <p className="text-slate-500 font-bold text-xs md:text-sm leading-relaxed max-w-[240px] mx-auto">
                Choose your preferred option and complete your booking securely in minutes.
              </p>
            </div>

            <div className="relative group">
              <div className="w-20 h-20 md:w-24 md:h-24 bg-white border-2 border-slate-100 rounded-full flex items-center justify-center mx-auto mb-6 md:mb-8 shadow-xl group-hover:border-blue-500 transition-all duration-500 relative z-10">
                <Car className="w-8 h-8 md:w-10 md:h-10 text-blue-600" />
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

      {/* 🟢 5. HOMEPAGE ENTERPRISE FAQ SECTION */}
      <section className="py-20 md:py-28 bg-slate-50 border-t border-slate-200/60 px-4 md:px-6">
        <div className="max-w-4xl mx-auto">
          <div className="flex flex-col items-center text-center mb-12 md:mb-16">
            <div className="w-12 h-12 bg-blue-600/10 rounded-2xl flex items-center justify-center text-blue-600 mb-4">
              <HelpCircle className="w-6 h-6" />
            </div>
            <h2 className="text-3xl md:text-5xl font-black text-slate-900 tracking-tight">
              Got Questions? <span className="text-blue-600">We Have Answers.</span>
            </h2>
            <p className="text-sm md:text-base text-slate-500 font-medium max-w-md mt-3">
              Everything you need to know about our automated agency booking services.
            </p>
          </div>

          <div className="space-y-4">
            {faqs.map((faq, index) => {
              const isOpen = openFaq === index;
              return (
                <div 
                  key={index} 
                  className="bg-white border border-slate-200 rounded-2xl overflow-hidden transition-all duration-300"
                >
                  <button
                    onClick={() => setOpenFaq(isOpen ? null : index)}
                    className="w-full text-left px-6 py-5 md:py-6 flex items-center justify-between gap-4 font-black text-slate-950 text-sm md:text-base select-none"
                  >
                    <span>{faq.q}</span>
                    <ChevronDown className={`w-5 h-5 text-blue-600 transition-transform duration-300 shrink-0 ${isOpen ? 'rotate-180' : ''}`} />
                  </button>
                  
                  <div 
                    className={`transition-all duration-300 ease-in-out overflow-hidden ${isOpen ? 'max-h-48 border-t border-slate-100 opacity-100' : 'max-h-0 opacity-0'}`}
                  >
                    <p className="px-6 py-5 text-slate-600 text-xs md:text-sm font-medium leading-relaxed bg-slate-50/50">
                      {faq.a}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* 6. FOOTER */}
      <footer className="bg-[#0B1121] py-8 md:py-14 px-4 md:px-6 border-t border-white/5">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6 md:gap-4">
            
           <Link href="/" className="flex items-center w-full md:w-1/3 justify-center md:justify-start touch-manipulation [-webkit-tap-highlight-color:transparent]">
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
             <Link href="/privacy" className="hover:text-white transition-colors touch-manipulation [-webkit-tap-highlight-color:transparent]">Privacy Policy</Link>
             <Link href="/terms" className="hover:text-white transition-colors touch-manipulation [-webkit-tap-highlight-color:transparent]">Terms</Link>
             <Link href="mailto:info@aeroparkdirect.co.uk" className="hover:text-white transition-colors touch-manipulation [-webkit-tap-highlight-color:transparent]">Support</Link>
           </div>
           
           <div className="text-slate-500/70 font-bold text-[8px] md:text-[10px] uppercase tracking-[0.15em] md:tracking-widest w-full md:w-1/3 text-center md:text-right">
             © {new Date().getFullYear()} AeroPark Direct
           </div>
           
        </div>
      </footer>

      <MapModal isOpen={isMapOpen} onClose={() => setIsMapOpen(false)} />
      <PriceMatchModal isOpen={isPriceMatchOpen} onClose={() => setIsPriceMatchOpen(false)} />
    </main>
  );
}