import type { Metadata } from "next";

// Search-results funnel page (query-param driven, thin without a search).
// Noindex so it isn't treated as a thin/duplicate indexable page; follow links.
export const metadata: Metadata = {
  title: "Parking Results | AeroPark Direct",
  robots: { index: false, follow: true },
};

export default function ResultsLayout({ children }: { children: React.ReactNode }) {
  return children;
}
