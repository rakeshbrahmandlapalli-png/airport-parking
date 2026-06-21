import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Terms & Conditions | AeroPark Direct",
  description:
    "The terms and conditions for booking Meet & Greet and Park & Ride airport parking at Luton and Heathrow through AeroPark Direct.",
  alternates: { canonical: "/terms" },
};

export default function TermsLayout({ children }: { children: React.ReactNode }) {
  return children;
}
