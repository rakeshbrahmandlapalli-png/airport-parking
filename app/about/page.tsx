import Link from "next/link";
import { ArrowRight, Check, CheckCircle2, Phone, PlaneTakeoff, ShieldCheck, Tag } from "lucide-react";
import SiteHeader from "@/components/site/SiteHeader";
import SiteFooter from "@/components/site/SiteFooter";
import { AeroAvatar } from "@/components/AeroFeature";
import { COMPANY } from "@/app/lib/company";

// Only claims the business has confirmed: operators are insured and every
// compound is checked before it is listed. Check before adding anything else.
const VALUES = [
  {
    Icon: ShieldCheck,
    title: "Checked, insured operators",
    desc: "We check every compound before we list it, and every operator we list is insured. We don't run car parks; we only list the ones that meet our standard.",
  },
  {
    Icon: Tag,
    title: "Clear pricing",
    desc: "You see the total for your dates before you pay, and you can cancel free of charge up to 24 hours before drop-off.",
  },
  {
    Icon: PlaneTakeoff,
    title: "Your return flight on file",
    desc: "Add your return flight number when you book so your operator knows when you're due back. If your plans change, call the number in your confirmation email.",
  },
  {
    Icon: Phone,
    title: "A person on the phone",
    desc: `Questions before or during your trip? Call or text us on ${COMPANY.phoneDisplay}. You'll speak to our team, not a call centre.`,
  },
];

const AERO_POINTS = [
  "Give it your flight number and it works out the airport and terminal.",
  "Understands dates like “next Friday for a week” or “back Sunday night”.",
  "Shows you what it understood before you go any further.",
];

export default function About() {
  return (
    <>
      <SiteHeader />
      <main className="bg-white text-slate-900 font-sans antialiased">
        <div className="max-w-3xl mx-auto px-4 md:px-6 py-12 md:py-20">
          <h1 className="text-3xl md:text-4xl font-bold tracking-tight">About AeroPark Direct</h1>
          <p className="mt-4 text-lg text-slate-600 leading-relaxed">
            We&apos;re a UK airport parking agent for Luton and Heathrow. We don&apos;t run car parks. We list Meet &amp; Greet
            and Park &amp; Ride operators we have checked, and we&apos;re your point of contact from booking to return.
          </p>

          <section aria-labelledby="why-heading" className="mt-14">
            <h2 id="why-heading" className="text-2xl font-bold tracking-tight">Why we started</h2>
            <div className="mt-4 space-y-4 text-slate-700 leading-relaxed">
              <p>
                Airport parking has a reputation problem. Fees nobody mentioned at the barrier. Operators nobody has checked.
                Cars handed to a stranger with no clear idea of where they&apos;ll end up. For a lot of people it&apos;s the most
                stressful part of the trip, before the trip has even started.
              </p>
              <p>
                We built AeroPark Direct to fix that. We check the compounds before we list them, we only list insured operators
                at Luton and Heathrow, and we stay your point of contact from drop-off to return. If something needs sorting,
                you call us.
              </p>
            </div>
          </section>

          <section aria-labelledby="founder-heading" className="mt-14 rounded-xl border border-slate-200 bg-slate-50 p-6 md:p-8">
            <h2 id="founder-heading" className="text-2xl font-bold tracking-tight">Built by someone from the industry</h2>
            <blockquote className="mt-5 border-l-2 border-blue-600 pl-5">
              <p className="text-lg text-slate-800 leading-relaxed">
                &ldquo;After fifteen years inside this industry, I&rsquo;d seen enough holidays ruined before they started:
                bookings made on fake websites, cars handed to unlicensed operators, fees nobody warned you about at the
                barrier. AeroPark Direct is the service I always believed travellers deserved: checked operators, honest
                prices, and a real person on the phone.&rdquo;
              </p>
              <footer className="mt-3 text-sm font-medium text-slate-600">Rakesh, founder</footer>
            </blockquote>
            <ul className="mt-6 space-y-2.5">
              {[
                "15 years of hands-on experience in UK airport parking",
                "Every operator checked personally before it’s listed",
                "A team of four, with real people answering the phone",
              ].map((t) => (
                <li key={t} className="flex gap-3 text-slate-700">
                  <Check className="w-5 h-5 text-blue-700 shrink-0 mt-0.5" aria-hidden="true" />
                  <span>{t}</span>
                </li>
              ))}
            </ul>
          </section>

          <section aria-labelledby="values-heading" className="mt-14">
            <h2 id="values-heading" className="text-2xl font-bold tracking-tight">What you can expect</h2>
            <div className="mt-6 grid gap-8 sm:grid-cols-2">
              {VALUES.map(({ Icon, title, desc }) => (
                <div key={title}>
                  <Icon className="w-6 h-6 text-blue-700" aria-hidden="true" />
                  <h3 className="mt-3 text-lg font-semibold">{title}</h3>
                  <p className="mt-1.5 text-slate-600 leading-relaxed">{desc}</p>
                </div>
              ))}
            </div>
          </section>

          <section aria-labelledby="aero-heading" className="mt-14 rounded-xl border border-slate-200 p-6 md:p-8">
            <div className="flex items-center gap-3">
              <AeroAvatar className="w-9 h-9" />
              <h2 id="aero-heading" className="text-2xl font-bold tracking-tight">Aero Magic Search</h2>
            </div>
            <p className="mt-4 text-slate-700 leading-relaxed">
              Aero is the search assistant on our homepage. Type or say your trip in one sentence, such as
              <span className="text-slate-900 font-medium"> &ldquo;Meet &amp; Greet at Heathrow next Friday, flight BA123&rdquo;</span>,
              and it fills in the search for you.
            </p>
            <ul className="mt-5 space-y-2.5">
              {AERO_POINTS.map((p) => (
                <li key={p} className="flex gap-3 text-slate-700">
                  <Check className="w-5 h-5 text-blue-700 shrink-0 mt-0.5" aria-hidden="true" />
                  <span>{p}</span>
                </li>
              ))}
            </ul>
          </section>

          <section className="mt-14 rounded-xl bg-[#0B1120] p-6 md:p-10 text-white">
            <h2 className="text-2xl font-bold tracking-tight">Find parking at Luton or Heathrow</h2>
            <p className="mt-2 text-slate-300">Compare Meet &amp; Greet and Park &amp; Ride operators for your dates.</p>
            <Link href="/" className="mt-6 inline-flex items-center gap-2 h-12 px-6 rounded-lg bg-blue-600 hover:bg-blue-700 font-semibold">
              Search parking <ArrowRight className="w-4 h-4" aria-hidden="true" />
            </Link>
            <p className="mt-5 flex flex-wrap gap-x-6 gap-y-2 text-sm text-slate-300">
              <span className="flex items-center gap-1.5"><CheckCircle2 className="w-4 h-4 text-emerald-400" aria-hidden="true" /> Free cancellation up to 24 hours</span>
              <span className="flex items-center gap-1.5"><ShieldCheck className="w-4 h-4 text-emerald-400" aria-hidden="true" /> Insured operators</span>
            </p>
          </section>
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
