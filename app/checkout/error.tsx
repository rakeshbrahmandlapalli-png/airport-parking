"use client";

// Checkout error boundary. Errors here happen before the Stripe redirect, so
// no card has been charged; the message says so.

import { useEffect } from "react";
import { logger } from "@/app/lib/logger";
import StatusPage, { primaryBtn, secondaryBtn } from "@/components/site/StatusPage";

export default function CheckoutError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    logger.error("[CheckoutError]", error);
  }, [error]);

  return (
    <StatusPage
      title="Checkout didn't load"
      code={error.digest}
      actions={
        <>
          <button type="button" onClick={reset} className={primaryBtn}>Try again</button>
          <button type="button" onClick={() => window.history.back()} className={secondaryBtn}>Go back</button>
        </>
      }
    >
      <p><strong className="font-semibold text-slate-900">You haven&apos;t been charged.</strong> This happened before payment.</p>
    </StatusPage>
  );
}
