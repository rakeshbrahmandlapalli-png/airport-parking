"use client";

// Typed extraction of the former inline DetailPanel from app/results/page.tsx.
// Behaviour is unchanged — same tabs, same sanitised rich text, same map embed.

import { useState } from "react";
import {
  ChevronDown, Info, PlaneTakeoff, PlaneLanding, MapIcon, MessageSquare,
  MapPin, Navigation, Star, CheckCircle2,
} from "lucide-react";
import type { Company, Review } from "@/app/lib/domain";
import { sanitizeHtml } from "@/app/lib/sanitizeHtml";

interface OperatorDetailPanelProps {
  operator: Company;
  isHeathrow: boolean;
}

export function OperatorDetailPanel({ operator, isHeathrow }: OperatorDetailPanelProps) {
  const [activeTab, setActiveTab] = useState<"overview" | "arrival" | "return" | "map" | "reviews">("overview");

  const arrivalInstructions = isHeathrow ? operator.on_arrival_lhr : operator.on_arrival_ltn;
  const returnInstructions = isHeathrow ? operator.on_return_lhr : operator.on_return_ltn;
  const currentReviews: Review[] = (isHeathrow ? operator.lhr_reviews : operator.ltn_reviews) ?? [];
  const address = operator.address ?? "";
  const postcode = operator.postcode ?? "";
  const mapUrl = operator.map_url ?? "";
  const safeMapLink = `http://googleusercontent.com/maps.google.com/maps?q=${encodeURIComponent(`${address} ${postcode}`.trim())}`;

  const tabs = [
    { id: "overview", label: "Overview", Icon: Info },
    { id: "arrival", label: "Arrival", Icon: PlaneTakeoff },
    { id: "return", label: "Return", Icon: PlaneLanding },
    { id: "map", label: "Location", Icon: MapIcon },
    { id: "reviews", label: `Reviews (${currentReviews.length})`, Icon: MessageSquare },
  ] as const;

  return (
    <details className="group/details mt-4">
      <summary className="inline-flex items-center gap-2 text-[10px] font-black uppercase tracking-widest cursor-pointer list-none select-none text-blue-400 hover:text-blue-300 transition-colors touch-manipulation [-webkit-tap-highlight-color:transparent] [&::-webkit-details-marker]:hidden">
        <span>View Details, Instructions &amp; Reviews</span>
        <ChevronDown className="w-4 h-4 transition-transform duration-300 group-open/details:rotate-180" />
      </summary>

      <div className="mt-4 rounded-2xl border border-slate-800 bg-[#060A14] overflow-hidden animate-in fade-in slide-in-from-top-4 duration-300">
        <div className="flex flex-wrap items-center gap-1.5 p-2 border-b border-slate-800 overflow-x-auto no-scrollbar">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={(e) => { e.preventDefault(); setActiveTab(tab.id); }}
              className={`flex items-center gap-1.5 px-3 py-2 text-[9px] font-black uppercase tracking-widest rounded-lg transition-all whitespace-nowrap touch-manipulation ${
                activeTab === tab.id ? "bg-blue-600 text-white" : "text-slate-400 hover:text-slate-200 hover:bg-white/5"
              }`}
            >
              <tab.Icon className="w-3 h-3" /> {tab.label}
            </button>
          ))}
        </div>

        <div className="p-4 sm:p-6 min-h-[80px]">
          {activeTab === "overview" && (
            <div className="text-xs leading-relaxed text-slate-300" dangerouslySetInnerHTML={{ __html: sanitizeHtml(operator.overview) || "Professional secure parking service with 24/7 patrols." }} />
          )}
          {activeTab === "arrival" && (
            <div className="text-xs leading-relaxed text-slate-300" dangerouslySetInnerHTML={{ __html: sanitizeHtml(arrivalInstructions) || "Drive directly to the terminal and call 20 mins before arrival." }} />
          )}
          {activeTab === "return" && (
            <div className="text-xs leading-relaxed text-slate-300" dangerouslySetInnerHTML={{ __html: sanitizeHtml(returnInstructions) || "Call the dispatch team after clearing customs." }} />
          )}

          {activeTab === "map" && (
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="flex-1">
                <p className="text-[10px] font-black uppercase tracking-widest text-blue-400 mb-1">Arrival Location</p>
                <p className="text-sm font-bold text-white">{address || "Details provided at terminal"}</p>
                <p className="text-xs mt-1 text-slate-400">Postcode: {postcode || (isHeathrow ? "TW6 1EW" : "LU2 9LY")}</p>
                {address && (
                  <a href={safeMapLink} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 mt-3 text-[10px] font-black uppercase text-blue-400 hover:text-blue-300 touch-manipulation">
                    <Navigation className="w-3 h-3" /> Get Directions
                  </a>
                )}
              </div>
              <div className="flex-1 h-32 sm:h-40 bg-[#0A101D] rounded-xl overflow-hidden relative border border-slate-800 flex items-center justify-center group cursor-pointer">
                {mapUrl ? (
                  <iframe src={mapUrl} width="100%" height="100%" style={{ border: 0 }} loading="lazy" referrerPolicy="no-referrer-when-downgrade" className="grayscale opacity-70 group-hover:grayscale-0 group-hover:opacity-100 transition-all duration-500" />
                ) : (
                  <div className="text-slate-500 text-[10px] font-black uppercase flex flex-col items-center gap-2"><MapPin className="w-5 h-5" /> Map Preview</div>
                )}
              </div>
            </div>
          )}

          {activeTab === "reviews" && (
            <div className="space-y-4 max-h-60 overflow-y-auto pr-2">
              {currentReviews.length > 0 ? (
                currentReviews.map((r, i) => (
                  <div key={r.id ?? i} className="border-b border-slate-800 pb-4 last:border-0">
                    <div className="flex flex-wrap items-center justify-between gap-2 mb-1">
                      <div className="flex items-center gap-2 font-bold text-xs text-blue-400">
                        {r.author}<span className="text-slate-600">•</span>
                        <span className="flex items-center gap-0.5 text-amber-400"><Star className="w-2.5 h-2.5 fill-current" /> {r.rating}/5</span>
                      </div>
                      {r.date && <span className="text-[10px] font-bold text-slate-500">{new Date(r.date).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}</span>}
                    </div>
                    <div className="flex items-center gap-2 mb-1">
                      {r.verified && <span className="text-[9px] font-black uppercase text-emerald-500 flex items-center gap-1"><CheckCircle2 className="w-3 h-3" /> Verified</span>}
                      {r.source && <span className="text-[9px] font-black uppercase text-slate-400 bg-slate-800/50 px-1.5 py-0.5 rounded">{r.source}</span>}
                    </div>
                    <p className="text-xs italic text-slate-300">&ldquo;{r.comment}&rdquo;</p>
                  </div>
                ))
              ) : (
                <p className="text-xs text-slate-500">No reviews yet.</p>
              )}
            </div>
          )}
        </div>
      </div>
    </details>
  );
}
