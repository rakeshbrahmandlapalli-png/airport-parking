"use client";

import { supabase } from "../lib/supabase";
import { useState, Suspense } from "react"; 
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import { 
  ShieldCheck, 
  Lock, 
  CreditCard, 
  ArrowRight, 
  ChevronLeft, 
  Loader2,
  BookmarkCheck,
  Mail
} from "lucide-react";

function CheckoutContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  
  const [isProcessing, setIsProcessing] = useState(false);
  const [saveCard, setSaveCard] = useState(false);
  
  // States for user details
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState(""); // 🔥 New: track email for the receipt

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
    if (!fullName || !email) {
      alert("Please enter your Full Name and Email to secure your booking.");
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
            service_type: type,
            dropoff_date: dropDate,
            pickup_date: pickDate,
            total_price: booking.total
          }
        ]);

      if (dbError) throw dbError;

      // 2. 🔥 TRIGGER EMAIL (Calls your /api/send route)
      try {
        await fetch('/api/send', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            customerEmail: email,
            flightNumber: "Not Provided", // You can add a flight field later
            parkingType: type
          }),
        });
      } catch (mailErr) {
        console.error("Mail service failed, but booking was saved:", mailErr);
      }

      // 3. Success Redirect
      router.push(`/success?ref=${shortId}`);
      
    } catch (error) {
      console.error("Booking failed:", error);
      alert("Something went wrong. Please try again.");
      setIsProcessing(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto">
      <Link href="/results" className="inline-flex items-center gap-2 text-slate-400 mb-8 font-bold text-sm hover:text-blue-600 transition-colors group">
        <ChevronLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" /> Back to results
      </Link>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_400px] gap-12 items-start">
        <div className="space-y-8">
          <div className="bg-white rounded-[3rem] p-10 shadow-xl border border-slate-100">
              <h3 className="text-xl font-black mb-10 flex items-center gap-3 text-slate-900">
                <div className="w-10 h-10 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center">
                  <CreditCard className="w-5 h-5" />
                </div>
                Checkout Details
              </h3>

              <div className="space-y-6">
                {/* NAME INPUT */}
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

                {/* EMAIL INPUT 🔥 */}
                <div className="flex flex-col gap-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Email for Receipt</label>
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
                
                {/* CARD NUMBER */}
                <div className="flex flex-col gap-2 pt-4">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Card Number</label>
                  <div className="relative">
                    <input type="text" placeholder="0000 0000 0000 0000" className="w-full p-4 bg-slate-50 border border-transparent rounded-2xl font-bold outline-none focus:ring-2 focus:ring-blue-500 text-slate-900" />
                    <Lock className="absolute right-5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-300" />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-6 pb-4">
                  <input type="text" placeholder="MM/YY" className="w-full p-4 bg-slate-50 border border-transparent rounded-2xl font-bold outline-none focus:ring-2 focus:ring-blue-500 text-center text-slate-900" />
                  <input type="text" placeholder="CVC" className="w-full p-4 bg-slate-50 border border-transparent rounded-2xl font-bold outline-none focus:ring-2 focus:ring-blue-500 text-center text-slate-900" />
                </div>
              </div>
          </div>
        </div>

        {/* ORDER SUMMARY (RIGHT) */}
        <aside className="relative group lg:sticky lg:top-10">
          <div className="absolute -inset-1 bg-gradient-to-b from-blue-600 to-indigo-600 rounded-[3.5rem] blur-2xl opacity-20 group-hover:opacity-30 transition-opacity duration-700"></div>
          <div className="relative bg-[#0b1120] rounded-[3.5rem] p-10 text-white shadow-2xl border border-white/10 overflow-hidden">
            <h2 className="text-xl font-black mb-10 border-b border-white/5 pb-4">Order Summary</h2>
            
            <div className="space-y-6 font-bold relative z-10">
              <div className="flex justify-between items-center">
                <span className="text-slate-500 uppercase text-[10px] tracking-widest">Service</span>
                <span className="text-blue-400 uppercase text-xs text-right max-w-[150px] leading-tight">{type}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-500 uppercase text-[10px] tracking-widest">Days</span>
                <span className="text-white text-sm">{booking.days}</span>
              </div>

              <div className="pt-8 border-t border-white/5">
                <div className="flex justify-between items-end pt-4">
                  <span className="text-slate-500 uppercase text-[10px] tracking-widest">Total Price</span>
                  <span className="text-5xl font-black text-white tracking-tighter">£{booking.total}.00</span>
                </div>
              </div>

              <button 
                onClick={handlePayment}
                disabled={isProcessing}
                className={`w-full py-6 mt-10 text-white font-black text-xl rounded-[2.2rem] shadow-xl transition-all duration-300 flex items-center justify-center gap-3 active:scale-95 ${isProcessing ? 'bg-blue-700 cursor-wait' : 'bg-blue-600 hover:bg-blue-500 shadow-blue-500/30'}`}
              >
                {isProcessing ? <Loader2 className="w-6 h-6 animate-spin" /> : <><span>Pay Securely</span><ArrowRight className="w-6 h-6" /></>}
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