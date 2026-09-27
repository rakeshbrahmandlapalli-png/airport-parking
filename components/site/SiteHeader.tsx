"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronDown, Menu, Phone, X } from "lucide-react";
import Logo from "./Logo";
import { COMPANY } from "@/app/lib/company";
import { HEATHROW_LINKS, LUTON_LINKS, MAIN_LINKS, type NavLink } from "./nav";

function DropdownColumn({ title, links, onNavigate }: { title: string; links: NavLink[]; onNavigate: () => void }) {
  return (
    <div>
      <p className="text-xs font-semibold text-slate-500 mb-2">{title}</p>
      <ul className="space-y-1">
        {links.map((l) => (
          <li key={l.href}>
            <Link
              href={l.href}
              onClick={onNavigate}
              className="block rounded-md px-2 py-1.5 -mx-2 text-sm text-slate-700 hover:bg-slate-100 hover:text-slate-900"
            >
              {l.label}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}

export default function SiteHeader() {
  const pathname = usePathname();
  const parkingRef = useRef<HTMLDivElement>(null);

  // Menus remember the page they were opened on, so they close by themselves
  // when the route changes.
  const [menuPath, setMenuPath] = useState<string | null>(null);
  const [parkingPath, setParkingPath] = useState<string | null>(null);
  const menuOpen = menuPath === pathname;
  const parkingOpen = parkingPath === pathname;
  const setMenuOpen = (open: boolean) => setMenuPath(open ? pathname : null);
  const setParkingOpen = (open: boolean) => setParkingPath(open ? pathname : null);

  // Close the Parking menu on outside click or Escape.
  useEffect(() => {
    if (!parkingOpen) return;
    const onClick = (e: MouseEvent) => {
      if (parkingRef.current && !parkingRef.current.contains(e.target as Node)) setParkingPath(null);
    };
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setParkingPath(null);
    document.addEventListener("mousedown", onClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onClick);
      document.removeEventListener("keydown", onKey);
    };
  }, [parkingOpen]);

  // Stop the page scrolling behind the open mobile menu.
  useEffect(() => {
    document.body.style.overflow = menuOpen ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [menuOpen]);

  const isActive = (href: string) => pathname === href;

  return (
    <header className="print:hidden sticky top-0 z-[100] bg-white border-b border-slate-200">
      <div className="max-w-7xl mx-auto h-16 md:h-[72px] px-4 md:px-6 flex items-center justify-between gap-6">
        <Link href="/" aria-label="AeroPark Direct home" className="shrink-0">
          <Logo priority className="h-7 md:h-8 w-auto" />
        </Link>

        <nav aria-label="Main" className="hidden lg:flex items-center gap-1">
          <div ref={parkingRef} className="relative">
            <button
              type="button"
              aria-expanded={parkingOpen}
              aria-haspopup="true"
              onClick={() => setParkingOpen(!parkingOpen)}
              className="flex items-center gap-1 rounded-md px-3 py-2 text-sm font-medium text-slate-700 hover:text-slate-900 hover:bg-slate-100"
            >
              Parking
              <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform ${parkingOpen ? "rotate-180" : ""}`} aria-hidden="true" />
            </button>
            {parkingOpen && (
              <div className="absolute left-0 top-full mt-2 w-[440px] rounded-xl border border-slate-200 bg-white p-5 shadow-lg grid grid-cols-2 gap-8">
                <DropdownColumn title="Heathrow (LHR)" links={HEATHROW_LINKS} onNavigate={() => setParkingOpen(false)} />
                <DropdownColumn title="Luton (LTN)" links={LUTON_LINKS} onNavigate={() => setParkingOpen(false)} />
              </div>
            )}
          </div>
          {MAIN_LINKS.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              aria-current={isActive(l.href) ? "page" : undefined}
              className={`rounded-md px-3 py-2 text-sm font-medium hover:bg-slate-100 ${isActive(l.href) ? "text-slate-900" : "text-slate-700 hover:text-slate-900"}`}
            >
              {l.label}
            </Link>
          ))}
        </nav>

        <div className="hidden lg:flex items-center gap-5 shrink-0">
          <a href={COMPANY.phoneHref} className="flex items-center gap-2 text-sm font-medium text-slate-700 hover:text-slate-900">
            <Phone className="w-4 h-4 text-slate-400" aria-hidden="true" />
            {COMPANY.phoneDisplay}
          </a>
          <Link
            href="/manage"
            className="rounded-lg bg-[#0B1120] px-4 py-2.5 text-sm font-semibold text-white hover:bg-slate-800"
          >
            Manage booking
          </Link>
        </div>

        <button
          type="button"
          onClick={() => setMenuOpen(!menuOpen)}
          aria-expanded={menuOpen}
          aria-controls="mobile-menu"
          aria-label={menuOpen ? "Close menu" : "Open menu"}
          className="lg:hidden -mr-2 p-2 rounded-md text-slate-700 hover:bg-slate-100"
        >
          {menuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
        </button>
      </div>

      {menuOpen && (
        <div id="mobile-menu" className="lg:hidden fixed inset-x-0 top-16 md:top-[72px] bottom-0 bg-white border-t border-slate-200 overflow-y-auto">
          <div className="px-4 md:px-6 py-6 space-y-8">
            <div className="grid grid-cols-2 gap-6">
              <DropdownColumn title="Heathrow (LHR)" links={HEATHROW_LINKS} onNavigate={() => setMenuOpen(false)} />
              <DropdownColumn title="Luton (LTN)" links={LUTON_LINKS} onNavigate={() => setMenuOpen(false)} />
            </div>
            <ul className="border-t border-slate-200">
              {MAIN_LINKS.map((l) => (
                <li key={l.href} className="border-b border-slate-200">
                  <Link href={l.href} onClick={() => setMenuOpen(false)} className="block py-3.5 text-base font-medium text-slate-900">
                    {l.label}
                  </Link>
                </li>
              ))}
            </ul>
            <div className="space-y-3">
              <Link
                href="/manage"
                onClick={() => setMenuOpen(false)}
                className="block w-full rounded-lg bg-[#0B1120] py-3 text-center text-base font-semibold text-white"
              >
                Manage booking
              </Link>
              <a
                href={COMPANY.phoneHref}
                className="flex w-full items-center justify-center gap-2 rounded-lg border border-slate-300 py-3 text-base font-medium text-slate-900"
              >
                <Phone className="w-4 h-4" aria-hidden="true" /> Call {COMPANY.phoneDisplay}
              </a>
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
