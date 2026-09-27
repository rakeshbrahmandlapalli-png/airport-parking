import type { Metadata } from "next";
import HomePage from "../page";

export const metadata: Metadata = {
  title: "Luton Airport Parking | Meet & Greet from £44 — AeroPark Direct",
  description:
    "Compare Luton Airport (LTN) Meet & Greet parking from insured operators, with free cancellation. Drive to the terminal, hand over your keys, and fly. Book in under 60 seconds.",
  alternates: { canonical: "https://www.aeroparkdirect.co.uk/luton-airport-parking" },
  openGraph: {
    title: "Luton Airport Parking | Meet & Greet from £44",
    description:
      "Meet & Greet at Luton Airport from insured operators. Free cancellation. Compare live prices and book in seconds.",
    url: "https://www.aeroparkdirect.co.uk/luton-airport-parking",
    type: "website",
  },
};

export default function LutonAirportParkingPage() {
  return (
    <HomePage
      preset={{
        airportDefault: "Luton (LTN)",
        seoSchema: { path: "/luton-airport-parking", name: "Luton Airport Parking", serviceType: "Airport parking", areaServed: "Luton Airport (LTN)" },
        h1Top: "Luton Airport Parking",
        h1Highlight: "Made Simple.",
        intro:
          "Meet & Greet at Luton Airport (LTN), with Park & Ride coming soon. Drive to the terminal car park, hand over your keys and walk to check-in. Insured operators, free cancellation.",
      }}
    />
  );
}
