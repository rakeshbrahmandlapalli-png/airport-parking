import Link from "next/link";
import { ArrowRight, Bus, Car, Check, Clock, Coffee, Zap } from "lucide-react";
import SiteHeader from "@/components/site/SiteHeader";
import SiteFooter from "@/components/site/SiteFooter";

// Availability as of now: Meet & Greet at both airports, Park & Ride at
// Heathrow only (Luton is coming soon). Keep in step with /select-service.

function Availability({ items }: { items: { label: string; href?: string; soon?: boolean }[] }) {
  return (
    <ul className="mt-5 flex flex-wrap gap-2">
      {items.map((i) =>
        i.soon ? (
          <li key={i.label} className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-500">
            <Clock className="w-4 h-4" aria-hidden="true" /> {i.label}: coming soon
          </li>
        ) : (
          <li key={i.label}>
            <Link href={i.href!} className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium text-slate-900 hover:border-slate-500">
              <Check className="w-4 h-4 text-emerald-600" aria-hidden="true" /> {i.label}
            </Link>
          </li>
        )
      )}
    </ul>
  );
}

const LUTON_STEPS = [
  { title: "Head to Terminal Car Park 1", desc: "Follow the signs for London Luton Airport, then for Terminal Car Park 1, and take a ticket at the barrier." },
  { title: "Drive to Level 3, Row A", desc: "This is the usual Meet & Greet meeting point. Your confirmation email gives the exact spot for your operator." },
  { title: "Hand over your keys", desc: "The driver takes your car from there, and you're a short walk from departures." },
];

export default function ServicesPage() {
  return (
    <>
      <SiteHeader />
      <main className="bg-white text-slate-900 font-sans antialiased">
        <div className="max-w-3xl mx-auto px-4 md:px-6 py-12 md:py-20">
          <h1 className="text-3xl md:text-4xl font-bold tracking-tight">Our parking services</h1>
          <p className="mt-4 text-lg text-slate-600 leading-relaxed">
            Meet &amp; Greet at Luton and Heathrow, and Park &amp; Ride at Heathrow. Every operator we list is insured, and
            we check every compound before we list it.
          </p>

          {/* Meet & Greet */}
          <section aria-labelledby="mg-heading" className="mt-12 rounded-xl border border-slate-200 p-6 md:p-8">
            <div className="flex items-center gap-3">
              <Car className="w-6 h-6 text-blue-700" aria-hidden="true" />
              <h2 id="mg-heading" className="text-2xl font-bold tracking-tight">Meet &amp; Greet</h2>
            </div>
            <p className="mt-4 text-slate-700 leading-relaxed">
              Drive to the terminal, hand your keys to a driver and walk to check-in. The driver parks your car at the
              operator&apos;s compound and brings it back for you when you return. No shuttle bus in either direction.
            </p>
            <p className="mt-3 text-slate-600 leading-relaxed">
              A good fit if you have heavy luggage, young children, or a tight schedule.
            </p>
            <Availability
              items={[
                { label: "Luton", href: "/luton-meet-and-greet" },
                { label: "Heathrow T2–T5", href: "/heathrow-meet-and-greet" },
              ]}
            />

            <div className="mt-8 border-t border-slate-200 pt-6">
              <h3 className="text-lg font-semibold">On the day at Luton</h3>
              <ol className="mt-4 space-y-5">
                {LUTON_STEPS.map((s, i) => (
                  <li key={s.title} className="flex gap-4">
                    <span className="w-8 h-8 rounded-full bg-[#0B1120] text-white text-sm font-semibold flex items-center justify-center shrink-0" aria-hidden="true">{i + 1}</span>
                    <div>
                      <p className="font-semibold">{s.title}</p>
                      <p className="mt-1 text-slate-600 leading-relaxed">{s.desc}</p>
                    </div>
                  </li>
                ))}
              </ol>
            </div>
          </section>

          {/* Park & Ride */}
          <section aria-labelledby="pr-heading" className="mt-6 rounded-xl border border-slate-200 p-6 md:p-8">
            <div className="flex items-center gap-3">
              <Bus className="w-6 h-6 text-blue-700" aria-hidden="true" />
              <h2 id="pr-heading" className="text-2xl font-bold tracking-tight">Park &amp; Ride</h2>
            </div>
            <p className="mt-4 text-slate-700 leading-relaxed">
              Drive to the operator&apos;s site, park your car and take the transfer to the terminal. When you get back, the
              transfer takes you to your car. It usually costs less than Meet &amp; Greet.
            </p>
            <Availability
              items={[
                { label: "Heathrow", href: "/heathrow-park-and-ride" },
                { label: "Luton", soon: true },
              ]}
            />
            <p className="mt-4 text-sm text-slate-500">
              Flying from Luton before then? <Link href="/luton-meet-and-greet" className="text-slate-700 underline underline-offset-4">Meet &amp; Greet at Luton</Link> is available now.
            </p>
          </section>

          {/* Extras */}
          <section aria-labelledby="extras-heading" className="mt-12">
            <h2 id="extras-heading" className="text-2xl font-bold tracking-tight">Extras</h2>
            <div className="mt-6 grid gap-6 sm:grid-cols-2">
              <div>
                <Zap className="w-6 h-6 text-blue-700" aria-hidden="true" />
                <h3 className="mt-3 text-lg font-semibold">Fast Track security</h3>
                <p className="mt-1.5 text-slate-600 leading-relaxed">Skip the main security queue. Add passes for your group when you book.</p>
              </div>
              <div>
                <Coffee className="w-6 h-6 text-slate-400" aria-hidden="true" />
                <h3 className="mt-3 text-lg font-semibold text-slate-500">Airport lounge</h3>
                <p className="mt-1.5 text-slate-500 leading-relaxed">Coming soon.</p>
              </div>
            </div>
          </section>

          {/* Fees */}
          <section aria-labelledby="fees-heading" className="mt-12 rounded-xl border border-slate-200 bg-slate-50 p-6 md:p-8">
            <h2 id="fees-heading" className="text-xl font-bold tracking-tight">Airport car park fees</h2>
            <p className="mt-3 text-slate-700 leading-relaxed">
              Some operators include the airport car park or drop-off fee in their price and some don&apos;t. Where there&apos;s
              a fee to pay on the day, it&apos;s shown on the operator&apos;s listing and at checkout before you pay.
            </p>
          </section>

          <div className="mt-12">
            <Link href="/" className="inline-flex items-center gap-2 h-12 px-6 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-semibold">
              Search parking <ArrowRight className="w-4 h-4" aria-hidden="true" />
            </Link>
          </div>
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
