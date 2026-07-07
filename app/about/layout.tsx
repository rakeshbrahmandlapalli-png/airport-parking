import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "About AeroPark Direct | Vetted Airport Parking at Luton & Heathrow",
  description:
    "Founded by an industry insider with 15 years in UK airport parking, AeroPark Direct vets every operator at Luton and Heathrow and matches you to the right Meet & Greet or Park & Ride with Aero, our AI concierge.",
  alternates: { canonical: "/about" },
};

export default function AboutLayout({ children }: { children: React.ReactNode }) {
  return children;
}
