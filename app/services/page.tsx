"use client";

import { Plane, MapPin, Clock, ShieldCheck, Key, ArrowRight, User, CheckCircle2, AlertCircle } from "lucide-react";
import Link from "next/link";

export default function ServicesPage() {
  return (
    <main className="min-h-screen bg-white font-sans selection:bg-blue-600 selection:text-white overflow-x-hidden">
      
      {/* 1. SIMPLE NAVBAR */}
      <nav className="fixed top-0 w-full z-50 bg-white/90 backdrop-blur-xl border-b border-slate-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2 text-blue-600 font-black tracking-tight text-xl uppercase z-50 hover:scale-105 transition-transform">
            <Plane className="w-6 h-6 rotate-45" /> AIRPORT<span className="text-slate-900">VIP</span>
          </Link>
          <div className="flex items-center gap-6">
            <Link href="/" className="text-xs font-black uppercase tracking-widest text-slate-500 hover:text-blue-600 transition-colors">
              Back to Home
            </Link>
            <Link href="/manage" className="hidden md:flex items-center gap-2 text-xs font-black uppercase tracking-widest text-white bg-slate-900 px-5 py-2.5 rounded-full hover:bg-blue-600 transition-all duration-300">
              <User className="w-4 h-4" /> Manage Booking
            </Link>
          </div>
        </div>
      </nav>

      {/* 2. PAGE HERO */}
      <section className="pt-40 pb-20 px-6 bg-slate-50 border-b border-slate-200">
        <div className="max-w-4xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-blue-100 text-blue-700 font-black text-[10px] uppercase tracking-widest mb-6">
            <MapPin className="w-3 h-3" /> London Luton Airport (LTN)
          </div>
          <h1 className="text-4xl md:text-6xl font-black text-slate-900 tracking-tight mb-6 leading-tight">
            Premium Meet & Greet <br />
            <span className="text-blue-600">at London Luton.</span>
          </h1>
          <p className="text-lg text-slate-500 font-medium leading-relaxed max-w-2xl mx-auto">
            Skip the shuttle buses and off-site lots. Drive directly to the terminal, hand your keys to our vetted operators, and walk straight to check-in.
          </p>
        </div>
      </section>

      {/* 3. THE PROCESS DETAILS */}
      <section className="py-24 px-6 bg-white">
        <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-16 items-start">
          
          {/* Left Side: The Steps */}
          <div className="flex flex-col gap-12">
            <div>
              <h2 className="text-3xl font-black text-slate-900 tracking-tight mb-8">How your arrival works:</h2>
              
              <div className="flex flex-col gap-8">
                <div className="flex gap-6">
                  <div className="w-12 h-12 shrink-0 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center font-black text-xl shadow-sm border border-blue-100">1</div>
                  <div>
                    <h3 className="text-xl font-black text-slate-900 mb-2">Head to Terminal Car Park 1</h3>
                    <p className="text-slate-500 font-medium leading-relaxed">Follow the signs for London Luton Airport. As you approach, follow the specific signs for <strong>Terminal Car Park 1</strong>. Take a ticket at the barrier (we cover the exit fee).</p>
                  </div>
                </div>

                <div className="flex gap-6">
                  <div className="w-12 h-12 shrink-0 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center font-black text-xl shadow-sm border border-blue-100">2</div>
                  <div>
                    <h3 className="text-xl font-black text-slate-900 mb-2">Drive to Level 3, Row A</h3>
                    <p className="text-slate-500 font-medium leading-relaxed">Navigate to <strong>Level 3</strong> and look for <strong>Row A</strong>. This is the designated Meet & Greet safe zone. Your vetted, uniformed operator will be waiting for you.</p>
                  </div>
                </div>

                <div className="flex gap-6">
                  <div className="w-12 h-12 shrink-0 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center font-black text-xl shadow-sm border border-blue-100">3</div>
                  <div>
                    <h3 className="text-xl font-black text-slate-900 mb-2">Handover & Fly</h3>
                    <p className="text-slate-500 font-medium leading-relaxed">We conduct a quick photographic inspection of your vehicle. Hand over your keys, and you are just a 5-minute walk from the departure gates via the link bridge.</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Added: Who is this for? */}
            <div className="pt-8 border-t border-slate-100">
               <h3 className="text-2xl font-black text-slate-900 mb-6 tracking-tight">Perfect for:</h3>
               <div className="flex flex-col gap-4">
                 <div className="flex items-center gap-3">
                   <CheckCircle2 className="w-5 h-5 text-blue-500" />
                   <span className="font-bold text-slate-700">Families with young children & strollers.</span>
                 </div>
                 <div className="flex items-center gap-3">
                   <CheckCircle2 className="w-5 h-5 text-blue-500" />
                   <span className="font-bold text-slate-700">Business travelers needing maximum efficiency.</span>
                 </div>
                 <div className="flex items-center gap-3">
                   <CheckCircle2 className="w-5 h-5 text-blue-500" />
                   <span className="font-bold text-slate-700">Anyone traveling with heavy or oversized luggage.</span>
                 </div>
               </div>
            </div>
          </div>

          {/* Right Side: Feature Card & FAQ */}
          <div className="flex flex-col gap-8">
            <div className="bg-slate-900 rounded-[2.5rem] p-10 md:p-12 text-white shadow-2xl relative overflow-hidden">
              <div className="absolute -top-20 -right-20 w-64 h-64 bg-blue-600 rounded-full blur-[80px] opacity-50"></div>
              
              <h3 className="text-2xl font-black mb-8 relative z-10">Our Security Promise</h3>
              
              <ul className="flex flex-col gap-6 relative z-10">
                <li className="flex items-center gap-4">
                  <div className="w-10 h-10 bg-white/10 rounded-full flex items-center justify-center backdrop-blur-md shrink-0"><Clock className="w-5 h-5 text-blue-400" /></div>
                  <span className="font-medium text-slate-200">Zero waiting for shuttle buses. Walk straight in.</span>
                </li>
                <li className="flex items-center gap-4">
                  <div className="w-10 h-10 bg-white/10 rounded-full flex items-center justify-center backdrop-blur-md shrink-0"><Key className="w-5 h-5 text-blue-400" /></div>
                  <span className="font-medium text-slate-200">Your keys are locked in our dedicated, secure safe.</span>
                </li>
                <li className="flex items-center gap-4">
                  {/* SAFE SECURITY COPY */}
                  <div className="w-10 h-10 bg-white/10 rounded-full flex items-center justify-center backdrop-blur-md shrink-0"><ShieldCheck className="w-5 h-5 text-blue-400" /></div>
                  <span className="font-medium text-slate-200">Cars are stored in highly secure, fully CCTV-monitored, and perimeter-fenced facilities.</span>
                </li>
              </ul>

              <div className="mt-12 pt-8 border-t border-white/10 relative z-10">
                <Link href="/" className="flex items-center justify-center gap-2 w-full py-4 bg-blue-600 hover:bg-blue-500 transition-colors rounded-full font-black text-white shadow-lg shadow-blue-500/30">
                  Book Your Space Now <ArrowRight className="w-4 h-4" />
                </Link>
              </div>
            </div>

            {/* Added: Mini FAQ */}
            <div className="bg-slate-50 rounded-[2rem] p-8 border border-slate-100">
              <div className="flex items-center gap-3 mb-6">
                <AlertCircle className="w-6 h-6 text-slate-400" />
                <h4 className="text-lg font-black text-slate-900">Frequently Asked Questions</h4>
              </div>
              <div className="flex flex-col gap-6">
                <div>
                  <h5 className="font-bold text-slate-900 mb-1">What if my flight is delayed?</h5>
                  <p className="text-sm text-slate-500 leading-relaxed">We actively monitor inbound flights. Whether you land early or late, our team ensures your car is waiting for you at Terminal Car Park 1 when you arrive.</p>
                </div>
                <div>
                  <h5 className="font-bold text-slate-900 mb-1">Do I have to pay the car park barrier fee?</h5>
                  <p className="text-sm text-slate-500 leading-relaxed">No. We cover the cost of the exit ticket when we move your car to our secure facility, and we cover the entry ticket when returning it to you.</p>
                </div>
              </div>
            </div>
          </div>

        </div>
      </section>

      {/* 4. FOOTER */}
      <footer className="bg-[#020617] py-12 px-6 border-t border-white/10 mt-10">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-8">
           <Link href="/" className="flex items-center gap-2 text-white font-black text-lg md:text-xl uppercase">
             <Plane className="w-5 h-5 text-blue-500 rotate-45" /> AIRPORT<span className="text-blue-500">VIP</span>
           </Link>
           <div className="text-slate-600 font-bold text-xs uppercase tracking-widest">
             © {new Date().getFullYear()} AirportVIP
           </div>
        </div>
      </footer>

    </main>
  );
}