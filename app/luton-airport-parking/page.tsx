import type { Metadata } from "next";
import HomePage from "../page";

export const metadata: Metadata = {
  title: "Luton Airport Parking | Meet & Greet from £44 — AeroPark Direct",
  description:
    "Compare trusted Luton Airport (LTN) Meet & Greet and Park & Ride parking. Fully insured, free cancellation. Drive to the terminal, hand over your keys, and fly. Book in under 60 seconds.",
  alternates: { canonical: "https://www.aeroparkdirect.co.uk/luton-airport-parking" },
  openGraph: {
    title: "Luton Airport Parking | Meet & Greet from £44",
    description:
      "Trusted, fully insured Meet & Greet and Park & Ride at Luton Airport. Free cancellation. Compare live prices and book in seconds.",
    url: "https://www.aeroparkdirect.co.uk/luton-airport-parking",
    type: "website",
  },
};

export default function LutonAirportParkingPage() {
  return (
    <HomePage
      preset={{
        airportDefault: "Luton (LTN)",
        h1Top: "Luton Airport Parking",
        h1Highlight: "Made Simple.",
        intro:
          "Licenced Meet & Greet and Park & Ride at Luton Airport (LTN). Drive straight to the terminal forecourt, hand over your keys, and fly — no shuttle buses, no long walks. Fully insured operators, free cancellation.",
      }}
    />
  );
}
