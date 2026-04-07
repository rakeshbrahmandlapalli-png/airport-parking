import Link from "next/link";
import { ArrowLeft, Plane } from "lucide-react";

export default function TermsPage() {
  return (
    <main className="min-h-screen bg-[#F8FAFC] selection:bg-blue-600 selection:text-white">
      <nav className="bg-white border-b border-slate-200 h-20 flex items-center px-6 sticky top-0 z-50">
        <div className="max-w-4xl mx-auto w-full flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2 text-slate-500 hover:text-blue-600 transition-colors font-bold text-sm">
            <ArrowLeft className="w-4 h-4" /> Back to Home
          </Link>
          <div className="flex items-center gap-2 text-blue-600 font-black tracking-tighter text-xl uppercase">
            <Plane className="w-5 h-5 rotate-45" /> AIRPORT<span className="text-slate-900">VIP</span>
          </div>
        </div>
      </nav>

      <div className="max-w-3xl mx-auto px-6 py-20">
        <h1 className="text-4xl md:text-5xl font-black text-slate-900 mb-4 uppercase tracking-tight">Terms of Service.</h1>
        <p className="text-slate-500 font-medium mb-12">Effective from: January 1, {new Date().getFullYear()}</p>

        <div className="prose prose-slate max-w-none prose-headings:font-black prose-headings:uppercase prose-headings:tracking-tight space-y-8 text-slate-600">
          
          <section>
            <h2 className="text-2xl text-slate-900 mb-4">1. Luton & Heathrow Meet & Greet Protocol</h2>
            <p>Our Meet & Greet service requires you to call our operations team 20 minutes prior to arriving at your designated terminal. For <strong>London Luton Airport (LTN)</strong>, the handover takes place in the designated zones within the Short Stay Car Park (Terminal 1). AirportVIP covers the cost of terminal entry and exit fees within your booking price, provided you arrive within your scheduled window.</p>
          </section>

          <section>
            <h2 className="text-2xl text-slate-900 mb-4">2. Flight Delays and Changes</h2>
            <p>We actively monitor all return flights. If your flight is delayed, we will adjust our chauffeur schedules accordingly at no extra cost, up to midnight of your scheduled return date. Delays pushing your return into a new calendar day may incur a standard daily parking overstay fee.</p>
          </section>

          <section>
            <h2 className="text-2xl text-slate-900 mb-4">3. Vehicle Condition & Liability</h2>
            <p>Upon handover, our chauffeurs will conduct a rapid photographic inspection. We accept liability for any damage directly caused by our drivers while moving your vehicle between the airport terminal and our secure compound. We do not accept liability for:</p>
            <ul>
                <li>Pre-existing damage, minor scratches, or stone chips not visible in standard lighting conditions.</li>
                <li>Mechanical or electrical failure of the vehicle while in our care (e.g., flat batteries, engine faults).</li>
                <li>Loss of personal valuables left inside the vehicle. Please remove all non-essential high-value items.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl text-slate-900 mb-4">4. Roadworthiness</h2>
            <p>Your vehicle must be roadworthy, hold a valid MOT certificate, and be legally taxed for use on UK roads. If our chauffeurs deem a vehicle unsafe to drive (e.g., bald tires, malfunctioning brakes), we reserve the right to refuse service without a refund.</p>
          </section>

          <section>
            <h2 className="text-2xl text-slate-900 mb-4">5. Cancellations</h2>
            <p>Bookings can be cancelled up to 24 hours before your scheduled drop-off time for a full refund minus a small administrative fee. Cancellations made within 24 hours of the drop-off time are non-refundable.</p>
          </section>
        </div>
      </div>
    </main>
  );
}