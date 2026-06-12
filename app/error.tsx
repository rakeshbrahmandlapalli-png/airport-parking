"use client";

// Root error boundary for the App Router. Catches render/runtime errors thrown
// anywhere in the route tree (below the root layout) instead of white-screening.
// See: Next.js App Router error-handling conventions.

import { useEffect } from "react";
import Link from "next/link";
import { AlertTriangle, RotateCcw, Home } from "lucide-react";
import { logger } from "@/app/lib/logger";

export default function GlobalRouteError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Sanitised + silent-in-prod via the logger; register a Sentry transport
    // on the logger to forward these to an error backend.
    logger.error("[ErrorBoundary]", { err: error });
  }, [error]);

  return (
    <div className="flex min-h-[100dvh] flex-col items-center justify-center bg-[#060A14] px-6 text-center">
      <div className="flex h-16 w-16 items-center justify-center rounded-2xl border border-amber-500/20 bg-amber-500/10">
        <AlertTriangle className="h-8 w-8 text-amber-400" />
      </div>
      <h1 className="mt-6 text-2xl font-black tracking-tight text-white">Something went wrong</h1>
      <p className="mt-2 max-w-md text-sm font-medium text-slate-400">
        We hit an unexpected error. Your details are safe — please try again, or head back home.
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
          href="/"
          className="inline-flex h-12 items-center justify-center gap-2 rounded-xl border border-slate-700 px-6 text-xs font-black uppercase tracking-widest text-slate-300 transition-colors hover:border-slate-500 hover:text-white touch-manipulation"
        >
          <Home className="h-4 w-4" /> Home
        </Link>
      </div>
    </div>
  );
}
