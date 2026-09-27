import Link from "next/link";
import { ArrowRight, CheckCircle2, Phone, ShieldCheck } from "lucide-react";
import SiteHeader from "@/components/site/SiteHeader";
import SiteFooter from "@/components/site/SiteFooter";
import { AeroAvatar } from "@/components/AeroFeature";
import { COMPANY } from "@/app/lib/company";

const STEPS = [
  {
    title: "Search",
    desc: "Choose your airport and your drop-off and pick-up times on the homepage. Or describe your trip to Aero Magic Search, for example “Meet & Greet at Heathrow next Friday, flight BA123”, and it fills in the search for you.",
  },
  {
    title: "Choose a service and an operator",
    desc: "Pick Meet & Greet or Park & Ride, then compare the operators available for your dates, with the total price for your stay.",
  },
  {
    title: "Book and pay",
    desc: "Enter your details, your car registration and your return flight number, then pay by card through Stripe. Your confirmation email has your booking reference and the operator’s contact numbers.",
  },
  {
    title: "On the day",
    desc: "For Meet & Greet, drive to the terminal at your drop-off time and hand over your keys. For Park & Ride, drive to the operator’s site and take the transfer to the terminal. Your confirmation email tells you exactly where to go.",
  },
];

const REASONS = [
  { Icon: ShieldCheck, title: "Checked, insured operators", desc: "We check every compound before we list it, and every operator we list is insured." },
  { Icon: Phone, title: "One number to call", desc: `Questions before or during your trip? Call or text us on ${COMPANY.phoneDisplay}.` },
  { Icon: CheckCircle2, title: "Free cancellation", desc: "Cancel free of charge up to 24 hours before drop-off from the Manage booking page." },
];

const FAQS = [
  {
    q: "What if my return flight is delayed?",
    a: "Add your return flight number when you book so your operator knows when you’re due back. If your flight is delayed or cancelled, call the operator on the number in your confirmation email, or call us.",
  },
  {
    q: "Where do I pay the airport entry fee?",
    a: "For Premium Plus services, the entry fee is included. For other services, follow the signs to the Short Stay car park and pay at the machine as instructed.",
  },
  {
    q: "What if I arrive earlier or later than booked?",
    a: "Call the number in your confirmation email as soon as you know, so the operator can be ready for you.",
  },
  {
    q: "Can I cancel?",
    a: "Yes. Cancel free of charge up to 24 hours before drop-off from the Manage booking page. Inside 24 hours the booking still cancels, and we review the refund and come back to you within one working day.",
  },
];

export default function HowItWorks() {
  return (
    <>
      <SiteHeader />
      <main className="bg-white text-slate-900 font-sans antialiased">
        <div className="max-w-3xl mx-auto px-4 md:px-6 py-12 md:py-20">
          <h1 className="text-3xl md:text-4xl font-bold tracking-tight">How it works</h1>
          <p className="mt-4 text-lg text-slate-600 leading-relaxed">
            Booking airport parking with us takes a few minutes. Here&apos;s what happens from search to drop-off.
          </p>

          <ol className="mt-10 space-y-8">
            {STEPS.map((s, i) => (
              <li key={s.title} className="flex gap-4">
                <span className="w-9 h-9 rounded-full bg-[#0B1120] text-white text-sm font-semibold flex items-center justify-center shrink-0" aria-hidden="true">{i + 1}</span>
                <div>
                  <h2 className="text-lg font-semibold flex items-center gap-2">
                    {s.title}
                    {i === 0 && <AeroAvatar className="w-5 h-5" />}
                  </h2>
                  <p className="mt-1.5 text-slate-600 leading-relaxed">{s.desc}</p>
                </div>
              </li>
            ))}
          </ol>

          <section aria-labelledby="why-heading" className="mt-14 rounded-xl border border-slate-200 bg-slate-50 p-6 md:p-8">
            <h2 id="why-heading" className="text-2xl font-bold tracking-tight">Why book through us</h2>
            <div className="mt-6 grid gap-6 sm:grid-cols-3">
              {REASONS.map(({ Icon, title, desc }) => (
                <div key={title}>
                  <Icon className="w-6 h-6 text-blue-700" aria-hidden="true" />
                  <h3 className="mt-3 font-semibold">{title}</h3>
                  <p className="mt-1.5 text-sm text-slate-600 leading-relaxed">{desc}</p>
                </div>
              ))}
            </div>
          </section>

          <section aria-labelledby="faq-heading" className="mt-14">
            <h2 id="faq-heading" className="text-2xl font-bold tracking-tight">Questions</h2>
            <div className="mt-6 divide-y divide-slate-200 border-y border-slate-200">
              {FAQS.map((f) => (
                <details key={f.q} className="group py-4">
                  <summary className="cursor-pointer list-none flex items-center justify-between gap-4 font-semibold">
                    {f.q}
                    <span className="text-slate-400 group-open:rotate-45 transition-transform text-xl leading-none" aria-hidden="true">+</span>
                  </summary>
                  <p className="mt-3 text-slate-600 leading-relaxed">{f.a}</p>
                </details>
              ))}
            </div>
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
