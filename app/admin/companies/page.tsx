"use client";

import { logger } from "@/app/lib/logger";
import React, { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { supabase } from "@/app/lib/supabase";
import { recordAdminAction } from "@/app/lib/audit-client";
import { useRouter } from "next/navigation";
import { AdminSidebar, AdminMobileNav } from "@/components/admin/AdminNav";
import {
  Search, Plus, Save, Car, Loader2, X, Trash2, MapPin,
  PlaneTakeoff, Settings2, Building2, Plane, Network, SlidersHorizontal, ArrowUpDown,
  Award, AlertOctagon, FileText, Download, Percent, ArrowUp, ArrowDown, ChevronDown,
  AlertCircle, Phone, Code2, Zap, Eye, EyeOff, Copy,
  Check, CheckCircle2, Calculator, RefreshCw, Info, Image as ImageIcon,
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
  email: "",
  phone_number: "",
  phone_number_2: "",
  map_location: "Terminal Forecourt",
  on_arrival_lhr: "",
  on_arrival_ltn: "",
  on_return_lhr: "",
  on_return_ltn: "",
  ltn_fees_note: "",
  lhr_fees_note: "",
  ltn_fees_amount: 0,
  lhr_fees_amount: 0,
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
          <div key={t.id} className={`pointer-events-auto flex items-center gap-3 px-5 py-4 rounded-2xl border text-fg text-sm font-bold max-w-sm animate-in slide-in-from-right-4 duration-300 ${styles[t.type]}`}>
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
      className="p-1.5 rounded-lg text-fg-4 hover:text-blue-400 hover:bg-blue-500/10 transition-colors">
      {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
    </button>
  );
}

function TokenInput({ value, onChange, inputCls }: { value: string; onChange: (v: string) => void; inputCls: string }) {
  const [show, setShow] = useState(false);
  return (
    <div className="relative">
      <input type={show ? "text" : "password"} autoComplete="off" placeholder="Paste the operator's API token"
        value={value} onChange={(e) => onChange(e.target.value)} className={`${inputCls} pr-20`} />
      <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1">
        <CopyButton text={value} />
        <button type="button" onClick={() => setShow(s => !s)} className="p-1.5 rounded-lg text-fg-4 hover:text-blue-400 hover:bg-blue-500/10 transition-colors">
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
    <div className="bg-panel-3 rounded-2xl border border-fg/[0.12] overflow-hidden">
      <div className="p-5 border-b border-fg/[0.08]">
        <h3 className="text-sm font-semibold text-fg flex items-center gap-2">
          Where prices come from
        </h3>
        <p className="text-xs text-fg-4 mt-1">
          Live prices from the operator&apos;s API, or your own price table in the Luton and Heathrow tabs.
        </p>
      </div>
      <div className="p-5">
        <div className="relative grid grid-cols-2 bg-panel rounded-xl p-1.5 border border-fg/[0.08]">
          <div className={`absolute top-1.5 bottom-1.5 w-[calc(50%-0.375rem)] rounded-lg transition-colors duration-300 ${mode === "api" ? "left-1.5 bg-emerald-600" : "left-[calc(50%+0rem)] bg-blue-600"}`} />
          <button type="button" onClick={() => onChange("api")}
            className={`relative z-10 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-medium transition-colors ${mode === "api" ? "text-white" : "text-fg-3 hover:text-fg-2"}`}>
            <Zap className="w-4 h-4" /> Live API
          </button>
          <button type="button" onClick={() => onChange("pivot")}
            className={`relative z-10 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-medium transition-colors ${mode === "pivot" ? "text-white" : "text-fg-3 hover:text-fg-2"}`}>
            <Calculator className="w-4 h-4" /> Price table
          </button>
        </div>
        <div className="mt-4 text-sm leading-relaxed">
          {mode === "api" ? (
            <p className="text-emerald-400 flex items-start gap-2">
              <Zap className="w-3.5 h-3.5 mt-0.5 shrink-0" />
              Prices come live from the operator&apos;s API. Your price table isn&apos;t used.
            </p>
          ) : (
            <p className="text-blue-400 flex items-start gap-2">
              <Calculator className="w-3.5 h-3.5 mt-0.5 shrink-0" />
              Prices come from your price table in the Luton and Heathrow tabs. The API isn&apos;t called.
            </p>
          )}
        </div>
        {mode === "api" && !hasToken && (
          <div className="mt-3 px-4 py-3 bg-amber-500/5 border border-amber-500/20 rounded-xl flex items-center gap-2">
            <AlertCircle className="w-3.5 h-3.5 text-amber-400 shrink-0" />
            <p className="text-sm text-amber-400">No API token yet. Customers will see &quot;Rate unavailable&quot; until you add one or switch to the price table.</p>
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
    <div className="bg-canvas border border-blue-500/20 rounded-2xl p-5 mt-4">
      <h4 className="text-blue-400 font-semibold text-xs mb-4 flex items-center gap-2">
        <Calculator className="w-4 h-4" /> Price preview
      </h4>
      <div className="flex flex-wrap gap-3 mb-4">
        <div className="flex items-center gap-2">
          <label className="text-xs font-semibold text-fg-4">Days</label>
          <input type="number" min={1} max={32} value={days} onChange={e => setDays(Math.max(1, Math.min(32, parseInt(e.target.value) || 1)))}
            className="w-16 bg-panel-3 border border-fg/[0.12] rounded-lg px-3 py-2 text-sm font-semibold text-fg outline-none focus:border-blue-500 text-center" />
        </div>
        <div className="flex items-center gap-2">
          <label className="text-xs font-semibold text-fg-4">Airport</label>
          <select value={airport} onChange={e => setAirport(e.target.value as "ltn" | "lhr")}
            className="bg-panel-3 border border-fg/[0.12] rounded-lg px-3 py-2 text-sm font-semibold text-fg outline-none focus:border-blue-500">
            <option value="ltn">Luton</option><option value="lhr">Heathrow</option>
          </select>
        </div>
      </div>
      {!hasData ? (
        <p className="text-sm text-fg-4">No price table yet. Add prices in the Luton and Heathrow tabs.</p>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
          {[
            { label: "Table price", value: rawBase, color: "text-fg-2" },
            { label: `After ${surcharge}% surcharge`, value: afterSurcharge, color: "text-amber-400" },
            { label: `After ${modifier}× adjustment`, value: afterModifier, color: "text-blue-400" },
            { label: `Customer pays (+${markupPercent}% markup)`, value: afterMarkup, color: "text-emerald-400", bold: true },
          ].map(({ label, value, color, bold }) => (
            <div key={label} className="bg-panel-2 p-3 rounded-xl border border-fg/[0.08]">
              <p className="text-xs font-semibold text-fg-4 mb-1">{label}</p>
              <p className={`font-semibold tracking-tight ${color} ${bold ? "text-xl" : "text-lg"}`}>£{value.toFixed(2)}</p>
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
      <h4 className="text-emerald-400 font-semibold text-xs mb-2 flex items-center gap-2">
        <Network className="w-4 h-4" /> Test the API
      </h4>
      <p className="text-xs text-fg-3 mb-4">Sends a price request with this token and shows exactly what comes back.</p>
      <div className="flex flex-wrap gap-3 mb-4">
        <div>
          <label className="text-xs font-semibold text-fg-4 block mb-1">Drop-off date</label>
          <input type="date" value={dropDate} onChange={e => setDropDate(e.target.value)} className="bg-panel-3 border border-fg/[0.12] rounded-lg px-3 py-2 text-xs font-bold text-fg outline-none focus:border-emerald-500 " />
        </div>
        <div>
          <label className="text-xs font-semibold text-fg-4 block mb-1">Return date</label>
          <input type="date" value={pickDate} onChange={e => setPickDate(e.target.value)} className="bg-panel-3 border border-fg/[0.12] rounded-lg px-3 py-2 text-xs font-bold text-fg outline-none focus:border-emerald-500 " />
        </div>
        <div className="flex items-end">
          <button type="button" onClick={run} disabled={loading || !token}
            className="flex items-center gap-2 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 disabled:bg-panel-4 disabled:text-fg-4 text-white rounded-lg text-xs font-semibold transition-colors">
            {loading ? <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Testing…</> : <><Zap className="w-3.5 h-3.5" /> Run test</>}
          </button>
        </div>
      </div>
      {!token && <p className="text-sm text-amber-400 flex items-center gap-2"><AlertCircle className="w-3.5 h-3.5" /> Add a token above to run the test.</p>}
      {result && (
        <div className="space-y-3 mt-3">
          <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold border ${result.ok ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" : "bg-red-500/10 text-red-400 border-red-500/20"}`}>
            {result.ok ? <CheckCircle2 className="w-3.5 h-3.5" /> : <AlertCircle className="w-3.5 h-3.5" />}
            HTTP {result.status} · {result.ok ? "Worked" : "Failed"}<span className="text-fg-4 font-bold">· {dropDate} → {pickDate}</span>
          </div>
          {rawApiPrice != null && (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {[
                { label: "API price", value: rawApiPrice, color: "text-fg-2" },
                { label: `+${surcharge}% surcharge`, value: rawApiPrice * (1 + surcharge / 100), color: "text-amber-400" },
                { label: `×${modifier} adjustment`, value: rawApiPrice * (1 + surcharge / 100) * modifier, color: "text-blue-400" },
                { label: `Customer pays (+${markupPercent}%)`, value: finalPrice!, color: "text-emerald-400", bold: true },
              ].map(({ label, value, color, bold }) => (
                <div key={label} className="bg-canvas border border-fg/[0.08] rounded-xl p-3">
                  <p className="text-xs font-semibold text-fg-4 mb-1">{label}</p>
                  <p className={`font-semibold tracking-tight ${color} ${bold ? "text-xl" : "text-sm"}`}>£{value.toFixed(2)}</p>
                </div>
              ))}
            </div>
          )}
          <details>
            <summary className="text-xs font-semibold text-fg-4 cursor-pointer hover:text-fg-2 transition-colors flex items-center gap-1.5">
              <ChevronDown className="w-3.5 h-3.5" /> Full API response
            </summary>
            <pre className="mt-2 p-4 bg-canvas border border-fg/[0.08] rounded-xl text-xs font-mono text-fg-2 overflow-x-auto max-h-48 whitespace-pre-wrap">
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
    { label: "Luton reviews", value: company.ltn_reviews?.length || 0, sub: ltnAvg ? `★ ${ltnAvg}` : "No reviews", color: "text-blue-400" },
    { label: "Heathrow reviews", value: company.lhr_reviews?.length || 0, sub: lhrAvg ? `★ ${lhrAvg}` : "No reviews", color: "text-purple-400" },
    { label: "Pricing", value: (company.pricing_mode === "pivot" ? "PIVOT" : "API"), sub: company.pricing_mode === "pivot" ? "manual" : "live", color: company.pricing_mode === "pivot" ? "text-blue-400" : "text-emerald-400" },
    { label: "Commission", value: `${company.commission_rate || 15}%`, sub: "cut rate", color: "text-emerald-400" },
  ];
  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
      {stats.map(s => (
        <div key={s.label} className="bg-canvas border border-fg/[0.08] rounded-xl p-4 text-center">
          <p className="text-xs font-semibold text-fg-4 mb-1">{s.label}</p>
          <p className={`text-2xl font-semibold tracking-tight ${s.color}`}>{s.value}</p>
          <p className="text-xs text-fg-4 mt-0.5">{s.sub}</p>
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
      <div className="border-t border-fg/[0.08]">
        <button type="button" onClick={() => setOpen(o => !o)}
          className="w-full flex items-center gap-2 px-8 py-2.5 text-xs font-semibold text-emerald-500/70 hover:text-emerald-400 hover:bg-emerald-500/5 transition-colors">
          <Network className="w-3 h-3" /> Check Live API Rate
          <ChevronDown className={`w-3 h-3 ml-auto transition-transform duration-200 ${open ? "rotate-180" : ""}`} />
        </button>
        {open && (
          <div className="px-8 pb-6 pt-3 bg-canvas/60 border-t border-emerald-500/10 animate-in fade-in duration-200">
            <div className="flex flex-wrap items-end gap-3 mb-4">
              <div>
                <label className="text-xs font-semibold text-fg-4 block mb-1">Drop-off</label>
                <input type="date" value={dropDate} onChange={e => setDropDate(e.target.value)} className="bg-panel-3 border border-fg/[0.12] rounded-lg px-3 py-2 text-xs font-bold text-fg outline-none focus:border-emerald-500 " />
              </div>
              <div>
                <label className="text-xs font-semibold text-fg-4 block mb-1">Return</label>
                <input type="date" value={pickDate} min={dropDate} onChange={e => setPickDate(e.target.value)} className="bg-panel-3 border border-fg/[0.12] rounded-lg px-3 py-2 text-xs font-bold text-fg outline-none focus:border-emerald-500 " />
              </div>
              <button type="button" onClick={run} disabled={loading}
                className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:bg-panel-4 disabled:text-fg-4 text-white rounded-lg text-xs font-semibold transition-colors">
                {loading ? <><Loader2 className="w-3 h-3 animate-spin" /> Testing…</> : <><Zap className="w-3 h-3" /> Ping</>}
              </button>
            </div>
            {result && (
              <div className="space-y-3">
                <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold border ${result.ok ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" : "bg-red-500/10 text-red-400 border-red-500/20"}`}>
                  {result.ok ? <CheckCircle2 className="w-3 h-3" /> : <AlertCircle className="w-3 h-3" />}
                  HTTP {result.status} · {result.ok ? "OK" : "Failed"}<span className="text-fg-4 font-bold ml-1">{dropDate} → {pickDate}</span>
                </div>
                {rawApiPrice != null ? (
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    {[
                      { label: "API price", value: rawApiPrice, color: "text-fg-2" },
                      { label: `+${surcharge}% surcharge`, value: rawApiPrice * (1 + surcharge / 100), color: "text-amber-400" },
                      { label: `×${modifier} adjustment`, value: rawApiPrice * (1 + surcharge / 100) * modifier, color: "text-blue-400" },
                      { label: `+${markupPercent}% → Final`, value: finalPrice!, color: "text-emerald-400", bold: true },
                    ].map(({ label, value, color, bold }) => (
                      <div key={label} className="bg-panel border border-fg/[0.08] rounded-xl p-3">
                        <p className="text-xs font-semibold text-fg-4 mb-1">{label}</p>
                        <p className={`font-semibold tracking-tight ${color} ${bold ? "text-lg" : "text-sm"}`}>£{value.toFixed(2)}</p>
                      </div>
                    ))}
                  </div>
                ) : result.ok ? <p className="text-xs text-amber-400 font-bold">No price found in the reply. Check the full response below.</p> : null}
                <details>
                  <summary className="text-xs font-semibold text-fg-4 cursor-pointer hover:text-fg-3 transition-colors flex items-center gap-1.5">
                    <ChevronDown className="w-3 h-3" /> Raw Response
                  </summary>
                  <pre className="mt-2 p-3 bg-canvas border border-fg/[0.08] rounded-xl text-xs font-mono text-fg-2 overflow-x-auto max-h-36 whitespace-pre-wrap">
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
    return <img src={logoUrl} alt={name} className="w-11 h-11 rounded-xl object-contain bg-white p-1.5 border border-fg/[0.12] shrink-0" onError={() => setImgError(true)} />;
  }
  return (
    <div className="w-11 h-11 rounded-xl bg-panel-3 border border-fg/[0.12] flex items-center justify-center font-semibold text-lg text-fg-3 shrink-0 group-hover:text-blue-500 group-hover:border-blue-500/50 transition-colors">
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
  const inputCls = `w-full bg-panel-3 text-fg rounded-xl px-4 py-3 text-sm font-bold border border-fg/[0.12] outline-none focus:ring-2 ${ring} transition-colors placeholder:text-fg-4 [-webkit-text-fill-color:rgb(var(--admin-fg))] caret-current`;
  return (
    <div className="pt-8 border-t border-fg/[0.08] mt-6">
      <div className="flex justify-between items-center mb-6">
        <h3 className="text-fg font-semibold text-xl">{airport.toUpperCase()} Reviews <span className="text-fg-4 ml-2">({reviews.length})</span></h3>
        <button type="button" onClick={onAdd} className={`px-5 py-3 ${accent} text-fg rounded-xl text-xs font-semibold transition-colors`}>+ Add review</button>
      </div>
      <div className="space-y-6">
        {reviews.map((rev, idx) => (
          <div key={rev.id} className="bg-panel p-6 rounded-2xl border border-fg/[0.12] relative">
            <button type="button" onClick={() => onRemove(idx)} className="absolute top-6 right-6 p-2 text-fg-4 hover:text-red-500 hover:bg-red-500/10 rounded-lg transition-colors"><Trash2 className="w-4 h-4" /></button>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-4 pr-10">
              <div className="space-y-1"><label className="text-xs font-semibold text-fg-4 block ml-1">Author</label><input value={rev.author || ""} onChange={e => onUpdate(idx, "author", e.target.value)} className={inputCls} /></div>
              <div className="space-y-1"><label className="text-xs font-semibold text-fg-4 block ml-1">Rating</label><div className="relative"><select value={rev.rating || 5} onChange={e => onUpdate(idx, "rating", parseInt(e.target.value) || 5)} className={`${inputCls} appearance-none cursor-pointer !text-amber-400 [-webkit-text-fill-color:currentColor]`}>{[5, 4, 3, 2, 1].map(n => <option key={n} value={n}>{n} Stars</option>)}</select><ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-fg-4 pointer-events-none" /></div></div>
              <div className="space-y-1"><label className="text-xs font-semibold text-fg-4 block ml-1">Source</label><div className="relative"><select value={rev.source || "Trustpilot"} onChange={e => onUpdate(idx, "source", e.target.value)} className={`${inputCls} appearance-none cursor-pointer`}><option value="Trustpilot">Trustpilot</option><option value="Google">Google</option><option value="Internal">Internal</option></select><ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-fg-4 pointer-events-none" /></div></div>
              <div className="space-y-1"><label className="text-xs font-semibold text-fg-4 block ml-1">Date</label><input type="date" value={rev.date || ""} onChange={e => onUpdate(idx, "date", e.target.value)} className={`${inputCls} cursor-pointer `} /></div>
            </div>
            <div className="space-y-1 mb-4"><label className="text-xs font-semibold text-fg-4 block ml-1">Comment</label><textarea value={rev.comment || ""} onChange={e => onUpdate(idx, "comment", e.target.value)} className={`${inputCls} resize-none leading-relaxed`} rows={3} /></div>
            <label className="flex items-center gap-2 cursor-pointer w-fit group"><input type="checkbox" checked={!!rev.verified} onChange={e => onUpdate(idx, "verified", e.target.checked)} className="w-4 h-4 rounded border-fg/[0.12] bg-panel-3 accent-emerald-500 cursor-pointer" /><span className="text-xs font-bold text-fg-3 group-hover:text-emerald-400 transition-colors">Verified booking</span></label>
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
    if (error) { logger.error("fetchCompanies:", error); showToast("Failed to load partners", "error"); }
    setLoading(false);
  }

  async function fetchFinancials(companyId: string) {
    setFetchingFinancials(true); setCompanyBookings([]);
    const { data, error } = await supabase.from("bookings").select("*").eq("company_id", companyId).neq("status", "cancelled").order("created_at", { ascending: false });
    if (data) setCompanyBookings(data);
    if (error) logger.error("fetchFinancials:", error);
    setFetchingFinancials(false);
  }

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
      recordAdminAction({
        actionType: "company.create",
        entityType: "company",
        metadata: { label: newCompany.name, after: "onboarded" },
      });
      doClose(); setNewCompany({ ...defaultCompany });
      await fetchCompanies();
      showToast(`${newCompany.name} onboarded successfully!`, "success");
    } catch (error: any) { showToast("Error adding partner: " + error.message, "error"); } finally { setIsSaving(false); }
  };

  const handleUpdateCompany = async (e: React.FormEvent) => {
    e.preventDefault(); setIsSaving(true);
    try {
      const prevCompany: any = originalEditingRef.current;
      const { error } = await supabase.from("companies").update(editingCompany).eq("id", editingCompany.id);
      if (error) throw error;

      // Audit: capture what changed on this company (surcharge / modifier /
      // badges are the high-value pricing & display fields).
      const surBefore = Number(prevCompany?.dynamic_surcharge_percent ?? 0);
      const surAfter = Number(editingCompany.dynamic_surcharge_percent ?? 0);
      const badgesChanged =
        JSON.stringify(prevCompany?.badges ?? []) !== JSON.stringify(editingCompany.badges ?? []);
      const surchargeChanged = surBefore !== surAfter;
      if (surchargeChanged || badgesChanged) {
        recordAdminAction({
          actionType: surchargeChanged ? "pricing.surcharge.update" : "company.badges.update",
          entityType: "company",
          entityId: editingCompany.id,
          metadata: {
            label: editingCompany.name,
            before: surchargeChanged ? `${surBefore}% surcharge` : `${(prevCompany?.badges ?? []).length} badges`,
            after: surchargeChanged ? `${surAfter}% surcharge` : `${(editingCompany.badges ?? []).length} badges`,
            badgesChanged,
          },
        });
      } else {
        recordAdminAction({
          actionType: "company.update",
          entityType: "company",
          entityId: editingCompany.id,
          metadata: { label: editingCompany.name },
        });
      }

      originalEditingRef.current = JSON.parse(JSON.stringify(editingCompany));
      setHasUnsavedChanges(false);
      await fetchCompanies();
      showToast(`${editingCompany.name} saved successfully!`, "success");
      // Saved, so close outright: closeModal() would read this render's stale
      // hasUnsavedChanges (still true) and ask to discard what was just saved.
      doClose();
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
          recordAdminAction({
            actionType: "pricing.master_modifier.update",
            entityType: "company",
            metadata: { label: "ALL operators", after: `${val}x modifier` },
          });
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
      recordAdminAction({
        actionType: `company.${field}.toggle`,
        entityType: "company",
        entityId: company.id,
        metadata: {
          label: `${company.name} · ${field.replace(/_/g, " ")}`,
          before: company[field] ? "on" : "off",
          after: newVal ? "on" : "off",
        },
      });
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
    } else {
      showToast(`${company.name} → ${newMode === "api" ? "live API prices" : "price table"}`, "success");
      recordAdminAction({
        actionType: "company.pricing_mode.toggle",
        entityType: "company",
        entityId: company.id,
        metadata: { label: company.name, before: current, after: newMode },
      });
    }
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
      title: "Delete operator",
      body: `Permanently delete "${name}"? This removes the operator and can't be undone.`,
      confirmLabel: "Delete operator",
      danger: true,
      onConfirm: async () => {
        try {
          const { error } = await supabase.from("companies").delete().eq("id", id);
          if (error) throw error;
          recordAdminAction({
            actionType: "company.delete",
            entityType: "company",
            entityId: id,
            metadata: { label: name, before: "active partner", after: "deleted" },
          });
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
      recordAdminAction({
        actionType: "company.duplicate",
        entityType: "company",
        entityId: company.id,
        metadata: { label: company.name, after: `${company.name} (Copy) created (inactive)` },
      });
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
      <div className="min-h-screen bg-canvas flex flex-col items-center justify-center text-fg">
        <Plane className="w-10 h-10 text-blue-500 animate-pulse rotate-45" />
        <p className="font-semibold text-fg-3 text-xs mt-6">Loading operators…</p>
      </div>
    );
  }

  const inputCls = "w-full bg-panel-3 text-fg border border-fg/[0.12] hover:border-fg/25 rounded-lg px-3.5 py-2.5 text-base md:text-sm outline-none focus:ring-2 focus:ring-blue-500/50 transition-colors placeholder:text-fg-4 [-webkit-text-fill-color:rgb(var(--admin-fg))] caret-current [&:-webkit-autofill]:[-webkit-text-fill-color:rgb(var(--admin-fg))] [&:-webkit-autofill]:[transition:background-color_9999s_ease-in-out_0s] [&:-webkit-autofill]:[box-shadow:0_0_0px_1000px_rgb(var(--admin-panel-3))_inset!important]";
  const labelCls = "text-sm font-medium text-fg-2 block mb-2";
  const filterSelectCls = "w-full appearance-none bg-panel text-fg-2 border border-fg/[0.08] hover:border-fg/15 rounded-lg py-2.5 pl-9 pr-8 text-sm outline-none cursor-pointer transition-colors focus:ring-1 focus:ring-blue-500/40";
  const textareaCls = "w-full bg-panel-3 text-fg border border-fg/[0.12] hover:border-fg/25 rounded-lg px-3.5 py-2.5 text-base md:text-sm outline-none focus:ring-2 focus:ring-blue-500/50 transition-colors placeholder:text-fg-4 leading-relaxed [-webkit-text-fill-color:rgb(var(--admin-fg))] caret-current [&:-webkit-autofill]:[-webkit-text-fill-color:rgb(var(--admin-fg))] [&:-webkit-autofill]:[box-shadow:0_0_0px_1000px_rgb(var(--admin-panel-3))_inset!important]";

  return (
    <div className="dark-ui min-h-screen bg-canvas font-sans flex flex-col md:flex-row overflow-hidden text-fg selection:bg-blue-600/30 selection:text-white antialiased relative">
      <ToastContainer toasts={toasts} onDismiss={dismissToast} />


      {confirmState && (
        <div className="fixed inset-0 bg-[#060A14]/90 z-[400] flex items-center justify-center p-4">
          <div className="bg-panel border border-fg/[0.08] w-full max-w-md rounded-xl overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-7">
              <div className="flex items-start gap-4">
                <div className={`w-11 h-11 shrink-0 rounded-xl flex items-center justify-center border ${confirmState.danger ? "bg-red-500/10 border-red-500/20 text-red-400" : "bg-blue-500/10 border-blue-500/20 text-blue-400"}`}>
                  <AlertCircle className="w-6 h-6" />
                </div>
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-fg tracking-tight">{confirmState.title}</h3>
                  <p className="text-sm font-medium text-fg-3 mt-1.5 leading-relaxed">{confirmState.body}</p>
                </div>
              </div>
            </div>
            <div className="px-7 py-5 bg-panel-2 border-t border-fg/[0.08] flex gap-3 justify-end">
              <button onClick={() => setConfirmState(null)} className="px-5 py-3 text-fg-3 font-bold text-xs hover:text-fg transition-colors">Cancel</button>
              <button
                onClick={() => { const fn = confirmState.onConfirm; setConfirmState(null); fn(); }}
                className={`px-6 py-3 rounded-xl font-semibold text-xs text-white transition-colors ${confirmState.danger ? "bg-red-600 hover:bg-red-500" : "bg-blue-600 hover:bg-blue-500"}`}
              >
                {confirmState.confirmLabel}
              </button>
            </div>
          </div>
        </div>
      )}

      <AdminSidebar />

      <main className="flex-1 p-4 md:p-8 lg:p-12 w-full overflow-y-auto h-screen relative pb-32 md:pb-12 z-10">
        {/* HEADER + STATS */}
        <div className="mb-6 rounded-xl border border-fg/[0.08] bg-panel overflow-hidden">
          <div className="p-5 md:p-6 flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-fg/[0.08]">
            <div>
              <h1 className="text-2xl font-semibold text-fg">Operators</h1>
              <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-2 text-sm text-fg-3">
                <span>{filteredAndSortedCompanies.length} of {totalPartners} shown</span>
                {needsAttentionCount > 0 && (
                  <button type="button" onClick={() => setOnlyIssues((v) => !v)} aria-pressed={onlyIssues} className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-sm border transition-colors ${onlyIssues ? "bg-amber-500 text-white border-amber-500" : "bg-amber-500/10 text-amber-400 border-amber-500/30 hover:bg-amber-500/20"}`}>
                    <AlertOctagon className="w-3.5 h-3.5" aria-hidden="true" /> {needsAttentionCount} need{needsAttentionCount === 1 ? "s" : ""} attention
                  </button>
                )}
              </div>
            </div>
            <div className="grid grid-cols-2 sm:flex gap-2 shrink-0">
              <button type="button" onClick={runApiHealth} disabled={healthChecking} className="px-4 py-2.5 bg-fg/[0.04] hover:bg-fg/[0.08] border border-fg/10 text-fg-2 rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-2 disabled:opacity-50">
                {healthChecking ? <Loader2 className="w-4 h-4 animate-spin" /> : <Network className="w-4 h-4" />} Check APIs
              </button>
              <button type="button" onClick={() => { setModalTab("general"); setShowAddModal(true); }} className="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-2">
                <Plus className="w-4 h-4" /> Add operator
              </button>
            </div>
          </div>

          <div className="grid grid-cols-2 lg:grid-cols-4 divide-x divide-fg/[0.08]">
            {[
              { label: "Operators", value: totalPartners, sub: "in total", Icon: Network, color: "#3b82f6" },
              { label: "Live at Luton", value: ltnCoverage, sub: "taking bookings", Icon: Car, color: "#10b981" },
              { label: "Live at Heathrow", value: lhrCoverage, sub: "taking bookings", Icon: PlaneTakeoff, color: "#6366f1" },
              { label: "Priced by API", value: apiCount, sub: "live prices", Icon: Zap, color: "#f59e0b" },
            ].map((s, i) => (
              <div key={i} className="p-4 md:p-5 border-t border-fg/[0.08] lg:border-t-0">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-sm text-fg-3">{s.label}</p>
                  <s.Icon className="w-3.5 h-3.5" style={{ color: s.color }} aria-hidden="true" />
                </div>
                <p className="text-xl md:text-2xl font-semibold text-fg tabular-nums">{s.value}</p>
                <p className="text-xs text-fg-4 mt-1 truncate">{s.sub}</p>
              </div>
            ))}
          </div>
        </div>

        {/* PRICE ADJUSTMENT FOR EVERY OPERATOR */}
        <div className="rounded-xl border border-fg/[0.08] bg-panel p-5 mb-6 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <h2 className="text-base font-semibold text-fg">Adjust all prices</h2>
            <p className="text-sm text-fg-3 mt-0.5">Sets the same price adjustment on every operator. You&apos;ll be asked to confirm.</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {[0.7, 0.8, 0.9, 1.0, 1.1, 1.2, 1.3].map(v => (
              <button key={v} type="button" onClick={() => masterUpdate(v)} className={`min-w-[3.5rem] px-3 py-2 rounded-lg text-sm font-medium tabular-nums transition-colors border ${v === 1 ? "bg-panel-3 text-fg border-fg/[0.12] hover:bg-panel-4" : v < 1 ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20 hover:bg-emerald-500/20" : "bg-rose-500/10 text-rose-400 border-rose-500/20 hover:bg-rose-500/20"}`}>{v === 1 ? "Normal" : `${v > 1 ? "+" : "−"}${Math.abs(Math.round((v - 1) * 100))}%`}</button>
            ))}
            <button type="button" onClick={fetchCompanies} title="Refresh" aria-label="Refresh" className="p-2 border border-fg/[0.12] rounded-lg text-fg-3 hover:text-fg hover:bg-fg/[0.06] transition-colors"><RefreshCw className="w-4 h-4" /></button>
          </div>
        </div>

        <div className="mb-5 flex flex-col xl:flex-row gap-2.5">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-fg-4 z-10 pointer-events-none" />
            <input type="text" autoComplete="off" placeholder="Search operators" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="w-full bg-panel text-fg border border-fg/[0.08] hover:border-fg/15 rounded-lg py-2.5 pl-10 pr-10 text-base md:text-sm outline-none focus:ring-2 focus:ring-blue-500/50 transition-colors placeholder:text-fg-4 [-webkit-text-fill-color:rgb(var(--admin-fg))] caret-current" />
            {searchTerm && <button onClick={() => setSearchTerm("")} className="absolute right-4 top-1/2 -translate-y-1/2 p-1 rounded-md hover:bg-panel-4 transition-colors"><X className="w-4 h-4 text-fg-3" /></button>}
          </div>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-2.5 w-full xl:w-auto shrink-0">
            <div className="relative">
              <SlidersHorizontal className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-fg-4 z-10 pointer-events-none" />
              <select value={categoryFilter} onChange={e => setCategoryFilter(e.target.value)} className={`${filterSelectCls} ${categoryFilter !== "ALL" ? "text-blue-400" : ""}`}><option value="ALL">All services</option><option value="meet-greet">Meet &amp; Greet</option><option value="park-ride">Park &amp; Ride</option><option value="hotel">Hotel Parking</option></select>
              <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-fg-4 pointer-events-none" />
            </div>
            <div className="relative">
              <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-fg-4 z-10 pointer-events-none" />
              <select value={airportFilter} onChange={e => setAirportFilter(e.target.value)} className={`${filterSelectCls} ${airportFilter !== "ALL" ? "text-blue-400" : ""}`}><option value="ALL">All airports</option><option value="LTN">Luton (LTN)</option><option value="LHR">Heathrow (LHR)</option></select>
              <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-fg-4 pointer-events-none" />
            </div>
            <div className="relative">
              <AlertCircle className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-fg-4 z-10 pointer-events-none" />
              <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className={`${filterSelectCls} ${statusFilter !== "ALL" ? "text-blue-400" : ""}`}><option value="ALL">Any status</option><option value="ACTIVE">Active only</option><option value="OFFLINE">Offline</option></select>
              <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-fg-4 pointer-events-none" />
            </div>
            <div className="relative">
              <Network className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-fg-4 z-10 pointer-events-none" />
              <select value={apiFilter} onChange={e => setApiFilter(e.target.value)} className={`${filterSelectCls} ${apiFilter !== "ALL" ? "text-amber-400" : ""}`}><option value="ALL">All pricing</option><option value="API">Live API prices</option><option value="MANUAL">Price table</option></select>
              <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-fg-4 pointer-events-none" />
            </div>
            {activeFilterCount > 0 ? (
              <button onClick={() => { setCategoryFilter("ALL"); setAirportFilter("ALL"); setStatusFilter("ALL"); setApiFilter("ALL"); setSearchTerm(""); }} className="flex items-center justify-center gap-1.5 w-full border border-fg/10 text-fg-2 hover:text-red-400 rounded-lg py-2.5 text-sm transition-colors"><X className="w-4 h-4" /> Clear filters</button>
            ) : (
              <div className="hidden md:block" />
            )}
          </div>
        </div>

        {/* VIEW TOGGLE + SORT */}
        <div className="flex items-center justify-between gap-3 mb-5 px-1">
          <div role="group" aria-label="View" className="flex items-center bg-fg/[0.05] rounded-lg p-1">
            <button onClick={() => setViewMode("cards")} className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors flex items-center gap-1.5 ${viewMode === "cards" ? "bg-blue-600 text-white" : "text-fg-3 hover:text-fg"}`}><Building2 className="w-3.5 h-3.5" /> Cards</button>
            <button onClick={() => setViewMode("table")} className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors flex items-center gap-1.5 ${viewMode === "table" ? "bg-blue-600 text-white" : "text-fg-3 hover:text-fg"}`}><SlidersHorizontal className="w-3.5 h-3.5" /> Table</button>
          </div>
          <div className="relative">
            <ArrowUpDown className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-fg-4 z-10 pointer-events-none" />
            <select
              value={`${sortBy}:${sortOrder}`}
              onChange={(e) => { const [f, o] = e.target.value.split(":"); setSortBy(f); setSortOrder(o as "asc" | "desc"); }}
              className="appearance-none bg-panel border border-fg/[0.08] hover:border-fg/15 rounded-lg py-2 pl-9 pr-8 text-sm text-fg-2 outline-none cursor-pointer transition-colors focus:ring-2 focus:ring-blue-500/40"
            >
              <option value="name:asc" className="bg-panel-3">Sort: Name A–Z</option>
              <option value="name:desc" className="bg-panel-3">Sort: Name Z–A</option>
              <option value="luton_price:desc" className="bg-panel-3">Sort: Luton price, highest</option>
              <option value="luton_price:asc" className="bg-panel-3">Sort: Luton price, lowest</option>
              <option value="commission_rate:desc" className="bg-panel-3">Sort: Commission, highest</option>
              <option value="commission_rate:asc" className="bg-panel-3">Sort: Commission, lowest</option>
            </select>
            <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-fg-4 pointer-events-none" />
          </div>
        </div>

        {/* 🟢 CARD GRID VIEW */}
        {viewMode === "cards" && (
          filteredAndSortedCompanies.length === 0 ? (
            <div className="bg-panel rounded-xl border border-fg/[0.08] py-20 flex flex-col items-center justify-center px-6 text-center mb-24">
              <Search className="w-6 h-6 text-fg-4 mb-3" />
              <p className="text-base font-medium text-fg-2">No operators match</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 2xl:grid-cols-3 gap-5 mb-24">
              {filteredAndSortedCompanies.map((c) => {
                const isApiMode = c.pricing_mode !== "pivot";
                const issues = companyHealth(c);
                const health = apiHealth[c.id];
                return (
                  <div key={c.id} onClick={() => openEditModal(c)}
                    className={`group bg-panel rounded-xl border border-fg/[0.08] hover:border-blue-500/40 transition-colors duration-300 cursor-pointer relative overflow-hidden flex flex-col ${!c.is_active ? "opacity-60" : ""}`}>

                    {/* HEAD */}
                    <div className="p-5 flex items-start gap-4">
                      <CompanyLogo logoUrl={c.logo_url} name={c.name} />
                      <div className="min-w-0 flex-1">
                        <h3 className="text-base font-semibold text-fg truncate group-hover:text-blue-400 transition-colors">{c.name}</h3>
                        <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                          <span className="text-xs font-semibold text-blue-400 bg-blue-500/10 px-2 py-0.5 rounded border border-blue-500/20">{c.category?.replace("-", " ")}</span>
                          {issues.length > 0 && (
                            <span title={issues.join(", ")} className="text-xs font-semibold text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20 flex items-center gap-1"><AlertOctagon className="w-2.5 h-2.5" /> {issues.length}</span>
                          )}
                        </div>
                      </div>
                      <button onClick={(e) => { e.stopPropagation(); quickToggle(c, "is_active"); }} className={`shrink-0 px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors ${c.is_active ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20 hover:bg-emerald-500/20" : "bg-red-500/10 text-red-400 border-red-500/20 hover:bg-red-500/20"}`}>{c.is_active ? "Active" : "Offline"}</button>
                    </div>

                    {/* BODY */}
                    <div className="px-5 pb-4 space-y-3 flex-1" onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center gap-2 flex-wrap">
                        <button onClick={() => togglePricingMode(c)} title={isApiMode ? "Switch to the price table" : "Switch to live API prices"} className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors ${isApiMode ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20 hover:bg-emerald-500/20" : "bg-blue-500/10 text-blue-400 border-blue-500/20 hover:bg-blue-500/20"}`}>{isApiMode ? <><Zap className="w-3 h-3" /> Live API</> : <><Calculator className="w-3 h-3" /> Price table</>}</button>
                        <div className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border ${(c.price_modifier || 1) === 1 ? "border-fg/[0.12] bg-panel-3 text-fg-3" : c.price_modifier < 1 ? "border-emerald-500/20 bg-emerald-500/10 text-emerald-400" : "border-rose-500/20 bg-rose-500/10 text-rose-400"}`}><Zap className="w-3 h-3" />{(c.price_modifier || 1) === 1 ? "Normal price" : `${c.price_modifier > 1 ? "+" : ""}${Math.round(((c.price_modifier || 1) - 1) * 100)}%`}</div>
                        <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border border-fg/[0.12] bg-panel-3 text-fg-2"><Percent className="w-3 h-3" />{c.commission_rate || 15}% commission</div>
                      </div>

                      <div className="grid grid-cols-2 gap-2.5">
                        <div className="bg-panel-2 border border-fg/[0.08] rounded-lg px-3 py-2.5">
                          <p className="text-xs font-semibold text-emerald-400 flex items-center gap-1"><Car className="w-3 h-3" /> Luton</p>
                          <p className="text-sm font-semibold text-fg mt-1">{c.operates_at_luton ? (isApiMode && c.api_token ? <span className="text-emerald-400 text-xs">Live price</span> : `£${Number(c.luton_price || 0).toFixed(2)}`) : <span className="text-fg-4">—</span>}{c.ltn_sold_out && <span className="text-red-400 text-xs ml-1.5">Sold out</span>}</p>
                          <p className="text-xs text-fg-4 mt-0.5">{c.operates_at_luton ? `★ ${getAvgRating(c.ltn_reviews)} · ${c.ltn_reviews?.length || 0} reviews` : "Not offered"}</p>
                        </div>
                        <div className="bg-panel-2 border border-fg/[0.08] rounded-lg px-3 py-2.5">
                          <p className="text-xs font-semibold text-indigo-400 flex items-center gap-1"><PlaneTakeoff className="w-3 h-3" /> Heathrow</p>
                          <p className="text-sm font-semibold text-fg mt-1">{c.operates_at_heathrow ? (isApiMode && c.api_token ? <span className="text-emerald-400 text-xs">Live price</span> : `£${Number(c.heathrow_price || 0).toFixed(2)}`) : <span className="text-fg-4">—</span>}{c.lhr_sold_out && <span className="text-red-400 text-xs ml-1.5">Sold out</span>}</p>
                          <p className="text-xs text-fg-4 mt-0.5">{c.operates_at_heathrow ? `★ ${getAvgRating(c.lhr_reviews)} · ${c.lhr_reviews?.length || 0} reviews` : "Not offered"}</p>
                        </div>
                      </div>

                      {isApiMode && c.api_token && health && (
                        <div className={`flex items-center gap-2 px-3 py-2 rounded-xl border text-xs font-semibold ${health.ok && health.price != null ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" : "bg-red-500/10 text-red-400 border-red-500/20"}`}>
                          {health.ok && health.price != null ? <CheckCircle2 className="w-3.5 h-3.5" /> : <AlertCircle className="w-3.5 h-3.5" />}
                          {health.ok && health.price != null ? `API working · £${Number(health.price).toFixed(2)}` : `API not responding (${health.status ? `HTTP ${health.status}` : "no reply"})`}
                        </div>
                      )}
                    </div>

                    {/* FOOTER */}
                    <div className="px-4 py-3 border-t border-fg/[0.08] bg-panel-2 flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
                      <button onClick={() => quickToggle(c, "ltn_sold_out")} title={c.ltn_sold_out ? "Luton is marked sold out. Tap to reopen." : "Tap to mark Luton sold out"} className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold border transition-colors ${c.ltn_sold_out ? "bg-red-500/20 text-red-400 border-red-500/30" : "bg-panel-3 text-fg-4 border-fg/[0.12] hover:border-red-500/30 hover:text-red-400"}`}>{c.ltn_sold_out ? "LTN sold out" : "LTN open"}</button>
                      <button onClick={() => quickToggle(c, "lhr_sold_out")} title={c.lhr_sold_out ? "Heathrow is marked sold out. Tap to reopen." : "Tap to mark Heathrow sold out"} className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold border transition-colors ${c.lhr_sold_out ? "bg-red-500/20 text-red-400 border-red-500/30" : "bg-panel-3 text-fg-4 border-fg/[0.12] hover:border-red-500/30 hover:text-red-400"}`}>{c.lhr_sold_out ? "LHR sold out" : "LHR open"}</button>
                      <div className="flex-1"></div>
                      <button onClick={() => openEditModal(c)} className="p-2 bg-panel-3 text-fg-2 hover:bg-blue-600 hover:text-white rounded-lg border border-fg/[0.12] hover:border-transparent transition-colors" title="Edit" aria-label="Edit"><Settings2 className="w-4 h-4" /></button>
                      <button onClick={() => duplicateCompany(c)} className="p-2 bg-panel-3 text-fg-3 hover:bg-indigo-600 hover:text-white rounded-lg border border-fg/[0.12] hover:border-transparent transition-colors" title="Duplicate" aria-label="Duplicate"><Copy className="w-4 h-4" /></button>
                      <button onClick={() => handleDelete(c.id, c.name)} className="p-2 bg-panel-3 text-fg-3 hover:bg-red-500 hover:text-white rounded-lg border border-fg/[0.12] hover:border-transparent transition-colors" title="Delete" aria-label="Delete"><Trash2 className="w-4 h-4" /></button>
                    </div>
                  </div>
                );
              })}
            </div>
          )
        )}

        {/* 🟢 TABLE VIEW */}
        {viewMode === "table" && (
        <div className="bg-panel rounded-xl border border-fg/[0.08] overflow-hidden mb-24">
          <div className="overflow-x-auto min-h-[400px]">
            <table className="w-full text-left whitespace-nowrap">
              <thead className="bg-panel border-b border-fg/[0.08]">
                <tr className="text-xs font-medium text-fg-3">
                  <th className="px-5 py-3.5 cursor-pointer hover:text-fg" onClick={() => toggleSort("name")}>Operator <SortIcon field="name" sortBy={sortBy} sortOrder={sortOrder} /></th>
                  <th className="px-4 py-3.5 text-center">Status</th>
                  <th className="px-4 py-3.5 text-center">Pricing</th>
                  <th className="px-4 py-3.5 text-center">Availability</th>
                  <th className="px-4 py-3.5 text-center">Price adjustment</th>
                  <th className="px-4 py-3.5 text-right cursor-pointer hover:text-fg" onClick={() => toggleSort("luton_price")}>LTN <SortIcon field="luton_price" sortBy={sortBy} sortOrder={sortOrder} /></th>
                  <th className="px-4 py-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-fg/[0.08]">
                {filteredAndSortedCompanies.length === 0 ? (
                  <tr><td colSpan={7} className="py-32 text-center"><div className="flex flex-col items-center justify-center opacity-40"><Search className="w-12 h-12 text-fg-4 mb-4" /><p className="text-xl font-semibold text-fg">No operators match</p></div></td></tr>
                ) : filteredAndSortedCompanies.map(c => {
                  const isApiMode = c.pricing_mode !== "pivot";
                  return (
                  <React.Fragment key={c.id}>
                    <tr className={`transition-colors group hover:bg-fg/[0.045] ${!c.is_active ? "opacity-50 grayscale" : ""}`}>
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-4">
                          <CompanyLogo logoUrl={c.logo_url} name={c.name} />
                          <div>
                            <p className="font-semibold text-fg text-sm group-hover:text-blue-400 transition-colors">{c.name}</p>
                            <div className="flex items-center gap-2 mt-1 flex-wrap">
                              <span className="text-xs font-semibold text-blue-400 bg-blue-500/10 px-2 py-0.5 rounded border border-blue-500/20">{c.category?.replace("-", " ")}</span>
                            </div>
                            <div className="flex items-center gap-3 text-xs font-bold text-fg-3 mt-1.5">
                              {c.operates_at_luton && <span className={c.ltn_featured ? "text-amber-400" : ""}><Car className="w-3 h-3 inline mr-0.5" /> {getAvgRating(c.ltn_reviews)}</span>}
                              {c.operates_at_heathrow && <span className={c.lhr_featured ? "text-amber-400" : ""}><PlaneTakeoff className="w-3 h-3 inline mr-0.5" /> {getAvgRating(c.lhr_reviews)}</span>}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3.5 text-center">
                        <button onClick={() => quickToggle(c, "is_active")} className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors ${c.is_active ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20 hover:bg-emerald-500/20" : "bg-red-500/10 text-red-400 border-red-500/20 hover:bg-red-500/20"}`}>{c.is_active ? "Active" : "Offline"}</button>
                      </td>
                      <td className="px-4 py-3.5 text-center">
                        <button onClick={() => togglePricingMode(c)} title={isApiMode ? "Switch to the price table" : "Switch to live API prices"} className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors ${isApiMode ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20 hover:bg-emerald-500/20" : "bg-blue-500/10 text-blue-400 border-blue-500/20 hover:bg-blue-500/20"}`}>
                          {isApiMode ? <><Zap className="w-3 h-3" /> Live API</> : <><Calculator className="w-3 h-3" /> Price table</>}
                        </button>
                      </td>
                      <td className="px-4 py-3.5 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          <button title={c.ltn_sold_out ? "Luton is marked sold out. Tap to reopen." : "Tap to mark Luton sold out"} onClick={() => quickToggle(c, "ltn_sold_out")} className={`px-2 py-1.5 rounded-lg text-xs font-semibold border transition-colors ${c.ltn_sold_out ? "bg-red-500/20 text-red-400 border-red-500/30" : "bg-panel-3 text-fg-4 border-fg/[0.12] hover:border-red-500/30 hover:text-red-400"}`}>{c.ltn_sold_out ? "LTN sold out" : "LTN open"}</button>
                          <button title={c.lhr_sold_out ? "Heathrow is marked sold out. Tap to reopen." : "Tap to mark Heathrow sold out"} onClick={() => quickToggle(c, "lhr_sold_out")} className={`px-2 py-1.5 rounded-lg text-xs font-semibold border transition-colors ${c.lhr_sold_out ? "bg-red-500/20 text-red-400 border-red-500/30" : "bg-panel-3 text-fg-4 border-fg/[0.12] hover:border-red-500/30 hover:text-red-400"}`}>{c.lhr_sold_out ? "LHR sold out" : "LHR open"}</button>
                        </div>
                      </td>
                      <td className="px-4 py-3.5 text-center">
                        <div className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border ${(c.price_modifier || 1) === 1 ? "border-fg/[0.12] bg-panel-3 text-fg-3" : c.price_modifier < 1 ? "border-emerald-500/20 bg-emerald-500/10 text-emerald-400" : "border-rose-500/20 bg-rose-500/10 text-rose-400"}`}>
                          <Zap className="w-3.5 h-3.5" />{(c.price_modifier || 1) === 1 ? "Normal price" : `${c.price_modifier > 1 ? "+" : ""}${Math.round(((c.price_modifier || 1) - 1) * 100)}%`}
                        </div>
                      </td>
                      <td className="px-4 py-3.5 text-right">
                        {c.operates_at_luton ? <span className="font-semibold text-fg text-base tracking-tight">{isApiMode && c.api_token ? <span className="text-emerald-400 text-xs font-semibold">Live price</span> : `£${Number(c.luton_price || 0).toFixed(2)}`}</span> : <span className="text-fg-4 text-xs">—</span>}
                      </td>
                      <td className="px-4 py-3.5 text-right">
                        <div className="flex items-center justify-end gap-1.5 opacity-60 group-hover:opacity-100 transition-opacity">
                          <button onClick={() => openEditModal(c)} className="p-2 bg-panel-3 text-fg-2 hover:bg-blue-600 hover:text-white rounded-lg border border-fg/[0.12] hover:border-transparent transition-colors" title="Edit" aria-label="Edit"><Settings2 className="w-4 h-4" /></button>
                          <button onClick={() => duplicateCompany(c)} className="p-2 bg-panel-3 text-fg-3 hover:bg-indigo-600 hover:text-white rounded-lg border border-fg/[0.12] hover:border-transparent transition-colors" title="Duplicate" aria-label="Duplicate"><Copy className="w-4 h-4" /></button>
                          <button onClick={() => handleDelete(c.id, c.name)} className="p-2 bg-panel-3 text-fg-3 hover:bg-red-500 hover:text-white rounded-lg border border-fg/[0.12] hover:border-transparent transition-colors" title="Delete" aria-label="Delete"><Trash2 className="w-4 h-4" /></button>
                        </div>
                      </td>
                    </tr>
                    {isApiMode && c.api_token && (
                      <tr className="bg-canvas/40"><RowApiChecker company={c} markupPercent={markupPercent} /></tr>
                    )}
                  </React.Fragment>
                )})}
              </tbody>
            </table>
          </div>
        </div>
        )}
      </main>

      <AdminMobileNav action={{ label: "Add operator", Icon: Plus, onClick: () => { setModalTab("general"); setShowAddModal(true); } }} />

      {(editingCompany || showAddModal) && (
        <div className="fixed inset-0 bg-[#060A14]/80 z-[300] flex items-center justify-center p-0 sm:p-8 overflow-hidden">
          <div className="bg-panel sm:border border-fg/[0.08] w-full max-w-5xl h-full sm:h-auto sm:rounded-xl sm:max-h-[95vh] flex flex-col overflow-hidden">
            <div className="pt-[calc(env(safe-area-inset-top)+16px)] sm:pt-6 px-5 sm:px-8 border-b border-fg/[0.08] bg-panel-2 shrink-0">
              <div className="flex justify-between items-start mb-6">
                <div>
                  <div className="flex items-center gap-3">
                    <h2 className="text-xl font-semibold text-fg">{editingCompany ? (editingCompany.name || "Edit operator") : "Add operator"}</h2>
                    {hasUnsavedChanges && <span className="flex items-center gap-1.5 px-2.5 py-1 bg-amber-500/10 border border-amber-500/30 rounded-lg text-xs font-semibold text-amber-400"><AlertCircle className="w-3 h-3" /> Unsaved changes</span>}
                  </div>
                  {editingCompany && <p className="text-sm text-fg-3 mt-1 flex items-center gap-1.5">ID <span className="font-mono">{editingCompany.id?.substring(0, 8)}</span><CopyButton text={editingCompany.id} /></p>}
                </div>
                <button onClick={closeModal} aria-label="Close" className="p-2 -mr-2 rounded-lg text-fg-3 hover:text-fg hover:bg-fg/[0.06] shrink-0"><X className="w-5 h-5" /></button>
              </div>
              {editingCompany && <CompanyQuickStats company={editingCompany} />}
              <div className="flex gap-6 overflow-x-auto pb-px -mx-1 px-1">
                {[
                  { key: "general", label: "Details", Icon: Settings2 },
                  { key: "ltn", label: "Luton", Icon: Car },
                  { key: "lhr", label: "Heathrow", Icon: PlaneTakeoff },
                  { key: "terminals", label: "Heathrow terminals", Icon: MapPin },
                  ...(editingCompany ? [{ key: "financials", label: "Bookings and payout", Icon: FileText }] : []),
                ].map(({ key, label, Icon }) => (
                  <button key={key} onClick={() => setModalTab(key as any)} className={`pb-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap flex items-center gap-2 ${modalTab === key ? key === "financials" ? "border-emerald-500 text-emerald-400" : "border-blue-500 text-blue-400" : "border-transparent text-fg-4 hover:text-fg-2"}`}><Icon className="w-3.5 h-3.5" /> {label}</button>
                ))}
              </div>
            </div>

            <div className="flex-1 overflow-y-auto">
              {modalTab !== "financials" ? (
                <form onSubmit={editingCompany ? handleUpdateCompany : handleAddCompany} autoComplete="off" className="h-full flex flex-col">
                  <div className="flex-1 overflow-y-auto p-5 sm:p-8">

                    {modalTab === "general" && (
                      <div className="space-y-8 text-fg">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                          <div className="space-y-2">
                            <label className={labelCls}>Operator name</label>
                            <input required type="text" autoComplete="off" value={getField(editingCompany, newCompany, "name") || ""} onChange={e => setField(editingCompany, setEditingCompany, newCompany, setNewCompany, "name", e.target.value)} className={inputCls} />
                          </div>
                          <div className="space-y-2">
                            <label className={labelCls}><Network className="w-3.5 h-3.5 inline mr-1 text-emerald-500" /> API token (optional)</label>
                            <TokenInput value={getField(editingCompany, newCompany, "api_token") || ""} onChange={v => setField(editingCompany, setEditingCompany, newCompany, setNewCompany, "api_token", v)} inputCls={inputCls} />
                            <p className="text-xs text-fg-4">Only used when prices come from the live API.</p>
                          </div>
                        </div>

                        <PricingModeToggle value={getField(editingCompany, newCompany, "pricing_mode") || "api"} onChange={(v) => setField(editingCompany, setEditingCompany, newCompany, setNewCompany, "pricing_mode", v)} hasToken={!!getField(editingCompany, newCompany, "api_token")} />

                        <div className="bg-panel-3 p-6 rounded-2xl border border-fg/[0.12]">
                          <h3 className="text-sm font-semibold text-fg mb-2 flex items-center gap-2"><Zap className="w-4 h-4 text-amber-400" /> Price adjustment</h3>
                          <p className="text-sm text-fg-3 mb-4">Raises or lowers this operator&apos;s prices, whichever price source it uses.</p>
                          <div className="flex flex-wrap gap-2">
                            {[0.7, 0.8, 0.9, 1.0, 1.1, 1.2, 1.3].map(v => (
                              <button key={v} type="button" onClick={() => setField(editingCompany, setEditingCompany, newCompany, setNewCompany, "price_modifier", v)} className={`px-4 py-2 rounded-xl text-xs font-semibold transition-colors border ${(getField(editingCompany, newCompany, "price_modifier") || 1.0) === v ? "bg-blue-600 text-white border-blue-500" : "bg-panel text-fg-3 border-fg/[0.12] hover:border-fg/25 hover:text-fg"}`}>{v === 1 ? "Normal" : `${v > 1 ? "+" : ""}${Math.round((v - 1) * 100)}%`}</button>
                            ))}
                          </div>
                        </div>

                        {(getField(editingCompany, newCompany, "pricing_mode") || "api") === "api" && getField(editingCompany, newCompany, "api_token") && (
                          <ApiDiagnosticPanel token={getField(editingCompany, newCompany, "api_token") || ""} company={editingCompany || newCompany} markupPercent={markupPercent} />
                        )}

                        {getField(editingCompany, newCompany, "pricing_mode") === "pivot" && <PricePreviewCalc company={editingCompany || newCompany} markupPercent={markupPercent} />}

                        <div className="bg-panel-3 p-6 rounded-2xl border border-fg/[0.12]">
                          <h3 className="text-sm font-semibold text-fg mb-4">Badges</h3>
                          <div className="flex gap-2 mb-4">
                            <input id="new-badge-label" className={inputCls} placeholder="e.g. £10 fee not included" />
                            <select id="new-badge-cat" className="bg-panel border border-fg/[0.12] text-fg rounded-xl px-4 text-xs font-bold outline-none shrink-0"><option value="General">General</option><option value="meet-greet">Meet &amp; Greet</option><option value="park-ride">Park &amp; Ride</option><option value="hotel">Hotel</option></select>
                            <button type="button" onClick={() => { const label = (document.getElementById("new-badge-label") as HTMLInputElement).value; const category = (document.getElementById("new-badge-cat") as HTMLSelectElement).value; handleAddBadge(label, category); (document.getElementById("new-badge-label") as HTMLInputElement).value = ""; }} className="bg-blue-600 px-6 rounded-xl text-white font-semibold hover:bg-blue-500 transition-colors shrink-0">+</button>
                          </div>
                          <div className="flex flex-wrap gap-2">
                            {(getField(editingCompany, newCompany, "badges") || []).map((b: any, i: number) => (
                              <div key={i} className="flex items-center gap-2 bg-blue-600 px-3 py-1.5 rounded-lg text-xs font-bold text-white">{b.label}<span className="opacity-50 text-xs">({b.category})</span><button type="button" onClick={() => handleRemoveBadge(i)} className="hover:text-red-300 ml-1">×</button></div>
                            ))}
                          </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                          <div className="space-y-2">
                            <label className={labelCls}>Service</label>
                            <div className="relative">
                              <select value={getField(editingCompany, newCompany, "category") || ""} onChange={e => setField(editingCompany, setEditingCompany, newCompany, setNewCompany, "category", e.target.value)} className={filterSelectCls}><option value="meet-greet">Meet &amp; Greet</option><option value="park-ride">Park &amp; Ride</option><option value="hotel">Hotel Parking</option></select>
                              <ChevronDown className="absolute right-5 top-1/2 -translate-y-1/2 w-4 h-4 text-fg-4 pointer-events-none" />
                            </div>
                          </div>
                          <div className="space-y-2">
                            <label className={labelCls}><ImageIcon className="w-3 h-3 inline mr-1 text-blue-500" /> Logo link</label>
                            <input type="text" autoComplete="off" placeholder="https://..." value={getField(editingCompany, newCompany, "logo_url") || ""} onChange={e => setField(editingCompany, setEditingCompany, newCompany, setNewCompany, "logo_url", e.target.value)} className={inputCls} />
                            {getField(editingCompany, newCompany, "logo_url") && <div className="mt-2 flex items-center gap-3"><CompanyLogo logoUrl={getField(editingCompany, newCompany, "logo_url")} name={getField(editingCompany, newCompany, "name") || "?"} /><p className="text-xs text-fg-4">Logo preview</p></div>}
                          </div>
                          <div className="space-y-2">
                            <label className={labelCls}><Percent className="w-3 h-3 inline mr-1 text-emerald-500" /> Our commission (%)</label>
                            <input required type="number" step="0.1" min="0" max="100" value={getField(editingCompany, newCompany, "commission_rate") || 0} onChange={e => setField(editingCompany, setEditingCompany, newCompany, setNewCompany, "commission_rate", parseFloat(e.target.value) || 0)} className={`${inputCls} !text-xl !text-emerald-400 [-webkit-text-fill-color:currentColor]`} />
                            <div className="mt-2 h-1 bg-panel-3 rounded-full overflow-hidden"><div className="h-full bg-emerald-500 rounded-full transition-colors" style={{ width: `${Math.min(getField(editingCompany, newCompany, "commission_rate") || 0, 100)}%` }} /></div>
                          </div>
                          <div className="space-y-2">
                            <label className={labelCls}><Zap className="w-3 h-3 inline mr-1 text-amber-500" /> Surcharge on API price (%)</label>
                            <input type="number" step="0.5" min="0" value={getField(editingCompany, newCompany, "dynamic_surcharge_percent") || 0} onChange={e => setField(editingCompany, setEditingCompany, newCompany, setNewCompany, "dynamic_surcharge_percent", parseFloat(e.target.value) || 0)} className={`${inputCls} !text-xl !text-amber-400 [-webkit-text-fill-color:currentColor]`} />
                            <p className="text-xs text-fg-4 mt-1 leading-relaxed">Adds this percentage to the API price. Useful when two operators share one API token (for example, APD is 4% above).</p>
                          </div>
                        </div>

                        <div className="grid grid-cols-1 gap-6 pt-4 border-t border-fg/[0.08]">
                          <div className="space-y-2">
                            <label className={labelCls}><Phone className="w-3.5 h-3.5 inline mr-1 text-emerald-500" /> Operator email (receives new bookings)</label>
                            <input type="email" autoComplete="off" placeholder="bookings@provider.co.uk" value={getField(editingCompany, newCompany, "email") || ""} onChange={e => setField(editingCompany, setEditingCompany, newCompany, setNewCompany, "email", e.target.value)} className={inputCls} />
                            <p className="text-xs text-fg-4 leading-relaxed">New booking notifications for this provider are sent here. If left blank, they fall back to info@aeroparkdirect.co.uk.</p>
                          </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 border-t border-fg/[0.08]">
                          <div className="space-y-2">
                            <label className={labelCls}><Phone className="w-3.5 h-3.5 inline mr-1 text-amber-500" /> Phone</label>
                            <input type="text" autoComplete="off" placeholder="07700..." value={getField(editingCompany, newCompany, "phone_number") || ""} onChange={e => setField(editingCompany, setEditingCompany, newCompany, setNewCompany, "phone_number", e.target.value)} className={inputCls} />
                          </div>
                          <div className="space-y-2">
                            <label className={labelCls}><Phone className="w-3.5 h-3.5 inline mr-1 text-amber-500" /> Second phone (optional)</label>
                            <input type="text" autoComplete="off" placeholder="07700..." value={getField(editingCompany, newCompany, "phone_number_2") || ""} onChange={e => setField(editingCompany, setEditingCompany, newCompany, setNewCompany, "phone_number_2", e.target.value)} className={inputCls} />
                          </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-4 border-t border-fg/[0.08]">
                          <div className="space-y-2 md:col-span-2">
                            <label className={labelCls}><MapPin className="w-3.5 h-3.5 inline mr-1 text-emerald-500" /> Address</label>
                            <input type="text" autoComplete="off" value={getField(editingCompany, newCompany, "address") || ""} onChange={e => setField(editingCompany, setEditingCompany, newCompany, setNewCompany, "address", e.target.value)} className={inputCls} />
                          </div>
                          <div className="space-y-2">
                            <label className={labelCls}>Postcode</label>
                            <input type="text" autoComplete="off" value={getField(editingCompany, newCompany, "postcode") || ""} onChange={e => setField(editingCompany, setEditingCompany, newCompany, setNewCompany, "postcode", e.target.value)} className={inputCls} />
                          </div>
                        </div>
                        <div className="space-y-2">
                          <label className={labelCls}><MapPin className="w-3.5 h-3.5 inline mr-1 text-emerald-500" /> Google Maps embed link</label>
                          <input type="text" autoComplete="off" placeholder="https://..." value={getField(editingCompany, newCompany, "map_url") || ""} onChange={e => setField(editingCompany, setEditingCompany, newCompany, setNewCompany, "map_url", e.target.value)} className={inputCls} />
                        </div>
                        <div className="space-y-2 pt-4 border-t border-fg/[0.08]">
                          <label className={labelCls}><Code2 className="w-3.5 h-3.5 inline mr-1 text-blue-500" /> Description for customers (HTML allowed)</label>
                          <textarea rows={4} value={getField(editingCompany, newCompany, "overview") || ""} onChange={e => setField(editingCompany, setEditingCompany, newCompany, setNewCompany, "overview", e.target.value)} className={textareaCls} placeholder="What makes this operator a good choice" />
                          <p className="text-xs text-blue-500 font-bold">Use &lt;br/&gt; for line breaks, &lt;b&gt;text&lt;/b&gt; for bold.</p>
                        </div>
                      </div>
                    )}

                    {modalTab === "terminals" && (
                      <div className="space-y-6 text-fg">
                        <div className="bg-panel-2 p-6 rounded-2xl border border-fg/[0.08] mb-4"><h3 className="text-lg font-semibold text-fg mb-2">Heathrow terminals: meeting points</h3><p className="text-xs text-fg-3">Injected into customer confirmation emails based on terminal selected at checkout.</p></div>
                        {(["T2", "T3", "T4", "T5"] as const).map(term => {
                          const tData = getField(editingCompany, newCompany, "terminal_data")?.[term] || defaultCompany.terminal_data[term];
                          return (
                            <div key={term} className="bg-panel-2 p-6 rounded-2xl border border-fg/[0.08]">
                              <h4 className="text-blue-400 font-semibold mb-4 flex items-center gap-2"><MapPin className="w-4 h-4" /> {term} Details</h4>
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="space-y-2"><label className={labelCls}>Meeting address</label><input type="text" className={inputCls} value={tData?.address || ""} onChange={e => updateTerminalField(term, "address", e.target.value)} /></div>
                                <div className="space-y-2"><label className={labelCls}>Postcode</label><input type="text" className={inputCls} value={tData?.postcode || ""} onChange={e => updateTerminalField(term, "postcode", e.target.value)} /></div>
                                <div className="space-y-2 md:col-span-2"><label className={labelCls}>Google Maps link (used in emails)</label><input type="text" className={inputCls} value={tData?.map_url || ""} onChange={e => updateTerminalField(term, "map_url", e.target.value)} /></div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}

                    {modalTab === "ltn" && (
                      <div className="space-y-8 text-fg">
                        {(getField(editingCompany, newCompany, "pricing_mode") || "api") === "api" && (
                          <div className="px-5 py-4 bg-emerald-500/5 border border-emerald-500/20 rounded-2xl flex items-center gap-3"><Zap className="w-4 h-4 text-emerald-400 shrink-0" /><p className="text-sm text-emerald-400">This operator uses live API prices, so the price table below isn&apos;t used. To use it, choose Price table under Details.</p></div>
                        )}
                        <div className="bg-panel-2 p-6 rounded-2xl border border-fg/[0.08]">
                          <label className="flex items-center gap-6 cursor-pointer">
                            <div className="flex-1"><p className="text-fg font-semibold text-lg">Operates at Luton Airport?</p><p className="text-fg-4 text-xs mt-1">Enable to show in LTN search results.</p></div>
                            <input type="checkbox" checked={!!getField(editingCompany, newCompany, "operates_at_luton")} onChange={e => setField(editingCompany, setEditingCompany, newCompany, setNewCompany, "operates_at_luton", e.target.checked)} className="accent-blue-500 w-6 h-6 cursor-pointer" />
                          </label>
                        </div>
                        {getField(editingCompany, newCompany, "operates_at_luton") && (
                          <>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 border-b border-fg/[0.08] pb-8">
                              <div className="space-y-2"><label className={labelCls}>Day 1 price (£)</label><input type="number" step="0.01" value={getField(editingCompany, newCompany, "luton_price") || 0} onChange={e => setField(editingCompany, setEditingCompany, newCompany, setNewCompany, "luton_price", parseFloat(e.target.value) || 0)} className={`${inputCls} !text-2xl !text-blue-400 [-webkit-text-fill-color:currentColor]`} /></div>
                              <div className="flex flex-col gap-3 pt-6">
                                <button type="button" onClick={() => setField(editingCompany, setEditingCompany, newCompany, setNewCompany, "ltn_sold_out", !getField(editingCompany, newCompany, "ltn_sold_out"))} className={`flex-1 py-3 rounded-xl text-xs font-semibold border transition-colors flex items-center justify-center gap-2 ${getField(editingCompany, newCompany, "ltn_sold_out") ? "bg-red-500/20 text-red-400 border-red-500/30" : "bg-panel-3 text-fg-3 border-fg/[0.12] hover:border-fg/[0.18]"}`}><AlertOctagon className="w-3.5 h-3.5" /> Mark Sold Out</button>
                                <button type="button" onClick={() => setField(editingCompany, setEditingCompany, newCompany, setNewCompany, "ltn_featured", !getField(editingCompany, newCompany, "ltn_featured"))} className={`flex-1 py-3 rounded-xl text-xs font-semibold border transition-colors flex items-center justify-center gap-2 ${getField(editingCompany, newCompany, "ltn_featured") ? "bg-amber-500/20 text-amber-400 border-amber-500/30" : "bg-panel-3 text-fg-3 border-fg/[0.12] hover:border-fg/[0.18]"}`}><Award className="w-3.5 h-3.5" /> Featured Provider</button>
                              </div>
                            </div>
                            <div className="pt-2">
                              <p className="text-sm font-semibold text-fg mb-1">Price table</p>
                              <p className="text-xs text-fg-4 mb-5">The total price for each length of stay. Stays in between are priced proportionally.</p>
                              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                {[{ label: "Day 2 total", key: "ltn_day2_price" }, { label: "Day 5 total", key: "ltn_day5_price" }, { label: "Day 8 total", key: "ltn_day8_price" }, { label: "Day 11 total", key: "ltn_day11_price" }, { label: "Day 14 total", key: "ltn_day14_price" }, { label: "Day 17 total", key: "ltn_day17_price" }, { label: "Day 22 total", key: "ltn_day22_price" }, { label: "Day 32 total", key: "ltn_day32_price" }].map(pivot => (
                                  <div key={pivot.key} className="space-y-2"><label className={labelCls}>{pivot.label} (£)</label><input type="number" step="0.01" value={getField(editingCompany, newCompany, pivot.key) || 0} onChange={e => setField(editingCompany, setEditingCompany, newCompany, setNewCompany, pivot.key, parseFloat(e.target.value) || 0)} className={`${inputCls} !py-3 !text-emerald-400 [-webkit-text-fill-color:currentColor]`} /></div>
                                ))}
                              </div>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-8 border-t border-fg/[0.08]">
                              <div className="space-y-2"><label className={labelCls}>Arrival instructions (HTML)</label><textarea rows={5} value={getField(editingCompany, newCompany, "on_arrival_ltn") || ""} onChange={e => setField(editingCompany, setEditingCompany, newCompany, setNewCompany, "on_arrival_ltn", e.target.value)} className={textareaCls} /></div>
                              <div className="space-y-2"><label className={labelCls}>Return instructions (HTML)</label><textarea rows={5} value={getField(editingCompany, newCompany, "on_return_ltn") || ""} onChange={e => setField(editingCompany, setEditingCompany, newCompany, setNewCompany, "on_return_ltn", e.target.value)} className={textareaCls} /></div>
                            </div>
                            <div className="space-y-2 pt-6 border-t border-fg/[0.08]">
                              <label className={labelCls}>Extra charges note, Luton (shown to customers)</label>
                              <input type="text" value={getField(editingCompany, newCompany, "ltn_fees_note") || ""} onChange={e => setField(editingCompany, setEditingCompany, newCompany, setNewCompany, "ltn_fees_note", e.target.value)} className={inputCls} placeholder="e.g. £10 barrier charge payable on collection" />
                              <p className="text-xs text-fg-4 leading-relaxed">Shown as a notice on the results and checkout. Leave it empty for all-inclusive operators (such as AeroPark Exclusive) so they keep their &ldquo;No hidden fees&rdquo; badge.</p>
                              <label className={`${labelCls} pt-3 block`}>Extra charge amount, Luton (£)</label>
                              <input type="number" step="0.01" min="0" value={getField(editingCompany, newCompany, "ltn_fees_amount") || 0} onChange={e => setField(editingCompany, setEditingCompany, newCompany, setNewCompany, "ltn_fees_amount", parseFloat(e.target.value) || 0)} className={`${inputCls} !text-amber-400`} />
                              <p className="text-xs text-fg-4 leading-relaxed">The £ amount of the charge above. Only used when AeroPark covers the fee (for example, a transferred Exclusive booking): it&apos;s paid to the operator in full, with no commission taken.</p>
                            </div>
                            <ReviewSection airport="ltn" color="blue" reviews={getField(editingCompany, newCompany, "ltn_reviews") || []} onAdd={() => addReview("ltn")} onRemove={idx => removeReview("ltn", idx)} onUpdate={(idx, f, v) => updateReview("ltn", idx, f, v)} />
                          </>
                        )}
                      </div>
                    )}

                    {modalTab === "lhr" && (
                      <div className="space-y-8 text-fg">
                        {(getField(editingCompany, newCompany, "pricing_mode") || "api") === "api" && (
                          <div className="px-5 py-4 bg-emerald-500/5 border border-emerald-500/20 rounded-2xl flex items-center gap-3"><Zap className="w-4 h-4 text-emerald-400 shrink-0" /><p className="text-sm text-emerald-400">This operator uses live API prices, so the price table below isn&apos;t used. To use it, choose Price table under Details.</p></div>
                        )}
                        <div className="bg-panel-2 p-6 rounded-2xl border border-fg/[0.08]">
                          <label className="flex items-center gap-6 cursor-pointer">
                            <div className="flex-1"><p className="text-fg font-semibold text-lg">Operates at Heathrow Airport?</p><p className="text-fg-4 text-xs mt-1">Enable to show in LHR search results.</p></div>
                            <input type="checkbox" checked={!!getField(editingCompany, newCompany, "operates_at_heathrow")} onChange={e => setField(editingCompany, setEditingCompany, newCompany, setNewCompany, "operates_at_heathrow", e.target.checked)} className="accent-purple-500 w-6 h-6 cursor-pointer" />
                          </label>
                        </div>
                        {getField(editingCompany, newCompany, "operates_at_heathrow") && (
                          <>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 border-b border-fg/[0.08] pb-8">
                              <div className="space-y-2"><label className={labelCls}>Day 1 price (£)</label><input type="number" step="0.01" value={getField(editingCompany, newCompany, "heathrow_price") || 0} onChange={e => setField(editingCompany, setEditingCompany, newCompany, setNewCompany, "heathrow_price", parseFloat(e.target.value) || 0)} className={`${inputCls} !text-2xl !text-purple-400 [-webkit-text-fill-color:currentColor]`} /></div>
                              <div className="flex flex-col gap-3 pt-6">
                                <button type="button" onClick={() => setField(editingCompany, setEditingCompany, newCompany, setNewCompany, "lhr_sold_out", !getField(editingCompany, newCompany, "lhr_sold_out"))} className={`flex-1 py-3 rounded-xl text-xs font-semibold border transition-colors flex items-center justify-center gap-2 ${getField(editingCompany, newCompany, "lhr_sold_out") ? "bg-red-500/20 text-red-400 border-red-500/30" : "bg-panel-3 text-fg-3 border-fg/[0.12] hover:border-fg/[0.18]"}`}><AlertOctagon className="w-3.5 h-3.5" /> Mark Sold Out</button>
                                <button type="button" onClick={() => setField(editingCompany, setEditingCompany, newCompany, setNewCompany, "lhr_featured", !getField(editingCompany, newCompany, "lhr_featured"))} className={`flex-1 py-3 rounded-xl text-xs font-semibold border transition-colors flex items-center justify-center gap-2 ${getField(editingCompany, newCompany, "lhr_featured") ? "bg-amber-500/20 text-amber-400 border-amber-500/30" : "bg-panel-3 text-fg-3 border-fg/[0.12] hover:border-fg/[0.18]"}`}><Award className="w-3.5 h-3.5" /> Featured Provider</button>
                              </div>
                            </div>
                            <div className="pt-2">
                              <p className="text-sm font-semibold text-fg mb-1">Price table</p>
                              <p className="text-xs text-fg-4 mb-5">The total price for each length of stay.</p>
                              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                {[{ label: "Day 2 total", key: "lhr_day2_price" }, { label: "Day 5 total", key: "lhr_day5_price" }, { label: "Day 8 total", key: "lhr_day8_price" }, { label: "Day 11 total", key: "lhr_day11_price" }, { label: "Day 14 total", key: "lhr_day14_price" }, { label: "Day 17 total", key: "lhr_day17_price" }, { label: "Day 22 total", key: "lhr_day22_price" }, { label: "Day 32 total", key: "lhr_day32_price" }].map(pivot => (
                                  <div key={pivot.key} className="space-y-2"><label className={labelCls}>{pivot.label} (£)</label><input type="number" step="0.01" value={getField(editingCompany, newCompany, pivot.key) || 0} onChange={e => setField(editingCompany, setEditingCompany, newCompany, setNewCompany, pivot.key, parseFloat(e.target.value) || 0)} className={`${inputCls} !py-3 !text-emerald-400 [-webkit-text-fill-color:currentColor]`} /></div>
                                ))}
                              </div>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-8 border-t border-fg/[0.08]">
                              <div className="space-y-2"><label className={labelCls}>Arrival instructions (HTML)</label><textarea rows={5} value={getField(editingCompany, newCompany, "on_arrival_lhr") || ""} onChange={e => setField(editingCompany, setEditingCompany, newCompany, setNewCompany, "on_arrival_lhr", e.target.value)} className={textareaCls} /></div>
                              <div className="space-y-2"><label className={labelCls}>Return instructions (HTML)</label><textarea rows={5} value={getField(editingCompany, newCompany, "on_return_lhr") || ""} onChange={e => setField(editingCompany, setEditingCompany, newCompany, setNewCompany, "on_return_lhr", e.target.value)} className={textareaCls} /></div>
                            </div>
                            <div className="space-y-2 pt-6 border-t border-fg/[0.08]">
                              <label className={labelCls}>Extra charges note, Heathrow (shown to customers)</label>
                              <input type="text" value={getField(editingCompany, newCompany, "lhr_fees_note") || ""} onChange={e => setField(editingCompany, setEditingCompany, newCompany, setNewCompany, "lhr_fees_note", e.target.value)} className={inputCls} placeholder="e.g. ULEZ / drop-off charge not included" />
                              <p className="text-xs text-fg-4 leading-relaxed">Shown as a notice on the results and checkout. Leave it empty for all-inclusive operators (such as AeroPark Exclusive) so they keep their &ldquo;No hidden fees&rdquo; badge.</p>
                              <label className={`${labelCls} pt-3 block`}>Extra charge amount, Heathrow (£)</label>
                              <input type="number" step="0.01" min="0" value={getField(editingCompany, newCompany, "lhr_fees_amount") || 0} onChange={e => setField(editingCompany, setEditingCompany, newCompany, setNewCompany, "lhr_fees_amount", parseFloat(e.target.value) || 0)} className={`${inputCls} !text-amber-400`} />
                              <p className="text-xs text-fg-4 leading-relaxed">The £ amount of the charge above. Only used when AeroPark covers the fee (for example, a transferred Exclusive booking): it&apos;s paid to the operator in full, with no commission taken.</p>
                            </div>
                            <ReviewSection airport="lhr" color="purple" reviews={getField(editingCompany, newCompany, "lhr_reviews") || []} onAdd={() => addReview("lhr")} onRemove={idx => removeReview("lhr", idx)} onUpdate={(idx, f, v) => updateReview("lhr", idx, f, v)} />
                          </>
                        )}
                      </div>
                    )}
                  </div>

                  <div className="bg-panel-2 p-4 sm:p-6 pb-[calc(env(safe-area-inset-bottom)+16px)] shrink-0 border-t border-fg/[0.08]">
                    <div className="flex gap-3">
                      <button type="button" onClick={closeModal} className="px-5 py-3 bg-panel-3 hover:bg-panel-4 text-fg-2 rounded-lg font-medium text-sm transition-colors border border-fg/[0.12]">Cancel</button>
                      <button type="submit" disabled={isSaving} className="flex-1 bg-blue-600 hover:bg-blue-700 py-3 rounded-lg font-medium text-sm text-white transition-colors disabled:opacity-50 flex items-center justify-center gap-3">{isSaving ? <><Loader2 className="animate-spin w-4 h-4" /> Saving…</> : <><Save className="w-4 h-4" /> Save operator</>}</button>
                    </div>
                  </div>
                </form>
              ) : (
                <div className="p-5 sm:p-8 space-y-6">
                  {fetchingFinancials ? (
                    <div className="py-20 flex flex-col items-center justify-center text-fg-4"><Loader2 className="w-10 h-10 animate-spin mb-4 text-emerald-500" /><p className="font-semibold text-xs">Loading bookings…</p></div>
                  ) : (
                    <>
                      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6 bg-panel-2 border border-fg/[0.08] p-5 rounded-xl">
                        <div><h3 className="text-fg font-semibold text-lg">Bookings and payout</h3><p className="text-fg-3 text-sm mt-1">{companyBookings.length} completed bookings</p></div>
                        <button onClick={downloadInvoiceCSV} className="w-full sm:w-auto px-6 py-4 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-semibold transition-colors flex items-center justify-center gap-2"><Download className="w-4 h-4" /> Download invoice (CSV)</button>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                        {[{ label: "Total taken", value: `£${calcGross().toFixed(2)}`, color: "text-fg" }, { label: `Our commission (${editingCompany?.commission_rate || 15}%)`, value: `£${calcAeroCut().toFixed(2)}`, color: "text-blue-400" }, { label: "Owed to operator", value: `£${calcPayout().toFixed(2)}`, color: "text-emerald-400" }].map(({ label, value, color }) => (
                          <div key={label} className="bg-panel-2 p-5 rounded-xl border border-fg/[0.08]"><p className="text-sm text-fg-3 mb-1">{label}</p><p className={`text-2xl font-semibold tabular-nums ${color}`}>{value}</p></div>
                        ))}
                      </div>
                      <div className="border border-fg/[0.08] rounded-xl overflow-hidden bg-panel-2">
                        <div className="p-6 border-b border-fg/[0.08] bg-panel"><h4 className="text-xs font-semibold text-fg-3">Recent bookings</h4></div>
                        <div className="overflow-x-auto">
                          <table className="w-full text-left whitespace-nowrap">
                            <thead><tr className="border-b border-fg/[0.08] text-xs font-semibold text-fg-4"><th className="px-4 py-3">Reference</th><th className="px-4 py-3">Type</th><th className="px-4 py-3">Total</th><th className="px-4 py-3">Commission</th><th className="px-4 py-3">To operator</th></tr></thead>
                            <tbody className="divide-y divide-fg/[0.08]">
                              {companyBookings.slice(0, 15).map((b) => { const gross = Number(b.total_price || 0); const aeroCut = gross * ((editingCompany?.commission_rate || 15) / 100); return (
                                <tr key={b.id} className="hover:bg-fg/[0.02]"><td className="px-4 py-3 flex items-center gap-1"><span className="text-xs font-bold text-fg">{b.booking_ref}</span><CopyButton text={b.booking_ref} /></td><td className="px-4 py-3 text-xs font-semibold text-fg-4">{b.service_type || "Meet & Greet"}</td><td className="px-4 py-3 text-xs font-bold text-fg-3">£{gross.toFixed(2)}</td><td className="px-4 py-3 text-xs font-bold text-blue-400">£{aeroCut.toFixed(2)}</td><td className="px-4 py-3 text-xs font-semibold text-emerald-400">£{(gross - aeroCut).toFixed(2)}</td></tr>
                              ); })}
                              {companyBookings.length === 0 && <tr><td colSpan={5} className="px-8 py-10 text-center text-fg-4 text-xs font-bold">No completed bookings found.</td></tr>}
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