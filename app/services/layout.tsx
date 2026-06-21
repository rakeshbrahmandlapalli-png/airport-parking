import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Airport Parking Services | Meet & Greet & Park & Ride",
  description:
    "AeroPark Direct's airport parking services at Luton and Heathrow: Meet & Greet, Park & Ride and VIP. Fully insured operators, free cancellation.",
  alternates: { canonical: "/services" },
};

export default function ServicesLayout({ children }: { children: React.ReactNode }) {
  return children;
}
