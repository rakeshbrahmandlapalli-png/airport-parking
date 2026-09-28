"use client";

// Results error boundary: a failure while loading operators shows a way
// forward instead of a blank screen.

import { useEffect } from "react";
import Link from "next/link";
import { logger } from "@/app/lib/logger";
import StatusPage, { primaryBtn, secondaryBtn } from "@/components/site/StatusPage";

export default function ResultsError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    logger.error("[ResultsError]", error);
  }, [error]);

  return (
    <StatusPage
      title="We couldn't load the prices"
      code={error.digest}
      actions={
        <>
          <button type="button" onClick={reset} className={primaryBtn}>Try again</button>
          <Link href="/" className={secondaryBtn}>Start a new search</Link>
        </>
      }
    >
      <p>Something went wrong while checking prices for your dates. Please try again.</p>
    </StatusPage>
  );
}
