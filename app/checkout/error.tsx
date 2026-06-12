"use client";

// Checkout-segment error boundary. This is the revenue-critical path, so the
// copy explicitly reassures the customer that no payment was taken — an error
// here happens BEFORE the Stripe redirect, so no card has been charged.

import { logger } from "@/app/lib/logger";
import { useEffect } from "react";
import Link from "next/link";
import { ShieldCheck, RotateCcw, ArrowLeft } from "lucide-react";

export default function CheckoutError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    logger.error("[CheckoutError]", error);
  }, [error]);

  return (
    <div className="flex min-h-[100dvh] flex-col items-center justify-center bg-[#060A14] px-6 text-center">
      <div className="flex h-16 w-16 items-center justify-center rounded-2xl border border-emerald-500/20 bg-emerald-500/10">
        <ShieldCheck className="h-8 w-8 text-emerald-400" />
      </div>
      <h1 className="mt-6 text-2xl font-black tracking-tight text-white">Checkout hit a snag</h1>
      <p className="mt-2 max-w-md text-sm font-medium text-slate-400">
        Don&apos;t worry — <span className="font-bold text-emerald-400">your card has not been charged.</span>{" "}
        This happened before payment. Please try again, or go back to your selection.
      </p>
      {error.digest && (
        <p className="mt-2 font-mono text-[10px] uppercase tracking-widest text-slate-600">
          Ref: {error.digest}
        </p>
      )}
      <div className="mt-8 flex flex-col gap-3 sm:flex-row">
        <button
          type="button"
          onClick={reset}
          className="inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-blue-600 px-6 text-xs font-black uppercase tracking-widest text-white transition-colors hover:bg-blue-500 active:scale-95 touch-manipulation"
        >
          <RotateCcw className="h-4 w-4" /> Try again
        </button>
        <Link
          href="/results"
          className="inline-flex h-12 items-center justify-center gap-2 rounded-xl border border-slate-700 px-6 text-xs font-black uppercase tracking-widest text-slate-300 transition-colors hover:border-slate-500 hover:text-white touch-manipulation"
        >
          <ArrowLeft className="h-4 w-4" /> Back to packages
        </Link>
      </div>
    </div>
  );
}
