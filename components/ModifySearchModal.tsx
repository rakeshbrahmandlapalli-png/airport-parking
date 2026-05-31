"use client";

import { useState, useEffect, useCallback } from "react";
import { X, ChevronDown, AlertCircle, Calendar, Clock } from "lucide-react";
import { safeParseDate } from "@/app/lib/pricing";

interface ModifySearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSearchUpdate: (newQueryString: string) => void;
  currentSearch: {
    airport: string;
    dropDate: string;
    dropTime: string;
    pickDate: string;
    pickTime: string;
    type: string;
  };
}

const inputStyle =
  "w-full bg-[#1A2235] border border-slate-700/50 hover:border-blue-500/50 rounded-xl px-5 py-4 text-sm text-white font-bold outline-none focus:ring-2 focus:ring-blue-500/50 transition-all shadow-[0_0_0_1000px_#1A2235_inset] [-webkit-text-fill-color:white] placeholder:text-slate-500";
const inputErrorStyle =
  "w-full bg-[#1A2235] border border-red-500/60 hover:border-red-500/80 rounded-xl px-5 py-4 text-sm text-white font-bold outline-none focus:ring-2 focus:ring-red-500/40 transition-all shadow-[0_0_0_1000px_#1A2235_inset] [-webkit-text-fill-color:white] placeholder:text-slate-500";
const selectStyle =
  "w-full appearance-none bg-[#1A2235] border border-slate-700/50 hover:border-blue-500/50 rounded-xl px-5 py-4 text-sm text-white font-bold outline-none cursor-pointer focus:ring-2 focus:ring-blue-500/50 transition-all shadow-[0_0_0_1000px_#1A2235_inset] [-webkit-text-fill-color:white]";

export default function ModifySearchModal({
  isOpen,
  onClose,
  onSearchUpdate,
  currentSearch,
}: ModifySearchModalProps) {
  const [editAirport,  setEditAirport]  = useState(currentSearch.airport);
  const [editDropDate, setEditDropDate] = useState(currentSearch.dropDate);
  const [editDropTime, setEditDropTime] = useState(currentSearch.dropTime || "09:00");
  const [editPickDate, setEditPickDate] = useState(currentSearch.pickDate);
  const [editPickTime, setEditPickTime] = useState(currentSearch.pickTime || "09:00");

  // NEW: inline validation error instead of alert()
  const [dateError, setDateError] = useState("");

  // Reset fields whenever the modal opens with fresh currentSearch values
  useEffect(() => {
    if (isOpen) {
      setEditAirport(currentSearch.airport);
      setEditDropDate(currentSearch.dropDate);
      setEditDropTime(currentSearch.dropTime || "09:00");
      setEditPickDate(currentSearch.pickDate);
      setEditPickTime(currentSearch.pickTime || "09:00");
      setDateError("");
    }
  }, [isOpen, currentSearch]);

  // FIX: close on Escape key
  useEffect(() => {
    if (!isOpen) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [isOpen, onClose]);

  // FIX: prevent body scroll while modal is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => { document.body.style.overflow = ""; };
  }, [isOpen]);

  // Clear date error as soon as the user changes either date/time
  const clearError = () => setDateError("");

  // FIX: auto-correct pick-up date when drop-off date moves past it
  const handleDropDateChange = (val: string) => {
    setEditDropDate(val);
    clearError();
    if (editPickDate && val && val > editPickDate) {
      setEditPickDate(val); // nudge pick-up forward to match
    }
  };

  // FIX: compute today's date string for min attribute — avoids past bookings
  const today = new Date().toISOString().split("T")[0];

  const handleSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      setDateError("");

      // Require both dates
      if (!editDropDate || !editPickDate) {
        setDateError("Both drop-off and pick-up dates are required.");
        return;
      }

      // FIX: use safeParseDate (local-date aware) instead of new Date() to avoid
      // UTC midnight offset shifting the comparison by one day in GMT+1
      const d = safeParseDate(editDropDate);
      const p = safeParseDate(editPickDate);

      if (isNaN(d.getTime()) || isNaN(p.getTime())) {
        setDateError("One or both dates are invalid.");
        return;
      }

      if (p < d) {
        setDateError("Pick-up date can't be before drop-off date.");
        return;
      }

      // FIX: same calendar day — ensure pick-up time is after drop-off time
      if (
        editDropDate === editPickDate &&
        editDropTime &&
        editPickTime &&
        editPickTime <= editDropTime
      ) {
        setDateError("Pick-up time must be after drop-off time on the same day.");
        return;
      }

      const query = new URLSearchParams({
        airport:     editAirport,
        dropoffDate: editDropDate,
        dropoffTime: editDropTime,
        pickupDate:  editPickDate,
        pickupTime:  editPickTime,
        type:        currentSearch.type,
      }).toString();

      onSearchUpdate(query);
    },
    [
      editAirport, editDropDate, editDropTime,
      editPickDate, editPickTime, currentSearch.type,
      onSearchUpdate,
    ]
  );

  // FIX: render null after hooks — never before them (Rules of Hooks)
  if (!isOpen) return null;

  return (
    // FIX: clicking the backdrop closes the modal
    <div
      className="fixed inset-0 z-[200] bg-black/90 backdrop-blur-md flex items-end sm:items-center justify-center p-4 sm:p-8 animate-in fade-in overflow-hidden"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
      role="dialog"
      aria-modal="true"
      aria-label="Modify search"
    >
      <div className="bg-[#0F1523] border border-slate-800 w-full max-w-lg rounded-t-[2rem] sm:rounded-[2.5rem] p-8 sm:p-10 shadow-2xl animate-in slide-in-from-bottom-8 relative overflow-hidden">

        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h2 className="text-2xl font-black text-white tracking-tight">Modify Search</h2>
            <p className="text-[10px] font-bold text-blue-500 mt-1 tracking-widest uppercase">Aero is ready to re-scan</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close modal"
            className="p-3 bg-[#1A2235] text-slate-400 rounded-xl hover:text-white hover:bg-red-500/20 transition-colors border border-slate-700/50"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} noValidate className="space-y-6">

          {/* Airport */}
          <div className="space-y-2">
            <label htmlFor="modal-airport" className="text-[10px] font-black text-slate-500 uppercase tracking-widest block ml-1">
              Departure Airport
            </label>
            <div className="relative">
              <select
                id="modal-airport"
                value={editAirport}
                onChange={e => setEditAirport(e.target.value)}
                className={selectStyle}
              >
                <option value="Luton (LTN)">Luton Airport (LTN)</option>
                <option value="Heathrow (LHR)">Heathrow Airport (LHR)</option>
              </select>
              <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 pointer-events-none" />
            </div>
          </div>

          {/* Drop-off row */}
          <div className="grid grid-cols-2 gap-4 border-t border-slate-800/80 pt-6">
            <div className="space-y-2">
              <label htmlFor="modal-drop-date" className="text-[10px] font-black text-slate-500 uppercase tracking-widest block ml-1 flex items-center gap-1.5">
                <Calendar className="w-3 h-3" /> Drop-off Date
              </label>
              <input
                id="modal-drop-date"
                type="date"
                value={editDropDate}
                min={today}
                onChange={e => handleDropDateChange(e.target.value)}
                className={`${dateError ? inputErrorStyle : inputStyle} [color-scheme:dark]`}
                required
              />
            </div>
            <div className="space-y-2">
              <label htmlFor="modal-drop-time" className="text-[10px] font-black text-slate-500 uppercase tracking-widest block ml-1 flex items-center gap-1.5">
                <Clock className="w-3 h-3" /> Time
              </label>
              <input
                id="modal-drop-time"
                type="time"
                value={editDropTime}
                onChange={e => { setEditDropTime(e.target.value); clearError(); }}
                className={`${inputStyle} [color-scheme:dark]`}
                required
              />
            </div>
          </div>

          {/* Pick-up row */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label htmlFor="modal-pick-date" className="text-[10px] font-black text-slate-500 uppercase tracking-widest block ml-1 flex items-center gap-1.5">
                <Calendar className="w-3 h-3" /> Pick-up Date
              </label>
              <input
                id="modal-pick-date"
                type="date"
                value={editPickDate}
                min={editDropDate || today}
                onChange={e => { setEditPickDate(e.target.value); clearError(); }}
                className={`${dateError ? inputErrorStyle : inputStyle} [color-scheme:dark]`}
                required
              />
            </div>
            <div className="space-y-2">
              <label htmlFor="modal-pick-time" className="text-[10px] font-black text-slate-500 uppercase tracking-widest block ml-1 flex items-center gap-1.5">
                <Clock className="w-3 h-3" /> Time
              </label>
              <input
                id="modal-pick-time"
                type="time"
                value={editPickTime}
                onChange={e => { setEditPickTime(e.target.value); clearError(); }}
                className={`${inputStyle} [color-scheme:dark]`}
                required
              />
            </div>
          </div>

          {/* Inline date error — replaces alert() */}
          {dateError && (
            <div className="flex items-center gap-2.5 bg-red-500/10 border border-red-500/30 rounded-xl px-4 py-3 animate-in fade-in duration-200">
              <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
              <p className="text-xs font-bold text-red-400">{dateError}</p>
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-6 py-4 bg-slate-800 hover:bg-slate-700 text-slate-300 font-black rounded-xl uppercase text-xs tracking-widest transition-all border border-slate-700 active:scale-95"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-1 py-4 bg-blue-600 hover:bg-blue-500 text-white font-black rounded-xl uppercase text-xs tracking-widest transition-all active:scale-95 shadow-lg shadow-blue-500/20"
            >
              Update &amp; Recalculate
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}