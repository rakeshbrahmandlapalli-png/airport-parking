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
  ChevronRight
} from "lucide-react";

export default function HomePage() {
  const [now, setNow] = useState(new Date());
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [dropoffDate, setDropoffDate] = useState("");
  const [dropoffTime, setDropoffTime] = useState("");
  const [pickupDate, setPickupDate] = useState("");
  const [pickupTime, setPickupTime] = useState("18:00");
  
  // State for our new Cinematic Entrance
  const [isLoaded, setIsLoaded] = useState(false); 

  useEffect(() => {
    // Slight delay to ensure the browser paints the "before" state first
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
    if (isMenuOpen) document.body.style.overflow = 'hidden';
    else document.body.style.overflow = 'unset';
  }, [isMenuOpen]);

  return (
    <main className="min-h-screen bg-slate-50 font-sans selection:bg-blue-600 selection:text-white overflow-x-hidden">
      
      {/* 1. NAVBAR */}
      <nav className={`fixed top-0 w-full z-50 bg-white/90 backdrop-blur-xl border-b border-slate-200 shadow-sm transition-all duration-1000 ${isLoaded ? 'translate-y-0 opacity-100' : '-translate-y-full opacity-0'}`}>
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          <div className="flex items-center gap-2 text-blue-600 font-black tracking-tight text-xl uppercase z-50 cursor-pointer hover:scale-105 transition-transform">
            <Plane className="w-6 h-6 rotate-45" /> AIRPORT<span className="text-slate-900">VIP</span>
          </div>
          
          <div className="hidden md:flex items-center gap-10">
            {["Services", "Locations", "Support"].map((item) => (
              <a key={item} href="#" className="text-xs font-black uppercase tracking-widest text-slate-500 hover:text-blue-600 transition-colors relative group">
                {item}
                <span className="absolute -bottom-2 left-0 w-0 h-0.5 bg-blue-600 transition-all duration-300 group-hover:w-full"></span>
              </a>
            ))}
            <a href="#" className="flex items-center gap-2 text-sm font-bold text-slate-600 hover:text-blue-600 transition-colors pl-6 border-l border-slate-200 group">
              <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center group-hover:bg-blue-50 transition-colors">
                <User className="w-4 h-4" />
              </div>
              Admin
            </a>
          </div>

          <button onClick={() => setIsMenuOpen(!isMenuOpen)} className="md:hidden z-50 p-2 text-slate-900 active:scale-90 transition-transform">
            {isMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>

        {/* MOBILE MENU */}
        <div className={`md:hidden fixed inset-0 bg-white/95 backdrop-blur-2xl z-40 transition-all duration-500 flex flex-col pt-28 px-8 ${isMenuOpen ? 'opacity-100 pointer-events-auto translate-x-0' : 'opacity-0 pointer-events-none translate-x-full'}`}>
          <div className="flex flex-col gap-6">
            {["Services", "Locations", "Support", "Admin Login"].map((item, i) => (
              <a key={item} href="#" className="flex items-center justify-between text-2xl font-black text-slate-900 border-b border-slate-100 pb-4 active:scale-95 transition-transform">
                {item} <ChevronRight className="w-6 h-6 text-blue-500" />
              </a>
            ))}
          </div>
          <button className="mt-12 py-5 bg-blue-600 text-white font-black rounded-3xl text-lg shadow-xl shadow-blue-500/30 active:scale-95 transition-all">
            Manage Booking
          </button>
        </div>
      </nav>

      {/* 2. CINEMATIC HERO SECTION */}
      <section className="relative min-h-[100svh] md:min-h-[850px] w-full flex flex-col items-center justify-center pt-24 pb-12 overflow-hidden bg-slate-950">
        
        {/* Cinematic Background Reveal */}
        <div className="absolute inset-0 z-0 overflow-hidden">
          <div 
            className={`absolute inset-0 bg-cover bg-center transition-all duration-[3000ms] ease-out origin-center
              ${isLoaded ? 'scale-105 opacity-100 blur-0' : 'scale-150 opacity-0 blur-2xl'}
            `}
            style={{ backgroundImage: "url('https://images.unsplash.com/photo-1436491865332-7a61a109cc05?q=80&w=2074&auto=format&fit=crop')" }}
          ></div>
          
          {/* Dynamic Dark Overlay (Fades out slightly as it loads) */}
          <div className={`absolute inset-0 bg-slate-900 transition-opacity duration-[2500ms] ${isLoaded ? 'opacity-50' : 'opacity-100'}`}></div>
          
          {/* Slow Looping Light Sweep / Cloud Pass Effect */}
          <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/5 to-transparent -translate-x-full animate-[shimmer_10s_infinite_linear]"></div>
        </div>

        <div className="relative z-10 w-full max-w-5xl px-4 md:px-6 flex flex-col items-center text-center">
          
          {/* STAGGER 1: Title */}
          <h1 className={`text-4xl sm:text-5xl md:text-[5.5rem] font-black text-white tracking-tight mb-4 md:mb-6 leading-[1.1] transition-all duration-1000 delay-300 ease-out transform ${isLoaded ? 'translate-y-0 opacity-100' : 'translate-y-10 opacity-0'}`}>
            Start Your Journey <br className="md:hidden" /><span className="text-blue-400">Stress-Free.</span>
          </h1>
          
          {/* STAGGER 2: Subtitle */}
          <p className={`text-base sm:text-lg md:text-xl text-slate-200 mb-10 md:mb-14 max-w-3xl font-medium tracking-wide px-4 transition-all duration-1000 delay-500 ease-out transform ${isLoaded ? 'translate-y-0 opacity-100' : 'translate-y-10 opacity-0'}`}>
            Compare premium, secure airport parking. Book in under 2 minutes and guarantee your spot today.
          </p>
          
          {/* STAGGER 3: Search Pill */}
          <div className={`relative w-full group z-20 transition-all duration-1000 delay-700 ease-out transform ${isLoaded ? 'translate-y-0 opacity-100' : 'translate-y-12 opacity-0 scale-95'}`}>
            {/* Ambient Glow */}
            <div className="absolute -inset-1 md:-inset-2 bg-gradient-to-r from-blue-600 to-cyan-400 rounded-[2.5rem] blur-xl md:blur-2xl opacity-40 md:opacity-20 md:group-hover:opacity-40 transition duration-700 animate-[pulse_4s_infinite]"></div>

            <div className="relative z-10 bg-white rounded-[2rem] md:rounded-full p-4 md:p-3 shadow-2xl border border-white/20">
              <form action="/results" method="GET" onSubmit={handleSearch} className="flex flex-col md:flex-row items-center gap-4 md:gap-2">
                
                {/* DROP-OFF */}
                <div className="flex-1 w-full px-2 md:px-4 flex flex-col text-left">
                  <div className="flex items-center gap-1.5 mb-2 text-slate-500 ml-1">
                    <Calendar className="w-3.5 h-3.5 text-blue-500" />
                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-900 md:text-slate-500">Drop-off</label>
                  </div>
                  <div className="grid grid-cols-2 md:flex items-center gap-2">
                    <input type="date" name="dropoffDate" min={todayStr} value={dropoffDate} onChange={(e) => setDropoffDate(e.target.value)} className="w-full bg-slate-50 md:bg-white border border-slate-200 rounded-xl px-3 py-3 md:px-4 font-bold text-slate-700 text-xs md:text-base focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all cursor-pointer hover:bg-slate-50" />
                    <div className="relative w-full md:w-32 shrink-0">
                      <input type="time" name="dropoffTime" value={dropoffTime} onChange={(e) => setDropoffTime(e.target.value)} className="w-full bg-slate-50 md:bg-white border border-slate-200 rounded-xl pl-3 pr-8 py-3 md:pl-4 md:pr-10 font-bold text-slate-700 text-xs md:text-base focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all cursor-pointer hover:bg-slate-50" />
                      <Clock className="w-3.5 h-3.5 md:w-4 md:h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                    </div>
                  </div>
                </div>

                <div className="hidden md:block w-px h-12 bg-slate-200 shrink-0 mx-2"></div>
                <div className="md:hidden w-full h-px bg-slate-100 my-1"></div>

                {/* PICK-UP */}
                <div className="flex-1 w-full px-2 md:px-4 flex flex-col text-left">
                  <div className="flex items-center gap-1.5 mb-2 text-slate-500 ml-1">
                    <Calendar className="w-3.5 h-3.5 text-blue-500" />
                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-900 md:text-slate-500">Pick-up</label>
                  </div>
                  <div className="grid grid-cols-2 md:flex items-center gap-2">
                    <input type="date" name="pickupDate" min={dropoffDate || todayStr} value={pickupDate} onChange={(e) => setPickupDate(e.target.value)} className="w-full bg-slate-50 md:bg-white border border-slate-200 rounded-xl px-3 py-3 md:px-4 font-bold text-slate-700 text-xs md:text-base focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all cursor-pointer hover:bg-slate-50" />
                    <div className="relative w-full md:w-32 shrink-0">
                      <input type="time" name="pickupTime" value={pickupTime} onChange={(e) => setPickupTime(e.target.value)} className="w-full bg-slate-50 md:bg-white border border-slate-200 rounded-xl pl-3 pr-8 py-3 md:pl-4 md:pr-10 font-bold text-slate-700 text-xs md:text-base focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all cursor-pointer hover:bg-slate-50" />
                      <Clock className="w-3.5 h-3.5 md:w-4 md:h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                    </div>
                  </div>
                </div>

                <div className="w-full md:w-auto p-1 md:p-0 shrink-0 mt-2 md:mt-0">
                  <button type="submit" className="relative overflow-hidden w-full md:w-48 h-[60px] bg-blue-600 hover:bg-blue-700 text-white font-black text-sm md:text-base rounded-[1.25rem] md:rounded-full shadow-lg shadow-blue-500/30 transition-all duration-300 flex items-center justify-center gap-2 group/btn active:scale-95">
                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover/btn:animate-[shimmer_1.5s_infinite]"></div>
                    <span className="relative z-10 tracking-wide uppercase md:capitalize">Search Parking</span> 
                    <PlaneTakeoff className="w-4 h-4 md:w-5 md:h-5 relative z-10 group-hover/btn:translate-x-1 group-hover/btn:-translate-y-1 transition-transform" />
                  </button>
                </div>
                
              </form>
            </div>
          </div>
        </div>
      </section>

      {/* 3. TRUST SIGNALS */}
      <section className="py-20 md:py-32 bg-slate-50 px-4 md:px-6">
        <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-10">
          {[
            { icon: ShieldCheck, title: "Secured 24/7", desc: "Full CCTV, perimeter fencing, and constant patrols at every facility." },
            { icon: Clock, title: "Rapid Transfers", desc: "Shuttles run every 10 minutes. Reach the terminal in under 5 minutes." },
            { icon: CreditCard, title: "Zero Hidden Fees", desc: "The price you see is the price you pay. No unexpected charges." }
          ].map((item, i) => (
            <div key={i} className="bg-white p-8 md:p-12 rounded-[2rem] md:rounded-[3rem] border border-slate-100 shadow-xl shadow-slate-200/50 hover:shadow-2xl hover:-translate-y-1 md:hover:-translate-y-2 transition-all duration-500 group cursor-pointer active:scale-[0.98]">
              <div className="w-14 h-14 md:w-16 md:h-16 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center mb-6 md:mb-8 group-hover:scale-110 group-hover:rotate-3 transition-transform duration-500 shadow-inner">
                 <item.icon className="w-7 h-7 md:w-8 md:h-8" />
              </div>
              <h3 className="text-xl md:text-2xl font-black text-slate-900 mb-3 md:mb-4 tracking-tight">{item.title}</h3>
              <p className="text-sm md:text-base text-slate-500 font-bold leading-relaxed">{item.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* 4. HOW IT WORKS */}
      <section className="py-20 md:py-32 bg-white px-4 md:px-6 overflow-hidden">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16 md:mb-24">
            <h2 className="text-3xl md:text-5xl font-black text-slate-900 tracking-tight mb-4">Easy as 1, 2, 3.</h2>
            <p className="text-base md:text-lg text-slate-500 font-bold">Your seamless journey starts here.</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-12 md:gap-20 relative">
            <div className="hidden md:block absolute top-12 left-[15%] right-[15%] h-0.5 bg-slate-100 z-0"></div>
            
            {[
              { icon: MapPin, step: "1", title: "Book Online", desc: "Enter your dates and choose your space." },
              { icon: CarFront, step: "2", title: "Drive In", desc: "Drop your car at our secure, vetted lot." },
              { icon: PlaneTakeoff, step: "3", title: "Fly High", desc: "5 Minutes walk to the therminal." }
            ].map((item, i) => (
              <div key={i} className="flex flex-col items-center text-center relative z-10 group cursor-pointer">
                <div className="w-20 h-20 md:w-24 md:h-24 bg-slate-900 text-white rounded-[1.5rem] md:rounded-[2rem] flex items-center justify-center mb-6 md:mb-8 shadow-2xl relative group-hover:-translate-y-2 group-active:scale-95 transition-all duration-300">
                   <item.icon className="w-8 h-8 md:w-10 md:h-10 group-hover:scale-110 transition-transform" />
                   <div className="absolute -top-3 -right-3 w-8 h-8 md:w-10 md:h-10 bg-blue-600 rounded-full flex items-center justify-center font-black text-xs md:text-sm shadow-lg border-4 border-white">{item.step}</div>
                </div>
                <h3 className="text-lg md:text-xl font-black text-slate-900 mb-2 md:mb-3">{item.title}</h3>
                <p className="text-sm md:text-base text-slate-400 font-bold max-w-[250px]">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 5. REVIEWS SECTION */}
      <section className="py-20 md:py-32 bg-[#020617] px-4 md:px-6 relative overflow-hidden">
        <div className="absolute top-0 left-1/4 w-[500px] h-[500px] bg-blue-600/20 blur-[120px] rounded-full mix-blend-screen pointer-events-none animate-[pulse_6s_infinite]"></div>
        <div className="absolute bottom-0 right-1/4 w-[500px] h-[500px] bg-indigo-600/10 blur-[120px] rounded-full mix-blend-screen pointer-events-none animate-[pulse_8s_infinite]"></div>
        
        <div className="max-w-7xl mx-auto relative z-10">
          <div className="text-center mb-16 md:mb-20">
             <h2 className="text-3xl md:text-5xl font-black text-white mb-4 md:mb-6 tracking-tight">Real travelers, <br className="md:hidden" /> real trust.</h2>
             <div className="flex justify-center gap-1">
               {[1,2,3,4,5].map(i => <Star key={i} className="w-5 h-5 md:w-6 md:h-6 text-yellow-400 fill-current drop-shadow-[0_0_10px_rgba(250,204,21,0.5)]" />)}
             </div>
             <p className="text-slate-400 font-bold mt-4 uppercase tracking-widest text-[10px] md:text-xs">Based on 12,000+ Reviews</p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-8">
            {[
              { text: "The service was impeccable. I dropped my car right at the terminal and it was waiting for me when I landed. Five stars.", name: "ABC", role: "Frequent Flyer", initials: "JD", color: "bg-blue-600" },
              { text: "Cleanest facilities I've seen. The staff was incredibly helpful and the car was waiting for me. Highly recommend.", name: "XYZ", role: "Business Executive", initials: "SM", color: "bg-indigo-600" }
            ].map((rev, i) => (
              <div key={i} className="bg-white/5 backdrop-blur-2xl p-8 md:p-12 rounded-[2rem] md:rounded-[3.5rem] border border-white/10 hover:border-blue-500/50 hover:bg-white/10 transition-all duration-500 group cursor-pointer active:scale-[0.98]">
                <p className="text-lg md:text-2xl font-medium text-slate-200 leading-relaxed mb-8 md:mb-10">"{rev.text}"</p>
                <div className="flex items-center gap-4 md:gap-5">
                  <div className={`w-12 h-12 md:w-14 md:h-14 ${rev.color} rounded-xl md:rounded-[1.5rem] flex items-center justify-center font-black text-white text-base md:text-lg shadow-inner group-hover:scale-110 group-hover:rotate-6 transition-transform duration-300`}>{rev.initials}</div>
                  <div className="flex flex-col">
                    <span className="font-black text-white tracking-wide text-sm md:text-base">{rev.name}</span>
                    <span className="text-slate-400 font-bold uppercase tracking-widest text-[9px] md:text-[10px] mt-1">{rev.role}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 6. CLEAN FOOTER */}
      <footer className="bg-[#020617] py-12 md:py-16 px-6 border-t border-white/10">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-8 text-center md:text-left">
           <div className="flex items-center gap-2 text-white font-black tracking-tight text-lg md:text-xl uppercase hover:scale-105 transition-transform cursor-pointer">
             <Plane className="w-5 h-5 md:w-6 md:h-6 text-blue-500 rotate-45" /> AIRPORT<span className="text-blue-500">VIP</span>
           </div>
           <div className="flex flex-wrap justify-center gap-6 md:gap-8 text-slate-400 text-[9px] md:text-[10px] font-black uppercase tracking-[0.2em]">
             <a href="#" className="hover:text-white hover:-translate-y-1 transition-all">Privacy</a>
             <a href="#" className="hover:text-white hover:-translate-y-1 transition-all">Terms</a>
             <a href="#" className="hover:text-white hover:-translate-y-1 transition-all">Cookies</a>
             <a href="#" className="hover:text-white hover:-translate-y-1 transition-all">Contact</a>
           </div>
           <div className="text-slate-600 font-bold text-[10px] md:text-xs uppercase tracking-widest">
             © {new Date().getFullYear()} AirportVIP
           </div>
        </div>
      </footer>
    </main>
  );
}