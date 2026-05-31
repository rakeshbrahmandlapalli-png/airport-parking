"use client";

import { Zap } from "lucide-react";

interface FastTrackProps {
  count: number;
  setCount: (val: number) => void;
  price: number;
  max?: number;
}

export default function FastTrackSelector({ count, setCount, price, max = 9 }: FastTrackProps) {
  const decrement = () => setCount(Math.max(0, count - 1));
  const increment = () => setCount(Math.min(max, count + 1));

  const atMin = count <= 0;
  const atMax = count >= max;

  return (
    <div className={`p-5 rounded-2xl border-2 transition-all duration-300 shadow-sm ${count > 0 ? 'border-amber-400 bg-amber-50/50 ring-4 ring-amber-400/10' : 'bg-white border-slate-100 hover:border-amber-200'}`}>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">

        {/* Left Side: Icon & Title */}
        <div className="flex items-center gap-4">
          <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 transition-colors ${count > 0 ? 'bg-amber-500 shadow-lg shadow-amber-500/30' : 'bg-amber-50'}`}>
            <Zap className={`w-6 h-6 ${count > 0 ? 'text-white' : 'text-amber-500'}`} aria-hidden="true" />
          </div>
          <div>
            <p className="font-black text-slate-900 text-base md:text-lg tracking-tight">Fast Track Security</p>
            <p className="text-[11px] font-bold uppercase tracking-widest text-slate-500 mt-0.5">Skip the queues</p>
          </div>
        </div>

        {/* Right Side: Price & Controls */}
        <div className="flex items-center justify-between sm:justify-end gap-6 w-full sm:w-auto border-t border-slate-100 sm:border-0 pt-4 sm:pt-0">
          <div className="text-left sm:text-right">
            <span className="block font-black text-xl text-amber-600">+£{price.toFixed(2)}</span>
            <span className="block text-[10px] text-slate-400 font-bold uppercase tracking-widest">Per Person</span>
          </div>

          {/* Premium Pill Stepper */}
          <div className="flex items-center bg-slate-100 rounded-xl p-1 shadow-inner shrink-0">
            <button
              type="button"
              onClick={decrement}
              disabled={atMin}
              aria-label="Remove one Fast Track pass"
              className={`w-10 h-10 rounded-lg flex items-center justify-center font-black text-lg transition-all ${!atMin ? 'bg-white text-slate-700 shadow hover:bg-slate-50 hover:text-amber-600 active:scale-95' : 'text-slate-400 cursor-not-allowed'}`}
            >
              −
            </button>
            <span
              className="font-black text-lg w-10 text-center text-slate-800"
              aria-live="polite"
              aria-atomic="true"
            >
              {count}
            </span>
            <button
              type="button"
              onClick={increment}
              disabled={atMax}
              aria-label="Add one Fast Track pass"
              className={`w-10 h-10 rounded-lg flex items-center justify-center font-black text-lg transition-all ${!atMax ? 'bg-white text-slate-700 shadow hover:bg-slate-50 hover:text-amber-600 active:scale-95' : 'text-slate-400 cursor-not-allowed'}`}
            >
              +
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}