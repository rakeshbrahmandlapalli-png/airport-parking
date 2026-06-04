"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { supabase } from "@/app/lib/supabase";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  LayoutDashboard, Building2, LogOut, Plane, Tags, Settings2,
  PiggyBank, Save, Loader2, Percent, ArrowLeft, Zap, Coffee,
  ShieldCheck, RefreshCw, CheckCircle2, AlertCircle, Gauge,
  Clock, Users, Network, Tag, TriangleAlert, Activity, Eye
} from "lucide-react";

// ─── SETTINGS KEYS + DEFAULTS ────────────────────────────────────────────────
const DEFAULTS: Record<string, string> = {
  markup_enabled:   "true",
  markup_percent:   "10",
  fast_track_price: "8",
  lounge_price:     "35",
  price_tolerance:  "0.5",
  slots_claimed:    "12",
  slots_total:      "15",
  timer_enabled:        "true",
  timer_hours:          "72",
  timer_badge:          "Live Launch Event",
  timer_title:          "Founding Member Launch",
  timer_subtitle:       "Secure your spot · 5% lifetime discount",
  timer_benefit_title:  "Founding Members Get",
  timer_benefit_value:  "5% Lifetime Discount",
  timer_benefit_note:   "Plus priority access to new features",
  auto_surge_enabled:     "false",
  auto_surge_max_percent: "15",
};

// ─── PROMO TYPE ───────────────────────────────────────────────────────────────
interface Promo {
  id: string;
  code: string;
  discount_percent: number;
  is_active: boolean;
  expiry_date: string | null;
}

export default function SettingsPage() {
  const router = useRouter();

  const [loading,       setLoading]       = useState(true);
  const [isSaving,      setIsSaving]      = useState(false);
  const [saved,         setSaved]         = useState(false);
  const [lastSaved,     setLastSaved]     = useState<Date | null>(null);
  const [hasUnsaved,    setHasUnsaved]    = useState(false);
  const [saveError,     setSaveError]     = useState<string | null>(null);

  // ── Settings state ────────────────────────────────────────────────────────
  const [markupEnabled,  setMarkupEnabled]  = useState(true);
  const [markupPercent,  setMarkupPercent]  = useState(10);
  const [fastTrackPrice, setFastTrackPrice] = useState(8);
  const [loungePrice,    setLoungePrice]    = useState(35);
  const [priceTolerance, setPriceTolerance] = useState(0.5);
  const [slotsClaimed,   setSlotsClaimed]   = useState(12);
  const [slotsTotal,     setSlotsTotal]     = useState(15);

  // ── Launch timer state ──────────────────────────────────────────────────────
  const [timerEnabled,      setTimerEnabled]      = useState(true);
  const [timerHours,        setTimerHours]        = useState(72);
  const [timerBadge,        setTimerBadge]        = useState("Live Launch Event");
  const [timerTitle,        setTimerTitle]        = useState("Founding Member Launch");
  const [timerSubtitle,     setTimerSubtitle]     = useState("Secure your spot · 5% lifetime discount");
  const [timerBenefitTitle, setTimerBenefitTitle] = useState("Founding Members Get");
  const [timerBenefitValue, setTimerBenefitValue] = useState("5% Lifetime Discount");
  const [timerBenefitNote,  setTimerBenefitNote]  = useState("Plus priority access to new features");

  // ── Auto-surge state ────────────────────────────────────────────────────────
  const [autoSurgeEnabled, setAutoSurgeEnabled] = useState(false);
  const [autoSurgeMax,     setAutoSurgeMax]     = useState(15);
  const [surgeExcluded,    setSurgeExcluded]    = useState<string[]>([]);
  const [pivotCompanies,   setPivotCompanies]   = useState<any[]>([]);

  // ── Promo state ───────────────────────────────────────────────────────────
  const [promos,         setPromos]         = useState<Promo[]>([]);
  const [loadingPromos,  setLoadingPromos]  = useState(false);
  const [togglingPromo,  setTogglingPromo]  = useState<string | null>(null);

  // ── API health state ──────────────────────────────────────────────────────
  const [apiCompanies,   setApiCompanies]   = useState<any[]>([]);
  const [apiResults,     setApiResults]     = useState<Record<string, any>>({});
  const [testingApi,     setTestingApi]     = useState(false);

  // ── Price preview ─────────────────────────────────────────────────────────
  const [previewBase,    setPreviewBase]    = useState(76.94);

  // Track initial values to detect unsaved changes
  const initialRef = useRef<Record<string, any>>({});

  // ─── FETCH SETTINGS ───────────────────────────────────────────────────────
  const fetchSettings = useCallback(async () => {
    setLoading(true);
    setSaveError(null);
    try {
      const { data, error } = await supabase.from("settings").select("*");
      if (error) throw error;
      if (data) {
        const get = (key: string) => data.find((r: any) => r.key === key)?.value ?? DEFAULTS[key];

        const vals = {
          markupEnabled:  get("markup_enabled") === "true",
          markupPercent:  Number(get("markup_percent"))    || 10,
          fastTrackPrice: Number(get("fast_track_price"))  || 8,
          loungePrice:    Number(get("lounge_price"))      || 35,
          priceTolerance: Number(get("price_tolerance"))   || 0.5,
          slotsClaimed:   Number(get("slots_claimed"))     || 12,
          slotsTotal:     Number(get("slots_total"))       || 15,
          timerEnabled:      get("timer_enabled") !== "false",
          timerHours:        Number(get("timer_hours"))    || 72,
          timerBadge:        get("timer_badge")         ?? DEFAULTS.timer_badge,
          timerTitle:        get("timer_title")         ?? DEFAULTS.timer_title,
          timerSubtitle:     get("timer_subtitle")      ?? DEFAULTS.timer_subtitle,
          timerBenefitTitle: get("timer_benefit_title") ?? DEFAULTS.timer_benefit_title,
          timerBenefitValue: get("timer_benefit_value") ?? DEFAULTS.timer_benefit_value,
          timerBenefitNote:  get("timer_benefit_note")  ?? DEFAULTS.timer_benefit_note,
          autoSurgeEnabled:  get("auto_surge_enabled") === "true",
          autoSurgeMax:      Number(get("auto_surge_max_percent")) || 15,
          surgeExcluded:     (() => { try { return JSON.parse(get("auto_surge_excluded_ids") || "[]"); } catch { return []; } })() as string[],
        };
        (vals as any).surgeExcludedKey = JSON.stringify([...vals.surgeExcluded].sort());

        setMarkupEnabled(vals.markupEnabled);
        setMarkupPercent(vals.markupPercent);
        setFastTrackPrice(vals.fastTrackPrice);
        setLoungePrice(vals.loungePrice);
        setPriceTolerance(vals.priceTolerance);
        setSlotsClaimed(vals.slotsClaimed);
        setSlotsTotal(vals.slotsTotal);
        setTimerEnabled(vals.timerEnabled);
        setTimerHours(vals.timerHours);
        setTimerBadge(vals.timerBadge);
        setTimerTitle(vals.timerTitle);
        setTimerSubtitle(vals.timerSubtitle);
        setTimerBenefitTitle(vals.timerBenefitTitle);
        setTimerBenefitValue(vals.timerBenefitValue);
        setTimerBenefitNote(vals.timerBenefitNote);
        setAutoSurgeEnabled(vals.autoSurgeEnabled);
        setAutoSurgeMax(vals.autoSurgeMax);
        setSurgeExcluded(vals.surgeExcluded);

        initialRef.current = vals;
        setHasUnsaved(false);
      }
    } catch (err: any) {
      setSaveError("Failed to load settings: " + err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  // ─── FETCH PROMOS ─────────────────────────────────────────────────────────
  const fetchPromos = useCallback(async () => {
    setLoadingPromos(true);
    const { data } = await supabase.from("promotions").select("*").order("code");
    if (data) setPromos(data);
    setLoadingPromos(false);
  }, []);

  // ─── FETCH API COMPANIES ──────────────────────────────────────────────────
  const fetchApiCompanies = useCallback(async () => {
    const { data } = await supabase.from("companies").select("id, name, api_token, dynamic_surcharge_percent, price_modifier").not("api_token", "is", null).neq("api_token", "");
    if (data) setApiCompanies(data);
  }, []);

  // ─── FETCH PIVOT COMPANIES (for auto-surge opt-out list) ────────────────────
  const fetchPivotCompanies = useCallback(async () => {
    const { data } = await supabase.from("companies").select("id, name, category, pricing_mode, api_token, dynamic_surcharge_percent");
    if (data) {
      // Pivot-priced = explicit pivot mode OR no API token at all
      const pivots = data.filter((c: any) => c.pricing_mode === "pivot" || !c.api_token);
      setPivotCompanies(pivots);
    }
  }, []);

  // ─── AUTH + INIT ──────────────────────────────────────────────────────────
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) router.replace("/admin/login");
      else {
        fetchSettings();
        fetchPromos();
        fetchApiCompanies();
        fetchPivotCompanies();
      }
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ─── UNSAVED CHANGE DETECTOR ──────────────────────────────────────────────
  useEffect(() => {
    if (loading) return;
    const curr = { markupEnabled, markupPercent, fastTrackPrice, loungePrice, priceTolerance, slotsClaimed, slotsTotal, timerEnabled, timerHours, timerBadge, timerTitle, timerSubtitle, timerBenefitTitle, timerBenefitValue, timerBenefitNote, autoSurgeEnabled, autoSurgeMax, surgeExcludedKey: JSON.stringify([...surgeExcluded].sort()) };
    const changed = Object.keys(curr).some(k => (curr as any)[k] !== initialRef.current[k]);
    setHasUnsaved(changed);
  }, [markupEnabled, markupPercent, fastTrackPrice, loungePrice, priceTolerance, slotsClaimed, slotsTotal, timerEnabled, timerHours, timerBadge, timerTitle, timerSubtitle, timerBenefitTitle, timerBenefitValue, timerBenefitNote, autoSurgeEnabled, autoSurgeMax, surgeExcluded, loading]);

  // ─── SAVE ─────────────────────────────────────────────────────────────────
  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setSaved(false);
    setSaveError(null);

    const rows = [
      { key: "markup_enabled",   value: markupEnabled.toString()   },
      { key: "markup_percent",   value: markupPercent.toString()   },
      { key: "fast_track_price", value: fastTrackPrice.toString()  },
      { key: "lounge_price",     value: loungePrice.toString()     },
      { key: "price_tolerance",  value: priceTolerance.toString()  },
      { key: "slots_claimed",    value: slotsClaimed.toString()    },
      { key: "slots_total",      value: slotsTotal.toString()      },
      { key: "timer_enabled",       value: timerEnabled.toString() },
      { key: "timer_hours",         value: timerHours.toString()   },
      { key: "timer_badge",         value: timerBadge              },
      { key: "timer_title",         value: timerTitle              },
      { key: "timer_subtitle",      value: timerSubtitle           },
      { key: "timer_benefit_title", value: timerBenefitTitle       },
      { key: "timer_benefit_value", value: timerBenefitValue       },
      { key: "timer_benefit_note",  value: timerBenefitNote        },
      { key: "auto_surge_enabled",     value: autoSurgeEnabled.toString() },
      { key: "auto_surge_max_percent", value: autoSurgeMax.toString()     },
      { key: "auto_surge_excluded_ids", value: JSON.stringify(surgeExcluded) },
    ];

    try {
      // 🟢 FIXED: Sequential upserts to catch individual failures clearly
      const errors: string[] = [];
      for (const row of rows) {
        const { error } = await supabase
          .from("settings")
          .upsert(row, { onConflict: "key" });
        if (error) errors.push(`${row.key}: ${error.message}`);
      }

      if (errors.length > 0) {
        // 🟢 Surface the real error — this is why toggle "resets"
        // The upsert was failing silently because the key column may not exist
        setSaveError("Some settings failed to save:\n" + errors.join("\n") + "\n\nRun the SQL fix below.");
        return;
      }

      // Re-read from DB to confirm what actually saved
      // This catches the case where upsert succeeded but wrote wrong value
      const { data: verify } = await supabase.from("settings").select("*").eq("key", "markup_enabled").single();
      if (verify && verify.value !== markupEnabled.toString()) {
        setSaveError(`DB verification failed: markup_enabled shows '${verify.value}' but expected '${markupEnabled}'. Check the settings table 'key' column constraint.`);
        return;
      }

      initialRef.current = { markupEnabled, markupPercent, fastTrackPrice, loungePrice, priceTolerance, slotsClaimed, slotsTotal, timerEnabled, timerHours, timerBadge, timerTitle, timerSubtitle, timerBenefitTitle, timerBenefitValue, timerBenefitNote, autoSurgeEnabled, autoSurgeMax, surgeExcludedKey: JSON.stringify([...surgeExcluded].sort()) };
      setHasUnsaved(false);
      setSaved(true);
      setLastSaved(new Date());
      setTimeout(() => setSaved(false), 3000);

    } catch (err: any) {
      setSaveError("Save failed: " + err.message);
    } finally {
      setIsSaving(false);
    }
  };

  // ─── TOGGLE PROMO ─────────────────────────────────────────────────────────
  const togglePromo = async (promo: Promo) => {
    setTogglingPromo(promo.id);
    const newVal = !promo.is_active;
    const { error } = await supabase.from("promotions").update({ is_active: newVal }).eq("id", promo.id);
    if (!error) setPromos(prev => prev.map(p => p.id === promo.id ? { ...p, is_active: newVal } : p));
    setTogglingPromo(null);
  };

  // ─── API HEALTH CHECK ─────────────────────────────────────────────────────
  const runApiHealthCheck = async () => {
    setTestingApi(true);
    setApiResults({});
    const drop = new Date(); drop.setDate(drop.getDate() + 7);
    const pick = new Date(); pick.setDate(pick.getDate() + 10);
    const dropStr = drop.toISOString().split("T")[0];
    const pickStr = pick.toISOString().split("T")[0];

    const results: Record<string, any> = {};
    await Promise.all(
      apiCompanies.map(async (c) => {
        const start = Date.now();
        try {
          const res = await fetch("/api/parking-api", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ token_no: c.api_token, drop_date: dropStr, drop_time: "09:00", return_date: pickStr, return_time: "09:00" }),
          });
          const data = await res.json();
          const rates = data.rates || [];
          const price = rates[0]?.parking_price;
          results[c.id] = {
            ok: res.ok && !!price,
            price: price ? `£${Number(price).toFixed(2)}` : "No price",
            ms: Date.now() - start,
            status: res.status,
          };
        } catch (e: any) {
          results[c.id] = { ok: false, price: null, ms: Date.now() - start, error: e.message };
        }
      })
    );
    setApiResults(results);
    setTestingApi(false);
  };

  // ─── DANGER ZONE ─────────────────────────────────────────────────────────
  const resetAllModifiers = async () => {
    if (!confirm("⚠️ Reset ALL company price_modifiers to 1.0 (BASE)? This affects all operators.")) return;
    await supabase.from("companies").update({ price_modifier: 1.0 }).neq("id", "00000000-0000-0000-0000-000000000000");
    alert("✅ All modifiers reset to BASE.");
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.replace("/admin/login");
  };

  if (loading) return (
    <div className="min-h-screen bg-gradient-to-b from-[#0B1120] via-[#0A0E1A] to-[#0B1120] flex flex-col items-center justify-center text-white relative overflow-hidden">
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-blue-600/10 rounded-full blur-[120px]"></div>
      <Plane className="w-10 h-10 text-blue-500 animate-pulse rotate-45 relative z-10" />
      <p className="font-black text-slate-400 tracking-widest uppercase text-xs mt-6 relative z-10">Loading System Config...</p>
    </div>
  );

  const inputCls = "w-full bg-[#1A2235] border border-slate-700/50 hover:border-blue-500/50 rounded-xl px-5 py-4 text-xl font-black text-white outline-none focus:ring-2 focus:ring-blue-500/50 transition-all shadow-[0_0_0_1000px_#1A2235_inset] [-webkit-text-fill-color:white]";
  const labelCls = "text-[10px] font-black uppercase text-slate-500 block ml-1 tracking-widest mb-2";
  const sectionHeader = "p-6 md:p-8 border-b border-slate-800 bg-[#0F1523] flex items-center gap-4";

  const previewFinal = markupEnabled ? previewBase * (1 + markupPercent / 100) : previewBase;

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#0B1120] via-[#0A0E1A] to-[#0B1120] font-sans flex flex-col md:flex-row overflow-hidden text-slate-100 selection:bg-blue-600/30 selection:text-white antialiased relative">

      {/* 🌌 AMBIENT BACKGROUND GLOW LAYERS */}
      <div className="fixed top-[-200px] left-[200px] w-[600px] h-[600px] bg-blue-600/8 rounded-full blur-[140px] pointer-events-none z-0"></div>
      <div className="fixed bottom-[-200px] right-[100px] w-[500px] h-[500px] bg-indigo-600/8 rounded-full blur-[140px] pointer-events-none z-0"></div>
      <div className="fixed top-[40%] right-[30%] w-[400px] h-[400px] bg-emerald-600/5 rounded-full blur-[120px] pointer-events-none z-0"></div>

      {/* ── 🟢 PREMIUM SIDEBAR ──────────────────────────────────────────── */}
      <aside className="w-full md:w-64 bg-[#0F1523]/90 backdrop-blur-xl text-slate-400 hidden md:flex flex-col sticky top-0 h-screen border-r border-slate-800/80 shadow-2xl z-50 shrink-0 relative">
        <div className="absolute inset-y-0 right-0 w-px bg-gradient-to-b from-transparent via-blue-500/20 to-transparent"></div>
        <div className="p-8 flex items-center gap-4 text-white">
          <div className="w-10 h-10 bg-gradient-to-br from-blue-600/30 to-blue-600/5 rounded-xl flex items-center justify-center border border-blue-500/30 shadow-[0_0_20px_rgba(37,99,235,0.25)]">
            <Plane className="w-6 h-6 text-blue-400 rotate-45 drop-shadow-[0_0_6px_rgba(59,130,246,0.6)]" />
          </div>
          <span className="font-black text-xl tracking-tighter uppercase">OPS <span className="text-blue-500 drop-shadow-[0_0_8px_rgba(59,130,246,0.5)]">CENTER</span></span>
        </div>
        <nav className="px-5 space-y-3 flex-grow mt-6 font-bold text-sm">
          <Link href="/admin"          className="flex items-center gap-4 px-5 py-4 hover:bg-white/5 hover:text-white rounded-xl transition-all hover:border-l-2 hover:border-blue-500/50"><LayoutDashboard className="w-5 h-5 text-slate-500" /> Live Board</Link>
          <Link href="/admin/companies" className="flex items-center gap-4 px-5 py-4 hover:bg-white/5 hover:text-white rounded-xl transition-all hover:border-l-2 hover:border-blue-500/50"><Building2 className="w-5 h-5 text-slate-500" /> Partner Network</Link>
          <Link href="/admin/promos"   className="flex items-center gap-4 px-5 py-4 hover:bg-white/5 hover:text-white rounded-xl transition-all hover:border-l-2 hover:border-blue-500/50"><Tags className="w-5 h-5 text-slate-500" /> Promo Manager</Link>
          <Link href="/admin/financials" className="flex items-center gap-4 px-5 py-4 hover:bg-white/5 hover:text-white rounded-xl transition-all hover:border-l-2 hover:border-blue-500/50"><PiggyBank className="w-5 h-5 text-slate-500" /> Financials</Link>
          <Link href="/admin/settings" className="flex items-center gap-4 px-5 py-4 bg-gradient-to-r from-blue-600 to-blue-500 text-white rounded-xl shadow-[0_10px_30px_-5px_rgba(37,99,235,0.5)] transition-all hover:shadow-[0_10px_40px_-5px_rgba(37,99,235,0.7)] hover:-translate-y-0.5 border-t border-slate-800/50 mt-4 pt-6 relative overflow-hidden group">
            <div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/10 to-white/0 -translate-x-full group-hover:translate-x-full transition-transform duration-700"></div>
            <Settings2 className="w-5 h-5" /> Platform Settings
          </Link>
        </nav>
        <div className="p-6">
          <button type="button" onClick={handleLogout} className="flex items-center gap-4 text-sm font-bold hover:text-red-400 transition-colors w-full text-left px-5 py-4 group bg-slate-900/50 rounded-xl border border-slate-800/80 hover:border-red-500/30 hover:shadow-[0_0_20px_-8px_rgba(239,68,68,0.4)]">
            <LogOut className="w-5 h-5 text-slate-500 group-hover:text-red-500 transition-colors" /> Secure Logout
          </button>
        </div>
      </aside>

      {/* ── MAIN ────────────────────────────────────────────────────────── */}
      <main className="flex-1 p-4 md:p-8 lg:p-12 w-full overflow-y-auto h-screen relative pb-32 md:pb-12 custom-scrollbar z-10">

        {/* MOBILE HEADER */}
        <div className="md:hidden flex items-center justify-between mb-8 bg-[#131A2B]/80 backdrop-blur-xl p-5 rounded-3xl border border-slate-800 shadow-2xl">
          <div className="flex items-center gap-3 font-black text-xl uppercase tracking-tighter text-white">
            <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-blue-500 rounded-xl flex items-center justify-center shadow-[0_0_20px_rgba(37,99,235,0.5)]">
              <Plane className="w-6 h-6 text-white rotate-45" />
            </div>
            OPS<span className="text-blue-500">CENTER</span>
          </div>
          <button type="button" onClick={handleLogout} className="p-3 bg-slate-800 rounded-xl text-slate-300 hover:text-red-400 transition-colors">
            <LogOut className="w-5 h-5" />
          </button>
        </div>

        {/* 🟢 COMMAND HERO PANEL (header + stat rail, one unit) */}
        <div className="relative mb-8 rounded-[2rem] border border-slate-800/80 bg-gradient-to-br from-[#131A2B] to-[#0F1523] shadow-2xl overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-blue-500/40 to-transparent"></div>
          <div className="absolute -top-24 -left-24 w-72 h-72 bg-blue-600/10 rounded-full blur-[100px] pointer-events-none"></div>
          <div className="absolute -bottom-24 -right-24 w-72 h-72 bg-indigo-600/10 rounded-full blur-[100px] pointer-events-none"></div>

          {/* ROW 1 — title + actions */}
          <div className="relative p-6 md:p-8 flex flex-col lg:flex-row lg:items-center justify-between gap-6 border-b border-slate-800/60">
            <div className="flex items-center gap-5">
              <div className="hidden sm:flex w-14 h-14 rounded-2xl bg-gradient-to-br from-blue-600/30 to-blue-600/5 border border-blue-500/30 items-center justify-center shadow-[0_0_25px_rgba(37,99,235,0.3)] shrink-0">
                <Settings2 className="w-7 h-7 text-blue-400" />
              </div>
              <div>
                <h1 className="text-3xl md:text-4xl font-black tracking-tight bg-gradient-to-r from-white via-white to-blue-200 bg-clip-text text-transparent">Platform Settings</h1>
                <div className="flex flex-wrap items-center gap-x-4 gap-y-2 mt-2">
                  <div className="text-emerald-400 font-bold text-[10px] uppercase tracking-[0.3em] flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.8)]"></span>
                    System Config
                  </div>
                  {lastSaved && <><div className="hidden sm:block w-px h-3 bg-slate-700"></div><span className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em] flex items-center gap-1.5"><Clock className="w-3 h-3" /> Saved {lastSaved.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })}</span></>}
                  {hasUnsaved && !isSaving && <span className="text-[10px] font-bold text-amber-400 uppercase tracking-[0.2em] animate-pulse">● Unsaved changes</span>}
                </div>
              </div>
            </div>
            <div className="flex flex-col sm:flex-row gap-3 shrink-0">
              <Link href="/admin" className="px-6 py-3.5 bg-[#1A2235]/80 backdrop-blur-sm hover:bg-[#1A2235] border border-slate-700 hover:border-slate-600 text-slate-300 rounded-xl text-xs font-black uppercase tracking-[0.1em] transition-all flex items-center justify-center gap-3 shadow-md">
                <ArrowLeft className="w-4 h-4" /> Live Board
              </Link>
              <button type="button" onClick={() => { fetchSettings(); fetchPromos(); fetchApiCompanies(); fetchPivotCompanies(); }}
                className="px-6 py-3.5 bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-500 hover:to-blue-400 text-white rounded-xl text-xs font-black uppercase tracking-[0.1em] transition-all flex items-center justify-center gap-3 shadow-[0_10px_30px_-5px_rgba(37,99,235,0.5)] hover:-translate-y-0.5 active:translate-y-0 relative overflow-hidden group">
                <div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/20 to-white/0 -translate-x-full group-hover:translate-x-full transition-transform duration-700"></div>
                <RefreshCw className="w-4 h-4" /> Reload
              </button>
            </div>
          </div>

          {/* ROW 2 — stat rail */}
          <div className="relative grid grid-cols-2 lg:grid-cols-4 divide-x divide-slate-800/60">
            {[
              { label: "Global Markup", value: markupEnabled ? `${markupPercent}%` : "OFF", sub: markupEnabled ? "on every price" : "disabled", color: markupEnabled ? "#3b82f6" : "#64748b", Icon: Percent },
              { label: "Auto Surge", value: autoSurgeEnabled ? `≤${autoSurgeMax}%` : "OFF", sub: autoSurgeEnabled ? "demand pricing" : "disabled", color: autoSurgeEnabled ? "#f97316" : "#64748b", Icon: Activity },
              { label: "Live API", value: `${apiCompanies.length}`, sub: "api partners", color: "#10b981", Icon: Network },
              { label: "Active Promos", value: `${promos.filter(p => p.is_active).length}`, sub: `of ${promos.length} codes`, color: "#a855f7", Icon: Tag },
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

        {/* 🔴 DB ERROR BANNER — the real reason toggle resets */}
        {saveError && (
          <div className="mb-6 bg-red-500/10 border border-red-500/30 rounded-2xl p-5">
            <p className="text-red-400 font-black text-xs uppercase tracking-widest mb-2 flex items-center gap-2"><TriangleAlert className="w-4 h-4" /> Save Error — Toggle Reset Root Cause</p>
            <pre className="text-red-300 text-[10px] font-mono whitespace-pre-wrap leading-relaxed">{saveError}</pre>
            <div className="mt-4 bg-[#0A101D] rounded-xl p-4 border border-red-500/20">
              <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">Run this SQL in Supabase to fix:</p>
              <pre className="text-emerald-400 text-[10px] font-mono">{`-- Ensure all settings rows exist with correct key column
INSERT INTO settings (key, value) VALUES
  ('markup_enabled',   'true'),
  ('markup_percent',   '10'),
  ('fast_track_price', '8'),
  ('lounge_price',     '35'),
  ('price_tolerance',  '0.5'),
  ('slots_claimed',    '12'),
  ('slots_total',      '15')
ON CONFLICT (key) DO NOTHING;`}</pre>
            </div>
          </div>
        )}

        <form onSubmit={handleSave} className="max-w-3xl space-y-6">

          {/* ── SECTION 1: GLOBAL MARKUP ──────────────────────────────────── */}
          <div className="bg-[#131A2B] rounded-[2rem] border border-slate-800 shadow-2xl overflow-hidden">
            <div className={sectionHeader}>
              <div className="w-11 h-11 bg-blue-600/10 rounded-2xl flex items-center justify-center shrink-0 border border-blue-500/20"><Percent className="w-5 h-5 text-blue-500" /></div>
              <div><h2 className="text-lg font-black text-white tracking-tight">Global Markup Engine</h2><p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">Applied on top of every base price (API or pivot)</p></div>
            </div>
            <div className="p-6 md:p-8 space-y-6">

              {/* Toggle */}
              <div className="flex items-center justify-between bg-[#1A2235] p-5 rounded-2xl border border-slate-700/50">
                <div>
                  <p className="text-white font-black text-lg">Enable Global Markup</p>
                  <p className="text-slate-400 text-xs mt-0.5">Multiplies all displayed prices by (1 + markup%)</p>
                  <p className="text-[10px] font-bold text-slate-600 mt-1 uppercase tracking-widest">
                    Currently: <span className={markupEnabled ? "text-emerald-400" : "text-red-400"}>{markupEnabled ? "ON" : "OFF"}</span>
                    {" — "} Will save as: <span className="text-blue-400">"{markupEnabled.toString()}"</span>
                  </p>
                </div>
                {/* 🟢 FIXED: Direct boolean, NOT functional updater */}
                <button
                  type="button"
                  onClick={() => setMarkupEnabled(!markupEnabled)}
                  aria-pressed={markupEnabled}
                  className={`relative w-16 h-8 rounded-full transition-colors duration-300 shrink-0 focus:outline-none focus:ring-4 focus:ring-blue-500/30 ${markupEnabled ? "bg-blue-600" : "bg-slate-700"}`}
                >
                  <span className={`absolute top-1 left-1 w-6 h-6 bg-white rounded-full shadow-md transition-transform duration-300 flex items-center justify-center ${markupEnabled ? "translate-x-8" : "translate-x-0"}`}>
                    {markupEnabled ? <CheckCircle2 className="w-3.5 h-3.5 text-blue-600" /> : <AlertCircle className="w-3.5 h-3.5 text-slate-400" />}
                  </span>
                </button>
              </div>

              {/* Percent + live preview */}
              <div className={`space-y-4 transition-opacity duration-300 ${!markupEnabled ? "opacity-30 pointer-events-none select-none" : ""}`}>
                <div>
                  <label className={labelCls}>Markup Percentage</label>
                  <div className="flex items-center gap-3">
                    <input type="number" step="0.1" min="0" max="100" value={markupPercent}
                      onChange={e => setMarkupPercent(Number(e.target.value) || 0)}
                      disabled={!markupEnabled}
                      className={`${inputCls} [-webkit-text-fill-color:#34d399]`} />
                    <span className="text-3xl font-black text-slate-500 shrink-0">%</span>
                  </div>
                  <div className="mt-3 h-1.5 bg-slate-800 rounded-full overflow-hidden">
                    <div className="h-full bg-gradient-to-r from-emerald-500 to-blue-500 rounded-full transition-all duration-300" style={{ width: `${Math.min(markupPercent, 50) * 2}%` }} />
                  </div>
                </div>

                {/* 🟢 NEW: Interactive price preview */}
                <div className="bg-[#0A101D] border border-slate-800 rounded-2xl p-5">
                  <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-3 flex items-center gap-2"><Eye className="w-3.5 h-3.5" /> Live Price Preview</p>
                  <div className="flex items-center gap-3 mb-3">
                    <span className="text-slate-500 font-bold text-sm shrink-0">API base: £</span>
                    <input type="number" step="0.01" value={previewBase} onChange={e => setPreviewBase(Number(e.target.value) || 0)}
                      className="w-28 bg-[#1A2235] border border-slate-700 rounded-lg px-3 py-2 text-sm font-black text-white outline-none focus:border-blue-500 [-webkit-text-fill-color:white] shadow-[0_0_0_1000px_#1A2235_inset]" />
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400 text-sm font-bold">After {markupPercent}% markup:</span>
                    <span className="text-2xl font-black text-emerald-400">£{previewFinal.toFixed(2)}</span>
                  </div>
                  <div className="text-[10px] text-slate-600 font-bold mt-1">
                    Difference: +£{(previewFinal - previewBase).toFixed(2)} ({markupPercent}%)
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* ── SECTION 2: ADD-ON PRICES ──────────────────────────────────── */}
          <div className="bg-[#131A2B] rounded-[2rem] border border-slate-800 shadow-2xl overflow-hidden">
            <div className={sectionHeader}>
              <div className="w-11 h-11 bg-amber-500/10 rounded-2xl flex items-center justify-center shrink-0 border border-amber-500/20"><Zap className="w-5 h-5 text-amber-400" /></div>
              <div><h2 className="text-lg font-black text-white tracking-tight">Add-On Prices</h2><p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">Fast Track & Lounge — 100% AeroPark revenue</p></div>
            </div>
            <div className="p-6 md:p-8 grid grid-cols-1 sm:grid-cols-2 gap-6">
              <div>
                <label className={labelCls}><Zap className="w-3 h-3 inline mr-1 text-amber-400" /> Fast Track (£ / person)</label>
                <input type="number" step="0.50" min="0" value={fastTrackPrice} onChange={e => setFastTrackPrice(Number(e.target.value) || 0)}
                  className={`${inputCls} [-webkit-text-fill-color:#fbbf24]`} />
                <p className="text-[10px] text-slate-500 font-bold mt-2">Reference — hardcoded in pricing.ts as FAST_TRACK_PRICE.</p>
              </div>
              <div>
                <label className={labelCls}><Coffee className="w-3 h-3 inline mr-1 text-indigo-400" /> VIP Lounge (£ / person)</label>
                <input type="number" step="1" min="0" value={loungePrice} onChange={e => setLoungePrice(Number(e.target.value) || 0)}
                  className={`${inputCls} [-webkit-text-fill-color:#818cf8]`} />
                <p className="text-[10px] text-slate-500 font-bold mt-2">LOUNGE_PRICE in checkout route. Redeploy to take effect.</p>
              </div>
            </div>
          </div>

          {/* ── SECTION 3: CHECKOUT SAFETY ────────────────────────────────── */}
          <div className="bg-[#131A2B] rounded-[2rem] border border-slate-800 shadow-2xl overflow-hidden">
            <div className={sectionHeader}>
              <div className="w-11 h-11 bg-emerald-500/10 rounded-2xl flex items-center justify-center shrink-0 border border-emerald-500/20"><ShieldCheck className="w-5 h-5 text-emerald-400" /></div>
              <div><h2 className="text-lg font-black text-white tracking-tight">Checkout Safety</h2><p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">Server-side price validation tolerance</p></div>
            </div>
            <div className="p-6 md:p-8 space-y-4">
              <label className={labelCls}><Gauge className="w-3 h-3 inline mr-1 text-emerald-400" /> Price Tolerance (£)</label>
              <div className="flex items-center gap-3">
                <span className="text-3xl font-black text-slate-500 shrink-0">£</span>
                <input type="number" step="0.10" min="0" max="10" value={priceTolerance} onChange={e => setPriceTolerance(Number(e.target.value) || 0)}
                  className={`${inputCls} [-webkit-text-fill-color:#34d399]`} />
              </div>
              <p className="text-[10px] text-slate-500 font-bold leading-relaxed">Max price difference before checkout rejects. Default £0.50. Raise if you get false rejections.</p>
              <div className="bg-[#1A2235] border border-slate-700/50 rounded-xl p-4 text-xs font-bold text-slate-400">
                <span className="text-emerald-400 font-black">Example:</span> Customer sees £84.63. Server calculates £84.80. Diff = £0.17 → ✅ within tolerance.
              </div>
            </div>
          </div>

          {/* ── SECTION 4: LAUNCH TIMER ───────────────────────────────────── */}
          <div className="bg-[#131A2B] rounded-[2rem] border border-slate-800 shadow-2xl overflow-hidden">
            <div className={sectionHeader}>
              <div className="w-11 h-11 bg-rose-500/10 rounded-2xl flex items-center justify-center shrink-0 border border-rose-500/20"><Users className="w-5 h-5 text-rose-400" /></div>
              <div><h2 className="text-lg font-black text-white tracking-tight">Launch Timer & Slots</h2><p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">Founding Member scarcity on results page</p></div>
            </div>

            {/* Enable / disable the whole timer */}
            <div className="p-6 md:p-8 border-b border-slate-800">
              <div className="flex items-center justify-between bg-[#1A2235] p-5 rounded-2xl border border-slate-700/50">
                <div>
                  <p className="text-white font-black text-lg">Show Launch Timer</p>
                  <p className="text-slate-400 text-xs mt-0.5">Toggle off to completely hide the timer card from the results page</p>
                  <p className="text-[10px] font-bold text-slate-600 mt-1 uppercase tracking-widest">
                    Currently: <span className={timerEnabled ? "text-emerald-400" : "text-red-400"}>{timerEnabled ? "VISIBLE" : "HIDDEN"}</span>
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setTimerEnabled(!timerEnabled)}
                  aria-pressed={timerEnabled}
                  className={`relative w-16 h-8 rounded-full transition-colors duration-300 shrink-0 focus:outline-none focus:ring-4 focus:ring-rose-500/30 ${timerEnabled ? "bg-rose-600" : "bg-slate-700"}`}
                >
                  <span className={`absolute top-1 left-1 w-6 h-6 bg-white rounded-full shadow-md transition-transform duration-300 flex items-center justify-center ${timerEnabled ? "translate-x-8" : "translate-x-0"}`}>
                    {timerEnabled ? <CheckCircle2 className="w-3.5 h-3.5 text-rose-600" /> : <AlertCircle className="w-3.5 h-3.5 text-slate-400" />}
                  </span>
                </button>
              </div>
            </div>

            {/* All timer config — dimmed when hidden */}
            <div className={`transition-opacity duration-300 ${!timerEnabled ? "opacity-30 pointer-events-none select-none" : ""}`}>

            {/* Duration */}
            <div className="p-6 md:p-8 border-b border-slate-800">
              <label className={labelCls}><Clock className="w-3 h-3 inline mr-1 text-rose-400" /> Countdown Duration (hours)</label>
              <div className="flex items-center gap-3">
                <input type="number" step="1" min="1" max="8760" value={timerHours} onChange={e => setTimerHours(Number(e.target.value) || 1)}
                  className={`${inputCls} [-webkit-text-fill-color:#fb7185]`} />
                <span className="text-sm font-black text-slate-500 shrink-0 whitespace-nowrap">≈ {Math.floor(timerHours / 24)}d {timerHours % 24}h</span>
              </div>
              <p className="text-[10px] text-slate-500 font-bold mt-2">Each visitor's countdown starts on first visit and runs for this many hours. Changing this restarts the countdown for everyone.</p>
            </div>

            {/* Editable text */}
            <div className="p-6 md:p-8 border-b border-slate-800 space-y-5">
              <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 flex items-center gap-2"><Eye className="w-3.5 h-3.5" /> Timer Text</p>
              <div>
                <label className={labelCls}>Badge Label</label>
                <input type="text" value={timerBadge} onChange={e => setTimerBadge(e.target.value)} className={inputCls} />
              </div>
              <div>
                <label className={labelCls}>Headline</label>
                <input type="text" value={timerTitle} onChange={e => setTimerTitle(e.target.value)} className={inputCls} />
              </div>
              <div>
                <label className={labelCls}>Subtitle</label>
                <input type="text" value={timerSubtitle} onChange={e => setTimerSubtitle(e.target.value)} className={inputCls} />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                <div>
                  <label className={labelCls}>Benefit — Title</label>
                  <input type="text" value={timerBenefitTitle} onChange={e => setTimerBenefitTitle(e.target.value)} className={inputCls} />
                </div>
                <div>
                  <label className={labelCls}>Benefit — Value</label>
                  <input type="text" value={timerBenefitValue} onChange={e => setTimerBenefitValue(e.target.value)} className={`${inputCls} [-webkit-text-fill-color:#4ade80]`} />
                </div>
              </div>
              <div>
                <label className={labelCls}>Benefit — Note</label>
                <input type="text" value={timerBenefitNote} onChange={e => setTimerBenefitNote(e.target.value)} className={inputCls} />
              </div>
            </div>

            <div className="p-6 md:p-8 grid grid-cols-1 sm:grid-cols-2 gap-6">
              <div>
                <label className={labelCls}><Users className="w-3 h-3 inline mr-1 text-rose-400" /> Slots Claimed</label>
                <input type="number" step="1" min="0" value={slotsClaimed} onChange={e => setSlotsClaimed(Number(e.target.value) || 0)}
                  className={`${inputCls} [-webkit-text-fill-color:#fb7185]`} />
              </div>
              <div>
                <label className={labelCls}><Clock className="w-3 h-3 inline mr-1 text-rose-400" /> Total Slots</label>
                <input type="number" step="1" min="1" value={slotsTotal} onChange={e => setSlotsTotal(Number(e.target.value) || 15)}
                  className={inputCls} />
              </div>
              <div className="sm:col-span-2">
                <div className="bg-[#1A2235] border border-slate-700/50 rounded-xl p-4">
                  <div className="flex justify-between text-[10px] font-black uppercase tracking-widest mb-2">
                    <span className="text-slate-500">Availability</span>
                    <span className={slotsClaimed >= slotsTotal ? "text-red-400" : "text-emerald-400"}>{Math.max(0, slotsTotal - slotsClaimed)} left of {slotsTotal}</span>
                  </div>
                  <div className="h-2 bg-slate-800 rounded-full overflow-hidden">
                    <div className="h-full bg-gradient-to-r from-rose-500 to-orange-500 rounded-full transition-all duration-500" style={{ width: `${Math.min((slotsClaimed / Math.max(slotsTotal, 1)) * 100, 100)}%` }} />
                  </div>
                  <p className="text-[10px] text-slate-500 font-bold mt-2">
                    {slotsClaimed >= slotsTotal ? "⚠️ All slots filled — timer shows SOLD OUT." : `Timer shows ${slotsTotal - slotsClaimed} spots left.`}
                  </p>
                </div>
              </div>
            </div>
            </div>
          </div>

          {/* ── SECTION 4b: AUTO SURGE (pivot pricing) ────────────────────── */}
          <div className="bg-[#131A2B] rounded-[2rem] border border-slate-800 shadow-2xl overflow-hidden">
            <div className={sectionHeader}>
              <div className="w-11 h-11 bg-orange-500/10 rounded-2xl flex items-center justify-center shrink-0 border border-orange-500/20"><Activity className="w-5 h-5 text-orange-400" /></div>
              <div><h2 className="text-lg font-black text-white tracking-tight">Auto Surge</h2><p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">Automatic demand pricing on pivot-priced companies</p></div>
            </div>

            {/* Enable / disable */}
            <div className="p-6 md:p-8 border-b border-slate-800">
              <div className="flex items-center justify-between bg-[#1A2235] p-5 rounded-2xl border border-slate-700/50">
                <div>
                  <p className="text-white font-black text-lg">Enable Auto Surge</p>
                  <p className="text-slate-400 text-xs mt-0.5">Fluctuates pivot prices by lead-time, weekend, length-of-stay & daily jitter. Deterministic so the quote shown matches the amount charged.</p>
                  <p className="text-[10px] font-bold text-slate-600 mt-1 uppercase tracking-widest">
                    Currently: <span className={autoSurgeEnabled ? "text-emerald-400" : "text-red-400"}>{autoSurgeEnabled ? "ACTIVE" : "OFF"}</span>
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setAutoSurgeEnabled(!autoSurgeEnabled)}
                  aria-pressed={autoSurgeEnabled}
                  className={`relative w-16 h-8 rounded-full transition-colors duration-300 shrink-0 focus:outline-none focus:ring-4 focus:ring-orange-500/30 ${autoSurgeEnabled ? "bg-orange-600" : "bg-slate-700"}`}
                >
                  <span className={`absolute top-1 left-1 w-6 h-6 bg-white rounded-full shadow-md transition-transform duration-300 flex items-center justify-center ${autoSurgeEnabled ? "translate-x-8" : "translate-x-0"}`}>
                    {autoSurgeEnabled ? <CheckCircle2 className="w-3.5 h-3.5 text-orange-600" /> : <AlertCircle className="w-3.5 h-3.5 text-slate-400" />}
                  </span>
                </button>
              </div>
            </div>

            {/* Config — dimmed when off */}
            <div className={`transition-opacity duration-300 ${!autoSurgeEnabled ? "opacity-30 pointer-events-none select-none" : ""}`}>

              {/* Max surge % */}
              <div className="p-6 md:p-8 border-b border-slate-800">
                <label className={labelCls}><TriangleAlert className="w-3 h-3 inline mr-1 text-orange-400" /> Max Surge (%)</label>
                <input type="number" step="1" min="0" max="100" value={autoSurgeMax}
                  onChange={e => setAutoSurgeMax(Math.max(0, Math.min(100, Number(e.target.value) || 0)))}
                  className={`${inputCls} [-webkit-text-fill-color:#fb923c]`} />
                <p className="text-[10px] text-slate-500 font-bold mt-2">Upper bound — prices can rise by up to this much. Recommended 10–20%.</p>
              </div>

              {/* Per-company opt-out */}
              <div className="p-6 md:p-8">
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 flex items-center gap-2 mb-3"><Network className="w-3.5 h-3.5" /> Pivot Companies — toggle off to exclude</p>
                {pivotCompanies.length === 0 ? (
                  <p className="text-xs text-slate-500 font-bold">No pivot-priced companies found.</p>
                ) : (
                  <div className="space-y-2">
                    {pivotCompanies.map((c) => {
                      const excluded = surgeExcluded.includes(String(c.id));
                      const on = !excluded;
                      return (
                        <div key={c.id} className="flex items-center justify-between bg-[#1A2235] p-4 rounded-xl border border-slate-700/50">
                          <div>
                            <p className="text-white font-black text-sm">{c.name}</p>
                            <p className="text-[10px] font-bold uppercase tracking-widest mt-0.5">
                              <span className={on ? "text-emerald-400" : "text-slate-500"}>{on ? "Surging" : "Excluded"}</span>
                            </p>
                          </div>
                          <button
                            type="button"
                            aria-pressed={on}
                            onClick={() => setSurgeExcluded(prev =>
                              excluded ? prev.filter(id => id !== String(c.id)) : [...prev, String(c.id)]
                            )}
                            className={`relative w-14 h-7 rounded-full transition-colors duration-300 shrink-0 focus:outline-none focus:ring-4 focus:ring-orange-500/30 ${on ? "bg-orange-600" : "bg-slate-700"}`}
                          >
                            <span className={`absolute top-1 left-1 w-5 h-5 bg-white rounded-full shadow-md transition-transform duration-300 ${on ? "translate-x-7" : "translate-x-0"}`} />
                          </button>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* ── SAVE ──────────────────────────────────────────────────────── */}
          <div className="bg-[#131A2B] rounded-[2rem] border border-slate-800 p-6 md:p-8">
            <button type="submit" disabled={isSaving}
              className={`w-full h-16 font-black text-sm uppercase tracking-widest rounded-2xl flex items-center justify-center gap-3 transition-all active:scale-95 disabled:opacity-60 text-white ${saved ? "bg-emerald-600 hover:bg-emerald-500 shadow-[0_15px_30px_-5px_rgba(16,185,129,0.4)]" : "bg-blue-600 hover:bg-blue-500 shadow-[0_15px_30px_-5px_rgba(37,99,235,0.4)]"}`}>
              {isSaving ? <><Loader2 className="w-5 h-5 animate-spin" /> Saving...</>
                : saved  ? <><CheckCircle2 className="w-5 h-5" /> Saved Successfully!</>
                :           <><Save className="w-5 h-5" /> Save Platform Settings</>}
            </button>
            {hasUnsaved && !isSaving && (
              <p className="text-center text-[10px] text-amber-400 font-bold uppercase tracking-widest mt-3 animate-pulse">● You have unsaved changes</p>
            )}
          </div>
        </form>

        {/* ── SECTION 5: PROMO QUICK MANAGER (outside form) ──────────────── */}
        <div className="max-w-3xl mt-6">
          <div className="bg-[#131A2B] rounded-[2rem] border border-slate-800 shadow-2xl overflow-hidden">
            <div className={sectionHeader}>
              <div className="w-11 h-11 bg-purple-500/10 rounded-2xl flex items-center justify-center shrink-0 border border-purple-500/20"><Tag className="w-5 h-5 text-purple-400" /></div>
              <div className="flex-1"><h2 className="text-lg font-black text-white tracking-tight">Promo Code Manager</h2><p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">Quick enable/disable without leaving settings</p></div>
              <Link href="/admin/promos" className="text-[10px] font-black uppercase tracking-widest text-blue-400 hover:text-blue-300 border border-blue-500/20 px-3 py-1.5 rounded-lg transition-all">Full Manager →</Link>
            </div>
            <div className="p-6 md:p-8">
              {loadingPromos ? (
                <div className="flex items-center gap-3 text-slate-500"><Loader2 className="w-4 h-4 animate-spin" /> Loading promos...</div>
              ) : promos.length === 0 ? (
                <p className="text-slate-500 text-sm font-bold">No promo codes found.</p>
              ) : (
                <div className="space-y-3">
                  {promos.map(promo => {
                    const isExpired = promo.expiry_date && new Date(promo.expiry_date) < new Date();
                    return (
                      <div key={promo.id} className={`flex items-center justify-between bg-[#1A2235] px-5 py-4 rounded-xl border transition-all ${promo.is_active && !isExpired ? "border-emerald-500/20" : "border-slate-700/50 opacity-60"}`}>
                        <div className="flex items-center gap-4">
                          <span className="font-black text-white tracking-widest text-sm">{promo.code}</span>
                          <span className="text-[10px] font-black uppercase tracking-widest text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded">{promo.discount_percent}% off</span>
                          {isExpired && <span className="text-[10px] font-black uppercase tracking-widest text-red-400 bg-red-500/10 px-2 py-0.5 rounded">Expired</span>}
                          {promo.expiry_date && !isExpired && <span className="text-[10px] text-slate-500 font-bold">Expires {new Date(promo.expiry_date).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}</span>}
                        </div>
                        <button type="button" disabled={!!isExpired || togglingPromo === promo.id} onClick={() => togglePromo(promo)}
                          className={`relative w-12 h-6 rounded-full transition-colors duration-300 disabled:opacity-40 ${promo.is_active ? "bg-emerald-600" : "bg-slate-700"}`}>
                          {togglingPromo === promo.id
                            ? <Loader2 className="w-3 h-3 animate-spin absolute inset-0 m-auto text-white" />
                            : <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform duration-300 ${promo.is_active ? "translate-x-6" : "translate-x-0"}`} />}
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* ── SECTION 6: API HEALTH CHECK ─────────────────────────────────── */}
        <div className="max-w-3xl mt-6">
          <div className="bg-[#131A2B] rounded-[2rem] border border-slate-800 shadow-2xl overflow-hidden">
            <div className={sectionHeader}>
              <div className="w-11 h-11 bg-blue-500/10 rounded-2xl flex items-center justify-center shrink-0 border border-blue-500/20"><Activity className="w-5 h-5 text-blue-400" /></div>
              <div className="flex-1"><h2 className="text-lg font-black text-white tracking-tight">API Gateway Health</h2><p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">Test all live API companies at once</p></div>
              <button type="button" onClick={runApiHealthCheck} disabled={testingApi || apiCompanies.length === 0}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 disabled:bg-slate-800 text-white rounded-xl text-[10px] font-black uppercase tracking-widest transition-all">
                {testingApi ? <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Testing...</> : <><Network className="w-3.5 h-3.5" /> Run All</>}
              </button>
            </div>
            <div className="p-6 md:p-8">
              {apiCompanies.length === 0 ? (
                <p className="text-slate-500 text-sm font-bold">No companies with API tokens found.</p>
              ) : (
                <div className="space-y-3">
                  {apiCompanies.map(c => {
                    const r = apiResults[c.id];
                    return (
                      <div key={c.id} className={`flex items-center justify-between bg-[#1A2235] px-5 py-4 rounded-xl border transition-all ${!r ? "border-slate-700/50" : r.ok ? "border-emerald-500/20" : "border-red-500/20"}`}>
                        <div>
                          <p className="font-black text-white text-sm">{c.name}</p>
                          <p className="text-[10px] text-slate-500 font-bold mt-0.5">
                            Surcharge: {c.dynamic_surcharge_percent || 0}% · Modifier: {c.price_modifier || 1}x
                          </p>
                        </div>
                        <div className="text-right">
                          {!r && <span className="text-[10px] text-slate-600 font-bold uppercase tracking-widest">Not tested</span>}
                          {r && (
                            <>
                              <div className={`text-sm font-black ${r.ok ? "text-emerald-400" : "text-red-400"}`}>
                                {r.ok ? r.price : r.error || "Failed"}
                              </div>
                              <div className="text-[10px] text-slate-500 font-bold">{r.ms}ms · HTTP {r.status}</div>
                            </>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* ── SECTION 7: DANGER ZONE ──────────────────────────────────────── */}
        <div className="max-w-3xl mt-6 mb-12">
          <div className="bg-[#131A2B] rounded-[2rem] border border-red-500/20 shadow-2xl overflow-hidden">
            <div className="p-6 md:p-8 border-b border-red-500/10 bg-red-500/5 flex items-center gap-4">
              <div className="w-11 h-11 bg-red-500/10 rounded-2xl flex items-center justify-center shrink-0 border border-red-500/20"><TriangleAlert className="w-5 h-5 text-red-400" /></div>
              <div><h2 className="text-lg font-black text-white tracking-tight">Danger Zone</h2><p className="text-[10px] font-bold text-red-400/70 uppercase tracking-widest mt-0.5">Irreversible actions — use with caution</p></div>
            </div>
            <div className="p-6 md:p-8">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-[#1A2235] p-5 rounded-xl border border-slate-700/50">
                <div>
                  <p className="text-white font-black">Reset All Price Modifiers</p>
                  <p className="text-slate-400 text-xs mt-0.5">Sets every company's price_modifier back to 1.0 (BASE). This cannot be undone.</p>
                </div>
                <button type="button" onClick={resetAllModifiers}
                  className="shrink-0 px-5 py-2.5 bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all">
                  Reset All
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* MOBILE BOTTOM NAV */}
        <div className="md:hidden fixed bottom-0 left-0 right-0 z-[100] px-2 pb-6 pt-2 bg-gradient-to-t from-[#0B1120] via-[#0B1120]/95 to-transparent pointer-events-none">
          <nav className="max-w-md mx-auto bg-slate-900/95 backdrop-blur-xl border border-slate-800 rounded-3xl h-20 flex items-center justify-around px-2 shadow-2xl pointer-events-auto">
            <Link href="/admin" className="flex flex-col items-center justify-center gap-1 text-slate-500 hover:text-slate-300 transition-colors"><LayoutDashboard className="w-5 h-5" /><span className="text-[8px] font-bold uppercase tracking-tighter">Live</span></Link>
            <Link href="/admin/companies" className="flex flex-col items-center justify-center gap-1 text-slate-500 hover:text-slate-300 transition-colors"><Building2 className="w-5 h-5" /><span className="text-[8px] font-bold uppercase tracking-tighter">Ops</span></Link>
            <Link href="/admin/promos" className="flex flex-col items-center justify-center gap-1 text-slate-500 hover:text-slate-300 transition-colors"><Tags className="w-5 h-5" /><span className="text-[8px] font-bold uppercase tracking-tighter">Promo</span></Link>
            <Link href="/admin/financials" className="flex flex-col items-center justify-center gap-1 text-slate-500 hover:text-slate-300 transition-colors"><PiggyBank className="w-5 h-5" /><span className="text-[8px] font-bold uppercase tracking-tighter">Finance</span></Link>
            <Link href="/admin/settings" className="flex flex-col items-center justify-center gap-1 text-blue-500 transition-all"><Settings2 className="w-5 h-5" /><span className="text-[8px] font-bold uppercase tracking-tighter">Settings</span></Link>
          </nav>
        </div>

      </main>
    </div>
  );
}