import type { Metadata } from "next";
import "./globals.css";
import { Analytics } from "@vercel/analytics/next"; 
import { GoogleAnalytics } from '@next/third-parties/google';
import Script from 'next/script';
import Chatbot from "@/components/Chatbot";
import PromoBanner from "@/components/PromoBanner";
import GclidCapture from "@/components/GclidCapture";
import CookieConsent from "@/components/CookieConsent";

export const metadata: Metadata = {
  metadataBase: new URL("https://www.aeroparkdirect.co.uk"),
  title: "Airport Parking at Luton & Heathrow | Meet & Greet & Park & Ride | AeroPark Direct",
  description:
    "Compare and book fully insured Meet & Greet and Park & Ride airport parking at Luton (LTN) and Heathrow (LHR). Vetted, fully insured operators, free cancellation — book in under 60 seconds.",
  keywords: [
    "airport parking",
    "Luton airport parking",
    "Heathrow airport parking",
    "meet and greet parking",
    "park and ride",
    "LTN parking",
    "LHR parking",
    "cheap airport parking",
  ],
  alternates: { canonical: "/" },
  openGraph: {
    type: "website",
    siteName: "AeroPark Direct",
    title: "Airport Parking at Luton & Heathrow | AeroPark Direct",
    description:
      "Fully insured Meet & Greet and Park & Ride parking at Luton and Heathrow. Vetted operators, free cancellation, book in 60 seconds.",
    url: "https://www.aeroparkdirect.co.uk",
    locale: "en_GB",
  },
  // Trustpilot domain verification.
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
      <body className="subpixel-antialiased bg-[#F8FAFC]" suppressHydrationWarning>

        {/* 🍪 CONSENT MODE v2 — must run BEFORE gtag.js / Clarity load.
            Everything defaults to DENIED so no analytics/ad cookies are set
            until the visitor opts in via the CookieConsent banner. A previously
            stored "granted" choice is re-applied immediately to avoid flicker.
            beforeInteractive is hoisted by Next to run ahead of the tags below. */}
        <Script
          id="consent-mode-default"
          strategy="beforeInteractive"
          dangerouslySetInnerHTML={{
            __html: `
              window.dataLayer = window.dataLayer || [];
              function gtag(){dataLayer.push(arguments);}
              window.gtag = gtag;
              gtag('consent', 'default', {
                ad_storage: 'denied',
                ad_user_data: 'denied',
                ad_personalization: 'denied',
                analytics_storage: 'denied',
                functionality_storage: 'granted',
                security_storage: 'granted',
                wait_for_update: 500
              });
              try {
                var c = JSON.parse(localStorage.getItem('apd_consent_v1') || 'null');
                if (c) {
                  gtag('consent', 'update', {
                    analytics_storage: c.analytics ? 'granted' : 'denied',
                    ad_storage: c.marketing ? 'granted' : 'denied',
                    ad_user_data: c.marketing ? 'granted' : 'denied',
                    ad_personalization: c.marketing ? 'granted' : 'denied'
                  });
                }
              } catch (e) {}
            `,
          }}
        />

        {/* Capture Google Ads click id (gclid) into a cookie for server-side conversions */}
        <GclidCapture />

        {/* Dynamic promo banner (LAUNCH10 / AERO15 hooks) */}
        <PromoBanner />

        <main className="relative w-full">
          {children}
        </main>

        {/* 24/7 AI Support Agent */}
        <Chatbot />

        {/* ========================================= */}
        {/* 🟢 ANALYTICS & TRACKING SCRIPTS 🟢 */}
        {/* ========================================= */}

        {/* Vercel Speed & Traffic Analytics */}
        <Analytics /> 
        
        {/* CRITICAL FIX: Updated to match your actual Google Analytics Dashboard ID */}
        <GoogleAnalytics gaId="G-D897179F7E" />

        {/* Google Ads — piggybacks on the GA4 gtag.js already loaded above.
            Do NOT add a second gtag.js src here; just configure the Ads property
            on the shared dataLayer that @next/third-parties/google initialised. */}
        <Script
          id="google-ads-config"
          strategy="afterInteractive"
          dangerouslySetInnerHTML={{
            __html: `
              window.dataLayer = window.dataLayer || [];
              function gtag(){dataLayer.push(arguments);}
              gtag('config', 'AW-18163936640');
            `,
          }}
        />

        {/* Microsoft Clarity is now loaded by <CookieConsent /> only after the
            visitor grants Analytics consent (see components/CookieConsent.tsx). */}

        {/* 🍪 Cookie consent banner — drives Google Consent Mode v2 + Clarity */}
        <CookieConsent />

      </body>
    </html>
  );
}