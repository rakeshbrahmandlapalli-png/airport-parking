import Link from "next/link";
import { ArrowLeft, Plane, Mail, Phone, MapPin } from "lucide-react";

export default function ContactPage() {
  return (
    <main className="min-h-screen bg-[#F8FAFC] selection:bg-blue-600 selection:text-white">
      <nav className="bg-white border-b border-slate-200 h-20 flex items-center px-6 sticky top-0 z-50">
        <div className="max-w-6xl mx-auto w-full flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2 text-slate-500 hover:text-blue-600 transition-colors font-bold text-sm">
            <ArrowLeft className="w-4 h-4" /> Back to Home
          </Link>
          <div className="flex items-center gap-2 text-blue-600 font-black tracking-tighter text-xl uppercase">
            <Plane className="w-5 h-5 rotate-45" /> AIRPORT<span className="text-slate-900">VIP</span>
          </div>
        </div>
      </nav>

      <div className="max-w-6xl mx-auto px-6 py-20 grid grid-cols-1 md:grid-cols-2 gap-16">
        <div>
          <h1 className="text-4xl md:text-5xl font-black text-slate-900 mb-6 uppercase tracking-tight">Contact <br/><span className="text-blue-600">Support.</span></h1>
          <p className="text-lg text-slate-500 font-medium mb-12 max-w-md">Our premium support team is available 24/7 to assist with your bookings, changes, or general inquiries.</p>
          
          <div className="space-y-8">
            <div className="flex items-center gap-5">
              <div className="w-14 h-14 bg-blue-100 rounded-2xl flex items-center justify-center text-blue-600">
                <Phone className="w-6 h-6" />
              </div>
              <div>
                <p className="text-sm font-bold text-slate-400 uppercase tracking-widest">Emergency Hotline</p>
                <p className="text-xl font-black text-slate-900">+44 (0) 000 000 1234</p>
              </div>
            </div>
            <div className="flex items-center gap-5">
              <div className="w-14 h-14 bg-blue-100 rounded-2xl flex items-center justify-center text-blue-600">
                <Mail className="w-6 h-6" />
              </div>
              <div>
                <p className="text-sm font-bold text-slate-400 uppercase tracking-widest">Email Support</p>
                <p className="text-xl font-black text-slate-900">support@airportvip.com</p>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-[2.5rem] p-10 shadow-xl border border-slate-100">
          <h3 className="text-2xl font-black text-slate-900 mb-8 uppercase tracking-tight">Send a Message</h3>
          <form className="flex flex-col gap-6">
            <div>
              <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2 block">Your Name</label>
              <input type="text" className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 font-bold text-slate-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20" placeholder="John Doe" />
            </div>
            <div>
              <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2 block">Booking Reference (Optional)</label>
              <input type="text" className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 font-bold text-slate-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20" placeholder="e.g. VIP-12345" />
            </div>
            <div>
              <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2 block">Message</label>
              <textarea rows={4} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 font-bold text-slate-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20" placeholder="How can we help?"></textarea>
            </div>
            <button type="button" className="w-full h-14 bg-blue-600 hover:bg-blue-500 text-white font-black rounded-xl shadow-xl active:scale-95 transition-all uppercase tracking-widest text-sm mt-4">
              Submit Request
            </button>
          </form>
        </div>
      </div>
    </main>
  );
}