"use client";

import { 
  Search, Star, Bot, CalendarCheck, Plane, Car, Phone, 
  ArrowLeft, ChevronRight, CheckCircle2, ShieldCheck, Zap, Info
} from "lucide-react";
import Link from "next/link";
import Image from "next/image";

export default function HowItWorks() {
  const steps = [
    {
      title: "1. Aero Magic Search",
      desc: "Don't waste time on filters. Speak or type your travel requirements (e.g., 'Meet & Greet at Heathrow next Friday, flight BA123') into our Aero Magic Search. Our AI instantly parses your flight details and parking needs.",
      icon: Search
    },
    {
      title: "2. Agent-Vetted Selection",
      desc: "As your dedicated booking agents, we only present the most reliable, secure, and highly-rated providers. We do the vetting, so you don't have to.",
      icon: Star
    },
    {
      title: "3. Aero Bot Logistics",
      desc: "Once you select your preference, our Aero Bot handles the backend coordination. We manage the booking, dispatch, and communication with the operator for a zero-stress experience.",
      icon: Bot
    },
    {
      title: "4. Travel with Confidence",
      desc: "Your booking confirmation is sent instantly. From drop-off to return, our concierge service ensures your vehicle is safe, secure, and ready for your arrival.",
      icon: CalendarCheck
    }
  ];

  return (
    <main className="min-h-screen bg-[#0A101D] text-white font-sans antialiased selection:bg-blue-600 selection:text-white">
      
      {/* Header */}
      <header className="sticky top-0 z-[100] bg-[#0A101D]/80 backdrop-blur-xl border-b border-white/5 h-20 flex items-center px-8 justify-between">
        <Link href="/" className="text-slate-400 hover:text-white transition-colors flex items-center gap-2">
          <ArrowLeft className="w-5 h-5" /> Back Home
        </Link>
        <div className="flex items-center gap-2 text-white font-black uppercase text-xl">
          <Plane className="w-6 h-6 text-blue-500 rotate-45" />AEROPARK<span className="text-blue-500">DIRECT</span>
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-6 py-16">
        <h1 className="text-4xl md:text-5xl font-black mb-6 text-center tracking-tight">How It Works</h1>
        <p className="text-slate-400 text-center text-lg max-w-2xl mx-auto mb-16">
          Airport parking simplified. We combine cutting-edge AI with expert agent vetting to ensure your vehicle is in safe hands.
        </p>

        {/* Steps Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-20">
          {steps.map((step, i) => (
            <div key={i} className="bg-[#0F1523] border border-slate-800 p-8 rounded-3xl hover:border-blue-500/30 transition-all group">
              <div className="w-14 h-14 bg-blue-600/10 rounded-2xl flex items-center justify-center mb-6 text-blue-500 group-hover:scale-110 transition-transform">
                <step.icon className="w-7 h-7" />
              </div>
              <h3 className="text-xl font-black mb-3">{step.title}</h3>
              <p className="text-slate-400 leading-relaxed text-sm">{step.desc}</p>
            </div>
          ))}
        </div>

        {/* Agent Benefits Section */}
        <div className="bg-[#0F1523] border border-blue-500/20 rounded-[2rem] p-8 md:p-12 text-center relative overflow-hidden mb-20">
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-600 to-emerald-500"></div>
          <h2 className="text-2xl font-black mb-10">Why Book with an Agent?</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div>
              <Zap className="w-8 h-8 text-blue-400 mx-auto mb-4" />
              <h4 className="font-black text-blue-400 mb-2">Concierge Support</h4>
              <p className="text-slate-400 text-xs">Need to change your flight or extend your stay? We act as your liaison with the parking operators.</p>
            </div>
            <div>
              <Bot className="w-8 h-8 text-blue-400 mx-auto mb-4" />
              <h4 className="font-black text-blue-400 mb-2">AI-Powered Efficiency</h4>
              <p className="text-slate-400 text-xs">Our Aero Magic Search eliminates manual filtering, saving you time and ensuring you get the best compound for your specific terminal.</p>
            </div>
            <div>
              <ShieldCheck className="w-8 h-8 text-blue-400 mx-auto mb-4" />
              <h4 className="font-black text-blue-400 mb-2">Verified Security</h4>
              <p className="text-slate-400 text-xs">Every operator in our network is audited. We prioritize compounds with 24/7 security and Park Mark® standards.</p>
            </div>
          </div>
        </div>

        {/* FAQ Section */}
        <div className="max-w-3xl mx-auto">
          <h2 className="text-3xl font-black text-center mb-10">Frequently Asked Questions</h2>
          <div className="space-y-4">
            {[
              { q: "What if my flight is delayed?", a: "We monitor all flights using live data. If your flight is delayed or even cancelled, we automatically adjust your booking so your driver will be there whenever you land." },
              { q: "Where do I pay the airport entry fee?", a: "For Premium Plus services, the entry fee is included. For other services, follow the signs to the Short Stay car park and pay at the machine as instructed." },
              { q: "What happens if I arrive earlier or later?", a: "We monitor your booking times. If you are significantly early or late, please call the number on your confirmation email so we can prepare your vehicle." }
            ].map((item, i) => (
              <details key={i} className="bg-[#0F1523] p-6 rounded-2xl border border-slate-800">
                <summary className="font-bold cursor-pointer text-sm">{item.q}</summary>
                <p className="text-slate-400 mt-4 text-sm leading-relaxed">{item.a}</p>
              </details>
            ))}
          </div>
        </div>
      </div>
    </main>
  );
}