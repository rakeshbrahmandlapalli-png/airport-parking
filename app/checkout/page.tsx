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
  BookmarkCheck
} from "lucide-react";

// 1. Main Checkout Logic
function CheckoutContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  
  const [isProcessing, setIsProcessing] = useState(false);
  const [saveCard, setSaveCard] = useState(false);
  
  // 🔥 State to store the user's name
  const [fullName, setFullName] = useState("");
  
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

    return {
      days: finalDays,
      rate: urlPrice,
      total: urlPrice * finalDays
    };
  };

  const booking = calculateTotal();

  // 🔥 Live Database Function (Now with Short ID Generator)
  const handlePayment = async () => {
    // Prevent checkout if they haven't typed a name
    if (!fullName) {
      alert("Please enter your Full Name to secure your booking.");
      return;
    }

    setIsProcessing(true);
    
    try {
      // 1. Generate a professional short ID (e.g. APV-X7B92M)
      const shortId = "APV-" + Math.random().toString(36).substring(2, 8).toUpperCase();

      // 2. Send the data AND the new short ID to your Supabase 'bookings' table
      const { data, error } = await supabase
        .from('bookings')
        .insert([
          { 
            booking_ref: shortId, // <-- Saving it to the vault!
            full_name: fullName, 
            service_type: type,
            dropoff_date: dropDate,
            pickup_date: pickDate,
            total_price: booking.total
          }
        ])
        .select(); 

      if (error) throw error;

      // 3. Push them to the success page with their SHORT ID!
      router.push(`/success?ref=${shortId}`);
      
    } catch (error) {
      console.error("Booking failed:", error);
      alert("Something went wrong securing your spot. Please try again.");
      setIsProcessing(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto">
      <Link href="/results" className="inline-flex items-center gap-2 text-slate-400 mb-8 font-bold text-sm hover:text-blue-600 transition-colors group">
        <ChevronLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" /> Back to results
      </Link>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_400px] gap-12 items-start">
        
        {/* LEFT: PAYMENT FORM */}
        <div className="space-y-8">
          <div className="bg-white rounded-[3rem] p-10 shadow-xl border border-slate-100">
              <h3 className="text-xl font-black mb-10 flex items-center gap-3 text-slate-900">
                <div className="w-10 h-10 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center">
                  <CreditCard className="w-5 h-5" />
                </div>
                Payment Details
              </h3>

              <div className="space-y-6">
                <div className="flex flex-col gap-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Full Name</label>
                  
                  {/* Added value and onChange to track the typing */}
                  <input 
                    type="text" 
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="Cardholder Name" 
                    className="w-full p-4 bg-slate-50 border border-transparent rounded-2xl font-bold outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all text-slate-900" 
                  />
                </div>
                
                <div className="flex flex-col gap-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Card Number</label>
                  <div className="relative">
                    <input type="text" placeholder="0000 0000 0000 0000" className="w-full p-4 bg-slate-50 border border-transparent rounded-2xl font-bold outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all text-slate-900" />
                    <Lock className="absolute right-5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-300" />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-6 pb-4">
                  <input type="text" placeholder="MM/YY" className="w-full p-4 bg-slate-50 border border-transparent rounded-2xl font-bold outline-none focus:ring-2 focus:ring-blue-500 text-center text-slate-900" />
                  <input type="text" placeholder="CVC" className="w-full p-4 bg-slate-50 border border-transparent rounded-2xl font-bold outline-none focus:ring-2 focus:ring-blue-500 text-center text-slate-900" />
                </div>

                <div 
                  onClick={() => setSaveCard(!saveCard)}
                  className={`flex items-center gap-4 p-5 rounded-3xl border-2 cursor-pointer transition-all duration-300 ${saveCard ? 'border-blue-500 bg-blue-50/50' : 'border-slate-50 bg-slate-50/30 hover:border-slate-200'}`}
                >
                  <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all ${saveCard ? 'bg-blue-600 border-blue-600' : 'border-slate-300 bg-white'}`}>
                      {saveCard && <BookmarkCheck className="w-3.5 h-3.5 text-white" />}
                  </div>
                  <div className="flex flex-col">
                      <span className="text-sm font-black text-slate-900 tracking-tight">Save card for future trips</span>
                      <span className="text-[11px] font-bold text-slate-400 uppercase tracking-tight">Faster checkout next time</span>
                  </div>
                </div>
              </div>
          </div>

          <div className="flex items-center justify-center gap-8 opacity-20 grayscale">
            <ShieldCheck className="w-10 h-10 text-slate-900" />
            <div className="text-2xl font-black italic text-slate-900">VISA</div>
            <div className="text-2xl font-black italic text-slate-900">Mastercard</div>
          </div>
        </div>

        {/* RIGHT: ORDER SUMMARY */}
        <aside className="relative group lg:sticky lg:top-10">
          <div className="absolute -inset-1 bg-gradient-to-b from-blue-600 to-indigo-600 rounded-[3.5rem] blur-2xl opacity-20 group-hover:opacity-30 transition-opacity duration-700"></div>
          <div className="relative bg-[#0b1120] rounded-[3.5rem] p-10 text-white shadow-2xl border border-white/10 overflow-hidden">
            <div className="absolute top-0 right-0 -mt-20 -mr-20 w-48 h-48 bg-blue-500/20 rounded-full blur-3xl"></div>
            
            <h2 className="text-xl font-black mb-10 border-b border-white/5 pb-4">Order Summary</h2>
            
            <div className="space-y-6 font-bold relative z-10">
              <div className="flex justify-between items-center">
                <span className="text-slate-500 uppercase text-[10px] tracking-widest">Service Level</span>
                <span className="text-blue-400 uppercase text-xs text-right max-w-[150px] leading-tight">{type}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-500 uppercase text-[10px] tracking-widest">Duration</span>
                <span className="text-white text-sm">{booking.days} {booking.days === 1 ? 'Day' : 'Days'}</span>
              </div>

              <div className="pt-8 border-t border-white/5">
                <div className="flex justify-between text-slate-400 text-sm mb-2">
                  <span>Rate (£{booking.rate}/day)</span>
                  <span>£{booking.total}.00</span>
                </div>
                <div className="flex justify-between items-end pt-4">
                  <span className="text-slate-500 uppercase text-[10px] tracking-widest">Total Price</span>
                  <span className="text-5xl font-black text-white tracking-tighter">£{booking.total}.00</span>
                </div>
              </div>

              <button 
                onClick={handlePayment}
                disabled={isProcessing}
                className={`
                  w-full py-6 mt-10 text-white font-black text-xl rounded-[2.2rem] shadow-xl 
                  transition-all duration-300 flex items-center justify-center gap-3 active:scale-95
                  ${isProcessing ? 'bg-blue-700 cursor-wait opacity-80' : 'bg-blue-600 hover:bg-blue-500 shadow-blue-500/30'}
                `}
              >
                {isProcessing ? (
                  <Loader2 className="w-6 h-6 animate-spin" />
                ) : (
                  <>
                    <span>Pay Securely</span> 
                    <ArrowRight className="w-6 h-6 group-hover:translate-x-1 transition-transform" />
                  </>
                )}
              </button>
              
              <div className="flex items-center justify-center gap-2 mt-6 opacity-40">
                <Lock className="w-3 h-3" />
                <span className="text-[8px] uppercase tracking-[0.4em]">256-bit Secure Session</span>
              </div>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}

// 2. 🔥 EXPORT A WRAPPER COMPONENT WITH SUSPENSE
export default function CheckoutPage() {
  return (
    <main className="min-h-screen bg-slate-50 py-12 px-6 font-sans">
      <Suspense fallback={
        <div className="min-h-[50vh] flex flex-col items-center justify-center text-slate-400">
          <Loader2 className="w-8 h-8 animate-spin mb-4 text-blue-600" />
          <p className="font-bold tracking-widest uppercase text-xs">Loading Secure Checkout...</p>
        </div>
      }>
        <CheckoutContent />
      </Suspense>
    </main>
  );
}
// Force Redeploy 1.0