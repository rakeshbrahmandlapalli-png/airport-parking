import type { Metadata } from "next";
import HomePage from "../page";

export const metadata: Metadata = {
  title: "Heathrow Terminal 3 Parking | Meet & Greet T3 — AeroPark Direct",
  description:
    "Meet & Greet parking at Heathrow Terminal 3 (LHR T3). Drive to T3 departures, hand over your keys, and fly. Fully insured, free cancellation. Book in under 60 seconds.",
  alternates: { canonical: "https://www.aeroparkdirect.co.uk/heathrow-terminal-3-parking" },
  openGraph: {
    title: "Heathrow Terminal 3 Parking | Meet & Greet",
    description:
      "Premium, fully insured Meet & Greet at Heathrow Terminal 3. Drive to T3 departures, hand over your keys, fly stress-free. Free cancellation.",
    url: "https://www.aeroparkdirect.co.uk/heathrow-terminal-3-parking",
    type: "website",
  },
};

export default function HeathrowTerminal3ParkingPage() {
  return (
    <HomePage
      preset={{
        airportDefault: "Heathrow (LHR)",
        h1Top: "Heathrow Terminal 3 Parking",
        h1Highlight: "Made Simple.",
        intro:
          "Meet & Greet parking at Heathrow Terminal 3 (LHR T3). Drive straight to T3 departures, hand your keys to a vetted driver, and walk inside. No shuttle buses, no long-stay car park. Fully insured, free cancellation.",
        seoBlock: {
          eyebrow: "Heathrow Terminal 3 Parking Guide",
          heading: "Meet & Greet Parking at",
          highlight: "Heathrow Terminal 3",
          paragraphs: [
            "Terminal 3 is the Heathrow base for Virgin Atlantic and Emirates, along with American Airlines, Cathay Pacific and other long-haul carriers, so it sees a steady flow of holiday and business travellers heading off on longer trips. The official T3 short-stay car park is convenient but expensive, and the cheaper long-stay options put you on a shuttle bus with your luggage.",
            "Meet & Greet skips that. You drive straight to the T3 departures forecourt, a vetted driver takes your keys, and your car is parked in a secure compound while you fly. When you land at T3 you walk out to a waiting car rather than looking for a bus stop.",
            "Every operator we list for Terminal 3 is fully insured and audited before it goes live, with CCTV-monitored, fenced compounds and DBS-checked drivers who photograph your car at handover. Your return is matched to your live flight arrival, so the car is ready when you land, even if you touch down late. Search your dates above for a live T3 price in under a minute, with free cancellation up to 24 hours before drop-off and a Best Price Guarantee behind it.",
          ],
          highlights: [
            { stat: "T3", label: "Drive straight to T3 departures. No shuttle, no car park trek." },
            { stat: "24h", label: "Free cancellation up to 24 hours before drop-off." },
            { stat: "60s", label: "Compare insured T3 operators and book. No account needed." },
          ],
        },
        faqs: [
          { q: "Where do I meet the driver at Heathrow Terminal 3?", a: "Your driver meets you at the Terminal 3 departures drop-off forecourt at a pre-arranged time. After booking you'll get the exact meeting point and a contact number. You drive to T3 departures, hand over your keys, and head inside." },
          { q: "Which airlines use Heathrow Terminal 3?", a: "Terminal 3 is home to Virgin Atlantic and Emirates, plus American Airlines, Cathay Pacific, Qantas and other long-haul carriers. Always check your airline's terminal on your booking before you travel." },
          { q: "How much does Meet & Greet parking cost at Terminal 3?", a: "It depends on your dates, length of stay and operator, and is typically below the official T3 short-stay rate. Enter your dates above for an exact live price — it takes under 10 seconds." },
          { q: "What if my flight back to T3 is delayed?", a: "Your operator tracks your inbound flight. If you land late, your car is still brought to Terminal 3 ready for you, with no extra charge for the delay." },
          { q: "Is my car insured and secure while I'm away?", a: "Yes. Every operator we list for Terminal 3 is fully insured, audited by us before listing, and keeps vehicles in CCTV-monitored, fenced compounds. Drivers are DBS-checked and photograph your vehicle at handover." },
          { q: "Can I cancel my Heathrow Terminal 3 parking booking?", a: "Yes — free cancellation is available up to 24 hours before your drop-off time. To change dates or times, use the Manage Booking page." },
        ],
      }}
    />
  );
}
