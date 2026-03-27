import type { Metadata } from "next";
import "./globals.css";
import Link from "next/link";
import { PlaneTakeoff, User } from "lucide-react";

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
      <body>
        <nav className="bg-white border-b sticky top-0 z-50">
          <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
            <Link href="/" className="flex items-center gap-2 font-black text-blue-900 uppercase">
              <PlaneTakeoff className="text-blue-600" /> AirportVIP
            </Link>
            <Link href="/admin" className="text-sm font-bold flex items-center gap-1">
              <User size={16} /> Admin
            </Link>
          </div>
        </nav>
        {children}
      </body>
    </html>
  );
}