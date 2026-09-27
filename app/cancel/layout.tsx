import type { Metadata } from "next";

// Customer self-service, not a search landing page.
export const metadata: Metadata = {
  title: "Cancel a Booking | AeroPark Direct",
  description: "Cancel your AeroPark Direct airport parking booking. Free up to 24 hours before drop-off.",
  robots: { index: false, follow: true },
};

export default function CancelLayout({ children }: { children: React.ReactNode }) {
  return children;
}
