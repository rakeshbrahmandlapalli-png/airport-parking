import type { ReactNode } from "react";
import Link from "next/link";
import Logo from "./Logo";
import { COMPANY } from "@/app/lib/company";

/**
 * Slim header for the booking steps (results → service → checkout). Keeps the
 * shopper focused: logo in the middle, the step's own back action on the left,
 * and a page-specific slot on the right.
 */
export function FunnelHeader({ left, right }: { left?: ReactNode; right?: ReactNode }) {
  return (
    <header className="sticky top-0 z-[100] bg-white border-b border-slate-200">
      <div className="relative max-w-7xl mx-auto h-16 md:h-[72px] px-4 md:px-6 flex items-center justify-between gap-4">
        <div className="min-w-0 flex-1 flex justify-start">{left}</div>
        <Link href="/" aria-label="AeroPark Direct home" className="shrink-0">
          <Logo priority className="h-6 md:h-8 w-auto" />
        </Link>
        <div className="min-w-0 flex-1 flex justify-end">{right}</div>
      </div>
    </header>
  );
}

/** Text + icon link/button style for the header's side slots. */
export const funnelSlotClass =
  "flex items-center gap-2 text-sm font-medium text-slate-600 hover:text-slate-900";

/** Slim legal footer for the booking steps. */
export function FunnelFooter() {
  return (
    <footer className="border-t border-slate-200 bg-white">
      <div className="max-w-7xl mx-auto px-4 md:px-6 py-6 flex flex-col md:flex-row md:items-center md:justify-between gap-3 text-xs leading-relaxed text-slate-500">
        <p>
          &copy; {new Date().getFullYear()} {COMPANY.name}. Company no. {COMPANY.number}. {COMPANY.officeShort}.
        </p>
        <nav aria-label="Legal" className="flex flex-wrap gap-x-5 gap-y-1">
          <Link href="/terms" className="hover:text-slate-900">Terms</Link>
          <Link href="/privacy" className="hover:text-slate-900">Privacy</Link>
          <Link href="/contact" className="hover:text-slate-900">Contact</Link>
          <a href={COMPANY.phoneHref} className="hover:text-slate-900">{COMPANY.phoneDisplay}</a>
        </nav>
      </div>
    </footer>
  );
}
