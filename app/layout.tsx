import type { Metadata } from "next";
import "./globals.css";
import Link from "next/link";
import { PlaneTakeoff, User } from "lucide-react";
import { Analytics } from "@vercel/analytics/next"; // 🔥 Added Analytics

export const metadata: Metadata = {
  title: "Airport VIP Parking",
  description: "Premium Meet & Greet",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="antialiased">
        <nav className="bg-white border-b sticky top-0 z-50">
          <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
            <Link href="/" className="flex items-center gap-2 font-black text-blue-900 uppercase tracking-tighter">
              <PlaneTakeoff className="text-blue-600 w-6 h-6" /> AirportVIP
            </Link>

            <div className="flex items-center gap-6">
              <Link 
                href="/manage" 
                className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 hover:text-blue-600 transition-colors"
              >
                Manage Trip
              </Link>

              <Link href="/admin/login" className="p-2 bg-slate-50 rounded-xl text-slate-400 hover:text-blue-600 transition-all">
                <User className="w-5 h-5" />
              </Link>
            </div>
          </div>
        </nav>

        {children}

        {/* 🔥 Analytics Tracker */}
        <Analytics /> 
      </body>
    </html>
  );
}