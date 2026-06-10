"use client";

// Results-segment error boundary. A thrown error while fetching/rendering
// operators no longer white-screens the page — the user gets a recoverable state.

import { useEffect } from "react";
import Link from "next/link";
import { SearchX, RotateCcw, ArrowLeft } from "lucide-react";

export default function ResultsError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[ResultsError]", error);
  }, [error]);

  return (
    <div className="flex min-h-[100dvh] flex-col items-center justify-center bg-[#060A14] px-6 text-center">
      <div className="flex h-16 w-16 items-center justify-center rounded-2xl border border-blue-500/20 bg-blue-500/10">
        <SearchX className="h-8 w-8 text-blue-400" />
      </div>
      <h1 className="mt-6 text-2xl font-black tracking-tight text-white">Couldn&apos;t load your results</h1>
      <p className="mt-2 max-w-md text-sm font-medium text-slate-400">
        We had trouble fetching live parking rates. Please try again, or start a new search.
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
          <ArrowLeft className="h-4 w-4" /> New search
        </Link>
      </div>
    </div>
  );
}
