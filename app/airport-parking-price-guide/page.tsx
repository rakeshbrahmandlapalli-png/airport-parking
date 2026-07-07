import { createClient } from "@supabase/supabase-js";
import Link from "next/link";
import {
  ArrowLeft, Plane, ArrowRight, ShieldCheck, CheckCircle2, MapPin,
  TrendingDown, Calendar, Tag, AlertTriangle
} from "lucide-react";
import { computePrice, loadPricingSettings, DEFAULT_SETTINGS, type PricingSettings } from "@/app/lib/pricing";

// Regenerate hourly — prices are computed live from the same pricing engine
// that powers /results, so this page never goes stale or shows fabricated figures.
export const revalidate = 3600;

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

const DURATIONS = [
  { days: 3, label: "Short break", sub: "3 days" },
  { days: 7, label: "One week", sub: "7 days" },
  { days: 14, label: "Two weeks", sub: "14 days" },
];

type Row = { label: string; sub: string; from: number; typical: number; count: number };

async function getPriceRows(airport: "Luton" | "Heathrow", category: "meet-greet" | "park-ride", companies: any[], settings: PricingSettings): Promise<Row[]> {
  const isLuton = airport === "Luton";
  const activeField = isLuton ? "operates_at_luton" : "operates_at_heathrow";
  const soldOutField = isLuton ? "ltn_sold_out" : "lhr_sold_out";
  const pool = companies.filter(
    (c) => c.category === category && c.is_active && c[activeField] && !c[soldOutField]
  );

  // Example drop-off ~3 weeks out — representative of a normal advance booking,
  // not a last-minute-premium or a heavily-discounted far-future date.
  const dropDate = new Date(Date.now() + 21 * 86_400_000).toISOString().split("T")[0];

  return DURATIONS.map(({ days, label, sub }) => {
    const prices = pool
      .map((c) => computePrice({ company: c, airport: isLuton ? "Luton (LTN)" : "Heathrow (LHR)", duration: days, dropDate, liveApiRates: [], settings }))
      .filter((r) => r.ok && r.final > 0)
      .map((r) => r.final);

    if (prices.length === 0) return { label, sub, from: 0, typical: 0, count: 0 };
    const from = Math.min(...prices);
    const typical = prices.reduce((a, b) => a + b, 0) / prices.length;
    return { label, sub, from, typical, count: prices.length };
  });
}

export default async function PriceGuidePage() {
  const [{ data: companies }, settings] = await Promise.all([
    supabase
      .from("companies")
      .select("id, name, category, is_active, operates_at_luton, operates_at_heathrow, ltn_sold_out, lhr_sold_out, luton_price, heathrow_price, ltn_day2_price, lhr_day2_price, ltn_day5_price, lhr_day5_price, ltn_day8_price, lhr_day8_price, ltn_day11_price, lhr_day11_price, ltn_day14_price, lhr_day14_price, price_modifier, dynamic_surcharge_percent, api_token"),
    loadPricingSettings(supabase).catch(() => DEFAULT_SETTINGS),
  ]);

  const pool = companies || [];
  const [lutonMG, lutonPR, heathrowMG, heathrowPR] = await Promise.all([
    getPriceRows("Luton", "meet-greet", pool, settings),
    getPriceRows("Luton", "park-ride", pool, settings),
    getPriceRows("Heathrow", "meet-greet", pool, settings),
    getPriceRows("Heathrow", "park-ride", pool, settings),
  ]);

  const updatedLabel = new Date().toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" });

  const faqs = [
    { q: "How is Meet & Greet different from Park & Ride?", a: "With Meet & Greet, a driver meets you at the terminal drop-off and takes your car — you walk straight to check-in. With Park & Ride, you drive to a secure compound yourself and a shuttle bus takes you to the terminal. Meet & Greet is faster and more convenient; Park & Ride is usually a little cheaper." },
    { q: "Why do prices change day to day?", a: "Airport parking pricing moves with demand, much like flights and hotels — earlier bookings and midweek travel are typically cheaper than last-minute or weekend departures. The rates above are calculated live from our current pricing, not a fixed list." },
    { q: "Are there any hidden fees?", a: "We disclose every extra charge up front on the results page before you pay — including any operator barrier fee at Luton or ULEZ/drop-off charge at Heathrow. Our AeroPark Exclusive service has zero extra fees at either airport." },
    { q: "Is the price shown the final price?", a: "Yes. The total you see at checkout is what you pay — no surprise charges added afterwards. Free cancellation is included as standard." },
  ];

  const table = (title: string, rows: Row[]) => (
    <div className="bg-[#0F1523] border border-slate-800 rounded-[1.5rem] overflow-hidden">
      <div className="px-6 py-4 border-b border-slate-800 bg-white/[0.02]">
        <h3 className="font-black text-white text-sm uppercase tracking-widest">{title}</h3>
      </div>
      <div className="divide-y divide-slate-800">
        {rows.map((r) => (
          <div key={r.label} className="flex items-center justify-between px-6 py-5">
            <div>
              <p className="font-bold text-white text-sm">{r.label}</p>
              <p className="text-slate-500 text-xs">{r.sub}</p>
            </div>
            {r.count > 0 ? (
              <div className="text-right">
                <p className="text-2xl font-black text-emerald-400 tabular-nums">£{r.from.toFixed(0)}</p>
                <p className="text-[10px] text-slate-500 uppercase tracking-widest">from · avg £{r.typical.toFixed(0)}</p>
              </div>
            ) : (
              <p className="text-slate-600 text-xs font-bold uppercase">Unavailable</p>
            )}
          </div>
        ))}
      </div>
    </div>
  );

  return (
    <main className="min-h-screen bg-[#0A101D] text-white font-sans antialiased selection:bg-blue-600 selection:text-white">
      <header className="sticky top-0 z-[100] bg-[#0A101D]/80 backdrop-blur-xl border-b border-white/5 h-20 flex items-center px-8 justify-between">
        <Link href="/" className="text-slate-400 hover:text-white transition-colors flex items-center gap-2">
          <ArrowLeft className="w-5 h-5" /> Back Home
        </Link>
        <div className="flex items-center gap-2 text-white font-black uppercase text-xl">
          <Plane className="w-6 h-6 text-blue-500 rotate-45" />AEROPARK<span className="text-blue-500">DIRECT</span>
        </div>
      </header>

      <div className="max-w-5xl mx-auto px-6 py-16">

        <div className="text-center mb-4">
          <span className="inline-flex items-center gap-2 px-3 py-1 bg-emerald-600/10 text-emerald-400 border border-emerald-500/20 rounded-full text-[10px] font-black uppercase tracking-[0.2em]">
            <TrendingDown className="w-3 h-3" /> Updated {updatedLabel}
          </span>
        </div>
        <h1 className="text-4xl md:text-5xl font-black mb-6 text-center tracking-tight">Airport Parking Price Guide</h1>
        <p className="text-slate-400 text-center text-lg max-w-2xl mx-auto mb-6">
          Live example rates for Meet &amp; Greet and Park &amp; Ride at Luton and Heathrow, calculated directly from
          our current pricing engine — the same one that prices real bookings. Figures below are the &quot;from&quot;
          price and the average across our active operators for a typical booking made about three weeks ahead.
        </p>
        <p className="text-slate-600 text-center text-xs max-w-2xl mx-auto mb-16">
          These are AeroPark Direct&apos;s own current rates, not a survey of the wider market. Your exact price
          depends on your dates, so always check <Link href="/" className="text-blue-400 hover:underline">live availability</Link> for your trip.
        </p>

        <section className="mb-6">
          <h2 className="text-xl font-black mb-6 flex items-center gap-2"><MapPin className="w-5 h-5 text-blue-500" /> Luton Airport (LTN)</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {table("Meet & Greet", lutonMG)}
            {table("Park & Ride", lutonPR)}
          </div>
        </section>

        <section className="mb-20">
          <h2 className="text-xl font-black mb-6 flex items-center gap-2"><MapPin className="w-5 h-5 text-blue-500" /> Heathrow Airport (LHR)</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {table("Meet & Greet", heathrowMG)}
            {table("Park & Ride", heathrowPR)}
          </div>
        </section>

        <section className="mb-20 bg-[#0F1523] border border-amber-500/20 rounded-[2rem] p-8 md:p-10">
          <h2 className="text-xl font-black mb-6 flex items-center gap-2"><AlertTriangle className="w-5 h-5 text-amber-400" /> What actually affects your price</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-sm text-slate-300">
            <div className="flex gap-3"><Calendar className="w-5 h-5 text-blue-400 shrink-0 mt-0.5" /><span><strong className="text-white">Booking ahead vs last-minute.</strong> Prices at most operators rise as your drop-off date gets closer — booking a few weeks out is usually cheaper than booking the night before.</span></div>
            <div className="flex gap-3"><Calendar className="w-5 h-5 text-blue-400 shrink-0 mt-0.5" /><span><strong className="text-white">Weekday vs weekend.</strong> Friday, Saturday and Sunday departures typically cost more than a midweek drop-off, reflecting real demand at the airport.</span></div>
            <div className="flex gap-3"><Tag className="w-5 h-5 text-blue-400 shrink-0 mt-0.5" /><span><strong className="text-white">Trip length.</strong> Longer stays cost more in total but often work out cheaper per day than a short break.</span></div>
            <div className="flex gap-3"><ShieldCheck className="w-5 h-5 text-blue-400 shrink-0 mt-0.5" /><span><strong className="text-white">Hidden extras.</strong> Some operators add a barrier or ULEZ charge on top of the headline price — we flag this clearly before you pay, or you can choose AeroPark Exclusive, which has none.</span></div>
          </div>
        </section>

        <section className="mb-20">
          <h2 className="text-xl font-black mb-6">Common questions</h2>
          <div className="space-y-3">
            {faqs.map((f, i) => (
              <div key={i} className="bg-[#0F1523] border border-slate-800 rounded-2xl p-6">
                <p className="font-bold text-white text-sm mb-2">{f.q}</p>
                <p className="text-slate-400 text-sm leading-relaxed">{f.a}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="bg-[#0F1523] border border-blue-500/20 rounded-[2rem] p-8 md:p-12 text-center relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-600 to-emerald-500" />
          <h2 className="text-2xl md:text-3xl font-black mb-3">See your exact price</h2>
          <p className="text-slate-400 max-w-lg mx-auto mb-8">
            Enter your real dates and compare live quotes from every vetted operator at Luton and Heathrow.
          </p>
          <Link
            href="/"
            className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white font-black uppercase tracking-widest text-xs px-8 py-4 rounded-xl transition-colors active:scale-95"
          >
            Find my parking <ArrowRight className="w-4 h-4" />
          </Link>
          <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2 mt-8 text-[11px] font-bold uppercase tracking-widest text-slate-500">
            <span className="flex items-center gap-1.5"><CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> Free cancellation</span>
            <span className="flex items-center gap-1.5"><ShieldCheck className="w-3.5 h-3.5 text-emerald-400" /> Fully insured</span>
            <span className="flex items-center gap-1.5"><MapPin className="w-3.5 h-3.5 text-blue-400" /> Luton &amp; Heathrow</span>
          </div>
        </section>
      </div>

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

      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@graph": [
              {
                "@type": "BreadcrumbList",
                itemListElement: [
                  { "@type": "ListItem", position: 1, name: "Home", item: "https://www.aeroparkdirect.co.uk" },
                  { "@type": "ListItem", position: 2, name: "Price Guide", item: "https://www.aeroparkdirect.co.uk/airport-parking-price-guide" },
                ],
              },
              {
                "@type": "FAQPage",
                mainEntity: faqs.map((f) => ({ "@type": "Question", name: f.q, acceptedAnswer: { "@type": "Answer", text: f.a } })),
              },
            ],
          }),
        }}
      />
    </main>
  );
}
