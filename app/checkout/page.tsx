"use client";

import { supabase } from "../lib/supabase";
import { useState, Suspense } from "react"; 
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import BookingStepper from "../../components/BookingStepper";
import { 
  ShieldCheck, 
  Lock, 
  CreditCard, 
  ArrowRight, 
  ChevronLeft, 
  Loader2,
  Car,
  User,
  MapPin
} from "lucide-react";

function CheckoutContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  
  const [isProcessing, setIsProcessing] = useState(false);
  
  // --- FORM STATES ---
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState(""); 
  const [phone, setPhone] = useState("");
  const [flightNumber, setFlightNumber] = useState("");
  const [registration, setRegistration] = useState(""); 
  const [carMake, setCarMake] = useState("");
  const [carColor, setCarColor] = useState("");
  const [notes, setNotes] = useState("");

  // --- DATA FROM URL ---
  const dropDate = searchParams.get("dropoffDate");
  const pickDate = searchParams.get("pickupDate");
  const type = searchParams.get("type") || "Premium Meet & Greet"; 
  const urlPrice = Number(searchParams.get("price")) || 0; 

  // --- REFINED CALCULATION ---
  const calculateTotal = () => {
    if (!dropDate || !pickDate) return { days: 1, dailyRate: urlPrice, total: urlPrice };
    
    const start = new Date(dropDate);
    const end = new Date(pickDate);
    
    // Convert to 24h blocks rounded up
    const diffTime = end.getTime() - start.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    const finalDays = diffDays <= 0 ? 1 : diffDays;

    // Calculate daily rate based on the total price passed from results
    const dailyRate = urlPrice / finalDays;

    return { 
      days: finalDays, 
      dailyRate: dailyRate,
      total: urlPrice 
    };
  };

  const booking = calculateTotal();

  const handlePayment = async () => {
    if (!fullName || !email || !phone || !registration || !carMake) {
      alert("Please complete all required fields to secure your booking.");
      return;
    }
    setIsProcessing(true);
    
    try {
      const shortId = "APV-" + Math.random().toString(36).substring(2, 8).toUpperCase();
      const cleanEmail = email.trim().toLowerCase();

      const { error: dbError } = await supabase
        .from('bookings')
        .insert([{ 
          booking_ref: shortId, 
          full_name: fullName, 
          email: cleanEmail,
          phone_number: phone,
          license_plate: registration.toUpperCase(), 
          car_make: carMake,
          car_color: carColor,
          additional_notes: notes,
          service_type: type,
          dropoff_date: dropDate,
          pickup_date: pickDate,
          total_price: booking.total,
          flight_number: flightNumber.toUpperCase().trim()
        }]);

      if (dbError) throw dbError;

      await fetch('/api/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customerEmail: cleanEmail,
          bookingRef: shortId,
          parkingType: type
        }),
      });

      router.push(`/success?ref=${shortId}`);
    } catch (error: any) {
      console.error("Booking Failure:", error);
      alert(`❌ Error: ${error.message || "Something went wrong"}`);
      setIsProcessing(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto">
      <Link href="/results" className="inline-flex items-center gap-2 text-slate-400 mb-8 font-black text-[10px] uppercase tracking-widest hover:text-blue-600 transition-colors group">
        <ChevronLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" /> Change Selection
      </Link>

      <div className="mb-12">
        <BookingStepper currentStep={2} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_420px] gap-12 items-start">
        <div className="space-y-8">
          
          {registration && (
            <div className="bg-blue-600 rounded-[2.5rem] p-6 text-white flex items-center justify-between shadow-xl shadow-blue-500/20 animate-in fade-in slide-in-from-top-4 duration-500">
               <div className="flex items-center gap-4">
                 <div className="w-14 h-14 bg-white/10 rounded-2xl flex items-center justify-center">
                   <Car className="w-7 h-7 text-white" />
                 </div>
                 <div>
                   <p className="text-[10px] font-black uppercase tracking-widest opacity-60">Registration Recognized</p>
                   <p className="text-xl font-black">{registration.toUpperCase()}</p>
                 </div>
               </div>
            </div>
          )}

          <div className="bg-white rounded-[3.5rem] p-8 md:p-12 shadow-2xl shadow-slate-200/60 border border-slate-100">
              <h3 className="text-2xl font-black mb-12 flex items-center gap-4 text-slate-900 tracking-tight">
                <div className="w-12 h-12 bg-blue-600 text-white rounded-2xl flex items-center justify-center shadow-lg">
                  <User className="w-6 h-6" />
                </div>
                Booking Details
              </h3>

              <div className="space-y-12">
                <section className="space-y-6">
                  <h4 className="text-[11px] font-black uppercase tracking-[0.2em] text-blue-600 border-b border-slate-50 pb-4">1. Personal Info</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <input type="text" value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="Full Name" className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl font-bold outline-none focus:ring-2 focus:ring-blue-500 transition-all" />
                    <input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="Mobile Number" className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl font-bold outline-none focus:ring-2 focus:ring-blue-500 transition-all" />
                  </div>
                  <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Email Address" className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl font-bold outline-none focus:ring-2 focus:ring-blue-500 transition-all" />
                </section>

                <section className="space-y-6 pt-6">
                  <h4 className="text-[11px] font-black uppercase tracking-[0.2em] text-blue-600 border-b border-slate-50 pb-4">2. Vehicle & Flight</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <input type="text" value={registration} onChange={(e) => setRegistration(e.target.value.toUpperCase())} placeholder="License Plate" className="w-full p-4 bg-blue-50/30 border border-blue-100 rounded-2xl font-black outline-none focus:ring-2 focus:ring-blue-500 transition-all text-xl" />
                    <input type="text" value={flightNumber} onChange={(e) => setFlightNumber(e.target.value.toUpperCase())} placeholder="Return Flight No." className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl font-bold outline-none focus:ring-2 focus:ring-blue-500 transition-all" />
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <input type="text" value={carMake} onChange={(e) => setCarMake(e.target.value)} placeholder="Make/Model (e.g. BMW X5)" className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl font-bold outline-none focus:ring-2 focus:ring-blue-500 transition-all" />
                    <input type="text" value={carColor} onChange={(e) => setCarColor(e.target.value)} placeholder="Car Colour" className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl font-bold outline-none focus:ring-2 focus:ring-blue-500 transition-all" />
                  </div>
                </section>

                <section className="space-y-6 pt-6">
                  <h4 className="text-[11px] font-black uppercase tracking-[0.2em] text-blue-600 border-b border-slate-50 pb-4">3. Secure Payment</h4>
                  <div className="bg-slate-50 p-6 rounded-3xl space-y-4">
                    <input type="text" placeholder="Card Number" className="w-full p-4 bg-white border border-slate-200 rounded-2xl font-bold outline-none focus:ring-2 focus:ring-blue-500" />
                    <div className="grid grid-cols-2 gap-4">
                      <input type="text" placeholder="MM/YY" className="w-full p-4 bg-white border border-slate-200 rounded-2xl font-bold outline-none text-center" />
                      <input type="text" placeholder="CVC" className="w-full p-4 bg-white border border-slate-200 rounded-2xl font-bold outline-none text-center" />
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
                <span>Service</span>
                <span>{type}</span>
              </div>
              
              {/* NEW: DAILY RATE DISPLAY */}
              <div className="flex justify-between text-white opacity-80">
                <span className="font-medium">Daily Rate</span>
                <span>£{booking.dailyRate.toFixed(2)}</span>
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

          <div className="bg-white rounded-[2.5rem] p-8 border border-slate-200 shadow-xl shadow-slate-200/40">
              <div className="flex items-center gap-3 mb-4">
                 <div className="w-8 h-8 bg-blue-50 text-blue-600 rounded-lg flex items-center justify-center">
                   <MapPin className="w-4 h-4" />
                 </div>
                 <p className="text-[10px] font-black uppercase tracking-widest text-slate-900">Meeting Location</p>
              </div>
              <p className="text-xs font-bold text-slate-500 leading-relaxed">
                Terminal Car Park 1, Level 3, Row A. Look for the <span className="text-blue-600 font-black">{type}</span> representative in a high-visibility uniform.
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