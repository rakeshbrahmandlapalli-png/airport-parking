import type { Metadata } from "next";
import "./globals.css";
import { Analytics } from "@vercel/analytics/next"; 
import { GoogleAnalytics } from '@next/third-parties/google'; // 🔥 Added GA4 Import
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
    <html lang="en" suppressHydrationWarning>
      <body className="antialiased bg-[#F8FAFC]" suppressHydrationWarning>
        
        {/* Main Page Content */}
        {children}

        {/* Vercel Speed & Traffic Analytics */}
        <Analytics /> 
        
        {/* Google Analytics 4 - Integrated with G-4QPSFJJD6S */}
        <GoogleAnalytics gaId="G-4QPSFJJD6S" />
        
        {/* 24/7 AI Support Agent */}
        <Chatbot />
        
      </body>
    </html>
  );
}