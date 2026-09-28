"use client";

import { useState, useEffect, useCallback } from "react";
import { X, ChevronDown, AlertCircle } from "lucide-react";
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

// Same field style as the homepage search form.
const fieldCls =
  "w-full h-12 rounded-lg border bg-white px-3 text-base text-slate-900 outline-none focus:ring-2 [-webkit-text-fill-color:#0f172a]";
const fieldOk = `${fieldCls} border-slate-300 focus:border-blue-600 focus:ring-blue-600/20`;
const fieldErr = `${fieldCls} border-red-500 focus:border-red-600 focus:ring-red-600/20`;
const labelCls = "block text-sm font-medium text-slate-700 mb-1.5";

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
    <div
      className="fixed inset-0 z-[200] bg-slate-950/60 flex items-end sm:items-center justify-center sm:p-6"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="modify-search-title"
    >
      <div className="bg-white w-full max-w-lg rounded-t-xl sm:rounded-xl p-5 sm:p-6 pb-[calc(env(safe-area-inset-bottom)+20px)] sm:pb-6 max-h-[100dvh] overflow-y-auto">
        <div className="flex items-start justify-between gap-4 mb-5">
          <div>
            <h2 id="modify-search-title" className="text-xl font-semibold text-slate-900">Change your search</h2>
            <p className="mt-1 text-sm text-slate-600">Prices are checked again for the new dates.</p>
          </div>
          <button type="button" onClick={onClose} aria-label="Close" className="p-2 -mr-2 rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-100">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} noValidate className="space-y-4">
          <div>
            <label htmlFor="modal-airport" className={labelCls}>Airport</label>
            <div className="relative">
              <select id="modal-airport" value={editAirport} onChange={e => setEditAirport(e.target.value)} className={`${fieldOk} appearance-none pr-10 cursor-pointer`}>
                <option value="Luton (LTN)">Luton Airport (LTN)</option>
                <option value="Heathrow (LHR)">Heathrow Airport (LHR)</option>
              </select>
              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500 pointer-events-none" aria-hidden="true" />
            </div>
          </div>

          <fieldset>
            <legend className={labelCls}>Drop-off</legend>
            <div className="grid grid-cols-[1.4fr_1fr] gap-2">
              <input id="modal-drop-date" type="date" aria-label="Drop-off date" value={editDropDate} min={today}
                onChange={e => handleDropDateChange(e.target.value)} className={dateError ? fieldErr : fieldOk} required />
              <input id="modal-drop-time" type="time" aria-label="Drop-off time" value={editDropTime}
                onChange={e => { setEditDropTime(e.target.value); clearError(); }} className={fieldOk} required />
            </div>
          </fieldset>

          <fieldset>
            <legend className={labelCls}>Pick-up</legend>
            <div className="grid grid-cols-[1.4fr_1fr] gap-2">
              <input id="modal-pick-date" type="date" aria-label="Pick-up date" value={editPickDate} min={editDropDate || today}
                onChange={e => { setEditPickDate(e.target.value); clearError(); }} className={dateError ? fieldErr : fieldOk} required />
              <input id="modal-pick-time" type="time" aria-label="Pick-up time" value={editPickTime}
                onChange={e => { setEditPickTime(e.target.value); clearError(); }} className={fieldOk} required />
            </div>
          </fieldset>

          {dateError && (
            <p role="alert" className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2.5 text-sm text-red-700">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" aria-hidden="true" /> {dateError}
            </p>
          )}

          <div className="flex gap-2 pt-2">
            <button type="button" onClick={onClose} className="h-12 px-5 rounded-lg border border-slate-300 bg-white text-slate-900 font-semibold hover:bg-slate-50">
              Cancel
            </button>
            <button type="submit" className="flex-1 h-12 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-semibold">
              Update search
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
