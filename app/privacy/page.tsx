import Link from "next/link";
import { ArrowLeft, Plane } from "lucide-react";

// ─────────────────────────────────────────────────────────────────────────────
// Company / controller details — single source of truth for the legal pages.
// Fill `ico` once you have your ICO registration number (register at ico.org.uk).
// Leaving it "" simply hides the ICO line; it never shows a placeholder live.
// ─────────────────────────────────────────────────────────────────────────────
const COMPANY = {
  name: "AeroPark Direct Ltd",
  number: "17211973",
  office: "66 Paul Street, London, England, United Kingdom, EC2A 4NA",
  email: "info@aeroparkdirect.co.uk",
  ico: "", // e.g. "ZB123456" — leave "" until registered
};

const LAST_UPDATED = "12 June 2026";

export default function PrivacyPage() {
  return (
    <main className="min-h-screen bg-[#F8FAFC] selection:bg-blue-600 selection:text-white">
      {/* Responsive Header */}
      <nav className="bg-white border-b border-slate-200 h-20 flex items-center px-6 sticky top-0 z-50">
        <div className="max-w-4xl mx-auto w-full flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2 text-slate-500 hover:text-blue-600 transition-colors font-bold text-sm touch-manipulation">
            <ArrowLeft className="w-4 h-4" /> <span className="hidden sm:inline">Back to Home</span><span className="sm:hidden">Back</span>
          </Link>
          <div className="flex items-center gap-2 text-blue-600 font-black tracking-tighter text-lg sm:text-xl uppercase">
            <Plane className="w-5 h-5 rotate-45" /> AEROPARK<span className="text-slate-900">DIRECT</span>
          </div>
        </div>
      </nav>

      {/* Content */}
      <div className="max-w-3xl mx-auto px-6 py-12 md:py-20">
        <h1 className="text-3xl md:text-5xl font-black text-slate-900 mb-4 uppercase tracking-tight">Privacy Policy.</h1>
        <p className="text-slate-500 font-medium mb-12">Last updated: {LAST_UPDATED}</p>

        <div className="prose prose-slate max-w-none prose-headings:font-black prose-headings:uppercase prose-headings:tracking-tight space-y-8 text-slate-600 text-sm md:text-base leading-relaxed">

          {/* WHO WE ARE */}
          <div className="bg-slate-100 p-6 md:p-8 rounded-2xl border border-slate-200">
            <h2 className="text-xl md:text-2xl text-slate-900 mb-4 mt-0">Who We Are</h2>
            <p className="m-0">
              {COMPANY.name} (&ldquo;we&rdquo;, &ldquo;us&rdquo;, &ldquo;our&rdquo;) is the data controller responsible for your personal
              data when you use this website to book airport parking. We are a company registered in England and Wales.
            </p>
            <ul className="list-none pl-0 mt-4 space-y-1.5">
              <li><strong className="text-slate-900">Company:</strong> {COMPANY.name}</li>
              <li><strong className="text-slate-900">Company number:</strong> {COMPANY.number}</li>
              <li><strong className="text-slate-900">Registered office:</strong> {COMPANY.office}</li>
              <li><strong className="text-slate-900">Contact:</strong> <a href={`mailto:${COMPANY.email}`} className="text-blue-600 font-semibold no-underline">{COMPANY.email}</a></li>
              {COMPANY.ico && <li><strong className="text-slate-900">ICO registration:</strong> {COMPANY.ico}</li>}
            </ul>
          </div>

          {/* OUR ROLE */}
          <section>
            <h2 className="text-xl md:text-2xl text-slate-900 mb-4 border-l-4 border-blue-600 pl-4">1. Our Role &amp; How Your Booking Works</h2>
            <p>
              {COMPANY.name} acts as a <strong>booking agent</strong>. We do not operate parking compounds or carry out the
              physical Meet &amp; Greet or Park &amp; Ride service ourselves. Those services are performed by independent,
              vetted third-party parking operators (&ldquo;Operators&rdquo;).
            </p>
            <p>
              For our premium <strong>AeroPark Exclusive</strong> service you do not need to choose an operator yourself &mdash; we
              select and assign the most suitable Operator on your behalf and include the listed benefits with your booking.
              In all cases, to deliver your booking we share the details you give us with the assigned Operator, who will also
              process your data under their own privacy notice.
            </p>
          </section>

          {/* INFO WE COLLECT */}
          <section>
            <h2 className="text-xl md:text-2xl text-slate-900 mb-4 border-l-4 border-blue-600 pl-4">2. Information We Collect</h2>
            <p>To arrange and fulfil your parking booking we collect:</p>
            <ul className="list-disc pl-5 mt-2 space-y-2">
              <li><strong>Personal details:</strong> name, email address and mobile phone number, used to confirm your booking and for driver/operator communication.</li>
              <li><strong>Vehicle information:</strong> make, model, colour and Vehicle Registration Mark (VRM), used to identify your car at the terminal and for barrier access.</li>
              <li><strong>Travel itinerary:</strong> airport, terminal, drop-off/return dates and times, and outbound/return flight numbers, used to schedule your handover and allow for flight delays.</li>
              <li><strong>Payment information:</strong> payments are handled by our payment processor, Stripe. We do not see or store your full card number &mdash; we only receive confirmation of payment and limited transaction details.</li>
              <li><strong>Communications:</strong> messages you send us by email, phone or web form, and our replies.</li>
              <li><strong>Technical &amp; usage data:</strong> IP address, device and browser type, and pages visited, collected via cookies and similar technologies (see section 6).</li>
            </ul>
          </section>

          {/* HOW WE USE / LAWFUL BASIS */}
          <section>
            <h2 className="text-xl md:text-2xl text-slate-900 mb-4 border-l-4 border-blue-600 pl-4">3. How We Use Your Data &amp; Our Lawful Basis</h2>
            <p>Under UK GDPR we must have a lawful basis for processing your personal data. Our purposes and bases are:</p>
            <div className="overflow-x-auto mt-4 not-prose">
              <table className="w-full text-sm border-collapse">
                <thead>
                  <tr className="bg-slate-100 text-slate-900 text-left">
                    <th className="border border-slate-200 px-3 py-2 font-bold">Purpose</th>
                    <th className="border border-slate-200 px-3 py-2 font-bold">Lawful basis</th>
                  </tr>
                </thead>
                <tbody className="text-slate-600">
                  <tr><td className="border border-slate-200 px-3 py-2">Processing your booking and passing your details to the assigned Operator</td><td className="border border-slate-200 px-3 py-2">Performance of a contract</td></tr>
                  <tr><td className="border border-slate-200 px-3 py-2">Taking payment and preventing fraudulent transactions</td><td className="border border-slate-200 px-3 py-2">Contract / Legitimate interests</td></tr>
                  <tr><td className="border border-slate-200 px-3 py-2">Sending booking confirmations, reminders and service messages (email/SMS)</td><td className="border border-slate-200 px-3 py-2">Performance of a contract</td></tr>
                  <tr><td className="border border-slate-200 px-3 py-2">Customer support and handling complaints</td><td className="border border-slate-200 px-3 py-2">Legitimate interests</td></tr>
                  <tr><td className="border border-slate-200 px-3 py-2">Optional marketing emails and review requests</td><td className="border border-slate-200 px-3 py-2">Consent</td></tr>
                  <tr><td className="border border-slate-200 px-3 py-2">Analytics and advertising cookies (e.g. Google)</td><td className="border border-slate-200 px-3 py-2">Consent</td></tr>
                  <tr><td className="border border-slate-200 px-3 py-2">Keeping transaction records for tax and accounting</td><td className="border border-slate-200 px-3 py-2">Legal obligation</td></tr>
                </tbody>
              </table>
            </div>
          </section>

          {/* WHO WE SHARE WITH */}
          <section>
            <h2 className="text-xl md:text-2xl text-slate-900 mb-4 border-l-4 border-blue-600 pl-4">4. Who We Share Your Data With</h2>
            <p><strong>We never sell your personal data.</strong> We share it only with the following parties, and only as needed to run our service:</p>
            <ul className="list-disc pl-5 mt-2 space-y-2">
              <li><strong>Parking Operators</strong> &mdash; the operator assigned to your booking, so they can deliver the service.</li>
              <li><strong>Stripe</strong> &mdash; secure payment processing.</li>
              <li><strong>Supabase</strong> &mdash; secure database hosting for your booking records.</li>
              <li><strong>Resend</strong> &mdash; sending transactional emails (confirmations, receipts).</li>
              <li><strong>Twilio</strong> &mdash; sending SMS booking notifications, where used.</li>
              <li><strong>Google</strong> &mdash; website analytics and advertising conversion measurement (only with your cookie consent).</li>
              <li><strong>Vercel</strong> &mdash; hosting for this website.</li>
              <li><strong>Airport authorities</strong> &mdash; we may share your VRM with London Luton Airport Operations Limited (LLAOL) or Heathrow Airport Limited (HAL) for Automatic Number Plate Recognition (ANPR) barrier access.</li>
              <li><strong>Authorities &amp; advisers</strong> &mdash; law enforcement, regulators or our professional advisers where we are legally required or permitted to do so.</li>
            </ul>
            <p className="mt-3">These providers act as our processors and are only permitted to use your data on our instructions.</p>
          </section>

          {/* CCTV / PHOTOS */}
          <section>
            <h2 className="text-xl md:text-2xl text-slate-900 mb-4 border-l-4 border-blue-600 pl-4">5. CCTV &amp; Vehicle Inspection by Operators</h2>
            <p>
              The Operators we book on your behalf may, as part of their service, photograph your vehicle at handover to record
              its condition, and may operate CCTV at their parking compounds for security. As these activities are carried out by
              the Operator, they are responsible for that data and their own privacy notice applies. Where such images are passed
              to us in connection with a query or claim, we handle them in line with this policy.
            </p>
          </section>

          {/* COOKIES */}
          <section>
            <h2 className="text-xl md:text-2xl text-slate-900 mb-4 border-l-4 border-blue-600 pl-4">6. Cookies &amp; Tracking</h2>
            <p>We use cookies and similar technologies for two purposes:</p>
            <ul className="list-disc pl-5 mt-2 space-y-2">
              <li><strong>Essential cookies</strong> &mdash; required for the site and checkout to function. These do not need consent.</li>
              <li><strong>Analytics &amp; advertising cookies</strong> &mdash; such as Google Ads/Analytics, used to measure performance and ad conversions. We only set these <strong>with your consent</strong>.</li>
            </ul>
            <p className="mt-3">You can withdraw consent or manage cookies at any time through your browser settings, or via any cookie-preferences control provided on our site.</p>
          </section>

          {/* INTERNATIONAL TRANSFERS */}
          <section>
            <h2 className="text-xl md:text-2xl text-slate-900 mb-4 border-l-4 border-blue-600 pl-4">7. International Transfers</h2>
            <p>
              Some of our providers (for example Stripe, Google and our hosting partners) may process data outside the United
              Kingdom. Where they do, we rely on appropriate safeguards &mdash; such as UK &lsquo;adequacy&rsquo; regulations, the
              International Data Transfer Agreement (IDTA), or Standard Contractual Clauses &mdash; to ensure your data remains protected.
            </p>
          </section>

          {/* RETENTION */}
          <section>
            <h2 className="text-xl md:text-2xl text-slate-900 mb-4 border-l-4 border-blue-600 pl-4">8. How Long We Keep Your Data</h2>
            <ul className="list-disc pl-5 mt-2 space-y-2">
              <li><strong>Booking &amp; transaction records:</strong> retained for up to 6 years to meet UK tax and accounting obligations.</li>
              <li><strong>Vehicle inspection photographs:</strong> taken and held by the Operator, typically for a short period after your vehicle is returned, in line with the Operator&rsquo;s policy.</li>
              <li><strong>Marketing data:</strong> kept until you withdraw consent or unsubscribe.</li>
              <li><strong>Analytics data:</strong> retained for the period set by the relevant provider.</li>
            </ul>
          </section>

          {/* YOUR RIGHTS */}
          <section>
            <h2 className="text-xl md:text-2xl text-slate-900 mb-4 border-l-4 border-blue-600 pl-4">9. Your Rights</h2>
            <p>Under UK data protection law you have the right to:</p>
            <ul className="list-disc pl-5 mt-2 space-y-2">
              <li>Access the personal data we hold about you;</li>
              <li>Have inaccurate data corrected;</li>
              <li>Request erasure of your data (where applicable);</li>
              <li>Restrict or object to certain processing;</li>
              <li>Data portability;</li>
              <li>Withdraw consent at any time (where we rely on consent).</li>
            </ul>
            <p className="mt-3">
              To exercise any of these rights, email us at <a href={`mailto:${COMPANY.email}`} className="text-blue-600 font-semibold">{COMPANY.email}</a>.
              You also have the right to complain to the UK Information Commissioner&rsquo;s Office (ICO) at{" "}
              <a href="https://ico.org.uk" target="_blank" rel="noopener noreferrer" className="text-blue-600 font-semibold">ico.org.uk</a> or on 0303 123 1113.
            </p>
          </section>

          {/* CHILDREN */}
          <section>
            <h2 className="text-xl md:text-2xl text-slate-900 mb-4 border-l-4 border-blue-600 pl-4">10. Children</h2>
            <p>Our service is intended for adults aged 18 or over. We do not knowingly collect data from children.</p>
          </section>

          {/* CHANGES */}
          <section>
            <h2 className="text-xl md:text-2xl text-slate-900 mb-4 border-l-4 border-blue-600 pl-4">11. Changes to This Policy</h2>
            <p>
              We may update this policy from time to time. The latest version will always be published on this page with the
              &ldquo;Last updated&rdquo; date above. We encourage you to review it periodically.
            </p>
          </section>

          {/* CONTACT */}
          <section>
            <h2 className="text-xl md:text-2xl text-slate-900 mb-4 border-l-4 border-blue-600 pl-4">12. Contact Us</h2>
            <p>
              For any privacy question or request, contact {COMPANY.name} at{" "}
              <a href={`mailto:${COMPANY.email}`} className="text-blue-600 font-semibold">{COMPANY.email}</a>, or write to us at {COMPANY.office}.
            </p>
          </section>
        </div>
      </div>
    </main>
  );
}
