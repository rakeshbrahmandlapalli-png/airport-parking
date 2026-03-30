"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { 
  CheckCircle2, 
  Printer, 
  Mail, 
  MapPin, 
  ArrowRight,
  Download,
  Loader2
} from "lucide-react";

// 1. Main Success Logic
function SuccessContent() {
  const searchParams = useSearchParams();
  
  // 🔥 Pull the exact APV reference from the URL
  const bookingId = searchParams.get("ref") || "APV-PENDING";

  return (
    <div className="relative z-10 max-w-2xl w-full">
      <div className="bg-white rounded-[4rem] p-12 shadow-2xl border border-slate-100 text-center relative overflow-hidden">
        
        {/* DECORATIVE ELEMENTS */}
        <div className="absolute -top-10 -right-10 w-40 h-40 bg-emerald-500/5 rounded-full blur-3xl"></div>
        
        <div className="w-24 h-24 bg-emerald-100 text-emerald-600 rounded-[2.5rem] flex items-center justify-center mx-auto mb-8 animate-bounce duration-1000">
          <CheckCircle2 className="w-12 h-12" strokeWidth={2.5} />
        </div>

        <h1 className="text-4xl font-black text-slate-900 mb-4 tracking-tight">Booking Confirmed!</h1>
        <p className="text-slate-500 font-bold mb-10 text-lg">Your space is secured. See you at the terminal.</p>

        {/* VOUCHER CARD */}
        <div className="bg-slate-900 rounded-[2.5rem] p-8 text-left text-white mb-10 relative group">
          <div className="flex justify-between items-start mb-8">
            <div>
              <p className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-1">Booking Reference</p>
              <p className="text-2xl font-black text-blue-400">{bookingId}</p>
            </div>
            <div className="w-12 h-12 bg-white/10 rounded-xl flex items-center justify-center border border-white/10">
              <Printer className="w-5 h-5 text-white" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-6 border-t border-white/10 pt-6">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <MapPin className="w-3 h-3 text-slate-500" />
                <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">Location</span>
              </div>
              <p className="text-sm font-bold">Terminal VIP Zone</p>
            </div>
            <div>
              <div className="flex items-center gap-2 mb-2">
                <Mail className="w-3 h-3 text-slate-500" />
                <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">Email Sent</span>
              </div>
              <p className="text-sm font-bold truncate">Check your inbox</p>
            </div>
          </div>
        </div>

        {/* ACTION BUTTONS */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <button 
            onClick={() => window.print()}
            className="py-5 bg-slate-900 text-white font-black rounded-3xl flex items-center justify-center gap-3 hover:bg-black transition-all active:scale-95"
          >
            <Download className="w-5 h-5" /> Download PDF
          </button>
          <Link 
            href="/"
            className="py-5 bg-blue-600 text-white font-black rounded-3xl flex items-center justify-center gap-3 hover:bg-blue-700 shadow-xl shadow-blue-500/30 transition-all active:scale-95"
          >
            Back to Home <ArrowRight className="w-5 h-5" />
          </Link>
        </div>
      </div>

      <p className="mt-8 text-center text-slate-400 font-bold text-sm">
        Need help? Contact our 24/7 VIP Concierge at support@airportvip.com
      </p>
    </div>
  );
}

// 2. 🔥 EXPORT WRAPPER WITH SUSPENSE
export default function SuccessPage() {
  return (
    <main className="min-h-screen bg-slate-50 flex items-center justify-center p-6 relative">
      <div className="absolute top-0 left-0 w-full h-96 bg-gradient-to-b from-blue-600/10 to-transparent"></div>
      <Suspense fallback={
        <div className="relative z-10 flex flex-col items-center justify-center text-slate-400">
          <Loader2 className="w-10 h-10 animate-spin mb-4 text-blue-600" />
          <p className="font-bold tracking-widest uppercase text-xs">Generating your voucher...</p>
        </div>
      }>
        <SuccessContent />
      </Suspense>
    </main>
  );
}