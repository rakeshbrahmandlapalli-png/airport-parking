import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import Link from "next/link";
import { PlaneTakeoff, ShieldCheck, User } from "lucide-react";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "VIP Airport Parking | Meet & Greet",
  description: "Secure, reliable airport parking services.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={`${inter.className} bg-slate-50 text-slate-900`}>
        {/* GLOBAL NAVIGATION */}
        <nav className="fixed top-0 w-full z-[100] bg-white/80 backdrop-blur-md border-b border-slate-100">
          <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
            {/* LOGO */}
            <Link href="/" className="flex items-center gap-2 group">
              <div className="bg-blue-600 p-2 rounded-xl group-hover:rotate-12 transition-transform">
                <PlaneTakeoff className="text-white w-6 h-6" />
              </div>
              <span className="font-black text-xl tracking-tighter text-blue-900 uppercase">
                Airport<span className="text-blue-600">VIP</span>
              </span>
            </Link>

            {/* NAV LINKS */}
            <div className="hidden md:flex items-center gap-8 text-sm font-bold text-slate-500 uppercase tracking-widest">
              <Link href="/" className="hover:text-blue-600 transition-colors">Search</Link>
              <Link href="#" className="hover:text-blue-600 transition-colors">How it works</Link>
              <Link href="#" className="hover:text-blue-600 transition-colors">Support</Link>
            </div>

            {/* ACTION BUTTON */}
            <Link 
              href="/admin" 
              className="flex items-center gap-2 bg-slate-900 text-white px-5 py-2.5 rounded-xl text-sm font-bold hover:bg-blue-600 transition-all shadow-lg shadow-slate-200"
            >
              <User size={16} /> Admin
            </Link>
          </div>
        </nav>

        {/* PAGE CONTENT */}
        <main className="pt-20">
          {children}
        </main>

        {/* GLOBAL FOOTER */}
        <footer className="bg-slate-900 text-white py-20 px-6">
          <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-12">
            <div>
              <div className="flex items-center gap-2 mb-6">
                <PlaneTakeoff className="text-blue-400 w-6 h-6" />
                <span className="font-black text-xl uppercase">AirportVIP</span>
              </div>
              <p className="text-slate-400 text-sm leading-relaxed">
                The UK's leading Meet & Greet parking provider. Serving all major terminals with 24/7 security.
              </p>
            </div>
            <div className="space-y-4">
              <h4 className="font-bold uppercase tracking-widest text-xs text-blue-400">Security</h4>
              <div className="flex items-center gap-2 text-slate-300 text-sm italic">
                <ShieldCheck size={16} /> Fully Insured Drivers
              </div>
              <div className="flex items-center gap-2 text-slate-300 text-sm italic">
                <ShieldCheck size={16} /> CCTV Monitored Lots
              </div>
            </div>
            <div className="space-y-4">
              <h4 className="font-bold uppercase tracking-widest text-xs text-blue-400">Contact</h4>
              <p className="text-slate-300 text-sm">support@airportvip.co.uk</p>
              <p className="text-slate-300 text-sm">0800-PARK-VIP</p>
            </div>
          </div>
        </footer>
      </body>
    </html>
  );
}