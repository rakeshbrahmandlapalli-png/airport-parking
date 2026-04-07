import Link from "next/link";
import { ArrowLeft, Plane } from "lucide-react";

export default function PrivacyPage() {
  return (
    <main className="min-h-screen bg-[#F8FAFC] selection:bg-blue-600 selection:text-white">
      {/* Simple Header */}
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

      {/* Content */}
      <div className="max-w-3xl mx-auto px-6 py-20">
        <h1 className="text-4xl md:text-5xl font-black text-slate-900 mb-4 uppercase tracking-tight">Privacy Policy.</h1>
        <p className="text-slate-500 font-medium mb-12">Last updated: {new Date().toLocaleDateString()}</p>

        <div className="prose prose-slate max-w-none prose-headings:font-black prose-headings:uppercase prose-headings:tracking-tight space-y-8 text-slate-600">
          <section>
            <h2 className="text-2xl text-slate-900 mb-4">1. Information We Collect</h2>
            <p>We collect information to provide better services to our users. When you make a booking, we ask for personal information, like your name, email address, telephone number, and vehicle details to facilitate the Meet & Greet service.</p>
          </section>
          <section>
            <h2 className="text-2xl text-slate-900 mb-4">2. How We Use Information</h2>
            <p>We use the information we collect from all of our services to provide, maintain, protect and improve them, to develop new ones, and to protect AirportVIP and our users. We may use your email address to inform you about your booking.</p>
          </section>
          <section>
            <h2 className="text-2xl text-slate-900 mb-4">3. Data Security</h2>
            <p>We work hard to protect our users from unauthorized access to or unauthorized alteration, disclosure, or destruction of information we hold. We review our information collection, storage, and processing practices, including physical security measures.</p>
          </section>
        </div>
      </div>
    </main>
  );
}