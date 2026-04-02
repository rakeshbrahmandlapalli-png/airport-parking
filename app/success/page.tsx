"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { supabase } from "../lib/supabase"; // Make sure this path matches your project
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

  // If loading the database info, show a spinner
  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center text-slate-400 min-h-[400px]">
        <Loader2 className="w-12 h-12 animate-spin mb-4 text-blue-600" />
        <p className="font-bold tracking-widest uppercase text-xs">Retrieving secure voucher...</p>
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
      <div className="bg-white rounded-[4rem] p-12 shadow-2xl border border-slate-100 text-center relative overflow-hidden">
        
        {/* DECORATIVE ELEMENTS */}
        <div className="absolute -top-10 -right-10 w-40 h-40 bg-emerald-500/5 rounded-full blur-3xl"></div>
        
        <div className="w-24 h-24 bg-emerald-100 text-emerald-600 rounded-[2.5rem] flex items-center justify-center mx-auto mb-8 animate-bounce duration-1000">
          <CheckCircle2 className="w-12 h-12" strokeWidth={2.5} />
        </div>

        <h1 className="text-4xl font-black text-slate-900 mb-4 tracking-tight">Booking Confirmed!</h1>
        <p className="text-slate-500 font-bold mb-10 text-lg">Your space is secured. Check your email for your full voucher.</p>

        {/* VOUCHER CARD */}
        <div className="bg-slate-900 rounded-[2.5rem] p-8 text-left text-white mb-8 relative group border border-white/5">
          <div className="flex justify-between items-start mb-8">
            <div>
              <p className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-1">Booking Reference</p>
              <p className="text-3xl font-black text-blue-400 tracking-tighter">{bookingId}</p>
            </div>
            <div className="w-12 h-12 bg-white/10 rounded-xl flex items-center justify-center border border-white/10">
              <Printer className="w-5 h-5 text-white" />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 border-t border-white/10 pt-8">
            <div className="space-y-4">
              <div className="flex items-start gap-3">
                <div className="mt-1 p-1.5 bg-blue-500/20 rounded-lg"><MapPin className="w-3.5 h-3.5 text-blue-400" /></div>
                <div>
                  <p className="text-[9px] font-black uppercase tracking-widest text-slate-500">Location</p>
                  <p className="text-sm font-bold">{airport}</p>
                  <p className="text-[10px] text-blue-400 font-bold">{terminal}</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="mt-1 p-1.5 bg-blue-500/20 rounded-lg"><Mail className="w-3.5 h-3.5 text-blue-400" /></div>
                <div>
                  <p className="text-[9px] font-black uppercase tracking-widest text-slate-500">Confirmation</p>
                  <p className="text-sm font-bold">Sent to your inbox</p>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <div className="flex items-start gap-3">
                <div className="mt-1 p-1.5 bg-emerald-500/20 rounded-lg"><CreditCard className="w-3.5 h-3.5 text-emerald-400" /></div>
                <div>
                  <p className="text-[9px] font-black uppercase tracking-widest text-slate-500">Amount Paid</p>
                  <p className="text-sm font-bold text-emerald-400">{totalPrice}</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="mt-1 p-1.5 bg-purple-500/20 rounded-lg"><Clock className="w-3.5 h-3.5 text-purple-400" /></div>
                <div>
                  <p className="text-[9px] font-black uppercase tracking-widest text-slate-500">Flight Tracking</p>
                  <p className="text-sm font-bold">Active for Arrival</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* DYNAMIC OPERATOR INSTRUCTIONS BLOCK */}
        <div className="bg-blue-50/50 rounded-[2rem] p-8 text-left border border-blue-100 mb-10">
          <h4 className="text-blue-900 font-black text-sm uppercase tracking-widest mb-4 flex items-center gap-2">
            <Phone className="w-4 h-4" /> Next Steps
          </h4>
          <ul className="space-y-4">
            <li className="flex gap-4 items-start">
              <div className="w-6 h-6 bg-blue-600 text-white rounded-full flex-shrink-0 flex items-center justify-center text-[10px] font-black">1</div>
              <p className="text-slate-600 text-sm font-bold">
                Call the <span className="text-blue-700 font-black">operator</span> on <span className="text-blue-600 font-black text-base">07XXX XXXXXX</span> exactly <span className="bg-blue-600 text-white px-2 py-0.5 rounded ml-1 mr-1">30 minutes</span> before you reach the airport.
              </p>
            </li>
            <li className="flex gap-4 items-start">
              <div className="w-6 h-6 bg-blue-600 text-white rounded-full flex-shrink-0 flex items-center justify-center text-[10px] font-black">2</div>
              <p className="text-slate-600 text-sm font-bold">
                {isHeathrow ? (
                  <>Follow signs for the <span className="font-black text-slate-900">{terminal} Short Stay Car Park</span> and proceed to the designated Meet & Greet area.</>
                ) : (
                  <>Follow signs for <span className="font-black text-slate-900">"Terminal Car Park 1"</span> and proceed to the <span className="text-blue-600 underline font-black">Level 3 Off-Airport Meet & Greet area</span>.</>
                )}
              </p>
            </li>
          </ul>
        </div>

        {/* ACTION BUTTONS */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <button 
            onClick={() => window.print()}
            className="py-5 bg-slate-900 text-white font-black rounded-3xl flex items-center justify-center gap-3 hover:bg-black transition-all active:scale-95"
          >
            <Download className="w-5 h-5" /> Print Voucher
          </button>
          <Link 
            href="/"
            className="py-5 bg-blue-600 text-white font-black rounded-3xl flex items-center justify-center gap-3 hover:bg-blue-700 shadow-xl shadow-blue-500/30 transition-all active:scale-95"
          >
            Finish <ArrowRight className="w-5 h-5" />
          </Link>
        </div>
      </div>

      <p className="mt-8 text-center text-slate-400 font-bold text-sm">
        Need help? Contact our 24/7 VIP Concierge at support@airportvip.com
      </p>
    </div>
  );
}

export default function SuccessPage() {
  return (
    <main className="min-h-screen bg-slate-50 flex items-center justify-center p-6 relative">
      <div className="absolute top-0 left-0 w-full h-96 bg-gradient-to-b from-blue-600/10 to-transparent"></div>
      <Suspense fallback={
        <div className="relative z-10 flex flex-col items-center justify-center text-slate-400 min-h-screen">
          <Loader2 className="w-10 h-10 animate-spin mb-4 text-blue-600" />
          <p className="font-bold tracking-widest uppercase text-xs">Securing your voucher...</p>
        </div>
      }>
        <SuccessContent />
      </Suspense>
    </main>
  );
}