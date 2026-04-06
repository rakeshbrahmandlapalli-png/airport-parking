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
  CreditCard
} from "lucide-react";

function SuccessContent() {
  const searchParams = useSearchParams();
  const bookingId = searchParams.get("ref") || "APV-PENDING";

  // --- STATE FOR DB FETCH ---
  const [booking, setBooking] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  // --- FETCH BOOKING DETAILS ---
  useEffect(() => {
    const fetchBooking = async () => {
      if (bookingId === "APV-PENDING") {
        setIsLoading(false);
        return;
      }
      
      const { data, error } = await supabase
        .from('bookings')
        .select('*')
        .eq('booking_ref', bookingId)
        .single();
        
      if (data) {
        setBooking(data);
      }
      setIsLoading(false);
    };

    fetchBooking();
  }, [bookingId]);

  // PREMIUM LOADING STATE
  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] text-slate-900">
        <div className="relative w-20 h-20 mb-8">
          <div className="absolute inset-0 border-4 border-blue-100 rounded-full"></div>
          <div className="absolute inset-0 border-4 border-blue-600 rounded-full border-t-transparent animate-spin"></div>
          <CheckCircle2 className="absolute inset-0 m-auto w-6 h-6 text-blue-600 animate-pulse" />
        </div>
        <h2 className="text-2xl font-black tracking-tight mb-2">Generating Secure Voucher...</h2>
        <p className="text-slate-500 font-medium">Retrieving your confirmed booking details.</p>
      </div>
    );
  }

  // Fallback values if DB fetch fails, otherwise use real data
  const airport = booking?.airport || "Luton (LTN)";
  const terminal = booking?.terminal || "Main Terminal";
  const totalPrice = booking?.total_price ? `£${booking.total_price.toFixed(2)}` : "Paid";
  const isHeathrow = airport.includes("Heathrow");

  return (
    <div className="relative z-10 max-w-2xl w-full">
      <div className="bg-white rounded-[3rem] p-8 md:p-12 shadow-2xl border border-slate-200 text-center relative overflow-hidden">
        
        {/* DECORATIVE BACKGROUND */}
        <div className="absolute -top-32 -right-32 w-64 h-64 bg-emerald-500/10 rounded-full blur-[80px] pointer-events-none"></div>
        <div className="absolute -bottom-32 -left-32 w-64 h-64 bg-blue-500/10 rounded-full blur-[80px] pointer-events-none"></div>
        
        <div className="relative mb-8">
          <div className="absolute inset-0 bg-emerald-500/20 rounded-full blur-xl animate-pulse mx-auto w-24 h-24"></div>
          <div className="w-24 h-24 bg-emerald-50 border-4 border-emerald-100 text-emerald-500 rounded-full flex items-center justify-center mx-auto relative z-10 shadow-lg">
            <CheckCircle2 className="w-12 h-12" strokeWidth={2.5} />
          </div>
        </div>

        <h1 className="text-4xl md:text-5xl font-black text-slate-900 mb-4 tracking-tight">Booking Confirmed.</h1>
        <p className="text-slate-500 font-medium mb-10 text-lg max-w-md mx-auto">Your premium parking space is securely reserved. We have emailed your full itinerary and receipt.</p>

        {/* DARK VOUCHER TICKET */}
        <div className="bg-slate-900 rounded-[2rem] p-8 text-left text-white mb-10 relative overflow-hidden shadow-2xl">
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-400 to-emerald-400"></div>
          
          <div className="flex justify-between items-start mb-8">
            <div>
              <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">Secure Booking Ref</p>
              <p className="text-3xl md:text-4xl font-black text-blue-400 tracking-widest font-mono drop-shadow-md">{bookingId}</p>
            </div>
            <div className="w-12 h-12 bg-white/10 rounded-2xl flex items-center justify-center border border-white/10 shadow-inner">
              <Printer className="w-5 h-5 text-white" />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 border-t border-white/10 pt-8">
            <div className="space-y-5">
              <div className="flex items-start gap-3">
                <div className="p-2 bg-blue-500/20 rounded-lg border border-blue-500/30"><MapPin className="w-4 h-4 text-blue-400" /></div>
                <div>
                  <p className="text-[9px] font-black uppercase tracking-widest text-slate-400 mb-0.5">Location</p>
                  <p className="text-sm font-bold text-white">{airport}</p>
                  <p className="text-[10px] text-blue-400 font-bold uppercase tracking-widest mt-0.5">{terminal}</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="p-2 bg-blue-500/20 rounded-lg border border-blue-500/30"><Mail className="w-4 h-4 text-blue-400" /></div>
                <div>
                  <p className="text-[9px] font-black uppercase tracking-widest text-slate-400 mb-0.5">Confirmation</p>
                  <p className="text-sm font-bold text-white">Sent to inbox</p>
                </div>
              </div>
            </div>

            <div className="space-y-5">
              <div className="flex items-start gap-3">
                <div className="p-2 bg-emerald-500/20 rounded-lg border border-emerald-500/30"><CreditCard className="w-4 h-4 text-emerald-400" /></div>
                <div>
                  <p className="text-[9px] font-black uppercase tracking-widest text-slate-400 mb-0.5">Amount Paid</p>
                  <p className="text-sm font-bold text-emerald-400">{totalPrice}</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="p-2 bg-purple-500/20 rounded-lg border border-purple-500/30"><Clock className="w-4 h-4 text-purple-400" /></div>
                <div>
                  <p className="text-[9px] font-black uppercase tracking-widest text-slate-400 mb-0.5">Flight Tracking</p>
                  <p className="text-sm font-bold text-white">Active</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* INSTRUCTIONS BLOCK */}
        <div className="bg-slate-50 rounded-[2rem] p-8 text-left border border-slate-200 mb-10">
          <h4 className="text-slate-900 font-black text-sm uppercase tracking-widest mb-6 flex items-center gap-3">
            <Phone className="w-5 h-5 text-blue-600" /> Day of Travel Instructions
          </h4>
          <ul className="space-y-6">
            <li className="flex gap-4 items-start relative">
              <div className="absolute left-[11px] top-6 bottom-[-24px] w-px bg-slate-200 z-0"></div>
              <div className="w-6 h-6 bg-slate-900 text-white rounded-full flex-shrink-0 flex items-center justify-center text-[10px] font-black relative z-10 shadow-md">1</div>
              <p className="text-slate-600 text-sm font-bold leading-relaxed pt-0.5">
                Call your chauffeur on <span className="text-blue-600 font-black">07XXX XXXXXX</span> exactly <span className="bg-slate-200 text-slate-900 px-2 py-0.5 rounded text-xs ml-1 mr-1 uppercase tracking-widest">30 minutes</span> before you reach the airport.
              </p>
            </li>
            <li className="flex gap-4 items-start">
              <div className="w-6 h-6 bg-slate-900 text-white rounded-full flex-shrink-0 flex items-center justify-center text-[10px] font-black relative z-10 shadow-md">2</div>
              <p className="text-slate-600 text-sm font-bold leading-relaxed pt-0.5">
                {isHeathrow ? (
                  <>Follow signs for the <span className="font-black text-slate-900">{terminal} Short Stay Car Park</span> and proceed to the designated Off-Airport Meet & Greet area.</>
                ) : (
                  <>Follow signs for <span className="font-black text-slate-900">"Terminal Car Park 1"</span> and proceed to the <span className="text-slate-900 underline font-black">Level 3 Drop-off zone</span>.</>
                )}
              </p>
            </li>
          </ul>
        </div>

        {/* ACTION BUTTONS */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <button 
            onClick={() => window.print()}
            className="w-full py-4 bg-white border border-slate-200 text-slate-900 font-black rounded-xl flex items-center justify-center gap-3 hover:border-slate-300 hover:bg-slate-50 transition-all active:scale-95 text-sm uppercase tracking-widest shadow-sm"
          >
            <Download className="w-4 h-4" /> Save Receipt
          </button>
          <Link 
            href="/"
            className="w-full py-4 bg-blue-600 text-white font-black rounded-xl flex items-center justify-center gap-3 hover:bg-blue-500 shadow-lg shadow-blue-500/30 transition-all active:scale-95 text-sm uppercase tracking-widest"
          >
            Return Home <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </div>

      <p className="mt-8 text-center text-slate-400 font-bold text-xs uppercase tracking-widest">
        Need assistance? <a href="#" className="text-blue-500 hover:text-blue-600 ml-1">Contact Concierge</a>
      </p>
    </div>
  );
}

// ----------------------------------------------------------------------
// MAIN PAGE LAYOUT
// ----------------------------------------------------------------------
export default function SuccessPage() {
  return (
    <main className="min-h-screen bg-[#F8FAFC] flex flex-col items-center justify-center p-6 relative font-sans selection:bg-blue-600 selection:text-white">
      {/* Subtle Background Gradient */}
      <div className="absolute top-0 left-0 w-full h-96 bg-gradient-to-b from-blue-600/5 to-transparent"></div>
      
      <Suspense fallback={
        <div className="relative z-10 flex flex-col items-center justify-center text-slate-900 min-h-screen">
          <div className="relative w-20 h-20 mb-8">
            <div className="absolute inset-0 border-4 border-blue-100 rounded-full"></div>
            <div className="absolute inset-0 border-4 border-blue-600 rounded-full border-t-transparent animate-spin"></div>
            <CheckCircle2 className="absolute inset-0 m-auto w-6 h-6 text-blue-600 animate-pulse" />
          </div>
          <p className="font-black tracking-widest uppercase text-sm">Finalizing Reservation...</p>
        </div>
      }>
        <SuccessContent />
      </Suspense>
    </main>
  );
}