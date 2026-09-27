"use client";

import { logger } from "@/app/lib/logger";
import { useState, useEffect, useMemo } from "react";
import { supabase } from "@/app/lib/supabase";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { AdminSidebar, AdminMobileNav } from "@/components/admin/AdminNav";
import {
  MessageCircle, RefreshCw, Search, ArrowDownLeft, ArrowUpRight, AlertCircle, Inbox,
} from "lucide-react";

type Msg = {
  sid: string;
  body: string;
  status: string;
  direction: "inbound" | "outbound";
  counterparty: string;
  errorMessage: string | null;
  segments: number;
  price: number | null;
  sentAt: string | null;
  customerName: string | null;
  bookingRef: string | null;
  airport: string | null;
};

type Filter = "all" | "inbound" | "outbound" | "failed";

const LAST_SEEN_KEY = "aeropark_messages_last_seen";

export default function MessagesPage() {
  const router = useRouter();
  const [messages, setMessages] = useState<Msg[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<Filter>("all");
  const [search, setSearch] = useState("");
  // Captured once on mount so "new" highlights survive this visit and clear on
  // the next one — the timestamp is advanced immediately after loading.
  const [lastSeen, setLastSeen] = useState<string | null>(null);

  useEffect(() => {
    const check = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) router.push("/admin/login");
      else {
        setLastSeen(typeof window !== "undefined" ? localStorage.getItem(LAST_SEEN_KEY) : null);
        fetchMessages();
      }
    };
    check();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [router]);

  const fetchMessages = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/messages/log?limit=150");
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to load messages");
      setMessages(data.messages || []);
      if (data.error) setError(data.error);
      try { localStorage.setItem(LAST_SEEN_KEY, new Date().toISOString()); } catch { /* private mode */ }
    } catch (err: any) {
      logger.error("Messages load error:", err.message);
      setError(err.message || "Could not load messages");
      setMessages([]);
    } finally {
      setLoading(false);
    }
  };

  const isNew = (m: Msg) =>
    m.direction === "inbound" && !!m.sentAt && (!lastSeen || m.sentAt > lastSeen);

  const stats = useMemo(() => ({
    total: messages.length,
    inbound: messages.filter((m) => m.direction === "inbound").length,
    failed: messages.filter((m) => ["failed", "undelivered"].includes(m.status)).length,
    unread: messages.filter(isNew).length,
    // Twilio prices are negative (a debit); show the magnitude actually spent.
    spend: messages.reduce((sum, m) => sum + Math.abs(m.price || 0), 0),
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }), [messages, lastSeen]);

  const visible = useMemo(() => {
    const q = search.trim().toLowerCase();
    return messages.filter((m) => {
      if (filter === "inbound" && m.direction !== "inbound") return false;
      if (filter === "outbound" && m.direction !== "outbound") return false;
      if (filter === "failed" && !["failed", "undelivered"].includes(m.status)) return false;
      if (!q) return true;
      return [m.customerName, m.bookingRef, m.counterparty, m.body]
        .some((v) => String(v || "").toLowerCase().includes(q));
    });
  }, [messages, filter, search]);


  if (loading && messages.length === 0) return (
    <div className="min-h-screen bg-canvas flex flex-col items-center justify-center text-fg relative overflow-hidden">
      <div className="relative z-10">
        <div className="absolute inset-0 border-t-2 border-blue-500 rounded-full animate-spin"></div>
        <MessageCircle className="w-10 h-10 text-blue-500 m-4 animate-pulse" />
      </div>
      <p className="font-black text-fg-3 tracking-widest uppercase text-xs mt-6 relative z-10">Loading Messages...</p>
    </div>
  );

  return (
    <div className="min-h-screen bg-canvas font-sans flex flex-col md:flex-row overflow-hidden text-fg antialiased selection:bg-blue-600/30 relative">


      <AdminSidebar unreadMessages={stats.unread} />

      {/* WORKSPACE */}
      <main className="flex-1 p-4 md:p-8 lg:p-12 w-full overflow-y-auto h-screen relative pb-32 md:pb-12 custom-scrollbar z-10">

        {/* HEADER */}
        <div className="relative mb-8 rounded-xl border border-fg/[0.08] bg-panel overflow-hidden">
          <div className="relative p-6 md:p-8 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
            <div className="flex items-center gap-5">
              <div className="hidden sm:flex w-14 h-14 rounded-2xl bg-blue-600/10 border border-blue-500/30 items-center justify-center shrink-0">
                <MessageCircle className="w-7 h-7 text-blue-400" />
              </div>
              <div>
                <h1 className="text-3xl md:text-4xl font-black tracking-tight text-fg">Messages</h1>
                <p className="text-fg-3 font-bold text-[10px] uppercase tracking-[0.2em] mt-2">
                  Every SMS sent and received · live from Twilio
                </p>
              </div>
            </div>
            <button onClick={fetchMessages} className="px-5 py-3.5 bg-panel-3/80 hover:bg-panel-3 border border-fg/[0.12] text-fg-2 rounded-xl text-xs font-black uppercase tracking-[0.1em] transition-all flex items-center justify-center gap-2 shrink-0">
              <RefreshCw className={`w-4 h-4 text-blue-400 ${loading ? "animate-spin" : ""}`} /> Refresh
            </button>
          </div>
        </div>

        {/* KPIs */}
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
          {[
            { label: "Total", value: `${stats.total}`, tone: "text-fg" },
            { label: "New Replies", value: `${stats.unread}`, tone: stats.unread > 0 ? "text-emerald-400" : "text-fg" },
            { label: "Received", value: `${stats.inbound}`, tone: "text-fg" },
            { label: "Failed", value: `${stats.failed}`, tone: stats.failed > 0 ? "text-red-400" : "text-fg" },
            { label: "Twilio Spend", value: `£${stats.spend.toFixed(2)}`, tone: "text-fg" },
          ].map((k) => (
            <div key={k.label} className="bg-panel-2 border border-fg/[0.08] rounded-2xl px-5 py-4">
              <p className="text-[9px] font-black uppercase tracking-[0.2em] text-fg-4">{k.label}</p>
              <p className={`text-xl font-black mt-1 tabular-nums tracking-tight ${k.tone}`}>{k.value}</p>
            </div>
          ))}
        </div>

        {/* CONTROLS */}
        <div className="flex flex-col md:flex-row gap-3 mb-6">
          <div className="flex flex-wrap gap-2">
            {([
              { id: "all", label: "All" },
              { id: "inbound", label: "Received" },
              { id: "outbound", label: "Sent" },
              { id: "failed", label: "Failed" },
            ] as { id: Filter; label: string }[]).map((f) => (
              <button
                key={f.id}
                onClick={() => setFilter(f.id)}
                className={`px-4 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest border transition-all ${
                  filter === f.id
                    ? "bg-blue-600 border-blue-500 text-white"
                    : "bg-panel-2 border-fg/[0.08] text-fg-3 hover:text-fg hover:border-fg/[0.12]"
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
          <div className="relative flex-1">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-fg-4 pointer-events-none" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search name, reference, number or message text…"
              className="w-full bg-panel-2 border border-fg/[0.08] hover:border-blue-500/50 rounded-xl py-3 pl-11 pr-4 text-sm text-fg font-medium outline-none focus:ring-2 focus:ring-blue-500/40 transition-all placeholder:text-fg-4"
            />
          </div>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-amber-500/10 border border-amber-500/20 rounded-xl text-amber-400 text-xs font-bold flex items-start gap-3">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        {/* LIST */}
        <div className="space-y-3 mb-24">
          {visible.length === 0 && !loading && (
            <div className="bg-panel-2 border border-fg/[0.08] rounded-xl p-16 text-center">
              <Inbox className="w-10 h-10 text-fg-4 mx-auto mb-4" />
              <p className="text-fg-3 font-bold text-sm">
                {messages.length === 0 ? "No SMS activity yet." : "Nothing matches this filter."}
              </p>
            </div>
          )}

          {visible.map((m) => {
            const failed = ["failed", "undelivered"].includes(m.status);
            const inbound = m.direction === "inbound";
            return (
              <div
                key={m.sid}
                className={`rounded-2xl border p-5 transition-colors ${
                  isNew(m)
                    ? "bg-emerald-500/[0.07] border-emerald-500/40"
                    : inbound
                    ? "bg-panel-2 border-fg/[0.12]"
                    : failed
                    ? "bg-red-500/[0.04] border-red-500/25"
                    : "bg-panel-2 border-fg/[0.08]"
                }`}
              >
                <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 border ${
                      inbound ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-400" : "bg-blue-500/10 border-blue-500/30 text-blue-400"
                    }`}>
                      {inbound ? <ArrowDownLeft className="w-4 h-4" /> : <ArrowUpRight className="w-4 h-4" />}
                    </div>
                    <div className="min-w-0">
                      <p className="font-bold text-fg text-sm truncate">
                        {m.customerName || m.counterparty}
                        {isNew(m) && (
                          <span className="ml-2 text-[8px] font-black uppercase tracking-widest bg-emerald-500/15 text-emerald-400 px-2 py-0.5 rounded border border-emerald-500/30 align-middle">New</span>
                        )}
                      </p>
                      <p className="text-[10px] font-bold text-fg-4 uppercase tracking-wider truncate">
                        {m.bookingRef ? `${m.bookingRef} · ` : ""}{m.counterparty}
                        {!m.bookingRef && " · not matched to a booking"}
                      </p>
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <p className={`text-[9px] font-black uppercase tracking-widest ${failed ? "text-red-400" : inbound ? "text-emerald-400" : "text-fg-4"}`}>
                      {inbound ? "Received" : m.status}
                    </p>
                    <p className="text-[10px] font-bold text-fg-4 tabular-nums">
                      {m.sentAt ? new Date(m.sentAt).toLocaleString("en-GB", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" }) : "—"}
                      {m.segments > 1 ? ` · ${m.segments} parts` : ""}
                    </p>
                  </div>
                </div>

                <p className="text-sm text-fg-2 leading-relaxed whitespace-pre-wrap">{m.body}</p>

                {failed && m.errorMessage && (
                  <p className="text-red-400 text-[11px] font-bold mt-3 flex items-start gap-2">
                    <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-0.5" /> {m.errorMessage}
                  </p>
                )}

                {m.bookingRef && (
                  <Link href={`/admin?search=${encodeURIComponent(m.bookingRef)}`} className="inline-flex items-center gap-1.5 mt-3 text-[10px] font-black uppercase tracking-widest text-blue-400 hover:text-blue-300">
                    Open booking →
                  </Link>
                )}
              </div>
            );
          })}
        </div>
      </main>

      <AdminMobileNav unreadMessages={stats.unread} />
    </div>
  );
}
