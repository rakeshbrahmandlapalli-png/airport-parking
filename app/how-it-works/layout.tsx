import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "How It Works | Airport Parking in 3 Steps",
  description:
    "How AeroPark Direct works: search your dates, compare vetted Luton and Heathrow operators, and book Meet & Greet or Park & Ride in under 60 seconds.",
  alternates: { canonical: "/how-it-works" },
};

export default function HowItWorksLayout({ children }: { children: React.ReactNode }) {
  return children;
}
