"use client";

import React, { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { supabase } from "@/app/lib/supabase";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Search, Plus, Save, Car, Loader2, X, Trash2, MapPin,
  PlaneTakeoff, Settings2, LayoutDashboard, Building2,
  CalendarDays, LogOut, Plane, Network, SlidersHorizontal,
  ArrowUpDown, Award, AlertOctagon, FileText, Download,
  Percent, Image as ImageIcon, ArrowUp, ArrowDown, PiggyBank,
  ChevronDown, AlertCircle, Filter, Phone, Code2, Tags, Zap,
  Eye, EyeOff, Copy, Check, CheckCircle2,
  Calculator, RefreshCw, Info
} from "lucide-react";

interface Review {
  id: number;
  author: string;
  rating: number;
  comment: string;
  date: string;
  verified: boolean;
  source: string;
}

const defaultCompany = {
  name: "",
  api_token: "",
  pricing_mode: "api" as "api" | "pivot",
  category: "meet-greet",
  luton_price: 0,
  heathrow_price: 0,
  price_modifier: 1.0,
  ltn_day2_price: 0, ltn_day5_price: 0, ltn_day8_price: 0, ltn_day11_price: 0,
  ltn_day14_price: 0, ltn_day17_price: 0, ltn_day22_price: 0, ltn_day32_price: 0,
  lhr_day2_price: 0, lhr_day5_price: 0, lhr_day8_price: 0, lhr_day11_price: 0,
  lhr_day14_price: 0, lhr_day17_price: 0, lhr_day22_price: 0, lhr_day32_price: 0,
  terminal_data: {
    T2: { address: "Terminal 2 Short Stay", postcode: "TW6 1EW", map_url: "" },
    T3: { address: "Terminal 3 Short Stay", postcode: "TW6 1QG", map_url: "" },
    T4: { address: "Terminal 4 Short Stay", postcode: "TW6 3XA", map_url: "" },
    T5: { address: "Terminal 5 Short Stay", postcode: "TW6 2GA", map_url: "" },
  },
  commission_rate: 15,
  dynamic_surcharge_percent: 0,
  logo_url: "",
  is_active: true,
  operates_at_luton: true,
  operates_at_heathrow: false,
  ltn_sold_out: false,
  lhr_sold_out: false,
  ltn_featured: false,
  lhr_featured: false,
  overview: "",
  phone_number: "",
  phone_number_2: "",
  map_location: "Terminal Forecourt",
  on_arrival_lhr: "",
  on_arrival_ltn: "",
  on_return_lhr: "",
  on_return_ltn: "",
  address: "",
  postcode: "",
  map_url: "",
  ltn_reviews: [] as Review[],
  lhr_reviews: [] as Review[],
  badges: [] as any[],
};

type ToastType = "success" | "error" | "info" | "warning";
interface Toast { id: number; message: string; type: ToastType; }

function ToastContainer({ toasts, onDismiss }: { toasts: Toast[]; onDismiss: (id: number) => void }) {
  return (
    <div className="fixed top-6 right-6 z-[999] flex flex-col gap-3 pointer-events-none">
      {toasts.map((t) => {
        const styles: Record<ToastType, string> = {
          success: "bg-emerald-600 border-emerald-500/40",
          error: "bg-red-600 border-red-500/40",
          info: "bg-blue-600 border-blue-500/40",
          warning: "bg-amber-600 border-amber-500/40",
        };
        const icons: Record<ToastType, React.ReactNode> = {
          success: <CheckCircle2 className="w-4 h-4 shrink-0" />,
          error: <AlertCircle className="w-4 h-4 shrink-0" />,
          info: <Info className="w-4 h-4 shrink-0" />,
          warning: <AlertOctagon className="w-4 h-4 shrink-0" />,
        };
        return (
          <div key={t.id} className={`pointer-events-auto flex items-center gap-3 px-5 py-4 rounded-2xl border shadow-2xl text-white text-sm font-bold max-w-sm animate-in slide-in-from-right-4 duration-300 ${styles[t.type]}`}>
            {icons[t.type]}
            <span className="flex-1">{t.message}</span>
            <button onClick={() => onDismiss(t.id)} className="ml-2 opacity-70 hover:opacity-100 transition-opacity">
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        );
      })}
    </div>
  );
}

function useToast() {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const idRef = useRef(0);
  const show = useCallback((message: string, type: ToastType = "info") => {
    const id = ++idRef.current;
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 4000);
  }, []);
  const dismiss = useCallback((id: number) => setToasts(prev => prev.filter(t => t.id !== id)), []);
  return { toasts, show, dismiss };
}

function SortIcon({ field, sortBy, sortOrder }: { field: string; sortBy: string; sortOrder: "asc" | "desc" }) {
  if (sortBy !== field) return <ArrowUpDown className="w-3 h-3 inline ml-1 opacity-30" />;
  return sortOrder === "asc" ? <ArrowUp className="w-3 h-3 inline ml-1 text-blue-400" /> : <ArrowDown className="w-3 h-3 inline ml-1 text-blue-400" />;
}

function getField(editing: any, fresh: any, key: string) {
  return editing ? (editing[key] ?? fresh[key]) : fresh[key];
}

function setField(editing: any, setEditing: (v: any) => void, fresh: any, setFresh: (v: any) => void, key: string, value: any) {
  if (editing) setEditing({ ...editing, [key]: value });
  else setFresh({ ...fresh, [key]: value });
}

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    if (!text) return;
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  };
  return (
    <button type="button" onClick={copy} title="Copy to clipboard"
      className="p-1.5 rounded-lg text-slate-500 hover:text-blue-400 hover:bg-blue-500/10 transition-all active:scale-95">
      {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
    </button>
  );
}

function TokenInput({ value, onChange, inputCls }: { value: string; onChange: (v: string) => void; inputCls: string }) {
  const [show, setShow] = useState(false);
  return (
    <div className="relative">
      <input type={show ? "text" : "password"} autoComplete="off" placeholder="Paste provider token here..."
        value={value} onChange={(e) => onChange(e.target.value)} className={`${inputCls} pr-20`} />
      <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1">
        <CopyButton text={value} />
        <button type="button" onClick={() => setShow(s => !s)} className="p-1.5 rounded-lg text-slate-500 hover:text-blue-400 hover:bg-blue-500/10 transition-all">
          {show ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
        </button>
      </div>
    </div>
  );
}

// ─── PRICING MODE TOGGLE ──────────────────────────────────────────────────────
function PricingModeToggle({ value, onChange, hasToken }: {
  value: "api" | "pivot"; onChange: (v: "api" | "pivot") => void; hasToken: boolean;
}) {
  const mode = value === "pivot" ? "pivot" : "api";
  return (
    <div className="bg-[#1A2235] rounded-2xl border border-slate-700/50 overflow-hidden">
      <div className="p-5 border-b border-slate-800">
        <h3 className="text-sm font-black text-white flex items-center gap-2">
          <Zap className="w-4 h-4 text-amber-400" /> Pricing Source
        </h3>
        <p className="text-[10px] text-slate-500 font-bold mt-1 uppercase tracking-widest">
          Choose whether this provider shows LIVE API prices or your MANUAL pivot table.
        </p>
      </div>
      <div className="p-5">
        <div className="relative grid grid-cols-2 bg-[#0F1523] rounded-xl p-1.5 border border-slate-800">
          <div className={`absolute top-1.5 bottom-1.5 w-[calc(50%-0.375rem)] rounded-lg transition-all duration-300 ${mode === "api" ? "left-1.5 bg-emerald-600 shadow-[0_0_20px_rgba(16,185,129,0.4)]" : "left-[calc(50%+0rem)] bg-blue-600 shadow-[0_0_20px_rgba(37,99,235,0.4)]"}`} />
          <button type="button" onClick={() => onChange("api")}
            className={`relative z-10 flex items-center justify-center gap-2 py-3 rounded-lg text-xs font-black uppercase tracking-widest transition-colors ${mode === "api" ? "text-white" : "text-slate-400 hover:text-slate-200"}`}>
            <Zap className="w-4 h-4" /> Live API
          </button>
          <button type="button" onClick={() => onChange("pivot")}
            className={`relative z-10 flex items-center justify-center gap-2 py-3 rounded-lg text-xs font-black uppercase tracking-widest transition-colors ${mode === "pivot" ? "text-white" : "text-slate-400 hover:text-slate-200"}`}>
            <Calculator className="w-4 h-4" /> Pivot Table
          </button>
        </div>
        <div className="mt-4 text-[11px] leading-relaxed">
          {mode === "api" ? (
            <p className="text-emerald-400/90 font-bold flex items-start gap-2">
              <Zap className="w-3.5 h-3.5 mt-0.5 shrink-0" />
              Prices are fetched live from the provider gateway using the API token. The pivot table is ignored.
            </p>
          ) : (
            <p className="text-blue-400/90 font-bold flex items-start gap-2">
              <Calculator className="w-3.5 h-3.5 mt-0.5 shrink-0" />
              Prices come from your manual pivot table in the Luton/Heathrow Ops tabs. The API token is NOT called.
            </p>
          )}
        </div>
        {mode === "api" && !hasToken && (
          <div className="mt-3 px-4 py-3 bg-amber-500/5 border border-amber-500/20 rounded-xl flex items-center gap-2">
            <AlertCircle className="w-3.5 h-3.5 text-amber-400 shrink-0" />
            <p className="text-[10px] font-bold text-amber-400">No API token set — customers will see &quot;Rate Unavailable&quot; until you add a token or switch to Pivot.</p>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── PRICE PREVIEW CALCULATOR ─────────────────────────────────────────────────
function PricePreviewCalc({ company, markupPercent }: { company: any, markupPercent: number }) {
  const [days, setDays] = useState(7);
  const [airport, setAirport] = useState<"ltn" | "lhr">("ltn");
  const getPivotPrice = (c: any, d: number, ap: "ltn" | "lhr") => {
    const prefix = ap === "ltn" ? "ltn" : "lhr";
    const base = ap === "ltn" ? Number(c.luton_price || 0) : Number(c.heathrow_price || 0);
    const tiers = [
      { days: 1, price: base },
      { days: 2, price: Number(c[`${prefix}_day2_price`] || 0) },
      { days: 5, price: Number(c[`${prefix}_day5_price`] || 0) },
      { days: 8, price: Number(c[`${prefix}_day8_price`] || 0) },
      { days: 11, price: Number(c[`${prefix}_day11_price`] || 0) },
      { days: 14, price: Number(c[`${prefix}_day14_price`] || 0) },
      { days: 17, price: Number(c[`${prefix}_day17_price`] || 0) },
      { days: 22, price: Number(c[`${prefix}_day22_price`] || 0) },
      { days: 32, price: Number(c[`${prefix}_day32_price`] || 0) },
    ].filter(t => t.price > 0);
    if (!tiers.length) return 0;
    if (d <= tiers[0].days) return tiers[0].price;
    if (d >= tiers[tiers.length - 1].days) return tiers[tiers.length - 1].price;
    for (let i = 0; i < tiers.length - 1; i++) {
      if (d >= tiers[i].days && d <= tiers[i + 1].days) {
        const ratio = (d - tiers[i].days) / (tiers[i + 1].days - tiers[i].days);
        return tiers[i].price + ratio * (tiers[i + 1].price - tiers[i].price);
      }
    }
    return 0;
  };
  if (!company) return null;
  const surcharge = Number(company.dynamic_surcharge_percent || 0);
  const modifier = Number(company.price_modifier || 1);
  const rawBase = getPivotPrice(company, days, airport);
  const afterSurcharge = rawBase * (1 + surcharge / 100);
  const afterModifier = afterSurcharge * modifier;
  const afterMarkup = afterModifier * (1 + markupPercent / 100);
  const hasData = rawBase > 0;
  return (
    <div className="bg-[#0A101D] border border-blue-500/20 rounded-2xl p-5 mt-4">
      <h4 className="text-blue-400 font-black text-xs uppercase tracking-widest mb-4 flex items-center gap-2">
        <Calculator className="w-4 h-4" /> Price Simulator (Pivot-Based)
      </h4>
      <div className="flex flex-wrap gap-3 mb-4">
        <div className="flex items-center gap-2">
          <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Days</label>
          <input type="number" min={1} max={32} value={days} onChange={e => setDays(Math.max(1, Math.min(32, parseInt(e.target.value) || 1)))}
            className="w-16 bg-[#1A2235] border border-slate-700 rounded-lg px-3 py-2 text-sm font-black text-white outline-none focus:border-blue-500 text-center" />
        </div>
        <div className="flex items-center gap-2">
          <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Airport</label>
          <select value={airport} onChange={e => setAirport(e.target.value as "ltn" | "lhr")}
            className="bg-[#1A2235] border border-slate-700 rounded-lg px-3 py-2 text-sm font-black text-white outline-none focus:border-blue-500">
            <option value="ltn">LTN</option><option value="lhr">LHR</option>
          </select>
        </div>
      </div>
      {!hasData ? (
        <p className="text-[11px] text-slate-500 italic">No pivot data set. Enter prices in the Luton/Heathrow Ops tabs.</p>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
          {[
            { label: "Base (Pivot)", value: rawBase, color: "text-slate-300" },
            { label: `After ${surcharge}% Surcharge`, value: afterSurcharge, color: "text-amber-400" },
            { label: `After ${modifier}x Modifier`, value: afterModifier, color: "text-blue-400" },
            { label: `Final + ${markupPercent}% Markup`, value: afterMarkup, color: "text-emerald-400", bold: true },
          ].map(({ label, value, color, bold }) => (
            <div key={label} className="bg-[#131A2B] p-3 rounded-xl border border-slate-800">
              <p className="text-[9px] font-black uppercase tracking-widest text-slate-500 mb-1">{label}</p>
              <p className={`font-black tracking-tighter ${color} ${bold ? "text-xl" : "text-lg"}`}>£{value.toFixed(2)}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── API DIAGNOSTIC PANEL ────────────────────────────────────────────────────
function ApiDiagnosticPanel({ token, company, markupPercent = 10 }: { token: string; company: any; markupPercent?: number }) {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const defaultDrop = () => { const d = new Date(); d.setDate(d.getDate() + 7); return d.toISOString().split("T")[0]; };
  const defaultPick = () => { const d = new Date(); d.setDate(d.getDate() + 10); return d.toISOString().split("T")[0]; };
  const [dropDate, setDropDate] = useState(defaultDrop);
  const [pickDate, setPickDate] = useState(defaultPick);
  const run = async () => {
    if (!token) return;
    setLoading(true);
    try {
      const res = await fetch("/api/parking-api", { method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token_no: token, drop_date: dropDate, drop_time: "09:00", return_date: pickDate, return_time: "09:00" }) });
      const raw = await res.text();
      let data: any;
      try { data = JSON.parse(raw); } catch { data = { error: "JSON parse failed", raw }; }
      setResult({ status: res.status, ok: res.ok, data });
    } catch (e: any) { setResult({ error: e.message || "Network error" }); }
    setLoading(false);
  };
  const rates = result?.data?.rates || (Array.isArray(result?.data) ? result.data : []);
  const firstRate = rates.find((r: any) => r?.parking_price != null);
  const rawApiPrice = firstRate ? Number(firstRate.parking_price) : null;
  const surcharge = Number(company?.dynamic_surcharge_percent || 0);
  const modifier = Number(company?.price_modifier || 1);
  const finalPrice = rawApiPrice != null ? rawApiPrice * (1 + surcharge / 100) * modifier * (1 + markupPercent / 100) : null;
  return (
    <div className="bg-emerald-500/5 border border-emerald-500/20 rounded-2xl p-6">
      <h4 className="text-emerald-400 font-black text-xs uppercase tracking-widest mb-2 flex items-center gap-2">
        <Network className="w-4 h-4" /> Live API Gateway Test
      </h4>
      <p className="text-[10px] text-emerald-500/70 font-bold mb-4">Ping the gateway with this token and see exactly what comes back.</p>
      <div className="flex flex-wrap gap-3 mb-4">
        <div>
          <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest block mb-1">Drop-off Date</label>
          <input type="date" value={dropDate} onChange={e => setDropDate(e.target.value)} className="bg-[#1A2235] border border-slate-700 rounded-lg px-3 py-2 text-xs font-bold text-white outline-none focus:border-emerald-500 [color-scheme:dark]" />
        </div>
        <div>
          <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest block mb-1">Pick-up Date</label>
          <input type="date" value={pickDate} onChange={e => setPickDate(e.target.value)} className="bg-[#1A2235] border border-slate-700 rounded-lg px-3 py-2 text-xs font-bold text-white outline-none focus:border-emerald-500 [color-scheme:dark]" />
        </div>
        <div className="flex items-end">
          <button type="button" onClick={run} disabled={loading || !token}
            className="flex items-center gap-2 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-700 disabled:text-slate-500 text-white rounded-lg text-xs font-black uppercase tracking-widest transition-all shadow-md active:scale-95">
            {loading ? <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Pinging...</> : <><Zap className="w-3.5 h-3.5" /> Run Test</>}
          </button>
        </div>
      </div>
      {!token && <p className="text-[11px] text-amber-400/80 font-bold flex items-center gap-2"><AlertCircle className="w-3.5 h-3.5" /> Enter a token above to enable the test.</p>}
      {result && (
        <div className="space-y-3 mt-3">
          <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest border ${result.ok ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" : "bg-red-500/10 text-red-400 border-red-500/20"}`}>
            {result.ok ? <CheckCircle2 className="w-3.5 h-3.5" /> : <AlertCircle className="w-3.5 h-3.5" />}
            HTTP {result.status} · {result.ok ? "Success" : "Failed"}<span className="text-slate-500 font-bold">· {dropDate} → {pickDate}</span>
          </div>
          {rawApiPrice != null && (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {[
                { label: "API Raw Price", value: rawApiPrice, color: "text-slate-300" },
                { label: `+${surcharge}% Surcharge`, value: rawApiPrice * (1 + surcharge / 100), color: "text-amber-400" },
                { label: `×${modifier} Modifier`, value: rawApiPrice * (1 + surcharge / 100) * modifier, color: "text-blue-400" },
                { label: `+${markupPercent}% Markup → Final`, value: finalPrice!, color: "text-emerald-400", bold: true },
              ].map(({ label, value, color, bold }) => (
                <div key={label} className="bg-[#0A101D] border border-slate-800 rounded-xl p-3">
                  <p className="text-[8px] font-black uppercase tracking-widest text-slate-600 mb-1">{label}</p>
                  <p className={`font-black tracking-tighter ${color} ${bold ? "text-xl" : "text-sm"}`}>£{value.toFixed(2)}</p>
                </div>
              ))}
            </div>
          )}
          <details>
            <summary className="text-[10px] font-black uppercase tracking-widest text-slate-500 cursor-pointer hover:text-slate-300 transition-colors flex items-center gap-1.5">
              <ChevronDown className="w-3.5 h-3.5" /> Raw Gateway Response
            </summary>
            <pre className="mt-2 p-4 bg-[#060A14] border border-slate-800 rounded-xl text-[10px] font-mono text-emerald-400 overflow-x-auto max-h-48 whitespace-pre-wrap">
              {JSON.stringify(result.data ?? result.error, null, 2)}
            </pre>
          </details>
        </div>
      )}
    </div>
  );
}

// ─── QUICK STATS PANEL ────────────────────────────────────────────────────────
function CompanyQuickStats({ company }: { company: any }) {
  const ltnAvg = company.ltn_reviews?.length ? (company.ltn_reviews.reduce((s: number, r: Review) => s + Number(r.rating || 0), 0) / company.ltn_reviews.length).toFixed(1) : null;
  const lhrAvg = company.lhr_reviews?.length ? (company.lhr_reviews.reduce((s: number, r: Review) => s + Number(r.rating || 0), 0) / company.lhr_reviews.length).toFixed(1) : null;
  const stats = [
    { label: "LTN Reviews", value: company.ltn_reviews?.length || 0, sub: ltnAvg ? `★ ${ltnAvg}` : "No reviews", color: "text-blue-400" },
    { label: "LHR Reviews", value: company.lhr_reviews?.length || 0, sub: lhrAvg ? `★ ${lhrAvg}` : "No reviews", color: "text-purple-400" },
    { label: "Pricing", value: (company.pricing_mode === "pivot" ? "PIVOT" : "API"), sub: company.pricing_mode === "pivot" ? "manual" : "live", color: company.pricing_mode === "pivot" ? "text-blue-400" : "text-emerald-400" },
    { label: "Commission", value: `${company.commission_rate || 15}%`, sub: "cut rate", color: "text-emerald-400" },
  ];
  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
      {stats.map(s => (
        <div key={s.label} className="bg-[#0A101D] border border-slate-800 rounded-xl p-4 text-center">
          <p className="text-[9px] font-black uppercase tracking-widest text-slate-500 mb-1">{s.label}</p>
          <p className={`text-2xl font-black tracking-tighter ${s.color}`}>{s.value}</p>
          <p className="text-[9px] text-slate-600 font-bold mt-0.5">{s.sub}</p>
        </div>
      ))}
    </div>
  );
}

// ─── ROW API RATE CHECKER ─────────────────────────────────────────────────────
function RowApiChecker({ company, markupPercent }: { company: any; markupPercent: number }) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const defaultDrop = () => { const d = new Date(); d.setDate(d.getDate() + 7); return d.toISOString().split("T")[0]; };
  const defaultPick = () => { const d = new Date(); d.setDate(d.getDate() + 10); return d.toISOString().split("T")[0]; };
  const [dropDate, setDropDate] = useState(defaultDrop);
  const [pickDate, setPickDate] = useState(defaultPick);
  const run = async () => {
    if (!company.api_token) return;
    setLoading(true); setResult(null);
    try {
      const res = await fetch("/api/parking-api", { method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token_no: company.api_token, drop_date: dropDate, drop_time: "09:00", return_date: pickDate, return_time: "09:00" }) });
      const raw = await res.text();
      let data: any;
      try { data = JSON.parse(raw); } catch { data = { error: "JSON parse failed", raw }; }
      setResult({ status: res.status, ok: res.ok, data });
    } catch (e: any) { setResult({ error: e.message || "Network error" }); }
    setLoading(false);
  };
  const rates = result?.data?.rates || (Array.isArray(result?.data) ? result.data : []);
  const firstRate = rates.find((r: any) => r?.parking_price != null);
  const rawApiPrice = firstRate ? Number(firstRate.parking_price) : null;
  const surcharge = Number(company.dynamic_surcharge_percent || 0);
  const modifier = Number(company.price_modifier || 1);
  const finalPrice = rawApiPrice != null ? rawApiPrice * (1 + surcharge / 100) * modifier * (1 + markupPercent / 100) : null;
  if (!company.api_token) return null;
  return (
    <td colSpan={7} className="px-0 pb-0 pt-0">
      <div className="border-t border-slate-800/60">
        <button type="button" onClick={() => setOpen(o => !o)}
          className="w-full flex items-center gap-2 px-8 py-2.5 text-[9px] font-black uppercase tracking-widest text-emerald-500/70 hover:text-emerald-400 hover:bg-emerald-500/5 transition-all">
          <Network className="w-3 h-3" /> Check Live API Rate
          <ChevronDown className={`w-3 h-3 ml-auto transition-transform duration-200 ${open ? "rotate-180" : ""}`} />
        </button>
        {open && (
          <div className="px-8 pb-6 pt-3 bg-[#0A101D]/60 border-t border-emerald-500/10 animate-in fade-in duration-200">
            <div className="flex flex-wrap items-end gap-3 mb-4">
              <div>
                <label className="text-[8px] font-black text-slate-500 uppercase tracking-widest block mb-1">Drop-off</label>
                <input type="date" value={dropDate} onChange={e => setDropDate(e.target.value)} className="bg-[#1A2235] border border-slate-700 rounded-lg px-3 py-2 text-xs font-bold text-white outline-none focus:border-emerald-500 [color-scheme:dark]" />
              </div>
              <div>
                <label className="text-[8px] font-black text-slate-500 uppercase tracking-widest block mb-1">Pick-up</label>
                <input type="date" value={pickDate} min={dropDate} onChange={e => setPickDate(e.target.value)} className="bg-[#1A2235] border border-slate-700 rounded-lg px-3 py-2 text-xs font-bold text-white outline-none focus:border-emerald-500 [color-scheme:dark]" />
              </div>
              <button type="button" onClick={run} disabled={loading}
                className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-700 disabled:text-slate-500 text-white rounded-lg text-[10px] font-black uppercase tracking-widest transition-all active:scale-95 shadow-md">
                {loading ? <><Loader2 className="w-3 h-3 animate-spin" /> Pinging...</> : <><Zap className="w-3 h-3" /> Ping</>}
              </button>
            </div>
            {result && (
              <div className="space-y-3">
                <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest border ${result.ok ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" : "bg-red-500/10 text-red-400 border-red-500/20"}`}>
                  {result.ok ? <CheckCircle2 className="w-3 h-3" /> : <AlertCircle className="w-3 h-3" />}
                  HTTP {result.status} · {result.ok ? "OK" : "Failed"}<span className="text-slate-500 font-bold ml-1">{dropDate} → {pickDate}</span>
                </div>
                {rawApiPrice != null ? (
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    {[
                      { label: "API Raw", value: rawApiPrice, color: "text-slate-300" },
                      { label: `+${surcharge}% Surcharge`, value: rawApiPrice * (1 + surcharge / 100), color: "text-amber-400" },
                      { label: `×${modifier} Modifier`, value: rawApiPrice * (1 + surcharge / 100) * modifier, color: "text-blue-400" },
                      { label: `+${markupPercent}% → Final`, value: finalPrice!, color: "text-emerald-400", bold: true },
                    ].map(({ label, value, color, bold }) => (
                      <div key={label} className="bg-[#0F1523] border border-slate-800 rounded-xl p-3">
                        <p className="text-[8px] font-black uppercase tracking-widest text-slate-600 mb-1">{label}</p>
                        <p className={`font-black tracking-tighter ${color} ${bold ? "text-lg" : "text-sm"}`}>£{value.toFixed(2)}</p>
                      </div>
                    ))}
                  </div>
                ) : result.ok ? <p className="text-[10px] text-amber-400 font-bold">No parking_price found in response. Check raw output below.</p> : null}
                <details>
                  <summary className="text-[9px] font-black uppercase tracking-widest text-slate-600 cursor-pointer hover:text-slate-400 transition-colors flex items-center gap-1.5">
                    <ChevronDown className="w-3 h-3" /> Raw Response
                  </summary>
                  <pre className="mt-2 p-3 bg-[#060A14] border border-slate-800 rounded-xl text-[9px] font-mono text-emerald-400 overflow-x-auto max-h-36 whitespace-pre-wrap">
                    {JSON.stringify(result.data ?? result.error, null, 2)}
                  </pre>
                </details>
              </div>
            )}
          </div>
        )}
      </div>
    </td>
  );
}

// ─── LOGO WITH FALLBACK ───────────────────────────────────────────────────────
function CompanyLogo({ logoUrl, name }: { logoUrl: string; name: string }) {
  const [imgError, setImgError] = useState(false);
  useEffect(() => { setImgError(false); }, [logoUrl]);
  if (logoUrl && !imgError) {
    return <img src={logoUrl} alt={name} className="w-11 h-11 rounded-xl object-contain bg-white p-1.5 border border-slate-700/50 shrink-0" onError={() => setImgError(true)} />;
  }
  return (
    <div className="w-11 h-11 rounded-xl bg-[#1A2235] border border-slate-700/50 flex items-center justify-center font-black text-lg text-slate-400 shrink-0 group-hover:text-blue-500 group-hover:border-blue-500/50 transition-all">
      {name.charAt(0)}
    </div>
  );
}

// ─── REVIEW SECTION ───────────────────────────────────────────────────────────
function ReviewSection({ airport, color, reviews, onAdd, onRemove, onUpdate }: {
  airport: "ltn" | "lhr"; color: "blue" | "purple";
  reviews: Review[]; onAdd: () => void; onRemove: (idx: number) => void; onUpdate: (idx: number, field: keyof Review, value: any) => void;
}) {
  const accent = color === "blue" ? "bg-blue-600 hover:bg-blue-500" : "bg-purple-600 hover:bg-purple-500";
  const ring = color === "blue" ? "focus:ring-blue-500/50" : "focus:ring-purple-500/50";
  const inputCls = `w-full bg-[#1A2235] text-white rounded-xl px-4 py-3 text-sm font-bold border border-slate-700/50 outline-none focus:ring-2 ${ring} transition-all placeholder:text-slate-500 [-webkit-text-fill-color:#fff] caret-white`;
  return (
    <div className="pt-8 border-t border-slate-800 mt-6">
      <div className="flex justify-between items-center mb-6">
        <h3 className="text-white font-black text-xl uppercase tracking-widest">{airport.toUpperCase()} Reviews <span className="text-slate-600 ml-2">({reviews.length})</span></h3>
        <button type="button" onClick={onAdd} className={`px-5 py-3 ${accent} text-white rounded-xl text-[9px] font-black uppercase tracking-[0.2em] transition-all shadow-lg`}>+ Add Review</button>
      </div>
      <div className="space-y-6">
        {reviews.map((rev, idx) => (
          <div key={rev.id} className="bg-[#0F1523] p-6 rounded-2xl border border-slate-700/50 relative">
            <button type="button" onClick={() => onRemove(idx)} className="absolute top-6 right-6 p-2 text-slate-600 hover:text-red-500 hover:bg-red-500/10 rounded-lg transition-colors"><Trash2 className="w-4 h-4" /></button>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-4 pr-10">
              <div className="space-y-1"><label className="text-[9px] font-black uppercase text-slate-500 tracking-widest block ml-1">Author</label><input value={rev.author || ""} onChange={e => onUpdate(idx, "author", e.target.value)} className={inputCls} /></div>
              <div className="space-y-1"><label className="text-[9px] font-black uppercase text-slate-500 tracking-widest block ml-1">Rating</label><div className="relative"><select value={rev.rating || 5} onChange={e => onUpdate(idx, "rating", parseInt(e.target.value) || 5)} className={`${inputCls} appearance-none cursor-pointer !text-amber-400 [-webkit-text-fill-color:#fbbf24]`}>{[5, 4, 3, 2, 1].map(n => <option key={n} value={n}>{n} Stars</option>)}</select><ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 pointer-events-none" /></div></div>
              <div className="space-y-1"><label className="text-[9px] font-black uppercase text-slate-500 tracking-widest block ml-1">Source</label><div className="relative"><select value={rev.source || "Trustpilot"} onChange={e => onUpdate(idx, "source", e.target.value)} className={`${inputCls} appearance-none cursor-pointer`}><option value="Trustpilot">Trustpilot</option><option value="Google">Google</option><option value="Internal">Internal</option></select><ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 pointer-events-none" /></div></div>
              <div className="space-y-1"><label className="text-[9px] font-black uppercase text-slate-500 tracking-widest block ml-1">Date</label><input type="date" value={rev.date || ""} onChange={e => onUpdate(idx, "date", e.target.value)} className={`${inputCls} cursor-pointer [color-scheme:dark]`} /></div>
            </div>
            <div className="space-y-1 mb-4"><label className="text-[9px] font-black uppercase text-slate-500 tracking-widest block ml-1">Comment</label><textarea value={rev.comment || ""} onChange={e => onUpdate(idx, "comment", e.target.value)} className={`${inputCls} resize-none leading-relaxed`} rows={3} /></div>
            <label className="flex items-center gap-2 cursor-pointer w-fit group"><input type="checkbox" checked={!!rev.verified} onChange={e => onUpdate(idx, "verified", e.target.checked)} className="w-4 h-4 rounded border-slate-700 bg-[#1A2235] accent-emerald-500 cursor-pointer" /><span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest group-hover:text-emerald-400 transition-colors">Verified Booking</span></label>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── MAIN PAGE ────────────────────────────────────────────────────────────────
export default function AdminCompaniesPage() {
  const router = useRouter();
  const { toasts, show: showToast, dismiss: dismissToast } = useToast();

  const [companies, setCompanies] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [markupPercent, setMarkupPercent] = useState(10);

  const [searchTerm, setSearchTerm] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("ALL");
  const [airportFilter, setAirportFilter] = useState("ALL");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [apiFilter, setApiFilter] = useState("ALL");
  const [sortBy, setSortBy] = useState("name");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc");

  // NEW: card/table view toggle, config-health filter, live API health monitor
  const [viewMode, setViewMode] = useState<"cards" | "table">("cards");
  const [onlyIssues, setOnlyIssues] = useState(false);
  const [apiHealth, setApiHealth] = useState<Record<string, { ok: boolean; price: number | null; status: number }>>({});
  const [healthChecking, setHealthChecking] = useState(false);

  const [showAddModal, setShowAddModal] = useState(false);
  const [editingCompany, setEditingCompany] = useState<any>(null);
  const [modalTab, setModalTab] = useState<"general" | "ltn" | "lhr" | "terminals" | "financials">("general");

  const [companyBookings, setCompanyBookings] = useState<any[]>([]);
  const [fetchingFinancials, setFetchingFinancials] = useState(false);

  const [newCompany, setNewCompany] = useState({ ...defaultCompany });
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const originalEditingRef = useRef<any>(null);

  const [confirmState, setConfirmState] = useState<{ title: string; body: string; confirmLabel: string; danger: boolean; onConfirm: () => void } | null>(null);
  const askConfirm = (opts: { title: string; body: string; confirmLabel?: string; danger?: boolean; onConfirm: () => void }) => {
    setConfirmState({ title: opts.title, body: opts.body, confirmLabel: opts.confirmLabel || "Confirm", danger: opts.danger || false, onConfirm: opts.onConfirm });
  };

  const activeFilterCount = [categoryFilter !== "ALL", airportFilter !== "ALL", statusFilter !== "ALL", apiFilter !== "ALL"].filter(Boolean).length;

  useEffect(() => {
    supabase.from("settings").select("*").in("key", ["markup_percent"]).then(({ data }) => {
      if (data) { const pc = data.find((r: any) => r.key === "markup_percent"); if (pc) setMarkupPercent(Number(pc.value) || 10); }
    });
  }, []);

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) router.push("/admin/login"); else fetchCompanies();
    };
    checkAuth();
  }, [router]);

  useEffect(() => { if (modalTab === "financials" && editingCompany?.id) fetchFinancials(editingCompany.id); }, [modalTab, editingCompany?.id]);

  useEffect(() => {
    if (!editingCompany || !originalEditingRef.current) { setHasUnsavedChanges(false); return; }
    setHasUnsavedChanges(JSON.stringify(editingCompany) !== JSON.stringify(originalEditingRef.current));
  }, [editingCompany]);

  // ESC closes the topmost overlay (confirm dialog first, then the modal)
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      if (confirmState) { setConfirmState(null); return; }
      if (editingCompany || showAddModal) closeModal();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [confirmState, editingCompany, showAddModal, hasUnsavedChanges]);

  async function fetchCompanies() {
    setLoading(true);
    const { data, error } = await supabase.from("companies").select("*").order("name", { ascending: true });
    if (data) setCompanies(data);
    if (error) { console.error("fetchCompanies:", error); showToast("Failed to load partners", "error"); }
    setLoading(false);
  }

  async function fetchFinancials(companyId: string) {
    setFetchingFinancials(true); setCompanyBookings([]);
    const { data, error } = await supabase.from("bookings").select("*").eq("company_id", companyId).neq("status", "cancelled").order("created_at", { ascending: false });
    if (data) setCompanyBookings(data);
    if (error) console.error("fetchFinancials:", error);
    setFetchingFinancials(false);
  }

  const handleLogout = async () => { await supabase.auth.signOut(); router.push("/admin/login"); };

  const doClose = () => {
    setEditingCompany(null); setShowAddModal(false); setModalTab("general");
    setCompanyBookings([]); setHasUnsavedChanges(false); originalEditingRef.current = null;
  };

  const closeModal = () => {
    if (hasUnsavedChanges) {
      askConfirm({ title: "Unsaved Changes", body: "You have unsaved changes. Discard them and close?", confirmLabel: "Discard", danger: true, onConfirm: doClose });
      return;
    }
    doClose();
  };

  const openEditModal = (company: any) => {
    const withDefaults = { ...company, pricing_mode: company.pricing_mode || (company.api_token ? "api" : "pivot") };
    originalEditingRef.current = JSON.parse(JSON.stringify(withDefaults));
    setEditingCompany(withDefaults); setModalTab("general");
  };

  const handleAddCompany = async (e: React.FormEvent) => {
    e.preventDefault(); setIsSaving(true);
    try {
      const { error } = await supabase.from("companies").insert([newCompany]);
      if (error) throw error;
      closeModal(); setNewCompany({ ...defaultCompany });
      await fetchCompanies();
      showToast(`${newCompany.name} onboarded successfully!`, "success");
    } catch (error: any) { showToast("Error adding partner: " + error.message, "error"); } finally { setIsSaving(false); }
  };

  const handleUpdateCompany = async (e: React.FormEvent) => {
    e.preventDefault(); setIsSaving(true);
    try {
      const { error } = await supabase.from("companies").update(editingCompany).eq("id", editingCompany.id);
      if (error) throw error;
      originalEditingRef.current = JSON.parse(JSON.stringify(editingCompany));
      setHasUnsavedChanges(false);
      await fetchCompanies();
      showToast(`${editingCompany.name} saved successfully!`, "success");
      closeModal();
    } catch (error: any) { showToast("Error updating partner: " + error.message, "error"); } finally { setIsSaving(false); }
  };

  const masterUpdate = (val: number) => {
    const text = val === 1 ? "RESET all prices to BASE" : `apply a ${val > 1 ? "+" : ""}${Math.round((val - 1) * 100)}% modifier to ALL operators`;
    askConfirm({
      title: "Master Price Modifier",
      body: `This will ${text}. Every partner's modifier will be overwritten.`,
      confirmLabel: "Apply to All",
      danger: val !== 1,
      onConfirm: async () => {
        setIsSaving(true);
        try {
          const { error } = await supabase.from("companies").update({ price_modifier: val }).neq("id", "00000000-0000-0000-0000-000000000000");
          if (error) throw error;
          await fetchCompanies();
          showToast(`All operators updated to ${val}x modifier`, "success");
        } catch (error: any) { showToast("Error: " + error.message, "error"); } finally { setIsSaving(false); }
      },
    });
  };

  const quickToggle = async (company: any, field: string) => {
    const newVal = !company[field];
    setCompanies(prev => prev.map(c => c.id === company.id ? { ...c, [field]: newVal } : c));
    const { error } = await supabase.from("companies").update({ [field]: newVal }).eq("id", company.id);
    if (error) {
      setCompanies(prev => prev.map(c => c.id === company.id ? { ...c, [field]: !newVal } : c));
      showToast("Toggle failed", "error");
    } else {
      const labels: Record<string, string> = { is_active: newVal ? "Activated" : "Deactivated", ltn_sold_out: newVal ? "LTN marked sold out" : "LTN marked available", lhr_sold_out: newVal ? "LHR marked sold out" : "LHR marked available" };
      showToast(labels[field] || "Updated", "success");
    }
  };

  const togglePricingMode = async (company: any) => {
    const current = company.pricing_mode === "pivot" ? "pivot" : "api";
    const newMode = current === "pivot" ? "api" : "pivot";
    setCompanies(prev => prev.map(c => c.id === company.id ? { ...c, pricing_mode: newMode } : c));
    const { error } = await supabase.from("companies").update({ pricing_mode: newMode }).eq("id", company.id);
    if (error) {
      setCompanies(prev => prev.map(c => c.id === company.id ? { ...c, pricing_mode: company.pricing_mode } : c));
      showToast("Pricing mode toggle failed", "error");
    } else { showToast(`${company.name} → ${newMode === "api" ? "Live API" : "Pivot"} pricing`, "success"); }
  };

  const handleAddBadge = (label: string, category: string) => {
    if (!label) return;
    const current = getField(editingCompany, newCompany, "badges") || [];
    setField(editingCompany, setEditingCompany, newCompany, setNewCompany, "badges", [...current, { label: label.toUpperCase(), category }]);
  };

  const handleRemoveBadge = (index: number) => {
    const current = getField(editingCompany, newCompany, "badges") || [];
    setField(editingCompany, setEditingCompany, newCompany, setNewCompany, "badges", current.filter((_: any, i: number) => i !== index));
  };

  const handleDelete = (id: string, name: string) => {
    askConfirm({
      title: "Delete Partner",
      body: `Permanently delete "${name}"? This removes the partner and cannot be undone.`,
      confirmLabel: "Delete Partner",
      danger: true,
      onConfirm: async () => {
        try {
          const { error } = await supabase.from("companies").delete().eq("id", id);
          if (error) throw error;
          setCompanies(companies.filter((c) => c.id !== id));
          showToast(`${name} deleted`, "error");
        } catch (error: any) { showToast("Error deleting partner: " + error.message, "error"); }
      },
    });
  };

  const updateTerminalField = (term: string, field: string, value: string) => {
    const currentData = getField(editingCompany, newCompany, "terminal_data") || defaultCompany.terminal_data;
    setField(editingCompany, setEditingCompany, newCompany, setNewCompany, "terminal_data", { ...currentData, [term]: { ...(currentData[term as keyof typeof currentData] || {}), [field]: value } });
  };

  const duplicateCompany = async (company: any) => {
    const clone = { ...company, id: undefined, name: `${company.name} (Copy)`, is_active: false };
    delete clone.id;
    try {
      const { error } = await supabase.from("companies").insert([clone]);
      if (error) throw error;
      await fetchCompanies();
      showToast(`Duplicated "${company.name}"`, "success");
    } catch (err: any) { showToast("Duplicate failed: " + err.message, "error"); }
  };

  // NEW FEATURE 1 — config health check (client-side, no network)
  const companyHealth = (c: any): string[] => {
    const issues: string[] = [];
    const apiMode = c.pricing_mode !== "pivot";
    if (apiMode && !c.api_token) issues.push("API mode but no token");
    if (!apiMode) {
      if (c.operates_at_luton && !(Number(c.luton_price) > 0)) issues.push("No LTN pivot price");
      if (c.operates_at_heathrow && !(Number(c.heathrow_price) > 0)) issues.push("No LHR pivot price");
    }
    if (!c.operates_at_luton && !c.operates_at_heathrow) issues.push("No airport selected");
    if (!c.logo_url) issues.push("No logo");
    return issues;
  };

  // NEW FEATURE 2 — live API health monitor (pings every API-mode partner at once)
  const runApiHealth = async () => {
    const targets = companies.filter((c) => c.pricing_mode !== "pivot" && c.api_token);
    if (!targets.length) { showToast("No Live-API partners to test", "info"); return; }
    setHealthChecking(true);
    const d1 = new Date(); d1.setDate(d1.getDate() + 7);
    const d2 = new Date(); d2.setDate(d2.getDate() + 10);
    const dropDate = d1.toISOString().split("T")[0];
    const pickDate = d2.toISOString().split("T")[0];
    const results: Record<string, { ok: boolean; price: number | null; status: number }> = {};
    await Promise.all(targets.map(async (c) => {
      try {
        const res = await fetch("/api/parking-api", { method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ token_no: c.api_token, drop_date: dropDate, drop_time: "09:00", return_date: pickDate, return_time: "09:00" }) });
        const raw = await res.text();
        let data: any; try { data = JSON.parse(raw); } catch { data = null; }
        const rates = data?.rates || (Array.isArray(data) ? data : []);
        const first = Array.isArray(rates) ? rates.find((r: any) => r?.parking_price != null) : null;
        results[c.id] = { ok: res.ok, status: res.status, price: first ? Number(first.parking_price) : null };
      } catch { results[c.id] = { ok: false, status: 0, price: null }; }
    }));
    setApiHealth(results);
    setHealthChecking(false);
    const okCount = Object.values(results).filter((r) => r.ok && r.price != null).length;
    showToast(`API health: ${okCount}/${targets.length} returning prices`, okCount === targets.length ? "success" : "warning");
  };

  const downloadInvoiceCSV = () => {
    if (!editingCompany) return;
    const commRate = Number(editingCompany.commission_rate || 15) / 100;
    let totalGross = 0, totalAero = 0, totalPartner = 0;
    let csv = `AEROPARK DIRECT - PARTNER STATEMENT\nPartner: ${editingCompany.name}\nCommission Rate: ${(commRate * 100).toFixed(1)}%\nGenerated On: ${new Date().toLocaleDateString()}\n\n`;
    csv += `Booking Ref,Customer,Drop-off Date,Drop-off Time,Pick-up Date,Pick-up Time,Service Type,Gross (£),Aero Fee (£),Partner Payout (£)\n`;
    companyBookings.forEach((b) => {
      const gross = Number(b.total_price || 0); const aeroFee = gross * commRate; const partnerCut = gross - aeroFee;
      totalGross += gross; totalAero += aeroFee; totalPartner += partnerCut;
      csv += `${b.booking_ref},${b.full_name},${b.dropoff_date},${b.dropoff_time || "N/A"},${b.pickup_date},${b.pickup_time || "N/A"},${b.service_type || "Meet & Greet"},${gross.toFixed(2)},${aeroFee.toFixed(2)},${partnerCut.toFixed(2)}\n`;
    });
    csv += `\nTOTALS,,,,,,,${totalGross.toFixed(2)},${totalAero.toFixed(2)},${totalPartner.toFixed(2)}\n`;
    const blob = new Blob([csv], { type: "text/csv" });
    const a = Object.assign(document.createElement("a"), { href: URL.createObjectURL(blob), download: `${editingCompany.name.replace(/\s+/g, "_")}_Statement.csv` });
    a.click(); showToast("CSV exported", "success");
  };

  const filteredAndSortedCompanies = useMemo(() => {
    let result = [...companies];
    if (searchTerm) result = result.filter(c => c.name.toLowerCase().includes(searchTerm.toLowerCase()));
    if (categoryFilter !== "ALL") result = result.filter(c => (c.category || "") === categoryFilter);
    if (airportFilter === "LTN") result = result.filter(c => c.operates_at_luton);
    if (airportFilter === "LHR") result = result.filter(c => c.operates_at_heathrow);
    if (statusFilter === "ACTIVE") result = result.filter(c => c.is_active);
    if (statusFilter === "OFFLINE") result = result.filter(c => !c.is_active);
    if (apiFilter === "API") result = result.filter(c => c.pricing_mode !== "pivot" && !!c.api_token);
    if (apiFilter === "MANUAL") result = result.filter(c => c.pricing_mode === "pivot" || !c.api_token);
    if (onlyIssues) result = result.filter(c => companyHealth(c).length > 0);
    result.sort((a, b) => {
      const numFields = ["luton_price", "heathrow_price", "commission_rate"];
      const valA = numFields.includes(sortBy) ? Number(a[sortBy] || 0) : String(a[sortBy] || "").toLowerCase();
      const valB = numFields.includes(sortBy) ? Number(b[sortBy] || 0) : String(b[sortBy] || "").toLowerCase();
      return valA < valB ? (sortOrder === "asc" ? -1 : 1) : valA > valB ? (sortOrder === "asc" ? 1 : -1) : 0;
    });
    return result;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [companies, searchTerm, categoryFilter, airportFilter, statusFilter, apiFilter, sortBy, sortOrder, onlyIssues]);

  const toggleSort = (field: string) => { if (sortBy === field) setSortOrder(o => o === "asc" ? "desc" : "asc"); else { setSortBy(field); setSortOrder("asc"); } };

  const addReview = (airport: "ltn" | "lhr") => {
    const key = airport === "ltn" ? "ltn_reviews" : "lhr_reviews";
    const rev: Review = { id: Date.now() + Math.floor(Math.random() * 100000), author: "Customer Name", rating: 5, comment: "Write review here...", date: new Date().toISOString().split("T")[0], verified: true, source: "Trustpilot" };
    if (editingCompany) setEditingCompany({ ...editingCompany, [key]: [...(editingCompany[key] || []), rev] });
    else setNewCompany({ ...newCompany, [key]: [...(newCompany[key] || []), rev] });
  };

  const removeReview = (airport: "ltn" | "lhr", idx: number) => {
    const key = airport === "ltn" ? "ltn_reviews" : "lhr_reviews";
    if (editingCompany) { const u = [...(editingCompany[key] || [])]; u.splice(idx, 1); setEditingCompany({ ...editingCompany, [key]: u }); }
    else { const u = [...(newCompany[key] || [])]; u.splice(idx, 1); setNewCompany({ ...newCompany, [key]: u }); }
  };

  const updateReview = (airport: "ltn" | "lhr", idx: number, field: keyof Review, value: any) => {
    const key = airport === "ltn" ? "ltn_reviews" : "lhr_reviews";
    if (editingCompany) { const u = [...(editingCompany[key] || [])]; u[idx] = { ...u[idx], [field]: value }; setEditingCompany({ ...editingCompany, [key]: u }); }
    else { const u = [...(newCompany[key] || [])]; u[idx] = { ...u[idx], [field]: value }; setNewCompany({ ...newCompany, [key]: u }); }
  };

  const getAvgRating = (reviews: Review[] | undefined | null) => {
    if (!reviews?.length) return "New";
    return (reviews.reduce((s, r) => s + Number(r.rating || 0), 0) / reviews.length).toFixed(1);
  };

  const calcGross = () => companyBookings.reduce((s, b) => s + Number(b.total_price || 0), 0);
  const calcAeroCut = () => calcGross() * (Number(editingCompany?.commission_rate || 15) / 100);
  const calcPayout = () => calcGross() - calcAeroCut();

  const totalPartners = companies.length;
  const ltnCoverage = companies.filter(c => c.operates_at_luton && c.is_active).length;
  const lhrCoverage = companies.filter(c => c.operates_at_heathrow && c.is_active).length;
  const apiCount = companies.filter(c => c.pricing_mode !== "pivot" && !!c.api_token).length;
  const needsAttentionCount = companies.filter(c => companyHealth(c).length > 0).length;

  if (loading) {
    return (
      <div className="min-h-screen bg-[#060A14] flex flex-col items-center justify-center text-white">
        <Plane className="w-10 h-10 text-blue-500 animate-pulse rotate-45" />
        <p className="font-black text-slate-400 tracking-widest uppercase text-xs mt-6">Initializing Network Hub...</p>
      </div>
    );
  }

  const inputCls = "w-full bg-[#1A2235] text-white border border-slate-700/50 hover:border-blue-500/50 rounded-xl px-5 py-4 text-sm font-bold outline-none focus:ring-2 focus:ring-blue-500/50 transition-all placeholder:text-slate-500 [-webkit-text-fill-color:#fff] caret-white [&:-webkit-autofill]:[-webkit-text-fill-color:#fff] [&:-webkit-autofill]:[transition:background-color_9999s_ease-in-out_0s] [&:-webkit-autofill]:[box-shadow:0_0_0px_1000px_#1A2235_inset!important]";
  const labelCls = "text-[10px] font-black uppercase text-slate-500 block ml-1 tracking-widest mb-2";
  const filterSelectCls = "w-full appearance-none bg-[#1A2235] text-slate-300 border border-slate-700/50 hover:border-blue-500/50 rounded-xl py-4 pl-10 pr-9 text-[10px] sm:text-xs font-black uppercase tracking-widest outline-none cursor-pointer transition-all";
  const textareaCls = "w-full bg-[#1A2235] text-white border border-slate-700/50 hover:border-blue-500/50 rounded-xl px-5 py-4 text-sm font-bold outline-none focus:ring-2 focus:ring-blue-500/50 transition-all placeholder:text-slate-500 leading-relaxed [-webkit-text-fill-color:#fff] caret-white [&:-webkit-autofill]:[-webkit-text-fill-color:#fff] [&:-webkit-autofill]:[box-shadow:0_0_0px_1000px_#1A2235_inset!important]";

  return (
    <div className="dark-ui min-h-screen bg-gradient-to-b from-[#0B1120] via-[#0A0E1A] to-[#0B1120] font-sans flex flex-col md:flex-row overflow-hidden text-slate-100 selection:bg-blue-600/30 selection:text-white antialiased relative">
      <ToastContainer toasts={toasts} onDismiss={dismissToast} />

      {/* 🌌 AMBIENT BACKGROUND GLOW LAYERS */}
      <div className="fixed top-[-200px] left-[200px] w-[600px] h-[600px] bg-blue-600/8 rounded-full blur-[140px] pointer-events-none z-0"></div>
      <div className="fixed bottom-[-200px] right-[100px] w-[500px] h-[500px] bg-indigo-600/8 rounded-full blur-[140px] pointer-events-none z-0"></div>
      <div className="fixed top-[40%] right-[30%] w-[400px] h-[400px] bg-emerald-600/5 rounded-full blur-[120px] pointer-events-none z-0"></div>

      {confirmState && (
        <div className="fixed inset-0 bg-[#060A14]/90 backdrop-blur-sm z-[400] flex items-center justify-center p-4">
          <div className="bg-[#0F1523] border border-slate-800 w-full max-w-md rounded-3xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-7">
              <div className="flex items-start gap-4">
                <div className={`w-11 h-11 shrink-0 rounded-xl flex items-center justify-center border ${confirmState.danger ? "bg-red-500/10 border-red-500/20 text-red-400" : "bg-blue-500/10 border-blue-500/20 text-blue-400"}`}>
                  <AlertCircle className="w-6 h-6" />
                </div>
                <div className="flex-1">
                  <h3 className="text-lg font-black text-white tracking-tight">{confirmState.title}</h3>
                  <p className="text-sm font-medium text-slate-400 mt-1.5 leading-relaxed">{confirmState.body}</p>
                </div>
              </div>
            </div>
            <div className="px-7 py-5 bg-[#131A2B] border-t border-slate-800 flex gap-3 justify-end">
              <button onClick={() => setConfirmState(null)} className="px-5 py-3 text-slate-400 font-bold text-xs uppercase tracking-widest hover:text-white transition-colors">Cancel</button>
              <button
                onClick={() => { const fn = confirmState.onConfirm; setConfirmState(null); fn(); }}
                className={`px-6 py-3 rounded-xl font-black text-xs uppercase tracking-widest text-white transition-all active:scale-95 ${confirmState.danger ? "bg-red-600 hover:bg-red-500 shadow-[0_8px_16px_-4px_rgba(220,38,38,0.4)]" : "bg-blue-600 hover:bg-blue-500 shadow-[0_8px_16px_-4px_rgba(37,99,235,0.4)]"}`}
              >
                {confirmState.confirmLabel}
              </button>
            </div>
          </div>
        </div>
      )}

      <aside className="w-full md:w-64 bg-[#0F1523]/90 backdrop-blur-xl text-slate-400 hidden md:flex flex-col sticky top-0 h-screen border-r border-slate-800/80 shadow-2xl z-50 shrink-0 relative">
        <div className="absolute inset-y-0 right-0 w-px bg-gradient-to-b from-transparent via-blue-500/20 to-transparent"></div>
        <div className="p-8 flex items-center gap-4 text-white">
          <div className="w-10 h-10 bg-gradient-to-br from-blue-600/30 to-blue-600/5 rounded-xl flex items-center justify-center border border-blue-500/30 shadow-[0_0_20px_rgba(37,99,235,0.25)]"><Plane className="w-6 h-6 text-blue-400 rotate-45 drop-shadow-[0_0_6px_rgba(59,130,246,0.6)]" /></div>
          <span className="font-black text-xl tracking-tighter uppercase">OPS <span className="text-blue-500 drop-shadow-[0_0_8px_rgba(59,130,246,0.5)]">CENTER</span></span>
        </div>
        <nav className="px-5 space-y-3 flex-grow mt-6 font-bold text-sm">
          <Link href="/admin" className="flex items-center gap-4 px-5 py-4 hover:bg-white/5 hover:text-white rounded-xl transition-all hover:border-l-2 hover:border-blue-500/50"><LayoutDashboard className="w-5 h-5 text-slate-500" /> Live Board</Link>
          <Link href="/admin/companies" className="flex items-center gap-4 px-5 py-4 bg-gradient-to-r from-blue-600 to-blue-500 text-white rounded-xl shadow-[0_10px_30px_-5px_rgba(37,99,235,0.5)] transition-all hover:shadow-[0_10px_40px_-5px_rgba(37,99,235,0.7)] hover:-translate-y-0.5 relative overflow-hidden group"><div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/10 to-white/0 -translate-x-full group-hover:translate-x-full transition-transform duration-700"></div><Building2 className="w-5 h-5" /> Partner Network</Link>
          <Link href="/admin/promos" className="flex items-center gap-4 px-5 py-4 hover:bg-white/5 hover:text-white rounded-xl transition-all hover:border-l-2 hover:border-blue-500/50"><Tags className="w-5 h-5 text-slate-500" /> Promo Manager</Link>
          <Link href="/admin/financials" className="flex items-center gap-4 px-5 py-4 hover:bg-white/5 hover:text-white rounded-xl transition-all hover:border-l-2 hover:border-blue-500/50"><CalendarDays className="w-5 h-5 text-slate-500" /> Financials</Link>
          <Link href="/admin/settings" className="flex items-center gap-4 px-5 py-4 hover:bg-white/5 hover:text-white rounded-xl transition-all border-t border-slate-800/50 mt-4 pt-6 hover:border-l-2 hover:border-blue-500/50"><Settings2 className="w-5 h-5 text-slate-500" /> Platform Settings</Link>
        </nav>
        <div className="p-6">
          <button onClick={handleLogout} className="flex items-center gap-4 text-sm font-bold hover:text-red-400 transition-colors w-full text-left px-5 py-4 group bg-slate-900/50 rounded-xl border border-slate-800/80 shadow-sm hover:border-red-500/30 hover:shadow-[0_0_20px_-8px_rgba(239,68,68,0.4)]"><LogOut className="w-5 h-5 text-slate-500 group-hover:text-red-500 transition-colors" /> Secure Logout</button>
        </div>
      </aside>

      <main className="flex-1 p-4 md:p-8 lg:p-12 w-full overflow-y-auto h-screen relative pb-32 md:pb-12 z-10">
        <div className="md:hidden flex items-center justify-between mb-8 bg-[#131A2B]/80 backdrop-blur-xl p-5 rounded-3xl border border-slate-800 shadow-2xl">
          <div className="flex items-center gap-3 font-black text-xl uppercase tracking-tighter text-white">
            <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center shadow-lg shadow-blue-600/30"><Plane className="w-6 h-6 text-white rotate-45" /></div>
            OPS<span className="text-blue-500">CENTER</span>
          </div>
          <button onClick={handleLogout} className="p-3 bg-slate-800 rounded-xl text-slate-300 hover:text-red-400 transition-colors"><LogOut className="w-5 h-5" /></button>
        </div>

        {/* 🟢 COMMAND HERO PANEL (header + live stat rail, one unit) */}
        <div className="relative mb-8 rounded-[2rem] border border-slate-800/80 bg-gradient-to-br from-[#131A2B] to-[#0F1523] shadow-2xl overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-blue-500/40 to-transparent"></div>
          <div className="absolute -top-24 -left-24 w-72 h-72 bg-blue-600/10 rounded-full blur-[100px] pointer-events-none"></div>
          <div className="absolute -bottom-24 -right-24 w-72 h-72 bg-indigo-600/10 rounded-full blur-[100px] pointer-events-none"></div>

          {/* ROW 1 — title + actions */}
          <div className="relative p-6 md:p-8 flex flex-col lg:flex-row lg:items-center justify-between gap-6 border-b border-slate-800/60">
            <div className="flex items-center gap-5">
              <div className="hidden sm:flex w-14 h-14 rounded-2xl bg-gradient-to-br from-blue-600/30 to-blue-600/5 border border-blue-500/30 items-center justify-center shadow-[0_0_25px_rgba(37,99,235,0.3)] shrink-0">
                <Network className="w-7 h-7 text-blue-400" />
              </div>
              <div>
                <h1 className="text-3xl md:text-4xl font-black tracking-tight bg-gradient-to-r from-white via-white to-blue-200 bg-clip-text text-transparent">Partner Network</h1>
                <div className="flex flex-wrap items-center gap-x-3 gap-y-2 mt-2">
                  <span className="text-slate-500 font-bold text-[10px] uppercase tracking-[0.2em]">{filteredAndSortedCompanies.length} of {totalPartners} shown</span>
                  {needsAttentionCount > 0 && (
                    <button onClick={() => setOnlyIssues((v) => !v)} className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg uppercase tracking-widest text-[9px] font-black border transition-all ${onlyIssues ? "bg-amber-500 text-white border-amber-400" : "bg-amber-500/10 text-amber-400 border-amber-500/30 hover:bg-amber-500/20"}`}>
                      <AlertOctagon className="w-3 h-3" /> {needsAttentionCount} need{needsAttentionCount === 1 ? "s" : ""} attention
                    </button>
                  )}
                </div>
              </div>
            </div>
            <div className="flex flex-col sm:flex-row gap-3 shrink-0">
              <button onClick={runApiHealth} disabled={healthChecking} className="px-6 py-3.5 bg-[#1A2235]/80 backdrop-blur-sm hover:bg-[#1A2235] border border-emerald-500/30 hover:border-emerald-500/50 text-emerald-400 rounded-xl text-xs font-black uppercase tracking-[0.1em] transition-all flex items-center justify-center gap-3 shadow-md disabled:opacity-50">
                {healthChecking ? <Loader2 className="w-4 h-4 animate-spin" /> : <Network className="w-4 h-4" />} Check API Health
              </button>
              <button onClick={() => { setModalTab("general"); setShowAddModal(true); }} className="px-6 py-3.5 bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-500 hover:to-blue-400 text-white rounded-xl text-xs font-black uppercase tracking-[0.1em] transition-all flex items-center justify-center gap-3 shadow-[0_10px_30px_-5px_rgba(37,99,235,0.5)] hover:-translate-y-0.5 active:translate-y-0 relative overflow-hidden group">
                <div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/20 to-white/0 -translate-x-full group-hover:translate-x-full transition-transform duration-700"></div>
                <Plus className="w-5 h-5" /> Onboard Partner
              </button>
            </div>
          </div>

          {/* ROW 2 — live stat rail */}
          <div className="relative grid grid-cols-2 lg:grid-cols-4 divide-x divide-slate-800/60">
            {[
              { label: "Total Network", value: totalPartners, sub: "partners", color: "#3b82f6", Icon: Network },
              { label: "LTN Active", value: ltnCoverage, sub: "live at Luton", color: "#10b981", Icon: Car },
              { label: "LHR Active", value: lhrCoverage, sub: "live at Heathrow", color: "#6366f1", Icon: PlaneTakeoff },
              { label: "Live API", value: apiCount, sub: "API pricing", color: "#f59e0b", Icon: Zap },
            ].map((s, i) => (
              <div key={i} className="p-5 md:p-6 relative group hover:bg-white/[0.02] transition-colors border-t border-slate-800/60 lg:border-t-0">
                <div className="flex items-center justify-between mb-3">
                  <p className="text-[10px] font-black uppercase tracking-[0.2em]" style={{ color: s.color }}>{s.label}</p>
                  <div className="w-7 h-7 rounded-lg flex items-center justify-center border" style={{ background: `${s.color}1A`, borderColor: `${s.color}33` }}>
                    <s.Icon className="w-3.5 h-3.5" style={{ color: s.color }} />
                  </div>
                </div>
                <p className="text-2xl md:text-3xl font-black text-white tracking-tight tabular-nums">{s.value}</p>
                <p className="text-[10px] font-bold text-slate-500 mt-1.5 truncate">{s.sub}</p>
                <div className="absolute bottom-0 left-0 h-0.5 w-0 group-hover:w-full transition-all duration-500" style={{ background: s.color }}></div>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-gradient-to-r from-blue-900/20 to-indigo-900/20 rounded-[2rem] border border-blue-500/20 shadow-lg p-6 md:p-8 mb-8 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-blue-500/10 rounded-full blur-[80px] pointer-events-none" />
          <div className="flex flex-col md:flex-row items-center justify-between gap-6 relative z-10">
            <div>
              <h2 className="text-xl font-black text-white flex items-center gap-2"><Zap className="w-5 h-5 text-blue-400" /> Master Price Modifier</h2>
              <p className="text-xs text-slate-400 mt-1 font-bold">Apply a global multiplier across ALL operators at once.</p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {[0.7, 0.8, 0.9, 1.0, 1.1, 1.2, 1.3].map(v => (
                <button key={v} type="button" onClick={() => masterUpdate(v)} className={`px-4 py-2.5 rounded-xl text-xs font-black transition-all active:scale-95 border ${v === 1 ? "bg-slate-800 text-white border-slate-700 hover:bg-slate-700" : v < 1 ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20 hover:bg-emerald-500/20" : "bg-rose-500/10 text-rose-400 border-rose-500/20 hover:bg-rose-500/20"}`}>{v === 1 ? "BASE" : `${v > 1 ? "+" : ""}${Math.round((v - 1) * 100)}%`}</button>
              ))}
              <button onClick={fetchCompanies} title="Refresh" className="p-2.5 bg-slate-800 border border-slate-700 rounded-xl text-slate-400 hover:text-white hover:bg-slate-700 transition-all active:scale-95"><RefreshCw className="w-4 h-4" /></button>
            </div>
          </div>
        </div>

        <div className="bg-[#131A2B] rounded-[2rem] border border-slate-800 shadow-lg p-4 mb-8 flex flex-col xl:flex-row gap-4">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500 z-10 pointer-events-none" />
            <input type="text" autoComplete="off" placeholder="Search partners..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="w-full bg-[#1A2235] text-white border border-slate-700/50 hover:border-blue-500/50 rounded-xl py-4 pl-12 pr-10 text-sm font-bold outline-none focus:ring-2 focus:ring-blue-500/50 transition-all placeholder:text-slate-500 [-webkit-text-fill-color:#fff] caret-white" />
            {searchTerm && <button onClick={() => setSearchTerm("")} className="absolute right-4 top-1/2 -translate-y-1/2 p-1 rounded-md hover:bg-slate-700 transition-colors"><X className="w-4 h-4 text-slate-400" /></button>}
          </div>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3 w-full xl:w-auto shrink-0">
            <div className="relative">
              <SlidersHorizontal className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 z-10 pointer-events-none" />
              <select value={categoryFilter} onChange={e => setCategoryFilter(e.target.value)} className={`${filterSelectCls} ${categoryFilter !== "ALL" ? "text-blue-400" : ""}`}><option value="ALL">All Services</option><option value="meet-greet">Meet &amp; Greet</option><option value="park-ride">Park &amp; Ride</option><option value="hotel">Hotel Parking</option></select>
              <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 pointer-events-none" />
            </div>
            <div className="relative">
              <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 z-10 pointer-events-none" />
              <select value={airportFilter} onChange={e => setAirportFilter(e.target.value)} className={`${filterSelectCls} ${airportFilter !== "ALL" ? "text-blue-400" : ""}`}><option value="ALL">All Airports</option><option value="LTN">Luton (LTN)</option><option value="LHR">Heathrow (LHR)</option></select>
              <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 pointer-events-none" />
            </div>
            <div className="relative">
              <AlertCircle className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 z-10 pointer-events-none" />
              <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className={`${filterSelectCls} ${statusFilter !== "ALL" ? "text-blue-400" : ""}`}><option value="ALL">Any Status</option><option value="ACTIVE">Active Only</option><option value="OFFLINE">Offline</option></select>
              <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 pointer-events-none" />
            </div>
            <div className="relative">
              <Network className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 z-10 pointer-events-none" />
              <select value={apiFilter} onChange={e => setApiFilter(e.target.value)} className={`${filterSelectCls} ${apiFilter !== "ALL" ? "text-amber-400" : ""}`}><option value="ALL">All Pricing</option><option value="API">Live API</option><option value="MANUAL">Pivot/Manual</option></select>
              <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 pointer-events-none" />
            </div>
            {activeFilterCount > 0 ? (
              <button onClick={() => { setCategoryFilter("ALL"); setAirportFilter("ALL"); setStatusFilter("ALL"); setApiFilter("ALL"); setSearchTerm(""); }} className="flex items-center justify-center gap-1.5 w-full bg-[#1A2235] border border-red-500/30 text-red-400 hover:bg-red-500/10 rounded-xl py-4 text-[10px] font-black uppercase tracking-widest transition-all"><X className="w-4 h-4" /> Clear</button>
            ) : (
              <div className="flex items-center justify-center gap-1.5 w-full bg-[#1A2235] border border-slate-700/50 text-slate-500 rounded-xl py-4 text-[10px] font-black uppercase tracking-widest opacity-40 cursor-not-allowed"><Filter className="w-4 h-4" /> Filters</div>
            )}
          </div>
        </div>

        {/* VIEW TOGGLE + SORT */}
        <div className="flex items-center justify-between gap-3 mb-5 px-1">
          <div className="flex items-center bg-[#1A2235]/80 border border-slate-800 rounded-xl p-1">
            <button onClick={() => setViewMode("cards")} className={`px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-1.5 ${viewMode === "cards" ? "bg-blue-600 text-white shadow-md" : "text-slate-400 hover:text-white"}`}><Building2 className="w-3.5 h-3.5" /> Cards</button>
            <button onClick={() => setViewMode("table")} className={`px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-1.5 ${viewMode === "table" ? "bg-blue-600 text-white shadow-md" : "text-slate-400 hover:text-white"}`}><SlidersHorizontal className="w-3.5 h-3.5" /> Table</button>
          </div>
          <div className="relative">
            <ArrowUpDown className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 z-10 pointer-events-none" />
            <select
              value={`${sortBy}:${sortOrder}`}
              onChange={(e) => { const [f, o] = e.target.value.split(":"); setSortBy(f); setSortOrder(o as "asc" | "desc"); }}
              className="appearance-none bg-[#1A2235]/80 border border-slate-800 hover:border-blue-500/40 rounded-xl py-2.5 pl-10 pr-9 text-[10px] font-black uppercase tracking-widest text-slate-300 outline-none cursor-pointer transition-all focus:ring-2 focus:ring-blue-500/40"
            >
              <option value="name:asc" className="bg-[#1A2235]">Name A → Z</option>
              <option value="name:desc" className="bg-[#1A2235]">Name Z → A</option>
              <option value="luton_price:desc" className="bg-[#1A2235]">LTN Price High → Low</option>
              <option value="luton_price:asc" className="bg-[#1A2235]">LTN Price Low → High</option>
              <option value="commission_rate:desc" className="bg-[#1A2235]">Commission High → Low</option>
              <option value="commission_rate:asc" className="bg-[#1A2235]">Commission Low → High</option>
            </select>
            <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 pointer-events-none" />
          </div>
        </div>

        {/* 🟢 CARD GRID VIEW */}
        {viewMode === "cards" && (
          filteredAndSortedCompanies.length === 0 ? (
            <div className="bg-[#131A2B]/70 backdrop-blur-xl rounded-3xl border border-slate-800 py-32 flex flex-col items-center justify-center opacity-50 px-6 text-center mb-24">
              <Search className="w-12 h-12 text-slate-500 mb-4" />
              <p className="text-xl font-black uppercase tracking-[0.3em] text-white">No Partners Match</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 2xl:grid-cols-3 gap-5 mb-24">
              {filteredAndSortedCompanies.map((c) => {
                const isApiMode = c.pricing_mode !== "pivot";
                const issues = companyHealth(c);
                const health = apiHealth[c.id];
                return (
                  <div key={c.id} onClick={() => openEditModal(c)}
                    className={`group bg-gradient-to-br from-[#131A2B] to-[#0F1523] rounded-3xl border border-slate-800/80 hover:border-blue-500/40 shadow-xl hover:shadow-[0_20px_50px_-15px_rgba(59,130,246,0.25)] transition-all duration-300 cursor-pointer relative overflow-hidden flex flex-col hover:-translate-y-1 ${!c.is_active ? "opacity-60" : ""}`}>
                    <div className="absolute top-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-blue-500/20 to-transparent"></div>

                    {/* HEAD */}
                    <div className="p-5 flex items-start gap-4">
                      <CompanyLogo logoUrl={c.logo_url} name={c.name} />
                      <div className="min-w-0 flex-1">
                        <h3 className="text-base font-black text-white truncate group-hover:text-blue-400 transition-colors">{c.name}</h3>
                        <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                          <span className="text-[9px] font-black text-blue-400 tracking-widest uppercase bg-blue-500/10 px-2 py-0.5 rounded border border-blue-500/20">{c.category?.replace("-", " ")}</span>
                          {issues.length > 0 && (
                            <span title={issues.join(", ")} className="text-[9px] font-black text-amber-400 uppercase tracking-widest bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20 flex items-center gap-1"><AlertOctagon className="w-2.5 h-2.5" /> {issues.length}</span>
                          )}
                        </div>
                      </div>
                      <button onClick={(e) => { e.stopPropagation(); quickToggle(c, "is_active"); }} className={`shrink-0 px-3 py-1.5 rounded-lg text-[9px] tracking-widest font-black border uppercase transition-all ${c.is_active ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20 hover:bg-emerald-500/20" : "bg-red-500/10 text-red-400 border-red-500/20 hover:bg-red-500/20"}`}>{c.is_active ? "Active" : "Offline"}</button>
                    </div>

                    {/* BODY */}
                    <div className="px-5 pb-4 space-y-3 flex-1" onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center gap-2 flex-wrap">
                        <button onClick={() => togglePricingMode(c)} title={isApiMode ? "Switch to Pivot pricing" : "Switch to Live API pricing"} className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[9px] font-black border uppercase tracking-widest transition-all ${isApiMode ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20 hover:bg-emerald-500/20" : "bg-blue-500/10 text-blue-400 border-blue-500/20 hover:bg-blue-500/20"}`}>{isApiMode ? <><Zap className="w-3 h-3" /> API</> : <><Calculator className="w-3 h-3" /> Pivot</>}</button>
                        <div className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[9px] font-black border uppercase tracking-widest ${(c.price_modifier || 1) === 1 ? "border-slate-700 bg-slate-800 text-slate-400" : c.price_modifier < 1 ? "border-emerald-500/20 bg-emerald-500/10 text-emerald-400" : "border-rose-500/20 bg-rose-500/10 text-rose-400"}`}><Zap className="w-3 h-3" />{(c.price_modifier || 1) === 1 ? "BASE" : `${c.price_modifier > 1 ? "+" : ""}${Math.round(((c.price_modifier || 1) - 1) * 100)}%`}</div>
                        <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[9px] font-black border border-slate-700 bg-slate-800 text-slate-300 uppercase tracking-widest"><Percent className="w-3 h-3" />{c.commission_rate || 15}% comm</div>
                      </div>

                      <div className="grid grid-cols-2 gap-2.5">
                        <div className="bg-[#1A2235]/60 border border-slate-800 rounded-xl px-3 py-2.5">
                          <p className="text-[8px] font-black uppercase tracking-widest text-emerald-400 flex items-center gap-1"><Car className="w-3 h-3" /> Luton</p>
                          <p className="text-sm font-black text-white mt-1">{c.operates_at_luton ? (isApiMode && c.api_token ? <span className="text-emerald-400 text-[10px] uppercase tracking-widest">LIVE</span> : `£${Number(c.luton_price || 0).toFixed(2)}`) : <span className="text-slate-600">—</span>}{c.ltn_sold_out && <span className="text-red-400 text-[8px] ml-1.5 uppercase">Sold out</span>}</p>
                          <p className="text-[9px] text-slate-500 font-bold mt-0.5">{c.operates_at_luton ? `★ ${getAvgRating(c.ltn_reviews)} · ${c.ltn_reviews?.length || 0} rev` : "not active"}</p>
                        </div>
                        <div className="bg-[#1A2235]/60 border border-slate-800 rounded-xl px-3 py-2.5">
                          <p className="text-[8px] font-black uppercase tracking-widest text-indigo-400 flex items-center gap-1"><PlaneTakeoff className="w-3 h-3" /> Heathrow</p>
                          <p className="text-sm font-black text-white mt-1">{c.operates_at_heathrow ? (isApiMode && c.api_token ? <span className="text-emerald-400 text-[10px] uppercase tracking-widest">LIVE</span> : `£${Number(c.heathrow_price || 0).toFixed(2)}`) : <span className="text-slate-600">—</span>}{c.lhr_sold_out && <span className="text-red-400 text-[8px] ml-1.5 uppercase">Sold out</span>}</p>
                          <p className="text-[9px] text-slate-500 font-bold mt-0.5">{c.operates_at_heathrow ? `★ ${getAvgRating(c.lhr_reviews)} · ${c.lhr_reviews?.length || 0} rev` : "not active"}</p>
                        </div>
                      </div>

                      {isApiMode && c.api_token && health && (
                        <div className={`flex items-center gap-2 px-3 py-2 rounded-xl border text-[9px] font-black uppercase tracking-widest ${health.ok && health.price != null ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" : "bg-red-500/10 text-red-400 border-red-500/20"}`}>
                          {health.ok && health.price != null ? <CheckCircle2 className="w-3.5 h-3.5" /> : <AlertCircle className="w-3.5 h-3.5" />}
                          {health.ok && health.price != null ? `API OK · £${Number(health.price).toFixed(2)}` : `API Failed · HTTP ${health.status || "ERR"}`}
                        </div>
                      )}
                    </div>

                    {/* FOOTER */}
                    <div className="px-4 py-3.5 border-t border-slate-800 bg-[#0F1523]/60 flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
                      <button onClick={() => quickToggle(c, "ltn_sold_out")} title={c.ltn_sold_out ? "Mark LTN Available" : "Mark LTN Sold Out"} className={`px-2.5 py-1.5 rounded-lg text-[8px] font-black border uppercase transition-all ${c.ltn_sold_out ? "bg-red-500/20 text-red-400 border-red-500/30" : "bg-slate-800 text-slate-500 border-slate-700 hover:border-red-500/30 hover:text-red-400"}`}>{c.ltn_sold_out ? "LTN 🔴" : "LTN ✓"}</button>
                      <button onClick={() => quickToggle(c, "lhr_sold_out")} title={c.lhr_sold_out ? "Mark LHR Available" : "Mark LHR Sold Out"} className={`px-2.5 py-1.5 rounded-lg text-[8px] font-black border uppercase transition-all ${c.lhr_sold_out ? "bg-red-500/20 text-red-400 border-red-500/30" : "bg-slate-800 text-slate-500 border-slate-700 hover:border-red-500/30 hover:text-red-400"}`}>{c.lhr_sold_out ? "LHR 🔴" : "LHR ✓"}</button>
                      <div className="flex-1"></div>
                      <button onClick={() => openEditModal(c)} className="p-2.5 bg-[#1A2235] text-slate-300 hover:bg-blue-600 hover:text-white rounded-lg border border-slate-700 hover:border-transparent transition-all active:scale-95" title="Configure"><Settings2 className="w-4 h-4" /></button>
                      <button onClick={() => duplicateCompany(c)} className="p-2.5 bg-[#1A2235] text-slate-500 hover:bg-indigo-600 hover:text-white rounded-lg border border-slate-700 hover:border-transparent transition-all active:scale-95" title="Duplicate"><Copy className="w-4 h-4" /></button>
                      <button onClick={() => handleDelete(c.id, c.name)} className="p-2.5 bg-[#1A2235] text-slate-500 hover:bg-red-500 hover:text-white rounded-lg border border-slate-700 hover:border-transparent transition-all active:scale-95" title="Delete"><Trash2 className="w-4 h-4" /></button>
                    </div>
                  </div>
                );
              })}
            </div>
          )
        )}

        {/* 🟢 TABLE VIEW */}
        {viewMode === "table" && (
        <div className="bg-[#131A2B] rounded-3xl border border-slate-800 overflow-hidden shadow-2xl mb-24">
          <div className="overflow-x-auto min-h-[400px]">
            <table className="w-full text-left whitespace-nowrap">
              <thead className="bg-[#0F1523] border-b border-slate-800">
                <tr className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">
                  <th className="px-8 py-6 cursor-pointer hover:text-white" onClick={() => toggleSort("name")}>Partner Profile <SortIcon field="name" sortBy={sortBy} sortOrder={sortOrder} /></th>
                  <th className="px-6 py-6 text-center">Status</th>
                  <th className="px-6 py-6 text-center">Pricing</th>
                  <th className="px-6 py-6 text-center">Sold Out</th>
                  <th className="px-6 py-6 text-center">Modifier</th>
                  <th className="px-6 py-6 text-right cursor-pointer hover:text-white" onClick={() => toggleSort("luton_price")}>LTN <SortIcon field="luton_price" sortBy={sortBy} sortOrder={sortOrder} /></th>
                  <th className="px-6 py-6 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {filteredAndSortedCompanies.length === 0 ? (
                  <tr><td colSpan={7} className="py-32 text-center"><div className="flex flex-col items-center justify-center opacity-40"><Search className="w-12 h-12 text-slate-500 mb-4" /><p className="text-xl font-black uppercase tracking-[0.3em] text-white">No Partners Match</p></div></td></tr>
                ) : filteredAndSortedCompanies.map(c => {
                  const isApiMode = c.pricing_mode !== "pivot";
                  return (
                  <React.Fragment key={c.id}>
                    <tr className={`transition-all group hover:bg-slate-800/30 ${!c.is_active ? "opacity-50 grayscale" : ""}`}>
                      <td className="px-8 py-6">
                        <div className="flex items-center gap-4">
                          <CompanyLogo logoUrl={c.logo_url} name={c.name} />
                          <div>
                            <p className="font-bold text-white text-sm group-hover:text-blue-400 transition-colors tracking-tight">{c.name}</p>
                            <div className="flex items-center gap-2 mt-1 flex-wrap">
                              <span className="text-[9px] font-black text-blue-400 tracking-widest uppercase bg-blue-500/10 px-2 py-0.5 rounded border border-blue-500/20">{c.category?.replace("-", " ")}</span>
                            </div>
                            <div className="flex items-center gap-3 text-[10px] font-bold text-slate-400 mt-1.5">
                              {c.operates_at_luton && <span className={c.ltn_featured ? "text-amber-400" : ""}><Car className="w-3 h-3 inline mr-0.5" /> {getAvgRating(c.ltn_reviews)}</span>}
                              {c.operates_at_heathrow && <span className={c.lhr_featured ? "text-amber-400" : ""}><PlaneTakeoff className="w-3 h-3 inline mr-0.5" /> {getAvgRating(c.lhr_reviews)}</span>}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-6 text-center">
                        <button onClick={() => quickToggle(c, "is_active")} className={`px-3 py-1.5 rounded-lg text-[9px] tracking-widest font-black border uppercase transition-all ${c.is_active ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20 hover:bg-emerald-500/20" : "bg-red-500/10 text-red-400 border-red-500/20 hover:bg-red-500/20"}`}>{c.is_active ? "Active" : "Offline"}</button>
                      </td>
                      <td className="px-6 py-6 text-center">
                        <button onClick={() => togglePricingMode(c)} title={isApiMode ? "Switch to Pivot pricing" : "Switch to Live API pricing"} className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[9px] font-black border uppercase tracking-widest transition-all ${isApiMode ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20 hover:bg-emerald-500/20" : "bg-blue-500/10 text-blue-400 border-blue-500/20 hover:bg-blue-500/20"}`}>
                          {isApiMode ? <><Zap className="w-3 h-3" /> API</> : <><Calculator className="w-3 h-3" /> Pivot</>}
                        </button>
                      </td>
                      <td className="px-6 py-6 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          <button title={c.ltn_sold_out ? "Mark LTN Available" : "Mark LTN Sold Out"} onClick={() => quickToggle(c, "ltn_sold_out")} className={`px-2 py-1.5 rounded-lg text-[8px] font-black border uppercase transition-all ${c.ltn_sold_out ? "bg-red-500/20 text-red-400 border-red-500/30" : "bg-slate-800 text-slate-500 border-slate-700 hover:border-red-500/30 hover:text-red-400"}`}>{c.ltn_sold_out ? "LTN 🔴" : "LTN ✓"}</button>
                          <button title={c.lhr_sold_out ? "Mark LHR Available" : "Mark LHR Sold Out"} onClick={() => quickToggle(c, "lhr_sold_out")} className={`px-2 py-1.5 rounded-lg text-[8px] font-black border uppercase transition-all ${c.lhr_sold_out ? "bg-red-500/20 text-red-400 border-red-500/30" : "bg-slate-800 text-slate-500 border-slate-700 hover:border-red-500/30 hover:text-red-400"}`}>{c.lhr_sold_out ? "LHR 🔴" : "LHR ✓"}</button>
                        </div>
                      </td>
                      <td className="px-6 py-6 text-center">
                        <div className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-black border ${(c.price_modifier || 1) === 1 ? "border-slate-700 bg-slate-800 text-slate-400" : c.price_modifier < 1 ? "border-emerald-500/20 bg-emerald-500/10 text-emerald-400" : "border-rose-500/20 bg-rose-500/10 text-rose-400"}`}>
                          <Zap className="w-3.5 h-3.5" />{(c.price_modifier || 1) === 1 ? "BASE" : `${c.price_modifier > 1 ? "+" : ""}${Math.round(((c.price_modifier || 1) - 1) * 100)}%`}
                        </div>
                      </td>
                      <td className="px-6 py-6 text-right">
                        {c.operates_at_luton ? <span className="font-black text-white text-base tracking-tighter">{isApiMode && c.api_token ? <span className="text-emerald-400 text-[10px] font-black uppercase tracking-widest">LIVE</span> : `£${Number(c.luton_price || 0).toFixed(2)}`}</span> : <span className="text-slate-600 text-xs">—</span>}
                      </td>
                      <td className="px-6 py-6 text-right">
                        <div className="flex items-center justify-end gap-1.5 opacity-30 group-hover:opacity-100 transition-all">
                          <button onClick={() => openEditModal(c)} className="p-2.5 bg-[#1A2235] text-slate-300 hover:bg-blue-600 hover:text-white rounded-lg border border-slate-700 hover:border-transparent transition-all active:scale-95" title="Configure"><Settings2 className="w-4 h-4" /></button>
                          <button onClick={() => duplicateCompany(c)} className="p-2.5 bg-[#1A2235] text-slate-500 hover:bg-indigo-600 hover:text-white rounded-lg border border-slate-700 hover:border-transparent transition-all active:scale-95" title="Duplicate"><Copy className="w-4 h-4" /></button>
                          <button onClick={() => handleDelete(c.id, c.name)} className="p-2.5 bg-[#1A2235] text-slate-500 hover:bg-red-500 hover:text-white rounded-lg border border-slate-700 hover:border-transparent transition-all active:scale-95" title="Delete"><Trash2 className="w-4 h-4" /></button>
                        </div>
                      </td>
                    </tr>
                    {isApiMode && c.api_token && (
                      <tr className="bg-[#0A101D]/40"><RowApiChecker company={c} markupPercent={markupPercent} /></tr>
                    )}
                  </React.Fragment>
                )})}
              </tbody>
            </table>
          </div>
        </div>
        )}
      </main>

      <div className="md:hidden fixed bottom-0 left-0 right-0 z-[100] px-4 pb-6 pt-2 bg-gradient-to-t from-[#0B1120] via-[#0B1120]/95 to-transparent pointer-events-none">
        <nav className="max-w-md mx-auto bg-slate-900/95 backdrop-blur-3xl border border-white/10 rounded-[2.5rem] h-20 flex items-center justify-around px-5 shadow-2xl pointer-events-auto">
          <Link href="/admin" className="flex flex-col items-center gap-1 text-slate-500 hover:text-slate-300 transition-colors"><LayoutDashboard className="w-6 h-6" /><span className="text-[9px] font-bold uppercase">Live</span></Link>
          <Link href="/admin/companies" className="flex flex-col items-center gap-1 text-blue-500 scale-110"><Building2 className="w-6 h-6" /><span className="text-[9px] font-bold uppercase">Ops</span></Link>
          <div className="relative -top-8"><button onClick={() => { setModalTab("general"); setShowAddModal(true); }} className="w-16 h-16 bg-blue-600 rounded-2xl flex items-center justify-center shadow-lg shadow-blue-500/30 border-4 border-[#0B1120] active:scale-95 transition-transform"><Plus className="w-8 h-8 text-white" /></button></div>
          <Link href="/admin/financials" className="flex flex-col items-center gap-1 text-slate-500 hover:text-slate-300 transition-colors"><PiggyBank className="w-6 h-6" /><span className="text-[9px] font-bold uppercase">Money</span></Link>
          <button onClick={handleLogout} className="flex flex-col items-center gap-1 text-slate-500 hover:text-red-400 transition-colors"><LogOut className="w-6 h-6" /><span className="text-[9px] font-bold uppercase">Exit</span></button>
        </nav>
      </div>

      {(editingCompany || showAddModal) && (
        <div className="fixed inset-0 bg-[#0B1120]/95 backdrop-blur-sm z-[300] flex items-center justify-center p-4 sm:p-8 overflow-hidden">
          <div className="bg-[#0F1523] border border-slate-800 w-full max-w-5xl rounded-[2rem] max-h-[95vh] flex flex-col shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="pt-8 px-8 border-b border-slate-800 bg-[#131A2B] shrink-0 relative overflow-hidden">
              <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-600 to-indigo-600" />
              <div className="flex justify-between items-start mb-6">
                <div>
                  <div className="flex items-center gap-3">
                    <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight">{editingCompany ? "Configure Partner" : "Onboard Partner"}</h2>
                    {hasUnsavedChanges && <span className="flex items-center gap-1.5 px-2.5 py-1 bg-amber-500/10 border border-amber-500/30 rounded-lg text-[9px] font-black uppercase tracking-widest text-amber-400"><AlertCircle className="w-3 h-3" /> Unsaved</span>}
                  </div>
                  {editingCompany && <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1 flex items-center gap-1.5"><Settings2 className="w-3.5 h-3.5 text-blue-500" /> ID: {editingCompany.id?.substring(0, 8)}<CopyButton text={editingCompany.id} /></p>}
                </div>
                <button onClick={closeModal} className="p-3 bg-[#1A2235] rounded-xl text-slate-400 hover:text-white hover:bg-red-500/20 transition-colors border border-slate-700/50"><X className="w-5 h-5" /></button>
              </div>
              {editingCompany && <CompanyQuickStats company={editingCompany} />}
              <div className="flex gap-8 overflow-x-auto pb-px">
                {[
                  { key: "general", label: "General Info", Icon: Settings2 },
                  { key: "ltn", label: "Luton Ops", Icon: Car },
                  { key: "lhr", label: "Heathrow Ops", Icon: PlaneTakeoff },
                  { key: "terminals", label: "LHR Terminals", Icon: MapPin },
                  ...(editingCompany ? [{ key: "financials", label: "Invoices & Ledgers", Icon: FileText }] : []),
                ].map(({ key, label, Icon }) => (
                  <button key={key} onClick={() => setModalTab(key as any)} className={`pb-4 text-[10px] font-black uppercase tracking-widest border-b-2 transition-colors whitespace-nowrap flex items-center gap-2 ${modalTab === key ? key === "financials" ? "border-emerald-500 text-emerald-400" : "border-blue-500 text-blue-400" : "border-transparent text-slate-500 hover:text-slate-300"}`}><Icon className="w-3.5 h-3.5" /> {label}</button>
                ))}
              </div>
            </div>

            <div className="flex-1 overflow-y-auto">
              {modalTab !== "financials" ? (
                <form onSubmit={editingCompany ? handleUpdateCompany : handleAddCompany} autoComplete="off" className="h-full flex flex-col">
                  <div className="flex-1 overflow-y-auto p-8">

                    {modalTab === "general" && (
                      <div className="space-y-8 text-white">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                          <div className="space-y-2">
                            <label className={labelCls}>Brand Name</label>
                            <input required type="text" autoComplete="off" value={getField(editingCompany, newCompany, "name") || ""} onChange={e => setField(editingCompany, setEditingCompany, newCompany, setNewCompany, "name", e.target.value)} className={inputCls} />
                          </div>
                          <div className="space-y-2">
                            <label className={labelCls}><Network className="w-3.5 h-3.5 inline mr-1 text-emerald-500" /> Live API Token (Optional)</label>
                            <TokenInput value={getField(editingCompany, newCompany, "api_token") || ""} onChange={v => setField(editingCompany, setEditingCompany, newCompany, setNewCompany, "api_token", v)} inputCls={inputCls} />
                            <p className="text-[10px] text-slate-500 font-bold">Used only when Pricing Source is set to Live API.</p>
                          </div>
                        </div>

                        <PricingModeToggle value={getField(editingCompany, newCompany, "pricing_mode") || "api"} onChange={(v) => setField(editingCompany, setEditingCompany, newCompany, setNewCompany, "pricing_mode", v)} hasToken={!!getField(editingCompany, newCompany, "api_token")} />

                        <div className="bg-[#1A2235] p-6 rounded-2xl border border-slate-700/50">
                          <h3 className="text-sm font-black text-white mb-2 flex items-center gap-2"><Zap className="w-4 h-4 text-amber-400" /> Custom Price Modifier</h3>
                          <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mb-4">Per-operator multiplier applied on top of any price source.</p>
                          <div className="flex flex-wrap gap-2">
                            {[0.7, 0.8, 0.9, 1.0, 1.1, 1.2, 1.3].map(v => (
                              <button key={v} type="button" onClick={() => setField(editingCompany, setEditingCompany, newCompany, setNewCompany, "price_modifier", v)} className={`px-4 py-2 rounded-xl text-xs font-black transition-all border ${(getField(editingCompany, newCompany, "price_modifier") || 1.0) === v ? "bg-blue-600 text-white border-blue-500 shadow-[0_0_15px_rgba(37,99,235,0.4)]" : "bg-[#0F1523] text-slate-400 border-slate-700/50 hover:border-slate-500 hover:text-white"}`}>{v === 1 ? "BASE (0%)" : `${v > 1 ? "+" : ""}${Math.round((v - 1) * 100)}%`}</button>
                            ))}
                          </div>
                        </div>

                        {(getField(editingCompany, newCompany, "pricing_mode") || "api") === "api" && getField(editingCompany, newCompany, "api_token") && (
                          <ApiDiagnosticPanel token={getField(editingCompany, newCompany, "api_token") || ""} company={editingCompany || newCompany} markupPercent={markupPercent} />
                        )}

                        {getField(editingCompany, newCompany, "pricing_mode") === "pivot" && <PricePreviewCalc company={editingCompany || newCompany} markupPercent={markupPercent} />}

                        <div className="bg-[#1A2235] p-6 rounded-2xl border border-slate-700/50">
                          <h3 className="text-sm font-black text-white mb-4">Manage Badges</h3>
                          <div className="flex gap-2 mb-4">
                            <input id="new-badge-label" className={inputCls} placeholder="e.g. £10 FEE EXCLUDED" />
                            <select id="new-badge-cat" className="bg-[#0F1523] border border-slate-700 text-white rounded-xl px-4 text-xs font-bold outline-none shrink-0"><option value="General">General</option><option value="meet-greet">Meet &amp; Greet</option><option value="park-ride">Park &amp; Ride</option><option value="hotel">Hotel</option></select>
                            <button type="button" onClick={() => { const label = (document.getElementById("new-badge-label") as HTMLInputElement).value; const category = (document.getElementById("new-badge-cat") as HTMLSelectElement).value; handleAddBadge(label, category); (document.getElementById("new-badge-label") as HTMLInputElement).value = ""; }} className="bg-blue-600 px-6 rounded-xl text-white font-black hover:bg-blue-500 transition-colors shrink-0">+</button>
                          </div>
                          <div className="flex flex-wrap gap-2">
                            {(getField(editingCompany, newCompany, "badges") || []).map((b: any, i: number) => (
                              <div key={i} className="flex items-center gap-2 bg-blue-600 px-3 py-1.5 rounded-lg text-[10px] font-bold text-white uppercase">{b.label}<span className="opacity-50 text-[8px]">({b.category})</span><button type="button" onClick={() => handleRemoveBadge(i)} className="hover:text-red-300 ml-1">×</button></div>
                            ))}
                          </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                          <div className="space-y-2">
                            <label className={labelCls}>Service Category</label>
                            <div className="relative">
                              <select value={getField(editingCompany, newCompany, "category") || ""} onChange={e => setField(editingCompany, setEditingCompany, newCompany, setNewCompany, "category", e.target.value)} className={filterSelectCls}><option value="meet-greet">Meet &amp; Greet</option><option value="park-ride">Park &amp; Ride</option><option value="hotel">Hotel Parking</option></select>
                              <ChevronDown className="absolute right-5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 pointer-events-none" />
                            </div>
                          </div>
                          <div className="space-y-2">
                            <label className={labelCls}><ImageIcon className="w-3 h-3 inline mr-1 text-blue-500" /> Logo URL</label>
                            <input type="text" autoComplete="off" placeholder="https://..." value={getField(editingCompany, newCompany, "logo_url") || ""} onChange={e => setField(editingCompany, setEditingCompany, newCompany, setNewCompany, "logo_url", e.target.value)} className={inputCls} />
                            {getField(editingCompany, newCompany, "logo_url") && <div className="mt-2 flex items-center gap-3"><CompanyLogo logoUrl={getField(editingCompany, newCompany, "logo_url")} name={getField(editingCompany, newCompany, "name") || "?"} /><p className="text-[10px] text-slate-500 font-bold">Logo preview</p></div>}
                          </div>
                          <div className="space-y-2">
                            <label className={labelCls}><Percent className="w-3 h-3 inline mr-1 text-emerald-500" /> Commission Cut (%)</label>
                            <input required type="number" step="0.1" min="0" max="100" value={getField(editingCompany, newCompany, "commission_rate") || 0} onChange={e => setField(editingCompany, setEditingCompany, newCompany, setNewCompany, "commission_rate", parseFloat(e.target.value) || 0)} className={`${inputCls} !text-xl !text-emerald-400 [-webkit-text-fill-color:#34d399]`} />
                            <div className="mt-2 h-1 bg-slate-800 rounded-full overflow-hidden"><div className="h-full bg-gradient-to-r from-emerald-500 to-blue-500 rounded-full transition-all" style={{ width: `${Math.min(getField(editingCompany, newCompany, "commission_rate") || 0, 100)}%` }} /></div>
                          </div>
                          <div className="space-y-2">
                            <label className={labelCls}><Zap className="w-3 h-3 inline mr-1 text-amber-500" /> Dynamic Surcharge (%)</label>
                            <input type="number" step="0.5" min="0" value={getField(editingCompany, newCompany, "dynamic_surcharge_percent") || 0} onChange={e => setField(editingCompany, setEditingCompany, newCompany, setNewCompany, "dynamic_surcharge_percent", parseFloat(e.target.value) || 0)} className={`${inputCls} !text-xl !text-amber-400 [-webkit-text-fill-color:#fbbf24]`} />
                            <p className="text-[10px] text-slate-500 font-bold mt-1 leading-relaxed">Adds a % on top of the API base price to separate providers with same token. e.g. APD = 4% above base.</p>
                          </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 border-t border-slate-800/80">
                          <div className="space-y-2">
                            <label className={labelCls}><Phone className="w-3.5 h-3.5 inline mr-1 text-amber-500" /> Dispatch Phone 1</label>
                            <input type="text" autoComplete="off" placeholder="07700..." value={getField(editingCompany, newCompany, "phone_number") || ""} onChange={e => setField(editingCompany, setEditingCompany, newCompany, setNewCompany, "phone_number", e.target.value)} className={inputCls} />
                          </div>
                          <div className="space-y-2">
                            <label className={labelCls}><Phone className="w-3.5 h-3.5 inline mr-1 text-amber-500" /> Dispatch Phone 2 (Optional)</label>
                            <input type="text" autoComplete="off" placeholder="07700..." value={getField(editingCompany, newCompany, "phone_number_2") || ""} onChange={e => setField(editingCompany, setEditingCompany, newCompany, setNewCompany, "phone_number_2", e.target.value)} className={inputCls} />
                          </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-4 border-t border-slate-800/80">
                          <div className="space-y-2 md:col-span-2">
                            <label className={labelCls}><MapPin className="w-3.5 h-3.5 inline mr-1 text-emerald-500" /> Physical Address</label>
                            <input type="text" autoComplete="off" value={getField(editingCompany, newCompany, "address") || ""} onChange={e => setField(editingCompany, setEditingCompany, newCompany, setNewCompany, "address", e.target.value)} className={inputCls} />
                          </div>
                          <div className="space-y-2">
                            <label className={labelCls}>Postcode</label>
                            <input type="text" autoComplete="off" value={getField(editingCompany, newCompany, "postcode") || ""} onChange={e => setField(editingCompany, setEditingCompany, newCompany, setNewCompany, "postcode", e.target.value)} className={inputCls} />
                          </div>
                        </div>
                        <div className="space-y-2">
                          <label className={labelCls}><MapPin className="w-3.5 h-3.5 inline mr-1 text-emerald-500" /> Google Map Embed URL</label>
                          <input type="text" autoComplete="off" placeholder="http://..." value={getField(editingCompany, newCompany, "map_url") || ""} onChange={e => setField(editingCompany, setEditingCompany, newCompany, setNewCompany, "map_url", e.target.value)} className={inputCls} />
                        </div>
                        <div className="space-y-2 pt-4 border-t border-slate-800">
                          <label className={labelCls}><Code2 className="w-3.5 h-3.5 inline mr-1 text-blue-500" /> Marketing Overview (HTML Support)</label>
                          <textarea rows={4} value={getField(editingCompany, newCompany, "overview") || ""} onChange={e => setField(editingCompany, setEditingCompany, newCompany, setNewCompany, "overview", e.target.value)} className={textareaCls} placeholder="Highlight key selling points..." />
                          <p className="text-[10px] text-blue-500 font-bold uppercase tracking-widest">Use &lt;br/&gt; for line breaks, &lt;b&gt;text&lt;/b&gt; for bold.</p>
                        </div>
                      </div>
                    )}

                    {modalTab === "terminals" && (
                      <div className="space-y-6 text-white">
                        <div className="bg-[#131A2B] p-6 rounded-2xl border border-slate-800 mb-4"><h3 className="text-lg font-black text-white mb-2">Heathrow Terminal Maps &amp; Addresses</h3><p className="text-xs text-slate-400">Injected into customer confirmation emails based on terminal selected at checkout.</p></div>
                        {(["T2", "T3", "T4", "T5"] as const).map(term => {
                          const tData = getField(editingCompany, newCompany, "terminal_data")?.[term] || defaultCompany.terminal_data[term];
                          return (
                            <div key={term} className="bg-[#131A2B] p-6 rounded-2xl border border-slate-800">
                              <h4 className="text-blue-400 font-black mb-4 flex items-center gap-2"><MapPin className="w-4 h-4" /> {term} Details</h4>
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="space-y-2"><label className={labelCls}>Meeting Address</label><input type="text" className={inputCls} value={tData?.address || ""} onChange={e => updateTerminalField(term, "address", e.target.value)} /></div>
                                <div className="space-y-2"><label className={labelCls}>Postcode</label><input type="text" className={inputCls} value={tData?.postcode || ""} onChange={e => updateTerminalField(term, "postcode", e.target.value)} /></div>
                                <div className="space-y-2 md:col-span-2"><label className={labelCls}>Google Maps Link (For Emails)</label><input type="text" className={inputCls} value={tData?.map_url || ""} onChange={e => updateTerminalField(term, "map_url", e.target.value)} /></div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}

                    {modalTab === "ltn" && (
                      <div className="space-y-8 text-white">
                        {(getField(editingCompany, newCompany, "pricing_mode") || "api") === "api" && (
                          <div className="px-5 py-4 bg-emerald-500/5 border border-emerald-500/20 rounded-2xl flex items-center gap-3"><Zap className="w-4 h-4 text-emerald-400 shrink-0" /><p className="text-[11px] font-bold text-emerald-400">This company is in <b>Live API</b> mode — these pivot prices are NOT used. Switch to Pivot mode in General Info to use them.</p></div>
                        )}
                        <div className="bg-[#131A2B] p-6 rounded-2xl border border-slate-800">
                          <label className="flex items-center gap-6 cursor-pointer">
                            <div className="flex-1"><p className="text-white font-black text-lg">Operates at Luton Airport?</p><p className="text-slate-500 text-xs mt-1">Enable to show in LTN search results.</p></div>
                            <input type="checkbox" checked={!!getField(editingCompany, newCompany, "operates_at_luton")} onChange={e => setField(editingCompany, setEditingCompany, newCompany, setNewCompany, "operates_at_luton", e.target.checked)} className="accent-blue-500 w-6 h-6 cursor-pointer" />
                          </label>
                        </div>
                        {getField(editingCompany, newCompany, "operates_at_luton") && (
                          <>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 border-b border-slate-800 pb-8">
                              <div className="space-y-2"><label className={labelCls}>Day 1: Starting Price (£)</label><input type="number" step="0.01" value={getField(editingCompany, newCompany, "luton_price") || 0} onChange={e => setField(editingCompany, setEditingCompany, newCompany, setNewCompany, "luton_price", parseFloat(e.target.value) || 0)} className={`${inputCls} !text-2xl !text-blue-400 [-webkit-text-fill-color:#60a5fa]`} /></div>
                              <div className="flex flex-col gap-3 pt-6">
                                <button type="button" onClick={() => setField(editingCompany, setEditingCompany, newCompany, setNewCompany, "ltn_sold_out", !getField(editingCompany, newCompany, "ltn_sold_out"))} className={`flex-1 py-3 rounded-xl text-[10px] font-black uppercase tracking-[0.2em] border transition-all flex items-center justify-center gap-2 ${getField(editingCompany, newCompany, "ltn_sold_out") ? "bg-red-500/20 text-red-400 border-red-500/30" : "bg-[#1A2235] text-slate-400 border-slate-700/50 hover:border-slate-600"}`}><AlertOctagon className="w-3.5 h-3.5" /> Mark Sold Out</button>
                                <button type="button" onClick={() => setField(editingCompany, setEditingCompany, newCompany, setNewCompany, "ltn_featured", !getField(editingCompany, newCompany, "ltn_featured"))} className={`flex-1 py-3 rounded-xl text-[10px] font-black uppercase tracking-[0.2em] border transition-all flex items-center justify-center gap-2 ${getField(editingCompany, newCompany, "ltn_featured") ? "bg-amber-500/20 text-amber-400 border-amber-500/30" : "bg-[#1A2235] text-slate-400 border-slate-700/50 hover:border-slate-600"}`}><Award className="w-3.5 h-3.5" /> Featured Provider</button>
                              </div>
                            </div>
                            <div className="pt-2">
                              <p className="text-sm font-black text-white mb-1">Pivot Points (Manual Pricing)</p>
                              <p className="text-[10px] text-slate-500 uppercase tracking-widest font-bold mb-5">Exact TOTAL PRICE at specific durations. Engine interpolates between them.</p>
                              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                {[{ label: "Day 2 Total", key: "ltn_day2_price" }, { label: "Day 5 Total", key: "ltn_day5_price" }, { label: "Day 8 Total", key: "ltn_day8_price" }, { label: "Day 11 Total", key: "ltn_day11_price" }, { label: "Day 14 Total", key: "ltn_day14_price" }, { label: "Day 17 Total", key: "ltn_day17_price" }, { label: "Day 22 Total", key: "ltn_day22_price" }, { label: "Day 32 Total", key: "ltn_day32_price" }].map(pivot => (
                                  <div key={pivot.key} className="space-y-2"><label className={labelCls}>{pivot.label} (£)</label><input type="number" step="0.01" value={getField(editingCompany, newCompany, pivot.key) || 0} onChange={e => setField(editingCompany, setEditingCompany, newCompany, setNewCompany, pivot.key, parseFloat(e.target.value) || 0)} className={`${inputCls} !py-3 !text-emerald-400 [-webkit-text-fill-color:#34d399]`} /></div>
                                ))}
                              </div>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-8 border-t border-slate-800">
                              <div className="space-y-2"><label className={labelCls}>Arrival Instructions (HTML)</label><textarea rows={5} value={getField(editingCompany, newCompany, "on_arrival_ltn") || ""} onChange={e => setField(editingCompany, setEditingCompany, newCompany, setNewCompany, "on_arrival_ltn", e.target.value)} className={textareaCls} /></div>
                              <div className="space-y-2"><label className={labelCls}>Return Instructions (HTML)</label><textarea rows={5} value={getField(editingCompany, newCompany, "on_return_ltn") || ""} onChange={e => setField(editingCompany, setEditingCompany, newCompany, setNewCompany, "on_return_ltn", e.target.value)} className={textareaCls} /></div>
                            </div>
                            <ReviewSection airport="ltn" color="blue" reviews={getField(editingCompany, newCompany, "ltn_reviews") || []} onAdd={() => addReview("ltn")} onRemove={idx => removeReview("ltn", idx)} onUpdate={(idx, f, v) => updateReview("ltn", idx, f, v)} />
                          </>
                        )}
                      </div>
                    )}

                    {modalTab === "lhr" && (
                      <div className="space-y-8 text-white">
                        {(getField(editingCompany, newCompany, "pricing_mode") || "api") === "api" && (
                          <div className="px-5 py-4 bg-emerald-500/5 border border-emerald-500/20 rounded-2xl flex items-center gap-3"><Zap className="w-4 h-4 text-emerald-400 shrink-0" /><p className="text-[11px] font-bold text-emerald-400">This company is in <b>Live API</b> mode — these pivot prices are NOT used. Switch to Pivot mode in General Info to use them.</p></div>
                        )}
                        <div className="bg-[#131A2B] p-6 rounded-2xl border border-slate-800">
                          <label className="flex items-center gap-6 cursor-pointer">
                            <div className="flex-1"><p className="text-white font-black text-lg">Operates at Heathrow Airport?</p><p className="text-slate-500 text-xs mt-1">Enable to show in LHR search results.</p></div>
                            <input type="checkbox" checked={!!getField(editingCompany, newCompany, "operates_at_heathrow")} onChange={e => setField(editingCompany, setEditingCompany, newCompany, setNewCompany, "operates_at_heathrow", e.target.checked)} className="accent-purple-500 w-6 h-6 cursor-pointer" />
                          </label>
                        </div>
                        {getField(editingCompany, newCompany, "operates_at_heathrow") && (
                          <>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 border-b border-slate-800 pb-8">
                              <div className="space-y-2"><label className={labelCls}>Day 1: Starting Price (£)</label><input type="number" step="0.01" value={getField(editingCompany, newCompany, "heathrow_price") || 0} onChange={e => setField(editingCompany, setEditingCompany, newCompany, setNewCompany, "heathrow_price", parseFloat(e.target.value) || 0)} className={`${inputCls} !text-2xl !text-purple-400 [-webkit-text-fill-color:#c084fc]`} /></div>
                              <div className="flex flex-col gap-3 pt-6">
                                <button type="button" onClick={() => setField(editingCompany, setEditingCompany, newCompany, setNewCompany, "lhr_sold_out", !getField(editingCompany, newCompany, "lhr_sold_out"))} className={`flex-1 py-3 rounded-xl text-[10px] font-black uppercase tracking-[0.2em] border transition-all flex items-center justify-center gap-2 ${getField(editingCompany, newCompany, "lhr_sold_out") ? "bg-red-500/20 text-red-400 border-red-500/30" : "bg-[#1A2235] text-slate-400 border-slate-700/50 hover:border-slate-600"}`}><AlertOctagon className="w-3.5 h-3.5" /> Mark Sold Out</button>
                                <button type="button" onClick={() => setField(editingCompany, setEditingCompany, newCompany, setNewCompany, "lhr_featured", !getField(editingCompany, newCompany, "lhr_featured"))} className={`flex-1 py-3 rounded-xl text-[10px] font-black uppercase tracking-[0.2em] border transition-all flex items-center justify-center gap-2 ${getField(editingCompany, newCompany, "lhr_featured") ? "bg-amber-500/20 text-amber-400 border-amber-500/30" : "bg-[#1A2235] text-slate-400 border-slate-700/50 hover:border-slate-600"}`}><Award className="w-3.5 h-3.5" /> Featured Provider</button>
                              </div>
                            </div>
                            <div className="pt-2">
                              <p className="text-sm font-black text-white mb-1">Pivot Points</p>
                              <p className="text-[10px] text-slate-500 uppercase tracking-widest font-bold mb-5">Exact TOTAL PRICE at specific durations.</p>
                              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                {[{ label: "Day 2 Total", key: "lhr_day2_price" }, { label: "Day 5 Total", key: "lhr_day5_price" }, { label: "Day 8 Total", key: "lhr_day8_price" }, { label: "Day 11 Total", key: "lhr_day11_price" }, { label: "Day 14 Total", key: "lhr_day14_price" }, { label: "Day 17 Total", key: "lhr_day17_price" }, { label: "Day 22 Total", key: "lhr_day22_price" }, { label: "Day 32 Total", key: "lhr_day32_price" }].map(pivot => (
                                  <div key={pivot.key} className="space-y-2"><label className={labelCls}>{pivot.label} (£)</label><input type="number" step="0.01" value={getField(editingCompany, newCompany, pivot.key) || 0} onChange={e => setField(editingCompany, setEditingCompany, newCompany, setNewCompany, pivot.key, parseFloat(e.target.value) || 0)} className={`${inputCls} !py-3 !text-emerald-400 [-webkit-text-fill-color:#34d399]`} /></div>
                                ))}
                              </div>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-8 border-t border-slate-800">
                              <div className="space-y-2"><label className={labelCls}>Arrival Instructions (HTML)</label><textarea rows={5} value={getField(editingCompany, newCompany, "on_arrival_lhr") || ""} onChange={e => setField(editingCompany, setEditingCompany, newCompany, setNewCompany, "on_arrival_lhr", e.target.value)} className={textareaCls} /></div>
                              <div className="space-y-2"><label className={labelCls}>Return Instructions (HTML)</label><textarea rows={5} value={getField(editingCompany, newCompany, "on_return_lhr") || ""} onChange={e => setField(editingCompany, setEditingCompany, newCompany, setNewCompany, "on_return_lhr", e.target.value)} className={textareaCls} /></div>
                            </div>
                            <ReviewSection airport="lhr" color="purple" reviews={getField(editingCompany, newCompany, "lhr_reviews") || []} onAdd={() => addReview("lhr")} onRemove={idx => removeReview("lhr", idx)} onUpdate={(idx, f, v) => updateReview("lhr", idx, f, v)} />
                          </>
                        )}
                      </div>
                    )}
                  </div>

                  <div className="bg-[#131A2B] p-8 shrink-0 border-t border-slate-800">
                    <div className="flex gap-3">
                      <button type="button" onClick={closeModal} className="px-6 py-4 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl font-black uppercase tracking-[0.2em] text-xs transition-all border border-slate-700">Cancel</button>
                      <button type="submit" disabled={isSaving} className="flex-1 bg-blue-600 hover:bg-blue-500 py-4 rounded-xl font-black uppercase tracking-[0.2em] text-xs text-white shadow-[0_10px_20px_-5px_rgba(37,99,235,0.4)] transition-all active:scale-95 disabled:opacity-50 flex items-center justify-center gap-3">{isSaving ? <><Loader2 className="animate-spin w-4 h-4" /> Syncing Network...</> : <><Save className="w-4 h-4" /> Save &amp; Deploy Partner</>}</button>
                    </div>
                  </div>
                </form>
              ) : (
                <div className="p-8 space-y-8">
                  {fetchingFinancials ? (
                    <div className="py-20 flex flex-col items-center justify-center text-slate-500"><Loader2 className="w-10 h-10 animate-spin mb-4 text-emerald-500" /><p className="font-black text-[10px] uppercase tracking-[0.3em]">Compiling Ledgers...</p></div>
                  ) : (
                    <>
                      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6 bg-emerald-500/10 border border-emerald-500/20 p-8 rounded-3xl">
                        <div><h3 className="text-emerald-400 font-black text-2xl tracking-tight">Partner Accounting</h3><p className="text-emerald-500/70 text-xs font-bold mt-1">{companyBookings.length} completed bookings</p></div>
                        <button onClick={downloadInvoiceCSV} className="w-full sm:w-auto px-6 py-4 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-[10px] font-black uppercase tracking-[0.2em] transition-all flex items-center justify-center gap-2"><Download className="w-4 h-4" /> Export CSV Invoice</button>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                        {[{ label: "Total Gross Collected", value: `£${calcGross().toFixed(2)}`, color: "text-white" }, { label: `Aero Cut (${editingCompany?.commission_rate || 15}%)`, value: `£${calcAeroCut().toFixed(2)}`, color: "text-blue-400" }, { label: "Payout Outstanding", value: `£${calcPayout().toFixed(2)}`, color: "text-emerald-400" }].map(({ label, value, color }) => (
                          <div key={label} className="bg-[#1A2235] p-8 rounded-3xl border border-slate-700/50"><p className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-500 mb-2">{label}</p><p className={`text-3xl font-black tracking-tighter tabular-nums ${color}`}>{value}</p></div>
                        ))}
                      </div>
                      <div className="border border-slate-800 rounded-3xl overflow-hidden bg-[#131A2B]">
                        <div className="p-6 border-b border-slate-800 bg-[#0F1523]"><h4 className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400">Recent Ledger History</h4></div>
                        <div className="overflow-x-auto">
                          <table className="w-full text-left whitespace-nowrap">
                            <thead><tr className="border-b border-slate-800 text-[9px] font-black uppercase tracking-[0.2em] text-slate-500"><th className="px-8 py-5">Reference</th><th className="px-8 py-5">Type</th><th className="px-8 py-5">Gross</th><th className="px-8 py-5">Aero Fee</th><th className="px-8 py-5">Partner Clear</th></tr></thead>
                            <tbody className="divide-y divide-slate-800/50">
                              {companyBookings.slice(0, 15).map((b) => { const gross = Number(b.total_price || 0); const aeroCut = gross * ((editingCompany?.commission_rate || 15) / 100); return (
                                <tr key={b.id} className="hover:bg-white/[0.02]"><td className="px-8 py-4 flex items-center gap-1"><span className="text-xs font-bold text-white">{b.booking_ref}</span><CopyButton text={b.booking_ref} /></td><td className="px-8 py-4 text-[10px] font-black uppercase text-slate-500 tracking-widest">{b.service_type || "Meet & Greet"}</td><td className="px-8 py-4 text-xs font-bold text-slate-400">£{gross.toFixed(2)}</td><td className="px-8 py-4 text-xs font-bold text-blue-400">£{aeroCut.toFixed(2)}</td><td className="px-8 py-4 text-xs font-black text-emerald-400">£{(gross - aeroCut).toFixed(2)}</td></tr>
                              ); })}
                              {companyBookings.length === 0 && <tr><td colSpan={5} className="px-8 py-10 text-center text-slate-500 text-xs font-bold">No completed bookings found.</td></tr>}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    </>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}