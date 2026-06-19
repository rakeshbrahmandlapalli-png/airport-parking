import type { Metadata } from "next";
import HomePage from "../page";

export const metadata: Metadata = {
  title: "Heathrow Meet & Greet Parking | All Terminals — AeroPark Direct",
  description:
    "Meet & Greet parking at Heathrow Airport (LHR), all terminals T2–T5. Drive to departures, hand over your keys, and fly. Fully insured, free cancellation, 4.8★. Book in under 60 seconds.",
  alternates: { canonical: "https://www.aeroparkdirect.co.uk/heathrow-meet-and-greet" },
  openGraph: {
    title: "Heathrow Meet & Greet Parking | All Terminals",
    description:
      "Premium, fully insured Meet & Greet at Heathrow across T2, T3, T4 and T5. Drive to departures, hand over your keys, fly stress-free. Free cancellation.",
    url: "https://www.aeroparkdirect.co.uk/heathrow-meet-and-greet",
    type: "website",
  },
};

export default function HeathrowMeetAndGreetPage() {
  return (
    <HomePage
      preset={{
        airportDefault: "Heathrow (LHR)",
        h1Top: "Heathrow Meet & Greet Parking",
        h1Highlight: "Made Simple.",
        intro:
          "Meet & Greet parking at Heathrow Airport (LHR), across all terminals. Drive straight to your terminal's departures forecourt, hand your keys to a vetted driver, and walk inside. No shuttle buses, no long-stay car park. Fully insured, free cancellation, 4.8★ rated.",
        seoBlock: {
          eyebrow: "Heathrow Meet & Greet Guide",
          heading: "Meet & Greet Parking at",
          highlight: "Heathrow Airport",
          paragraphs: [
            "Heathrow is the busiest airport in the UK, and its car parks are priced and laid out accordingly. Short-stay fills fast and charges premium gate rates, the long-stay car parks sit miles from the terminals behind a bus transfer, and even the departures forecourt now carries a £5 drop-off charge. For anyone catching a flight on a schedule, that is friction you do not need.",
            "Meet & Greet removes it. You drive straight to your terminal at Heathrow, whether that is T2, T3, T4 or T5, a vetted driver meets you, and your car is parked in a secure compound while you fly. When you land you walk out to a waiting car instead of hunting for a shuttle stop with your luggage.",
            "Every operator we list for Heathrow is fully insured and audited before it goes live, with CCTV-monitored, fenced compounds and DBS-checked drivers who photograph your car at handover. Your return is matched to your live flight arrival, so the car is ready when you land, even if you touch down late. Search your dates above for a live Heathrow price in under a minute, with free cancellation up to 24 hours before drop-off and a Best Price Guarantee behind it.",
          ],
          highlights: [
            { stat: "T2–T5", label: "Meet & Greet at every Heathrow terminal. Drive to departures." },
            { stat: "4.8★", label: "300+ verified reviews across Google and Trustpilot." },
            { stat: "60s", label: "Compare insured Heathrow operators and book. No account needed." },
          ],
        },
        faqs: [
          { q: "Which Heathrow terminals do you cover for Meet & Greet?", a: "All of them — Terminal 2 (the Queen's Terminal), Terminal 3, Terminal 4 and Terminal 5. When you book, you tell us your terminal and the driver meets you at that terminal's departures area." },
          { q: "How does Heathrow Meet & Greet work?", a: "You drive to your terminal's departures forecourt at a pre-arranged time, a vetted driver takes your keys, and your car is parked securely while you fly. On your return the car is brought back to your arrivals terminal, tracked to your flight." },
          { q: "How much does Meet & Greet cost at Heathrow?", a: "Prices depend on your dates, length of stay, terminal and operator, and are typically well below the official Heathrow short-stay rate. Enter your dates above for an exact live price — it takes under 10 seconds." },
          { q: "Is Meet & Greet cheaper than Heathrow's long-stay car parks?", a: "Often, yes — and it saves the bus transfer. Heathrow's long-stay car parks sit away from the terminals behind a shuttle, while Meet & Greet lets you drive straight to departures, frequently at a comparable or lower price." },
          { q: "Is my car insured and secure?", a: "Yes. Every operator we list for Heathrow is fully insured, audited by us before listing, and keeps vehicles in CCTV-monitored, fenced compounds. Drivers are DBS-checked and photograph your vehicle at handover." },
          { q: "Can I cancel my Heathrow Meet & Greet booking?", a: "Yes — free cancellation is available up to 24 hours before your drop-off time. To change dates or times, use the Manage Booking page." },
        ],
      }}
    />
  );
}
