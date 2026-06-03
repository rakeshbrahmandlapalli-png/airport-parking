"use client";

import { useState, useEffect, useMemo, Suspense } from "react";
import { supabase } from "@/app/lib/supabase";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Plane, LayoutDashboard, Building2, CalendarDays, LogOut, Loader2,
  Tags, Wallet, TrendingUp, CreditCard, Users, Download, Zap, PiggyBank,
  Filter, ChevronDown, ExternalLink, DollarSign, Plus, X, 
  Receipt, ArrowDownRight, FolderMinus, Save, CheckCircle2, Trash2
} from "lucide-react";

// ── Fee constants ──────────────────────────────────────────────
const STRIPE_PERCENT = 0.015;   // UK standard 1.5%
const STRIPE_FIXED = 0.20;      // + 20p per transaction
const FAST_TRACK_PRICE = 8.0;   // add-ons are 100% yours

type RangeKey = "all" | "month" | "week" | "today" | "custom";

// Parse a YYYY-MM-DD string to a LOCAL date at 00:00 (no UTC shift).
function parseLocalStart(dateStr: string): Date | null {
  if (!dateStr) return null;
  const [y, m, d] = dateStr.split("-").map(Number);
  if (!y || !m || !d) return null;
  return new Date(y, m - 1, d, 0, 0, 0, 0);
}
// Parse to LOCAL date at 23:59:59.999 (inclusive end of day).
function parseLocalEnd(dateStr: string): Date | null {
  if (!dateStr) return null;
  const [y, m, d] = dateStr.split("-").map(Number);
  if (!y || !m || !d) return null;
  return new Date(y, m - 1, d, 23, 59, 59, 999);
}
function toISODate(d: Date): string {
  return d.toISOString().split("T")[0];
}

function FinancialsContent() {
  const router = useRouter();
  const [bookings, setBookings] = useState<any[]>([]);
  const [companies, setCompanies] = useState<any[]>([]);
  const [expenses, setExpenses] = useState<any[]>([]); // 🟢 NEW: Expenses State
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [range, setRange] = useState<RangeKey>("all");

  // Custom range (used only when range === "custom")
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");

  // 🟢 NEW: Expense Modal State
  const [showExpenseModal, setShowExpenseModal] = useState(false);
  const defaultExpense = {
    description: "",
    amount: 0,
    category: "Software",
    is_recurring: false,
    date: toISODate(new Date())
  };
  const [newExpense, setNewExpense] = useState(defaultExpense);

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) router.push("/admin/login");
      else fetchData();
    };
    checkAuth();
  }, [router]);

  const fetchData = async () => {
    setLoading(true);
    const [bRes, cRes, eRes] = await Promise.all([
      supabase.from("bookings").select("*").neq("status", "cancelled").order("created_at", { ascending: false }),
      supabase.from("companies").select("*"),
      supabase.from("expenses").select("*").order("date", { ascending: false }) // 🟢 NEW: Fetch expenses
    ]);
    if (bRes.data) setBookings(bRes.data);
    if (cRes.data) setCompanies(cRes.data);
    if (eRes.data) setExpenses(eRes.data);
    
    if (bRes.error) console.error("financials bookings:", bRes.error);
    if (cRes.error) console.error("financials companies:", cRes.error);
    // Suppress expense error if table doesn't exist yet
    if (eRes.error && eRes.error.code !== '42P01') console.error("financials expenses:", eRes.error); 
    setLoading(false);
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push("/admin/login");
  };

  // 🟢 NEW: Handle Expense Creation
  const handleCreateExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      const { error } = await supabase.from('expenses').insert([newExpense]);
      if (error) throw error;
      setShowExpenseModal(false);
      setNewExpense(defaultExpense);
      fetchData(); // Refresh to show new expense
    } catch (error: any) {
      alert(`Error saving expense: ${error.message} \n\n(Make sure you have created the 'expenses' table in Supabase)`);
    } finally {
      setIsSaving(false);
    }
  };

  // 🟢 NEW: Handle Expense Deletion
  const deleteExpense = async (id: string) => {
    if (!confirm("Delete this expense record?")) return;
    const { error } = await supabase.from("expenses").delete().eq("id", id);
    if (!error) setExpenses(expenses.filter(e => e.id !== id));
  };

  const commissionFor = (companyId: string | null) => {
    if (!companyId) return 100; // Aero Direct: you keep 100% of parking
    const c = companies.find((x) => x.id === companyId);
    return c ? Number(c.commission_rate ?? 100) : 100;
  };

  const nameFor = (companyId: string | null) => {
    if (!companyId) return "Aero Direct";
    const c = companies.find((x) => x.id === companyId);
    return c ? c.name : "Aero Direct";
  };

  // ── Resolve the active [start, end] window from the range selector ─────────
  const { startDate, endDate, rangeLabel } = useMemo(() => {
    const now = new Date();
    if (range === "today") {
      const s = new Date(now); s.setHours(0, 0, 0, 0);
      return { startDate: s, endDate: now, rangeLabel: "Today" };
    }
    if (range === "week") {
      const s = new Date(now); s.setDate(s.getDate() - 7);
      return { startDate: s, endDate: now, rangeLabel: "Last 7 Days" };
    }
    if (range === "month") {
      const s = new Date(now); s.setMonth(s.getMonth() - 1);
      return { startDate: s, endDate: now, rangeLabel: "Last 30 Days" };
    }
    if (range === "custom") {
      const s = parseLocalStart(fromDate);
      const e = parseLocalEnd(toDate);
      const label =
        s && e ? `${toISODate(s)} → ${toISODate(e)}`
        : s ? `From ${toISODate(s)}`
        : e ? `Until ${toISODate(e)}`
        : "Custom (pick dates)";
      return { startDate: s, endDate: e, rangeLabel: label };
    }
    return { startDate: null, endDate: null, rangeLabel: "All Time" };
  }, [range, fromDate, toDate]);

  // ── Per-booking economics ───────────────────────────────────
  const computed = useMemo(() => {
    const rows = bookings
      .filter((b) => {
        const created = b.created_at ? new Date(b.created_at) : null;
        if (!created) return !startDate && !endDate; // undated rows only show in "all"
        if (startDate && created < startDate) return false;
        if (endDate && created > endDate) return false;
        return true;
      })
      .map((b) => {
        const total = Number(b.total_price || 0);
        const addOns = Number(b.fast_track_count || 0) * FAST_TRACK_PRICE;
        const parkingGross = Math.max(0, total - addOns);
        const commPct = commissionFor(b.company_id);
        const yourCommission = parkingGross * (commPct / 100);
        const operatorPayout = parkingGross - yourCommission;
        const stripeFee = total > 0 ? total * STRIPE_PERCENT + STRIPE_FIXED : 0;
        const yourNet = yourCommission + addOns - stripeFee;
        return {
          ...b,
          total, addOns, parkingGross, commPct,
          yourCommission, operatorPayout, stripeFee, yourNet,
          operatorName: nameFor(b.company_id),
        };
      });

    return rows;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bookings, companies, startDate, endDate]);

  // 🟢 NEW: Filter Expenses based on date range
  const filteredExpenses = useMemo(() => {
    return expenses.filter((exp) => {
      const expDate = exp.date ? new Date(exp.date) : null;
      if (!expDate) return !startDate && !endDate;
      if (startDate && expDate < startDate) return false;
      if (endDate && expDate > endDate) return false;
      return true;
    });
  }, [expenses, startDate, endDate]);

  // ── Totals ──────────────────────────────────────────────────
  const totals = useMemo(() => {
    const baseTotals = computed.reduce(
      (acc, r) => {
        acc.gross += r.total;
        acc.stripe += r.stripeFee;
        acc.operator += r.operatorPayout;
        acc.addOns += r.addOns;
        acc.net += r.yourNet;
        return acc;
      },
      { gross: 0, stripe: 0, operator: 0, addOns: 0, net: 0, opEx: 0, trueNet: 0 }
    );

    // 🟢 NEW: Add OpEx and calculate True Net
    baseTotals.opEx = filteredExpenses.reduce((sum, e) => sum + Number(e.amount || 0), 0);
    baseTotals.trueNet = baseTotals.net - baseTotals.opEx;

    return baseTotals;
  }, [computed, filteredExpenses]);

  // ── Per-operator rollup ─────────────────────────────────────
  const byOperator = useMemo(() => {
    const map = new Map<string, any>();
    computed.forEach((r) => {
      const key = r.company_id || "DIRECT";
      if (!map.has(key)) {
        map.set(key, {
          name: r.operatorName, commPct: r.commPct, isDirect: !r.company_id,
          gross: 0, operatorPayout: 0, yourCut: 0, count: 0,
        });
      }
      const o = map.get(key);
      o.gross += r.total;
      o.operatorPayout += r.operatorPayout;
      o.yourCut += r.yourCommission + r.addOns - r.stripeFee;
      o.count += 1;
    });
    return Array.from(map.values()).sort((a, b) => b.yourCut - a.yourCut);
  }, [computed]);

  const isCustomIncomplete = range === "custom" && (!startDate || !endDate);

  const exportCSV = () => {
    if (isCustomIncomplete) {
      alert("Please pick both a From and To date for a custom range before exporting.");
      return;
    }
    // Filename reflects the exact period selected.
    let periodTag: string;
    if (range === "custom" && startDate && endDate) {
      periodTag = `${toISODate(startDate)}_to_${toISODate(endDate)}`;
    } else if (range === "all") {
      periodTag = "all_time";
    } else {
      periodTag = range; // today | week | month
    }

    let csv = "AEROPARK DIRECT - PROFIT & LOSS STATEMENT\n";
    csv += `Range: ${rangeLabel}\n`;
    if (startDate) csv += `From: ${startDate.toLocaleString()}\n`;
    if (endDate) csv += `To: ${endDate.toLocaleString()}\n`;
    csv += `Bookings in period: ${computed.length}\n`;
    csv += `Generated: ${new Date().toLocaleString()}\n\n`;
    csv += "Ref,Date,Operator,Comm %,Total Charged,Add-ons,Parking Gross,Operator Payout,Your Commission,Stripe Fee,Net from Booking\n";
    computed.forEach((r) => {
      const created = r.created_at ? new Date(r.created_at).toLocaleDateString("en-GB") : "";
      csv += `${r.booking_ref},${created},${r.operatorName},${r.commPct}%,${r.total.toFixed(2)},${r.addOns.toFixed(2)},${r.parkingGross.toFixed(2)},${r.operatorPayout.toFixed(2)},${r.yourCommission.toFixed(2)},${r.stripeFee.toFixed(2)},${r.yourNet.toFixed(2)}\n`;
    });
    
    // 🟢 NEW: Export Expenses section
    csv += `\n\nOPERATING EXPENSES & SUBSCRIPTIONS\n`;
    csv += "Date,Description,Category,Recurring,Amount\n";
    filteredExpenses.forEach((e) => {
      const eDate = e.date ? new Date(e.date).toLocaleDateString("en-GB") : "";
      csv += `${eDate},"${e.description}",${e.category},${e.is_recurring ? 'Yes' : 'No'},${Number(e.amount).toFixed(2)}\n`;
    });

    csv += `\n\nFINAL TOTALS\n`;
    csv += `Gross Collected,${totals.gross.toFixed(2)}\n`;
    csv += `Operator Payouts,${totals.operator.toFixed(2)}\n`;
    csv += `Stripe Fees,${totals.stripe.toFixed(2)}\n`;
    csv += `Operating Expenses,${totals.opEx.toFixed(2)}\n`;
    csv += `TRUE NET PROFIT,${totals.trueNet.toFixed(2)}\n`;

    const blob = new Blob([csv], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `AeroPark_PnL_${periodTag}_${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0B1120] flex flex-col items-center justify-center text-white">
        <div className="relative">
          <div className="absolute inset-0 border-t-2 border-emerald-500 rounded-full animate-spin"></div>
          <PiggyBank className="w-10 h-10 text-emerald-500 m-4 animate-pulse" />
        </div>
        <p className="font-black text-slate-400 tracking-widest uppercase text-xs mt-6">Compiling Ledgers...</p>
      </div>
    );
  }

  const card = "bg-[#131A2B] border rounded-[2rem] p-8 relative overflow-hidden shadow-xl";
  const dateInputCls = "bg-[#131A2B] border border-slate-700 hover:border-blue-500/50 rounded-xl py-3 px-4 text-xs font-bold text-white outline-none focus:ring-2 focus:ring-blue-500/50 transition-all [color-scheme:dark] [-webkit-text-fill-color:white]";

  return (
    <div className="min-h-screen bg-[#0B1120] font-sans flex flex-col md:flex-row overflow-hidden text-slate-100 antialiased selection:bg-blue-600/30">

      {/* SIDEBAR */}
      <aside className="w-full md:w-64 bg-[#0F1523] text-slate-400 hidden md:flex flex-col sticky top-0 h-screen border-r border-slate-800/80 shadow-2xl z-50 shrink-0">
        <div className="p-8 flex items-center gap-4 text-white">
          <div className="w-10 h-10 bg-blue-600/10 rounded-xl flex items-center justify-center border border-blue-500/20 shadow-[0_0_15px_rgba(37,99,235,0.15)]">
            <Plane className="w-6 h-6 text-blue-500 rotate-45" />
          </div>
          <span className="font-black text-xl tracking-tighter uppercase">OPS <span className="text-blue-500">CENTER</span></span>
        </div>
        <nav className="px-5 space-y-3 flex-grow mt-6 font-bold text-sm">
          <Link href="/admin" className="flex items-center gap-4 px-5 py-4 hover:bg-white/5 hover:text-white rounded-xl transition-all">
            <LayoutDashboard className="w-5 h-5 text-slate-500" /> Live Board
          </Link>
          <Link href="/admin/companies" className="flex items-center gap-4 px-5 py-4 hover:bg-white/5 hover:text-white rounded-xl transition-all">
            <Building2 className="w-5 h-5 text-slate-500" /> Partner Network
          </Link>
          <Link href="/admin/promos" className="flex items-center gap-4 px-5 py-4 hover:bg-white/5 hover:text-white rounded-xl transition-all">
            <Tags className="w-5 h-5 text-slate-500" /> Promo Manager
          </Link>
          <Link href="/admin/financials" className="flex items-center gap-4 px-5 py-4 bg-emerald-600 text-white rounded-xl shadow-[0_10px_20px_-5px_rgba(16,185,129,0.4)] transition-all">
            <PiggyBank className="w-5 h-5" /> Financials
          </Link>
        </nav>
        <div className="p-6">
          <button onClick={handleLogout} className="flex items-center gap-4 text-sm font-bold hover:text-red-400 transition-colors w-full text-left px-5 py-4 group bg-slate-900/50 rounded-xl border border-slate-800/80 shadow-sm">
            <LogOut className="w-5 h-5 text-slate-500 group-hover:text-red-500 transition-colors" /> Secure Logout
          </button>
        </div>
      </aside>

      {/* MAIN */}
      <main className="flex-1 p-4 md:p-8 lg:p-12 w-full overflow-y-auto h-screen relative pb-32 md:pb-12 custom-scrollbar">

        {/* MOBILE HEADER */}
        <div className="md:hidden flex items-center justify-between mb-8 bg-[#131A2B] p-5 rounded-3xl border border-slate-800 shadow-2xl">
          <div className="flex items-center gap-3 font-black text-xl uppercase tracking-tighter text-white">
            <div className="w-10 h-10 bg-emerald-600 rounded-xl flex items-center justify-center shadow-lg shadow-emerald-600/30">
              <PiggyBank className="w-6 h-6 text-white" />
            </div>
            FINANCIAL<span className="text-emerald-500">HUB</span>
          </div>
          <button onClick={handleLogout} className="p-3 bg-slate-800 rounded-xl text-slate-300 hover:text-red-400 transition-colors"><LogOut className="w-5 h-5" /></button>
        </div>

        {/* DESKTOP HEADER */}
        <header className="flex flex-col lg:flex-row lg:items-start justify-between gap-6 mb-10">
          <div>
            <h1 className="text-3xl md:text-4xl lg:text-5xl font-black text-white tracking-tight">Financial Ledger</h1>
            <div className="text-slate-400 font-medium mt-3 text-xs uppercase tracking-widest flex items-center gap-3">
              <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_10px_#10b981]"></div>
              Real-Time Profit &amp; Loss
              <span className="text-emerald-400 normal-case tracking-normal font-bold">· {rangeLabel}</span>
            </div>
          </div>

          <div className="flex flex-col gap-3">
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="relative">
                <Filter className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 pointer-events-none z-10" />
                <select value={range} onChange={(e) => setRange(e.target.value as RangeKey)}
                  className="appearance-none bg-[#131A2B] border border-slate-700 hover:border-blue-500/50 rounded-xl py-4 pl-10 pr-10 text-[10px] font-black uppercase tracking-widest text-slate-300 outline-none cursor-pointer transition-all shadow-[0_0_0_1000px_#131A2B_inset]">
                  <option value="all">All Time</option>
                  <option value="today">Today</option>
                  <option value="week">Last 7 Days</option>
                  <option value="month">Last 30 Days</option>
                  <option value="custom">Custom Range…</option>
                </select>
                <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 pointer-events-none" />
              </div>
              <button onClick={exportCSV} disabled={isCustomIncomplete}
                className="px-6 py-4 bg-[#131A2B] hover:bg-[#1A2235] disabled:opacity-40 disabled:cursor-not-allowed border border-slate-700 text-white rounded-xl text-xs font-black uppercase tracking-[0.2em] transition-all flex items-center justify-center gap-3 shadow-md hover:shadow-lg">
                <Download className="w-4 h-4 text-blue-400" /> Export P&amp;L
              </button>
            </div>

            {/* Custom date pickers */}
            {range === "custom" && (
              <div className="flex flex-wrap items-end gap-3 bg-[#131A2B] border border-slate-800 rounded-2xl p-4 animate-in fade-in slide-in-from-top-2 duration-200">
                <div className="flex flex-col gap-1.5">
                  <label className="text-[9px] font-black uppercase tracking-widest text-slate-500 flex items-center gap-1"><CalendarDays className="w-3 h-3" /> From</label>
                  <input type="date" value={fromDate} max={toDate || undefined} onChange={(e) => setFromDate(e.target.value)} className={dateInputCls} />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-[9px] font-black uppercase tracking-widest text-slate-500 flex items-center gap-1"><CalendarDays className="w-3 h-3" /> To</label>
                  <input type="date" value={toDate} min={fromDate || undefined} onChange={(e) => setToDate(e.target.value)} className={dateInputCls} />
                </div>
                {(fromDate || toDate) && (
                  <button onClick={() => { setFromDate(""); setToDate(""); }}
                    className="flex items-center gap-1.5 px-3 py-3 text-[9px] font-black uppercase tracking-widest text-slate-400 hover:text-red-400 border border-slate-700 hover:border-red-500/30 rounded-xl transition-all">
                    <X className="w-3 h-3" /> Clear
                  </button>
                )}
                {isCustomIncomplete && (
                  <p className="text-[10px] font-bold text-amber-400 self-center">Pick both dates to enable export.</p>
                )}
              </div>
            )}
          </div>
        </header>

        {/* 🟢 EXPANDED 5-COLUMN HUD METRICS */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-6 mb-12">
          <div className={`${card} border-slate-800/80 group hover:border-blue-500/50 transition-colors`}>
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 mb-3 flex items-center gap-2"><Wallet className="w-4 h-4"/> Gross Collected</p>
            <p className="text-3xl font-black text-white tracking-tight tabular-nums">£{totals.gross.toFixed(2)}</p>
            <Wallet className="w-20 h-20 text-slate-500/10 absolute -right-4 -bottom-4 group-hover:scale-110 transition-transform" />
          </div>

          <div className={`${card} border-blue-900/40 group hover:border-blue-500/50 transition-colors`}>
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-blue-400 mb-3 flex items-center gap-2"><Users className="w-4 h-4"/> Operator Payouts</p>
            <p className="text-3xl font-black text-blue-400 tracking-tight tabular-nums">−£{totals.operator.toFixed(2)}</p>
            <Users className="w-20 h-20 text-blue-500/10 absolute -right-4 -bottom-4 group-hover:scale-110 transition-transform" />
          </div>

          <div className={`${card} border-rose-900/40 group hover:border-rose-500/50 transition-colors`}>
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-rose-400 mb-3 flex items-center gap-2"><CreditCard className="w-4 h-4"/> Stripe Fees</p>
            <p className="text-3xl font-black text-rose-400 tracking-tight tabular-nums">−£{totals.stripe.toFixed(2)}</p>
            <CreditCard className="w-20 h-20 text-rose-500/10 absolute -right-4 -bottom-4 group-hover:scale-110 transition-transform" />
          </div>

          {/* 🟢 NEW: Operating Expenses HUD */}
          <div className={`${card} border-rose-900/40 group hover:border-rose-500/50 transition-colors`}>
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-rose-400 mb-3 flex items-center gap-2"><FolderMinus className="w-4 h-4"/> OpEx & Subs</p>
            <p className="text-3xl font-black text-rose-400 tracking-tight tabular-nums">−£{totals.opEx.toFixed(2)}</p>
            <ArrowDownRight className="w-20 h-20 text-rose-500/10 absolute -right-4 -bottom-4 group-hover:scale-110 transition-transform" />
          </div>

          {/* 🟢 MODIFIED: True Net Profit (Subtracts Expenses) */}
          <div className="bg-gradient-to-br from-emerald-900/30 to-[#131A2B] border border-emerald-500/40 rounded-[2rem] p-8 relative overflow-hidden shadow-xl group">
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-emerald-400 mb-3 flex items-center gap-2"><TrendingUp className="w-4 h-4"/> True Net Profit</p>
            <p className="text-3xl font-black text-emerald-400 tracking-tight tabular-nums drop-shadow">£{totals.trueNet.toFixed(2)}</p>
            <TrendingUp className="w-20 h-20 text-emerald-500/10 absolute -right-4 -bottom-4 group-hover:scale-110 transition-transform" />
          </div>
        </div>

        {/* STRIPE PAYOUT BRIDGE */}
        <div className="bg-gradient-to-r from-[#635BFF]/10 to-indigo-900/20 border border-[#635BFF]/30 p-8 rounded-3xl mb-12 flex flex-col md:flex-row items-center justify-between gap-6 shadow-xl relative overflow-hidden">
           <div className="absolute top-0 right-0 w-64 h-64 bg-[#635BFF]/10 rounded-full blur-3xl pointer-events-none"></div>
           <div className="relative z-10">
             <h3 className="text-2xl font-black text-white flex items-center gap-3 tracking-tight"><DollarSign className="text-[#635BFF]"/> Payout Routing</h3>
             <p className="text-sm font-bold text-slate-400 mt-2 max-w-2xl leading-relaxed">
               Your revenue is processed securely via Stripe. Automated payouts transfer your available balance directly to your bank account. Manage manual top-ups or schedules in the portal.
             </p>
           </div>
           <button
             onClick={() => window.open('https://dashboard.stripe.com/settings/payouts', '_blank')}
             className="relative z-10 px-8 py-4 bg-[#635BFF] hover:bg-[#5851e5] text-white rounded-xl text-xs font-black uppercase tracking-widest shadow-[0_10px_20px_-5px_rgba(99,91,255,0.4)] hover:-translate-y-1 transition-all flex items-center gap-2 shrink-0"
           >
             <ExternalLink className="w-4 h-4" /> Configure Payouts
           </button>
        </div>

        {/* FAST TRACK STRIP */}
        <div className="bg-gradient-to-r from-amber-500/10 to-transparent border border-amber-500/20 rounded-2xl p-6 mb-10 flex items-center gap-5 relative overflow-hidden">
          <div className="absolute -left-4 -top-4 w-24 h-24 bg-amber-500/10 blur-2xl rounded-full"></div>
          <div className="w-12 h-12 bg-amber-500/20 border border-amber-500/30 rounded-xl flex items-center justify-center shrink-0 relative z-10">
            <Zap className="w-6 h-6 text-amber-400" />
          </div>
          <div className="relative z-10">
            <p className="text-[10px] font-black uppercase tracking-widest text-amber-400">Fast Track Add-ons (100% Margin)</p>
            <p className="text-2xl font-black text-white mt-1 tabular-nums tracking-tight">£{totals.addOns.toFixed(2)} <span className="text-xs font-bold text-slate-500 ml-2 tracking-normal">included in revenue</span></p>
          </div>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-2 gap-8 mb-12">
          {/* BY OPERATOR */}
          <div className="bg-[#131A2B] rounded-3xl border border-slate-800 overflow-hidden shadow-2xl flex flex-col">
            <div className="p-6 border-b border-slate-800 bg-[#0F1523]">
              <h4 className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400 flex items-center gap-2"><Building2 className="w-4 h-4"/> Profit By Operator</h4>
            </div>
            <div className="overflow-x-auto flex-1">
              <table className="w-full text-left whitespace-nowrap h-full">
                <thead className="border-b border-slate-800 text-[9px] font-black uppercase tracking-[0.2em] text-slate-500 bg-[#0B1120]">
                  <tr>
                    <th className="px-6 py-5">Operator Network</th>
                    <th className="px-4 py-5 text-center">Bookings</th>
                    <th className="px-4 py-5 text-right">Their Payout</th>
                    <th className="px-6 py-5 text-right text-emerald-400">Your Cut</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/50">
                  {byOperator.map((o, i) => (
                    <tr key={i} className="hover:bg-slate-800/30 transition-colors">
                      <td className="px-6 py-5 font-bold text-white text-sm">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-lg bg-slate-800 border border-slate-700 flex items-center justify-center text-slate-400 text-xs">
                            {o.name.charAt(0)}
                          </div>
                          {o.name}
                        </div>
                      </td>
                      <td className="px-4 py-5 text-center text-slate-400 font-bold text-xs tabular-nums">{o.count}</td>
                      <td className="px-4 py-5 text-right text-blue-400 font-bold text-xs tabular-nums">£{o.operatorPayout.toFixed(2)}</td>
                      <td className="px-6 py-5 text-right text-emerald-400 font-black text-sm tabular-nums">£{o.yourCut.toFixed(2)}</td>
                    </tr>
                  ))}
                  {byOperator.length === 0 && (
                    <tr><td colSpan={4} className="px-6 py-12 text-center text-slate-500 font-bold text-sm">No bookings in this period.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* 🟢 NEW: OPERATING EXPENSES & SUBSCRIPTIONS */}
          <div className="bg-[#131A2B] rounded-3xl border border-slate-800 overflow-hidden shadow-2xl flex flex-col">
            <div className="p-6 border-b border-slate-800 bg-[#0F1523] flex items-center justify-between">
              <h4 className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400 flex items-center gap-2"><Receipt className="w-4 h-4"/> OpEx & Subscriptions</h4>
              <button onClick={() => setShowExpenseModal(true)} className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-white bg-blue-600 hover:bg-blue-500 px-3 py-1.5 rounded-lg transition-colors shadow-md">
                <Plus className="w-3 h-3" /> Add Expense
              </button>
            </div>
            <div className="overflow-x-auto flex-1">
              <table className="w-full text-left whitespace-nowrap h-full">
                <thead className="border-b border-slate-800 text-[9px] font-black uppercase tracking-[0.2em] text-slate-500 bg-[#0B1120]">
                  <tr>
                    <th className="px-6 py-5">Date</th>
                    <th className="px-6 py-5">Description</th>
                    <th className="px-4 py-5 text-center">Category</th>
                    <th className="px-6 py-5 text-right text-rose-400">Amount</th>
                    <th className="px-4 py-5"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/50">
                  {filteredExpenses.map((e) => (
                    <tr key={e.id} className="hover:bg-slate-800/30 transition-colors">
                      <td className="px-6 py-5 text-xs font-bold text-slate-400 tabular-nums">{e.date ? new Date(e.date).toLocaleDateString("en-GB", { day: "2-digit", month: "short" }) : "—"}</td>
                      <td className="px-6 py-5 font-bold text-white text-sm">
                        <div className="flex flex-col gap-1">
                          <span>{e.description}</span>
                          {e.is_recurring && <span className="text-[8px] font-black uppercase tracking-widest bg-blue-500/10 text-blue-400 px-1.5 py-0.5 rounded border border-blue-500/20 w-max">Recurring</span>}
                        </div>
                      </td>
                      <td className="px-4 py-5 text-center text-slate-400 font-bold text-[10px] uppercase tracking-wider">{e.category}</td>
                      <td className="px-6 py-5 text-right text-rose-400 font-black text-sm tabular-nums">−£{Number(e.amount).toFixed(2)}</td>
                      <td className="px-4 py-5 text-right">
                        <button onClick={() => deleteExpense(e.id)} className="p-2 text-slate-500 hover:text-red-400 transition-colors"><Trash2 className="w-4 h-4" /></button>
                      </td>
                    </tr>
                  ))}
                  {filteredExpenses.length === 0 && (
                    <tr><td colSpan={5} className="px-6 py-12 text-center text-slate-500 font-bold text-sm">No expenses logged in this period.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* PER-BOOKING LEDGER */}
        <div className="bg-[#131A2B] rounded-3xl border border-slate-800 overflow-hidden shadow-2xl mb-24">
          <div className="p-6 border-b border-slate-800 bg-[#0F1523]">
            <h4 className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400 flex items-center gap-2"><LayoutDashboard className="w-4 h-4"/> Booking-Level Ledger ({computed.length})</h4>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left whitespace-nowrap">
              <thead className="border-b border-slate-800 text-[9px] font-black uppercase tracking-[0.2em] text-slate-500 bg-[#0B1120]">
                <tr>
                  <th className="px-8 py-5">Reference</th>
                  <th className="px-8 py-5">Date</th>
                  <th className="px-8 py-5">Operator</th>
                  <th className="px-8 py-5 text-right">Charged</th>
                  <th className="px-8 py-5 text-right">Fast Track</th>
                  <th className="px-8 py-5 text-right">Stripe Fee</th>
                  <th className="px-8 py-5 text-right">Operator Owed</th>
                  <th className="px-8 py-5 text-right text-emerald-400">Net Revenue</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/50">
                {computed.slice(0, 50).map((r) => (
                  <tr key={r.id} className="hover:bg-slate-800/30 transition-colors">
                    <td className="px-8 py-4 text-xs font-bold text-white">{r.booking_ref}</td>
                    <td className="px-8 py-4 text-[10px] font-bold text-slate-500 tabular-nums">{r.created_at ? new Date(r.created_at).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "2-digit" }) : "—"}</td>
                    <td className="px-8 py-4 text-[10px] font-black uppercase text-slate-500 tracking-widest">{r.operatorName}</td>
                    <td className="px-8 py-4 text-right text-xs font-bold text-slate-300 tabular-nums">£{r.total.toFixed(2)}</td>
                    <td className="px-8 py-4 text-right text-xs font-bold text-amber-400 tabular-nums">
                      {r.addOns > 0 ? `+£${r.addOns.toFixed(2)}` : <span className="text-slate-700">—</span>}
                    </td>
                    <td className="px-8 py-4 text-right text-xs font-bold text-rose-400 tabular-nums">−£{r.stripeFee.toFixed(2)}</td>
                    <td className="px-8 py-4 text-right text-xs font-bold text-blue-400 tabular-nums">£{r.operatorPayout.toFixed(2)}</td>
                    <td className="px-8 py-4 text-right text-xs font-black text-emerald-400 tabular-nums">£{r.yourNet.toFixed(2)}</td>
                  </tr>
                ))}
                {computed.length === 0 && (
                  <tr><td colSpan={8} className="px-8 py-12 text-center text-slate-500 font-bold text-sm">No bookings found in this period.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

      </main>

      {/* 🟢 NEW: ADD EXPENSE MODAL */}
      {showExpenseModal && (
        <div className="fixed inset-0 bg-[#0B1120]/95 backdrop-blur-sm z-[300] flex items-center justify-center p-4 overflow-hidden">
          <div className="bg-[#0F1523] border border-slate-800 w-full max-w-lg rounded-[2rem] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-6 border-b border-slate-800 flex justify-between items-center bg-[#131A2B] relative">
              <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-rose-500 to-red-500"></div>
              <div>
                <h2 className="text-xl font-black text-white tracking-tight">Log Expense</h2>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Operating Costs & Subscriptions</p>
              </div>
              <button onClick={() => setShowExpenseModal(false)} className="p-2 bg-[#1A2235] rounded-xl text-slate-400 hover:text-white border border-slate-700/50"><X className="w-5 h-5"/></button>
            </div>
            
            <form onSubmit={handleCreateExpense} className="p-8 space-y-6 text-white">
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase text-slate-500 block ml-1 tracking-widest">Description</label>
                <input required type="text" placeholder="e.g. Vercel Hosting, Google Ads" value={newExpense.description} onChange={(e) => setNewExpense({...newExpense, description: e.target.value})} 
                  className="w-full bg-[#1A2235] border border-slate-700 hover:border-blue-500/50 rounded-xl px-5 py-4 text-sm text-white font-bold outline-none focus:ring-2 focus:ring-blue-500/50 transition-all placeholder:text-slate-600" />
              </div>

              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase text-rose-400 block ml-1 tracking-widest">Amount (£)</label>
                  <input required type="number" step="0.01" min="0" value={newExpense.amount} onChange={(e) => setNewExpense({...newExpense, amount: parseFloat(e.target.value) || 0})} 
                    className="w-full bg-[#1A2235] border border-slate-700 hover:border-rose-500/50 rounded-xl px-5 py-4 text-xl text-rose-400 font-black outline-none focus:ring-2 focus:ring-rose-500/50 transition-all" />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase text-slate-500 block ml-1 tracking-widest">Date</label>
                  <input required type="date" value={newExpense.date} onChange={(e) => setNewExpense({...newExpense, date: e.target.value})} 
                    className="w-full bg-[#1A2235] border border-slate-700 hover:border-blue-500/50 rounded-xl px-5 py-4 text-sm text-white font-bold outline-none focus:ring-2 focus:ring-blue-500/50 transition-all [color-scheme:dark]" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase text-slate-500 block ml-1 tracking-widest">Category</label>
                  <div className="relative">
                    <select value={newExpense.category} onChange={(e) => setNewExpense({...newExpense, category: e.target.value})} 
                      className="w-full appearance-none bg-[#1A2235] border border-slate-700 hover:border-blue-500/50 rounded-xl px-5 py-4 text-sm text-white font-bold outline-none cursor-pointer focus:ring-2 focus:ring-blue-500/50 transition-all">
                      <option value="Software">Software & Hosting</option>
                      <option value="Marketing">Marketing & Ads</option>
                      <option value="Operations">Operations</option>
                      <option value="Contractors">Contractors</option>
                      <option value="Other">Other</option>
                    </select>
                    <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 pointer-events-none" />
                  </div>
                </div>
                <div className="space-y-2 flex flex-col justify-end pb-2">
                  <label className="flex items-center gap-3 cursor-pointer group">
                    <div className="relative flex items-center justify-center w-6 h-6 rounded bg-[#1A2235] border border-slate-700 group-hover:border-blue-500 transition-colors">
                      <input type="checkbox" checked={newExpense.is_recurring} onChange={(e) => setNewExpense({...newExpense, is_recurring: e.target.checked})} className="opacity-0 absolute" />
                      {newExpense.is_recurring && <CheckCircle2 className="w-4 h-4 text-blue-500" />}
                    </div>
                    <span className="text-xs font-bold text-slate-300">Monthly Recurring</span>
                  </label>
                </div>
              </div>

              <div className="pt-6 border-t border-slate-800 flex gap-4 mt-8">
                 <button type="button" onClick={() => setShowExpenseModal(false)} className="px-6 py-4 text-slate-400 font-bold text-xs hover:text-white transition-colors">Cancel</button>
                 <button type="submit" disabled={isSaving} className="flex-1 bg-rose-600 hover:bg-rose-500 py-4 rounded-xl font-bold text-sm text-white shadow-md transition-all flex items-center justify-center gap-2 active:scale-95">
                  {isSaving ? <Loader2 className="animate-spin w-4 h-4" /> : <Save className="w-4 h-4"/>} Save Expense
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MOBILE BOTTOM NAV */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 z-[100] px-4 pb-6 pt-2 bg-gradient-to-t from-[#0B1120] via-[#0B1120]/95 to-transparent pointer-events-none">
        <nav className="max-w-md mx-auto bg-slate-900/95 backdrop-blur-xl border border-slate-800 rounded-3xl h-20 flex items-center justify-around px-5 shadow-2xl pointer-events-auto">
          <Link href="/admin" className="flex flex-col items-center justify-center gap-1 text-slate-500 hover:text-slate-300 transition-colors"><LayoutDashboard className="w-6 h-6" /><span className="text-[9px] font-bold uppercase tracking-tighter">Live</span></Link>
          <Link href="/admin/companies" className="flex flex-col items-center justify-center gap-1 text-slate-500 hover:text-slate-300 transition-colors"><Building2 className="w-6 h-6" /><span className="text-[9px] font-bold uppercase tracking-tighter">Ops</span></Link>
          <div className="relative -top-8">
             <button onClick={() => router.push('/admin')} className="w-16 h-16 bg-blue-600 rounded-2xl flex items-center justify-center shadow-lg shadow-blue-500/30 border-4 border-[#0B1120] active:scale-95 transition-transform"><Plus className="w-8 h-8 text-white" /></button>
          </div>
          <Link href="/admin/financials" className="flex flex-col items-center justify-center gap-1 text-emerald-500 transition-all"><PiggyBank className="w-6 h-6" /><span className="text-[9px] font-bold uppercase tracking-tighter">Finance</span></Link>
          <Link href="/admin/promos" className="flex flex-col items-center justify-center gap-1 text-slate-500 hover:text-slate-300 transition-colors"><Tags className="w-6 h-6" /><span className="text-[9px] font-bold uppercase tracking-tighter">Promos</span></Link>
        </nav>
      </div>
    </div>
  );
}

export default function FinancialsPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-[#0B1120] flex flex-col items-center justify-center text-white">
        <div className="relative">
          <div className="absolute inset-0 border-t-2 border-emerald-500 rounded-full animate-spin"></div>
          <PiggyBank className="w-10 h-10 text-emerald-500 m-4 animate-pulse" />
        </div>
        <p className="font-black text-slate-400 tracking-widest uppercase text-xs mt-6">Compiling Ledgers...</p>
      </div>
    }>
      <FinancialsContent />
    </Suspense>
  );
}