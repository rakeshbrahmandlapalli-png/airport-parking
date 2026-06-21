import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Privacy Policy | AeroPark Direct",
  description:
    "How AeroPark Direct collects, uses and protects your personal data when you book airport parking at Luton and Heathrow.",
  alternates: { canonical: "/privacy" },
};

export default function PrivacyLayout({ children }: { children: React.ReactNode }) {
  return children;
}
