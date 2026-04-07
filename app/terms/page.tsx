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
            <h2 className="text-2xl text-slate-900 mb-4">1. Booking Conditions</h2>
            <p>By placing a booking with AirportVIP, you agree to these Terms and Conditions. All parking is subject to availability. You must ensure you leave enough time for your handover before your flight departs.</p>
          </section>
          <section>
            <h2 className="text-2xl text-slate-900 mb-4">2. Vehicle Condition</h2>
            <p>It is your responsibility to ensure your vehicle is roadworthy, holds a valid MOT certificate, and is taxed. We reserve the right to refuse to drive vehicles that appear unsafe or do not comply with road traffic regulations.</p>
          </section>
          <section>
            <h2 className="text-2xl text-slate-900 mb-4">3. Cancellations</h2>
            <p>Bookings can be cancelled up to 24 hours before your drop-off time for a full refund. Cancellations made within 24 hours of the drop-off time may be subject to a cancellation fee.</p>
          </section>
        </div>
      </div>
    </main>
  );
}