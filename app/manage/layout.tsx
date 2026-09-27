import type { Metadata } from "next";

// Customer self-service, not a search landing page.
export const metadata: Metadata = {
  title: "Manage Your Booking | AeroPark Direct",
  description: "Look up your AeroPark Direct airport parking booking, add your return flight, or cancel.",
  robots: { index: false, follow: true },
};

export default function ManageLayout({ children }: { children: React.ReactNode }) {
  return children;
}
