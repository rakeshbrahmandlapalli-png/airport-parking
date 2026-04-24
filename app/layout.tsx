import type { Metadata } from "next";
import "./globals.css";
import { Analytics } from "@vercel/analytics/next"; 
import Chatbot from "@/components/Chatbot";

export const metadata: Metadata = {
  title: "AeroPark Direct",
  description: "Your direct route to stress free travel at Luton and Heathrow.",
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