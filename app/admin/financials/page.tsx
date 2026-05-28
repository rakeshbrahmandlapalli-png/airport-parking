"use client";

import { useState, useEffect, useMemo, Suspense } from "react";
import { supabase } from "@/app/lib/supabase";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Plane, LayoutDashboard, Building2, CalendarDays, LogOut, Loader2,
  Tags, Wallet, TrendingUp, CreditCard, Users, Download, Zap, PiggyBank, 
  Filter, ChevronDown, ExternalLink, DollarSign, Plus
} from "lucide-react";

// ── Fee constants ──────────────────────────────────────────────
const STRIPE_PERCENT = 0.015;   // UK standard 1.5%
const STRIPE_FIXED = 0.20;      // + 20p per transaction
const FAST_TRACK_PRICE = 8.0;   // add-ons are 100% yours

function FinancialsContent() {
  const router = useRouter();
  const [bookings, setBookings] = useState<any[]>([]);
  const [companies, setCompanies] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [range, setRange] = useState<"all" | "month" | "week">("all");

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
    const [bRes, cRes] = await Promise.all([
      supabase.from("bookings").select("*").neq("status", "cancelled").order("created_at", { ascending: false }),
      supabase.from("companies").select("*"),
    ]);
    if (bRes.data) setBookings(bRes.data);
    if (cRes.data) setCompanies(cRes.data);
    if (bRes.error) console.error("financials bookings:", bRes.error);
    if (cRes.error) console.error("financials companies:", cRes.error);
    setLoading(false);
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push("/admin/login");
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

  // ── Per-booking economics ───────────────────────────────────
  const computed = useMemo(() => {
    const now = new Date();
    const cutoff = (() => {
      if (range === "month") { const d = new Date(now); d.setMonth(d.getMonth() - 1); return d; }
      if (range === "week") { const d = new Date(now); d.setDate(d.getDate() - 7); return d; }
      return null;
    })();

    const rows = bookings
      .filter((b) => {
        if (!cutoff) return true;
        const created = b.created_at ? new Date(b.created_at) : null;
        return created ? created >= cutoff : true;
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
  }, [bookings, companies, range]);

  // ── Totals ──────────────────────────────────────────────────
  const totals = useMemo(() => {
    return computed.reduce(
      (acc, r) => {
        acc.gross += r.total;
        acc.stripe += r.stripeFee;
        acc.operator += r.operatorPayout;
        acc.addOns += r.addOns;
        acc.net += r.yourNet;
        return acc;
      },
      { gross: 0, stripe: 0, operator: 0, addOns: 0, net: 0 }
    );
  }, [computed]);

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

  const exportCSV = () => {
    let csv = "AEROPARK DIRECT - PROFIT & LOSS STATEMENT\n";
    csv += `Range: ${range}\nGenerated: ${new Date().toLocaleString()}\n\n`;
    csv += "Ref,Operator,Comm %,Total Charged,Add-ons,Parking Gross,Operator Payout,Your Commission,Stripe Fee,Your Net Profit\n";
    computed.forEach((r) => {
      csv += `${r.booking_ref},${r.operatorName},${r.commPct}%,${r.total.toFixed(2)},${r.addOns.toFixed(2)},${r.parkingGross.toFixed(2)},${r.operatorPayout.toFixed(2)},${r.yourCommission.toFixed(2)},${r.stripeFee.toFixed(2)},${r.yourNet.toFixed(2)}\n`;
    });
    csv += `\nTOTALS,,,${totals.gross.toFixed(2)},${totals.addOns.toFixed(2)},,${totals.operator.toFixed(2)},,${totals.stripe.toFixed(2)},${totals.net.toFixed(2)}\n`;
    const blob = new Blob([csv], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `AeroPark_PnL_${range}_${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
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

  return (
    <div className="min-h-screen bg-[#0B1120] font-sans flex flex-col md:flex-row overflow-hidden text-slate-100 antialiased selection:bg-blue-600/30">

      {/* 🟢 PREMIUM SIDEBAR */}
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

      {/* 🟢 MAIN WORKSPACE */}
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
        <header className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 mb-10">
          <div>
            <h1 className="text-3xl md:text-4xl lg:text-5xl font-black text-white tracking-tight">Financial Ledger</h1>
            <div className="text-slate-400 font-medium mt-3 text-xs uppercase tracking-widest flex items-center gap-3">
              <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_10px_#10b981]"></div> Real-Time Profit & Loss
            </div>
          </div>
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative">
              <Filter className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 pointer-events-none" />
              <select value={range} onChange={(e) => setRange(e.target.value as any)}
                className="appearance-none bg-[#131A2B] border border-slate-700 hover:border-blue-500/50 rounded-xl py-4 pl-10 pr-10 text-[10px] font-black uppercase tracking-widest text-slate-300 outline-none cursor-pointer transition-all shadow-[0_0_0_1000px_#131A2B_inset]">
                <option value="all">All Time</option>
                <option value="month">Last 30 Days</option>
                <option value="week">Last 7 Days</option>
              </select>
              <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 pointer-events-none" />
            </div>
            <button onClick={exportCSV} className="px-6 py-4 bg-[#131A2B] hover:bg-[#1A2235] border border-slate-700 text-white rounded-xl text-xs font-black uppercase tracking-[0.2em] transition-all flex items-center justify-center gap-3 shadow-md hover:shadow-lg">
              <Download className="w-4 h-4 text-blue-400" /> Export P&L
            </button>
          </div>
        </header>

        {/* 🟢 HUD METRICS */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
          <div className={`${card} border-slate-800/80 group hover:border-blue-500/50 transition-colors`}>
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 mb-3 flex items-center gap-2"><Wallet className="w-4 h-4"/> Gross Collected</p>
            <p className="text-3xl font-black text-white tracking-tight tabular-nums">£{totals.gross.toFixed(2)}</p>
            <Wallet className="w-20 h-20 text-slate-500/10 absolute -right-4 -bottom-4 group-hover:scale-110 transition-transform" />
          </div>
          
          <div className={`${card} border-red-900/40 group hover:border-red-500/50 transition-colors`}>
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-red-400 mb-3 flex items-center gap-2"><CreditCard className="w-4 h-4"/> Stripe Fees</p>
            <p className="text-3xl font-black text-red-400 tracking-tight tabular-nums">−£{totals.stripe.toFixed(2)}</p>
            <CreditCard className="w-20 h-20 text-red-500/10 absolute -right-4 -bottom-4 group-hover:scale-110 transition-transform" />
          </div>
          
          <div className={`${card} border-blue-900/40 group hover:border-blue-500/50 transition-colors`}>
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-blue-400 mb-3 flex items-center gap-2"><Users className="w-4 h-4"/> Operator Payouts</p>
            <p className="text-3xl font-black text-blue-400 tracking-tight tabular-nums">−£{totals.operator.toFixed(2)}</p>
            <Users className="w-20 h-20 text-blue-500/10 absolute -right-4 -bottom-4 group-hover:scale-110 transition-transform" />
          </div>
          
          <div className="bg-gradient-to-br from-emerald-900/30 to-[#131A2B] border border-emerald-500/40 rounded-[2rem] p-8 relative overflow-hidden shadow-xl group">
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-emerald-400 mb-3 flex items-center gap-2"><TrendingUp className="w-4 h-4"/> Your Net Profit</p>
            <p className="text-3xl font-black text-emerald-400 tracking-tight tabular-nums drop-shadow">£{totals.net.toFixed(2)}</p>
            <TrendingUp className="w-20 h-20 text-emerald-500/10 absolute -right-4 -bottom-4 group-hover:scale-110 transition-transform" />
          </div>
        </div>

        {/* 🟢 STRIPE PAYOUT MANAGEMENT BRIDGE */}
        <div className="bg-gradient-to-r from-[#635BFF]/10 to-indigo-900/20 border border-[#635BFF]/30 p-8 rounded-3xl mb-12 flex flex-col md:flex-row items-center justify-between gap-6 shadow-xl relative overflow-hidden">
           <div className="absolute top-0 right-0 w-64 h-64 bg-[#635BFF]/10 rounded-full blur-3xl pointer-events-none"></div>
           <div className="relative z-10">
             <h3 className="text-2xl font-black text-white flex items-center gap-3 tracking-tight"><DollarSign className="text-[#635BFF]"/> Payout Routing</h3>
             <p className="text-sm font-bold text-slate-400 mt-2 max-w-2xl leading-relaxed">
               Your revenue is processed securely via Stripe. Automated payouts transfer your available balance directly to your ClearBank account. You can manage manual top-ups or disable automated schedules directly in the portal.
             </p>
           </div>
           <button 
              onClick={() => window.open('https://dashboard.stripe.com/settings/payouts', '_blank')}
              className="relative z-10 px-8 py-4 bg-[#635BFF] hover:bg-[#5851e5] text-white rounded-xl text-xs font-black uppercase tracking-widest shadow-[0_10px_20px_-5px_rgba(99,91,255,0.4)] hover:-translate-y-1 transition-all flex items-center gap-2 shrink-0"
           >
             <ExternalLink className="w-4 h-4" /> Configure Payouts
           </button>
        </div>

        {/* 🟢 FAST TRACK ADD-ONS STRIP */}
        <div className="bg-gradient-to-r from-amber-500/10 to-transparent border border-amber-500/20 rounded-2xl p-6 mb-10 flex items-center gap-5 relative overflow-hidden">
          <div className="absolute -left-4 -top-4 w-24 h-24 bg-amber-500/10 blur-2xl rounded-full"></div>
          <div className="w-12 h-12 bg-amber-500/20 border border-amber-500/30 rounded-xl flex items-center justify-center shrink-0 relative z-10">
            <Zap className="w-6 h-6 text-amber-400" />
          </div>
          <div className="relative z-10">
            <p className="text-[10px] font-black uppercase tracking-widest text-amber-400">Fast Track Add-ons (100% Margin)</p>
            <p className="text-2xl font-black text-white mt-1 tabular-nums tracking-tight">£{totals.addOns.toFixed(2)} <span className="text-xs font-bold text-slate-500 ml-2 tracking-normal">included in net profit</span></p>
          </div>
        </div>

        {/* 🟢 BY OPERATOR TABLE */}
        <div className="bg-[#131A2B] rounded-3xl border border-slate-800 overflow-hidden shadow-2xl mb-12">
          <div className="p-6 border-b border-slate-800 bg-[#0F1523]">
            <h4 className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400 flex items-center gap-2"><Building2 className="w-4 h-4"/> Profit By Operator</h4>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left whitespace-nowrap">
              <thead className="border-b border-slate-800 text-[9px] font-black uppercase tracking-[0.2em] text-slate-500 bg-[#0B1120]">
                <tr>
                  <th className="px-8 py-5">Operator Network</th>
                  <th className="px-8 py-5 text-center">Comm %</th>
                  <th className="px-8 py-5 text-center">Bookings</th>
                  <th className="px-8 py-5 text-right">Gross Processed</th>
                  <th className="px-8 py-5 text-right">Their Payout</th>
                  <th className="px-8 py-5 text-right text-emerald-400">Your Cut</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/50">
                {byOperator.map((o, i) => (
                  <tr key={i} className="hover:bg-slate-800/30 transition-colors">
                    <td className="px-8 py-5 font-bold text-white text-sm">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-slate-800 border border-slate-700 flex items-center justify-center text-slate-400 text-xs">
                          {o.name.charAt(0)}
                        </div>
                        {o.name}
                        {o.isDirect && <span className="ml-2 text-[8px] font-black uppercase tracking-widest bg-blue-500/10 text-blue-400 px-2 py-0.5 rounded border border-blue-500/20">Internal</span>}
                      </div>
                    </td>
                    <td className="px-8 py-5 text-center text-slate-400 font-bold text-xs">{o.commPct}%</td>
                    <td className="px-8 py-5 text-center text-slate-400 font-bold text-xs tabular-nums">{o.count}</td>
                    <td className="px-8 py-5 text-right text-slate-300 font-bold text-xs tabular-nums">£{o.gross.toFixed(2)}</td>
                    <td className="px-8 py-5 text-right text-blue-400 font-bold text-xs tabular-nums">£{o.operatorPayout.toFixed(2)}</td>
                    <td className="px-8 py-5 text-right text-emerald-400 font-black text-sm tabular-nums">£{o.yourCut.toFixed(2)}</td>
                  </tr>
                ))}
                {byOperator.length === 0 && (
                  <tr><td colSpan={6} className="px-8 py-12 text-center text-slate-500 font-bold text-sm">No bookings in this period.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* 🟢 PER-BOOKING LEDGER */}
        <div className="bg-[#131A2B] rounded-3xl border border-slate-800 overflow-hidden shadow-2xl mb-24">
          <div className="p-6 border-b border-slate-800 bg-[#0F1523]">
            <h4 className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400 flex items-center gap-2"><LayoutDashboard className="w-4 h-4"/> Booking-Level Ledger ({computed.length})</h4>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left whitespace-nowrap">
              <thead className="border-b border-slate-800 text-[9px] font-black uppercase tracking-[0.2em] text-slate-500 bg-[#0B1120]">
                <tr>
                  <th className="px-8 py-5">Reference</th>
                  <th className="px-8 py-5">Operator</th>
                  <th className="px-8 py-5 text-right">Charged</th>
                  <th className="px-8 py-5 text-right">Fast Track</th>
                  <th className="px-8 py-5 text-right">Stripe Fee</th>
                  <th className="px-8 py-5 text-right">Operator Owed</th>
                  <th className="px-8 py-5 text-right text-emerald-400">Your Net</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/50">
                {computed.slice(0, 50).map((r) => (
                  <tr key={r.id} className="hover:bg-slate-800/30 transition-colors">
                    <td className="px-8 py-4 text-xs font-bold text-white">{r.booking_ref}</td>
                    <td className="px-8 py-4 text-[10px] font-black uppercase text-slate-500 tracking-widest">{r.operatorName}</td>
                    <td className="px-8 py-4 text-right text-xs font-bold text-slate-300 tabular-nums">£{r.total.toFixed(2)}</td>
                    <td className="px-8 py-4 text-right text-xs font-bold text-amber-400 tabular-nums">
                      {r.addOns > 0 ? `+£${r.addOns.toFixed(2)}` : <span className="text-slate-700">—</span>}
                    </td>
                    <td className="px-8 py-4 text-right text-xs font-bold text-red-400 tabular-nums">−£{r.stripeFee.toFixed(2)}</td>
                    <td className="px-8 py-4 text-right text-xs font-bold text-blue-400 tabular-nums">£{r.operatorPayout.toFixed(2)}</td>
                    <td className="px-8 py-4 text-right text-xs font-black text-emerald-400 tabular-nums">£{r.yourNet.toFixed(2)}</td>
                  </tr>
                ))}
                {computed.length === 0 && (
                  <tr><td colSpan={7} className="px-8 py-12 text-center text-slate-500 font-bold text-sm">No bookings found.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

      </main>

      {/* 🟢 FIXED MOBILE BOTTOM NAV */}
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