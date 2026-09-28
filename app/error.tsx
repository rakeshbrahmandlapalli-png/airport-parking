"use client";

// Root error boundary: catches errors anywhere below the root layout so the
// customer gets a way forward instead of a blank screen.

import { useEffect } from "react";
import Link from "next/link";
import { logger } from "@/app/lib/logger";
import StatusPage, { primaryBtn, secondaryBtn } from "@/components/site/StatusPage";

export default function GlobalRouteError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    logger.error("[ErrorBoundary]", { err: error });
  }, [error]);

  return (
    <StatusPage
      title="Something went wrong"
      code={error.digest}
      actions={
        <>
          <button type="button" onClick={reset} className={primaryBtn}>Try again</button>
          <Link href="/" className={secondaryBtn}>Go to the homepage</Link>
        </>
      }
    >
      <p>This page didn&apos;t load properly. Please try again.</p>
    </StatusPage>
  );
}
