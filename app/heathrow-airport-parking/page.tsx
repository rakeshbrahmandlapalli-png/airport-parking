import type { Metadata } from "next";
import HomePage from "../page";

export const metadata: Metadata = {
  title: "Heathrow Airport Parking | Meet & Greet T2–T5 — AeroPark Direct",
  description:
    "Compare trusted Heathrow Airport (LHR) Meet & Greet and Park & Ride parking across Terminals 2, 3, 4 and 5. Fully insured, free cancellation, 4.8★ rated. Book in under 60 seconds.",
  alternates: { canonical: "https://www.aeroparkdirect.co.uk/heathrow-airport-parking" },
  openGraph: {
    title: "Heathrow Airport Parking | Meet & Greet T2–T5",
    description:
      "Premium, fully insured Meet & Greet and Park & Ride at Heathrow Airport across all terminals. Free cancellation. Compare live prices and book in seconds.",
    url: "https://www.aeroparkdirect.co.uk/heathrow-airport-parking",
    type: "website",
  },
};

export default function HeathrowAirportParkingPage() {
  return (
    <HomePage
      preset={{
        airportDefault: "Heathrow (LHR)",
        h1Top: "Heathrow Airport Parking",
        h1Highlight: "Made Simple.",
        intro:
          "Premium Meet & Greet and Park & Ride at Heathrow Airport (LHR) across Terminals 2, 3, 4 and 5. Drive to departures, hand over your keys, and fly stress-free. Fully insured operators, free cancellation, 4.8★ rated.",
      }}
    />
  );
}
