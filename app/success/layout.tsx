import type { Metadata } from "next";

// Post-payment confirmation, not a search landing page.
export const metadata: Metadata = {
  title: "Booking Confirmed | AeroPark Direct",
  robots: { index: false, follow: false },
};

export default function SuccessLayout({ children }: { children: React.ReactNode }) {
  return children;
}
