"use client";
import { useRouter } from "next/navigation";
import { useState, useEffect, useMemo } from "react";
import AeroFeature, { AeroAvatar } from "@/components/AeroFeature";
import { supabase } from "./lib/supabase";
import {
  AlertCircle, ArrowRight, Car, Check, CheckCircle2, ChevronDown, CreditCard,
  Loader2, MapPin, Mic, PlaneTakeoff, Search, ShieldCheck,
} from "lucide-react";
import Link from "next/link";
import MapModal from "@/components/MapModal";
import PriceMatchModal from "@/components/PriceMatchModal";
import SiteHeader from "@/components/site/SiteHeader";
import SiteFooter from "@/components/site/SiteFooter";
import { COMPANY } from "@/app/lib/company";

const addDays = (date: Date, days: number) => { const d = new Date(date); d.setDate(d.getDate() + days); return d.toISOString().split("T")[0]; };
const toDateStr = (d: Date) => d.toISOString().split("T")[0];
const daysBetween = (a: string, b: string) => { if (!a || !b) return 0; return Math.max(0, Math.ceil((new Date(b).getTime() - new Date(a).getTime()) / 86400000)); };

const inputCls = "w-full h-12 rounded-lg border border-slate-300 bg-white px-3 text-base text-slate-900 outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-600/20";
const labelCls = "block text-sm font-medium text-slate-700 mb-1.5";

// Only claims the business has confirmed: insured operators, compounds checked
// before listing. Check with the business before adding more.
const TRUST = [
  "Insured operators, with every compound checked before we list it",
  "Free cancellation up to 24 hours before drop-off",
  "Card payments handled securely by Stripe",
];

const AIRPORTS = [
  { name: "Luton Airport", code: "LTN", href: "/luton-airport-parking", cta: "Luton parking", desc: "Meet & Greet at the terminal car park: drive up, hand over your keys and walk to check-in." },
  { name: "Heathrow Airport", code: "LHR", href: "/heathrow-airport-parking", cta: "Heathrow parking", desc: "Meet & Greet and Park & Ride for Terminals 2, 3, 4 and 5." },
];

const BENEFITS = [
  { Icon: Car,          title: "Drop off at the terminal", desc: "With Meet & Greet you drive to the terminal and hand your keys to a driver. No shuttle bus." },
  { Icon: ShieldCheck,  title: "Checked, insured operators", desc: "We check every compound before we list it, and every operator we list is insured. You can see who is looking after your car before you pay." },
  { Icon: CheckCircle2, title: "Free cancellation",        desc: "Cancel free of charge up to 24 hours before drop-off from the Manage booking page." },
  { Icon: PlaneTakeoff, title: "Your return flight on file", desc: "Add your return flight number when you book so your operator knows when you are due back." },
  { Icon: CreditCard,   title: "Secure payment",           desc: "Card payments go through Stripe. We never see or store your card details." },
  { Icon: Search,       title: "Compare in one place",     desc: "See Luton and Heathrow operators side by side, with the price for your exact dates." },
];

const STEPS = [
  { title: "Search", desc: "Choose your airport and your drop-off and pick-up times." },
  { title: "Choose and pay", desc: "Pick an operator and pay by card. Your confirmation arrives by email." },
  { title: "Drop off and fly", desc: "Follow the directions in your confirmation, hand over your keys and head to check-in." },
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
  // Per-page structured data. When present, the page emits BreadcrumbList +
  // Service schema (in addition to LocalBusiness + FAQPage) so Google can place
  // the page in a hierarchy and understand the specific service it offers.
  seoSchema?: {
    path: string;          // canonical path, e.g. "/heathrow-meet-and-greet"
    name: string;          // page/service name, e.g. "Heathrow Meet & Greet Parking"
    serviceType?: string;  // e.g. "Meet & Greet airport parking"
    areaServed?: string;   // e.g. "Heathrow Airport (LHR)"
  };
};

export default function HomePage({ preset }: { preset?: HomePreset } = {}) {
  const router = useRouter();
  const [now,              setNow]              = useState<Date | null>(null);
  const [isMapOpen,        setIsMapOpen]        = useState(false);
  const [isPriceMatchOpen, setIsPriceMatchOpen] = useState(false);
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

  useEffect(() => {
    const today = new Date();
    setNow(today);
    setDropoffDate(addDays(today, 1));
    setPickupDate(addDays(today, 8));

    const timer = setInterval(() => setNow(new Date()), 60000);
    return () => { clearInterval(timer); };
  }, []);

  const todayStr    = now ? toDateStr(now) : "";
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
    else if (v.includes("luton") || v.includes("ltn")) setMagicHint("Luton Airport");
    else if (v.includes("heathrow") || v.includes("lhr")) setMagicHint("Heathrow Airport");
    else if (v.includes("meet")) setMagicHint("Meet & Greet");
    else if (v.includes("park")) setMagicHint("Park & Ride");
    else if (val.match(/[A-Z]{2}\d{3,4}/i)) setMagicHint("Flight number");
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
    
    router.push(`/select-service?${new URLSearchParams({ airport, dropoffDate, dropoffTime, pickupDate, pickupTime }).toString()}`);
  };

  const startListening = (e: React.MouseEvent) => {
    e.preventDefault();
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SR) { alert("Voice search isn't supported in this browser. Please type instead."); return; }
    try {
      const r = new SR(); r.continuous = false; r.lang = "en-GB";
      r.onstart  = () => setIsListening(true);
      r.onresult = (ev: any) => { setMagicText(ev.results[0][0].transcript); setIsListening(false); };
      r.onerror  = (ev: any) => { setIsListening(false); if (ev.error === "not-allowed") alert("Microphone access is blocked. Please allow it in your browser settings, or type instead."); };
      r.onend    = () => setIsListening(false);
      r.start();
    } catch { setIsListening(false); }
  };

  const handleMagicSubmit = async () => {
    if (!magicText.trim()) return;
    setIsThinking(true); setMagicError(""); setMagicParsed(null); setFastTrackStatus("Reading your trip…");
    try {
      const res = await fetch("/api/aero-magic", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ prompt: magicText, currentDate: new Date().toISOString() }) });
      const data = await res.json();
      if (!res.ok) {
        setMagicError(data?.error || "Aero Magic Search isn't available right now. Please use the form above.");
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
        setMagicError("Aero couldn't work that out. Try something like “Meet & Greet at Heathrow next Friday for a week”.");
        setIsThinking(false);
      }
    } catch { setMagicError("Aero Magic Search isn't available right now. Please use the form above."); setIsThinking(false); }
  };

  const proceedFromMagic = async () => {
    if (!magicParsed) return;
    const { data, p } = magicParsed;
    setIsThinking(true);
    try {
      if (data.isReadyToBook && data.servicePreference) {
        setFastTrackStatus("Finding the best available operator…");
        const isH = data.airport.includes("Heathrow");
        const { data: cos } = await supabase.from("companies").select("*");
        if (cos) {
          const avail = cos.filter((c: any) => { const cat = c.category?.toLowerCase().replace(/ & /g, "-").replace(/\s+/g, "-").trim(); return cat === data.servicePreference && (isH ? c.operates_at_heathrow : c.operates_at_luton) && c.is_active && !(isH ? c.lhr_sold_out : c.ltn_sold_out); }).sort((a: any, b: any) => { const af = isH ? a.lhr_featured : a.ltn_featured; const bf = isH ? b.lhr_featured : b.ltn_featured; if (af && !bf) return -1; if (!af && bf) return 1; return Number(isH ? a.heathrow_price : a.luton_price || 0) - Number(isH ? b.heathrow_price : b.luton_price || 0); });
          if (avail.length > 0) { const best = avail[0]; setFastTrackStatus(`Opening checkout with ${best.name}…`); router.push(`/checkout?${new URLSearchParams({ ...p, type: best.name, companyId: best.id }).toString()}`); return; }
        }
      }
      setFastTrackStatus("Loading operators…");
      router.push(`/results?${new URLSearchParams(p).toString()}`);
    } catch { setMagicError("Something went wrong loading operators. Please use the form above."); setIsThinking(false); }
  };

  const MAGIC_EXAMPLES = [
    "Meet & Greet at Heathrow next Friday for a week",
    "Cheap Luton parking, 2 weeks in August",
    "BA123 from T5, back Sunday night",
  ];

  const faqs = preset?.faqs ?? [
    { q: "How much does Meet & Greet parking cost at Luton Airport?",  a: "Our Luton Meet & Greet parking starts from around £44 for short stays, depending on your dates and chosen operator. Search your dates above for an exact price." },
    { q: "What is Meet & Greet airport parking?",                       a: "Meet & Greet is a premium service where a professional driver meets you at the terminal drop-off zone, parks your car securely while you fly, and returns it on your arrival. No shuttle buses, no long walks — drive straight to departures." },
    { q: "Is airport parking at Heathrow available through AeroPark?", a: "Yes — we offer Meet & Greet and Park & Ride at Heathrow across all terminals (T2, T3, T4, T5). Search your dates above to compare available operators and prices." },
    { q: "What happens if my return flight is delayed?",                a: "Add your return flight number when you book so your operator knows when you are due back. If you are delayed, call the operator on the number in your confirmation email." },
    { q: "Who looks after my car?",                                     a: "The operator you choose looks after your car for the whole trip. Every operator we list is insured, and we check their compound before we list them. You can see who the operator is before you pay, and their contact details are in your confirmation email." },
    { q: "Can I cancel or modify my airport parking booking?",          a: "You can cancel at any time from the Manage Booking page — free of charge up to 24 hours before your drop-off time. Inside 24 hours the booking still cancels, and we review the refund and come back to you within one working day. To change your dates, please call your parking operator on the number in your confirmation email — they hold your space, so they are the only ones who can arrange it." },
  ];

  const SITE_URL = "https://www.aeroparkdirect.co.uk";
  const schemaGraph: any[] = [
    { "@type": "LocalBusiness", "@id": `${SITE_URL}#business`, "name": "AeroPark Direct", "legalName": "AeroPark Direct Ltd", "description": "Premium airport parking at Luton and Heathrow. Meet & Greet and Park & Ride.", "url": SITE_URL, "priceRange": "££", "telephone": "+44 7868 277648", "email": "info@aeroparkdirect.co.uk", "logo": `${SITE_URL}/logo.png`, "image": `${SITE_URL}/footer.jpg`, "address": { "@type": "PostalAddress", "streetAddress": "66 Paul Street", "addressLocality": "London", "postalCode": "EC2A 4NA", "addressCountry": "GB" }, "areaServed": ["Luton Airport LTN", "Heathrow Airport LHR"] },
    { "@type": "FAQPage", "mainEntity": faqs.map(f => ({ "@type": "Question", "name": f.q, "acceptedAnswer": { "@type": "Answer", "text": f.a } })) },
  ];
  // Per-landing-page BreadcrumbList + Service (only when the preset supplies it).
  if (preset?.seoSchema) {
    const { path, name, serviceType, areaServed } = preset.seoSchema;
    const pageUrl = `${SITE_URL}${path}`;
    schemaGraph.push({
      "@type": "BreadcrumbList",
      "itemListElement": [
        { "@type": "ListItem", "position": 1, "name": "Home", "item": SITE_URL },
        { "@type": "ListItem", "position": 2, "name": name, "item": pageUrl },
      ],
    });
    schemaGraph.push({
      "@type": "Service",
      "name": name,
      "serviceType": serviceType || "Airport parking",
      "provider": { "@id": `${SITE_URL}#business` },
      "areaServed": areaServed || ["Luton Airport LTN", "Heathrow Airport LHR"],
      "url": pageUrl,
    });
  }

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify({ "@context": "https://schema.org", "@graph": schemaGraph }) }} />

      <SiteHeader />
      <main suppressHydrationWarning className="bg-white font-sans antialiased text-slate-900 overflow-x-clip">

        <section aria-label="Airport parking search" className="bg-[#0B1120]">
          <div className="max-w-6xl mx-auto px-4 md:px-6 py-10 md:py-16 lg:py-20 grid gap-10 lg:gap-14 lg:grid-cols-[1fr_440px] items-start">
            <div className="lg:pt-10">
              <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold text-white leading-tight tracking-tight">
                {preset?.h1Top ?? "Airport Parking"} {(preset?.h1Highlight ?? "Made Simple.").replace(/\.$/, "")}
              </h1>
              <p className="mt-4 md:mt-5 text-base md:text-lg text-slate-300 leading-relaxed max-w-xl">
                {preset?.intro ?? "Meet & Greet at Luton and Heathrow, and Park & Ride at Heathrow. Drive to the terminal, hand over your keys, and fly."}
              </p>
              <ul className="mt-6 md:mt-8 space-y-3 text-slate-200">
                {TRUST.map((t) => (
                  <li key={t} className="flex items-start gap-3">
                    <Check className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" aria-hidden="true" />
                    <span>{t}</span>
                  </li>
                ))}
              </ul>
              <p className="mt-6 md:mt-8 text-sm text-slate-400">
                Questions before you book? Call <a href={COMPANY.phoneHref} className="text-white font-medium hover:underline underline-offset-4">{COMPANY.phoneDisplay}</a>
              </p>
            </div>

            <div id="booking-form" className="w-full">
              <div className="bg-white rounded-xl border border-slate-200 p-5 md:p-6">
                <h2 className="text-lg font-semibold text-slate-900">Find parking</h2>

                <form onSubmit={handleSearch} className="mt-4 space-y-4" aria-label="Airport parking search">
                  <div>
                    <label htmlFor="airport-select" className={labelCls}>Airport</label>
                    <div className="relative">
                      <select id="airport-select" name="airport" value={airport} onChange={e => setAirport(e.target.value)} className={`${inputCls} appearance-none pr-10 cursor-pointer`}>
                        <option value="Luton (LTN)">Luton Airport (LTN)</option>
                        <option value="Heathrow (LHR)">Heathrow Airport (LHR)</option>
                      </select>
                      <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 pointer-events-none" aria-hidden="true" />
                    </div>
                  </div>

                  <fieldset>
                    <legend className={labelCls}>Drop-off</legend>
                    <div className="grid grid-cols-2 sm:grid-cols-[minmax(0,3fr)_minmax(0,2fr)] gap-2">
                      <input type="date" name="dropoffDate" min={todayStr} value={dropoffDate} onChange={e => handleDropoffDateChange(e.target.value)} aria-label="Drop-off date" className={inputCls} />
                      <input type="time" name="dropoffTime" value={dropoffTime} onChange={e => setDropoffTime(e.target.value)} aria-label="Drop-off time" className={inputCls} />
                    </div>
                  </fieldset>

                  <fieldset>
                    <div className="flex items-center justify-between">
                      <legend className={labelCls}>Pick-up</legend>
                      {tripDays > 0 && <span className="text-sm text-slate-500 mb-1.5">{tripDays} {tripDays === 1 ? "day" : "days"}</span>}
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-[minmax(0,3fr)_minmax(0,2fr)] gap-2">
                      <input type="date" name="pickupDate" min={dropoffDate || todayStr} value={pickupDate} onChange={e => setPickupDate(e.target.value)} aria-label="Pick-up date" className={inputCls} />
                      <input type="time" name="pickupTime" value={pickupTime} onChange={e => setPickupTime(e.target.value)} aria-label="Pick-up time" className={inputCls} />
                    </div>
                  </fieldset>

                  {formError && (
                    <p role="alert" className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2.5 text-sm text-red-700">
                      <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" aria-hidden="true" /> {formError}
                    </p>
                  )}

                  <button type="submit" disabled={!isFormReady} className="w-full h-12 rounded-lg bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 text-white font-semibold text-base flex items-center justify-center gap-2">
                    <Search className="w-5 h-5" aria-hidden="true" /> Search parking
                  </button>
                </form>

                {/* Aero Magic Search — brand asset. Plain, precise, tool-like. */}
                <div className="mt-6 pt-5 border-t border-slate-200">
                  <label htmlFor="magic-input" className="flex items-center gap-2.5">
                    <AeroAvatar className="w-6 h-6" />
                    <span className="text-sm font-semibold text-slate-900">Aero Magic Search</span>
                    <span className="hidden sm:inline text-sm text-slate-500">or describe your trip</span>
                  </label>
                  <div className="mt-2.5 flex items-stretch gap-1.5 rounded-lg border border-slate-300 focus-within:border-blue-600 focus-within:ring-2 focus-within:ring-blue-600/20 p-1">
                    <input id="magic-input" type="text" value={magicText} onChange={e => handleMagicChange(e.target.value)} onKeyDown={e => e.key === "Enter" && handleMagicSubmit()} placeholder={isListening ? "Listening…" : "e.g. Heathrow T5 next Friday for a week"} autoComplete="off" spellCheck="false" disabled={isThinking || isListening} className="flex-1 min-w-0 bg-transparent px-2.5 py-2 text-base text-slate-900 placeholder:text-slate-400 outline-none disabled:opacity-60" />
                    <button type="button" onClick={startListening} aria-label="Search by voice" disabled={isThinking} className={`px-2.5 rounded-md flex items-center justify-center disabled:opacity-50 ${isListening ? "bg-red-50 text-red-600" : "text-slate-500 hover:bg-slate-100 hover:text-slate-900"}`}><Mic className="w-5 h-5" /></button>
                    <button type="button" onClick={handleMagicSubmit} disabled={isThinking || !magicText.trim()} aria-label="Search with Aero" className="px-3 rounded-md bg-[#0B1120] hover:bg-slate-800 disabled:bg-slate-200 disabled:text-slate-400 text-white flex items-center justify-center">{isThinking ? <Loader2 className="w-5 h-5 animate-spin" /> : <ArrowRight className="w-5 h-5" />}</button>
                  </div>
                  <p className="mt-2 min-h-5 text-sm text-slate-500" aria-live="polite">
                    {isThinking ? fastTrackStatus : magicHint}
                  </p>

                  {!magicText && !isThinking && !magicParsed && !magicError && (
                    <div className="mt-1 text-sm">
                      <p className="text-slate-500">Try:</p>
                      <ul className="mt-1 space-y-1">
                        {MAGIC_EXAMPLES.map((ex) => (
                          <li key={ex}>
                            <button type="button" onClick={() => handleMagicChange(ex)} className="text-left text-slate-700 underline decoration-slate-300 underline-offset-4 hover:text-slate-900 hover:decoration-slate-500">
                              {ex}
                            </button>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {magicError && !magicParsed && (
                    <p role="alert" className="mt-3 flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2.5 text-sm text-amber-900">
                      <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" aria-hidden="true" /> {magicError}
                    </p>
                  )}

                  {/* Show what Aero understood before going any further. */}
                  {magicParsed && (
                    <div className="mt-3 rounded-lg border border-slate-200 bg-slate-50 p-4">
                      <p className="flex items-center gap-2 text-sm font-semibold text-slate-900">
                        <AeroAvatar className="w-5 h-5" /> Aero understood
                      </p>
                      <p className="mt-2 text-sm text-slate-800 leading-relaxed">
                        {magicParsed.data.parsedSummary || magicParsed.data.aeroTip || "Your parking search is ready."}
                      </p>
                      {magicParsed.data.aeroTip && magicParsed.data.parsedSummary && (
                        <p className="mt-2 text-sm text-slate-600 leading-relaxed">{magicParsed.data.aeroTip}</p>
                      )}
                      <div className="mt-3 flex gap-2">
                        <button type="button" onClick={proceedFromMagic} disabled={isThinking} className="flex-1 h-10 rounded-lg bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 text-white text-sm font-semibold inline-flex items-center justify-center gap-2">
                          {isThinking ? <Loader2 className="w-4 h-4 animate-spin" /> : <>See prices <ArrowRight className="w-4 h-4" /></>}
                        </button>
                        <button type="button" onClick={() => { setMagicParsed(null); setMagicText(""); setFastTrackStatus(""); }} disabled={isThinking} className="h-10 px-4 rounded-lg border border-slate-300 bg-white text-sm font-medium text-slate-700 hover:bg-slate-50">
                          Edit
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <button type="button" onClick={() => setIsMapOpen(true)} className="mt-3 inline-flex items-center gap-2 text-sm text-slate-400 hover:text-white">
                <MapPin className="w-4 h-4" aria-hidden="true" /> Where to go on the day
              </button>
            </div>
          </div>
        </section>

        <AeroFeature />

        {preset?.seoBlock && (
          <section aria-label={preset.seoBlock.heading} className="py-16 md:py-24 px-4 md:px-6 bg-white border-b border-slate-200">
            <div className="max-w-3xl mx-auto">
              {preset.seoBlock.eyebrow && (
                <p className="text-sm font-semibold text-blue-700 mb-3">{preset.seoBlock.eyebrow}</p>
              )}
              <h2 className="text-3xl md:text-4xl font-bold tracking-tight text-slate-900 mb-6 md:mb-8">
                {preset.seoBlock.heading}{preset.seoBlock.highlight ? <> {preset.seoBlock.highlight}</> : null}
              </h2>
              <div className="space-y-5">
                {preset.seoBlock.paragraphs.map((p, i) => (
                  <p key={i} className={i === 0 ? "text-lg md:text-xl text-slate-800 leading-relaxed" : "text-base md:text-lg text-slate-600 leading-relaxed"}>{p}</p>
                ))}
              </div>
              {preset.seoBlock.highlights && (
                <dl className="mt-10 grid gap-4 sm:grid-cols-3">
                  {preset.seoBlock.highlights.map((h, i) => (
                    <div key={i} className="rounded-xl border border-slate-200 bg-slate-50 p-5 flex flex-col-reverse">
                      <dt className="text-sm text-slate-600 mt-1">{h.label}</dt>
                      <dd className="text-2xl md:text-3xl font-bold text-slate-900">{h.stat}</dd>
                    </div>
                  ))}
                </dl>
              )}
            </div>
          </section>
        )}

        <section aria-labelledby="airports-heading" className="py-16 md:py-24 px-4 md:px-6 bg-slate-50 border-b border-slate-200">
          <div className="max-w-6xl mx-auto">
            <h2 id="airports-heading" className="text-3xl md:text-4xl font-bold tracking-tight">Parking at Luton and Heathrow</h2>
            <p className="mt-3 text-base md:text-lg text-slate-600 max-w-2xl">Compare Meet &amp; Greet and Park &amp; Ride operators at both airports.</p>
            <div className="mt-8 md:mt-10 grid gap-4 md:gap-6 md:grid-cols-2">
              {AIRPORTS.map((ap) => (
                <Link key={ap.code} href={ap.href} className="group rounded-xl border border-slate-200 bg-white p-6 md:p-8 hover:border-slate-400">
                  <div className="flex items-baseline justify-between gap-4">
                    <h3 className="text-xl md:text-2xl font-semibold">{ap.name}</h3>
                    <span className="text-sm font-semibold text-slate-400">{ap.code}</span>
                  </div>
                  <p className="mt-3 text-slate-600 leading-relaxed">{ap.desc}</p>
                  <span className="mt-5 inline-flex items-center gap-1.5 text-sm font-semibold text-blue-700 group-hover:gap-2.5 transition-[gap]">
                    {ap.cta} <ArrowRight className="w-4 h-4" aria-hidden="true" />
                  </span>
                </Link>
              ))}
            </div>
          </div>
        </section>

        <section id="services" aria-labelledby="why-heading" className="py-16 md:py-24 px-4 md:px-6">
          <div className="max-w-6xl mx-auto">
            <h2 id="why-heading" className="text-3xl md:text-4xl font-bold tracking-tight">Why book with AeroPark Direct</h2>
            <div className="mt-8 md:mt-10 grid gap-x-10 gap-y-8 sm:grid-cols-2 lg:grid-cols-3">
              {BENEFITS.map(({ Icon, title, desc }) => (
                <div key={title}>
                  <Icon className="w-6 h-6 text-blue-700" aria-hidden="true" />
                  <h3 className="mt-3 text-lg font-semibold">{title}</h3>
                  <p className="mt-1.5 text-slate-600 leading-relaxed">{desc}</p>
                </div>
              ))}
            </div>

            <div className="mt-12 rounded-xl border border-slate-200 bg-slate-50 p-6 md:p-8 flex flex-col md:flex-row md:items-center justify-between gap-5">
              <div>
                <h3 className="text-lg md:text-xl font-semibold">Seen it cheaper?</h3>
                <p className="mt-1.5 text-slate-600 max-w-xl">Send us the details of the same service somewhere else and we&apos;ll see if we can match it.</p>
              </div>
              <button type="button" onClick={() => setIsPriceMatchOpen(true)} className="shrink-0 h-11 px-5 rounded-lg border border-slate-300 bg-white text-sm font-semibold text-slate-900 hover:bg-slate-100">
                Send us a price
              </button>
            </div>
          </div>
        </section>

        <section aria-labelledby="steps-heading" className="py-16 md:py-24 px-4 md:px-6 bg-slate-50 border-y border-slate-200">
          <div className="max-w-6xl mx-auto">
            <h2 id="steps-heading" className="text-3xl md:text-4xl font-bold tracking-tight">How booking works</h2>
            <ol className="mt-8 md:mt-10 grid gap-8 md:grid-cols-3">
              {STEPS.map((s, i) => (
                <li key={s.title} className="flex gap-4">
                  <span className="w-9 h-9 rounded-full bg-[#0B1120] text-white text-sm font-semibold flex items-center justify-center shrink-0" aria-hidden="true">{i + 1}</span>
                  <div>
                    <h3 className="text-lg font-semibold">{s.title}</h3>
                    <p className="mt-1.5 text-slate-600 leading-relaxed">{s.desc}</p>
                  </div>
                </li>
              ))}
            </ol>
          </div>
        </section>

        <section aria-labelledby="faq-heading" className="py-16 md:py-24 px-4 md:px-6">
          <div className="max-w-3xl mx-auto">
            <h2 id="faq-heading" className="text-3xl md:text-4xl font-bold tracking-tight">Frequently asked questions</h2>
            <div className="mt-8 divide-y divide-slate-200 border-y border-slate-200" itemScope itemType="https://schema.org/FAQPage">
              {faqs.map((faq, i) => {
                const isOpen = openFaq === i;
                return (
                  <div key={i} itemScope itemProp="mainEntity" itemType="https://schema.org/Question">
                    <button onClick={() => setOpenFaq(isOpen ? null : i)} aria-expanded={isOpen} aria-controls={`faq-ans-${i}`} className="w-full text-left py-5 flex items-center justify-between gap-4 font-semibold text-slate-900 md:text-lg">
                      <span itemProp="name">{faq.q}</span>
                      <ChevronDown className={`w-5 h-5 text-slate-500 transition-transform shrink-0 ${isOpen ? "rotate-180" : ""}`} aria-hidden="true" />
                    </button>
                    <div id={`faq-ans-${i}`} hidden={!isOpen} itemScope itemProp="acceptedAnswer" itemType="https://schema.org/Answer">
                      <p className="pb-5 text-slate-600 leading-relaxed" itemProp="text">{faq.a}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        {/* The modals' forms rely on the shared .light-ui input styles. */}
        <div className="light-ui">
          <MapModal isOpen={isMapOpen} onClose={() => setIsMapOpen(false)} />
          <PriceMatchModal isOpen={isPriceMatchOpen} onClose={() => setIsPriceMatchOpen(false)} />
        </div>
      </main>
      <SiteFooter />
    </>
  );
}