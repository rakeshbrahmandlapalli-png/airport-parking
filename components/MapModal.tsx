"use client";
import { X, MapPin, Navigation, Info, Phone } from "lucide-react";

export default function MapModal({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  if (!isOpen) return null;

  // Exact coordinates for Luton Terminal Car Park 1
  const mapEmbedUrl = "https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d2454.457813735613!2d-0.37367462334812165!3d51.87637897189793!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x487648358249692d%3A0x6b7a2d6a54f738a1!2sTerminal%20Car%20Park%201!5e0!3m2!1sen!2suk!4v1711785000000!5m2!1sen!2suk";

  return (
    <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-slate-900/90 backdrop-blur-md" onClick={onClose}></div>
      
      {/* Modal Card */}
      <div className="relative w-full max-w-2xl bg-white rounded-[2.5rem] overflow-hidden shadow-2xl animate-in fade-in zoom-in duration-300">
        
        {/* Header */}
        <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center text-white shadow-lg shadow-blue-500/20">
              <MapPin className="w-6 h-6" />
            </div>
            <div>
              <h2 className="font-black text-slate-900 leading-none">Meeting Point</h2>
              <p className="text-[10px] uppercase font-black text-blue-600 tracking-widest mt-1">Luton Terminal Car Park 1</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 bg-white rounded-full shadow-sm hover:bg-slate-100 transition-colors">
            <X className="w-6 h-6 text-slate-900" />
          </button>
        </div>

        {/* LIVE INTERACTIVE MAP */}
        <div className="p-2">
          <div className="aspect-video w-full bg-slate-100 rounded-[1.5rem] overflow-hidden relative border border-slate-200">
            <iframe 
              src={mapEmbedUrl}
              width="100%" 
              height="100%" 
              style={{ border: 0 }} 
              allowFullScreen={true} 
              loading="lazy" 
              className="grayscale-[20%] contrast-[1.1]"
            ></iframe>
            
            {/* Overlay Tag */}
            <div className="absolute top-4 left-4 bg-white/90 backdrop-blur-md border border-blue-100 px-4 py-2 rounded-2xl shadow-xl flex items-center gap-2">
              <div className="w-2 h-2 bg-blue-600 rounded-full animate-ping"></div>
              <span className="text-[11px] font-black text-slate-900 uppercase tracking-tighter">Level 3, Row A</span>
            </div>
          </div>
        </div>

        {/* Instructions */}
        <div className="p-8 grid grid-cols-1 md:grid-cols-2 gap-8 bg-white">
          <div className="flex gap-4">
             <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex shrink-0 items-center justify-center font-black">1</div>
             <div>
                <p className="text-sm font-black text-slate-900 leading-tight mb-1">Enter Level 3</p>
                <p className="text-xs text-slate-500 font-bold leading-relaxed">Follow signs for Terminal Car Park 1 and head to Level 3.</p>
             </div>
          </div>
          <div className="flex gap-4">
             <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex shrink-0 items-center justify-center font-black">2</div>
             <div>
                <p className="text-sm font-black text-slate-900 leading-tight mb-1">Meet at Row A</p>
                <p className="text-xs text-slate-500 font-bold leading-relaxed">Your operator will be waiting at Row A (Meet & Greet Area).</p>
             </div>
          </div>
        </div>

        {/* Action Button */}
        <div className="px-8 pb-8">
            <a 
              href="https://www.google.com/maps/dir/?api=1&destination=Luton+Airport+Terminal+Car+Park+1" 
              target="_blank"
              className="w-full py-5 bg-blue-600 text-white font-black rounded-2xl text-center text-sm shadow-xl shadow-blue-500/20 hover:bg-blue-700 transition-all flex items-center justify-center gap-3 active:scale-[0.98]"
            >
              Start GPS Navigation <Navigation className="w-4 h-4 fill-current" />
            </a>
        </div>
      </div>
    </div>
  );
}