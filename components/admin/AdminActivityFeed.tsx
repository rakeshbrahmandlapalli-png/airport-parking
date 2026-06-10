"use client";

import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/app/lib/supabase";
import type { AdminAuditLog } from "@/app/lib/domain";
import {
  Activity, Tag, Percent, Building2, Settings2, Calendar, LogIn,
  Trash2, AlertCircle, Loader2, ShieldCheck, RefreshCw,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

const PAGE_SIZE = 50;

// ── Presentation helpers ───────────────────────────────────────────────────────

/** Pick an icon + accent from the action namespace (e.g. "pricing.surcharge.update"). */
function actionVisual(actionType: string): { Icon: LucideIcon; tone: string } {
  const a = actionType.toLowerCase();
  if (a.includes("delete") || a.includes("remove")) return { Icon: Trash2, tone: "text-rose-400 bg-rose-500/10 border-rose-500/20" };
  if (a.startsWith("pricing") || a.includes("surcharge") || a.includes("markup")) return { Icon: Percent, tone: "text-amber-400 bg-amber-500/10 border-amber-500/20" };
  if (a.startsWith("promo")) return { Icon: Tag, tone: "text-emerald-400 bg-emerald-500/10 border-emerald-500/20" };
  if (a.startsWith("company") || a.includes("provider")) return { Icon: Building2, tone: "text-blue-400 bg-blue-500/10 border-blue-500/20" };
  if (a.startsWith("setting")) return { Icon: Settings2, tone: "text-indigo-400 bg-indigo-500/10 border-indigo-500/20" };
  if (a.startsWith("booking")) return { Icon: Calendar, tone: "text-cyan-400 bg-cyan-500/10 border-cyan-500/20" };
  if (a.includes("login") || a.includes("auth")) return { Icon: LogIn, tone: "text-slate-300 bg-slate-700/40 border-slate-600/40" };
  return { Icon: Activity, tone: "text-slate-300 bg-slate-700/40 border-slate-600/40" };
}

/** "promo.badge.update" → "updated promo badge". */
function humanizeAction(actionType: string): string {
  const parts = actionType.split(".");
  const verb = parts[parts.length - 1] || actionType;
  const subject = parts.slice(0, -1).join(" ");
  const VERBS: Record<string, string> = {
    update: "updated", create: "created", delete: "deleted", toggle: "toggled",
    enable: "enabled", disable: "disabled", assign: "assigned", refund: "refunded",
  };
  return `${VERBS[verb] ?? verb} ${subject}`.trim();
}

function actorName(email: string | null): string {
  if (!email) return "A team member";
  const local = email.split("@")[0].replace(/[._-]+/g, " ").trim();
  return local.replace(/\b\w/g, (c) => c.toUpperCase()) || email;
}

function timeAgo(iso: string): string {
  const then = new Date(iso).getTime();
  const s = Math.max(0, Math.floor((Date.now() - then) / 1000));
  if (s < 60) return "just now";
  const m = Math.floor(s / 60); if (m < 60) return `${m} min${m > 1 ? "s" : ""} ago`;
  const h = Math.floor(m / 60); if (h < 24) return `${h} hour${h > 1 ? "s" : ""} ago`;
  const d = Math.floor(h / 24); if (d < 7) return `${d} day${d > 1 ? "s" : ""} ago`;
  return new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

function shortVal(v: unknown): string {
  if (v == null || v === "") return "—";
  if (typeof v === "object") { try { return JSON.stringify(v); } catch { return "[object]"; } }
  const s = String(v);
  return s.length > 48 ? s.slice(0, 47) + "…" : s;
}

// ── Component ───────────────────────────────────────────────────────────────────

export function AdminActivityFeed({ limit = PAGE_SIZE }: { limit?: number }) {
  const [logs, setLogs] = useState<AdminAuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchLogs = useCallback(async () => {
    setError(null);
    const { data, error } = await supabase
      .from("admin_audit_logs")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(limit);
    if (error) setError(error.message);
    else setLogs((data ?? []) as AdminAuditLog[]);
    setLoading(false);
  }, [limit]);

  useEffect(() => {
    fetchLogs();
    // Live updates — prepend new entries as staff make changes.
    const channel = supabase
      .channel("admin-audit-feed")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "admin_audit_logs" },
        (payload) => setLogs((prev) => [payload.new as AdminAuditLog, ...prev].slice(0, limit)),
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [fetchLogs, limit]);

  return (
    <section className="rounded-2xl border border-slate-800 bg-[#0B1120] overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between gap-3 border-b border-slate-800 px-5 py-4">
        <div className="flex items-center gap-3 min-w-0">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-blue-500/20 bg-blue-500/10">
            <ShieldCheck className="h-5 w-5 text-blue-400" />
          </div>
          <div className="min-w-0">
            <h2 className="text-sm font-black uppercase tracking-widest text-white">Activity Ledger</h2>
            <p className="text-[11px] font-bold text-slate-500">Every admin action, permanently recorded</p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => fetchLogs()}
          aria-label="Refresh activity"
          className="flex h-11 min-w-11 items-center justify-center gap-1.5 rounded-xl border border-slate-700 px-3 text-[10px] font-black uppercase tracking-widest text-slate-300 transition-colors hover:border-blue-500 hover:text-white touch-manipulation"
        >
          <RefreshCw className="h-3.5 w-3.5" /> <span className="hidden sm:inline">Refresh</span>
        </button>
      </div>

      {/* Body */}
      <div className="p-3 sm:p-5">
        {loading ? (
          <div className="space-y-3" aria-busy="true">
            {[0, 1, 2, 3].map((i) => (
              <div key={i} className="flex gap-3">
                <div className="h-10 w-10 shrink-0 animate-pulse rounded-xl bg-slate-800" />
                <div className="flex-1 space-y-2 py-1">
                  <div className="h-3 w-2/3 animate-pulse rounded bg-slate-800" />
                  <div className="h-2.5 w-1/3 animate-pulse rounded bg-slate-800" />
                </div>
              </div>
            ))}
          </div>
        ) : error ? (
          <div className="flex items-center gap-3 rounded-xl border border-rose-500/20 bg-rose-500/10 px-4 py-4 text-sm font-bold text-rose-300">
            <AlertCircle className="h-5 w-5 shrink-0" />
            <span>Couldn&apos;t load the ledger: {error}</span>
          </div>
        ) : logs.length === 0 ? (
          <div className="flex flex-col items-center gap-2 py-12 text-center">
            <Activity className="h-8 w-8 text-slate-600" />
            <p className="text-sm font-bold text-slate-400">No activity recorded yet</p>
            <p className="text-xs text-slate-600">Admin changes will appear here as they happen.</p>
          </div>
        ) : (
          <ol className="relative space-y-1">
            {logs.map((log, idx) => {
              const { Icon, tone } = actionVisual(log.action_type);
              const hasDiff = log.metadata && ("before" in log.metadata || "after" in log.metadata);
              const isLast = idx === logs.length - 1;
              return (
                <li key={log.id} className="relative flex gap-3 sm:gap-4">
                  {/* Rail + node */}
                  <div className="relative flex flex-col items-center">
                    <div className={`z-10 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border ${tone}`}>
                      <Icon className="h-5 w-5" />
                    </div>
                    {!isLast && <div className="w-px flex-1 bg-slate-800" aria-hidden="true" />}
                  </div>

                  {/* Card */}
                  <div className="min-w-0 flex-1 pb-4">
                    <div className="rounded-xl border border-slate-800 bg-[#0F1523] px-4 py-3">
                      <p className="text-sm leading-snug text-slate-200">
                        <span className="font-black text-white">{actorName(log.user_email)}</span>{" "}
                        <span className="text-slate-300">{humanizeAction(log.action_type)}</span>
                        {log.metadata?.label && (
                          <> <span className="font-bold text-blue-300">{log.metadata.label}</span></>
                        )}
                      </p>

                      {hasDiff && (
                        <div className="mt-2 flex flex-wrap items-center gap-2 text-[12px] font-bold">
                          <span className="rounded-md border border-rose-500/20 bg-rose-500/10 px-2 py-0.5 text-rose-300 line-through decoration-rose-500/40">
                            {shortVal(log.metadata?.before)}
                          </span>
                          <span className="text-slate-500">→</span>
                          <span className="rounded-md border border-emerald-500/20 bg-emerald-500/10 px-2 py-0.5 text-emerald-300">
                            {shortVal(log.metadata?.after)}
                          </span>
                        </div>
                      )}

                      <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-[10px] font-bold uppercase tracking-widest text-slate-500">
                        <time dateTime={log.created_at} title={new Date(log.created_at).toLocaleString("en-GB")}>
                          {timeAgo(log.created_at)}
                        </time>
                        {log.entity_type && <span className="text-slate-600">· {log.entity_type}</span>}
                        <span className="font-mono text-slate-600 normal-case">{log.action_type}</span>
                      </div>
                    </div>
                  </div>
                </li>
              );
            })}
          </ol>
        )}
      </div>
    </section>
  );
}

export default AdminActivityFeed;
