"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { supabase } from "../lib/supabase"; 
import { 
  CheckCircle2, 
  Printer, 
  Mail, 
  MapPin, 
  ArrowRight,
  Download,
  Loader2,
  Phone,
  Clock,
  CreditCard,
  AlertCircle
} from "lucide-react";

function SuccessContent() {
  const searchParams = useSearchParams();
  const sessionId = searchParams.get("session_id");

  const [booking, setBooking] = useState<any>(null);
  const [status, setStatus] = useState<"verifying" | "success" | "error">("verifying");
  const [errorMsg, setErrorMsg] = useState("");

  useEffect(() => {
    const finalizePayment = async () => {
      if (!sessionId) {
        setStatus("error");
        setErrorMsg("No session ID found. Please check your email or contact support.");
        return;
      }

      try {
        // 1. Verify the session with our internal API
        const verifyRes = await fetch(`/api/verify-session?session_id=${sessionId}`);
        const data = await verifyRes.json();

        if (!verifyRes.ok || data.status !== "success") {
          throw new Error(data.error || "Payment verification failed.");
        }

        const m = data.metadata; 

        // 2. CHECK: Has this session already been saved? (Prevents duplicates)
        const { data: existing } = await supabase
          .from('bookings')
          .select('*')
          .eq('stripe_session_id', sessionId)
          .maybeSingle();

        if (existing) {
          setBooking(existing);
          setStatus("success");
          return;
        }

        // 3. GENERATE REF & SAVE TO SUPABASE (Backup if Webhook is slow)
        const shortId = "APD-" + Math.random().toString(36).substring(2, 8).toUpperCase();
        
        // Match these fields exactly to your schema.prisma
        const { data: newBooking, error: dbError } = await supabase
          .from('bookings')
          .insert([{ 
            booking_ref: shortId, 
            stripe_session_id: sessionId,
            full_name: m.fullName || "Valued Customer", 
            email: data.customerEmail || m.email?.trim().toLowerCase(),
            phone_number: data.customerPhone || m.phone || "N/A",
            license_plate: m.registration || m.licensePlate, 
            car_make: m.carMake || "N/A",
            car_color: m.carColor || "N/A",
            service_type: m.type || "Premium Meet & Greet",
            dropoff_date: m.dropDate,
            dropoff_time: m.dropTime, 
            pickup_date: m.pickDate,
            pickup_time: m.pickTime,  
            total_price: data.amount, 
            flight_number: m.flightNumber || "TBC",
            airport: m.airport || "Luton (LTN)",
            terminal: m.terminal || "Main Terminal",
            status: "confirmed"
          }])
          .select()
          .single();

        if (dbError) {
          console.error("Supabase Insert Error:", dbError);
          // If insert fails because the webhook already did it during this function run
          const { data: retry } = await supabase.from('bookings').select('*').eq('stripe_session_id', sessionId).single();
          if (retry) {
            setBooking(retry);
            setStatus("success");
            return;
          }
          throw dbError;
        }

        // 4. TRIGGER EMAIL (Calling your existing send endpoint)
        try {
          await fetch('/api/send', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              booking: newBooking,
              isAmendment: false
            }),
          });
        } catch (e) {
          console.error("Email failed to trigger from Success Page", e);
        }

        setBooking(newBooking);
        setStatus("success");

      } catch (err: any) {
        console.error("Finalization error:", err);
        setErrorMsg("Your payment was successful, but we had trouble updating your dashboard. Please check your email for the voucher.");
        setStatus("error");
      }
    };

    finalizePayment();
  }, [sessionId]);

  if (status === "verifying") {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] text-slate-900 px-4">
        <div className="relative w-16 h-16 mb-8">
          <div className="absolute inset-0 border-4 border-blue-100 rounded-full"></div>
          <div className="absolute inset-0 border-4 border-blue-600 rounded-full border-t-transparent animate-spin"></div>
          <CreditCard className="absolute inset-0 m-auto w-6 h-6 text-blue-600 animate-pulse" />
        </div>
        <h2 className="text-2xl font-black tracking-tight mb-2">Finalizing Reservation...</h2>
        <p className="text-slate-500 font-medium text-center">Aero is securing your space and generating your voucher.</p>
      </div>
    );
  }

  if (status === "error") {
    return (
      <div className="bg-white rounded-[2rem] p-12 shadow-2xl border border-red-100 text-center max-w-lg mx-auto">
        <div className="w-20 h-20 bg-red-50 text-red-500 rounded-full flex items-center justify-center mx-auto mb-6">
           <AlertCircle className="w-10 h-10" />
        </div>
        <h2 className="text-2xl font-black text-slate-900 mb-2">Verification Pending</h2>
        <p className="text-slate-500 font-medium mb-8 leading-relaxed">{errorMsg}</p>
        <Link href="/manage" className="w-full py-4 bg-slate-900 text-white rounded-xl font-black uppercase tracking-widest text-xs inline-block">Check My Booking</Link>
      </div>
    );
  }

  // --- SUCCESS UI ---
  const bookingId = booking?.booking_ref || "APD-PROCESSING";
  const airport = booking?.airport || "Luton (LTN)";
  const terminal = booking?.terminal || "Main Terminal";
  const totalPrice = booking?.total_price ? `£${Number(booking.total_price).toFixed(2)}` : "Paid";
  const isHeathrow = airport.includes("Heathrow");

  return (
    <div className="relative z-10 max-w-2xl w-full animate-in fade-in zoom-in-95 duration-700">
      <div className="bg-white rounded-[2.5rem] md:rounded-[3rem] p-6 sm:p-8 md:p-12 shadow-2xl border border-slate-200 text-center relative overflow-hidden">
        
        <div className="absolute -top-32 -right-32 w-64 h-64 bg-emerald-500/10 rounded-full blur-[80px] pointer-events-none"></div>
        
        <div className="relative mb-8">
          <div className="w-20 h-20 md:w-24 md:h-24 bg-emerald-50 border-4 border-emerald-100 text-emerald-500 rounded-full flex items-center justify-center mx-auto shadow-lg">
            <CheckCircle2 className="w-10 h-10 md:w-12 md:h-12" strokeWidth={2.5} />
          </div>
        </div>

        <h1 className="text-3xl sm:text-4xl md:text-5xl font-black text-slate-900 mb-4 tracking-tight">Booking Confirmed.</h1>
        <p className="text-slate-500 font-medium mb-10 text-sm sm:text-base md:text-lg max-w-md mx-auto">Your premium parking space is reserved. Your itinerary and receipt have been sent to your inbox.</p>

        {/* DARK VOUCHER TICKET */}
        <div className="bg-slate-900 rounded-[2rem] p-6 md:p-8 text-left text-white mb-10 relative overflow-hidden shadow-2xl">
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-400 to-emerald-400"></div>
          
          <div className="flex justify-between items-start mb-8">
            <div>
              <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">Booking Reference</p>
              <p className="text-3xl md:text-4xl font-black text-blue-400 tracking-widest font-mono">{bookingId}</p>
            </div>
            <div className="w-12 h-12 bg-white/10 rounded-2xl flex items-center justify-center border border-white/10">
              <Printer className="w-5 h-5 text-white" />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 border-t border-white/10 pt-8">
            <div className="space-y-5">
              <div className="flex items-start gap-3">
                <MapPin className="w-4 h-4 text-blue-400 shrink-0 mt-1" />
                <div>
                  <p className="text-[9px] font-black uppercase tracking-widest text-slate-400">Airport</p>
                  <p className="text-sm font-bold text-white">{airport}</p>
                  <p className="text-[10px] text-blue-400 font-bold uppercase tracking-widest">{terminal}</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <Mail className="w-4 h-4 text-blue-400 shrink-0 mt-1" />
                <div>
                  <p className="text-[9px] font-black uppercase tracking-widest text-slate-400">Voucher</p>
                  <p className="text-sm font-bold text-white">Sent to email</p>
                </div>
              </div>
            </div>

            <div className="space-y-5">
              <div className="flex items-start gap-3">
                <CreditCard className="w-4 h-4 text-emerald-400 shrink-0 mt-1" />
                <div>
                  <p className="text-[9px] font-black uppercase tracking-widest text-slate-400">Total Price</p>
                  <p className="text-sm font-bold text-emerald-400">{totalPrice}</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <Clock className="w-4 h-4 text-purple-400 shrink-0 mt-1" />
                <div>
                  <p className="text-[9px] font-black uppercase tracking-widest text-slate-400">Chauffeur Status</p>
                  <p className="text-sm font-bold text-white">Assigned</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* INSTRUCTIONS */}
        <div className="bg-slate-50 rounded-[2rem] p-6 md:p-8 text-left border border-slate-200 mb-10">
          <h4 className="text-slate-900 font-black text-sm uppercase tracking-widest mb-6 flex items-center gap-3">
            <Phone className="w-5 h-5 text-blue-600" /> Essential Arrival Info
          </h4>
          <ul className="space-y-6">
            <li className="flex gap-4 items-start relative">
              <div className="absolute left-[11px] top-6 bottom-[-24px] w-px bg-slate-200"></div>
              <div className="w-6 h-6 bg-slate-900 text-white rounded-full flex-shrink-0 flex items-center justify-center text-[10px] font-black relative z-10">1</div>
              <p className="text-slate-600 text-sm font-bold leading-relaxed pt-0.5">
                Call the chauffeur on <span className="text-blue-600 font-black">07XXX XXXXXX</span> exactly <span className="bg-blue-100 text-blue-700 px-2 py-0.5 rounded font-black">20-30 MINS</span> before you reach the airport terminal.
              </p>
            </li>
            <li className="flex gap-4 items-start">
              <div className="w-6 h-6 bg-slate-900 text-white rounded-full flex-shrink-0 flex items-center justify-center text-[10px] font-black relative z-10">2</div>
              <p className="text-slate-600 text-sm font-bold leading-relaxed pt-0.5">
                {isHeathrow ? (
                  <>Head directly to the <span className="font-black text-slate-900">{terminal} Short Stay Car Park</span> and follow signs for "Off-Airport Meet & Greet".</>
                ) : (
                  <>Follow signs for <span className="font-black text-slate-900">"Terminal Car Park 1"</span> and proceed to the designated Meet & Greet area on <span className="font-black text-slate-900">Level 3</span>.</>
                )}
              </p>
            </li>
          </ul>
        </div>

        {/* BUTTONS */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <button 
            onClick={() => window.print()}
            className="w-full py-4 bg-white border border-slate-200 text-slate-900 font-black rounded-2xl flex items-center justify-center gap-3 hover:bg-slate-50 transition-all text-xs uppercase tracking-widest shadow-sm"
          >
            <Download className="w-4 h-4" /> Save Receipt
          </button>
          <Link 
            href="/"
            className="w-full py-4 bg-blue-600 text-white font-black rounded-2xl flex items-center justify-center gap-3 hover:bg-blue-500 shadow-lg shadow-blue-500/30 transition-all text-xs uppercase tracking-widest"
          >
            Finish <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </div>

      <p className="mt-8 text-center text-slate-400 font-bold text-[10px] uppercase tracking-widest">
        Need assistance? <Link href="/contact" className="text-blue-500 hover:underline ml-1">Contact Concierge</Link>
      </p>
    </div>
  );
}

export default function SuccessPage() {
  return (
    <main className="min-h-screen bg-[#F8FAFC] flex flex-col items-center justify-center p-4 sm:p-6 relative font-sans antialiased overflow-hidden">
      <div className="absolute top-0 left-0 w-full h-96 bg-gradient-to-b from-blue-600/5 to-transparent"></div>
      <Suspense fallback={
        <div className="flex flex-col items-center justify-center min-h-screen">
          <Loader2 className="w-10 h-10 text-blue-600 animate-spin mb-4" />
          <p className="font-black uppercase text-xs tracking-widest text-slate-400">Loading Reservation...</p>
        </div>
      }>
        <SuccessContent />
      </Suspense>
    </main>
  );
}