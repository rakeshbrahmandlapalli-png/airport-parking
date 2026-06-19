import type { Metadata } from "next";
import HomePage from "../page";

export const metadata: Metadata = {
  title: "Luton Meet & Greet Parking | Drive to the Terminal — AeroPark Direct",
  description:
    "Meet & Greet parking at Luton Airport (LTN). Drive straight to the terminal forecourt, hand over your keys, and fly. No shuttle buses. Fully insured, free cancellation, 4.8★. Book in under 60 seconds.",
  alternates: { canonical: "https://www.aeroparkdirect.co.uk/luton-meet-and-greet" },
  openGraph: {
    title: "Luton Meet & Greet Parking | Drive to the Terminal",
    description:
      "Premium, fully insured Meet & Greet at Luton Airport (LTN). Drive to the terminal, hand over your keys, fly stress-free. No shuttle buses, free cancellation.",
    url: "https://www.aeroparkdirect.co.uk/luton-meet-and-greet",
    type: "website",
  },
};

export default function LutonMeetAndGreetPage() {
  return (
    <HomePage
      preset={{
        airportDefault: "Luton (LTN)",
        h1Top: "Luton Meet & Greet Parking",
        h1Highlight: "Made Simple.",
        intro:
          "Meet & Greet parking at Luton Airport (LTN). Drive straight to the terminal forecourt, hand your keys to a vetted driver, and walk into departures. No shuttle buses, no long-stay car park wait. Fully insured, free cancellation, 4.8★ rated.",
        seoBlock: {
          eyebrow: "Luton Airport Meet & Greet Guide",
          heading: "Meet & Greet Parking at",
          highlight: "Luton Airport",
          paragraphs: [
            "Luton Airport (LTN) is one of the UK's busiest single-terminal airports, and parking there is tighter than most travellers expect. The Terminal Car Park is the closest but the most expensive, while the cheaper Mid Stay and Long Term car parks put you on a shuttle bus with your luggage. Even the drop-off forecourt now carries a charge for a few minutes' stop.",
            "Meet & Greet skips all of it. You drive straight to the Luton terminal, a vetted driver meets you, takes your keys, and parks your car in a secure compound while you fly. When you land you walk out to a waiting car, with no bus to find and no walk across a car park in the rain.",
            "Every operator we list for Luton is fully insured and audited before it goes live, with CCTV-monitored, fenced compounds and DBS-checked drivers who photograph your car at handover. Your return is matched to your live flight arrival, so the car is ready when you land, even if you touch down late. Search your dates above for a live Luton price in under a minute, with free cancellation up to 24 hours before drop-off and a Best Price Guarantee behind it.",
          ],
          highlights: [
            { stat: "LTN", label: "Drive straight to the terminal. No shuttle bus, no car park trek." },
            { stat: "4.8★", label: "300+ verified reviews across Google and Trustpilot." },
            { stat: "60s", label: "Compare insured Luton operators and book. No account needed." },
          ],
        },
        faqs: [
          { q: "Where do I meet the driver at Luton Airport?", a: "Your driver meets you at the Luton Airport terminal drop-off area at a pre-arranged time. Once you've booked you'll receive the exact meeting point and a contact number. You drive to the terminal, hand over your keys, and head straight into departures." },
          { q: "How much does Meet & Greet parking cost at Luton?", a: "Prices depend on your dates, length of stay and chosen operator, and are usually cheaper than the official Luton Terminal Car Park. Enter your dates in the search above for an exact live price — it takes under 10 seconds." },
          { q: "Is Meet & Greet better than the Mid Stay or Long Term car park at Luton?", a: "For most travellers, yes. The Mid Stay and Long Term car parks require a shuttle bus transfer with your luggage at both ends. Meet & Greet lets you drive straight to the terminal and skip the bus entirely, often at a similar or lower price." },
          { q: "What happens if my flight back to Luton is delayed?", a: "Your operator tracks your inbound flight. If you land late, your car is still brought to the terminal ready for you, and there's no extra charge for the delay." },
          { q: "Is my car insured and secure while I'm away?", a: "Yes. Every operator we list for Luton is fully insured, audited by us before listing, and keeps vehicles in CCTV-monitored, fenced compounds. Drivers are DBS-checked and photograph your vehicle at handover." },
          { q: "Can I cancel my Luton Meet & Greet booking?", a: "Yes — free cancellation is available up to 24 hours before your drop-off time. To change dates or times, use the Manage Booking page." },
        ],
      }}
    />
  );
}
