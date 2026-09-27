import type { Metadata } from "next";
import HomePage from "../page";

// Park & Ride at Luton isn't live yet (the service picker shows it as "Coming
// Soon"). This page keeps the search term honest: it explains the service,
// says when it's not bookable, and points to what is.
export const metadata: Metadata = {
  title: "Luton Airport Park & Ride: Coming Soon | AeroPark Direct",
  description:
    "Park & Ride at Luton Airport (LTN) is coming soon to AeroPark Direct. Until then, book Meet & Greet at Luton: drive to the terminal car park, hand over your keys and fly.",
  alternates: { canonical: "https://www.aeroparkdirect.co.uk/luton-park-and-ride" },
  openGraph: {
    title: "Luton Airport Park & Ride: Coming Soon",
    description:
      "Park & Ride at Luton Airport is coming soon. Meet & Greet at Luton is available to book now.",
    url: "https://www.aeroparkdirect.co.uk/luton-park-and-ride",
    type: "website",
  },
};

export default function LutonParkAndRidePage() {
  return (
    <HomePage
      preset={{
        airportDefault: "Luton (LTN)",
        seoSchema: { path: "/luton-park-and-ride", name: "Luton Park & Ride Parking", serviceType: "Park & Ride airport parking", areaServed: "Luton Airport (LTN)" },
        h1Top: "Luton Airport Park & Ride is",
        h1Highlight: "coming soon",
        intro:
          "We're adding Park & Ride operators at Luton Airport soon. Until then, you can book Meet & Greet at Luton: drive to the terminal car park, hand over your keys and walk to check-in.",
        seoBlock: {
          eyebrow: "Luton Airport Park & Ride",
          heading: "Park & Ride at Luton is coming soon",
          paragraphs: [
            "Park & Ride is usually the lowest-cost way to park at an airport. You drive to the operator's site, park your own car and take a short transfer to the terminal, then the transfer brings you back to your car when you return.",
            "We're adding Park & Ride operators at Luton Airport, and we'll list them here once we've checked their compounds. Every operator we list is insured.",
            "In the meantime, Meet & Greet is available at Luton now. You drive to Terminal Car Park 1, hand your keys to a driver and walk to departures, with free cancellation up to 24 hours before drop-off. If you're flying from Heathrow, Park & Ride is available there today.",
          ],
        },
        faqs: [
          { q: "Can I book Park & Ride at Luton now?", a: "Not yet. We're adding Park & Ride operators at Luton soon. You can book Meet & Greet at Luton today, or Park & Ride at Heathrow." },
          { q: "How will Park & Ride work at Luton?", a: "You'll drive to the operator's site near the airport, park your own car and take a transfer to the terminal. On your return, the transfer takes you back to your car." },
          { q: "Is Park & Ride cheaper than Meet & Greet?", a: "Usually, yes, because you park the car yourself and take a transfer. Meet & Greet costs a little more but saves the transfer: you drive to the terminal and hand over your keys." },
          { q: "How does Meet & Greet at Luton work?", a: "Drive to Terminal Car Park 1, go to the Meet & Greet meeting point given in your confirmation email, and hand your keys to the driver. When you land, your car is brought back to you there." },
          { q: "Can I cancel a Luton booking?", a: "Yes. Cancel free of charge from the Manage booking page up to 24 hours before your drop-off time. Inside 24 hours the booking still cancels, and we review the refund and come back to you within one working day." },
        ],
      }}
    />
  );
}
