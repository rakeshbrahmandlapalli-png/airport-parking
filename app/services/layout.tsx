import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Airport Parking Services | Meet & Greet & Park & Ride",
  description:
    "AeroPark Direct's airport parking services: Meet & Greet at Luton and Heathrow, Park & Ride at Heathrow (Luton coming soon). Insured operators, free cancellation.",
  alternates: { canonical: "/services" },
};

export default function ServicesLayout({ children }: { children: React.ReactNode }) {
  return children;
}
