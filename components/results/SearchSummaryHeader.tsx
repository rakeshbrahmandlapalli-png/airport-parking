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

  // The whole strip is the button: people tap the dates to change them, and a
  // strip that only responds on its small Edit chip is a dead click.
  return (
    <button
      type="button"
      onClick={onEdit}
      aria-label={`Change search: ${airport}, ${fmt(dropoff)} to ${fmt(pickup)}`}
      className="group mb-4 flex w-full items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white p-4 text-left transition-colors hover:border-blue-300 touch-manipulation"
    >
      <div className="flex min-w-0 flex-wrap items-center gap-x-4 gap-y-1.5 text-sm">
        <span className="flex items-center gap-1.5 font-semibold text-slate-800"><MapPin className="h-3.5 w-3.5 text-blue-600" /> {airport}</span>
        <span className="flex items-center gap-1.5 text-slate-500"><Calendar className="h-3.5 w-3.5 text-blue-600" /> {fmt(dropoff)} – {fmt(pickup)}</span>
        <span className="flex items-center gap-1.5 text-slate-500"><Moon className="h-3.5 w-3.5 text-blue-600" /> {nights} {nights === 1 ? "day" : "days"}</span>
        <span className="rounded-md bg-blue-50 px-2 py-0.5 font-semibold text-blue-700 text-xs">{service}</span>
      </div>
      <span className="flex min-h-11 shrink-0 items-center gap-1.5 rounded-xl border border-slate-300 px-4 text-sm font-semibold text-slate-600 transition-colors group-hover:border-blue-500 group-hover:text-slate-900">
        <Pencil className="h-3.5 w-3.5" /> Edit
      </span>
    </button>
  );
}
