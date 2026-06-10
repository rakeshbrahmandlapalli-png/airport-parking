"use client";

import { Calendar, MapPin, Moon, Pencil } from "lucide-react";

interface SearchSummaryHeaderProps {
  airport: string;
  dropoff: string;
  pickup: string;
  nights: number;
  serviceType: string;
  onEdit: () => void;
}

export function SearchSummaryHeader({
  airport, dropoff, pickup, nights, serviceType, onEdit,
}: SearchSummaryHeaderProps) {
  const fmt = (d: string) =>
    d ? new Date(d).toLocaleDateString("en-GB", { day: "numeric", month: "short" }) : "—";
  // Map known service slugs to their proper labels (the slug drops the "&", so a
  // naive title-case renders "Meet Greet"). Fall back to title-case for anything new.
  const SERVICE_LABELS: Record<string, string> = {
    "meet-greet": "Meet & Greet",
    "park-ride": "Park & Ride",
    "hotel": "Hotel & Parking",
  };
  const service = SERVICE_LABELS[serviceType.toLowerCase()]
    ?? serviceType.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());

  return (
    <div className="mb-4 flex items-center justify-between gap-3 rounded-2xl border border-slate-800 bg-[#0F1523] p-4">
      <div className="flex min-w-0 flex-wrap items-center gap-x-4 gap-y-1.5 text-[11px] font-black uppercase tracking-widest text-slate-300">
        <span className="flex items-center gap-1.5"><MapPin className="h-3.5 w-3.5 text-blue-400" /> {airport}</span>
        <span className="flex items-center gap-1.5"><Calendar className="h-3.5 w-3.5 text-blue-400" /> {fmt(dropoff)} – {fmt(pickup)}</span>
        <span className="flex items-center gap-1.5"><Moon className="h-3.5 w-3.5 text-blue-400" /> {nights} {nights === 1 ? "day" : "days"}</span>
        <span className="rounded-md bg-blue-500/10 px-2 py-0.5 text-blue-300">{service}</span>
      </div>
      <button
        type="button"
        onClick={onEdit}
        className="flex min-h-11 shrink-0 items-center gap-1.5 rounded-xl border border-slate-700 px-4 text-[10px] font-black uppercase tracking-widest text-slate-300 transition-colors hover:border-blue-500 hover:text-white touch-manipulation"
      >
        <Pencil className="h-3.5 w-3.5" /> Edit
      </button>
    </div>
  );
}
