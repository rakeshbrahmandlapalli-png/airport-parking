import type { Metadata } from "next";
import "./globals.css";
import { Analytics } from "@vercel/analytics/next"; 
import { GoogleAnalytics } from '@next/third-parties/google';
import Script from 'next/script';
import Chatbot from "@/components/Chatbot";
import PromoBanner from "@/components/PromoBanner"; 

export const metadata: Metadata = {
  title: "AeroPark Direct",
  description: "Your direct route to stress free travel at Luton and Heathrow.",
  // 🟢 Trustpilot Domain Verification
  verification: {
    other: {
      "trustpilot-one-time-domain-verification-id": "d267340e-b316-47f6-bec2-7e50d8b23d9c",
    },
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        {/* 🟢 Google Ads Base Tracking Tag */}
        <Script
          strategy="afterInteractive"
          src={`https://www.googletagmanager.com/gtag/js?id=AW-18163936640`}
        />
        <Script
          id="google-ads-config"
          strategy="afterInteractive"
          dangerouslySetInnerHTML={{
            __html: `
              window.dataLayer = window.dataLayer || [];
              function gtag(){dataLayer.push(arguments);}
              gtag('js', new Date());
              gtag('config', 'AW-18163936640');
            `,
          }}
        />
      </head>
      <body className="subpixel-antialiased bg-[#F8FAFC]" suppressHydrationWarning>
        
        {/* 🚀 Dynamic Banner containing LAUNCH10 and AERO15 hooks */}
        <PromoBanner />

        {/* 🔥 THIS IS THE MAGIC FIX: We wrap your page in a relative container 🔥 */}
        <main className="relative w-full">
          {children}
        </main>

        {/* Vercel Speed & Traffic Analytics */}
        <Analytics /> 
        
        {/* 🟢 CRITICAL FIX: Updated to match your actual Google Analytics Dashboard ID */}
        <GoogleAnalytics gaId="G-D897179F7E" />

        {/* 🟢 MICROSOFT CLARITY HEATMAPS & RECORDINGS */}
        <Script id="microsoft-clarity" strategy="afterInteractive">
          {`
            (function(c,l,a,r,i,t,y){
                c[a]=c[a]||function(){(c[a].q=c[a].q||[]).push(arguments)};
                t=l.createElement(r);t.async=1;t.src="https://www.clarity.ms/tag/"+i;
                y=l.getElementsByTagName(r)[0];y.parentNode.insertBefore(t,y);
            })(window, document, "clarity", "script", "wssgetz48e");
          `}
        </Script>
        
        {/* 24/7 AI Support Agent */}
        <Chatbot />
        
      </body>
    </html>
  );
}