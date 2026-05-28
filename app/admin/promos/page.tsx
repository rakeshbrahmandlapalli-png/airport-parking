"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/app/lib/supabase";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Tags, Plus, Trash2, Save, X, Power,
  Plane, LayoutDashboard, Building2, CalendarDays, LogOut, Loader2, Settings2
} from "lucide-react";

export default function PromoManager() {
  const [promos, setPromos] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [newCode, setNewCode] = useState("");
  const [newPercent, setNewPercent] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValues, setEditValues] = useState<any>({});
  const [errorMsg, setErrorMsg] = useState("");

  const router = useRouter();

  useEffect(() => {
    const checkUser = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) router.push("/admin/login");
      else fetchPromos();
    };
    checkUser();
  }, [router]);

  // FIXED: order by "id" (the table has no created_at column, which caused a
  // 400 Bad Request and silently left the list empty). Also surfaces errors
  // instead of swallowing them.
  const fetchPromos = async () => {
    setLoading(true);
    setErrorMsg("");
    const { data, error } = await supabase
      .from("promotions")
      .select("*")
      .order("id", { ascending: false });

    if (error) {
      console.error("Promo fetch error:", error.message);
      setErrorMsg("Could not load promotions: " + error.message);
    }
    setPromos(data ?? []);
    setLoading(false);
  };

  const savePromo = async (promoData: any) => {
    const { error } = await supabase.from("promotions").upsert([promoData], { onConflict: "code" });
    if (!error) {
      setEditingId(null);
      setNewCode("");
      setNewPercent("");
      fetchPromos();
    } else {
      alert("Database Error: " + error.message);
    }
  };

  const deletePromo = async (id: string) => {
    if (!confirm("Delete this promo? This cannot be undone.")) return;
    const { error } = await supabase.from("promotions").delete().eq("id", id);
    if (error) alert("Delete failed: " + error.message);
    fetchPromos();
  };

  const startEdit = (p: any) => {
    setEditingId(p.id);
    setEditValues({ ...p });
  };

  const inputStyle = "w-full bg-[#1A2235] border border-slate-700/50 hover:border-blue-500/50 rounded-xl px-5 py-4 text-sm text-white font-bold outline-none focus:ring-2 focus:ring-blue-500/50 transition-all shadow-[0_0_0_1000px_#1A2235_inset] [-webkit-text-fill-color:white] placeholder:text-slate-500";

  if (loading) return (
    <div className="min-h-screen bg-[#0B1120] flex flex-col items-center justify-center text-white">
      <div className="relative">
        <div className="absolute inset-0 border-t-2 border-blue-500 rounded-full animate-spin"></div>
        <Plane className="w-10 h-10 text-blue-500 m-4 animate-pulse rotate-45" />
      </div>
      <p className="font-black text-slate-400 tracking-widest uppercase text-xs mt-6">Loading Discounts...</p>
    </div>
  );

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
          <Link href="/admin/promos" className="flex items-center gap-4 px-5 py-4 bg-blue-600 text-white rounded-xl shadow-[0_10px_20px_-5px_rgba(37,99,235,0.4)] transition-all hover:bg-blue-500">
            <Tags className="w-5 h-5" /> Promo Manager
          </Link>
          <Link href="/admin/schedule" className="flex items-center gap-4 px-5 py-4 hover:bg-white/5 hover:text-white rounded-xl transition-all">
            <CalendarDays className="w-5 h-5 text-slate-500" /> Operational Plan
          </Link>
        </nav>

        <div className="p-6">
          <button onClick={() => supabase.auth.signOut().then(() => router.push("/admin/login"))} className="flex items-center gap-4 text-sm font-bold hover:text-red-400 transition-colors w-full text-left px-5 py-4 group bg-slate-900/50 rounded-xl border border-slate-800/80 shadow-sm">
            <LogOut className="w-5 h-5 text-slate-500 group-hover:text-red-500 transition-colors" /> Secure Logout
          </button>
        </div>
      </aside>

      {/* WORKSPACE */}
      <main className="flex-1 p-4 md:p-8 lg:p-12 w-full overflow-y-auto h-screen relative pb-32 md:pb-12 custom-scrollbar">

        {/* MOBILE HEADER */}
        <div className="md:hidden flex items-center justify-between mb-8 bg-[#131A2B] p-5 rounded-3xl border border-slate-800 shadow-2xl">
          <div className="flex items-center gap-3 font-black text-xl uppercase tracking-tighter text-white">
            <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center shadow-lg shadow-blue-600/30">
              <Plane className="w-6 h-6 text-white rotate-45" />
            </div>
            OPS<span className="text-blue-500">CENTER</span>
          </div>
          <button onClick={() => router.push("/admin/login")} className="p-3 bg-slate-800 rounded-xl text-slate-300 hover:text-red-400 transition-colors">
            <LogOut className="w-5 h-5" />
          </button>
        </div>

        {/* HEADER */}
        <header className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 mb-12">
          <div>
            <h1 className="text-3xl md:text-4xl lg:text-5xl font-black text-white tracking-tight">Promo Manager</h1>
            <div className="text-slate-400 font-medium mt-3 text-xs uppercase tracking-widest flex items-center gap-3">
              <div className="w-2.5 h-2.5 rounded-full bg-blue-500 animate-pulse shadow-[0_0_10px_#3b82f6]"></div> Discount Engine
            </div>
          </div>
        </header>

        <div className="max-w-5xl">

          {/* Error banner (surfaces fetch failures instead of silent empty list) */}
          {errorMsg && (
            <div className="bg-red-500/10 border border-red-500/30 text-red-400 rounded-2xl px-6 py-4 mb-8 text-sm font-bold flex items-center gap-3">
              <X className="w-4 h-4 shrink-0" /> {errorMsg}
            </div>
          )}

          {/* Create New Form */}
          <div className="bg-[#131A2B] p-8 rounded-[2rem] border border-slate-800 shadow-xl mb-8 flex flex-col sm:flex-row gap-6 sm:items-end relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-600 to-indigo-600"></div>

            <div className="flex-1">
              <label className="text-[10px] font-black uppercase text-slate-500 block ml-1 tracking-widest mb-2">Discount Code</label>
              <input placeholder="E.g. AERO15" value={newCode} onChange={(e) => setNewCode(e.target.value.toUpperCase())} className={inputStyle} />
            </div>
            <div className="w-full sm:w-32">
              <label className="text-[10px] font-black uppercase text-slate-500 block ml-1 tracking-widest mb-2">Discount %</label>
              <input type="number" placeholder="15" value={newPercent} onChange={(e) => setNewPercent(e.target.value)} className={inputStyle} />
            </div>
            <button
              disabled={!newCode || !newPercent}
              onClick={() => savePromo({ code: newCode, discount_percent: Number(newPercent), is_active: true })}
              className="bg-blue-600 hover:bg-blue-500 disabled:opacity-50 disabled:hover:bg-blue-600 px-8 py-4 rounded-xl font-black text-sm text-white shadow-[0_10px_20px_-5px_rgba(37,99,235,0.4)] transition-all active:scale-95 flex items-center justify-center gap-2"
            >
              <Plus className="w-5 h-5" /> Generate
            </button>
          </div>

          {/* Promo List */}
          <div className="bg-[#131A2B] rounded-[2rem] border border-slate-800 overflow-hidden shadow-2xl">
            <table className="w-full text-left whitespace-nowrap">
              <thead className="bg-[#0F1523] border-b border-slate-800 text-[10px] font-black uppercase text-slate-500 tracking-[0.2em]">
                <tr>
                  <th className="px-8 py-6">Voucher Code</th>
                  <th className="px-8 py-6 text-center">Value (%)</th>
                  <th className="px-8 py-6 text-center">Engine Status</th>
                  <th className="px-8 py-6 text-right">System Controls</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {promos.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-8 py-12 text-center text-slate-500 font-bold text-sm">
                      No active promotions in the database.
                    </td>
                  </tr>
                ) : promos.map((p) => (
                  <tr key={p.id} className="hover:bg-slate-800/30 transition-all group">
                    <td className="px-8 py-6">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center">
                          <Tags className="w-5 h-5 text-blue-400" />
                        </div>
                        <span className="font-black text-white tracking-widest">{p.code}</span>
                      </div>
                    </td>

                    <td className="px-8 py-6 text-center">
                      {editingId === p.id ? (
                        <input type="number" className={`${inputStyle} w-24 text-center mx-auto`} value={editValues.discount_percent} onChange={(e) => setEditValues({ ...editValues, discount_percent: e.target.value })} />
                      ) : (
                        <span className="text-xl font-black text-emerald-400 tabular-nums">{p.discount_percent}%</span>
                      )}
                    </td>

                    <td className="px-8 py-6 text-center">
                      <button onClick={() => savePromo({ ...p, is_active: !p.is_active })} className={`px-4 py-1.5 rounded-lg border text-[10px] font-black uppercase tracking-widest flex items-center gap-2 mx-auto transition-all ${p.is_active ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/20" : "bg-slate-800 text-slate-500 border-slate-700 hover:bg-slate-700"}`}>
                        <Power className="w-3.5 h-3.5" /> {p.is_active ? "Active" : "Disabled"}
                      </button>
                    </td>

                    <td className="px-8 py-6 text-right">
                      <div className="flex items-center justify-end gap-2 opacity-30 group-hover:opacity-100 transition-all transform translate-x-2 group-hover:translate-x-0">
                        {editingId === p.id ? (
                          <>
                            <button onClick={() => savePromo(editValues)} className="p-2.5 bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500 hover:text-white rounded-lg border border-emerald-500/20 transition-all active:scale-95"><Save className="w-4 h-4" /></button>
                            <button onClick={() => setEditingId(null)} className="p-2.5 bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white rounded-lg border border-red-500/20 transition-all active:scale-95"><X className="w-4 h-4" /></button>
                          </>
                        ) : (
                          <>
                            <button onClick={() => startEdit(p)} className="p-2.5 bg-[#1A2235] text-slate-300 hover:bg-blue-600 hover:text-white rounded-lg border border-slate-700 hover:border-transparent transition-all active:scale-95"><Settings2 className="w-4 h-4" /></button>
                            <button onClick={() => deletePromo(p.id)} className="p-2.5 bg-[#1A2235] text-slate-500 hover:bg-red-500 hover:text-white rounded-lg border border-slate-700 hover:border-transparent transition-all active:scale-95"><Trash2 className="w-4 h-4" /></button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* MOBILE BOTTOM NAV */}
        <div className="md:hidden fixed bottom-0 left-0 right-0 z-[100] px-4 pb-6 pt-2 bg-gradient-to-t from-[#0B1120] via-[#0B1120]/95 to-transparent pointer-events-none">
          <nav className="max-w-md mx-auto bg-slate-900/95 backdrop-blur-xl border border-slate-800 rounded-3xl h-20 flex items-center justify-around px-5 shadow-2xl pointer-events-auto">
            <Link href="/admin" className="flex flex-col items-center justify-center gap-1 text-slate-500 hover:text-slate-300 transition-colors"><LayoutDashboard className="w-6 h-6" /><span className="text-[9px] font-bold uppercase tracking-tighter">Live</span></Link>
            <Link href="/admin/companies" className="flex flex-col items-center justify-center gap-1 text-slate-500 hover:text-slate-300 transition-colors"><Building2 className="w-6 h-6" /><span className="text-[9px] font-bold uppercase tracking-tighter">Ops</span></Link>
            <Link href="/admin/promos" className="flex flex-col items-center justify-center gap-1 text-blue-500 transition-all"><Tags className="w-6 h-6" /><span className="text-[9px] font-bold uppercase tracking-tighter">Promo</span></Link>
            <Link href="/admin/schedule" className="flex flex-col items-center justify-center gap-1 text-slate-500 hover:text-slate-300 transition-colors"><CalendarDays className="w-6 h-6" /><span className="text-[9px] font-bold uppercase tracking-tighter">Plan</span></Link>
            <button onClick={() => router.push("/admin/login")} className="flex flex-col items-center justify-center gap-1 text-slate-500 hover:text-red-400 transition-colors"><LogOut className="w-6 h-6" /><span className="text-[9px] font-bold uppercase tracking-tighter">Exit</span></button>
          </nav>
        </div>
      </main>
    </div>
  );
}
