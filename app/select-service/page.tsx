"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import Link from "next/link";
import { 
  Car, 
  Bus, 
  Hotel, 
  ArrowRight, 
  Clock, 
  ShieldCheck, 
  MapPin,
  ArrowLeft,
  Plane,
  X,
  Lock
} from "lucide-react";

function ServiceSelectionContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  // Grab the search params from the hero section so we don't lose them
  const airport = searchParams.get("airport") || "Luton (LTN)";
  const dropoffDate = searchParams.get("dropoffDate") || "";
  const dropoffTime = searchParams.get("dropoffTime") || "";
  const pickupDate = searchParams.get("pickupDate") || "";
  const pickupTime = searchParams.get("pickupTime") || "";

  // Helper to format dates for the top navbar
  const formatShortDate = (dateStr: string) => {
    if (!dateStr) return "";
    const d = new Date(dateStr);
    return d.toLocaleDateString("en-GB", { day: "numeric", month: "short" });
  };

  const dateDisplay = dropoffDate && pickupDate 
    ? `${formatShortDate(dropoffDate)} - ${formatShortDate(pickupDate)}`
    : "Dates not set";

  const airportCode = airport.includes("Heathrow") ? "LHR" : "LTN";
  // Park & Ride isn't live at Luton yet — show it as "Coming Soon" (like Hotel
  // & Parking) only for LTN; it stays bookable for Heathrow.
  const isLuton = airportCode === "LTN";

  // --- EDIT SEARCH MODAL STATE ---
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editAirport, setEditAirport] = useState(airport);
  const [editDropDate, setEditDropDate] = useState(dropoffDate);
  const [editDropTime, setEditDropTime] = useState(dropoffTime);
  const [editPickDate, setEditPickDate] = useState(pickupDate);
  const [editPickTime, setEditPickTime] = useState(pickupTime);

  const openEditModal = () => {
    setEditAirport(airport);
    setEditDropDate(dropoffDate);
    setEditDropTime(dropoffTime);
    setEditPickDate(pickupDate);
    setEditPickTime(pickupTime);
    setIsEditModalOpen(true);
  };

  const handleUpdateSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setIsEditModalOpen(false);
    
    // Update the URL with the new times so the page refreshes
    const query = new URLSearchParams({
      airport: editAirport,
      dropoffDate: editDropDate,
      dropoffTime: editDropTime,
      pickupDate: editPickDate,
      pickupTime: editPickTime,
    }).toString();
    
    router.push(`/select-service?${query}`);
  };

  const handleSelect = (serviceType: string, disabled?: boolean) => {
    if (disabled) return; // Prevent clicking on "Coming Soon" options

    const query = new URLSearchParams({
      airport,
      dropoffDate,
      dropoffTime,
      pickupDate,
      pickupTime,
      type: serviceType, 
    }).toString();

    // Sends them to the actual pricing results page next
    router.push(`/results?${query}`);
  };

  const services = [
    {
      id: "meet-greet",
      title: "Meet & Greet",
      tag: "Most Convenient",
      tagColor: "bg-blue-100 text-blue-700 border-blue-200",
      description: "Compare top-rated providers. Drive straight to the terminal, hand your keys to a vetted professional, and head straight to check-in.",
      icon: <Car className="w-7 h-7 text-blue-600" />,
      iconBg: "bg-blue-50",
      features: ["Compare trusted operators", "Drop off at terminal", "Perfect for families"],
      time: "5 mins walk to terminal",
      recommended: true,
      disabled: false
    },
    {
      id: "park-ride",
      title: "Park & Ride",
      tag: isLuton ? "Coming Soon" : "Best Value",
      tagColor: "bg-slate-100 text-slate-600 border-slate-200",
      description: isLuton
        ? "We're onboarding trusted Park & Ride operators at Luton. Soon you'll be able to park off-site and shuttle to the terminal. In the meantime, our Meet & Greet service is often the same price."
        : "Find the best deals on secure off-site parking. Park your vehicle and take a quick, comfortable shuttle bus to the terminal door.",
      icon: <Bus className={`w-7 h-7 ${isLuton ? "text-slate-400" : "text-slate-500"}`} />,
      iconBg: "bg-slate-50",
      features: ["Vetted parking facilities", "Regular shuttle services", "Budget-friendly deals"],
      time: isLuton ? "Available Shortly" : "5-10 min shuttle",
      recommended: false,
      disabled: isLuton
    },
    {
      id: "hotel",
      title: "Hotel & Parking",
      tag: "Coming Soon", // Changed
      tagColor: "bg-slate-100 text-slate-500 border-slate-200", // Changed
      description: "We are currently onboarding top-rated hotel partners. Soon you will be able to book a restful night's sleep with secure parking.", // Changed
      icon: <Hotel className="w-7 h-7 text-slate-400" />, // Changed
      iconBg: "bg-slate-50",
      features: ["Top hotel brands", "Up to 15 days parking", "Wake up at the airport"],
      time: "Available Shortly", // Changed
      recommended: false,
      disabled: true // 🟢 NEW FLAG
    }
  ];

  return (
    <main suppressHydrationWarning className="min-h-[100dvh] bg-slate-50 font-sans antialiased overflow-x-hidden pb-16">
      
      {/* PREMIUM DARK NAVBAR */}
      <header className="sticky top-0 z-[100] bg-[#0A101D] border-b border-white/5 h-16 md:h-20 flex items-center px-4 md:px-8 justify-between shadow-2xl backdrop-blur-md">
        <button onClick={openEditModal} className="text-slate-400 hover:text-white transition-colors flex items-center gap-2 group touch-manipulation cursor-pointer">
          <ArrowLeft className="w-4 h-4 md:w-5 md:h-5 lg:group-hover:-translate-x-1 transition-transform" /> 
          <span className="text-[9px] md:text-[10px] font-black uppercase tracking-[0.2em] hidden md:block">Edit Search</span>
        </button>
        
        <Link href="/" className="flex items-center gap-1.5 md:gap-2 text-white font-black tracking-tighter text-xl md:text-2xl uppercase absolute left-1/2 -translate-x-1/2 group touch-manipulation">
          <Plane className="w-5 h-5 md:w-7 md:h-7 text-blue-500 rotate-45 lg:group-hover:scale-110 transition-transform" />AEROPARK<span className="text-blue-500">DIRECT</span>
        </Link>

        {/* 🟢 FIXED: Button that opens the Edit Modal */}
        <button onClick={openEditModal} className="text-right group touch-manipulation cursor-pointer">
           <div className="flex flex-col items-end">
              <span className="text-sm md:text-base font-black text-white tracking-widest leading-none mb-0.5 md:mb-1 group-hover:text-blue-400 transition-colors">{airportCode}</span>
              <span className="text-[7px] md:text-[8px] font-black text-blue-500 uppercase tracking-[0.2em] leading-none">{dateDisplay}</span>
           </div>
        </button>
      </header>

      <div className="max-w-5xl mx-auto w-full pt-12 md:pt-16 px-4 sm:px-6 relative z-10">
        
        {/* Header Section */}
        <div className="text-center mb-10 md:mb-16">
          <button onClick={openEditModal} className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-slate-200/50 text-slate-600 font-bold text-[10px] uppercase tracking-widest mb-6 hover:bg-slate-200 transition-colors cursor-pointer touch-manipulation">
            <MapPin className="w-3 h-3" /> {airport}
          </button>
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-black text-slate-900 tracking-tight mb-4">
            How would you like to park?
          </h1>
          <p className="text-slate-500 font-medium text-sm sm:text-base md:text-lg max-w-2xl mx-auto px-2">
            Compare trusted parking providers that best fit your travel style. From premium terminal drop-offs to budget-friendly shuttles, we bring you the best options in one place.
          </p>
        </div>

        {/* Service Cards Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 md:gap-6 w-full">
          {services.map((service) => (
            <div 
              key={service.id}
              onClick={() => handleSelect(service.id, service.disabled)}
              className={`touch-manipulation bg-white rounded-2xl p-5 md:p-6 border shadow-sm transition-all duration-200 flex flex-col items-center text-center md:items-start md:text-left group relative [-webkit-tap-highlight-color:transparent] ${
                service.disabled
                  ? 'border-slate-100 opacity-70 grayscale-[30%] cursor-not-allowed'
                  : service.recommended
                    ? 'border-blue-600 hover:shadow-md cursor-pointer'
                    : 'border-slate-200 hover:border-blue-600 hover:shadow-md cursor-pointer'
              }`}
            >
              {/* Icon — grounded, colour-matched to the card accent */}
              <div className={`w-12 h-12 md:w-14 md:h-14 rounded-2xl flex items-center justify-center shrink-0 mb-4 md:mb-5 ${service.iconBg}`}>
                {service.icon}
              </div>

              {/* Title + integrated badge (inline, not a floating sticker) */}
              <div className="flex items-center flex-wrap justify-center md:justify-start gap-x-2.5 gap-y-1.5 mb-2">
                <h3 className="text-xl md:text-2xl font-black text-slate-900 tracking-tight">
                  {service.title}
                </h3>
                <span className={`inline-flex items-center px-2.5 py-1 rounded-lg border text-[9px] font-black uppercase tracking-widest ${service.tagColor}`}>
                  {service.tag}
                </span>
              </div>

              {/* Description + features grouped tightly (no hollow middle) */}
              <p className="text-slate-500 text-xs sm:text-sm leading-snug mb-3">
                {service.description}
              </p>

              {/* Features List */}
              <ul className={`space-y-2 mb-5 md:mb-6 w-full ${service.disabled ? 'opacity-60' : ''}`}>
                {service.features.map((feature, idx) => (
                  <li key={idx} className="flex items-center justify-start gap-2.5 text-xs font-bold text-slate-700 text-left">
                    <ShieldCheck className={`w-4 h-4 shrink-0 ${service.disabled ? 'text-slate-400' : 'text-blue-500 opacity-70'}`} />
                    <span>{feature}</span>
                  </li>
                ))}
              </ul>

              {/* Footer / Action */}
              <div className="w-full pt-5 md:pt-6 border-t border-slate-100 flex items-center justify-between mt-auto">
                <div className="flex items-center gap-1.5 md:gap-2 text-[9px] sm:text-[10px] font-black uppercase tracking-widest text-slate-400">
                  <Clock className="w-3.5 h-3.5 shrink-0" /> {service.time}
                </div>
                <div className={`w-8 h-8 md:w-10 md:h-10 rounded-full flex items-center justify-center shrink-0 transition-colors ${
                  service.disabled 
                    ? 'bg-slate-100 text-slate-400' 
                    : 'bg-slate-50 lg:group-hover:bg-blue-600 lg:group-hover:text-white'
                }`}>
                  {service.disabled ? <Lock className="w-3.5 h-3.5 md:w-4 md:h-4" /> : <ArrowRight className="w-4 h-4 md:w-5 md:h-5" />}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 🟢 THE NEW "EDIT SEARCH" MODAL */}
      {isEditModalOpen && (
        <div className="fixed inset-0 z-[200] bg-slate-950/60 backdrop-blur-sm flex items-end sm:items-center justify-center sm:p-4">
          <div className="bg-white w-full max-w-lg rounded-t-2xl sm:rounded-2xl p-6 sm:p-8 shadow-2xl animate-in slide-in-from-bottom-full sm:slide-in-from-bottom-8 duration-300 relative">
            
            <div className="flex justify-between items-center mb-6">
              <div>
                <h2 className="text-2xl font-black text-slate-900 tracking-tight">Modify Search</h2>
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mt-1">Update your travel details</p>
              </div>
              <button onClick={() => setIsEditModalOpen(false)} className="p-2.5 bg-slate-100 text-slate-600 rounded-full hover:bg-slate-200 transition-colors touch-manipulation">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleUpdateSearch} className="space-y-4">
              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Departure Airport</label>
                <select value={editAirport} onChange={(e)=>setEditAirport(e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3.5 font-black text-slate-900 text-base outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 touch-manipulation">
                  <option value="Luton (LTN)">Luton Airport (LTN)</option>
                  <option value="Heathrow (LHR)">Heathrow Airport (LHR)</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3 sm:gap-4 border-t border-slate-100 pt-4">
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Drop-off Date</label>
                  <input type="date" value={editDropDate} onChange={(e)=>setEditDropDate(e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-3.5 font-bold text-slate-900 text-sm outline-none focus:border-blue-500 touch-manipulation" required />
                </div>
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Time</label>
                  <input type="time" value={editDropTime} onChange={(e)=>setEditDropTime(e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-3.5 font-bold text-slate-900 text-sm outline-none focus:border-blue-500 touch-manipulation" required />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 sm:gap-4 pb-2">
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Pick-up Date</label>
                  <input type="date" min={editDropDate} value={editPickDate} onChange={(e)=>setEditPickDate(e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-3.5 font-bold text-slate-900 text-sm outline-none focus:border-blue-500 touch-manipulation" required />
                </div>
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Time</label>
                  <input type="time" value={editPickTime} onChange={(e)=>setEditPickTime(e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-3.5 font-bold text-slate-900 text-sm outline-none focus:border-blue-500 touch-manipulation" required />
                </div>
              </div>

              <button type="submit" className="w-full mt-6 py-4 bg-blue-600 hover:bg-blue-500 text-white font-black rounded-xl text-sm uppercase tracking-widest transition-all active:scale-95 shadow-lg shadow-blue-500/30 touch-manipulation">
                Update Search
              </button>
            </form>
          </div>
        </div>
      )}
    </main>
  );
}

export default function SelectServicePage() {
  return (
    <Suspense fallback={<div className="min-h-[100dvh] bg-slate-50 flex items-center justify-center font-bold text-slate-400 uppercase tracking-widest text-sm">Loading Options...</div>}>
      <ServiceSelectionContent />
    </Suspense>
  );
}