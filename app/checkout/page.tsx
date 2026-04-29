"use client";

import { supabase } from "../lib/supabase";
import { useState, Suspense } from "react"; 
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import { 
  ShieldCheck, 
  ArrowRight, 
  ArrowLeft, 
  Loader2,
  CarFront,
  User,
  MapPin,
  PlaneTakeoff,
  Plane,
  Lock,
  CreditCard,
  Calendar,
  Shield,
  Sparkles,
  Tag,
  AlertCircle,
  CheckCircle2
} from "lucide-react";

// ----------------------------------------------------------------------
// 🟢 CLEAN AERO AVATAR (Now Clickable!)
// ----------------------------------------------------------------------
function AeroAvatar({ size = "md", state = "idle", onClick }: { size?: "sm" | "md" | "lg" | "xl", state?: "idle" | "scanning" | "success", onClick?: () => void }) {
  const sizeClasses = { sm: "w-8 h-8 rounded-lg", md: "w-14 h-14 rounded-2xl", lg: "w-20 h-20 rounded-3xl", xl: "w-32 h-32 rounded-[2.5rem]" };
  const gap = { sm: "gap-1", md: "gap-1.5", lg: "gap-2", xl: "gap-3" };
  const eyeSize = { sm: "w-1 h-2.5", md: "w-1.5 h-4", lg: "w-2 h-6", xl: "w-3.5 h-10" };

  return (
    <div 
      onClick={onClick}
      className={`relative flex items-center justify-center shrink-0 ${sizeClasses[size]} ${onClick ? 'cursor-pointer hover:scale-105 active:scale-95 transition-transform' : ''}`}
    >
      {/* Outer Glow */}
      <div className={`absolute inset-0 bg-blue-500/40 blur-xl ${state === 'scanning' ? 'animate-pulse scale-125' : 'animate-pulse scale-105'}`}></div>

      {/* Main Body - Clean Blue Gradient */}
      <div className={`relative w-full h-full bg-gradient-to-br from-blue-500 to-blue-700 flex items-center justify-center shadow-[0_0_25px_rgba(37,99,235,0.5)] overflow-hidden ${sizeClasses[size]} transition-all duration-300`}>

        {/* Scanning Laser Line */}
        <div className={`absolute left-0 w-full h-[2px] bg-white/90 shadow-[0_0_15px_white] z-20 transition-opacity duration-300 ${state === 'scanning' ? 'opacity-100 animate-scan' : 'opacity-0'}`}></div>

        {/* The Clean Pill Eyes */}
        <div className={`flex ${gap[size]} z-10 items-center justify-center`}>
          <div className={`${eyeSize[size]} bg-white rounded-full shadow-[0_0_15px_rgba(255,255,255,1)]`}></div>
          <div className={`${eyeSize[size]} bg-white rounded-full shadow-[0_0_15px_rgba(255,255,255,1)]`}></div>
        </div>
      </div>
    </div>
  );
}

function CheckoutContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [isProcessing, setIsProcessing] = useState(false);
  
  // --- CAPTURE URL DATA ---
  const airport = searchParams.get("airport") || "Luton (LTN)";
  const dailyRate = Number(searchParams.get("price")) || 0;
  const dropDate = searchParams.get("dropoffDate");
  const pickDate = searchParams.get("pickupDate");
  const dropTime = searchParams.get("dropoffTime") || ""; 
  const pickTime = searchParams.get("pickupTime") || "";  
  const type = searchParams.get("type") || "Premium Meet & Greet"; 

  // --- FORM STATES ---
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState(""); 
  const [phone, setPhone] = useState("");
  const [terminal, setTerminal] = useState(airport.includes("Heathrow") ? "Terminal 2" : "Main Terminal");
  const [flightNumber, setFlightNumber] = useState("");
  const [registration, setRegistration] = useState(""); 
  const [carMake, setCarMake] = useState("");
  const [carColor, setCarColor] = useState("");

  // --- PROMO CODE STATES ---
  const [promoInput, setPromoInput] = useState("");
  const [discount, setDiscount] = useState({ active: false, code: "", percent: 0 });
  const [promoMessage, setPromoMessage] = useState("");
  const [isPromoError, setIsPromoError] = useState(false);
  
  // --- SECRET EASTER EGG STATE ---
  const [aeroClicks, setAeroClicks] = useState(0);

  // --- PROMO CODE LOGIC ---
  const handleApplyPromo = (e: React.FormEvent) => {
    e.preventDefault();
    const code = promoInput.toUpperCase().trim();

    if (code === "LAUNCH10") {
      setDiscount({ active: true, code: "LAUNCH10", percent: 0.10 });
      setPromoMessage("Launch discount applied! 10% off.");
      setIsPromoError(false);
    } else if (code === "AERO") {
      setDiscount({ active: true, code: "AERO", percent: 0.15 });
      setPromoMessage("Aero VIP discount applied! 15% off.");
      setIsPromoError(false);
    } else if (code === "SECRET3" || code === "AERO3") {
      setDiscount({ active: true, code: "AERO3", percent: 0.03 });
      setPromoMessage("Secret Aero Discount Unlocked! 3% off.");
      setIsPromoError(false);
    } else {
      setDiscount({ active: false, code: "", percent: 0 });
      setPromoMessage("Invalid or expired promo code.");
      setIsPromoError(true);
    }
  };

  // --- EASTER EGG LOGIC ---
  const handleAeroClick = () => {
    // Only allow the easter egg if they haven't already applied a bigger discount
    if (discount.active && discount.percent >= 0.03) return;

    const newClicks = aeroClicks + 1;
    setAeroClicks(newClicks);

    if (newClicks === 3) {
      setDiscount({ active: true, code: "AERO3", percent: 0.03 });
      setPromoMessage("Secret Aero Discount Unlocked! 3% off.");
      setIsPromoError(false);
      setPromoInput("AERO3"); // Automatically fill the input box
      setAeroClicks(0); // Reset clicks
    }
  };

  // --- SYNCED CALCULATION ---
  const calculateTotal = () => {
    if (!dropDate || !pickDate) return { days: 1, total: dailyRate };
    const start = new Date(dropDate);
    const end = new Date(pickDate);
    const diffTime = end.getTime() - start.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    const finalDays = diffDays <= 0 ? 1 : diffDays;
    
    return { days: finalDays, total: dailyRate * finalDays };
  };

  const booking = calculateTotal();
  const originalTotal = booking.total;
  const discountAmount = originalTotal * discount.percent;
  const finalTotal = originalTotal - discountAmount;

  const formatDate = (dateString: string | null) => {
    if (!dateString) return "--";
    return new Date(dateString).toLocaleDateString("en-GB", { weekday: 'short', day: 'numeric', month: 'short' });
  };

  const handlePayment = async (e: React.FormEvent) => {
    e.preventDefault(); 
    
    if (!fullName || !email || !phone || !registration || !carMake) {
      alert("Please complete all required fields.");
      return;
    }
    
    setIsProcessing(true);
    
    try {
      const shortId = "APD-" + Math.random().toString(36).substring(2, 8).toUpperCase();
      
      // Simulate payment gateway delay
      await new Promise(resolve => setTimeout(resolve, 1500));

      // 1. Save to Database (USING THE FINAL DISCOUNTED TOTAL)
      const { error: dbError } = await supabase
        .from('bookings')
        .insert([{ 
          booking_ref: shortId, 
          full_name: fullName, 
          email: email.trim().toLowerCase(),
          phone_number: phone,
          license_plate: registration.toUpperCase(), 
          car_make: carMake,
          car_color: carColor,
          service_type: type,
          dropoff_date: dropDate,
          dropoff_time: dropTime, 
          pickup_date: pickDate,
          pickup_time: pickTime,  
          total_price: finalTotal, // <--- SAVING DISCOUNTED PRICE
          flight_number: flightNumber.toUpperCase().trim(),
          airport: airport,
          terminal: terminal
        }]);

      if (dbError) throw dbError;
      
      // 2. Trigger the Email API
      try {
        await fetch('/api/send', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            customerEmail: email,
            flightNumber: flightNumber,
            parkingType: type,
            bookingRef: shortId,
            customerPhone: phone,
            carDetails: `${registration.toUpperCase()} - ${carMake} ${carColor}`,
            airport: airport,
            terminal: terminal
          }),
        });
        console.log("Email triggered successfully");
      } catch (emailError) {
        console.error("Failed to send email:", emailError);
      }
      
      // 3. Redirect to Success Page
      router.push(`/success?ref=${shortId}`);
      
    } catch (error: any) {
      alert(`Error: ${error.message}`);
      setIsProcessing(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 md:py-12 relative z-10">
      
      {/* 🟢 AERO SECURE BANNER (Now with easter egg!) */}
      <div className="max-w-3xl mx-auto mb-8 bg-[#0B1121] border border-blue-900/40 rounded-2xl p-4 md:p-5 flex items-center gap-5 shadow-xl relative overflow-hidden">
        <div className="absolute -right-10 -top-10 w-32 h-32 bg-blue-600/20 rounded-full blur-3xl pointer-events-none"></div>
        
        {/* Pass the onClick handler here */}
        <AeroAvatar state="idle" size="md" onClick={handleAeroClick} />
        
        <div className="relative z-10">
          <p className="text-[9px] font-black uppercase tracking-[0.2em] text-blue-400 mb-1 flex items-center gap-1.5"><CheckCircle2 className="w-3.5 h-3.5"/> Aero Secure Checkout</p>
          <p className="text-xs sm:text-sm text-slate-300 font-medium">Aero has locked your rate. Complete your details below.</p>
        </div>
      </div>

      {/* Stepper */}
      <div className="flex items-center justify-between mb-8 md:mb-10 max-w-3xl mx-auto px-2">
        <div className="flex flex-col items-center gap-2 flex-1 opacity-40">
          <div className="h-1 w-full bg-blue-600 rounded-full"></div>
          <span className="text-[9px] md:text-[10px] font-black uppercase text-blue-600 tracking-[0.2em] hidden xs:block">Select</span>
        </div>
        <div className="w-4 md:w-8 flex justify-center text-slate-300">—</div>
        <div className="flex flex-col items-center gap-2 flex-1">
          <div className="h-1.5 w-full bg-blue-600 rounded-full shadow-[0_0_12px_rgba(37,99,235,0.6)]"></div>
          <span className="text-[9px] md:text-[10px] font-black uppercase text-blue-600 tracking-[0.2em] hidden xs:block">Details & Pay</span>
        </div>
        <div className="w-4 md:w-8 flex justify-center text-slate-300">—</div>
        <div className="flex flex-col items-center gap-2 flex-1 opacity-30">
          <div className="h-1 w-full bg-slate-300 rounded-full"></div>
          <span className="text-[9px] md:text-[10px] font-black uppercase text-slate-500 tracking-[0.2em] hidden xs:block">Confirm</span>
        </div>
      </div>

      <div className="flex flex-col-reverse lg:flex-row gap-8 md:gap-10 items-start">
        
        {/* LEFT COLUMN: FORMS */}
        <div className="flex-1 w-full">
          <form id="checkout-form" onSubmit={handlePayment} className="space-y-6 md:space-y-8">
            
            {/* 1. PERSONAL DETAILS */}
            <div className="bg-white p-6 md:p-8 rounded-[2rem] border border-slate-200 shadow-sm relative overflow-hidden">
              <div className="flex items-center gap-3 mb-6 md:mb-8 pb-5 md:pb-6 border-b border-slate-100">
                <div className="w-10 h-10 md:w-12 md:h-12 bg-blue-50 rounded-xl flex items-center justify-center shrink-0">
                  <User className="w-5 h-5 md:w-6 md:h-6 text-blue-600" />
                </div>
                <div>
                  <h2 className="text-lg md:text-xl font-black text-slate-900 tracking-tight">1. Contact Information</h2>
                  <p className="text-[10px] md:text-xs font-bold text-slate-400 uppercase tracking-widest mt-1">Lead Passenger Details</p>
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-5">
                <div className="md:col-span-2">
                  <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2 ml-1">Full Name</label>
                  <input required type="text" value={fullName} onChange={(e) => setFullName(e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3.5 text-base font-bold text-slate-900 placeholder:text-slate-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none transition-all touch-manipulation" placeholder="James Bond" />
                </div>
                <div>
                  <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2 ml-1">Email Address</label>
                  <input required type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3.5 text-base font-bold text-slate-900 placeholder:text-slate-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none transition-all touch-manipulation" placeholder="james@example.com" />
                </div>
                <div>
                  <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2 ml-1">Mobile Number</label>
                  <input required type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3.5 text-base font-bold text-slate-900 placeholder:text-slate-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none transition-all touch-manipulation" placeholder="+44 7700 900000" />
                </div>
              </div>
            </div>

            {/* 2. VEHICLE & TRAVEL */}
            <div className="bg-white p-6 md:p-8 rounded-[2rem] border border-slate-200 shadow-sm relative overflow-hidden">
              <div className="flex items-center gap-3 mb-6 md:mb-8 pb-5 md:pb-6 border-b border-slate-100">
                <div className="w-10 h-10 md:w-12 md:h-12 bg-blue-50 rounded-xl flex items-center justify-center shrink-0">
                  <CarFront className="w-5 h-5 md:w-6 md:h-6 text-blue-600" />
                </div>
                <div>
                  <h2 className="text-lg md:text-xl font-black text-slate-900 tracking-tight">2. Vehicle & Flight Details</h2>
                  <p className="text-[10px] md:text-xs font-bold text-slate-400 uppercase tracking-widest mt-1">So we know who to look for</p>
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-5 mb-4 md:mb-5">
                <div>
                  <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2 ml-1">Departure Terminal</label>
                  <div className="relative">
                    <select value={terminal} onChange={(e) => setTerminal(e.target.value)} className="w-full bg-blue-50 border border-blue-100 rounded-xl px-4 py-3.5 text-base font-black text-blue-900 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none transition-all appearance-none cursor-pointer touch-manipulation">
                      {airport.includes("Heathrow") ? (
                        <>
                          <option>Terminal 2</option>
                          <option>Terminal 3</option>
                          <option>Terminal 4</option>
                          <option>Terminal 5</option>
                        </>
                      ) : (
                        <option>Main Terminal</option>
                      )}
                    </select>
                  </div>
                </div>
                <div>
                  <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2 ml-1">Return Flight No. (Optional)</label>
                  <input type="text" value={flightNumber} onChange={(e) => setFlightNumber(e.target.value.toUpperCase())} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3.5 text-base font-bold text-slate-900 placeholder:text-slate-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none transition-all uppercase placeholder:normal-case touch-manipulation" placeholder="e.g. BA123" />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-5">
                <div className="md:col-span-3">
                  <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2 ml-1">Registration Plate</label>
                  <input required type="text" value={registration} onChange={(e) => setRegistration(e.target.value.toUpperCase())} className="w-full bg-[#fde047] border-2 border-yellow-400 rounded-xl px-4 py-4 font-black text-slate-900 text-lg md:text-2xl text-center uppercase tracking-[0.2em] focus:border-blue-500 focus:ring-4 focus:ring-blue-500/20 outline-none transition-all placeholder:text-yellow-600/50 shadow-inner touch-manipulation" placeholder="AB12 CDE" />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2 ml-1">Make & Model</label>
                  <input required type="text" value={carMake} onChange={(e) => setCarMake(e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3.5 text-base font-bold text-slate-900 placeholder:text-slate-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none transition-all touch-manipulation" placeholder="e.g. Range Rover Sport" />
                </div>
                <div>
                  <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2 ml-1">Color</label>
                  <input type="text" value={carColor} onChange={(e) => setCarColor(e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3.5 text-base font-bold text-slate-900 placeholder:text-slate-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none transition-all touch-manipulation" placeholder="e.g. Black" />
                </div>
              </div>
            </div>

            {/* 3. PAYMENT MOCKUP */}
            <div className="bg-white p-6 md:p-8 rounded-[2rem] border border-slate-200 shadow-sm relative overflow-hidden">
              <div className="flex items-center justify-between mb-6 md:mb-8 pb-5 md:pb-6 border-b border-slate-100">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 md:w-12 md:h-12 bg-slate-100 rounded-xl flex items-center justify-center shrink-0">
                    <CreditCard className="w-5 h-5 md:w-6 md:h-6 text-slate-600" />
                  </div>
                  <div>
                    <h2 className="text-lg md:text-xl font-black text-slate-900 tracking-tight">3. Secure Payment</h2>
                    <p className="text-[10px] md:text-xs font-bold text-slate-400 uppercase tracking-widest mt-1">256-bit Encrypted</p>
                  </div>
                </div>
                <div className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 text-emerald-600 rounded-lg text-[9px] md:text-[10px] font-black uppercase tracking-widest border border-emerald-100">
                  <Lock className="w-3 h-3" /> Secure
                </div>
              </div>
              
              <div className="bg-slate-50 p-5 md:p-6 rounded-2xl border border-slate-200 space-y-4">
                <div>
                   <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2 ml-1">Card Number</label>
                   <input type="text" placeholder="0000 0000 0000 0000" className="w-full p-4 bg-white border border-slate-200 rounded-xl text-base font-bold text-slate-900 font-mono tracking-widest outline-none focus:border-blue-500 touch-manipulation" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                     <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2 ml-1">Expiry Date</label>
                     <input type="text" placeholder="MM/YY" className="w-full p-4 bg-white border border-slate-200 rounded-xl text-base font-bold text-slate-900 text-center outline-none focus:border-blue-500 touch-manipulation" />
                  </div>
                  <div>
                     <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2 ml-1">CVC</label>
                     <input type="text" placeholder="123" className="w-full p-4 bg-white border border-slate-200 rounded-xl text-base font-bold text-slate-900 text-center outline-none focus:border-blue-500 touch-manipulation" />
                  </div>
                </div>
              </div>
            </div>

            {/* Mobile Submit Button */}
            <div className="block lg:hidden mt-6 pb-6">
              <button 
                type="submit" 
                form="checkout-form"
                disabled={isProcessing}
                className="w-full h-16 bg-blue-600 hover:bg-blue-500 disabled:bg-blue-600/50 text-white font-black text-base rounded-2xl flex items-center justify-center gap-2 shadow-[0_10px_30px_rgba(37,99,235,0.4)] active:scale-95 transition-all uppercase tracking-widest touch-manipulation"
              >
                {isProcessing ? (
                  <><Loader2 className="w-5 h-5 animate-spin" /> Processing...</>
                ) : (
                  <><Lock className="w-4 h-4" /> Pay £{finalTotal.toFixed(2)}</>
                )}
              </button>
            </div>

          </form>
        </div>

        {/* RIGHT COLUMN: AERO ORDER SUMMARY */}
        <aside className="w-full lg:w-[400px] xl:w-[420px] lg:sticky lg:top-28">
          <div className="bg-[#0B1121] rounded-[2rem] md:rounded-[2.5rem] border border-blue-500/30 shadow-2xl overflow-hidden text-white relative">
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-400 to-blue-600"></div>
            
            {/* Aero Branding Badge */}
            <div className="absolute top-4 right-4 bg-blue-500/10 text-blue-400 border border-blue-500/30 text-[8px] md:text-[9px] font-black uppercase tracking-widest px-3 py-1.5 rounded-full flex items-center gap-1.5 shadow-[0_0_15px_rgba(37,99,235,0.2)]">
              <Sparkles className="w-3 h-3 fill-current" /> Aero Verified
            </div>
            
            <div className="p-6 md:p-8 lg:p-10">
              <h3 className="text-xl md:text-2xl font-black tracking-tight mb-6 md:mb-8">Order Summary</h3>
              
              <div className="flex items-start gap-4 mb-6 md:mb-8 pb-6 md:pb-8 border-b border-white/10">
                <div className="w-12 h-12 md:w-14 md:h-14 bg-blue-600 rounded-2xl flex items-center justify-center flex-shrink-0 shadow-lg">
                  <PlaneTakeoff className="w-6 h-6 md:w-7 md:h-7 text-white" />
                </div>
                <div>
                  <p className="text-[9px] md:text-[10px] font-black uppercase tracking-widest text-blue-400 mb-1">{airport}</p>
                  <p className="font-black text-base md:text-lg leading-tight tracking-tight">{type}</p>
                </div>
              </div>

              <div className="space-y-4 md:space-y-5 mb-6 md:mb-8 pb-6 md:pb-8 border-b border-white/10">
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-2 md:gap-3 text-slate-400">
                    <Calendar className="w-3.5 h-3.5 md:w-4 md:h-4 text-blue-500" /> <span className="text-[10px] md:text-[11px] font-black uppercase tracking-widest">Drop-off</span>
                  </div>
                  <div className="text-right">
                    <span className="block text-xs md:text-sm font-bold text-white">{formatDate(dropDate)}</span>
                    <span className="block text-[9px] md:text-[10px] text-slate-500 font-bold uppercase tracking-widest mt-0.5">{dropTime || "Time TBD"}</span>
                  </div>
                </div>
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-2 md:gap-3 text-slate-400">
                    <Calendar className="w-3.5 h-3.5 md:w-4 md:h-4 text-blue-500" /> <span className="text-[10px] md:text-[11px] font-black uppercase tracking-widest">Pick-up</span>
                  </div>
                  <div className="text-right">
                    <span className="block text-xs md:text-sm font-bold text-white">{formatDate(pickDate)}</span>
                    <span className="block text-[9px] md:text-[10px] text-slate-500 font-bold uppercase tracking-widest mt-0.5">{pickTime || "Time TBD"}</span>
                  </div>
                </div>
              </div>

              {/* 🟢 PROMO CODE SECTION */}
              <div className="bg-white/5 border border-white/10 rounded-2xl p-4 md:p-5 mb-6 md:mb-8">
                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-3 flex items-center gap-2">
                  <Tag className="w-3.5 h-3.5" /> Have a Promo Code?
                </label>
                
                <form onSubmit={handleApplyPromo} className="flex gap-2">
                  <input 
                    type="text" 
                    value={promoInput}
                    onChange={(e) => setPromoInput(e.target.value)}
                    placeholder="Enter code" 
                    disabled={discount.active}
                    className="flex-1 w-full min-w-0 bg-white/5 border border-white/10 rounded-xl px-3 py-3 font-bold text-white text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 disabled:bg-white/5 disabled:text-slate-500 uppercase placeholder:text-slate-600 touch-manipulation"
                  />
                  {!discount.active ? (
                    <button type="submit" className="bg-blue-600 hover:bg-blue-500 text-white px-4 shrink-0 rounded-xl font-black text-xs uppercase tracking-widest transition-colors active:scale-95 touch-manipulation">
                      Apply
                    </button>
                  ) : (
                    <button type="button" onClick={() => { setDiscount({ active: false, code: "", percent: 0 }); setPromoInput(""); setPromoMessage(""); }} className="bg-red-500/20 hover:bg-red-500/30 text-red-400 border border-red-500/20 px-4 shrink-0 rounded-xl font-black text-xs uppercase tracking-widest transition-colors active:scale-95 touch-manipulation">
                      Remove
                    </button>
                  )}
                </form>

                {promoMessage && (
                  <div className={`mt-3 text-[10px] font-bold uppercase tracking-widest flex items-center gap-1.5 ${isPromoError ? 'text-red-400' : 'text-emerald-400'}`}>
                    {isPromoError ? <AlertCircle className="w-3.5 h-3.5" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
                    {promoMessage}
                  </div>
                )}
              </div>

              {/* 🟢 TOTALS (Updated for Promo) */}
              <div className="space-y-3 md:space-y-4 mb-8 md:mb-10">
                <div className="flex justify-between text-xs md:text-sm text-slate-400 font-medium">
                  <span>Parking Rate ({booking.days} {booking.days === 1 ? "day" : "days"})</span>
                  <span className={`font-bold ${discount.active ? 'text-slate-500 line-through' : 'text-white'}`}>£{originalTotal.toFixed(2)}</span>
                </div>
                
                {discount.active && (
                  <div className="flex justify-between text-xs md:text-sm text-emerald-400 font-medium">
                    <span>Discount ({discount.code})</span>
                    <span className="font-bold">- £{discountAmount.toFixed(2)}</span>
                  </div>
                )}

                <div className="flex justify-between text-xs md:text-sm text-slate-400 font-medium">
                  <span>Taxes & Airport Fees</span>
                  <span className="text-emerald-400 font-bold uppercase tracking-widest text-[9px] md:text-[10px]">Included</span>
                </div>
              </div>

              <div className="flex flex-col items-end mb-6 md:mb-8">
                <span className="text-[9px] md:text-[10px] font-black uppercase tracking-widest text-slate-500 mb-1">Total Due Today</span>
                <span className="text-4xl md:text-5xl font-black tracking-tighter text-blue-400 drop-shadow-md">£{finalTotal.toFixed(2)}</span>
              </div>

              {/* Desktop Submit Button */}
              <button 
                type="submit" 
                form="checkout-form"
                disabled={isProcessing}
                className="hidden lg:flex w-full h-14 md:h-16 bg-blue-600 hover:bg-blue-500 disabled:bg-blue-600/50 text-white font-black text-base md:text-lg rounded-2xl items-center justify-center gap-2 md:gap-3 shadow-[0_10px_30px_rgba(37,99,235,0.4)] active:scale-95 transition-all uppercase tracking-widest touch-manipulation"
              >
                {isProcessing ? (
                  <><Loader2 className="w-5 h-5 md:w-6 md:h-6 animate-spin" /> Processing...</>
                ) : (
                  <><Lock className="w-4 h-4 md:w-5 md:h-5" /> Confirm & Pay</>
                )}
              </button>
            </div>
          </div>

          <div className="mt-4 md:mt-6 flex flex-col gap-4">
             <div className="bg-white rounded-[1.5rem] p-5 md:p-6 border border-slate-200 shadow-sm flex items-start gap-3 md:gap-4">
                <div className="w-8 h-8 md:w-10 md:h-10 bg-emerald-50 text-emerald-600 rounded-xl flex items-center justify-center flex-shrink-0">
                  <ShieldCheck className="w-4 h-4 md:w-5 md:h-5" />
                </div>
                <div>
                  <p className="text-xs md:text-sm font-black text-slate-900 tracking-tight mb-1">Aero Booking Guarantee</p>
                  <p className="text-[11px] md:text-xs font-bold text-slate-500 leading-relaxed">Free cancellation up to 2 hours before your drop-off time. Fully protected and verified by Aero Concierge.</p>
                </div>
             </div>
          </div>
        </aside>

      </div>
    </div>
  );
}

export default function CheckoutPage() {
  return (
    <main suppressHydrationWarning className="min-h-[100dvh] bg-[#F8FAFC] font-sans antialiased pb-24 selection:bg-blue-200 selection:text-blue-900 overflow-x-hidden relative">
      
      {/* Background glow logic for desktop */}
      <div className="fixed top-0 left-0 w-full h-full pointer-events-none z-0 flex justify-center overflow-hidden">
         <div className="w-full max-w-[1000px] h-96 bg-blue-600/5 blur-[120px] rounded-full absolute -top-48"></div>
      </div>

      <header className="sticky top-0 z-[100] bg-[#0A101D] border-b border-white/5 shadow-2xl backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 md:h-20 flex items-center justify-between">
          <Link href="/results" className="flex items-center gap-2 text-slate-400 hover:text-white transition-colors group touch-manipulation">
            <ArrowLeft className="w-4 h-4 md:w-5 md:h-5 lg:group-hover:-translate-x-1 transition-transform" />
            <span className="text-[9px] md:text-[10px] font-black uppercase tracking-widest hidden md:block">Back to Packages</span>
          </Link>
          
          <Link href="/" className="flex items-center gap-1.5 md:gap-2 text-white font-black tracking-tighter text-lg md:text-xl uppercase absolute left-1/2 -translate-x-1/2 touch-manipulation">
            <Plane className="w-5 h-5 md:w-6 md:h-6 text-blue-500 rotate-45" /> AEROPARK<span className="text-blue-500">DIRECT</span>
          </Link>

          <div className="flex items-center gap-1.5 md:gap-2 text-emerald-400">
             <Lock className="w-3.5 h-3.5 md:w-4 md:h-4" />
             <span className="text-[9px] md:text-[10px] font-black uppercase tracking-widest hidden xs:block">Secure Checkout</span>
          </div>
        </div>
      </header>

      <Suspense fallback={<div className="p-24 md:p-40 text-center font-black uppercase tracking-[0.2em] md:tracking-widest text-xs md:text-sm text-slate-400 animate-pulse">Aero is Initializing Checkout...</div>}>
        <CheckoutContent />
      </Suspense>
    </main>
  );
}