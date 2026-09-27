"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  Activity, Building2, ExternalLink, LayoutDashboard, LogOut, Menu, MessageCircle,
  PiggyBank, Settings2, Tags, X, type LucideIcon,
} from "lucide-react";
import Logo from "@/components/site/Logo";
import { supabase } from "@/app/lib/supabase";
import { InstallApp } from "./InstallApp";
import { PushToggle } from "./PushToggle";
import { ThemeToggle } from "./ThemeToggle";

// One navigation for every admin page. Each page used to carry its own copy of
// the sidebar and the mobile bar, in two different styles, and some pages
// could not reach Promos, Messages or Activity on a phone at all.

const LINKS: { href: string; label: string; Icon: LucideIcon }[] = [
  { href: "/admin",            label: "Live board",   Icon: LayoutDashboard },
  { href: "/admin/companies",  label: "Operators",    Icon: Building2 },
  { href: "/admin/promos",     label: "Promo codes",  Icon: Tags },
  { href: "/admin/financials", label: "Financials",   Icon: PiggyBank },
  { href: "/admin/messages",   label: "Messages",     Icon: MessageCircle },
  { href: "/admin/activity",   label: "Activity log", Icon: Activity },
  { href: "/admin/settings",   label: "Settings",     Icon: Settings2 },
];

function useSignOut() {
  const router = useRouter();
  return () => supabase.auth.signOut().then(() => router.replace("/admin/login"));
}

function isActive(pathname: string, href: string) {
  return href === "/admin" ? pathname === "/admin" : pathname.startsWith(href);
}

/** Desktop sidebar. Hidden below md. */
export function AdminSidebar({ unreadMessages = 0 }: { unreadMessages?: number }) {
  const pathname = usePathname();
  const signOut = useSignOut();

  return (
    <aside className="hidden md:flex w-60 shrink-0 flex-col sticky top-0 h-screen bg-panel border-r border-fg/[0.06] z-50">
      <div className="px-5 pt-6 pb-5">
        <Link href="/admin" aria-label="Admin home" className="inline-block">
          <Logo tone="dark" className="h-6 w-auto admin-light:hidden" />
          <Logo tone="light" className="h-6 w-auto hidden admin-light:block" />
        </Link>
        <p className="mt-2 text-xs text-fg-4">Admin</p>
      </div>

      <nav aria-label="Admin" className="flex-1 px-3 space-y-0.5">
        {LINKS.map(({ href, label, Icon }) => {
          const active = isActive(pathname, href);
          return (
            <Link
              key={href}
              href={href}
              aria-current={active ? "page" : undefined}
              className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium ${
                active ? "bg-fg/[0.08] text-fg" : "text-fg-3 hover:bg-fg/[0.04] hover:text-fg"
              }`}
            >
              <Icon className={`w-4 h-4 ${active ? "text-blue-400" : "text-fg-4"}`} aria-hidden="true" />
              {label}
              {href === "/admin/messages" && unreadMessages > 0 && (
                <span className="ml-auto rounded-full bg-emerald-500/15 px-2 py-0.5 text-xs font-semibold text-emerald-300">{unreadMessages}</span>
              )}
            </Link>
          );
        })}
      </nav>

      <div className="p-3 space-y-0.5 border-t border-fg/[0.06]">
        <ThemeToggle />
        <PushToggle />
        <InstallApp />
        <Link href="/" target="_blank" className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-fg-3 hover:bg-fg/[0.04] hover:text-fg">
          <ExternalLink className="w-4 h-4 text-fg-4" aria-hidden="true" /> View website
        </Link>
        <button type="button" onClick={signOut} className="w-full flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-fg-3 hover:bg-fg/[0.04] hover:text-red-300">
          <LogOut className="w-4 h-4 text-fg-4" aria-hidden="true" /> Sign out
        </button>
      </div>
    </aside>
  );
}

/**
 * Phone navigation: a bottom bar with the four most-used pages and "More",
 * which opens every admin page plus sign out. An optional `action` (e.g. "New
 * booking") sits in the middle as the primary button.
 */
export function AdminMobileNav({
  action,
  unreadMessages = 0,
}: {
  action?: { label: string; Icon: LucideIcon; onClick: () => void };
  unreadMessages?: number;
}) {
  const pathname = usePathname();
  const signOut = useSignOut();
  const [open, setOpen] = useState(false);

  const primary = [LINKS[0], LINKS[1], LINKS[3], LINKS[4]];
  const item = (l: (typeof LINKS)[number]) => {
    const active = isActive(pathname, l.href);
    return (
      <Link
        key={l.href}
        href={l.href}
        aria-current={active ? "page" : undefined}
        className={`relative flex flex-1 flex-col items-center justify-center gap-1 py-2 text-[11px] font-medium ${active ? "text-fg" : "text-fg-3"}`}
      >
        <l.Icon className={`w-5 h-5 ${active ? "text-blue-400" : ""}`} aria-hidden="true" />
        {l.label.split(" ")[0]}
        {l.href === "/admin/messages" && unreadMessages > 0 && (
          <span className="absolute top-1.5 right-1/2 translate-x-4 w-2 h-2 rounded-full bg-emerald-400" aria-label={`${unreadMessages} unread`} />
        )}
      </Link>
    );
  };

  return (
    <>
      <nav aria-label="Admin" className="md:hidden fixed bottom-0 inset-x-0 z-[100] bg-panel border-t border-fg/10 pb-[env(safe-area-inset-bottom)]">
        <div className="flex items-stretch h-16">
          {item(primary[0])}
          {item(primary[1])}
          {action && (
            <div className="flex flex-1 items-center justify-center">
              <button
                type="button"
                onClick={action.onClick}
                aria-label={action.label}
                className="w-11 h-11 rounded-lg bg-blue-600 hover:bg-blue-700 text-white flex items-center justify-center"
              >
                <action.Icon className="w-5 h-5" aria-hidden="true" />
              </button>
            </div>
          )}
          {item(primary[2])}
          {!action && item(primary[3])}
          <button
            type="button"
            onClick={() => setOpen(true)}
            aria-expanded={open}
            className="flex flex-1 flex-col items-center justify-center gap-1 py-2 text-[11px] font-medium text-fg-3"
          >
            <Menu className="w-5 h-5" aria-hidden="true" /> More
          </button>
        </div>
      </nav>

      {open && (
        <div className="md:hidden fixed inset-0 z-[150] bg-black/60" onClick={() => setOpen(false)}>
          <div
            role="dialog"
            aria-modal="true"
            aria-label="Admin menu"
            className="absolute bottom-0 inset-x-0 rounded-t-xl bg-panel border-t border-fg/10 p-3 pb-[calc(env(safe-area-inset-bottom)+12px)]"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-2 pb-2">
              <p className="text-sm font-semibold text-fg">Admin</p>
              <button type="button" onClick={() => setOpen(false)} aria-label="Close menu" className="p-2 text-fg-3 hover:text-fg">
                <X className="w-5 h-5" />
              </button>
            </div>
            {LINKS.map(({ href, label, Icon }) => {
              const active = isActive(pathname, href);
              return (
                <Link
                  key={href}
                  href={href}
                  onClick={() => setOpen(false)}
                  aria-current={active ? "page" : undefined}
                  className={`flex items-center gap-3 rounded-lg px-3 py-3 text-base ${active ? "bg-fg/[0.08] text-fg" : "text-fg-2"}`}
                >
                  <Icon className="w-5 h-5 text-fg-4" aria-hidden="true" /> {label}
                  {href === "/admin/messages" && unreadMessages > 0 && (
                    <span className="ml-auto rounded-full bg-emerald-500/15 px-2 py-0.5 text-xs font-semibold text-emerald-300">{unreadMessages}</span>
                  )}
                </Link>
              );
            })}
            <div className="mt-2 pt-2 border-t border-fg/10">
              <ThemeToggle />
              <PushToggle />
              <InstallApp />
              <Link href="/" target="_blank" className="flex items-center gap-3 rounded-lg px-3 py-3 text-base text-fg-2">
                <ExternalLink className="w-5 h-5 text-fg-4" aria-hidden="true" /> View website
              </Link>
              <button type="button" onClick={signOut} className="w-full flex items-center gap-3 rounded-lg px-3 py-3 text-base text-red-300">
                <LogOut className="w-5 h-5" aria-hidden="true" /> Sign out
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
