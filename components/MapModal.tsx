"use client";
import { X, MapPin, Info, Car } from "lucide-react";

export default function MapModal({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4">
      {/* Dark Overlay */}
      <div className="absolute inset-0 bg-slate-900/90 backdrop-blur-sm" onClick={onClose}></div>
      
      {/* Modal Content */}
      <div className="relative w-full max-w-2xl bg-white rounded-[2.5rem] overflow-hidden shadow-2xl animate-in fade-in zoom-in duration-300">
        
        {/* Header */}
        <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center text-white">
              <MapPin className="w-6 h-6" />
            </div>
            <div>
              <h2 className="font-black text-slate-900 leading-none">Drop-off Point</h2>
              <p className="text-[10px] uppercase font-black text-blue-600 tracking-widest mt-1">Terminal Car Park 1</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 bg-white rounded-full shadow-sm hover:bg-slate-100 transition-colors">
            <X className="w-6 h-6 text-slate-900" />
          </button>
        </div>

        {/* Map Image / Content */}
        <div className="p-2">
          <div className="aspect-video w-full bg-slate-200 rounded-[1.5rem] overflow-hidden relative border border-slate-100">
            {/* Placeholder for your actual Map Image */}
            <img 
              src="https://images.unsplash.com/photo-1544620347-c4fd4a3d5957?auto=format&fit=crop&q=80&w=1000" 
              className="w-full h-full object-cover opacity-50 grayscale"
              alt="Airport Parking Map"
            />
            <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-6">
               <div className="w-16 h-16 bg-blue-600 rounded-full flex items-center justify-center text-white animate-bounce shadow-xl border-4 border-white mb-4">
                  <MapPin className="w-8 h-8" />
               </div>
               <p className="text-slate-900 font-black text-xl">Meet us at Level 3</p>
               <p className="text-slate-600 font-bold text-sm max-w-xs mt-2">Follow signs for 'Off-Airport Meet & Greet' once inside Car Park 1.</p>
            </div>
          </div>
        </div>

        {/* Instructions */}
        <div className="p-8 grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="flex gap-4">
             <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex shrink-0 items-center justify-center font-black">1</div>
             <p className="text-sm text-slate-500 font-bold">Call us 20 mins before arrival so your operator is ready.</p>
          </div>
          <div className="flex gap-4">
             <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex shrink-0 items-center justify-center font-black">2</div>
             <p className="text-sm text-slate-500 font-bold">Collect your entry ticket and head to Level 3, Row B.</p>
          </div>
        </div>

        <button 
          onClick={onClose}
          className="w-full py-6 bg-slate-900 text-white font-black uppercase tracking-widest text-xs hover:bg-blue-600 transition-colors"
        >
          Got it, Close Map
        </button>
      </div>
    </div>
  );
}