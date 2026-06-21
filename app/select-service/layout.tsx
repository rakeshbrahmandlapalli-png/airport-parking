import type { Metadata } from "next";

// Funnel step — not a search landing page. Noindex so it doesn't compete with
// the real landing pages or get flagged as thin/duplicate, but follow links so
// equity flows on to the operator/results pages.
export const metadata: Metadata = {
  title: "Choose Your Parking Service | AeroPark Direct",
  robots: { index: false, follow: true },
};

export default function SelectServiceLayout({ children }: { children: React.ReactNode }) {
  return children;
}
