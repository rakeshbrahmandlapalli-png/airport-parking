"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { 
  Car, 
  Bus, 
  Hotel, 
  ArrowRight, 
  Clock, 
  ShieldCheck, 
  MapPin 
} from "lucide-react";

function ServiceSelectionContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  // Grab the search params from the hero section so we don't lose them
  const airport = searchParams.get("airport") || "Luton (LTN)";
  const dropoffDate = searchParams.get("dropoffDate") || "";
  const dropoffTime = searchParams.get("dropoffTime") || "";
  const pickupDate = searchParams.get("pickupDate") || "";
  const pickupTime = searchParams.get("pickupTime") || "";

  const handleSelect = (serviceType: string) => {
    const query = new URLSearchParams({
      airport,
      dropoffDate,
      dropoffTime,
      pickupDate,
      pickupTime,
      type: serviceType, 
    }).toString();

    router.push(`/results?${query}`);
  };

  // 🔥 UPDATED COPY: Positions you as the premium agent/aggregator
  const services = [
    {
      id: "meet-greet",
      title: "Meet & Greet",
      tag: "Most Convenient",
      tagColor: "bg-blue-100 text-blue-700 border-blue-200",
      description: "Compare top-rated providers. Drive straight to the terminal, hand your keys to a vetted professional, and head straight to check-in.",
      icon: <Car className="w-8 h-8 text-blue-600" />,
      features: ["Compare trusted operators", "Drop off at terminal", "Perfect for families"],
      time: "5 mins walk to terminal"
    },
    {
      id: "park-ride",
      title: "Park & Ride",
      tag: "Best Value",
      tagColor: "bg-emerald-100 text-emerald-700 border-emerald-200",
      description: "Find the best deals on secure off-site parking. Park your vehicle and take a quick, comfortable shuttle bus to the terminal door.",
      icon: <Bus className="w-8 h-8 text-emerald-600" />,
      features: ["Vetted parking facilities", "Regular shuttle services", "Budget-friendly deals"],
      time: "5-10 min shuttle"
    },
    {
      id: "hotel",
      title: "Hotel & Parking",
      tag: "Early Flight?",
      tagColor: "bg-purple-100 text-purple-700 border-purple-200",
      description: "Browse packages combining a restful night's sleep at a premium airport hotel with secure parking for the duration of your trip.",
      icon: <Hotel className="w-8 h-8 text-purple-600" />,
      features: ["Top hotel brands", "Up to 15 days parking", "Wake up at the airport"],
      time: "Overnight stay"
    }
  ];

  return (
    <main className="min-h-screen bg-slate-50 pt-24 pb-16 px-6 font-sans">
      <div className="max-w-5xl mx-auto">
        
        {/* Header Section */}
        <div className="text-center mb-16">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-slate-200/50 text-slate-600 font-bold text-[10px] uppercase tracking-widest mb-6">
            <MapPin className="w-3 h-3" /> {airport}
          </div>
          <h1 className="text-4xl md:text-5xl font-black text-slate-900 tracking-tight mb-4">
            How would you like to park?
          </h1>
          {/* 🔥 UPDATED SUBTITLE */}
          <p className="text-slate-500 font-medium text-lg max-w-2xl mx-auto">
            Compare trusted parking providers that best fit your travel style. From premium terminal drop-offs to budget-friendly shuttles, we bring you the best options in one place.
          </p>
        </div>

        {/* Service Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {services.map((service) => (
            <div 
              key={service.id}
              onClick={() => handleSelect(service.id)}
              className="bg-white rounded-[2.5rem] p-8 border border-slate-200 shadow-sm hover:shadow-xl hover:border-blue-500 hover:-translate-y-1 transition-all duration-300 cursor-pointer flex flex-col group relative overflow-hidden"
            >
              {/* Highlight Tag */}
              <div className={`absolute top-6 right-6 px-3 py-1 rounded-full border text-[9px] font-black uppercase tracking-widest ${service.tagColor}`}>
                {service.tag}
              </div>

              {/* Icon */}
              <div className="w-16 h-16 rounded-2xl bg-slate-50 flex items-center justify-center mb-8 group-hover:scale-110 transition-transform duration-300">
                {service.icon}
              </div>

              {/* Content */}
              <h3 className="text-2xl font-black text-slate-900 mb-3 tracking-tight">
                {service.title}
              </h3>
              <p className="text-slate-500 text-sm leading-relaxed mb-8 flex-grow">
                {service.description}
              </p>

              {/* Features List */}
              <ul className="space-y-3 mb-8">
                {service.features.map((feature, idx) => (
                  <li key={idx} className="flex items-center gap-3 text-xs font-bold text-slate-700">
                    <ShieldCheck className="w-4 h-4 text-blue-500 opacity-70" /> {feature}
                  </li>
                ))}
              </ul>

              {/* Footer / Action */}
              <div className="pt-6 border-t border-slate-100 flex items-center justify-between mt-auto">
                <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-slate-400">
                  <Clock className="w-3.5 h-3.5" /> {service.time}
                </div>
                <div className="w-10 h-10 rounded-full bg-slate-50 flex items-center justify-center group-hover:bg-blue-600 group-hover:text-white transition-colors">
                  <ArrowRight className="w-5 h-5" />
                </div>
              </div>
            </div>
          ))}
        </div>

      </div>
    </main>
  );
}

export default function SelectServicePage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-slate-50 flex items-center justify-center font-bold text-slate-400 uppercase tracking-widest text-sm">Loading Options...</div>}>
      <ServiceSelectionContent />
    </Suspense>
  );
}