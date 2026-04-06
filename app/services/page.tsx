"use client";

import { 
  Plane, 
  MapPin, 
  Clock, 
  ShieldCheck, 
  Key, 
  ArrowRight, 
  User, 
  CheckCircle2, 
  AlertCircle,
  CarFront,
  Luggage,
  Briefcase
} from "lucide-react";
import Link from "next/link";

export default function ServicesPage() {
  return (
    <main className="min-h-screen bg-[#F8FAFC] font-sans selection:bg-blue-600 selection:text-white overflow-x-hidden">
      
      {/* 1. PREMIUM NAVBAR */}
      <nav className="fixed top-0 w-full z-50 bg-white/80 backdrop-blur-2xl border-b border-slate-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2 text-blue-600 font-black tracking-tighter text-xl uppercase z-50 hover:scale-105 transition-transform group">
            <Plane className="w-6 h-6 rotate-45 group-hover:-translate-y-0.5 group-hover:translate-x-0.5 transition-transform" /> AIRPORT<span className="text-slate-900">VIP</span>
          </Link>
          <div className="flex items-center gap-6">
            <Link href="/" className="text-[10px] font-black uppercase tracking-widest text-slate-500 hover:text-blue-600 transition-colors hidden sm:block">
              Back to Search
            </Link>
            <Link href="/manage" className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-white bg-slate-900 px-6 py-3 rounded-xl hover:bg-blue-600 shadow-lg shadow-slate-900/20 transition-all duration-300 active:scale-95">
              <User className="w-4 h-4" /> Manage Booking
            </Link>
          </div>
        </div>
      </nav>

      {/* 2. PAGE HERO */}
      <section className="relative pt-40 pb-24 px-6 bg-white overflow-hidden border-b border-slate-200">
        {/* Decorative Background Elements */}
        <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-[0.03]"></div>
        <div className="absolute -top-32 -left-32 w-96 h-96 bg-blue-500/10 rounded-full blur-[100px] pointer-events-none"></div>
        <div className="absolute top-20 right-0 w-96 h-96 bg-emerald-500/5 rounded-full blur-[100px] pointer-events-none"></div>

        <div className="max-w-4xl mx-auto text-center relative z-10 animate-in fade-in slide-in-from-bottom-8 duration-700">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-blue-50 border border-blue-100 text-blue-700 font-black text-[10px] uppercase tracking-widest mb-8 shadow-sm">
            <MapPin className="w-3 h-3" /> London Luton Airport (LTN)
          </div>
          <h1 className="text-5xl md:text-7xl font-black text-slate-900 tracking-tighter mb-8 leading-[1.1]">
            Premium Meet & Greet <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-blue-400">at the Terminal.</span>
          </h1>
          <p className="text-lg md:text-xl text-slate-500 font-medium leading-relaxed max-w-2xl mx-auto">
            Skip the shuttle buses and off-site lots. Drive directly to the terminal, hand your keys to our vetted operators, and walk straight to check-in.
          </p>
        </div>
      </section>

      {/* 3. THE PROCESS DETAILS */}
      <section className="py-24 px-6 relative z-10">
        <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-16 xl:gap-24 items-start">
          
          {/* Left Side: The Steps */}
          <div className="flex flex-col gap-16">
            <div>
              <h2 className="text-3xl md:text-4xl font-black text-slate-900 tracking-tight mb-12">How your arrival works:</h2>
              
              <div className="flex flex-col gap-10 relative">
                {/* Connecting Line */}
                <div className="absolute left-[27px] top-[50px] bottom-[50px] w-0.5 border-l-2 border-dashed border-slate-200 hidden sm:block"></div>

                <div className="flex flex-col sm:flex-row gap-6 relative z-10 group">
                  <div className="w-14 h-14 shrink-0 bg-white text-blue-600 rounded-2xl flex items-center justify-center font-black text-xl shadow-lg border border-slate-100 group-hover:scale-110 group-hover:bg-blue-600 group-hover:text-white transition-all duration-300">1</div>
                  <div className="pt-2">
                    <h3 className="text-xl font-black text-slate-900 mb-3">Head to Terminal Car Park 1</h3>
                    <p className="text-slate-500 font-medium leading-relaxed text-sm md:text-base">Follow the signs for London Luton Airport. As you approach, follow the specific signs for <strong className="text-slate-900">Terminal Car Park 1</strong>. Take a ticket at the barrier (we cover the exit fee).</p>
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row gap-6 relative z-10 group">
                  <div className="w-14 h-14 shrink-0 bg-white text-blue-600 rounded-2xl flex items-center justify-center font-black text-xl shadow-lg border border-slate-100 group-hover:scale-110 group-hover:bg-blue-600 group-hover:text-white transition-all duration-300">2</div>
                  <div className="pt-2">
                    <h3 className="text-xl font-black text-slate-900 mb-3">Drive to Level 3, Row A</h3>
                    <p className="text-slate-500 font-medium leading-relaxed text-sm md:text-base">Navigate to <strong className="text-slate-900">Level 3</strong> and look for <strong className="text-slate-900">Row A</strong>. This is the designated Meet & Greet safe zone. Your vetted, uniformed operator will be waiting for you.</p>
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row gap-6 relative z-10 group">
                  <div className="w-14 h-14 shrink-0 bg-white text-blue-600 rounded-2xl flex items-center justify-center font-black text-xl shadow-lg border border-slate-100 group-hover:scale-110 group-hover:bg-blue-600 group-hover:text-white transition-all duration-300">3</div>
                  <div className="pt-2">
                    <h3 className="text-xl font-black text-slate-900 mb-3">Handover & Fly</h3>
                    <p className="text-slate-500 font-medium leading-relaxed text-sm md:text-base">We conduct a quick photographic inspection of your vehicle. Hand over your keys, and you are just a 5-minute walk from the departure gates via the link bridge.</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Who is this for? */}
            <div className="pt-10 border-t border-slate-200">
               <h3 className="text-sm font-black text-slate-400 uppercase tracking-widest mb-8">Perfectly Suited For:</h3>
               <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                 <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col items-center text-center gap-3 hover:-translate-y-1 transition-transform">
                   <div className="w-10 h-10 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center"><Luggage className="w-5 h-5" /></div>
                   <span className="font-bold text-slate-700 text-sm">Heavy & Oversized Luggage</span>
                 </div>
                 <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col items-center text-center gap-3 hover:-translate-y-1 transition-transform">
                   <div className="w-10 h-10 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center"><CarFront className="w-5 h-5" /></div>
                   <span className="font-bold text-slate-700 text-sm">Families with Young Children</span>
                 </div>
                 <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col items-center text-center gap-3 hover:-translate-y-1 transition-transform">
                   <div className="w-10 h-10 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center"><Briefcase className="w-5 h-5" /></div>
                   <span className="font-bold text-slate-700 text-sm">Efficient Business Travel</span>
                 </div>
               </div>
            </div>
          </div>

          {/* Right Side: Feature Card & FAQ */}
          <div className="flex flex-col gap-10 lg:sticky lg:top-28">
            
            {/* Security Promise Card */}
            <div className="bg-slate-900 rounded-[2.5rem] p-10 md:p-12 text-white shadow-2xl relative overflow-hidden border border-slate-800">
              <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-400 to-blue-600"></div>
              <div className="absolute -top-20 -right-20 w-64 h-64 bg-blue-500/20 rounded-full blur-[80px] pointer-events-none"></div>
              
              <h3 className="text-2xl md:text-3xl font-black mb-10 tracking-tight flex items-center gap-3 relative z-10">
                <ShieldCheck className="w-8 h-8 text-blue-400" /> Security Promise
              </h3>
              
              <ul className="flex flex-col gap-8 relative z-10">
                <li className="flex items-start gap-5">
                  <div className="w-12 h-12 bg-white/5 border border-white/10 rounded-2xl flex items-center justify-center shrink-0"><Clock className="w-5 h-5 text-blue-400" /></div>
                  <div className="pt-1">
                    <p className="font-black text-white mb-1">Zero Shuttle Buses</p>
                    <p className="text-sm font-medium text-slate-400 leading-relaxed">No waiting in the cold. Drop your car at the terminal and walk straight in.</p>
                  </div>
                </li>
                <li className="flex items-start gap-5">
                  <div className="w-12 h-12 bg-white/5 border border-white/10 rounded-2xl flex items-center justify-center shrink-0"><Key className="w-5 h-5 text-blue-400" /></div>
                  <div className="pt-1">
                    <p className="font-black text-white mb-1">Dedicated Key Safe</p>
                    <p className="text-sm font-medium text-slate-400 leading-relaxed">Your keys never leave our secure, highly-monitored facility while you are away.</p>
                  </div>
                </li>
                <li className="flex items-start gap-5">
                  <div className="w-12 h-12 bg-white/5 border border-white/10 rounded-2xl flex items-center justify-center shrink-0"><ShieldCheck className="w-5 h-5 text-emerald-400" /></div>
                  <div className="pt-1">
                    <p className="font-black text-white mb-1">Secure Compounds</p>
                    <p className="text-sm font-medium text-slate-400 leading-relaxed">Vehicles are stored in 24/7 CCTV-monitored, perimeter-fenced ParkMark facilities.</p>
                  </div>
                </li>
              </ul>

              <div className="mt-12 pt-8 border-t border-white/10 relative z-10">
                <Link href="/" className="flex items-center justify-center gap-2 w-full py-5 bg-blue-600 hover:bg-blue-500 transition-colors rounded-2xl font-black text-xs uppercase tracking-widest text-white shadow-[0_10px_20px_-10px_rgba(37,99,235,0.6)] active:scale-95">
                  Check Live Availability <ArrowRight className="w-4 h-4" />
                </Link>
              </div>
            </div>

            {/* FAQ Card */}
            <div className="bg-white rounded-[2.5rem] p-8 md:p-10 border border-slate-200 shadow-sm hover:shadow-xl transition-shadow duration-300">
              <div className="flex items-center gap-3 mb-8 pb-6 border-b border-slate-100">
                <div className="w-10 h-10 bg-slate-100 text-slate-600 rounded-xl flex items-center justify-center">
                  <AlertCircle className="w-5 h-5" />
                </div>
                <h4 className="text-xl font-black text-slate-900 tracking-tight">Quick Answers</h4>
              </div>
              
              <div className="flex flex-col gap-8">
                <div className="group cursor-default">
                  <h5 className="font-black text-slate-900 mb-2 group-hover:text-blue-600 transition-colors">What if my flight is delayed?</h5>
                  <p className="text-sm text-slate-500 leading-relaxed font-medium">We actively monitor inbound flights. Whether you land early or late, our team ensures your car is waiting for you at Terminal Car Park 1 when you arrive.</p>
                </div>
                <div className="group cursor-default">
                  <h5 className="font-black text-slate-900 mb-2 group-hover:text-blue-600 transition-colors">Do I have to pay the barrier fee?</h5>
                  <p className="text-sm text-slate-500 leading-relaxed font-medium">No. We cover the cost of the exit ticket when we move your car to our secure facility, and we cover the entry ticket when returning it to you.</p>
                </div>
              </div>
            </div>
          </div>

        </div>
      </section>

      {/* 4. FOOTER */}
      <footer className="bg-slate-950 py-16 px-6 border-t border-slate-900 mt-10">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-8">
           <Link href="/" className="flex items-center gap-2 text-white font-black text-xl uppercase tracking-tighter">
             <Plane className="w-6 h-6 text-blue-500 rotate-45" /> AIRPORT<span className="text-blue-500">VIP</span>
           </Link>
           <div className="text-slate-500 font-bold text-[10px] uppercase tracking-widest flex items-center gap-6">
             <Link href="/services" className="hover:text-white transition-colors">Services</Link>
             <Link href="/manage" className="hover:text-white transition-colors">Manage Booking</Link>
             <span>© {new Date().getFullYear()} AirportVIP</span>
           </div>
        </div>
      </footer>

    </main>
  );
}