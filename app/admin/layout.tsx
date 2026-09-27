import type { Metadata } from "next";

// Staff area: its own tab title, and never in search results.
export const metadata: Metadata = {
  title: { default: "Admin | AeroPark Direct", template: "%s | AeroPark Direct admin" },
  robots: { index: false, follow: false },
};

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return children;
}
