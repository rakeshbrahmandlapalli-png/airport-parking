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
            <Plane className="w-5 h-5 rotate-45" /> AEROPARK<span className="text-slate-900">DIRECT</span>
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
            <p>To facilitate our elite Meet & Greet services at Luton and Heathrow airports, we collect essential personal and vehicular data. This includes:</p>
            <ul>
                <li><strong>Personal Details:</strong> Name, email address, and mobile phone number for driver communications.</li>
                <li><strong>Vehicle Information:</strong> Make, model, color, and Vehicle Registration Mark (VRM) to identify your car at the terminal drop-off zones.</li>
                <li><strong>Travel Itinerary:</strong> Outbound and return flight numbers, and expected arrival times to monitor flight delays and adjust staff schedules accordingly.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl text-slate-900 mb-4">2. CCTV and Photographic Data</h2>
            <p>For your peace of mind and our mutual protection, our chauffeurs conduct a rapid digital photographic inspection of your vehicle during the handover process at the Luton Airport TCP1. These images are stored securely and used solely to verify the vehicle's pre-existing condition. Additionally, our private parking compounds operate 24/7 HD CCTV monitoring.</p>
          </section>

          <section>
            <h2 className="text-2xl text-slate-900 mb-4">3. Data Sharing and Airport Authorities</h2>
            <p>We do not sell your personal data to third parties. However, as an operator at major UK airports, we may be required to share your Vehicle Registration Mark (VRM) with London Luton Airport Operations Limited (LLAOL) or Heathrow Airport Limited (HAL) for Automatic Number Plate Recognition (ANPR) barrier access, or with local law enforcement if legally obligated.</p>
          </section>
          
          <section>
            <h2 className="text-2xl text-slate-900 mb-4">4. Data Retention</h2>
            <p>Photographic inspection data is retained for 14 days following the return of your vehicle, after which it is securely deleted, provided no claims have been raised. General booking data is retained for tax and accounting purposes as required by UK law.</p>
          </section>
        </div>
      </div>
    </main>
  );
}