import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "About AeroPark Direct | Vetted Airport Parking at Luton & Heathrow",
  description:
    "AeroPark Direct is a UK airport parking agent for Luton and Heathrow. We vet every operator and match you to the right Meet & Greet or Park & Ride with Aero, our AI concierge.",
  alternates: { canonical: "/about" },
};

export default function AboutLayout({ children }: { children: React.ReactNode }) {
  return children;
}
