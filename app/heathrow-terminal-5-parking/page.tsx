import type { Metadata } from "next";
import HomePage from "../page";

export const metadata: Metadata = {
  title: "Heathrow Terminal 5 Parking | Meet & Greet T5 — AeroPark Direct",
  description:
    "Meet & Greet parking at Heathrow Terminal 5 (LHR T5). Drive straight to T5 departures, hand over your keys, and fly. Fully insured, free cancellation. Book in under 60 seconds.",
  alternates: { canonical: "https://www.aeroparkdirect.co.uk/heathrow-terminal-5-parking" },
  openGraph: {
    title: "Heathrow Terminal 5 Parking | Meet & Greet",
    description:
      "Premium, fully insured Meet & Greet parking at Heathrow Terminal 5. Drive to T5 departures, hand over your keys, fly stress-free. Free cancellation.",
    url: "https://www.aeroparkdirect.co.uk/heathrow-terminal-5-parking",
    type: "website",
  },
};

export default function HeathrowTerminal5ParkingPage() {
  return (
    <HomePage
      preset={{
        airportDefault: "Heathrow (LHR)",
        h1Top: "Heathrow Terminal 5 Parking",
        h1Highlight: "Made Simple.",
        intro:
          "Meet & Greet parking at Heathrow Terminal 5 (LHR T5). Drive straight to T5 departures, hand your keys to a vetted driver, and walk into the terminal. No shuttle buses, no long-stay car park trek. Fully insured, free cancellation.",
        seoBlock: {
          eyebrow: "Heathrow Terminal 5 Parking Guide",
          heading: "Meet & Greet Parking at",
          highlight: "Heathrow Terminal 5",
          paragraphs: [
            "Terminal 5 is the British Airways and Iberia hub at Heathrow and one of the busiest terminals in Europe. Driving there should be the easy part of your trip, not the part you dread.",
            "The official T5 short-stay and long-stay car parks fill fast and charge premium gate rates, and the cheaper long-stay and Pod Park options still leave you moving luggage onto a shuttle or pod. Meet & Greet skips all of it. You drive straight to the T5 departures forecourt, a vetted driver takes your keys, and your car is parked in a secure compound while you fly.",
            "Every operator we list for Terminal 5 is fully insured and audited before it goes live, with CCTV-monitored, fenced compounds and DBS-checked drivers who photograph your car at handover. Your return is matched to your live flight arrival, so the car is waiting at T5 when you land, even if you touch down late. Search your dates above for a live T5 price in under a minute, with free cancellation up to 24 hours before drop-off and a Best Price Guarantee behind it.",
          ],
          highlights: [
            { stat: "T5", label: "Drive straight to departures. No shuttle, no pod transfer." },
            { stat: "24h", label: "Free cancellation up to 24 hours before drop-off." },
            { stat: "60s", label: "Compare insured T5 operators and book. No account needed." },
          ],
        },
        faqs: [
          { q: "Where do I meet the driver at Heathrow Terminal 5?", a: "Your driver meets you at the Terminal 5 departures drop-off forecourt at a pre-arranged time. Once you've booked, you'll receive the exact meeting point and a contact number. You simply drive to T5 departures, hand over your keys, and head straight into the terminal." },
          { q: "How much does Meet & Greet parking cost at Heathrow Terminal 5?", a: "Prices vary by your dates, length of stay and chosen operator, and are typically well below the official T5 short-stay gate rate. Enter your dates in the search above for an exact live price — it takes under 10 seconds." },
          { q: "How does my car get back to me at T5 when I land?", a: "Your operator tracks your inbound flight. When you land at Terminal 5 and collect your bags, your car is brought back to the T5 arrivals meeting point ready for you. If your flight is delayed, there's no extra charge for the delay." },
          { q: "Is Meet & Greet at Terminal 5 better than the official T5 car parks?", a: "For most travellers, yes. The official long-stay and Pod Park options require a shuttle or pod transfer with your luggage, while T5 short-stay is expensive for anything beyond a few hours. Meet & Greet lets you drive straight to departures and skip the transfer entirely, usually at a lower price than short-stay." },
          { q: "Is my car insured and secure while I'm away?", a: "Yes. Every operator we list for Terminal 5 is fully insured, audited by us before listing, and keeps vehicles in CCTV-monitored, fenced compounds. Drivers are DBS-checked and photograph your vehicle at handover." },
          { q: "Can I cancel my Heathrow Terminal 5 parking booking?", a: "Yes — free cancellation is available up to 24 hours before your drop-off time. To change dates or times, use the Manage Booking page." },
        ],
      }}
    />
  );
}
