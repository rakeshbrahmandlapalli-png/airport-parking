import Link from "next/link";
import Logo from "./Logo";
import { COMPANY } from "@/app/lib/company";
import { COMPANY_LINKS, HEATHROW_LINKS, HELP_LINKS, LUTON_LINKS, type NavLink } from "./nav";

// In the footer the airport pages need the airport in their name.
const heathrow: NavLink[] = HEATHROW_LINKS.map((l, i) =>
  i === 0 ? l : { ...l, label: `Heathrow ${l.label}` }
);
const luton: NavLink[] = LUTON_LINKS.map((l, i) => (i === 0 ? l : { ...l, label: `Luton ${l.label}` }));

function Column({ title, links }: { title: string; links: NavLink[] }) {
  return (
    <div>
      <h2 className="text-sm font-semibold text-white mb-4">{title}</h2>
      <ul className="space-y-2.5">
        {links.map((l) => (
          <li key={l.href}>
            <Link href={l.href} className="text-sm text-slate-400 hover:text-white">
              {l.label}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}

export default function SiteFooter() {
  return (
    <footer className="print:hidden relative bg-[#0B1120] text-slate-400">
      <div className="max-w-7xl mx-auto px-4 md:px-6 pt-14 pb-8">
        <div className="grid grid-cols-2 gap-x-6 gap-y-10 lg:grid-cols-[1.2fr_repeat(4,1fr)]">
          <div className="col-span-2 lg:col-span-1 space-y-4">
            <Link href="/" aria-label="AeroPark Direct home" className="inline-block">
              <Logo tone="dark" className="h-8 w-auto" />
            </Link>
            <p className="text-sm leading-relaxed max-w-xs">
              Meet &amp; Greet at Luton and Heathrow, and Park &amp; Ride at Heathrow.
            </p>
            <div className="text-sm space-y-1">
              <p>
                <a href={COMPANY.phoneHref} className="text-slate-200 hover:text-white">{COMPANY.phoneDisplay}</a>
              </p>
              <p>
                <a href={`mailto:${COMPANY.email}`} className="text-slate-200 hover:text-white">{COMPANY.email}</a>
              </p>
            </div>
          </div>

          <nav aria-label="Footer" className="contents">
            <Column title="Heathrow" links={heathrow} />
            <Column title="Luton" links={luton} />
            <Column title="Help" links={HELP_LINKS} />
            <Column title="Company" links={COMPANY_LINKS} />
          </nav>
        </div>

        <div className="mt-12 pt-6 border-t border-white/10 flex flex-col md:flex-row md:items-center md:justify-between gap-3 text-xs leading-relaxed text-slate-500">
          <p>
            &copy; {new Date().getFullYear()} {COMPANY.name}. Registered in England and Wales, company no. {COMPANY.number}.
            Registered office: {COMPANY.officeShort}.
          </p>
          <p className="shrink-0">Card payments processed by Stripe.</p>
        </div>
      </div>
    </footer>
  );
}
