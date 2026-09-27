"use client";

import { logger } from "@/app/lib/logger";
import { useState, useEffect, useMemo } from "react";
import { supabase } from "@/app/lib/supabase";
import { recordAdminAction } from "@/app/lib/audit-client";
import { useRouter } from "next/navigation";
import { AdminSidebar, AdminMobileNav } from "@/components/admin/AdminNav";
import {
  Tags, Plus, Trash2, Save, X, Power, Plane,
  Settings2, Percent, CheckCircle2,
} from "lucide-react";

export default function PromoManager() {
  const [promos, setPromos] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [newCode, setNewCode] = useState("");
  const [newPercent, setNewPercent] = useState("");
  const [newMessage, setNewMessage] = useState("");
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
      logger.error("Promo fetch error:", error.message);
      setErrorMsg("Could not load promotions: " + error.message);
    }
    setPromos(data ?? []);
    setLoading(false);
  };

  const savePromo = async (promoData: any) => {
    const wasEditing = !!editingId;
    const prev = wasEditing ? promos.find((p) => p.id === editingId) : null;
    const { error } = await supabase.from("promotions").upsert([promoData], { onConflict: "code" });
    if (!error) {
      // Audit: distinguish enable/disable from a value edit / create.
      const activeChanged = !!prev && prev.is_active !== promoData.is_active;
      const actionType = activeChanged
        ? (promoData.is_active ? "promo.enable" : "promo.disable")
        : (wasEditing ? "promo.update" : "promo.create");
      recordAdminAction({
        actionType,
        entityType: "promotion",
        entityId: promoData.id ?? promoData.code,
        metadata: {
          label: `Promo ${promoData.code}`,
          before: prev
            ? (activeChanged ? (prev.is_active ? "active" : "disabled") : `${prev.discount_percent}% off`)
            : undefined,
          after: activeChanged
            ? (promoData.is_active ? "active" : "disabled")
            : `${promoData.discount_percent}% off`,
        },
      });
      setEditingId(null);
      setNewCode("");
      setNewPercent("");
      setNewMessage("");
      fetchPromos();
    } else {
      alert("Database Error: " + error.message);
    }
  };

  const deletePromo = async (id: string) => {
    if (!confirm("Delete this promo? This cannot be undone.")) return;
    const target = promos.find((p) => p.id === id);
    const { error } = await supabase.from("promotions").delete().eq("id", id);
    if (error) {
      alert("Delete failed: " + error.message);
    } else {
      recordAdminAction({
        actionType: "promo.delete",
        entityType: "promotion",
        entityId: id,
        metadata: { label: `Promo ${target?.code ?? id}`, before: target ? `${target.discount_percent}% off` : undefined, after: "deleted" },
      });
    }
    fetchPromos();
  };

  const startEdit = (p: any) => {
    setEditingId(p.id);
    setEditValues({ ...p });
  };

  const stats = useMemo(() => {
    const total = promos.length;
    const active = promos.filter((p) => p.is_active).length;
    const disabled = total - active;
    const avg = total ? promos.reduce((s, p) => s + (Number(p.discount_percent) || 0), 0) / total : 0;
    return { total, active, disabled, avg };
  }, [promos]);

  const inputStyle = "w-full bg-panel-3 border border-fg/[0.12] hover:border-blue-500/50 rounded-xl px-5 py-4 text-sm text-fg font-bold outline-none focus:ring-2 focus:ring-blue-500/50 transition-all shadow-[0_0_0_1000px_#1A2235_inset] [-webkit-text-fill-color:rgb(var(--admin-fg))] placeholder:text-fg-4";

  if (loading) return (
    <div className="min-h-screen bg-gradient-to-b from-canvas via-canvas to-canvas flex flex-col items-center justify-center text-fg relative overflow-hidden">
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-blue-600/10 rounded-full blur-[120px]"></div>
      <div className="relative z-10">
        <div className="absolute inset-0 border-t-2 border-blue-500 rounded-full animate-spin"></div>
        <Plane className="w-10 h-10 text-blue-500 m-4 animate-pulse rotate-45" />
      </div>
      <p className="font-black text-fg-3 tracking-widest uppercase text-xs mt-6 relative z-10">Loading Discounts...</p>
    </div>
  );

  return (
    <div className="min-h-screen bg-gradient-to-b from-canvas via-canvas to-canvas font-sans flex flex-col md:flex-row overflow-hidden text-fg antialiased selection:bg-blue-600/30 relative">

      {/* 🌌 AMBIENT BACKGROUND GLOW LAYERS */}
      <div className="fixed top-[-200px] left-[200px] w-[600px] h-[600px] bg-blue-600/8 rounded-full blur-[140px] pointer-events-none z-0"></div>
      <div className="fixed bottom-[-200px] right-[100px] w-[500px] h-[500px] bg-indigo-600/8 rounded-full blur-[140px] pointer-events-none z-0"></div>
      <div className="fixed top-[40%] right-[30%] w-[400px] h-[400px] bg-emerald-600/5 rounded-full blur-[120px] pointer-events-none z-0"></div>

      <AdminSidebar />

      {/* WORKSPACE */}
      <main className="flex-1 p-4 md:p-8 lg:p-12 w-full overflow-y-auto h-screen relative pb-32 md:pb-12 custom-scrollbar z-10">

        {/* 🟢 COMMAND HERO PANEL (header + stat rail, one unit) */}
        <div className="relative mb-8 rounded-[2rem] border border-fg/[0.08] bg-gradient-to-br from-panel-2 to-panel shadow-2xl overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-blue-500/40 to-transparent"></div>
          <div className="absolute -top-24 -left-24 w-72 h-72 bg-blue-600/10 rounded-full blur-[100px] pointer-events-none"></div>
          <div className="absolute -bottom-24 -right-24 w-72 h-72 bg-indigo-600/10 rounded-full blur-[100px] pointer-events-none"></div>

          {/* ROW 1 — title */}
          <div className="relative p-6 md:p-8 flex flex-col lg:flex-row lg:items-center justify-between gap-6 border-b border-fg/[0.08]">
            <div className="flex items-center gap-5">
              <div className="hidden sm:flex w-14 h-14 rounded-2xl bg-gradient-to-br from-blue-600/30 to-blue-600/5 border border-blue-500/30 items-center justify-center shadow-[0_0_25px_rgba(37,99,235,0.3)] shrink-0">
                <Tags className="w-7 h-7 text-blue-400" />
              </div>
              <div>
                <h1 className="text-3xl md:text-4xl font-black tracking-tight bg-gradient-to-r from-white via-white to-blue-200 bg-clip-text text-transparent">Promo Manager</h1>
                <div className="flex flex-wrap items-center gap-x-4 gap-y-2 mt-2">
                  <div className="text-emerald-400 font-bold text-[10px] uppercase tracking-[0.3em] flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.8)]"></span>
                    Discount Engine
                  </div>
                  <div className="hidden sm:block w-px h-3 bg-panel-4"></div>
                  <div className="text-fg-4 font-bold text-[10px] uppercase tracking-[0.2em] flex items-center gap-1.5">
                    <Tags className="w-3 h-3" /> {stats.total} voucher{stats.total === 1 ? "" : "s"}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* ROW 2 — stat rail */}
          <div className="relative grid grid-cols-2 lg:grid-cols-4 divide-x divide-fg/[0.08]">
            {[
              { label: "Total Codes", value: `${stats.total}`, sub: "in the engine", color: "#3b82f6", Icon: Tags },
              { label: "Active", value: `${stats.active}`, sub: "live & redeemable", color: "#10b981", Icon: CheckCircle2 },
              { label: "Disabled", value: `${stats.disabled}`, sub: "paused codes", color: "#64748b", Icon: Power },
              { label: "Avg Discount", value: `${stats.avg.toFixed(1)}%`, sub: "mean value", color: "#f59e0b", Icon: Percent },
            ].map((s, i) => (
              <div key={i} className="p-5 md:p-6 relative group hover:bg-fg/[0.02] transition-colors border-t border-fg/[0.08] lg:border-t-0">
                <div className="flex items-center justify-between mb-3">
                  <p className="text-[10px] font-black uppercase tracking-[0.2em]" style={{ color: s.color }}>{s.label}</p>
                  <div className="w-7 h-7 rounded-lg flex items-center justify-center border" style={{ background: `${s.color}1A`, borderColor: `${s.color}33` }}>
                    <s.Icon className="w-3.5 h-3.5" style={{ color: s.color }} />
                  </div>
                </div>
                <p className="text-2xl md:text-3xl font-black text-fg tracking-tight tabular-nums">{s.value}</p>
                <p className="text-[10px] font-bold text-fg-4 mt-1.5 truncate">{s.sub}</p>
                <div className="absolute bottom-0 left-0 h-0.5 w-0 group-hover:w-full transition-all duration-500" style={{ background: s.color }}></div>
              </div>
            ))}
          </div>
        </div>

        <div className="max-w-5xl">

          {/* Error banner (surfaces fetch failures instead of silent empty list) */}
          {errorMsg && (
            <div className="bg-red-500/10 border border-red-500/30 text-red-400 rounded-2xl px-6 py-4 mb-8 text-sm font-bold flex items-center gap-3">
              <X className="w-4 h-4 shrink-0" /> {errorMsg}
            </div>
          )}

          {/* Create New Form */}
          <div className="bg-panel-2 p-8 rounded-[2rem] border border-fg/[0.08] shadow-xl mb-8 flex flex-col sm:flex-row gap-6 sm:items-end relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-600 to-indigo-600"></div>

            <div className="flex-1">
              <label className="text-[10px] font-black uppercase text-fg-4 block ml-1 tracking-widest mb-2">Discount Code</label>
              <input placeholder="E.g. AERO15" value={newCode} onChange={(e) => setNewCode(e.target.value.toUpperCase())} className={inputStyle} />
            </div>
            <div className="w-full sm:w-32">
              <label className="text-[10px] font-black uppercase text-fg-4 block ml-1 tracking-widest mb-2">Discount %</label>
              <input type="number" placeholder="15" value={newPercent} onChange={(e) => setNewPercent(e.target.value)} className={inputStyle} />
            </div>
            <div className="flex-1">
              <label className="text-[10px] font-black uppercase text-fg-4 block ml-1 tracking-widest mb-2">Banner Message <span className="text-fg-4 normal-case tracking-normal font-bold">(optional)</span></label>
              <input placeholder="Leave blank for “Save 15% on your next booking!”" value={newMessage} onChange={(e) => setNewMessage(e.target.value)} className={inputStyle} />
            </div>
            <button
              disabled={!newCode || !newPercent}
              onClick={() => savePromo({ code: newCode, discount_percent: Number(newPercent), is_active: true, message: newMessage.trim() || null })}
              className="bg-blue-600 hover:bg-blue-500 disabled:opacity-50 disabled:hover:bg-blue-600 px-8 py-4 rounded-xl font-black text-sm text-white shadow-[0_10px_20px_-5px_rgba(37,99,235,0.4)] transition-all active:scale-95 flex items-center justify-center gap-2"
            >
              <Plus className="w-5 h-5" /> Generate
            </button>
          </div>

          {/* Promo List */}
          <div className="bg-panel-2 rounded-[2rem] border border-fg/[0.08] overflow-hidden shadow-2xl">
            <table className="w-full text-left whitespace-nowrap">
              <thead className="bg-panel border-b border-fg/[0.08] text-[10px] font-black uppercase text-fg-4 tracking-[0.2em]">
                <tr>
                  <th className="px-8 py-6">Voucher Code</th>
                  <th className="px-8 py-6 text-center">Value (%)</th>
                  <th className="px-8 py-6">Banner Message</th>
                  <th className="px-8 py-6 text-center">Engine Status</th>
                  <th className="px-8 py-6 text-right">System Controls</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-fg/[0.08]">
                {promos.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-8 py-12 text-center text-fg-4 font-bold text-sm">
                      No active promotions in the database.
                    </td>
                  </tr>
                ) : promos.map((p) => (
                  <tr key={p.id} className="hover:bg-fg/[0.045] transition-all group">
                    <td className="px-8 py-6">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center">
                          <Tags className="w-5 h-5 text-blue-400" />
                        </div>
                        <span className="font-black text-fg tracking-widest">{p.code}</span>
                      </div>
                    </td>

                    <td className="px-8 py-6 text-center">
                      {editingId === p.id ? (
                        <input type="number" className={`${inputStyle} w-24 text-center mx-auto`} value={editValues.discount_percent} onChange={(e) => setEditValues({ ...editValues, discount_percent: e.target.value })} />
                      ) : (
                        <span className="text-xl font-black text-emerald-400 tabular-nums">{p.discount_percent}%</span>
                      )}
                    </td>

                    <td className="px-8 py-6 max-w-xs">
                      {editingId === p.id ? (
                        <input
                          className={inputStyle}
                          placeholder={`Save ${p.discount_percent}% on your next booking!`}
                          value={editValues.message ?? ""}
                          onChange={(e) => setEditValues({ ...editValues, message: e.target.value })}
                        />
                      ) : (
                        <span className={`text-xs font-bold whitespace-normal ${p.message ? "text-fg-2" : "text-fg-4 italic"}`}>
                          {p.message || `Save ${p.discount_percent}% on your next booking!`}
                        </span>
                      )}
                    </td>

                    <td className="px-8 py-6 text-center">
                      <button onClick={() => savePromo({ ...p, is_active: !p.is_active })} className={`px-4 py-1.5 rounded-lg border text-[10px] font-black uppercase tracking-widest flex items-center gap-2 mx-auto transition-all ${p.is_active ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/20" : "bg-panel-3 text-fg-4 border-fg/[0.12] hover:bg-panel-4"}`}>
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
                            <button onClick={() => startEdit(p)} className="p-2.5 bg-panel-3 text-fg-2 hover:bg-blue-600 hover:text-white rounded-lg border border-fg/[0.12] hover:border-transparent transition-all active:scale-95"><Settings2 className="w-4 h-4" /></button>
                            <button onClick={() => deletePromo(p.id)} className="p-2.5 bg-panel-3 text-fg-4 hover:bg-red-500 hover:text-white rounded-lg border border-fg/[0.12] hover:border-transparent transition-all active:scale-95"><Trash2 className="w-4 h-4" /></button>
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

        <AdminMobileNav />
      </main>
    </div>
  );
}
