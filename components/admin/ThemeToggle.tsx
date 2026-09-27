"use client";

import { useEffect, useState } from "react";
import { Monitor, Moon, Sun } from "lucide-react";

// Dark / Light / Auto for the admin (Admin menu). The choice is kept on this
// device only. The colours themselves are CSS variables in app/globals.css
// ("ADMIN THEME"); app/admin/layout.tsx applies the saved choice on load.

type Pref = "dark" | "light" | "auto";
const KEY = "ap-admin-theme";

function readPref(): Pref {
  try {
    const v = localStorage.getItem(KEY);
    return v === "light" || v === "auto" ? v : "dark";
  } catch {
    return "dark";
  }
}

function apply(pref: Pref) {
  const light = pref === "light" || (pref === "auto" && window.matchMedia("(prefers-color-scheme: light)").matches);
  document.querySelector("[data-admin-root]")?.setAttribute("data-admin-theme", light ? "light" : "dark");
  document.querySelector('meta[name="theme-color"]')?.setAttribute("content", light ? "#F1F5F9" : "#0B1120");
}

const OPTIONS: { value: Pref; label: string; Icon: typeof Sun }[] = [
  { value: "dark", label: "Dark", Icon: Moon },
  { value: "light", label: "Light", Icon: Sun },
  { value: "auto", label: "Auto", Icon: Monitor },
];

export function ThemeToggle() {
  const [pref, setPref] = useState<Pref | null>(null);

  useEffect(() => {
    const saved = readPref();
    setPref(saved);
    apply(saved); // the layout script doesn't run after a client-side navigation
  }, []);

  // In Auto, follow the phone or computer when it switches (e.g. at sunset).
  useEffect(() => {
    if (pref !== "auto") return;
    const mq = window.matchMedia("(prefers-color-scheme: light)");
    const onChange = () => apply("auto");
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, [pref]);

  const choose = (next: Pref) => {
    setPref(next);
    try { localStorage.setItem(KEY, next); } catch {}
    apply(next);
  };

  return (
    <div className="px-3 py-2">
      <p className="mb-1.5 text-xs text-fg-4">Appearance</p>
      <div role="radiogroup" aria-label="Appearance" className="grid grid-cols-3 gap-1 rounded-lg bg-fg/[0.05] p-1">
        {OPTIONS.map(({ value, label, Icon }) => {
          const active = pref === value;
          return (
            <button
              key={value}
              type="button"
              role="radio"
              aria-checked={active}
              onClick={() => choose(value)}
              className={`flex items-center justify-center gap-1.5 rounded-md py-1.5 text-xs font-medium ${
                active ? "bg-panel text-fg shadow-sm ring-1 ring-fg/10" : "text-fg-3 hover:text-fg"
              }`}
            >
              <Icon className="w-3.5 h-3.5" aria-hidden="true" /> {label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
