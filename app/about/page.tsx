"use client";

import {
  ArrowLeft, Plane, Sparkles, ShieldCheck, Tag, PlaneTakeoff,
  Phone, CheckCircle2, ArrowRight, Star, MapPin
} from "lucide-react";
import Link from "next/link";

export default function About() {
  const values = [
    {
      title: "Vetted operators only",
      desc: "Every compound is audited before we list it. 24/7 CCTV, perimeter fencing, DBS-checked drivers and a photo of your vehicle on handover — non-negotiable. We don't run car parks. We hold the ones we use to a single standard.",
      icon: ShieldCheck
    },
    {
      title: "Honest pricing",
      desc: "No hidden barrier fees, no surprises at drop-off. You see the full total up front, backed by our price-match guarantee — find the same service cheaper and we'll match it.",
      icon: Tag
    },
    {
      title: "We watch your flight",
      desc: "Delayed, or landed early? Our operators track live arrivals, so your car is ready when you are — never before, never late, and never an extra charge for delays outside your control.",
      icon: PlaneTakeoff
    },
    {
      title: "Real people, on call",
      desc: "You're not booking into a void. From drop-off to return we're your single point of contact. Change a flight or extend a stay with one call — to us, not a call centre you've never heard of.",
      icon: Phone
    }
  ];

  const stats = [
    { value: "4.8★", label: "Average rating" },
    { value: "312+", label: "Verified reviews" },
    { value: "2", label: "Airports — LTN & LHR" },
    { value: "100+", label: "Data points per search" }
  ];

  const aeroPoints = [
    "Reads your flight number, so it already knows your terminal.",
    "Weighs price, security, reviews and location together — not just the cheapest.",
    "Flags ULEZ, red-eye and last-minute trips before they catch you out."
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

        {/* Hero */}
        <h1 className="text-4xl md:text-5xl font-black mb-6 text-center tracking-tight">About AeroPark Direct</h1>
        <p className="text-slate-400 text-center text-lg max-w-2xl mx-auto mb-20">
          We're a UK airport parking agent with one job: take the stress out of leaving your car behind.
          Premium Meet &amp; Greet and Park &amp; Ride at Luton and Heathrow — vetted, insured, and matched
          to your trip by Aero, our AI concierge.
        </p>

        {/* Why we exist */}
        <section className="mb-20">
          <h2 className="text-2xl md:text-3xl font-black mb-6 tracking-tight">Why we exist</h2>
          <div className="space-y-5 text-slate-400 leading-relaxed">
            <p>
              Airport parking has a reputation problem. Hidden fees at the barrier. Operators no one has
              vetted. Cars handed to a stranger with no clear idea of where they'll end up. For most
              travellers it's the most stressful part of the trip — before the trip has even started.
            </p>
            <p>
              We built AeroPark Direct to fix that. We don't run the car parks; we vet them. We bring
              together the most reliable, fully insured operators at Luton and Heathrow, hold them to one
              standard, and stand between you and them as your agent from drop-off to return. If something
              needs sorting, you call us.
            </p>
          </div>
        </section>

        {/* Meet Aero */}
        <section className="bg-[#0F1523] border border-slate-800 rounded-3xl p-8 md:p-10 mb-20">
          <div className="flex items-center gap-3 mb-5">
            <div className="w-12 h-12 bg-blue-600/10 rounded-2xl flex items-center justify-center text-blue-500">
              <Sparkles className="w-6 h-6" />
            </div>
            <h2 className="text-2xl font-black tracking-tight">Meet Aero, your AI concierge</h2>
          </div>
          <p className="text-slate-400 leading-relaxed mb-6">
            Aero is the intelligence behind every booking. Tell it your trip in plain English —
            <span className="text-slate-200"> “Meet &amp; Greet at Heathrow next Friday, flight BA123” </span>
            — and it reads your flight, terminal and dates alongside more than 100 other signals to match
            you with the right operator at the right price. No endless filters. No guesswork. The best
            option for your exact journey, in seconds.
          </p>
          <ul className="space-y-3">
            {aeroPoints.map((point, i) => (
              <li key={i} className="flex items-start gap-3 text-sm text-slate-300">
                <CheckCircle2 className="w-5 h-5 text-blue-500 shrink-0 mt-0.5" />
                {point}
              </li>
            ))}
          </ul>
        </section>

        {/* What we stand for */}
        <section className="mb-20">
          <h2 className="text-2xl md:text-3xl font-black mb-10 tracking-tight text-center">What we stand for</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {values.map((value, i) => (
              <div key={i} className="bg-[#0F1523] border border-slate-800 p-8 rounded-3xl hover:border-blue-500/30 transition-all group">
                <div className="w-14 h-14 bg-blue-600/10 rounded-2xl flex items-center justify-center mb-6 text-blue-500 group-hover:scale-110 transition-transform">
                  <value.icon className="w-7 h-7" />
                </div>
                <h3 className="text-xl font-black mb-3">{value.title}</h3>
                <p className="text-slate-400 leading-relaxed text-sm">{value.desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Stats */}
        <section className="bg-[#0F1523] border border-slate-800 rounded-3xl p-8 md:p-10 mb-20">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
            {stats.map((stat, i) => (
              <div key={i}>
                <div className="text-3xl md:text-4xl font-black text-blue-500 mb-2">{stat.value}</div>
                <div className="text-[11px] uppercase tracking-widest text-slate-500 font-bold">{stat.label}</div>
              </div>
            ))}
          </div>
        </section>

        {/* CTA */}
        <section className="bg-[#0F1523] border border-blue-500/20 rounded-[2rem] p-8 md:p-12 text-center relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-600 to-emerald-500" />
          <h2 className="text-2xl md:text-3xl font-black mb-3">Ready to park smarter?</h2>
          <p className="text-slate-400 max-w-lg mx-auto mb-8">
            Compare vetted Meet &amp; Greet and Park &amp; Ride operators at Luton and Heathrow in under 60 seconds.
          </p>
          <Link
            href="/"
            className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white font-black uppercase tracking-widest text-xs px-8 py-4 rounded-xl transition-colors active:scale-95"
          >
            Find my parking <ArrowRight className="w-4 h-4" />
          </Link>
          <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2 mt-8 text-[11px] font-bold uppercase tracking-widest text-slate-500">
            <span className="flex items-center gap-1.5"><Star className="w-3.5 h-3.5 text-amber-400 fill-current" /> 4.8★ rated</span>
            <span className="flex items-center gap-1.5"><ShieldCheck className="w-3.5 h-3.5 text-emerald-400" /> Fully insured</span>
            <span className="flex items-center gap-1.5"><MapPin className="w-3.5 h-3.5 text-blue-400" /> Luton &amp; Heathrow</span>
          </div>
        </section>
      </div>

      {/* Footer */}
      <footer className="border-t border-white/5 py-10 px-6">
        <div className="max-w-4xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4 text-[11px] font-bold uppercase tracking-widest text-slate-500">
          <nav className="flex flex-wrap justify-center gap-6">
            <Link href="/privacy" className="hover:text-white transition-colors">Privacy</Link>
            <Link href="/terms" className="hover:text-white transition-colors">Terms</Link>
            <Link href="/how-it-works" className="hover:text-white transition-colors">How it works</Link>
            <Link href="mailto:info@aeroparkdirect.co.uk" className="hover:text-white transition-colors">Support</Link>
          </nav>
          <div className="text-slate-600">© {new Date().getFullYear()} AeroPark Direct Ltd</div>
        </div>
      </footer>
    </main>
  );
}
