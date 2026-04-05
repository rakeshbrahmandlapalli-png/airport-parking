import type { Metadata } from "next";
import "./globals.css";
import { Analytics } from "@vercel/analytics/next"; 
import Chatbot from "@/components/Chatbot";

export const metadata: Metadata = {
  title: "Airport VIP Parking | Premium Meet & Greet",
  description: "Luton and Heathrow's elite Meet & Greet service. Drive directly to the terminal.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="antialiased bg-[#F8FAFC]">
        
        {/* Page Content (Your HomePage with its own custom Navbar will render here) */}
        {children}

        {/* 🔥 Analytics Tracker */}
        <Analytics /> 
        
        {/* 🔥 The 24/7 AI Support Agent */}
        <Chatbot />
        
      </body>
    </html>
  );
}