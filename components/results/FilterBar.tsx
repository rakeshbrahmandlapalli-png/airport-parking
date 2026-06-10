"use client";

import type { SortKey } from "@/app/lib/domain";

const OPTIONS: { key: SortKey; label: string }[] = [
  { key: "recommended", label: "Recommended" },
  { key: "price", label: "Lowest price" },
  { key: "rating", label: "Top rated" },
];

interface FilterBarProps {
  value: SortKey;
  onChange: (key: SortKey) => void;
  count: number;
}

export function FilterBar({ value, onChange, count }: FilterBarProps) {
  return (
    <div className="mb-5 flex items-center justify-between gap-3">
      <p className="shrink-0 text-[11px] font-black uppercase tracking-widest text-slate-500">
        {count} {count === 1 ? "operator" : "operators"}
      </p>
      <div className="flex gap-1.5 overflow-x-auto no-scrollbar">
        {OPTIONS.map((o) => (
          <button
            key={o.key}
            type="button"
            onClick={() => onChange(o.key)}
            aria-pressed={value === o.key}
            className={`min-h-11 whitespace-nowrap rounded-xl px-4 text-[11px] font-black uppercase tracking-widest transition-colors touch-manipulation ${
              value === o.key
                ? "bg-blue-600 text-white"
                : "border border-slate-800 bg-[#0F1523] text-slate-400 hover:text-slate-200"
            }`}
          >
            {o.label}
          </button>
        ))}
      </div>
    </div>
  );
}
