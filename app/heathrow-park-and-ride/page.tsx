import type { Metadata } from "next";
import HomePage from "../page";

export const metadata: Metadata = {
  title: "Heathrow Park & Ride Parking | Secure Off-Airport — AeroPark Direct",
  description:
    "Park & Ride at Heathrow Airport (LHR). Park at the operator's site and take a transfer to your terminal. Fully insured, free cancellation. Book in under 60 seconds.",
  alternates: { canonical: "https://www.aeroparkdirect.co.uk/heathrow-park-and-ride" },
  openGraph: {
    title: "Heathrow Park & Ride Parking | Secure Off-Airport",
    description:
      "Secure, fully insured Park & Ride at Heathrow Airport (LHR). Park at the operator's site and ride to your terminal. Free cancellation, great value.",
    url: "https://www.aeroparkdirect.co.uk/heathrow-park-and-ride",
    type: "website",
  },
};

export default function HeathrowParkAndRidePage() {
  return (
    <HomePage
      preset={{
        airportDefault: "Heathrow (LHR)",
        seoSchema: { path: "/heathrow-park-and-ride", name: "Heathrow Park & Ride Parking", serviceType: "Park & Ride airport parking", areaServed: "Heathrow Airport (LHR)" },
        h1Top: "Heathrow Park & Ride Parking",
        h1Highlight: "Made Simple.",
        intro:
          "Park & Ride at Heathrow Airport (LHR). Park your own car at the operator's site and take a transfer to your terminal, T2 to T5. The best-value way to park at Heathrow. Fully insured, free cancellation.",
        seoBlock: {
          eyebrow: "Heathrow Park & Ride Guide",
          heading: "Park & Ride at",
          highlight: "Heathrow Airport",
          paragraphs: [
            "Park & Ride is the most cost-effective way to park at Heathrow. You drive to a secure off-airport compound, park your own car, and take a transfer to your terminal, whether that is T2, T3, T4 or T5. It is the right choice when you want a sharp price and you don't mind a short ride to the terminal.",
            "It is also the value alternative to Heathrow's official long-stay car parks, which already work on a park-and-transfer basis but at airport prices. Through an operator we list, you get the same convenience, clear transfer times to your terminal, and often a better rate.",
            "Every Park & Ride operator we list for Heathrow is fully insured, and you can see who will look after your car before you pay. On your return, transfers run to meet arriving flights so you're not left waiting after a long journey. Search your dates above for a live Heathrow Park & Ride price in under a minute, with free cancellation up to 24 hours before drop-off. If you'd rather skip the transfer entirely, our Meet & Greet option lets you drive straight to your terminal instead.",
          ],
          highlights: [
            { stat: "£", label: "The best-value way to park at Heathrow. Keen Park & Ride prices." },
            { stat: "24h", label: "Free cancellation up to 24 hours before drop-off." },
            { stat: "60s", label: "Compare insured Heathrow operators and book. No account needed." },
          ],
        },
        faqs: [
          { q: "How does Park & Ride work at Heathrow?", a: "You drive to a secure off-airport compound near Heathrow, park your own car, and take a transfer to your terminal. On your return, you ride back to the compound and collect your car. Transfers are included in the price and run to your terminal." },
          { q: "Does the transfer go to my Heathrow terminal?", a: "Yes — transfers serve the Heathrow terminals (T2, T3, T4 and T5). You tell us your terminal when you book, and the transfer details and times are confirmed before you pay." },
          { q: "Is Park & Ride cheaper than Meet & Greet at Heathrow?", a: "Usually, yes. Park & Ride is the lower-cost option because you park your own car and take a transfer, rather than handing your keys over at the terminal. If you'd prefer to skip the transfer, Meet & Greet is the premium alternative." },
          { q: "What happens if my flight back to Heathrow is delayed?", a: "Transfers are scheduled around arriving flights, and your car is waiting in the compound regardless of when you land. There's no extra charge for a delayed return outside your control." },
          { q: "Is my car insured and secure while I'm away?", a: "Yes. Every Park & Ride operator we list for Heathrow is fully insured. You can see which operator will look after your car before you pay, and their contact details are in your confirmation email." },
          { q: "Can I cancel my Heathrow Park & Ride booking?", a: "You can cancel at any time from the Manage Booking page — free of charge up to 24 hours before your drop-off time. Inside 24 hours the booking still cancels, and we review the refund and come back to you within one working day. To change your dates, please call your parking operator on the number in your confirmation email — they hold your space, so they are the only ones who can arrange it." },
        ],
      }}
    />
  );
}
