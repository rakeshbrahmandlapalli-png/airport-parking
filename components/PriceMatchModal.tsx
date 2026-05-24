"use client";
import { useState } from "react";
import { X, Send, Loader2 } from "lucide-react";

export default function PriceMatchModal({ isOpen, onClose }: { isOpen: boolean, onClose: () => void }) {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({ name: '', email: '', link: '' });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    
    try {
      const res = await fetch('/api/price-match', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });

      if (res.ok) {
        alert("Claim submitted! Our agent desk will review your request and adjust the quote shortly.");
        onClose();
      } else {
        throw new Error("Failed to send");
      }
    } catch (err) {
      alert("Something went wrong. Please email our agent desk directly at info@aeroparkdirect.co.uk");
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  // Premium input class base
  const inputClass = "w-full border border-slate-700 p-3 rounded-xl outline-none focus:border-blue-500 font-medium text-sm transition-all placeholder:text-slate-500 text-white";
  
  // Bulletproof override against browser auto-fill color injection
  const inputInlineStyle = {
    backgroundColor: '#090D16',
    color: '#ffffff',
    WebkitTextFillColor: '#ffffff',
    WebkitBoxShadow: '0 0 0px 1000px #090D16 inset',
    transition: 'background-color 5000s ease-in-out 0s'
  };

  return (
    <div className="fixed inset-0 z-[9999] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-[#0F1523] border border-slate-700 w-full max-w-md rounded-3xl p-8 shadow-2xl animate-in zoom-in-95">
        <div className="flex justify-between items-center mb-6">
          <div className="flex flex-col">
            <h3 className="text-xl font-black text-white">Price Match Claim</h3>
            <p className="text-xs text-blue-400 font-bold mt-1 uppercase tracking-wider">Aeropark Direct Agent Desk</p>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white transition-colors"><X className="w-5 h-5"/></button>
        </div>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1.5">Your Name</label>
            <input 
              type="text" 
              placeholder="e.g. John Doe" 
              className={inputClass}
              style={inputInlineStyle}
              required 
              onChange={e => setFormData({...formData, name: e.target.value})}
            />
          </div>

          <div>
            <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1.5">Email Address</label>
            <input 
              type="email" 
              placeholder="e.g. john@example.com" 
              className={inputClass}
              style={inputInlineStyle}
              required 
              onChange={e => setFormData({...formData, email: e.target.value})}
            />
          </div>

          <div>
            <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1.5">Competitor Link / Quote Details</label>
            <input 
              type="text" 
              placeholder="e.g. https://competitor.co.uk/quote-123" 
              className={inputClass}
              style={inputInlineStyle}
              required 
              onChange={e => setFormData({...formData, link: e.target.value})}
            />
          </div>

          <button 
            type="submit" 
            disabled={loading}
            className="w-full bg-blue-600 hover:bg-blue-500 text-white font-black py-4 rounded-xl flex items-center justify-center gap-2 disabled:opacity-50 transition-all active:scale-[0.98] text-xs uppercase tracking-widest mt-2 shadow-lg shadow-blue-600/10"
          >
            {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <>Submit to Agent <Send className="w-4 h-4" /></>}
          </button>
        </form>
      </div>
    </div>
  );
}