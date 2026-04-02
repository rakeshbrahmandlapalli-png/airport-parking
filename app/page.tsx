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
  ArrowRight
} from "lucide-react";
import Link from "next/link";
import MapModal from "@/components/MapModal";

export default function HomePage() {
  const [now, setNow] = useState(new Date());
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isMapOpen, setIsMapOpen] = useState(false);
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
    <main className="min-h-screen bg-slate-50 font-sans selection:bg-blue-600 selection:text-white overflow-x-hidden">
      
      {/* 1. NAVBAR */}
      <nav className={`fixed top-0 w-full z-50 bg-white/90 backdrop-blur-xl border-b border-slate-200 shadow-sm transition-all duration-1000 ${isLoaded ? 'translate-y-0 opacity-100' : '-translate-y-full opacity-0'}`}>
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          
          <Link href="/" className="flex items-center gap-2 text-blue-600 font-black tracking-tight text-xl uppercase z-50 cursor-pointer hover:scale-105 transition-transform">
            <Plane className="w-6 h-6 rotate-45" /> AIRPORT<span className="text-slate-900">VIP</span>
          </Link>
          
          <div className="hidden md:flex items-center gap-8">
            <Link href="/services" className="text-xs font-black uppercase tracking-widest text-slate-600 hover:text-blue-600 transition-colors relative group">
              Services
              <span className="absolute -bottom-2 left-0 w-0 h-0.5 bg-blue-600 transition-all duration-300 group-hover:w-full"></span>
            </Link>
            <a href="#how-it-works" className="text-xs font-black uppercase tracking-widest text-slate-600 hover:text-blue-600 transition-colors relative group">
              How it works
              <span className="absolute -bottom-2 left-0 w-0 h-0.5 bg-blue-600 transition-all duration-300 group-hover:w-full"></span>
            </a>
            <a href="#reviews" className="text-xs font-black uppercase tracking-widest text-slate-600 hover:text-blue-600 transition-colors relative group">
              Reviews
              <span className="absolute -bottom-2 left-0 w-0 h-0.5 bg-blue-600 transition-all duration-300 group-hover:w-full"></span>
            </a>

            <div className="h-6 w-px bg-slate-200 ml-2"></div>

            <Link href="/manage" className="flex items-center gap-2 text-xs font-black uppercase tracking-widest text-white bg-slate-900 px-5 py-2.5 rounded-full hover:bg-blue-600 hover:shadow-lg hover:shadow-blue-500/30 transition-all duration-300 active:scale-95 ml-2">
              <User className="w-4 h-4" /> Manage Booking
            </Link>
          </div>

          <button onClick={() => setIsMenuOpen(true)} className="md:hidden z-50 p-2 text-slate-900 active:scale-90 transition-transform">
            <Menu className="w-6 h-6" />
          </button>
        </div>

        {/* MOBILE MENU */}
        <div className={`md:hidden fixed inset-0 z-[100] !bg-white transition-all duration-500 flex flex-col ${isMenuOpen ? 'opacity-100 pointer-events-auto translate-x-0' : 'opacity-0 pointer-events-none translate-x-full'}`} style={{ backgroundColor: '#ffffff' }}>
          <div className="h-20 px-6 flex items-center justify-between border-b border-slate-100 !bg-white">
            <div className="flex items-center gap-2 text-blue-600 font-black tracking-tight text-xl uppercase">
              <Plane className="w-6 h-6 rotate-45" /> AIRPORT<span className="text-slate-900">VIP</span>
            </div>
            <button onClick={() => setIsMenuOpen(false)} className="p-3 text-slate-900 bg-slate-100 rounded-full">
              <X className="w-6 h-6" />
            </button>
          </div>
          <div className="flex flex-col px-8 pt-10 gap-6 !bg-white flex-grow">
            <Link href="/services" onClick={() => setIsMenuOpen(false)} className="flex items-center justify-between text-2xl font-black text-slate-900 border-b border-slate-100 pb-5">
              Services <ChevronRight className="w-6 h-6 text-blue-500" />
            </Link>
            <a href="#how-it-works" onClick={() => setIsMenuOpen(false)} className="flex items-center justify-between text-2xl font-black text-slate-900 border-b border-slate-100 pb-5">
              How it works <ChevronRight className="w-6 h-6 text-blue-500" />
            </a>
            <a href="#reviews" onClick={() => setIsMenuOpen(false)} className="flex items-center justify-between text-2xl font-black text-slate-900 border-b border-slate-100 pb-5">
              Reviews <ChevronRight className="w-6 h-6 text-blue-500" />
            </a>
          </div>
          <div className="p-8 border-t border-slate-100 !bg-white">
            <Link href="/manage" onClick={() => setIsMenuOpen(false)} className="w-full py-5 bg-blue-600 text-white font-black rounded-3xl text-lg flex items-center justify-center shadow-lg shadow-blue-500/20 active:scale-95 transition-transform">
              Manage Booking
            </Link>
          </div>
        </div>
      </nav>

      {/* 2. HERO SECTION */}
      <section className="relative min-h-[100svh] md:min-h-[850px] w-full flex flex-col items-center justify-center pt-24 pb-12 overflow-hidden bg-slate-950">
        <div className="absolute inset-0 z-0 overflow-hidden">
          <div className={`absolute inset-0 bg-cover bg-center transition-all duration-[3000ms] ease-out origin-center ${isLoaded ? 'scale-105 opacity-100 blur-0' : 'scale-150 opacity-0 blur-2xl'}`} style={{ backgroundImage: "url('https://images.unsplash.com/photo-1436491865332-7a61a109cc05?q=80&w=2074&auto=format&fit=crop')" }}></div>
          <div className={`absolute inset-0 bg-slate-900 transition-opacity duration-[2500ms] ${isLoaded ? 'opacity-50' : 'opacity-100'}`}></div>
        </div>

        <div className="relative z-10 w-full max-w-5xl px-4 md:px-6 flex flex-col items-center text-center">
          <h1 className={`text-4xl sm:text-5xl md:text-[5.5rem] font-black text-white tracking-tight mb-4 leading-[1.1] transition-all duration-1000 delay-300 ${isLoaded ? 'translate-y-0 opacity-100' : 'translate-y-10 opacity-0'}`}>
            Start Your Journey <br className="md:hidden" /><span className="text-blue-400">Stress-Free.</span>
          </h1>
          <p className={`text-base sm:text-lg md:text-xl text-slate-200 mb-6 max-w-3xl font-medium transition-all duration-1000 delay-500 ${isLoaded ? 'translate-y-0 opacity-100' : 'translate-y-10 opacity-0'}`}>
            Compare premium, secure airport parking. Book in under 2 minutes and guarantee your spot today.
          </p>

          <button 
            onClick={() => setIsMapOpen(true)}
            className={`flex items-center gap-2 text-blue-400 font-black uppercase text-[10px] tracking-widest mb-10 hover:text-white transition-all duration-1000 delay-600 ${isLoaded ? 'opacity-100' : 'opacity-0'}`}
          >
            <Info className="w-4 h-4" /> Where exactly do I meet the operator?
          </button>
          
          <div className={`relative w-full group z-20 transition-all duration-1000 delay-700 ${isLoaded ? 'translate-y-0 opacity-100' : 'translate-y-12 opacity-0 scale-95'}`}>
            <div className="relative z-10 bg-white rounded-[2rem] md:rounded-full p-4 md:p-3 shadow-2xl">
              <form action="/results" method="GET" onSubmit={handleSearch} className="flex flex-col md:flex-row items-center gap-4 md:gap-2">
                <div className="flex-1 w-full px-2 md:px-4 flex flex-col text-left">
                  <div className="flex items-center gap-1.5 mb-2 text-slate-500 ml-1">
                    <Calendar className="w-3.5 h-3.5 text-blue-500" />
                    <label className="text-[10px] font-black uppercase text-slate-900 md:text-slate-500">Drop-off</label>
                  </div>
                  <div className="grid grid-cols-2 md:flex items-center gap-2">
                    <input type="date" name="dropoffDate" min={todayStr} value={dropoffDate} onChange={(e) => setDropoffDate(e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-3 font-bold text-slate-700 text-xs" />
                    <input type="time" name="dropoffTime" value={dropoffTime} onChange={(e) => setDropoffTime(e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-3 font-bold text-slate-700 text-xs" />
                  </div>
                </div>
                <div className="flex-1 w-full px-2 md:px-4 flex flex-col text-left">
                  <div className="flex items-center gap-1.5 mb-2 text-slate-500 ml-1">
                    <Calendar className="w-3.5 h-3.5 text-blue-500" />
                    <label className="text-[10px] font-black uppercase text-slate-900 md:text-slate-500">Pick-up</label>
                  </div>
                  <div className="grid grid-cols-2 md:flex items-center gap-2">
                    <input type="date" name="pickupDate" min={dropoffDate || todayStr} value={pickupDate} onChange={(e) => setPickupDate(e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-3 font-bold text-slate-700 text-xs" />
                    <input type="time" name="pickupTime" value={pickupTime} onChange={(e) => setPickupTime(e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-3 font-bold text-slate-700 text-xs" />
                  </div>
                </div>
                <button type="submit" className="w-full md:w-48 h-[60px] bg-blue-600 text-white font-black rounded-full shadow-lg flex items-center justify-center gap-2">
                  SEARCH <PlaneTakeoff className="w-5 h-5" />
                </button>
              </form>
            </div>
          </div>
        </div>
      </section>

      {/* 3. TRUST SIGNALS */}
      <section id="services" className="py-20 md:py-32 bg-slate-50/50 px-4 md:px-6 relative overflow-hidden">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-7xl h-[1px] bg-gradient-to-r from-transparent via-slate-200 to-transparent"></div>

        <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-8">
          {[
            { icon: ShieldCheck, title: "Highly Secure", desc: "Monitored facilities with full CCTV, fencing, and 24/7 patrols." },
            { icon: Clock, title: "Zero Shuttle Buses", desc: "Drive directly to the terminal. Walk to check-in within 5 minutes." },
            { icon: CreditCard, title: "Zero Hidden Fees", desc: "The price you see is the price you pay. No unexpected charges." }
          ].map((item, i) => (
            <div 
              key={i} 
              className="group relative bg-white p-8 md:p-10 rounded-[2.5rem] border border-slate-100 transition-all duration-500 hover:-translate-y-2 hover:shadow-[0_20px_40px_-10px_rgba(37,99,235,0.08)] hover:border-blue-100 z-10"
            >
              <div className="w-16 h-16 bg-blue-50/80 rounded-[1.25rem] flex items-center justify-center mb-8 transition-all duration-500 group-hover:bg-blue-600 group-hover:scale-110 group-hover:rotate-3">
                <item.icon className="w-8 h-8 text-blue-600 transition-colors duration-500 group-hover:text-white stroke-[1.5]" />
              </div>
              
              <h3 className="text-xl font-black text-slate-900 mb-3 tracking-tight transition-colors group-hover:text-blue-600">
                {item.title}
              </h3>
              
              <p className="text-sm text-slate-500 font-medium leading-relaxed">
                {item.desc}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* 4. HOW IT WORKS */}
      <section id="how-it-works" className="py-24 md:py-32 bg-white px-6">
        <div className="max-w-7xl mx-auto">
          
          <div className="text-center mb-16 md:mb-24">
            <h2 className="text-4xl md:text-5xl font-black text-slate-900 tracking-tight mb-4">
              Easy as 1, 2, 3.
            </h2>
            <p className="text-lg text-slate-500 font-bold max-w-lg mx-auto leading-relaxed">
              Your seamless journey starts here. Secure your premium spot in minutes.
            </p>
          </div>

          <div className="relative">
            <div className="hidden md:block absolute top-[50px] left-[15%] right-[15%] h-[2px] bg-slate-100 z-0"></div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-12 md:gap-8 relative z-10">
              {[
                { icon: MapPin, step: "1", title: "Book Online", desc: "Select your dates and secure your terminal Meet & Greet space." },
                { icon: CarFront, step: "2", title: "Drive to Terminal", desc: "Head straight to Terminal Car Park 1 and meet your vetted operator." },
                { icon: PlaneTakeoff, step: "3", title: "Fly High", desc: "A 5-minute walk to check-in while we park your vehicle securely." }
              ].map((item, i, arr) => (
                <div key={i} className="flex flex-col items-center text-center group">
                  
                  <div className="relative mb-8">
                    <div className="absolute inset-0 bg-blue-500/10 rounded-full blur-xl opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
                    
                    <div className="w-24 h-24 bg-white border-2 border-slate-100 text-blue-600 rounded-full flex items-center justify-center relative transition-transform duration-300 group-hover:-translate-y-1">
                       <item.icon className="w-10 h-10 stroke-[1.5]" />
                    </div>
                    
                    <div className="absolute -top-3 -right-3 w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center font-black text-sm text-white shadow-lg border-4 border-white transition-transform duration-300 group-hover:scale-110">
                      {item.step}
                    </div>
                  </div>

                  <h3 className="text-2xl font-black text-slate-900 mb-3 tracking-tight transition-colors group-hover:text-blue-600">
                    {item.title}
                  </h3>
                  
                  <p className="text-base text-slate-600 font-medium leading-relaxed max-w-[280px]">
                    {item.desc}
                  </p>

                  {i < arr.length - 1 && (
                    <ArrowRight className="hidden md:block absolute -right-6 top-1/2 -translate-y-1/2 w-6 h-6 text-slate-200" />
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* 5. REVIEWS */}
      <section id="reviews" className="py-20 md:py-32 bg-[#020617] px-4 md:px-6 relative overflow-hidden">
        <div className="max-w-7xl mx-auto relative z-10">
          <div className="text-center mb-16">
             <h2 className="text-3xl md:text-5xl font-black text-white mb-6">Real travelers, real trust.</h2>
             <div className="flex justify-center gap-1">
               {[1,2,3,4,5].map(i => <Star key={i} className="w-5 h-5 text-yellow-400 fill-current" />)}
             </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {[
              { text: "The service was impeccable. I dropped my car right at the terminal and it was waiting for me when I landed. Five stars.", name: "James D.", role: "Frequent Flyer", initials: "JD" },
              { text: "Cleanest facilities I've seen. The staff was incredibly helpful and the car was waiting for me. Highly recommend.", name: "Sarah M.", role: "Business Executive", initials: "SM" }
            ].map((rev, i) => (
              <div key={i} className="bg-white/5 backdrop-blur-2xl p-8 md:p-12 rounded-[2rem] border border-white/10">
                <p className="text-lg text-slate-200 leading-relaxed mb-8">"{rev.text}"</p>
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-blue-600 rounded-xl flex items-center justify-center font-black text-white">{rev.initials}</div>
                  <div className="flex flex-col">
                    <span className="font-black text-white text-sm">{rev.name}</span>
                    <span className="text-slate-400 font-bold uppercase tracking-widest text-[9px]">{rev.role}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 6. FOOTER */}
      <footer className="bg-[#020617] py-12 px-6 border-t border-white/10">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-8">
           <Link href="/" className="flex items-center gap-2 text-white font-black text-lg md:text-xl uppercase">
             <Plane className="w-5 h-5 text-blue-500 rotate-45" /> AIRPORT<span className="text-blue-500">VIP</span>
           </Link>
           <div className="flex gap-8 text-slate-400 text-[10px] font-black uppercase tracking-[0.2em]">
             <a href="#">Privacy</a>
             <a href="#">Terms</a>
             <a href="#">Contact</a>
           </div>
           <div className="text-slate-600 font-bold text-xs uppercase tracking-widest">
             © {new Date().getFullYear()} AirportVIP
           </div>
        </div>
      </footer>

      {/* RENDER MAP MODAL */}
      <MapModal isOpen={isMapOpen} onClose={() => setIsMapOpen(false)} />
    </main>
  );
}