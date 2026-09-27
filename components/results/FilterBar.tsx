"use client";

import type { SortKey } from "@/app/lib/domain";

const OPTIONS: { key: SortKey; label: string }[] = [
  { key: "recommended", label: "Recommended" },
  { key: "price", label: "Lowest price" },
];

interface FilterBarProps {
  value: SortKey;
  onChange: (key: SortKey) => void;
  count: number;
}

export function FilterBar({ value, onChange, count }: FilterBarProps) {
  return (
    <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
      <p className="shrink-0 text-sm text-slate-600">
        {count} {count === 1 ? "operator" : "operators"}
      </p>
      <div className="flex gap-1.5" role="group" aria-label="Sort operators">
        {OPTIONS.map((o) => (
          <button
            key={o.key}
            type="button"
            onClick={() => onChange(o.key)}
            aria-pressed={value === o.key}
            className={`min-h-10 whitespace-nowrap rounded-lg px-3.5 text-sm font-medium transition-colors touch-manipulation ${
              value === o.key
                ? "bg-[#0B1120] text-white"
                : "border border-slate-300 bg-white text-slate-700 hover:text-slate-900"
            }`}
          >
            {o.label}
          </button>
        ))}
      </div>
    </div>
  );
}
