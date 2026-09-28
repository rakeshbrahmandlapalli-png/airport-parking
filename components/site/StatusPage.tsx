import Link from "next/link";
import type { ReactNode } from "react";
import Logo from "@/components/site/Logo";
import { COMPANY } from "@/app/lib/company";

/**
 * Plain full-page message for "page not found" and the error boundaries.
 * Deliberately self-contained (just the logo, no site header or data), so it
 * still renders when whatever broke the page was the header itself.
 */
export default function StatusPage({
  title,
  children,
  actions,
  code,
}: {
  title: string;
  children: ReactNode;
  actions: ReactNode;
  code?: string;
}) {
  return (
    <main className="min-h-[100dvh] bg-slate-50 flex flex-col font-sans text-slate-900">
      <header className="border-b border-slate-200 bg-white">
        <div className="max-w-6xl mx-auto px-4 md:px-6 h-16 flex items-center">
          <Link href="/" aria-label="AeroPark Direct home">
            <Logo className="h-7 w-auto" />
          </Link>
        </div>
      </header>

      <div className="flex-1 flex items-center">
        <div className="max-w-xl mx-auto w-full px-4 md:px-6 py-16">
          <h1 className="text-3xl md:text-4xl font-semibold tracking-tight">{title}</h1>
          <div className="mt-3 text-base md:text-lg text-slate-600 leading-relaxed space-y-3">{children}</div>
          <div className="mt-8 flex flex-col sm:flex-row gap-3">{actions}</div>
          <p className="mt-10 text-sm text-slate-500">
            Need help? Call <a href={COMPANY.phoneHref} className="text-slate-700 underline underline-offset-4">{COMPANY.phoneDisplay}</a> or
            email <a href={`mailto:${COMPANY.email}`} className="text-slate-700 underline underline-offset-4">{COMPANY.email}</a>.
          </p>
          {code && <p className="mt-2 text-xs text-slate-400 font-mono">Reference: {code}</p>}
        </div>
      </div>
    </main>
  );
}

export const primaryBtn = "inline-flex h-12 items-center justify-center gap-2 rounded-lg bg-blue-600 px-5 font-semibold text-white hover:bg-blue-700";
export const secondaryBtn = "inline-flex h-12 items-center justify-center gap-2 rounded-lg border border-slate-300 bg-white px-5 font-semibold text-slate-900 hover:bg-slate-100";
