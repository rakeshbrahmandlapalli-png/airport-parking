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

// Applies the saved theme (components/admin/ThemeToggle.tsx) before the page
// paints, so light mode never flashes dark first. Runs inline as the root's
// first child, before the rest of the admin is parsed.
const THEME_SCRIPT = `(function(){try{
var root=document.currentScript.parentElement;
var pref=localStorage.getItem("ap-admin-theme")||"dark";
var light=pref==="light"||(pref==="auto"&&window.matchMedia("(prefers-color-scheme: light)").matches);
root.setAttribute("data-admin-theme",light?"light":"dark");
var m=document.querySelector('meta[name="theme-color"]');if(m)m.setAttribute("content",light?"#F1F5F9":"#0B1120");
}catch(e){}})();`;

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div data-admin-root="" data-admin-theme="dark" suppressHydrationWarning className="min-h-screen">
      <script dangerouslySetInnerHTML={{ __html: THEME_SCRIPT }} />
      {children}
    </div>
  );
}
