import { createClient } from "@supabase/supabase-js";
import Link from "next/link";
import SiteHeader from "@/components/site/SiteHeader";
import SiteFooter from "@/components/site/SiteFooter";
import { ArrowRight } from "lucide-react";
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
    { q: "How is Meet & Greet different from Park & Ride?", a: "With Meet & Greet, a driver meets you at the terminal and takes your car, and you walk straight to check-in. With Park & Ride, you drive to the operator's site yourself and take a transfer to the terminal. Meet & Greet is quicker on the day; Park & Ride usually costs less. Park & Ride is available at Heathrow now and coming soon at Luton." },
    { q: "Why do prices change from day to day?", a: "Airport parking prices move with demand, much like flights and hotels. Booking earlier and travelling midweek is usually cheaper than booking last-minute or leaving at the weekend. The prices on this page are worked out from our current rates, not a fixed list." },
    { q: "Are there any extra fees?", a: "Some operators charge an airport car park or drop-off fee that you pay on the day. Where that applies, it's shown on the operator's listing and at checkout before you pay. AeroPark Exclusive has no extra fees at either airport." },
    { q: "Is the price at checkout what I pay?", a: "Yes, the total at checkout is what you pay us. The only other cost is an operator's car park fee on the day, where one applies, and we show that before you pay. Free cancellation up to 24 hours before drop-off is included." },
  ];

  const table = (title: string, rows: Row[], comingSoon = false) => (
    <div className="rounded-xl border border-slate-200 overflow-hidden">
      <h3 className="px-5 py-3 bg-slate-50 border-b border-slate-200 font-semibold">{title}</h3>
      {comingSoon ? (
        <p className="px-5 py-6 text-slate-500">Coming soon.</p>
      ) : (
        <table className="w-full text-left">
          <thead className="sr-only">
            <tr><th>Trip length</th><th>From</th><th>Average</th></tr>
          </thead>
          <tbody className="divide-y divide-slate-200">
            {rows.map((r) => (
              <tr key={r.label}>
                <td className="px-5 py-4">
                  <span className="block font-medium">{r.label}</span>
                  <span className="block text-sm text-slate-500">{r.sub}</span>
                </td>
                {r.count > 0 ? (
                  <td className="px-5 py-4 text-right">
                    <span className="block text-xl font-bold tabular-nums">from £{r.from.toFixed(0)}</span>
                    <span className="block text-sm text-slate-500 tabular-nums">average £{r.typical.toFixed(0)}</span>
                  </td>
                ) : (
                  <td className="px-5 py-4 text-right text-sm text-slate-500">No price right now</td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );

  return (
    <>
    <SiteHeader />
    <main className="bg-white text-slate-900 font-sans antialiased">
      <div className="max-w-4xl mx-auto px-4 md:px-6 py-12 md:py-20">
        <h1 className="text-3xl md:text-4xl font-bold tracking-tight">Airport parking price guide</h1>
        <p className="mt-2 text-sm text-slate-500">Updated {updatedLabel}</p>
        <p className="mt-4 text-lg text-slate-600 leading-relaxed max-w-3xl">
          Example prices for Meet &amp; Greet and Park &amp; Ride at Luton and Heathrow, worked out from our current rates,
          the same ones used for real bookings. Each row shows the lowest price and the average across the operators we
          list, for a booking made about three weeks ahead.
        </p>
        <p className="mt-3 text-sm text-slate-500 max-w-3xl">
          These are AeroPark Direct&apos;s own prices, not a survey of the wider market. Your price depends on your dates,
          so <Link href="/" className="text-slate-700 underline underline-offset-4">search your trip</Link> for an exact figure.
        </p>

        <section aria-labelledby="ltn-heading" className="mt-12">
          <h2 id="ltn-heading" className="text-2xl font-bold tracking-tight">Luton Airport (LTN)</h2>
          <div className="mt-5 grid gap-5 md:grid-cols-2">
            {table("Meet & Greet", lutonMG)}
            {table("Park & Ride", lutonPR, true)}
          </div>
        </section>

        <section aria-labelledby="lhr-heading" className="mt-12">
          <h2 id="lhr-heading" className="text-2xl font-bold tracking-tight">Heathrow Airport (LHR)</h2>
          <div className="mt-5 grid gap-5 md:grid-cols-2">
            {table("Meet & Greet", heathrowMG)}
            {table("Park & Ride", heathrowPR)}
          </div>
        </section>

        <section aria-labelledby="affects-heading" className="mt-14 rounded-xl border border-slate-200 bg-slate-50 p-6 md:p-8">
          <h2 id="affects-heading" className="text-2xl font-bold tracking-tight">What affects your price</h2>
          <dl className="mt-6 grid gap-6 md:grid-cols-2">
            <div>
              <dt className="font-semibold">How far ahead you book</dt>
              <dd className="mt-1 text-slate-600 leading-relaxed">Prices at most operators rise as your drop-off date gets closer. Booking a few weeks ahead is usually cheaper than booking the night before.</dd>
            </div>
            <div>
              <dt className="font-semibold">The day you leave</dt>
              <dd className="mt-1 text-slate-600 leading-relaxed">Friday, Saturday and Sunday departures usually cost more than a midweek drop-off.</dd>
            </div>
            <div>
              <dt className="font-semibold">How long you&apos;re away</dt>
              <dd className="mt-1 text-slate-600 leading-relaxed">Longer stays cost more in total but often work out cheaper per day than a short break.</dd>
            </div>
            <div>
              <dt className="font-semibold">Fees on the day</dt>
              <dd className="mt-1 text-slate-600 leading-relaxed">Some operators have an airport car park or drop-off fee you pay on the day. We show it before you pay. AeroPark Exclusive has none.</dd>
            </div>
          </dl>
        </section>

        <section aria-labelledby="faq-heading" className="mt-14">
          <h2 id="faq-heading" className="text-2xl font-bold tracking-tight">Questions</h2>
          <dl className="mt-6 divide-y divide-slate-200 border-y border-slate-200">
            {faqs.map((f) => (
              <div key={f.q} className="py-5">
                <dt className="font-semibold">{f.q}</dt>
                <dd className="mt-2 text-slate-600 leading-relaxed">{f.a}</dd>
              </div>
            ))}
          </dl>
        </section>

        <section className="mt-14 rounded-xl bg-[#0B1120] p-6 md:p-10 text-white">
          <h2 className="text-2xl font-bold tracking-tight">See the price for your dates</h2>
          <p className="mt-2 text-slate-300">Enter your trip and compare the operators we list at Luton and Heathrow.</p>
          <Link href="/" className="mt-6 inline-flex items-center gap-2 h-12 px-6 rounded-lg bg-blue-600 hover:bg-blue-700 font-semibold">
            Search parking <ArrowRight className="w-4 h-4" aria-hidden="true" />
          </Link>
        </section>
      </div>
    </main>

      <SiteFooter />

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
    </>
  );
}
