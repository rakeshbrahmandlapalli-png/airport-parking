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
  Mail,
  Plane 
} from "lucide-react";

function CheckoutContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  
  const [isProcessing, setIsProcessing] = useState(false);
  
  // --- USER & VEHICLE STATES ---
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState(""); 
  const [phone, setPhone] = useState("");
  const [flightNumber, setFlightNumber] = useState("");
  const [registration, setRegistration] = useState(""); 
  const [carMake, setCarMake] = useState("");
  const [carColor, setCarColor] = useState("");
  const [notes, setNotes] = useState("");

  const dropDate = searchParams.get("dropoffDate");
  const pickDate = searchParams.get("pickupDate");
  const type = searchParams.get("type") || "Premium Parking"; 
  const urlPrice = Number(searchParams.get("price")) || 12; 

  const calculateTotal = () => {
    if (!dropDate || !pickDate) return { days: 7, total: urlPrice * 7, rate: urlPrice };
    const start = new Date(dropDate);
    const end = new Date(pickDate);
    start.setHours(0, 0, 0, 0);
    end.setHours(0, 0, 0, 0);
    const diffTime = end.getTime() - start.getTime();
    const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));
    const finalDays = diffDays < 0 ? 1 : diffDays + 1;
    return { days: finalDays, rate: urlPrice, total: urlPrice * finalDays };
  };

  const booking = calculateTotal();

  const handlePayment = async () => {
    if (!fullName || !email || !phone || !registration || !carMake) {
      alert("Please fill in your Name, Phone, Registration, and Car Details to continue.");
      return;
    }

    setIsProcessing(true);
    
    try {
      const shortId = "APV-" + Math.random().toString(36).substring(2, 8).toUpperCase();

      // 1. Save to Supabase
      const { error: dbError } = await supabase
        .from('bookings')
        .insert([
          { 
            booking_ref: shortId, 
            full_name: fullName, 
            email: email, // 🔥 Ensure this column exists in Supabase!
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
          }
        ]);

      // 🔥 THROW THE ERROR SO CATCH CAN READ IT
      if (dbError) throw dbError;

      // 2. TRIGGER EMAIL
      try {
        await fetch('/api/send', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            customerEmail: email,
            customerPhone: phone,
            carDetails: `${registration.toUpperCase()} - ${carColor} ${carMake}`,
            flightNumber: flightNumber.toUpperCase().trim() || "TBA",
            parkingType: type,
            bookingRef: shortId,
            notes: notes
          }),
        });
      } catch (mailErr) {
        console.error("Mail service failed:", mailErr);
      }

      // 3. Success Redirect
      router.push(`/success?ref=${shortId}`);
      
    } catch (error: any) {
      console.error("Critical Booking Failure:", error);
      // 🔥 NEW DEBUG POPUP: This will tell you EXACTLY why it failed
      alert(`❌ ERROR: ${error.message || "Unknown Error"}\n\nHint: ${error.details || "Check your Supabase column names"}`);
      setIsProcessing(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto">
      <Link href="/results" className="inline-flex items-center gap-2 text-slate-400 mb-8 font-bold text-sm hover:text-blue-600 transition-colors group">
        <ChevronLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" /> Back to results
      </Link>

      <div className="mb-12">
        <BookingStepper currentStep={2} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_400px] gap-12 items-start">
        <div className="space-y-8">
          <div className="bg-white rounded-[3rem] p-10 shadow-xl border border-slate-100">
              <h3 className="text-xl font-black mb-10 flex items-center gap-3 text-slate-900">
                <div className="w-10 h-10 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center">
                  <CreditCard className="w-5 h-5" />
                </div>
                Booking Details
              </h3>

              <div className="space-y-10">
                {/* SECTION 1: CONTACT INFO */}
                <div className="space-y-6">
                  <div className="flex items-center gap-2 mb-4">
                    <span className="w-1.5 h-1.5 bg-blue-600 rounded-full"></span>
                    <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Contact Information</h4>
                  </div>
                  
                  <div className="flex flex-col gap-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Full Name</label>
                    <input 
                      type="text" 
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      placeholder="John Doe" 
                      className="w-full p-4 bg-slate-50 border border-transparent rounded-2xl font-bold outline-none focus:ring-2 focus:ring-blue-500 transition-all text-slate-900" 
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="flex flex-col gap-2">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Email Address</label>
                      <div className="relative">
                        <input 
                          type="email" 
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          placeholder="name@email.com" 
                          className="w-full p-4 bg-slate-50 border border-transparent rounded-2xl font-bold outline-none focus:ring-2 focus:ring-blue-500 transition-all text-slate-900" 
                        />
                        <Mail className="absolute right-5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-300" />
                      </div>
                    </div>
                    <div className="flex flex-col gap-2">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Mobile Number</label>
                      <input 
                        type="tel" 
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        placeholder="07123 456789" 
                        className="w-full p-4 bg-slate-50 border border-transparent rounded-2xl font-bold outline-none focus:ring-2 focus:ring-blue-500 transition-all text-slate-900" 
                      />
                    </div>
                  </div>
                </div>

                {/* SECTION 2: VEHICLE & TRIP */}
                <div className="space-y-6 pt-6 border-t border-slate-50">
                  <div className="flex items-center gap-2 mb-4">
                    <span className="w-1.5 h-1.5 bg-blue-600 rounded-full"></span>
                    <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Vehicle & Trip Details</h4>
                  </div>

                  <div className="flex flex-col gap-2 pb-2">
                    <label className="text-[10px] font-black text-blue-600 uppercase tracking-widest ml-1">Vehicle Registration (Required)</label>
                    <input 
                      type="text" 
                      value={registration}
                      onChange={(e) => setRegistration(e.target.value.toUpperCase())}
                      placeholder="e.g. AB12 CDE" 
                      className="w-full p-4 bg-blue-50/50 border border-blue-100 rounded-2xl font-black outline-none focus:ring-2 focus:ring-blue-500 transition-all text-slate-900 uppercase text-lg" 
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="flex flex-col gap-2">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Car Make/Model</label>
                      <input 
                        type="text" 
                        value={carMake}
                        onChange={(e) => setCarMake(e.target.value)}
                        placeholder="BMW 3 Series" 
                        className="w-full p-4 bg-slate-50 border border-transparent rounded-2xl font-bold outline-none focus:ring-2 focus:ring-blue-500 transition-all text-slate-900" 
                      />
                    </div>
                    <div className="flex flex-col gap-2">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Car Color</label>
                      <input 
                        type="text" 
                        value={carColor}
                        onChange={(e) => setCarColor(e.target.value)}
                        placeholder="Black" 
                        className="w-full p-4 bg-slate-50 border border-transparent rounded-2xl font-bold outline-none focus:ring-2 focus:ring-blue-500 transition-all text-slate-900" 
                      />
                    </div>
                    <div className="flex flex-col gap-2">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Return Flight</label>
                      <div className="relative">
                        <input 
                          type="text" 
                          value={flightNumber}
                          onChange={(e) => setFlightNumber(e.target.value)}
                          placeholder="EZY123" 
                          className="w-full p-4 bg-slate-50 border border-transparent rounded-2xl font-bold outline-none focus:ring-2 focus:ring-blue-500 transition-all text-slate-900 uppercase" 
                        />
                        <Plane className="absolute right-5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-300" />
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-col gap-2 pt-4">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Additional Requirements</label>
                    <textarea 
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      placeholder="e.g. Car has a child seat, please be careful..." 
                      rows={3}
                      className="w-full p-4 bg-slate-50 border border-transparent rounded-2xl font-bold outline-none focus:ring-2 focus:ring-blue-500 text-slate-900 resize-none transition-all" 
                    />
                  </div>
                </div>
                
                {/* PAYMENT BLOCK (SIMULATED) */}
                <div className="space-y-6 pt-6 border-t border-slate-50">
                  <div className="flex items-center gap-2 mb-4">
                    <span className="w-1.5 h-1.5 bg-blue-600 rounded-full"></span>
                    <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Payment Information</h4>
                  </div>
                  <div className="flex flex-col gap-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Card Number</label>
                    <div className="relative">
                      <input type="text" placeholder="0000 0000 0000 0000" className="w-full p-4 bg-slate-50 border border-transparent rounded-2xl font-bold outline-none focus:ring-2 focus:ring-blue-500 text-slate-900" />
                      <Lock className="absolute right-5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-300" />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-6">
                    <input type="text" placeholder="MM/YY" className="w-full p-4 bg-slate-50 border border-transparent rounded-2xl font-bold outline-none focus:ring-2 focus:ring-blue-500 text-center text-slate-900" />
                    <input type="text" placeholder="CVC" className="w-full p-4 bg-slate-50 border border-transparent rounded-2xl font-bold outline-none focus:ring-2 focus:ring-blue-500 text-center text-slate-900" />
                  </div>
                </div>
              </div>
          </div>
        </div>

        <aside className="relative lg:sticky lg:top-10">
          <div className="bg-[#0b1120] rounded-[3.5rem] p-10 text-white shadow-2xl border border-white/10">
            <h2 className="text-xl font-black mb-10 border-b border-white/5 pb-4">Order Summary</h2>
            <div className="space-y-6 font-bold">
              <div className="flex justify-between items-center">
                <span className="text-slate-500 uppercase text-[10px] tracking-widest">Service</span>
                <span className="text-blue-400 uppercase text-xs text-right leading-tight">{type}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-500 uppercase text-[10px] tracking-widest">Duration</span>
                <span className="text-white text-sm">{booking.days} Days</span>
              </div>
              <div className="pt-8 border-t border-white/5">
                <div className="flex justify-between items-end pt-4">
                  <span className="text-slate-500 uppercase text-[10px] tracking-widest">Total</span>
                  <span className="text-5xl font-black text-white tracking-tighter">£{booking.total}.00</span>
                </div>
              </div>
              <button 
                onClick={handlePayment}
                disabled={isProcessing}
                className={`w-full py-6 mt-10 text-white font-black text-xl rounded-[2.2rem] shadow-xl transition-all duration-300 flex items-center justify-center gap-3 active:scale-95 ${isProcessing ? 'bg-blue-700 cursor-wait' : 'bg-blue-600 hover:bg-blue-500 shadow-blue-500/30'}`}
              >
                {isProcessing ? <Loader2 className="w-6 h-6 animate-spin" /> : <><span>Complete Booking</span><ArrowRight className="w-6 h-6" /></>}
              </button>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}

export default function CheckoutPage() {
  return (
    <main className="min-h-screen bg-slate-50 py-12 px-6 font-sans">
      <Suspense fallback={<div className="min-h-[50vh] flex flex-col items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-blue-600" /></div>}>
        <CheckoutContent />
      </Suspense>
    </main>
  );
}