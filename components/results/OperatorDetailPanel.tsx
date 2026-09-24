"use client";

// Typed extraction of the former inline DetailPanel from app/results/page.tsx.
// Behaviour is unchanged — same tabs, same sanitised rich text, same map embed.

import { useState } from "react";
import {
  ChevronDown, Info, PlaneTakeoff, PlaneLanding, MapIcon, MapPin, Navigation,
} from "lucide-react";
import type { Company } from "@/app/lib/domain";
import { sanitizeHtml } from "@/app/lib/sanitizeHtml";

interface OperatorDetailPanelProps {
  operator: Company;
  isHeathrow: boolean;
}

export function OperatorDetailPanel({ operator, isHeathrow }: OperatorDetailPanelProps) {
  const [activeTab, setActiveTab] = useState<"overview" | "arrival" | "return" | "map">("overview");

  const arrivalInstructions = isHeathrow ? operator.on_arrival_lhr : operator.on_arrival_ltn;
  const returnInstructions = isHeathrow ? operator.on_return_lhr : operator.on_return_ltn;
  const address = operator.address ?? "";
  const postcode = operator.postcode ?? "";
  const mapUrl = operator.map_url ?? "";
  const safeMapLink = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${address} ${postcode}`.trim())}`;

  // No Reviews tab: the stored reviews were seeded placeholders, not real
  // customers. Bring it back only once genuine reviews are collected.
  const tabs = [
    { id: "overview", label: "Overview", Icon: Info },
    { id: "arrival", label: "Arrival", Icon: PlaneTakeoff },
    { id: "return", label: "Return", Icon: PlaneLanding },
    { id: "map", label: "Location", Icon: MapIcon },
  ] as const;

  return (
    <details className="group/details mt-4">
      <summary className="inline-flex items-center gap-1.5 text-sm font-semibold cursor-pointer list-none select-none text-blue-600 hover:text-blue-700 transition-colors touch-manipulation [-webkit-tap-highlight-color:transparent] [&::-webkit-details-marker]:hidden">
        <span>Arrival &amp; return instructions</span>
        <ChevronDown className="w-4 h-4 transition-transform duration-300 group-open/details:rotate-180" />
      </summary>

      <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 overflow-hidden animate-in fade-in slide-in-from-top-4 duration-300">
        <div className="flex flex-wrap items-center gap-1.5 p-2 border-b border-slate-200 overflow-x-auto no-scrollbar">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={(e) => { e.preventDefault(); setActiveTab(tab.id); }}
              className={`flex items-center gap-1.5 px-3 py-2 text-[9px] font-black uppercase tracking-widest rounded-lg transition-all whitespace-nowrap touch-manipulation ${
                activeTab === tab.id ? "bg-blue-600 text-white" : "text-slate-500 hover:text-slate-900 hover:bg-slate-200/60"
              }`}
            >
              <tab.Icon className="w-3 h-3" /> {tab.label}
            </button>
          ))}
        </div>

        <div className="p-4 sm:p-6 min-h-[80px]">
          {activeTab === "overview" && (
            <div className="text-xs leading-relaxed text-slate-700" dangerouslySetInnerHTML={{ __html: sanitizeHtml(operator.overview) || "Professional secure parking service with 24/7 patrols." }} />
          )}
          {activeTab === "arrival" && (
            <div className="text-xs leading-relaxed text-slate-700" dangerouslySetInnerHTML={{ __html: sanitizeHtml(arrivalInstructions) || "Drive directly to the terminal and call 20 mins before arrival." }} />
          )}
          {activeTab === "return" && (
            <div className="text-xs leading-relaxed text-slate-700" dangerouslySetInnerHTML={{ __html: sanitizeHtml(returnInstructions) || "Call the dispatch team after clearing customs." }} />
          )}

          {activeTab === "map" && (
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="flex-1">
                <p className="text-[10px] font-black uppercase tracking-widest text-blue-600 mb-1">Arrival Location</p>
                <p className="text-sm font-bold text-slate-900">{address || "Details provided at terminal"}</p>
                <p className="text-xs mt-1 text-slate-500">Postcode: {postcode || (isHeathrow ? "TW6 1EW" : "LU2 9LY")}</p>
                {address && (
                  <a href={safeMapLink} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 mt-3 text-[10px] font-black uppercase text-blue-600 hover:text-blue-700 touch-manipulation">
                    <Navigation className="w-3 h-3" /> Get Directions
                  </a>
                )}
              </div>
              {mapUrl ? (
                <div className="flex-1 h-32 sm:h-40 bg-slate-100 rounded-xl overflow-hidden relative border border-slate-200 group">
                  <iframe src={mapUrl} title={`Map of ${operator.name}`} width="100%" height="100%" style={{ border: 0 }} loading="lazy" referrerPolicy="no-referrer-when-downgrade" className="grayscale opacity-70 group-hover:grayscale-0 group-hover:opacity-100 transition-all duration-500" />
                </div>
              ) : address ? (
                <a href={safeMapLink} target="_blank" rel="noreferrer" className="flex-1 h-32 sm:h-40 bg-slate-100 hover:bg-slate-200/70 rounded-xl border border-slate-200 flex flex-col items-center justify-center gap-2 text-slate-500 text-xs font-semibold transition-colors">
                  <MapPin className="w-5 h-5" /> Open in Google Maps
                </a>
              ) : null}
            </div>
          )}
        </div>
      </div>
    </details>
  );
}
