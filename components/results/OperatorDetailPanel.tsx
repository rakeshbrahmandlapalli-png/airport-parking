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
      <summary className="inline-flex items-center gap-1.5 text-sm font-semibold cursor-pointer list-none select-none text-blue-700 hover:text-blue-800 transition-colors touch-manipulation [-webkit-tap-highlight-color:transparent] [&::-webkit-details-marker]:hidden">
        <span>Arrival &amp; return instructions</span>
        <ChevronDown className="w-4 h-4 transition-transform duration-300 group-open/details:rotate-180" />
      </summary>

      <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 overflow-hidden">
        <div className="flex flex-wrap items-center gap-1.5 p-2 border-b border-slate-200 overflow-x-auto no-scrollbar">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={(e) => { e.preventDefault(); setActiveTab(tab.id); }}
              className={`flex items-center gap-1.5 px-3 py-2 text-sm font-medium rounded-md whitespace-nowrap touch-manipulation ${
                activeTab === tab.id ? "bg-white text-slate-900 shadow-sm border border-slate-200" : "text-slate-600 hover:text-slate-900 hover:bg-slate-200/60"
              }`}
            >
              <tab.Icon className="w-4 h-4" aria-hidden="true" /> {tab.label}
            </button>
          ))}
        </div>

        <div className="p-4 sm:p-6 min-h-[80px]">
          {activeTab === "overview" && (
            <div className="text-sm leading-relaxed text-slate-700" dangerouslySetInnerHTML={{ __html: sanitizeHtml(operator.overview) || "This operator hasn't added a description yet." }} />
          )}
          {activeTab === "arrival" && (
            <div className="text-sm leading-relaxed text-slate-700" dangerouslySetInnerHTML={{ __html: sanitizeHtml(arrivalInstructions) || "Your arrival instructions will be in your confirmation email." }} />
          )}
          {activeTab === "return" && (
            <div className="text-sm leading-relaxed text-slate-700" dangerouslySetInnerHTML={{ __html: sanitizeHtml(returnInstructions) || "Your return instructions will be in your confirmation email." }} />
          )}

          {activeTab === "map" && (
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="flex-1">
                <p className="text-sm font-medium text-slate-500 mb-1">Operator address</p>
                <p className="text-sm font-semibold text-slate-900">{address || "The meeting point is in your confirmation email."}</p>
                {postcode && <p className="text-sm mt-1 text-slate-500">{postcode}</p>}
                {address && (
                  <a href={safeMapLink} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 mt-3 text-sm font-semibold text-blue-700 hover:underline underline-offset-4 touch-manipulation">
                    <Navigation className="w-4 h-4" aria-hidden="true" /> Get directions
                  </a>
                )}
              </div>
              {mapUrl ? (
                <div className="flex-1 h-32 sm:h-40 bg-slate-100 rounded-xl overflow-hidden relative border border-slate-200 group">
                  <iframe src={mapUrl} title={`Map of ${operator.name}`} width="100%" height="100%" style={{ border: 0 }} loading="lazy" referrerPolicy="no-referrer-when-downgrade"  />
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
