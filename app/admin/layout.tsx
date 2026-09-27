import type { Metadata, Viewport } from "next";

// Staff area: its own tab title, never in search results, and installable as
// the "AP Admin" app (public/admin.webmanifest) — on a phone, Add to Home
// Screen gives an icon that opens admin full screen.
export const metadata: Metadata = {
  title: { default: "Admin | AeroPark Direct", template: "%s | AeroPark Direct admin" },
  robots: { index: false, follow: false },
  manifest: "/admin.webmanifest",
  applicationName: "AP Admin",
  appleWebApp: { capable: true, title: "AP Admin", statusBarStyle: "black-translucent" },
  icons: { apple: "/brand/admin-apple-touch-icon.png" },
};

export const viewport: Viewport = {
  themeColor: "#0B1120",
  // Lets the bottom bar sit clear of the iPhone home indicator when installed.
  viewportFit: "cover",
};

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return children;
}
