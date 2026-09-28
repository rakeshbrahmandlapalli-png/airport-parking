"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import { FunnelHeader, FunnelFooter, funnelSlotClass } from "@/components/site/FunnelChrome";
import ModifySearchModal from "@/components/ModifySearchModal";
import { ArrowLeft, ArrowRight, Bus, Car, Check, Hotel, MapPin } from "lucide-react";

type Service = {
  id: string;
  title: string;
  tag?: string;
  description: string;
  Icon: typeof Car;
  points: string[];
  note: string;
  disabled: boolean;
};

function ServiceSelectionContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  // Carry the search from the homepage through to the results page.
  const airport = searchParams.get("airport") || "Luton (LTN)";
  const dropoffDate = searchParams.get("dropoffDate") || "";
  const dropoffTime = searchParams.get("dropoffTime") || "";
  const pickupDate = searchParams.get("pickupDate") || "";
  const pickupTime = searchParams.get("pickupTime") || "";

  const shortDate = (d: string) => {
    const [y, m, day] = d.split("-").map(Number);
    if (!y || !m || !day) return "";
    return new Date(y, m - 1, day).toLocaleDateString("en-GB", { day: "numeric", month: "short" });
  };
  const dateDisplay = dropoffDate && pickupDate ? `${shortDate(dropoffDate)} – ${shortDate(pickupDate)}` : "";

  const airportCode = airport.includes("Heathrow") ? "LHR" : "LTN";
  const airportName = airportCode === "LHR" ? "Heathrow" : "Luton";
  // Park & Ride isn't live at Luton yet; it's bookable at Heathrow.
  const isLuton = airportCode === "LTN";

  const [isEditOpen, setIsEditOpen] = useState(false);
  const currentSearch = { airport, dropDate: dropoffDate, dropTime: dropoffTime, pickDate: pickupDate, pickTime: pickupTime, type: "" };

  const handleSelect = (s: Service) => {
    if (s.disabled) return;
    const query = new URLSearchParams({ airport, dropoffDate, dropoffTime, pickupDate, pickupTime, type: s.id }).toString();
    router.push(`/results?${query}`);
  };

  const services: Service[] = [
    {
      id: "meet-greet",
      title: "Meet & Greet",
      tag: "Most popular",
      description: "Drive to the terminal and hand your keys to a driver from the parking company. Your car is waiting for you there when you land.",
      Icon: Car,
      points: ["No shuttle bus", "Drop off and collect at the terminal", "Easiest with children or luggage"],
      note: "Minutes from check-in",
      disabled: false,
    },
    {
      id: "park-ride",
      title: "Park & Ride",
      tag: isLuton ? "Coming soon" : "Lower price",
      description: isLuton
        ? "Not available at Luton yet. Meet & Greet is often a similar price."
        : "Park at a secure car park near the airport and take the shuttle bus to the terminal.",
      Icon: Bus,
      points: isLuton ? [] : ["Usually the cheapest option", "Regular shuttle to the terminal"],
      note: isLuton ? "" : "Short shuttle ride",
      disabled: isLuton,
    },
    {
      id: "hotel",
      title: "Hotel & Parking",
      tag: "Coming soon",
      description: "A night at an airport hotel with parking for your trip. Not available yet.",
      Icon: Hotel,
      points: [],
      note: "",
      disabled: true,
    },
  ];

  return (
    <main suppressHydrationWarning className="min-h-[100dvh] bg-slate-50 font-sans antialiased overflow-x-clip flex flex-col">
      <FunnelHeader
        left={
          <button type="button" onClick={() => setIsEditOpen(true)} className={funnelSlotClass}>
            <ArrowLeft className="w-4 h-4" aria-hidden="true" />
            <span className="hidden sm:inline">Change search</span>
          </button>
        }
        right={
          <button type="button" onClick={() => setIsEditOpen(true)} className="text-right text-sm leading-tight text-slate-600 hover:text-slate-900 whitespace-nowrap">
            <span className="block font-semibold text-slate-900">{airportCode}</span>
            {dateDisplay && <span className="hidden sm:block text-xs">{dateDisplay}</span>}
          </button>
        }
      />

      <div className="flex-1 max-w-5xl mx-auto w-full pt-10 md:pt-14 pb-16 px-4 sm:px-6">
        <div className="mb-8 md:mb-10">
          <button
            type="button"
            onClick={() => setIsEditOpen(true)}
            className="inline-flex items-center gap-1.5 text-sm text-slate-600 hover:text-slate-900"
          >
            <MapPin className="w-4 h-4" aria-hidden="true" />
            {airportName}{dateDisplay ? ` · ${dateDisplay}` : ""}
            <span className="text-blue-700 underline underline-offset-4 ml-1">Change</span>
          </button>
          <h1 className="mt-3 text-3xl md:text-4xl font-semibold tracking-tight text-slate-900">How would you like to park?</h1>
          <p className="mt-2 text-base md:text-lg text-slate-600 max-w-2xl">
            Choose a type of parking and we&apos;ll show you the operators and prices for your dates.
          </p>
        </div>

        <ul className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {services.map((s) => (
            <li key={s.id}>
              <button
                type="button"
                onClick={() => handleSelect(s)}
                disabled={s.disabled}
                aria-disabled={s.disabled}
                className={`group w-full h-full text-left rounded-xl border bg-white p-5 md:p-6 flex flex-col transition-colors ${
                  s.disabled
                    ? "border-slate-200 bg-slate-50 cursor-not-allowed"
                    : "border-slate-300 hover:border-blue-600 focus-visible:border-blue-600 focus-visible:ring-2 focus-visible:ring-blue-600/20 outline-none"
                }`}
              >
                <div className="flex items-center justify-between gap-3">
                  <s.Icon className={`w-6 h-6 ${s.disabled ? "text-slate-400" : "text-blue-700"}`} aria-hidden="true" />
                  {s.tag && (
                    <span className={`rounded-md px-2 py-0.5 text-xs font-medium ${s.disabled ? "bg-slate-200 text-slate-600" : "bg-blue-50 text-blue-800"}`}>
                      {s.tag}
                    </span>
                  )}
                </div>
                <h2 className={`mt-4 text-xl font-semibold ${s.disabled ? "text-slate-500" : "text-slate-900"}`}>{s.title}</h2>
                <p className={`mt-1.5 text-sm leading-relaxed ${s.disabled ? "text-slate-500" : "text-slate-600"}`}>{s.description}</p>

                {s.points.length > 0 && (
                  <ul className="mt-4 space-y-1.5">
                    {s.points.map((pt) => (
                      <li key={pt} className="flex items-start gap-2 text-sm text-slate-700">
                        <Check className="w-4 h-4 mt-0.5 shrink-0 text-emerald-600" aria-hidden="true" /> {pt}
                      </li>
                    ))}
                  </ul>
                )}

                {!s.disabled && (
                  <div className="mt-auto pt-5 flex items-center justify-between">
                    <span className="text-sm text-slate-500">{s.note}</span>
                    <span className="inline-flex items-center gap-1.5 text-sm font-semibold text-blue-700">
                      See prices <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-0.5" aria-hidden="true" />
                    </span>
                  </div>
                )}
              </button>
            </li>
          ))}
        </ul>
      </div>

      <ModifySearchModal
        isOpen={isEditOpen}
        onClose={() => setIsEditOpen(false)}
        onSearchUpdate={(query) => {
          setIsEditOpen(false);
          const q = new URLSearchParams(query);
          q.delete("type");
          router.push(`/select-service?${q.toString()}`);
        }}
        currentSearch={currentSearch}
      />
      <FunnelFooter />
    </main>
  );
}

export default function SelectServicePage() {
  return (
    <Suspense fallback={<div className="min-h-[100dvh] bg-slate-50" />}>
      <ServiceSelectionContent />
    </Suspense>
  );
}
