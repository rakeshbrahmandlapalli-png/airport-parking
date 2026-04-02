"use client";

import { supabase } from "../lib/supabase";
import { useState, Suspense } from "react"; 
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import BookingStepper from "../../components/BookingStepper";
import { 
  ShieldCheck, 
  ArrowRight, 
  ChevronLeft, 
  Loader2,
  Car,
  User,
  MapPin,
  PlaneTakeoff
} from "lucide-react";

function CheckoutContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [isProcessing, setIsProcessing] = useState(false);
  
  // --- CAPTURE URL DATA ---
  const airport = searchParams.get("airport") || "Luton (LTN)";
  const dailyRate = Number(searchParams.get("price")) || 0;
  const dropDate = searchParams.get("dropoffDate");
  const pickDate = searchParams.get("pickupDate");
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

  // --- SYNCED CALCULATION ---
  const calculateTotal = () => {
    if (!dropDate || !pickDate) return { days: 1, total: dailyRate };
    const start = new Date(dropDate);
    const end = new Date(pickDate);
    const diffTime = end.getTime() - start.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    const finalDays = diffDays <= 0 ? 1 : diffDays;
    
    return { 
      days: finalDays, 
      total: dailyRate * finalDays 
    };
  };

  const booking = calculateTotal();

  const handlePayment = async () => {
    if (!fullName || !email || !phone || !registration || !carMake) {
      alert("Please complete all required fields.");
      return;
    }
    setIsProcessing(true);
    try {
      const shortId = "APV-" + Math.random().toString(36).substring(2, 8).toUpperCase();
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
          pickup_date: pickDate,
          total_price: booking.total,
          flight_number: flightNumber.toUpperCase().trim(),
          airport: airport,
          terminal: terminal // Important: Track the terminal!
        }]);

      if (dbError) throw dbError;
      router.push(`/success?ref=${shortId}`);
    } catch (error: any) {
      alert(`Error: ${error.message}`);
      setIsProcessing(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto">
      <Link href="/results" className="inline-flex items-center gap-2 text-slate-400 mb-8 font-black text-[10px] uppercase tracking-widest hover:text-blue-600 transition-colors group">
        <ChevronLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" /> Back to Results
      </Link>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_420px] gap-12 items-start">
        <div className="space-y-8">
          
          {/* VEHICLE PREVIEW */}
          <div className="bg-slate-900 rounded-[2.5rem] p-6 text-white flex items-center justify-between shadow-xl">
               <div className="flex items-center gap-4">
                 <div className="w-14 h-14 bg-blue-600 rounded-2xl flex items-center justify-center">
                   <PlaneTakeoff className="w-7 h-7 text-white" />
                 </div>
                 <div>
                   <p className="text-[10px] font-black uppercase tracking-widest opacity-60">Departing From</p>
                   <p className="text-xl font-black">{airport}</p>
                 </div>
               </div>
          </div>

          <div className="bg-white rounded-[3.5rem] p-8 md:p-12 shadow-2xl border border-slate-100">
              <h3 className="text-2xl font-black mb-12 flex items-center gap-4 text-slate-900 tracking-tight">
                <div className="w-12 h-12 bg-blue-600 text-white rounded-2xl flex items-center justify-center shadow-lg">
                  <User className="w-6 h-6" />
                </div>
                Booking Details
              </h3>

              <div className="space-y-12">
                {/* 1. PERSONAL */}
                <section className="space-y-6">
                  <h4 className="text-[11px] font-black uppercase tracking-[0.2em] text-blue-600 border-b border-slate-50 pb-4">1. Contact Information</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <input type="text" value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="Full Name" className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl font-bold outline-none focus:ring-2 focus:ring-blue-500 transition-all" />
                    <input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="Mobile Number" className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl font-bold outline-none focus:ring-2 focus:ring-blue-500 transition-all" />
                  </div>
                  <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Email Address" className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl font-bold outline-none focus:ring-2 focus:ring-blue-500 transition-all" />
                </section>

                {/* 2. TRAVEL & VEHICLE */}
                <section className="space-y-6 pt-6">
                  <h4 className="text-[11px] font-black uppercase tracking-[0.2em] text-blue-600 border-b border-slate-50 pb-4">2. Travel & Vehicle</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* TERMINAL SELECTOR */}
                    <div className="relative">
                      <select 
                        value={terminal}
                        onChange={(e) => setTerminal(e.target.value)}
                        className="w-full p-4 bg-blue-50/50 border border-blue-100 rounded-2xl font-black outline-none focus:ring-2 focus:ring-blue-500 appearance-none"
                      >
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
                    <input type="text" value={flightNumber} onChange={(e) => setFlightNumber(e.target.value.toUpperCase())} placeholder="Return Flight No." className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl font-bold outline-none" />
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <input type="text" value={registration} onChange={(e) => setRegistration(e.target.value.toUpperCase())} placeholder="Reg No." className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl font-black" />
                    <input type="text" value={carMake} onChange={(e) => setCarMake(e.target.value)} placeholder="Make/Model" className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl font-bold" />
                    <input type="text" value={carColor} onChange={(e) => setCarColor(e.target.value)} placeholder="Color" className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl font-bold" />
                  </div>
                </section>

                {/* 3. PAYMENT */}
                <section className="space-y-6 pt-6">
                  <h4 className="text-[11px] font-black uppercase tracking-[0.2em] text-blue-600 border-b border-slate-50 pb-4">3. Secure Payment</h4>
                  <div className="bg-slate-50 p-6 rounded-3xl space-y-4">
                    <input type="text" placeholder="Card Number" className="w-full p-4 bg-white border border-slate-200 rounded-2xl font-bold" />
                    <div className="grid grid-cols-2 gap-4">
                      <input type="text" placeholder="MM/YY" className="w-full p-4 bg-white border border-slate-200 rounded-2xl font-bold text-center" />
                      <input type="text" placeholder="CVC" className="w-full p-4 bg-white border border-slate-200 rounded-2xl font-bold text-center" />
                    </div>
                  </div>
                </section>
              </div>
          </div>
        </div>

        <aside className="relative lg:sticky lg:top-10 space-y-6">
          <div className="bg-[#0b1120] rounded-[3.5rem] p-10 text-white shadow-2xl relative overflow-hidden">
            <h2 className="text-xl font-black mb-8 border-b border-white/10 pb-6 flex items-center justify-between">
              Summary <ShieldCheck className="w-5 h-5 text-blue-500" />
            </h2>
            <div className="space-y-4 font-bold text-sm">
              <div className="flex justify-between text-blue-400 uppercase text-[10px]">
                <span>Airport</span>
                <span>{airport}</span>
              </div>
              <div className="flex justify-between text-white opacity-80">
                <span className="font-medium">Rate per Day</span>
                <span>£{dailyRate.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-white">
                <span className="opacity-50 font-medium">Duration</span>
                <span>{booking.days} {booking.days === 1 ? "Day" : "Days"}</span>
              </div>
              <div className="pt-6 border-t border-white/10 flex flex-col items-end gap-1">
                <span className="opacity-50 text-[10px] uppercase">Total to Pay</span>
                <span className="text-5xl font-black tracking-tighter text-blue-500">
                  £{booking.total.toFixed(2)}
                </span>
              </div>
              <button onClick={handlePayment} disabled={isProcessing} className="w-full py-6 mt-8 bg-blue-600 hover:bg-blue-500 text-white font-black text-xl rounded-3xl shadow-xl transition-all flex items-center justify-center gap-3">
                {isProcessing ? <Loader2 className="w-6 h-6 animate-spin" /> : <>Confirm <ArrowRight className="w-5 h-5" /></>}
              </button>
            </div>
          </div>

          <div className="bg-white rounded-[2.5rem] p-8 border border-slate-200 shadow-xl">
              <div className="flex items-center gap-3 mb-4">
                 <div className="w-8 h-8 bg-blue-50 text-blue-600 rounded-lg flex items-center justify-center">
                   <MapPin className="w-4 h-4" />
                 </div>
                 <p className="text-[10px] font-black uppercase tracking-widest text-slate-900">Meeting Location</p>
              </div>
              <p className="text-xs font-bold text-slate-500 leading-relaxed">
                {airport.includes("Heathrow") 
                  ? `Meet us at the ${terminal} Short Stay car park. Follow signs for 'Meet & Greet' on Level 2/3.`
                  : "Terminal Car Park 1, Level 3, Row A. Look for the representative in a high-visibility uniform."}
              </p>
          </div>
        </aside>
      </div>
    </div>
  );
}

export default function CheckoutPage() {
  return (
    <main className="min-h-screen bg-slate-50 py-12 px-4 md:px-6 font-sans">
      <Suspense fallback={<div className="min-h-[60vh] flex flex-col items-center justify-center"><Loader2 className="w-10 h-10 animate-spin text-blue-600" /></div>}>
        <CheckoutContent />
      </Suspense>
    </main>
  );
}