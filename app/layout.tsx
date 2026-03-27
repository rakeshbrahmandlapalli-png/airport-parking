import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import Link from "next/link";
import { PlaneTakeoff, User } from "lucide-react";

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
        <nav className="fixed top-0 w-full z-[100] bg-white border-b border-slate-100">
          <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
            <Link href="/" className="flex items-center gap-2">
              <div className="bg-blue-600 p-2 rounded-xl">
                <PlaneTakeoff className="text-white w-6 h-6" />
              </div>
              <span className="font-black text-xl tracking-tighter text-blue-900 uppercase">
                Airport<span className="text-blue-600">VIP</span>
              </span>
            </Link>
            <Link href="/admin" className="flex items-center gap-2 bg-slate-900 text-white px-4 py-2 rounded-xl text-sm font-bold">
              <User size={16} /> Admin
            </Link>
          </div>
        </nav>
        <main className="pt-20">
          {children}
        </main>
      </body>
    </html>
  );
}