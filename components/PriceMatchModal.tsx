"use client";

import { useEffect, useState } from "react";
import { CheckCircle2, Loader2, X } from "lucide-react";
import { COMPANY } from "@/app/lib/company";

// "Seen it cheaper?" on the homepage. It sends the details to our inbox
// (/api/price-match); it deliberately promises a reply, not a price match.

const fieldCls = "w-full h-12 rounded-lg border border-slate-300 bg-white px-3 text-base text-slate-900 outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-600/20 [-webkit-text-fill-color:#0f172a] placeholder:text-slate-400 placeholder:[-webkit-text-fill-color:#94a3b8]";
const labelCls = "block text-sm font-medium text-slate-700 mb-1.5";

export default function PriceMatchModal({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");
  const [formData, setFormData] = useState({ name: "", email: "", link: "" });

  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [isOpen, onClose]);

  const close = () => {
    onClose();
    setSent(false);
    setError("");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/price-match", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });
      if (!res.ok) throw new Error();
      setSent(true);
      setFormData({ name: "", email: "", link: "" });
    } catch {
      setError(`That didn't send. Please email us at ${COMPANY.email} instead.`);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-[9999] bg-slate-950/60 flex items-end sm:items-center justify-center sm:p-6"
      onClick={(e) => { if (e.target === e.currentTarget) close(); }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="price-check-title"
    >
      <div className="bg-white w-full max-w-md rounded-t-xl sm:rounded-xl p-5 sm:p-6 pb-[calc(env(safe-area-inset-bottom)+20px)] sm:pb-6">
        <div className="flex items-start justify-between gap-4 mb-5">
          <div>
            <h2 id="price-check-title" className="text-xl font-semibold text-slate-900">Seen it cheaper?</h2>
            <p className="mt-1 text-sm text-slate-600">Send us the other quote for the same service and dates. We&apos;ll look at it and reply by email.</p>
          </div>
          <button type="button" onClick={close} aria-label="Close" className="p-2 -mr-2 rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-100">
            <X className="w-5 h-5" />
          </button>
        </div>

        {sent ? (
          <div className="space-y-5">
            <p className="flex items-start gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-3 text-sm text-emerald-800">
              <CheckCircle2 className="w-5 h-5 shrink-0" aria-hidden="true" />
              Thanks, we&apos;ve got it. We&apos;ll reply by email.
            </p>
            <button type="button" onClick={close} className="w-full h-12 rounded-lg border border-slate-300 bg-white font-semibold text-slate-900 hover:bg-slate-50">
              Close
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="pm-name" className={labelCls}>Your name</label>
              <input id="pm-name" type="text" autoComplete="name" required value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })} className={fieldCls} />
            </div>
            <div>
              <label htmlFor="pm-email" className={labelCls}>Email</label>
              <input id="pm-email" type="email" autoComplete="email" required value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })} className={fieldCls} />
            </div>
            <div>
              <label htmlFor="pm-link" className={labelCls}>Link to the other quote, or its details</label>
              <input id="pm-link" type="text" required value={formData.link} placeholder="Website, price, airport and dates"
                onChange={(e) => setFormData({ ...formData, link: e.target.value })} className={fieldCls} />
            </div>

            {error && <p role="alert" className="rounded-lg border border-red-200 bg-red-50 px-3 py-2.5 text-sm text-red-700">{error}</p>}

            <button type="submit" disabled={loading}
              className="w-full h-12 rounded-lg bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white font-semibold inline-flex items-center justify-center gap-2">
              {loading ? <><Loader2 className="w-5 h-5 animate-spin" aria-hidden="true" /> Sending…</> : "Send"}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
