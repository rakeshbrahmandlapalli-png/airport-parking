"use client";
import { useRouter } from "next/navigation";
import { useState, useEffect, useMemo } from "react";
import AeroFeature from "@/components/AeroFeature";
import { supabase } from "./lib/supabase";
import { getLaunchTimerConfig } from "./actions";
import {
  User, Calendar, PlaneTakeoff, ShieldCheck, Star, CreditCard,
  Menu, X, ChevronRight, Info, ChevronDown, Search, Car,
  Mic, Sparkles, Loader2, ArrowRight, Plane, HelpCircle,
  Timer, CheckCircle2, BadgeCheck, PhoneCall, AlertCircle, TrendingUp
} from "lucide-react";
import Link from "next/link";
import Image from "next/image";
import MapModal from "@/components/MapModal";
import PriceMatchModal from "@/components/PriceMatchModal";

const addDays = (date: Date, days: number) => { const d = new Date(date); d.setDate(d.getDate() + days); return d.toISOString().split("T")[0]; };
const toDateStr = (d: Date) => d.toISOString().split("T")[0];
const daysBetween = (a: string, b: string) => { if (!a || !b) return 0; return Math.max(0, Math.ceil((new Date(b).getTime() - new Date(a).getTime()) / 86400000)); };

const QUICK_TIMES = ["05:00", "06:00", "08:00", "10:00", "12:00", "14:00", "16:00", "18:00", "20:00"];

function QuickTimes({ value, onChange, currentHour }: { value: string; onChange: (t: string) => void; currentHour: number }) {
  const nearest = QUICK_TIMES.reduce((prev, curr) => Math.abs(parseInt(curr) - currentHour) < Math.abs(parseInt(prev) - currentHour) ? curr : prev);
  return (
    <div className="flex flex-wrap gap-1.5 mt-2">
      {QUICK_TIMES.map(t => (
        <button key={t} type="button" onClick={() => onChange(t)}
          className={`px-2.5 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all touch-manipulation ${value === t ? "bg-blue-600 text-white" : t === nearest ? "bg-white/20 text-white border border-white/40" : "bg-white/10 text-slate-300 hover:bg-white/20"}`}>
          {t}{t === nearest && value !== t ? " ★" : ""}
        </button>
      ))}
    </div>
  );
}

// Reveals text character-by-character for a subtle "AI is thinking" effect.
function Typewriter({ text, speed = 22 }: { text: string; speed?: number }) {
  const [shown, setShown] = useState("");
  useEffect(() => {
    setShown("");
    if (!text) return;
    let i = 0;
    const id = setInterval(() => {
      i += 1;
      setShown(text.slice(0, i));
      if (i >= text.length) clearInterval(id);
    }, speed);
    return () => clearInterval(id);
  }, [text, speed]);
  return <>{shown}</>;
}

const TRUST = [
  { Icon: BadgeCheck,   label: "Fully Insured"       },
  { Icon: CheckCircle2, label: "Free Cancellation"   },
  { Icon: ShieldCheck,  label: "Secure CCTV Parking"  },
  { Icon: PhoneCall,    label: "24/7 Support"        },
];

// Optional preset lets keyword landing pages (e.g. /luton-airport-parking)
// reuse this exact page with an ad-matched headline + pre-selected airport.
// All fields are optional — the bare "/" route renders with the defaults.
export type HomePreset = {
  airportDefault?: string;  // "Luton (LTN)" | "Heathrow (LHR)"
  h1Top?: string;           // first headline line
  h1Highlight?: string;     // blue highlighted line
  intro?: string;           // lead paragraph
  // Unique long-form content for keyword landing pages. Without this, pages
  // are near-duplicates of "/" and Google treats them as thin doorway pages.
  seoBlock?: {
    eyebrow?: string;        // small uppercase label above the heading
    heading: string;
    highlight?: string;      // blue-accented tail of the heading
    paragraphs: string[];    // first paragraph renders as a bold lead
    highlights?: { stat: string; label: string }[];  // optional 3-up stat row
  };
  // Page-specific FAQs. Overrides the default set so the FAQPage schema is
  // unique per landing page (a ranking signal for long-tail terms).
  faqs?: { q: string; a: string }[];
};

export default function HomePage({ preset }: { preset?: HomePreset } = {}) {
  const router = useRouter();
  // Founding-member offer text comes from Admin → Settings → Launch Timer
  // (timer_benefit_value), e.g. "20% Off+5% Lifetime Discount". Split on "+"
  // into highlighted segments. Null until loaded so we never flash a stale %.
  const [foundingOffer, setFoundingOffer] = useState<string | null>(null);
  const [now,              setNow]              = useState<Date | null>(null);
  const [isMenuOpen,       setIsMenuOpen]       = useState(false);
  const [isMapOpen,        setIsMapOpen]        = useState(false);
  const [isPriceMatchOpen, setIsPriceMatchOpen] = useState(false);
  const [isLoaded,         setIsLoaded]         = useState(false);
  const [airport,     setAirport]     = useState(preset?.airportDefault ?? "Luton (LTN)");
  const [dropoffDate, setDropoffDate] = useState("");
  const [dropoffTime, setDropoffTime] = useState("09:00");
  const [pickupDate,  setPickupDate]  = useState("");
  const [pickupTime,  setPickupTime]  = useState("18:00");
  const [magicText,       setMagicText]       = useState("");
  const [magicHint,       setMagicHint]       = useState("");
  const [isListening,     setIsListening]     = useState(false);
  const [isThinking,      setIsThinking]      = useState(false);
  const [fastTrackStatus, setFastTrackStatus] = useState("");
  const [magicError,      setMagicError]      = useState("");
  const [magicParsed,     setMagicParsed]     = useState<{ data: any; p: any } | null>(null);
  const [formError,       setFormError]       = useState("");
  const [openFaq, setOpenFaq] = useState<number | null>(null);
  const [showSuccessToast, setShowSuccessToast] = useState(false);

  useEffect(() => {
    const today = new Date();
    setNow(today);
    setDropoffDate(addDays(today, 1));
    setPickupDate(addDays(today, 8));
    setIsLoaded(true);
    getLaunchTimerConfig().then((c) => setFoundingOffer(c.benefitValue)).catch(() => {});

    const timer = setInterval(() => setNow(new Date()), 60000);
    return () => { clearInterval(timer); };
  }, []);

  const todayStr    = now ? toDateStr(now) : "";
  const currentHour = now ? now.getHours() : 9;
  const tripDays    = useMemo(() => daysBetween(dropoffDate, pickupDate), [dropoffDate, pickupDate]);
  const isFormReady = !!(dropoffDate && pickupDate);

  const handleDropoffDateChange = (val: string) => {
    setDropoffDate(val);
    setFormError("");
    if (!val) return;
    const dropD = new Date(val);
    const pickD = pickupDate ? new Date(pickupDate) : null;
    if (val === todayStr) { setPickupDate(addDays(dropD, 7)); }
    else if (!pickD || isNaN(pickD.getTime()) || dropD >= pickD) { setPickupDate(addDays(dropD, 1)); }
  };

  const handleMagicChange = (val: string) => {
    setMagicText(val);
    if (magicError) setMagicError("");
    if (magicParsed) setMagicParsed(null);
    const v = val.toLowerCase();
    if (!val) setMagicHint("");
    else if (v.includes("luton") || v.includes("ltn")) setMagicHint("Luton Airport detected");
    else if (v.includes("heathrow") || v.includes("lhr")) setMagicHint("Heathrow Airport detected");
    else if (v.includes("meet")) setMagicHint("Meet & Greet detected");
    else if (v.includes("park")) setMagicHint("Park & Ride detected");
    else if (val.match(/[A-Z]{2}\d{3,4}/i)) setMagicHint("Flight number detected");
    else setMagicHint("");
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault(); 
    setFormError("");
    if (!dropoffDate || !pickupDate) { setFormError("Please select your drop-off and pick-up dates."); return; }
    const dropStart = new Date(`${dropoffDate}T${dropoffTime}`);
    const pickEnd   = new Date(`${pickupDate}T${pickupTime}`);
    const nowDate   = new Date();
    if (isNaN(dropStart.getTime())) { setFormError("Invalid drop-off date."); return; }
    if (isNaN(pickEnd.getTime()))   { setFormError("Invalid pick-up date.");  return; }
    if (dropStart < nowDate)        { setFormError("Drop-off cannot be in the past."); return; }
    if (pickEnd <= dropStart)       { setFormError("Pick-up must be after drop-off."); return; }
    
    // 🟢 NEW: Show success toast on search
    setShowSuccessToast(true);
    setTimeout(() => setShowSuccessToast(false), 2000);
    
    router.push(`/select-service?${new URLSearchParams({ airport, dropoffDate, dropoffTime, pickupDate, pickupTime }).toString()}`);
  };

  const startListening = (e: React.MouseEvent) => {
    e.preventDefault();
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SR) { alert("Voice search not supported. Please type instead."); return; }
    try {
      const r = new SR(); r.continuous = false; r.lang = "en-GB";
      r.onstart  = () => setIsListening(true);
      r.onresult = (ev: any) => { setMagicText(ev.results[0][0].transcript); setIsListening(false); };
      r.onerror  = (ev: any) => { setIsListening(false); if (ev.error === "not-allowed") alert("Microphone blocked."); };
      r.onend    = () => setIsListening(false);
      r.start();
    } catch { setIsListening(false); }
  };

  const handleMagicSubmit = async () => {
    if (!magicText.trim()) return;
    setIsThinking(true); setMagicError(""); setMagicParsed(null); setFastTrackStatus("Aero is parsing your request...");
    try {
      const res = await fetch("/api/aero-magic", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ prompt: magicText, currentDate: new Date().toISOString() }) });
      const data = await res.json();
      if (!res.ok) {
        setMagicError(data?.error || "Aero is busy right now — please use the manual form below.");
        setIsThinking(false); return;
      }
      if (data.airport && data.dropoffDate) {
        const p: any = { airport: data.airport, dropoffDate: data.dropoffDate, dropoffTime: data.dropoffTime, pickupDate: data.pickupDate, pickupTime: data.pickupTime, terminal: data.terminal || "", travelGroupType: data.travelGroupType, hasOversizedLuggage: String(data.hasOversizedLuggage || false), isRedEye: String(data.isRedEye || false), isLastMinute: String(data.isLastMinute || false), isBudgetFocused: String(data.isBudgetFocused || false), isFrequentFlyer: String(data.isFrequentFlyer || false), ulezRisk: String(data.ulezRisk || false), hasPet: String(data.hasPet || false), isWinter: String(data.isWinter || false), requiresCoveredParking: String(data.requiresCoveredParking || false), aeroTip: data.aeroTip || "", upsells: data.suggestedAncillaries?.join(",") || "", isCorporate: String(data.travelGroupType === "corporate") };
        if (data.servicePreference) p.type = data.servicePreference;
        if (data.flightNumber) p.flightNumber = data.flightNumber.toUpperCase();

        // Analytics — a successful parse is a qualified lead signal.
        try { (window as any).gtag?.("event", "generate_lead", { source: "aero_magic", currency: "GBP", value: 0 }); } catch { /* best-effort */ }

        // Low confidence → ask one clarifying question instead of guessing.
        if (typeof data.confidence === "number" && data.confidence < 0.55) {
          setMagicError(data.aeroTip || "I need a little more detail — which airport, and your drop-off and pick-up dates?");
          setIsThinking(false); return;
        }

        // Show a confirmation card so the user can verify before we proceed.
        setMagicParsed({ data, p });
        setIsThinking(false);
      } else {
        setMagicError("I couldn't quite get that. Try e.g. “Meet & Greet at Heathrow next Friday for a week”.");
        setIsThinking(false);
      }
    } catch { setMagicError("Aero is resting. Please use the manual form below."); setIsThinking(false); }
  };

  const proceedFromMagic = async () => {
    if (!magicParsed) return;
    const { data, p } = magicParsed;
    setIsThinking(true);
    try {
      if (data.isReadyToBook && data.servicePreference) {
        setFastTrackStatus("Fast-Track Activated. Finding best operator...");
        const isH = data.airport.includes("Heathrow");
        const { data: cos } = await supabase.from("companies").select("*");
        if (cos) {
          const avail = cos.filter((c: any) => { const cat = c.category?.toLowerCase().replace(/ & /g, "-").replace(/\s+/g, "-").trim(); return cat === data.servicePreference && (isH ? c.operates_at_heathrow : c.operates_at_luton) && c.is_active && !(isH ? c.lhr_sold_out : c.ltn_sold_out); }).sort((a: any, b: any) => { const af = isH ? a.lhr_featured : a.ltn_featured; const bf = isH ? b.lhr_featured : b.ltn_featured; if (af && !bf) return -1; if (!af && bf) return 1; return Number(isH ? a.heathrow_price : a.luton_price || 0) - Number(isH ? b.heathrow_price : b.luton_price || 0); });
          if (avail.length > 0) { const best = avail[0]; setFastTrackStatus(`Secured ${best.name}. Teleporting to Checkout...`); router.push(`/checkout?${new URLSearchParams({ ...p, type: best.name, companyId: best.id }).toString()}`); return; }
        }
      }
      setFastTrackStatus("Loading available operators...");
      router.push(`/results?${new URLSearchParams(p).toString()}`);
    } catch { setMagicError("Something went wrong loading operators. Please try the manual form."); setIsThinking(false); }
  };

  const MAGIC_EXAMPLES = [
    "Meet & Greet at Heathrow next Friday for a week",
    "Cheap Luton parking, 2 weeks in August",
    "BA123 from T5, back Sunday night",
  ];

  const faqs = preset?.faqs ?? [
    { q: "How much does Meet & Greet parking cost at Luton Airport?",  a: "Our Luton Meet & Greet parking starts from around £44 for short stays, depending on your dates and chosen operator. Use the search form above for an exact price — it takes under 10 seconds." },
    { q: "What is Meet & Greet airport parking?",                       a: "Meet & Greet is a premium service where a professional driver meets you at the terminal drop-off zone, parks your car securely while you fly, and returns it on your arrival. No shuttle buses, no long walks — drive straight to departures." },
    { q: "Is airport parking at Heathrow available through AeroPark?", a: "Yes — we offer Meet & Greet and Park & Ride at Heathrow across all terminals (T2, T3, T4, T5). Search your dates above to compare available operators and prices." },
    { q: "What happens if my return flight is delayed?",                a: "All our operators monitor live flight arrivals. If you land late, your car is ready when you arrive — you'll never pay extra for delays outside your control." },
    { q: "Is my vehicle safe? What security do operators have?",        a: "Every partner compound is audited by us before listing. All sites have 24/7 CCTV, perimeter fencing, and fully insured coverage. Photos are taken of your vehicle on handover." },
    { q: "Can I cancel or modify my airport parking booking?",          a: "Yes — free cancellation is available up to 24 hours before your drop-off time. To modify dates or times, use the Manage Booking page." },
  ];

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify({ "@context": "https://schema.org", "@graph": [{ "@type": "LocalBusiness", "name": "AeroPark Direct", "description": "Premium airport parking at Luton and Heathrow. Meet & Greet and Park & Ride.", "url": "https://www.aeroparkdirect.co.uk", "priceRange": "££", "areaServed": ["Luton Airport LTN", "Heathrow Airport LHR"] }, { "@type": "FAQPage", "mainEntity": faqs.map(f => ({ "@type": "Question", "name": f.q, "acceptedAnswer": { "@type": "Answer", "text": f.a } })) }] }) }} />

      <main suppressHydrationWarning className="light-ui min-h-[100dvh] bg-white font-sans antialiased selection:bg-blue-600 selection:text-white overflow-x-hidden">

        {/* 🟢 SUCCESS TOAST */}
        {showSuccessToast && (
          <div className="fixed top-6 right-6 z-[200] bg-emerald-500 text-white px-6 py-3 rounded-xl font-black text-sm flex items-center gap-2 animate-in slide-in-from-top-2 fade-in">
            <CheckCircle2 className="w-5 h-5" /> Search submitted! Finding operators...
          </div>
        )}

        <nav aria-label="Main navigation" className={`sticky top-0 w-full z-[100] bg-white/80 backdrop-blur-xl border-b border-slate-200 transition-all duration-1000 ${isLoaded ? "translate-y-0 opacity-100" : "-translate-y-full opacity-0"}`}>
          <div className="max-w-7xl mx-auto px-4 md:px-6 h-20 md:h-24 flex items-center justify-between overflow-hidden md:overflow-visible">
            <Link href="/" aria-label="AeroPark Direct - Airport Parking Home" className="flex items-center z-50 overflow-visible touch-manipulation [-webkit-tap-highlight-color:transparent]">
              <Image src="/logo.png" alt="AeroPark Direct - Airport Parking Luton Heathrow" width={400} height={120} priority className="h-12 md:h-20 w-auto object-contain scale-[1.8] md:scale-[1.35] origin-left mix-blend-multiply -translate-x-4 md:translate-x-0 ml-6 md:ml-0" />
            </Link>
            <div className="hidden md:flex items-center gap-8">
              <div className="relative group">
                <button className="text-[11px] font-black uppercase tracking-[0.15em] text-slate-500 group-hover:text-slate-900 transition-colors flex items-center gap-1.5 py-2 touch-manipulation">Parking <ChevronRight className="w-3 h-3 rotate-90 transition-transform duration-200 group-hover:rotate-[270deg]" aria-hidden="true" /></button>
                <div className="absolute left-0 top-full pt-3 opacity-0 invisible translate-y-1 group-hover:opacity-100 group-hover:visible group-hover:translate-y-0 transition-all duration-200">
                  <div className="bg-white border border-slate-200 rounded-2xl shadow-xl shadow-slate-300/40 p-6 w-[460px] grid grid-cols-2 gap-x-10">
                    <div>
                      <p className="text-[10px] font-black uppercase tracking-[0.2em] text-blue-600 mb-3">Heathrow (LHR)</p>
                      <div className="flex flex-col gap-2">
                        <Link href="/heathrow-meet-and-greet" className="text-[13px] font-bold text-slate-600 hover:text-blue-600 transition-colors">Meet &amp; Greet</Link>
                        <Link href="/heathrow-park-and-ride" className="text-[13px] font-bold text-slate-600 hover:text-blue-600 transition-colors">Park &amp; Ride</Link>
                        <Link href="/heathrow-terminal-5-parking" className="text-[13px] font-bold text-slate-600 hover:text-blue-600 transition-colors">Terminal 5</Link>
                        <Link href="/heathrow-terminal-4-parking" className="text-[13px] font-bold text-slate-600 hover:text-blue-600 transition-colors">Terminal 4</Link>
                        <Link href="/heathrow-terminal-3-parking" className="text-[13px] font-bold text-slate-600 hover:text-blue-600 transition-colors">Terminal 3</Link>
                        <Link href="/heathrow-terminal-2-parking" className="text-[13px] font-bold text-slate-600 hover:text-blue-600 transition-colors">Terminal 2</Link>
                      </div>
                    </div>
                    <div>
                      <p className="text-[10px] font-black uppercase tracking-[0.2em] text-blue-600 mb-3">Luton (LTN)</p>
                      <div className="flex flex-col gap-2">
                        <Link href="/luton-meet-and-greet" className="text-[13px] font-bold text-slate-600 hover:text-blue-600 transition-colors">Meet &amp; Greet</Link>
                        <Link href="/luton-park-and-ride" className="text-[13px] font-bold text-slate-600 hover:text-blue-600 transition-colors">Park &amp; Ride</Link>
                        <Link href="/luton-airport-parking" className="text-[13px] font-bold text-slate-600 hover:text-blue-600 transition-colors">All Luton Parking</Link>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              <a href="#services" className="text-[11px] font-black uppercase tracking-[0.15em] text-slate-500 hover:text-slate-900 transition-colors relative group">Services<span className="absolute -bottom-2 left-0 w-0 h-[2px] bg-blue-600 transition-all duration-300 group-hover:w-full" /></a>
              <Link href="/how-it-works" className="text-[11px] font-black uppercase tracking-[0.15em] text-slate-500 hover:text-slate-900 transition-colors relative group">How it works<span className="absolute -bottom-2 left-0 w-0 h-[2px] bg-blue-600 transition-all duration-300 group-hover:w-full" /></Link>
              <Link href="/about" className="text-[11px] font-black uppercase tracking-[0.15em] text-slate-500 hover:text-slate-900 transition-colors relative group">About<span className="absolute -bottom-2 left-0 w-0 h-[2px] bg-blue-600 transition-all duration-300 group-hover:w-full" /></Link>
              <div className="h-6 w-px bg-slate-200 ml-2" />
              <Link href="/manage" className="flex items-center gap-2 text-[11px] font-black uppercase tracking-[0.15em] text-white bg-slate-900 px-6 py-3 rounded-full hover:bg-blue-600 transition-all active:scale-95 ml-2 touch-manipulation"><User className="w-4 h-4" /> Manage Booking</Link>
            </div>
            <button onClick={() => setIsMenuOpen(true)} aria-label="Open navigation menu" className="md:hidden p-2.5 text-slate-900 bg-slate-100 rounded-xl active:scale-90 transition-transform relative z-50 touch-manipulation [-webkit-tap-highlight-color:transparent]"><Menu className="w-6 h-6" /></button>
          </div>
        </nav>

        <div role="dialog" aria-modal="true" aria-label="Mobile navigation" className={`md:hidden fixed inset-0 z-[9999] bg-white transition-all duration-500 ease-in-out flex flex-col ${isMenuOpen ? "opacity-100 translate-x-0 visible" : "opacity-0 translate-x-full invisible pointer-events-none"}`}>
          <div className="h-20 px-6 flex items-center justify-between border-b border-slate-100 shrink-0">
            <Link href="/" onClick={() => setIsMenuOpen(false)} className="flex items-center touch-manipulation [-webkit-tap-highlight-color:transparent]"><Image src="/logo.png" alt="AeroPark Direct" width={250} height={80} className="h-12 w-auto object-contain scale-[1.8] origin-left mix-blend-multiply -translate-x-4 ml-6" /></Link>
            <button onClick={() => setIsMenuOpen(false)} aria-label="Close menu" className="p-3 text-slate-900 bg-slate-100 rounded-full touch-manipulation [-webkit-tap-highlight-color:transparent]"><X className="w-6 h-6" /></button>
          </div>
          <div className="flex flex-col px-8 py-12 gap-2 flex-grow overflow-y-auto">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-4">Parking</p>
            <div className="grid grid-cols-2 gap-x-4 gap-y-3 mb-10">
              {[
                { label: "Heathrow Meet & Greet", href: "/heathrow-meet-and-greet" },
                { label: "Heathrow Park & Ride",  href: "/heathrow-park-and-ride" },
                { label: "Heathrow Terminals",    href: "/heathrow-airport-parking" },
                { label: "Luton Meet & Greet",    href: "/luton-meet-and-greet" },
                { label: "Luton Park & Ride",     href: "/luton-park-and-ride" },
                { label: "All Luton Parking",     href: "/luton-airport-parking" },
              ].map((l) => (
                <Link key={l.href} href={l.href} onClick={() => setIsMenuOpen(false)} className="text-sm font-bold text-slate-700 hover:text-blue-600 transition-colors touch-manipulation [-webkit-tap-highlight-color:transparent]">{l.label}</Link>
              ))}
            </div>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-4">Main Menu</p>
            <a href="#services" onClick={() => setIsMenuOpen(false)} className="flex items-center justify-between py-6 text-2xl font-black text-slate-900 border-b border-slate-50 touch-manipulation [-webkit-tap-highlight-color:transparent]">Services <ChevronRight className="w-6 h-6 text-blue-500" /></a>
            <Link href="/how-it-works" onClick={() => setIsMenuOpen(false)} className="flex items-center justify-between py-6 text-2xl font-black text-slate-900 border-b border-slate-50 touch-manipulation [-webkit-tap-highlight-color:transparent]">How it works <ChevronRight className="w-6 h-6 text-blue-500" /></Link>
            <Link href="/about" onClick={() => setIsMenuOpen(false)} className="flex items-center justify-between py-6 text-2xl font-black text-slate-900 border-b border-slate-50 touch-manipulation [-webkit-tap-highlight-color:transparent]">About <ChevronRight className="w-6 h-6 text-blue-500" /></Link>
            <Link href="/manage" onClick={() => setIsMenuOpen(false)} className="flex items-center justify-between py-6 text-2xl font-black text-slate-900 touch-manipulation [-webkit-tap-highlight-color:transparent]">Manage Trip <ChevronRight className="w-6 h-6 text-blue-500" /></Link>
          </div>
          <div className="p-8 pb-10 border-t border-slate-100 shrink-0"><Link href="/manage" onClick={() => setIsMenuOpen(false)} className="w-full py-4 bg-blue-600 text-white font-black rounded-2xl text-lg flex items-center justify-center shadow-xl shadow-blue-200 active:scale-95 transition-transform touch-manipulation [-webkit-tap-highlight-color:transparent]">Sign In to Booking</Link></div>
        </div>

        <section aria-label="Airport parking search" className="relative min-h-[100dvh] w-full flex items-center justify-center overflow-hidden bg-[#060A14] pt-24 pb-12 md:py-20">
          <div className="absolute inset-0 z-0 overflow-hidden">
            <div className={`absolute inset-0 transition-all duration-[3000ms] ease-out origin-center ${isLoaded ? "scale-105 opacity-100" : "scale-150 opacity-0"}`}>
              <Image
                src="https://images.unsplash.com/photo-1436491865332-7a61a109cc05?q=80&w=1920&auto=format&fit=crop"
                alt="Airport terminal at dusk"
                fill
                priority
                fetchPriority="high"
                sizes="100vw"
                quality={70}
                className="object-cover object-center"
              />
            </div>
            <div className={`absolute inset-0 bg-gradient-to-b md:bg-gradient-to-r from-[#060A14] via-[#060A14]/92 md:via-[#060A14]/82 to-[#060A14]/40 transition-opacity duration-[2500ms] ${isLoaded ? "opacity-100" : "opacity-0"}`} />
          </div>
          <div className="relative z-10 w-full max-w-7xl mx-auto px-4 sm:px-6 md:px-12 grid grid-cols-1 lg:grid-cols-12 gap-8 md:gap-12 items-center mt-6 md:mt-0">
            <div className={`lg:col-span-7 flex flex-col items-center text-center lg:items-start lg:text-left justify-center transition-all duration-1000 delay-300 ${isLoaded ? "translate-y-0 opacity-100" : "translate-y-10 opacity-0"}`}>
              <div className="inline-flex items-center gap-2.5 pl-1.5 pr-4 py-1.5 rounded-full bg-[#0F1523] border border-blue-500/30 mb-6 md:mb-8">
                <span className="w-6 h-6 md:w-7 md:h-7 bg-blue-600 rounded-full flex items-center justify-center shrink-0"><Timer className="w-3.5 h-3.5 text-white" aria-hidden="true" /></span>
                <span className="text-white text-[9px] md:text-[11px] font-black uppercase tracking-widest">Founding Member:{" "}{(foundingOffer ?? "").split("+").map((s) => s.trim()).filter(Boolean).map((seg, i) => (<span key={i}>{i > 0 ? <span className="text-white"> + </span> : null}<span className="text-emerald-400">{seg}</span></span>))}</span>
              </div>
              <h1 className="text-4xl sm:text-5xl md:text-7xl font-bold text-white mb-4 md:mb-6 leading-[1.1] tracking-tight">{preset?.h1Top ?? "Airport Parking"} <br className="hidden sm:block" /><span className="text-blue-500">{preset?.h1Highlight ?? "Made Simple."}</span></h1>
              <p className="text-base sm:text-lg md:text-xl text-white leading-relaxed font-semibold opacity-90 max-w-xl mb-3">{preset?.intro ? preset.intro : <>Licenced <strong>Meet &amp; Greet</strong> and <strong>Park &amp; Ride</strong> at <strong>Luton</strong> and <strong>Heathrow</strong> airports. Drive to the terminal, hand over your keys, and fly.</>}</p>
              <p className="text-sm sm:text-base md:text-lg text-gray-300 leading-relaxed font-light hidden sm:block max-w-xl mb-6">Compare fully insured, vetted parking operators at Luton and Heathrow, and book in under 60 seconds.</p>
              <div className="flex flex-wrap items-center justify-center lg:justify-start gap-x-4 gap-y-2 mb-6">
                {TRUST.map(({ Icon, label }) => (<span key={label} className="flex items-center gap-1.5 text-emerald-400 text-[10px] md:text-xs font-black uppercase tracking-widest"><Icon className="w-3.5 h-3.5" aria-hidden="true" /> {label}</span>))}
              </div>
              <div className="flex items-center justify-center lg:justify-start gap-4 pt-4 md:pt-5 border-t border-white/10 w-3/4 lg:w-full mb-5">
                <p className="text-blue-400 font-bold tracking-widest uppercase text-[10px] md:text-xs">Reliable • Secure • Simple</p>
              </div>
              <a href="#booking-form" className="lg:hidden inline-flex items-center gap-2 px-6 py-3 bg-blue-600 text-white font-black rounded-full text-xs uppercase tracking-widest hover:bg-blue-500 transition-all active:scale-95 touch-manipulation"><Search className="w-4 h-4" aria-hidden="true" /> Search Parking Now</a>
            </div>

            <div id="booking-form" className={`lg:col-span-5 flex justify-center lg:justify-end transition-all duration-1000 delay-700 w-full ${isLoaded ? "translate-y-0 opacity-100" : "translate-y-12 opacity-0"}`}>
              <div className="w-full max-w-[480px] bg-[#0B1120] border border-slate-800 rounded-2xl p-5 sm:p-6 md:p-7 shadow-2xl shadow-black/50 relative overflow-hidden flex flex-col">
                <div className="absolute top-0 inset-x-0 h-px bg-blue-500/50 pointer-events-none" aria-hidden="true" />
                <div className="relative z-10 w-full">
                  <div className="mb-5 md:mb-6">
                    <div className="flex items-center justify-between mb-3">
                      <label htmlFor="magic-input" className="flex items-center gap-2">
                        <span className="w-6 h-6 bg-blue-600 rounded-md flex items-center justify-center gap-[3px] shrink-0" aria-hidden="true">
                          <span className="w-[2px] h-2.5 bg-white rounded-full" /><span className="w-[2px] h-2.5 bg-white rounded-full" />
                        </span>
                        <span className="text-[10px] md:text-[11px] font-black uppercase tracking-[0.18em] text-white">Aero Magic Search</span>
                      </label>
                      <span className="flex items-center gap-1.5 text-[8px] font-black uppercase tracking-widest text-emerald-400">
                        <span className="relative flex h-1.5 w-1.5"><span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" /><span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-500" /></span>
                        Online
                      </span>
                    </div>
                    <div className="relative flex items-center bg-[#070B14] border border-slate-700 focus-within:border-blue-500 focus-within:ring-1 focus-within:ring-blue-500/50 rounded-xl p-1.5 transition-colors">
                      <input id="magic-input" type="text" value={magicText} onChange={e => handleMagicChange(e.target.value)} onKeyDown={e => e.key === "Enter" && handleMagicSubmit()} placeholder={isListening ? "Listening... speak now" : "e.g. Meet & Greet Heathrow next Friday, BA123..."} autoComplete="off" spellCheck="false" aria-label="Describe your parking needs" disabled={isThinking || isListening} className="flex-1 w-full min-w-0 bg-transparent text-white text-sm md:text-base px-3.5 py-3 outline-none placeholder:text-slate-500 font-medium touch-manipulation disabled:opacity-50" style={{ background: "transparent", color: "white" }} />
                      <div className="flex items-center gap-1 shrink-0">
                        <button type="button" onClick={startListening} aria-label="Voice search" disabled={isThinking} className={`p-2.5 rounded-lg transition-colors touch-manipulation disabled:opacity-50 flex items-center justify-center ${isListening ? "bg-red-500/20 text-red-400 animate-pulse" : "bg-[#0F1523] hover:bg-slate-800 text-slate-400 hover:text-white"}`}><Mic className="w-5 h-5" /></button>
                        <button type="button" onClick={handleMagicSubmit} disabled={isThinking || !magicText.trim()} aria-label="Submit AI search" className="px-3.5 py-2.5 bg-blue-600 hover:bg-blue-500 disabled:bg-slate-700 disabled:text-slate-400 text-white rounded-lg font-black transition-colors flex items-center justify-center touch-manipulation">{isThinking ? <Loader2 className="w-5 h-5 animate-spin" /> : <ArrowRight className="w-5 h-5" />}</button>
                      </div>
                    </div>
                    <p className="text-[8px] md:text-[9px] text-slate-400 uppercase tracking-widest mt-2.5 h-4 flex items-center gap-1.5" aria-live="polite">{isThinking ? <><Loader2 className="w-3 h-3 animate-spin text-blue-400" /> {fastTrackStatus}</> : magicHint || "Powered by Aero Intelligence"}</p>

                    {/* Example prompt chips — only before any input/result */}
                    {!magicText && !isThinking && !magicParsed && !magicError && (
                      <div className="flex flex-wrap justify-center gap-1.5 mt-3">
                        {MAGIC_EXAMPLES.map((ex) => (
                          <button key={ex} type="button" onClick={() => { setMagicText(ex); handleMagicChange(ex); }}
                            className="bg-[#0F1523] hover:bg-slate-800 border border-slate-700 text-slate-300 hover:text-white text-[10px] font-semibold px-3 py-1.5 rounded-lg transition-colors active:scale-95">
                            {ex}
                          </button>
                        ))}
                      </div>
                    )}

                    {/* Inline error / clarification (replaces the old browser alert) */}
                    {magicError && !magicParsed && (
                      <div className="mt-3 flex items-start gap-2 bg-amber-500/10 border border-amber-400/30 rounded-xl px-3 py-2.5 text-left animate-in fade-in">
                        <AlertCircle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                        <p className="text-amber-100/90 text-xs font-medium leading-snug">{magicError}</p>
                      </div>
                    )}

                    {/* Confirmation card — verify what Aero understood before proceeding */}
                    {magicParsed && (
                      <div className="mt-3 bg-[#070B14] border border-blue-500/40 rounded-xl p-4 text-left animate-in fade-in slide-in-from-bottom-2">
                        <p className="flex items-center gap-1.5 text-[9px] font-black uppercase tracking-widest text-blue-400 mb-2">
                          <Sparkles className="w-3 h-3" /> Aero understood
                        </p>
                        <p className="text-white text-sm font-semibold leading-snug min-h-[2.5rem]">
                          <Typewriter text={magicParsed.data.parsedSummary || magicParsed.data.aeroTip || "Your parking search is ready."} />
                        </p>
                        {magicParsed.data.aeroTip && magicParsed.data.parsedSummary && (
                          <p className="text-blue-200/70 text-xs font-medium mt-2 leading-relaxed">{magicParsed.data.aeroTip}</p>
                        )}
                        <div className="flex items-center gap-2 mt-3">
                          <button type="button" onClick={proceedFromMagic} disabled={isThinking}
                            className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-3 bg-blue-600 hover:bg-blue-500 disabled:bg-slate-700 text-white font-black uppercase tracking-widest text-[11px] rounded-xl transition-all active:scale-95">
                            {isThinking ? <Loader2 className="w-4 h-4 animate-spin" /> : <>View Live Prices <ArrowRight className="w-4 h-4" /></>}
                          </button>
                          <button type="button" onClick={() => { setMagicParsed(null); setMagicText(""); setFastTrackStatus(""); }} disabled={isThinking}
                            className="px-4 py-3 bg-[#0F1523] hover:bg-slate-800 border border-slate-700 text-slate-300 font-bold text-[11px] rounded-lg transition-colors active:scale-95">
                            Edit
                          </button>
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="flex items-center gap-4 mb-5" aria-hidden="true"><div className="h-px bg-slate-800 flex-1" /><span className="text-[9px] uppercase tracking-[0.2em] text-slate-500 font-black whitespace-nowrap">Or select manually</span><div className="h-px bg-slate-800 flex-1" /></div>

                  <form onSubmit={handleSearch} className="relative z-10 flex flex-col gap-4" aria-label="Manual airport parking search">
                    <div className="bg-[#0F1523] border border-slate-800 rounded-xl p-3 md:p-4 hover:border-slate-700 transition-colors">
                      <label htmlFor="airport-select" className="text-[9px] md:text-[10px] font-black uppercase tracking-widest text-slate-300 block mb-2">Departure Airport</label>
                      <div className="relative">
                        <select id="airport-select" name="airport" value={airport} onChange={e => setAirport(e.target.value)} className="w-full bg-transparent font-black text-white text-lg sm:text-xl md:text-2xl outline-none cursor-pointer appearance-none relative z-10 touch-manipulation [-webkit-tap-highlight-color:transparent]">
                          <option value="Luton (LTN)" className="text-slate-900">Luton Airport (LTN)</option>
                          <option value="Heathrow (LHR)" className="text-slate-900">Heathrow Airport (LHR)</option>
                        </select>
                        <ChevronDown className="absolute right-0 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 pointer-events-none" aria-hidden="true" />
                      </div>
                    </div>

                    <div className="bg-[#0F1523] border border-slate-800 rounded-xl p-3 md:p-4 transition-colors focus-within:border-blue-500/50">
                      <div className="flex items-center gap-2 mb-2"><PlaneTakeoff className="w-3.5 h-3.5 text-blue-400" aria-hidden="true" /><label className="text-[9px] md:text-[10px] font-black uppercase tracking-widest text-slate-300">Drop-off</label></div>
                      <div className="grid grid-cols-[3fr_2fr] gap-2 h-12 md:h-11 mb-1">
                        <input type="date" name="dropoffDate" min={todayStr} value={dropoffDate} onChange={e => handleDropoffDateChange(e.target.value)} aria-label="Drop-off date" className="w-full bg-white text-slate-900 rounded-xl px-2 md:px-3 font-bold text-base md:text-sm outline-none focus:ring-2 focus:ring-blue-500 touch-manipulation" />
                        <input type="time" name="dropoffTime" value={dropoffTime} onChange={e => setDropoffTime(e.target.value)} aria-label="Drop-off time" className="w-full bg-white text-slate-900 rounded-xl px-2 font-bold text-base md:text-sm outline-none focus:ring-2 focus:ring-blue-500 touch-manipulation" />
                      </div>
                      <QuickTimes value={dropoffTime} onChange={setDropoffTime} currentHour={currentHour} />
                    </div>

                    <div className="bg-[#0F1523] border border-slate-800 rounded-xl p-3 md:p-4 transition-colors focus-within:border-blue-500/50">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2"><Calendar className="w-3.5 h-3.5 text-blue-400" aria-hidden="true" /><label className="text-[9px] md:text-[10px] font-black uppercase tracking-widest text-slate-300">Pick-up</label></div>
                        {tripDays > 0 && <span className="text-[9px] font-black uppercase tracking-widest text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-lg border border-emerald-500/20">{tripDays} {tripDays === 1 ? "day" : "days"}</span>}
                      </div>
                      <div className="grid grid-cols-[3fr_2fr] gap-2 h-12 md:h-11 mb-1">
                        <input type="date" name="pickupDate" min={dropoffDate || todayStr} value={pickupDate} onChange={e => setPickupDate(e.target.value)} aria-label="Pick-up date" className="w-full bg-white text-slate-900 rounded-xl px-2 md:px-3 font-bold text-base md:text-sm outline-none focus:ring-2 focus:ring-blue-500 touch-manipulation" />
                        <input type="time" name="pickupTime" value={pickupTime} onChange={e => setPickupTime(e.target.value)} aria-label="Pick-up time" className="w-full bg-white text-slate-900 rounded-xl px-2 font-bold text-base md:text-sm outline-none focus:ring-2 focus:ring-blue-500 touch-manipulation" />
                      </div>
                      <QuickTimes value={pickupTime} onChange={setPickupTime} currentHour={currentHour} />
                    </div>

                    {formError && <p role="alert" className="text-red-400 text-[10px] font-black uppercase tracking-widest text-center bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-2 flex items-center gap-2 justify-center"><AlertCircle className="w-4 h-4 shrink-0" /> {formError}</p>}

                    <button type="submit" disabled={!isFormReady} aria-label="Search for airport parking" className={`w-full h-14 md:h-16 font-black rounded-xl flex items-center justify-center gap-2 md:gap-3 uppercase text-xs md:text-sm tracking-widest mt-1 transition-colors active:scale-[0.98] touch-manipulation [-webkit-tap-highlight-color:transparent] ${isFormReady ? "bg-blue-600 hover:bg-blue-500 text-white" : "bg-slate-800 text-slate-500 cursor-not-allowed"}`}>
                      <Search className="w-4 h-4 md:w-5 md:h-5" aria-hidden="true" /> Find My Parking
                    </button>
                  </form>

                  <div className="mt-4 grid grid-cols-2 gap-2">
                    <div className="p-3 rounded-xl bg-[#0F1523] border border-slate-800 flex items-center gap-2">
                      <div className="relative flex h-2 w-2 shrink-0"><span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" aria-hidden="true" /><span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" /></div>
                      <p className="text-[9px] text-slate-300 font-bold leading-tight"><span className="text-emerald-400 font-black">Founding</span>-member launch</p>
                    </div>
                    <div className="p-3 rounded-xl bg-[#0F1523] border border-slate-800 flex items-center gap-2">
                      <ShieldCheck className="w-3.5 h-3.5 text-emerald-400 shrink-0" aria-hidden="true" />
                      <p className="text-[9px] text-slate-300 font-bold leading-tight"><span className="text-emerald-400 font-black">Insured</span> · free cancellation</p>
                    </div>
                  </div>
                </div>
              </div>
              <button onClick={() => setIsMapOpen(true)} aria-label="View map instructions" className="absolute -bottom-10 md:-bottom-12 flex items-center gap-2 text-slate-400 font-bold text-[10px] md:text-xs hover:text-white transition-colors w-full justify-center lg:justify-end pr-4 touch-manipulation [-webkit-tap-highlight-color:transparent]"><Info className="w-3 h-3 md:w-4 md:h-4" aria-hidden="true" /> View Map Instructions</button>
            </div>
          </div>
        </section>

        <AeroFeature />

        {preset?.seoBlock && (
          <section aria-label={preset.seoBlock.heading} className="py-20 md:py-28 px-4 md:px-6 bg-white border-b border-slate-100">
            <div className="max-w-4xl mx-auto">
              {preset.seoBlock.eyebrow && (
                <span className="inline-block text-[11px] font-black uppercase tracking-[0.2em] text-blue-600 mb-5">{preset.seoBlock.eyebrow}</span>
              )}
              <h2 className="text-3xl md:text-5xl font-black text-slate-900 mb-8 md:mb-10 tracking-tight leading-[1.1]">
                {preset.seoBlock.heading}{preset.seoBlock.highlight ? <> <span className="text-blue-600">{preset.seoBlock.highlight}</span></> : null}
              </h2>
              <div className="space-y-6">
                {preset.seoBlock.paragraphs.map((p, i) => (
                  <p key={i} className={i === 0
                    ? "text-lg md:text-2xl text-slate-800 font-semibold leading-relaxed"
                    : "text-base md:text-lg text-slate-600 font-medium leading-relaxed"}>{p}</p>
                ))}
              </div>
              {preset.seoBlock.highlights && (
                <div className="mt-10 md:mt-12 grid grid-cols-1 sm:grid-cols-3 gap-4 md:gap-5">
                  {preset.seoBlock.highlights.map((h, i) => (
                    <div key={i} className="bg-slate-50 border border-slate-200 rounded-2xl p-6">
                      <p className="text-3xl md:text-4xl font-black text-blue-600 tracking-tight">{h.stat}</p>
                      <p className="text-slate-500 text-sm font-bold mt-2 leading-snug">{h.label}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </section>
        )}

        <section aria-label="Airport parking locations" className="py-16 md:py-24 px-4 md:px-6">
          <div className="max-w-7xl mx-auto">
            <h2 className="text-3xl md:text-5xl font-black text-slate-900 mb-3 tracking-tight text-center">Airport Parking at <span className="text-blue-600">Luton &amp; Heathrow</span></h2>
            <p className="text-slate-500 text-sm md:text-base font-medium text-center mb-12 max-w-2xl mx-auto">Compare and book trusted Meet &amp; Greet and Park &amp; Ride operators at both airports.</p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-8">
              {[{ name: "Luton Airport Parking", code: "LTN", query: "Luton (LTN)", desc: "Fast, reliable Meet & Greet at LTN. Drive directly to the terminal forecourt — no buses, no queues." }, { name: "Heathrow Airport Parking", code: "LHR", query: "Heathrow (LHR)", desc: "Premium chauffeur-style parking at LHR across T2, T3, T4 and T5. Trusted and fully insured." }].map((ap, i) => (
                <Link key={i} href={`/select-service?airport=${encodeURIComponent(ap.query)}&dropoffDate=${addDays(new Date(), 7)}&pickupDate=${addDays(new Date(), 14)}&dropoffTime=09:00&pickupTime=09:00`} className="group bg-slate-50 border border-slate-200 hover:border-blue-500/50 p-8 rounded-2xl transition-colors block">
                  <div className="flex justify-between items-start mb-6"><div className="w-16 h-16 bg-blue-600/10 rounded-2xl flex items-center justify-center text-blue-600"><Plane className="w-8 h-8" aria-hidden="true" /></div><span className="text-3xl font-black text-slate-300 group-hover:text-blue-600 transition-colors">{ap.code}</span></div>
                  <h3 className="text-2xl font-black text-slate-900 mb-3">{ap.name}</h3>
                  <p className="text-slate-500 font-medium mb-6">{ap.desc}</p>
                  <div className="flex items-center text-blue-600 font-black uppercase text-xs tracking-widest">Book Parking <ArrowRight className="w-4 h-4 ml-2" aria-hidden="true" /></div>
                </Link>
              ))}
            </div>
          </div>
        </section>

        <section id="services" aria-label="Our services" className="py-16 md:py-24 px-4 md:px-6">
          <div className="max-w-7xl mx-auto">
            <div className="mb-10 md:mb-16 text-center max-w-2xl mx-auto">
              <h2 className="text-3xl sm:text-4xl md:text-6xl font-black text-slate-900 tracking-tighter mb-4 md:mb-5 uppercase">The Standard of <span className="text-blue-600">Excellence.</span></h2>
              <p className="text-base md:text-lg text-slate-500 font-medium leading-relaxed">We bring Luton and Heathrow's top-rated, fully insured operators together — so you get the perfect balance of convenience, security and value.</p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
              {[
                { Icon: ShieldCheck,  title: "24/7 Security",             desc: "All operators audited by us. CCTV-monitored, fully fenced, fully insured." },
                { Icon: PlaneTakeoff, title: "Real-Time Flight Tracking", desc: "Your operator monitors your arrival. Your car is ready when you land — never before." },
                { Icon: Car,          title: "Terminal Drop-Off",         desc: "Drive to departures and hand over your keys. No shuttle buses, no long walks." },
                { Icon: CreditCard,   title: "No Hidden Fees",            desc: "Transparent pricing with our price-match guarantee as your safety net." },
                { Icon: BadgeCheck,   title: "Insured & DBS-Checked",     desc: "Every driver DBS-checked. Photos on handover. Fully insured CCTV compounds." },
                { Icon: CheckCircle2, title: "Free Cancellation",         desc: "Plans change. Cancel free up to 24 hours before your drop-off." },
              ].map(({ Icon, title, desc }, i) => (
                <div key={i} className="bg-slate-50 border border-slate-200 rounded-2xl p-6 md:p-7 hover:border-blue-500/50 transition-colors">
                  <div className="w-12 h-12 bg-blue-600/10 rounded-xl flex items-center justify-center text-blue-600 mb-5"><Icon className="w-6 h-6" aria-hidden="true" /></div>
                  <h3 className="text-lg md:text-xl font-black text-slate-900 mb-2 uppercase tracking-tight">{title}</h3>
                  <p className="text-slate-500 text-sm font-medium leading-relaxed">{desc}</p>
                </div>
              ))}
            </div>

            {/* Best Price Guarantee — single light CTA (keeps the price-match modal) */}
            <div className="mt-6 md:mt-8 bg-slate-50 border border-slate-200 rounded-2xl p-6 md:p-8 flex flex-col md:flex-row items-center justify-between gap-5 text-center md:text-left">
              <div>
                <h3 className="text-xl md:text-2xl font-black text-slate-900 uppercase tracking-tight">Best Price Guarantee</h3>
                <p className="text-slate-500 text-sm font-medium mt-1.5 max-w-xl">Found a cheaper price for the same service? Let us know and we'll match it — no questions asked.</p>
              </div>
              <button onClick={() => setIsPriceMatchOpen(true)} className="shrink-0 bg-blue-600 hover:bg-blue-500 text-white font-black px-7 py-4 rounded-xl text-xs uppercase tracking-widest transition-colors active:scale-95">Claim Price Match</button>
            </div>
          </div>
        </section>

        <section aria-label="How to book" className="py-16 md:py-24">
          <div className="max-w-7xl mx-auto px-4 md:px-6 text-center">
            <h2 className="text-3xl sm:text-4xl md:text-5xl font-black text-slate-900 tracking-tight mb-3">Book Airport Parking in <span className="text-blue-600">3 Steps.</span></h2>
            <p className="text-slate-500 text-sm font-medium mb-10 md:mb-20 max-w-lg mx-auto">From search to confirmation in under 60 seconds. No account needed.</p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-10 md:gap-12 relative">
              {[{ Icon: Search, step: "1. Search", desc: "Enter your airport, drop-off date, and return date. Takes under 10 seconds." }, { Icon: CreditCard, step: "2. Compare", desc: "Choose your service type, pick your operator, and pay securely via Stripe." }, { Icon: Car, step: "3. Fly", desc: "Drive to the terminal, hand over your keys, and catch your flight stress-free." }].map(({ Icon, step, desc }, i) => (
                <div key={i} className="relative group">
                  <div className="w-20 h-20 md:w-24 md:h-24 bg-white border-2 border-slate-100 rounded-full flex items-center justify-center mx-auto mb-6 md:mb-8 shadow-xl group-hover:border-blue-500 transition-all duration-500 relative z-10"><Icon className="w-8 h-8 md:w-10 md:h-10 text-blue-600" aria-hidden="true" /></div>
                  <h3 className="text-xl md:text-2xl font-black text-slate-900 mb-2 md:mb-4 tracking-tight">{step}</h3>
                  <p className="text-slate-500 font-bold text-xs md:text-sm leading-relaxed max-w-[240px] mx-auto">{desc}</p>
                </div>
              ))}
              <div className="hidden md:block absolute top-12 left-0 w-full h-[2px] bg-slate-100 -z-0" aria-hidden="true" />
            </div>
          </div>
        </section>

        <section aria-label="Airport parking FAQ" className="py-20 md:py-28 px-4 md:px-6">
          <div className="max-w-4xl mx-auto">
            <div className="flex flex-col items-center text-center mb-12 md:mb-16">
              <div className="w-12 h-12 bg-blue-600/10 rounded-2xl flex items-center justify-center text-blue-600 mb-4"><HelpCircle className="w-6 h-6" aria-hidden="true" /></div>
              <h2 className="text-3xl md:text-5xl font-black text-slate-900 tracking-tight">Airport Parking <span className="text-blue-600">FAQs</span></h2>
              <p className="text-sm md:text-base text-slate-500 font-medium max-w-md mt-3">Common questions about Meet &amp; Greet and Park &amp; Ride at Luton and Heathrow.</p>
            </div>
            <div className="space-y-3" itemScope itemType="https://schema.org/FAQPage">
              {faqs.map((faq, i) => {
                const isOpen = openFaq === i;
                return (
                  <div key={i} className="bg-slate-50 border border-slate-200 rounded-2xl overflow-hidden" itemScope itemProp="mainEntity" itemType="https://schema.org/Question">
                    <button onClick={() => setOpenFaq(isOpen ? null : i)} aria-expanded={isOpen} aria-controls={`faq-ans-${i}`} className="w-full text-left px-6 py-5 md:py-6 flex items-center justify-between gap-4 font-black text-slate-950 text-sm md:text-base select-none">
                      <span itemProp="name">{faq.q}</span>
                      <ChevronDown className={`w-5 h-5 text-blue-600 transition-transform duration-300 shrink-0 ${isOpen ? "rotate-180" : ""}`} aria-hidden="true" />
                    </button>
                    <div id={`faq-ans-${i}`} className={`transition-all duration-300 ease-in-out overflow-hidden ${isOpen ? "max-h-56 border-t border-slate-100 opacity-100" : "max-h-0 opacity-0"}`} itemScope itemProp="acceptedAnswer" itemType="https://schema.org/Answer">
                      <p className="px-6 py-5 text-slate-600 text-xs md:text-sm font-medium leading-relaxed bg-white" itemProp="text">{faq.a}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        <footer role="contentinfo" className="bg-[#0B1121] pt-14 md:pt-20 pb-8 md:pb-10 px-4 md:px-6 border-t border-white/5">
          <div className="max-w-7xl mx-auto">

            {/* Directory — links every parking page so they're crawlable and reachable, not orphaned */}
            <nav aria-label="Parking directory" className="grid grid-cols-2 lg:grid-cols-4 gap-x-6 gap-y-10 md:gap-x-10 pb-12 md:pb-14 border-b border-white/5">
              {[
                {
                  heading: "Heathrow (LHR)",
                  links: [
                    { label: "Heathrow Airport Parking", href: "/heathrow-airport-parking" },
                    { label: "Heathrow Meet & Greet",   href: "/heathrow-meet-and-greet" },
                    { label: "Heathrow Park & Ride",    href: "/heathrow-park-and-ride" },
                    { label: "Terminal 2 Parking",      href: "/heathrow-terminal-2-parking" },
                    { label: "Terminal 3 Parking",      href: "/heathrow-terminal-3-parking" },
                    { label: "Terminal 4 Parking",      href: "/heathrow-terminal-4-parking" },
                    { label: "Terminal 5 Parking",      href: "/heathrow-terminal-5-parking" },
                  ],
                },
                {
                  heading: "Luton (LTN)",
                  links: [
                    { label: "Luton Airport Parking", href: "/luton-airport-parking" },
                    { label: "Luton Meet & Greet",    href: "/luton-meet-and-greet" },
                    { label: "Luton Park & Ride",     href: "/luton-park-and-ride" },
                  ],
                },
                {
                  heading: "Booking",
                  links: [
                    { label: "How It Works",    href: "/how-it-works" },
                    { label: "Our Services",    href: "/services" },
                    { label: "Manage Booking",  href: "/manage" },
                  ],
                },
                {
                  heading: "Company",
                  links: [
                    { label: "About Us",        href: "/about" },
                    { label: "Contact",         href: "/contact" },
                    { label: "Privacy Policy",  href: "/privacy" },
                    { label: "Terms",           href: "/terms" },
                  ],
                },
              ].map((col) => (
                <div key={col.heading}>
                  <h3 className="text-white font-black text-[10px] md:text-[11px] uppercase tracking-[0.2em] mb-5">{col.heading}</h3>
                  <ul className="space-y-3">
                    {col.links.map((l) => (
                      <li key={l.href}>
                        <Link href={l.href} className="text-slate-300/70 hover:text-white text-[13px] md:text-sm font-medium transition-colors touch-manipulation [-webkit-tap-highlight-color:transparent]">{l.label}</Link>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </nav>

            {/* Legal bar */}
            <div className="mt-8 md:mt-10 flex flex-col md:flex-row items-center justify-between gap-6 md:gap-4">
              <Link href="/" aria-label="AeroPark Direct home" className="flex items-center w-full md:w-1/3 justify-center md:justify-start touch-manipulation [-webkit-tap-highlight-color:transparent]"><div className="bg-white px-2.5 py-1.5 rounded-lg shadow-sm"><Image src="/footer.jpg" alt="AeroPark Direct - Airport Parking UK" width={200} height={60} className="h-6 md:h-9 w-auto object-contain" /></div></Link>
              <div className="text-slate-400/70 text-[10px] md:text-xs font-medium text-center w-full md:w-1/3 normal-case tracking-normal">Fully insured Meet &amp; Greet &amp; Park &amp; Ride at Luton &amp; Heathrow. <Link href="mailto:info@aeroparkdirect.co.uk" className="text-slate-300 hover:text-white font-bold transition-colors">Support</Link></div>
              <div className="text-slate-500/70 font-bold text-[8px] md:text-[10px] uppercase tracking-[0.15em] md:tracking-widest w-full md:w-1/3 text-center md:text-right">© {new Date().getFullYear()} AeroPark Direct Ltd</div>
            </div>

          </div>
        </footer>

        <MapModal isOpen={isMapOpen} onClose={() => setIsMapOpen(false)} />
        <PriceMatchModal isOpen={isPriceMatchOpen} onClose={() => setIsPriceMatchOpen(false)} />
      </main>
    </>
  );
}