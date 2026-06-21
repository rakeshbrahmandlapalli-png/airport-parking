import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Contact AeroPark Direct | Airport Parking Help",
  description:
    "Contact AeroPark Direct for help with your Luton or Heathrow airport parking booking — questions, amendments and support, fast.",
  alternates: { canonical: "/contact" },
};

export default function ContactLayout({ children }: { children: React.ReactNode }) {
  return children;
}
