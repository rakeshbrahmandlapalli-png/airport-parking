"use client";

import { logger } from "@/app/lib/logger";
import { useState, useEffect, useMemo } from "react";
import { supabase } from "@/app/lib/supabase";
import { recordAdminAction } from "@/app/lib/audit-client";
import { useRouter } from "next/navigation";
import { AdminSidebar, AdminMobileNav } from "@/components/admin/AdminNav";
import { Loader2, Pencil, Plus, Power, Save, Trash2 } from "lucide-react";

type Promo = { id: string; code: string; discount_percent: number | string; is_active: boolean; message?: string | null };

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
    const prev = promos.find((p) => p.id === (promoData.id ?? editingId)) ?? null;
    const { error } = await supabase.from("promotions").upsert([promoData], { onConflict: "code" });
    if (!error) {
      // Audit: distinguish enable/disable from a value edit / create.
      const activeChanged = !!prev && prev.is_active !== promoData.is_active;
      const actionType = activeChanged
        ? (promoData.is_active ? "promo.enable" : "promo.disable")
        : (prev ? "promo.update" : "promo.create");
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
      alert("Couldn't save the code: " + error.message);
    }
  };

  const deletePromo = async (id: string) => {
    if (!confirm("Delete this promo? This cannot be undone.")) return;
    const target = promos.find((p) => p.id === id);
    const { error } = await supabase.from("promotions").delete().eq("id", id);
    if (error) {
      alert("Couldn't delete the code: " + error.message);
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

  const inputStyle = "w-full bg-panel border border-fg/10 hover:border-fg/20 rounded-lg px-3.5 py-2.5 text-base md:text-sm text-fg outline-none focus:ring-2 focus:ring-blue-500/40 transition-colors [-webkit-text-fill-color:rgb(var(--admin-fg))] placeholder:text-fg-4";
  const iconBtn = "p-2 rounded-lg border border-fg/10 text-fg-3 hover:text-fg hover:bg-fg/[0.06] transition-colors";
  const defaultMessage = (pct: number | string) => `Save ${pct}% on your next booking!`;

  const statusButton = (p: Promo) => (
    <button
      type="button"
      onClick={() => savePromo({ ...p, is_active: !p.is_active })}
      aria-pressed={p.is_active}
      title={p.is_active ? "Customers can use this code. Tap to turn it off." : "Turned off. Tap to turn it on."}
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-sm transition-colors ${p.is_active ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/20" : "bg-fg/[0.04] text-fg-3 border-fg/10 hover:bg-fg/[0.08]"}`}
    >
      <Power className="w-3.5 h-3.5" aria-hidden="true" /> {p.is_active ? "On" : "Off"}
    </button>
  );

  const rowActions = (p: Promo) => editingId === p.id ? (
    <>
      <button type="button" onClick={() => savePromo(editValues)} className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium"><Save className="w-4 h-4" aria-hidden="true" /> Save</button>
      <button type="button" onClick={() => setEditingId(null)} className="px-3 py-2 rounded-lg text-sm text-fg-3 hover:text-fg">Cancel</button>
    </>
  ) : (
    <>
      <button type="button" onClick={() => startEdit(p)} className={iconBtn} title="Edit" aria-label={`Edit ${p.code}`}><Pencil className="w-4 h-4" /></button>
      <button type="button" onClick={() => deletePromo(p.id)} className={`${iconBtn} hover:text-red-400`} title="Delete" aria-label={`Delete ${p.code}`}><Trash2 className="w-4 h-4" /></button>
    </>
  );

  if (loading) return (
    <div className="min-h-screen bg-canvas flex flex-col items-center justify-center text-fg">
      <Loader2 className="w-6 h-6 text-fg-3 animate-spin" aria-hidden="true" />
      <p className="text-sm text-fg-3 mt-3">Loading promo codes…</p>
    </div>
  );

  return (
    <div className="min-h-screen bg-canvas font-sans flex flex-col md:flex-row overflow-hidden text-fg antialiased">
      <AdminSidebar />

      <main className="flex-1 p-4 md:p-8 w-full overflow-y-auto h-screen pb-32 md:pb-10 custom-scrollbar">
        <div className="max-w-5xl">
          {/* HEADER + STATS */}
          <div className="mb-6 rounded-xl border border-fg/[0.08] bg-panel overflow-hidden">
            <div className="p-5 md:p-6 border-b border-fg/[0.08]">
              <h1 className="text-2xl font-semibold text-fg">Promo codes</h1>
              <p className="mt-1 text-sm text-fg-3">Discount codes customers can enter at checkout.</p>
            </div>
            <div className="grid grid-cols-2 lg:grid-cols-4 divide-x divide-fg/[0.08]">
              {[
                { label: "Codes", value: `${stats.total}` },
                { label: "On", value: `${stats.active}` },
                { label: "Off", value: `${stats.disabled}` },
                { label: "Average discount", value: `${stats.avg.toFixed(1)}%` },
              ].map((s) => (
                <div key={s.label} className="p-4 md:p-5 border-t border-fg/[0.08] lg:border-t-0">
                  <p className="text-sm text-fg-3">{s.label}</p>
                  <p className="mt-1 text-xl md:text-2xl font-semibold text-fg tabular-nums">{s.value}</p>
                </div>
              ))}
            </div>
          </div>

          {errorMsg && (
            <p role="alert" className="mb-6 rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">{errorMsg}</p>
          )}

          {/* NEW CODE */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (!newCode || !newPercent) return;
              savePromo({ code: newCode, discount_percent: Number(newPercent), is_active: true, message: newMessage.trim() || null });
            }}
            className="mb-6 rounded-xl border border-fg/[0.08] bg-panel p-5"
          >
            <h2 className="text-base font-semibold text-fg mb-4">New code</h2>
            <div className="grid grid-cols-2 sm:grid-cols-[1fr_7rem_2fr_auto] gap-3 sm:items-end">
              <label className="block">
                <span className="text-sm font-medium text-fg-2 block mb-1.5">Code</span>
                <input placeholder="e.g. AERO15" value={newCode} onChange={(e) => setNewCode(e.target.value.toUpperCase().replace(/\s/g, ""))} className={`${inputStyle} font-mono uppercase`} autoCapitalize="characters" />
              </label>
              <label className="block">
                <span className="text-sm font-medium text-fg-2 block mb-1.5">Discount %</span>
                <input type="number" inputMode="decimal" min="1" max="100" placeholder="15" value={newPercent} onChange={(e) => setNewPercent(e.target.value)} className={inputStyle} />
              </label>
              <label className="block col-span-2 sm:col-span-1">
                <span className="text-sm font-medium text-fg-2 block mb-1.5">Banner message <span className="font-normal text-fg-4">(optional)</span></span>
                <input placeholder={defaultMessage(newPercent || 15)} value={newMessage} onChange={(e) => setNewMessage(e.target.value)} className={inputStyle} />
              </label>
              <button
                type="submit"
                disabled={!newCode || !newPercent}
                className="col-span-2 sm:col-span-1 h-[42px] bg-blue-600 hover:bg-blue-700 disabled:opacity-50 px-5 rounded-lg font-medium text-sm text-white transition-colors flex items-center justify-center gap-2"
              >
                <Plus className="w-4 h-4" aria-hidden="true" /> Add code
              </button>
            </div>
            <p className="mt-3 text-xs text-fg-4">If the banner message is left empty, customers see &ldquo;{defaultMessage(newPercent || 15)}&rdquo;.</p>
          </form>

          {/* LIST — phone */}
          <div className="md:hidden rounded-xl border border-fg/[0.08] bg-panel divide-y divide-fg/[0.06]">
            {promos.length === 0 ? (
              <p className="px-4 py-10 text-center text-sm text-fg-3">No promo codes yet.</p>
            ) : promos.map((p) => (
              <div key={p.id} className="p-4">
                <div className="flex items-center justify-between gap-3">
                  <p className="font-mono text-base font-semibold text-fg">{p.code}</p>
                  {statusButton(p)}
                </div>
                {editingId === p.id ? (
                  <div className="mt-3 space-y-2">
                    <input type="number" aria-label="Discount %" className={inputStyle} value={editValues.discount_percent} onChange={(e) => setEditValues({ ...editValues, discount_percent: e.target.value })} />
                    <input aria-label="Banner message" className={inputStyle} placeholder={defaultMessage(editValues.discount_percent)} value={editValues.message ?? ""} onChange={(e) => setEditValues({ ...editValues, message: e.target.value })} />
                  </div>
                ) : (
                  <>
                    <p className="mt-1 text-sm text-emerald-400 tabular-nums">{p.discount_percent}% off</p>
                    <p className={`mt-1 text-sm ${p.message ? "text-fg-2" : "text-fg-4"}`}>{p.message || defaultMessage(p.discount_percent)}</p>
                  </>
                )}
                <div className="mt-3 flex items-center justify-end gap-2">{rowActions(p)}</div>
              </div>
            ))}
          </div>

          {/* LIST — tablet and desktop */}
          <div className="hidden md:block rounded-xl border border-fg/[0.08] bg-panel overflow-hidden">
            <table className="w-full text-left">
              <thead className="bg-panel-2 border-b border-fg/[0.08] text-xs font-medium text-fg-3">
                <tr>
                  <th className="px-5 py-3">Code</th>
                  <th className="px-4 py-3 text-right">Discount</th>
                  <th className="px-4 py-3">Banner message</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-5 py-3"><span className="sr-only">Actions</span></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-fg/[0.06]">
                {promos.length === 0 ? (
                  <tr><td colSpan={5} className="px-5 py-10 text-center text-sm text-fg-3">No promo codes yet.</td></tr>
                ) : promos.map((p) => (
                  <tr key={p.id} className="hover:bg-fg/[0.02] align-middle">
                    <td className="px-5 py-3 font-mono text-sm font-semibold text-fg whitespace-nowrap">{p.code}</td>
                    <td className="px-4 py-3 text-right whitespace-nowrap">
                      {editingId === p.id ? (
                        <input type="number" aria-label="Discount %" className={`${inputStyle} w-24 text-right`} value={editValues.discount_percent} onChange={(e) => setEditValues({ ...editValues, discount_percent: e.target.value })} />
                      ) : (
                        <span className="text-sm font-semibold text-emerald-400 tabular-nums">{p.discount_percent}%</span>
                      )}
                    </td>
                    <td className="px-4 py-3 max-w-sm">
                      {editingId === p.id ? (
                        <input aria-label="Banner message" className={inputStyle} placeholder={defaultMessage(editValues.discount_percent)} value={editValues.message ?? ""} onChange={(e) => setEditValues({ ...editValues, message: e.target.value })} />
                      ) : (
                        <span className={`text-sm ${p.message ? "text-fg-2" : "text-fg-4"}`}>{p.message || defaultMessage(p.discount_percent)}</span>
                      )}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">{statusButton(p)}</td>
                    <td className="px-5 py-3">
                      <div className="flex items-center justify-end gap-2">{rowActions(p)}</div>
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
