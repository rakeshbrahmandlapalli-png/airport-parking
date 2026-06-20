import type { Metadata } from "next";
import HomePage from "../page";

export const metadata: Metadata = {
  title: "Luton Park & Ride Parking | Secure Off-Airport — AeroPark Direct",
  description:
    "Park & Ride at Luton Airport (LTN). Park in a secure, CCTV-monitored compound and take a quick transfer to the terminal. Fully insured, free cancellation. Book in under 60 seconds.",
  alternates: { canonical: "https://www.aeroparkdirect.co.uk/luton-park-and-ride" },
  openGraph: {
    title: "Luton Park & Ride Parking | Secure Off-Airport",
    description:
      "Secure, fully insured Park & Ride at Luton Airport (LTN). Park in a CCTV compound and ride to the terminal. Free cancellation, great value.",
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
        h1Top: "Luton Park & Ride Parking",
        h1Highlight: "Made Simple.",
        intro:
          "Park & Ride at Luton Airport (LTN). Park your own car in a secure, CCTV-monitored compound and take a short, frequent transfer to the terminal. The best-value way to park at Luton. Fully insured, free cancellation.",
        seoBlock: {
          eyebrow: "Luton Airport Park & Ride Guide",
          heading: "Park & Ride at",
          highlight: "Luton Airport",
          paragraphs: [
            "Park & Ride is the most cost-effective way to park at Luton Airport (LTN). You drive to a secure off-airport compound, park your own car, and hop on a short, frequent shuttle to the terminal — usually a few minutes away. It is the natural choice when you want a keen price and you don't mind a quick transfer.",
            "It is also the sensible alternative to Luton's official Mid Stay and Long Term car parks. You get the same drive-park-ride pattern, but through an operator we have audited, often at a better price, with clear transfer times so you know exactly when you'll reach the terminal.",
            "Every Park & Ride operator we list for Luton is fully insured and audited before it goes live, with CCTV-monitored, fenced compounds. On your return, transfers run to meet arriving flights so you're not left waiting. Search your dates above for a live Luton Park & Ride price in under a minute, with free cancellation up to 24 hours before drop-off and a Best Price Guarantee behind it. If you'd rather skip the transfer entirely, our Meet & Greet option lets you drive straight to the terminal instead.",
          ],
          highlights: [
            { stat: "£", label: "The best-value way to park at Luton. Keen Park & Ride prices." },
            { stat: "24h", label: "Free cancellation up to 24 hours before drop-off." },
            { stat: "60s", label: "Compare insured Luton operators and book. No account needed." },
          ],
        },
        faqs: [
          { q: "How does Park & Ride work at Luton Airport?", a: "You drive to a secure off-airport compound near Luton, park your own car, and take a short shuttle transfer to the terminal. On your return, you ride back to the compound and collect your car. Transfers run frequently and are included in the price." },
          { q: "How long is the transfer to the Luton terminal?", a: "Transfer times depend on the operator and compound location, but are typically a short ride of a few minutes. The exact transfer details are shown before you book and confirmed in your booking." },
          { q: "Is Park & Ride cheaper than Meet & Greet at Luton?", a: "Usually, yes. Park & Ride is the lower-cost option because you park your own car and take a transfer, rather than handing your keys over at the terminal. If you'd prefer to skip the transfer, Meet & Greet is the premium alternative." },
          { q: "What happens if my flight back to Luton is delayed?", a: "Transfers are scheduled around arriving flights, and your car is waiting in the compound regardless of when you land. There's no extra charge for a delayed return outside your control." },
          { q: "Is my car insured and secure while I'm away?", a: "Yes. Every Park & Ride operator we list for Luton is fully insured, audited by us before listing, and keeps vehicles in CCTV-monitored, fenced compounds." },
          { q: "Can I cancel my Luton Park & Ride booking?", a: "Yes — free cancellation is available up to 24 hours before your drop-off time. To change dates or times, use the Manage Booking page." },
        ],
      }}
    />
  );
}
