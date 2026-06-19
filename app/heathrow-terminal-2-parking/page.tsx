import type { Metadata } from "next";
import HomePage from "../page";

export const metadata: Metadata = {
  title: "Heathrow Terminal 2 Parking | Meet & Greet T2 — AeroPark Direct",
  description:
    "Meet & Greet parking at Heathrow Terminal 2 (LHR T2, the Queen's Terminal). Drive to T2 departures, hand over your keys, and fly. Fully insured, free cancellation, 4.8★. Book in under 60 seconds.",
  alternates: { canonical: "https://www.aeroparkdirect.co.uk/heathrow-terminal-2-parking" },
  openGraph: {
    title: "Heathrow Terminal 2 Parking | Meet & Greet",
    description:
      "Premium, fully insured Meet & Greet at Heathrow Terminal 2 (the Queen's Terminal). Drive to T2 departures, hand over your keys, fly stress-free. Free cancellation.",
    url: "https://www.aeroparkdirect.co.uk/heathrow-terminal-2-parking",
    type: "website",
  },
};

export default function HeathrowTerminal2ParkingPage() {
  return (
    <HomePage
      preset={{
        airportDefault: "Heathrow (LHR)",
        h1Top: "Heathrow Terminal 2 Parking",
        h1Highlight: "Made Simple.",
        intro:
          "Meet & Greet parking at Heathrow Terminal 2 (LHR T2), the Queen's Terminal. Drive straight to T2 departures, hand your keys to a vetted driver, and walk inside. No shuttle buses, no long-stay car park. Fully insured, free cancellation, 4.8★ rated.",
        seoBlock: {
          eyebrow: "Heathrow Terminal 2 Parking Guide",
          heading: "Meet & Greet Parking at",
          highlight: "Heathrow Terminal 2",
          paragraphs: [
            "Terminal 2, the Queen's Terminal, is the Heathrow home of Star Alliance — carriers like United, Lufthansa, Swiss, Air Canada and Singapore Airlines all fly from here. It is a busy terminal, and the official T2 short-stay car park charges premium rates while the cheaper long-stay options leave you on a shuttle bus with your luggage.",
            "Meet & Greet skips that. You drive straight to the T2 departures forecourt, a vetted driver takes your keys, and your car is parked in a secure compound while you fly. When you land at T2 you walk out to a waiting car rather than queueing for a bus.",
            "Every operator we list for Terminal 2 is fully insured and audited before it goes live, with CCTV-monitored, fenced compounds and DBS-checked drivers who photograph your car at handover. Your return is matched to your live flight arrival, so the car is ready when you land, even if you touch down late. Search your dates above for a live T2 price in under a minute, with free cancellation up to 24 hours before drop-off and a Best Price Guarantee behind it.",
          ],
          highlights: [
            { stat: "T2", label: "Drive straight to the Queen's Terminal departures. No shuttle." },
            { stat: "4.8★", label: "300+ verified reviews across Google and Trustpilot." },
            { stat: "60s", label: "Compare insured T2 operators and book. No account needed." },
          ],
        },
        faqs: [
          { q: "Where do I meet the driver at Heathrow Terminal 2?", a: "Your driver meets you at the Terminal 2 departures drop-off forecourt at a pre-arranged time. After booking you'll get the exact meeting point and a contact number. You drive to T2 departures, hand over your keys, and head inside." },
          { q: "Which airlines use Heathrow Terminal 2?", a: "Terminal 2, the Queen's Terminal, is the Star Alliance hub at Heathrow — including United, Lufthansa, Swiss, Austrian, SAS, Air Canada and Singapore Airlines, among others. Always check your airline's terminal on your booking before you travel." },
          { q: "How much does Meet & Greet parking cost at Terminal 2?", a: "It depends on your dates, length of stay and operator, and is typically below the official T2 short-stay rate. Enter your dates above for an exact live price — it takes under 10 seconds." },
          { q: "What if my flight back to T2 is delayed?", a: "Your operator tracks your inbound flight. If you land late, your car is still brought to Terminal 2 ready for you, with no extra charge for the delay." },
          { q: "Is my car insured and secure while I'm away?", a: "Yes. Every operator we list for Terminal 2 is fully insured, audited by us before listing, and keeps vehicles in CCTV-monitored, fenced compounds. Drivers are DBS-checked and photograph your vehicle at handover." },
          { q: "Can I cancel my Heathrow Terminal 2 parking booking?", a: "Yes — free cancellation is available up to 24 hours before your drop-off time. To change dates or times, use the Manage Booking page." },
        ],
      }}
    />
  );
}
