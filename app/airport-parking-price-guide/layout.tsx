import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Airport Parking Price Guide | Luton & Heathrow | AeroPark Direct",
  description:
    "Live example prices for Meet & Greet and Park & Ride parking at Luton and Heathrow, calculated from our current pricing engine. See what affects the price and compare live quotes for your dates.",
  alternates: { canonical: "/airport-parking-price-guide" },
};

export default function PriceGuideLayout({ children }: { children: React.ReactNode }) {
  return children;
}
