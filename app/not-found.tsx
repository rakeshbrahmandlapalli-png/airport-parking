import type { Metadata } from "next";
import Link from "next/link";
import StatusPage, { primaryBtn, secondaryBtn } from "@/components/site/StatusPage";

export const metadata: Metadata = {
  title: "Page not found | AeroPark Direct",
  robots: { index: false },
};

export default function NotFound() {
  return (
    <StatusPage
      title="We can't find that page"
      actions={
        <>
          <Link href="/" className={primaryBtn}>Search for parking</Link>
          <Link href="/manage" className={secondaryBtn}>Manage a booking</Link>
        </>
      }
    >
      <p>The link may be old, or the address may have a typo.</p>
    </StatusPage>
  );
}
