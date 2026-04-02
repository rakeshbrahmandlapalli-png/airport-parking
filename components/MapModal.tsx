"use client";
import { useState } from "react";
import { X, MapPin, Navigation, Plane } from "lucide-react";

export default function MapModal({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const [selectedAirport, setSelectedAirport] = useState<"LTN" | "LHR">("LTN");

  if (!isOpen) return null;

  // Data for the two airports
  const locations = {
    LTN: {
      title: "Luton Terminal Car Park 1",
      tag: "Level 3, Row A",
      mapEmbedUrl: "https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d2466.864318721665!2d-0.3809616233481232!3d51.87948287190014!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x487648348d21b017%3A0xcb9b3e1f54f76269!2sTerminal%20Car%20Park%201!5e0!3m2!1sen!2suk!4v1714000000000!5m2!1sen!2suk",
      gpsLink: "https://maps.app.goo.gl/exampleLuton",
      step1Title: "Enter Level 3",
      step1Desc: "Follow signs for Terminal Car Park 1 and head straight up to Level 3.",
      step2Title: "Meet at Row A",
      step2Desc: "Your operator will be waiting in the dedicated Meet & Greet Area at Row A."
    },
    LHR: {
      title: "Heathrow Short Stay (T2-T5)",
      tag: "Off-Airport Meet & Greet",
      mapEmbedUrl: "https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d2484.580799484803!2d-0.45686002336336045!3d51.47291127180497!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x48767234cdc56de9%3A0x8fe7535543f64167!2sHeathrow%20Airport!5e0!3m2!1sen!2suk!4v1714000000000!5m2!1sen!2suk",
      gpsLink: "https://maps.app.goo.gl/exampleHeathrow",
      step1Title: "Follow Terminal Signs",
      step1Desc: "Drive toward your specific departing Terminal (T2, T3, T4, or T5) Short Stay car park.",
      step2Title: "Find the M&G Area",
      step2Desc: "Look for the designated 'Off-Airport Meet & Greet' bays to hand over your keys."
    }
  };

  const activeData = locations[selectedAirport];

  return (
    <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-slate-900/90 backdrop-blur-md" onClick={onClose}></div>
      
      {/* Modal Card */}
      <div className="relative w-full max-w-2xl bg-white rounded-[2.5rem] overflow-hidden shadow-2xl animate-in fade-in zoom-in duration-300 flex flex-col max-h-[90vh]">
        
        {/* Header & Airport Toggle */}
        <div className="p-6 border-b border-slate-100 bg-slate-50 flex flex-col gap-6 shrink-0">
          <div className="flex justify-between items-start">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center text-white shadow-lg shadow-blue-500/20">
                <MapPin className="w-6 h-6" />
              </div>
              <div>
                <h2 className="font-black text-slate-900 leading-none">Meeting Points</h2>
                <p className="text-[10px] uppercase font-black text-slate-500 tracking-widest mt-1">Select your departure airport</p>
              </div>
            </div>
            <button onClick={onClose} className="p-2 bg-white rounded-full shadow-sm hover:bg-slate-100 transition-colors">
              <X className="w-6 h-6 text-slate-900" />
            </button>
          </div>

          {/* TOGGLE BUTTONS */}
          <div className="flex p-1 bg-slate-200/50 rounded-2xl">
            <button 
              onClick={() => setSelectedAirport("LTN")}
              className={`flex-1 py-3 px-4 rounded-xl text-xs font-black uppercase tracking-widest transition-all flex items-center justify-center gap-2 ${selectedAirport === "LTN" ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
            >
              <Plane className={`w-4 h-4 ${selectedAirport === "LTN" ? 'text-blue-600' : 'text-slate-400'}`} /> Luton (LTN)
            </button>
            <button 
              onClick={() => setSelectedAirport("LHR")}
              className={`flex-1 py-3 px-4 rounded-xl text-xs font-black uppercase tracking-widest transition-all flex items-center justify-center gap-2 ${selectedAirport === "LHR" ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
            >
              <Plane className={`w-4 h-4 ${selectedAirport === "LHR" ? 'text-blue-600' : 'text-slate-400'}`} /> Heathrow (LHR)
            </button>
          </div>
        </div>

        {/* Scrollable Content Area */}
        <div className="overflow-y-auto">
          {/* MAP */}
          <div className="p-4">
            <div className="aspect-video w-full bg-slate-100 rounded-[1.5rem] overflow-hidden relative border border-slate-200">
              <iframe 
                src={activeData.mapEmbedUrl}
                width="100%" 
                height="100%" 
                style={{ border: 0 }} 
                allowFullScreen={true} 
                loading="lazy" 
                className="grayscale-[20%] contrast-[1.1] transition-opacity duration-500"
              ></iframe>
              
              {/* Overlay Tag */}
              <div className="absolute top-4 left-4 bg-white/95 backdrop-blur-md border border-slate-200 px-4 py-2 rounded-2xl shadow-xl flex items-center gap-2">
                <div className="w-2 h-2 bg-blue-600 rounded-full animate-ping"></div>
                <div className="flex flex-col">
                  <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">{activeData.title}</span>
                  <span className="text-xs font-black text-blue-600 uppercase tracking-tighter">{activeData.tag}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Instructions */}
          <div className="px-8 py-4 grid grid-cols-1 md:grid-cols-2 gap-6 bg-white">
            <div className="flex gap-4 items-start">
               <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 flex shrink-0 items-center justify-center font-black text-sm">1</div>
               <div>
                  <p className="text-sm font-black text-slate-900 leading-tight mb-1">{activeData.step1Title}</p>
                  <p className="text-xs text-slate-500 font-bold leading-relaxed">{activeData.step1Desc}</p>
               </div>
            </div>
            <div className="flex gap-4 items-start">
               <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 flex shrink-0 items-center justify-center font-black text-sm">2</div>
               <div>
                  <p className="text-sm font-black text-slate-900 leading-tight mb-1">{activeData.step2Title}</p>
                  <p className="text-xs text-slate-500 font-bold leading-relaxed">{activeData.step2Desc}</p>
               </div>
            </div>
          </div>

          {/* Action Button */}
          <div className="p-6 shrink-0 bg-white">
              <a 
                href={activeData.gpsLink} 
                target="_blank"
                rel="noreferrer"
                className="w-full py-5 bg-slate-900 text-white font-black rounded-2xl text-center text-xs uppercase tracking-widest shadow-xl shadow-slate-900/20 hover:bg-black transition-all flex items-center justify-center gap-3 active:scale-[0.98]"
              >
                Start {selectedAirport} GPS Navigation <Navigation className="w-4 h-4 fill-current" />
              </a>
          </div>
        </div>

      </div>
    </div>
  );
}