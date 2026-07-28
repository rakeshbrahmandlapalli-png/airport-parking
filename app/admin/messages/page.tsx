"use client";

import { logger } from "@/app/lib/logger";
import { useState, useEffect, useMemo } from "react";
import { supabase } from "@/app/lib/supabase";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Plane, LayoutDashboard, Building2, LogOut, Settings2, PiggyBank,
  Activity, Tags, MessageCircle, RefreshCw, Search, ArrowDownLeft,
  ArrowUpRight, AlertCircle, Inbox,
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

  const navLink = "flex items-center gap-4 px-5 py-4 hover:bg-white/5 hover:text-white rounded-xl transition-all hover:border-l-2 hover:border-blue-500/50";

  if (loading && messages.length === 0) return (
    <div className="min-h-screen bg-gradient-to-b from-[#0B1120] via-[#0A0E1A] to-[#0B1120] flex flex-col items-center justify-center text-white relative overflow-hidden">
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-blue-600/10 rounded-full blur-[120px]"></div>
      <div className="relative z-10">
        <div className="absolute inset-0 border-t-2 border-blue-500 rounded-full animate-spin"></div>
        <MessageCircle className="w-10 h-10 text-blue-500 m-4 animate-pulse" />
      </div>
      <p className="font-black text-slate-400 tracking-widest uppercase text-xs mt-6 relative z-10">Loading Messages...</p>
    </div>
  );

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#0B1120] via-[#0A0E1A] to-[#0B1120] font-sans flex flex-col md:flex-row overflow-hidden text-slate-100 antialiased selection:bg-blue-600/30 relative">

      <div className="fixed top-[-200px] left-[200px] w-[600px] h-[600px] bg-blue-600/8 rounded-full blur-[140px] pointer-events-none z-0"></div>
      <div className="fixed bottom-[-200px] right-[100px] w-[500px] h-[500px] bg-indigo-600/8 rounded-full blur-[140px] pointer-events-none z-0"></div>

      {/* SIDEBAR */}
      <aside className="w-full md:w-64 bg-[#0F1523]/90 backdrop-blur-xl text-slate-400 hidden md:flex flex-col sticky top-0 h-screen border-r border-slate-800/80 shadow-2xl z-50 shrink-0 relative">
        <div className="absolute inset-y-0 right-0 w-px bg-gradient-to-b from-transparent via-blue-500/20 to-transparent"></div>
        <div className="p-8 flex items-center gap-4 text-white">
          <div className="w-10 h-10 bg-gradient-to-br from-blue-600/30 to-blue-600/5 rounded-xl flex items-center justify-center border border-blue-500/30 shadow-[0_0_20px_rgba(37,99,235,0.25)]">
            <Plane className="w-6 h-6 text-blue-400 rotate-45 drop-shadow-[0_0_6px_rgba(59,130,246,0.6)]" />
          </div>
          <span className="font-black text-xl tracking-tighter uppercase">OPS <span className="text-blue-500 drop-shadow-[0_0_8px_rgba(59,130,246,0.5)]">CENTER</span></span>
        </div>

        <nav className="px-5 space-y-3 flex-grow mt-6 font-bold text-sm">
          <Link href="/admin" className={navLink}><LayoutDashboard className="w-5 h-5 text-slate-500" /> Live Board</Link>
          <Link href="/admin/companies" className={navLink}><Building2 className="w-5 h-5 text-slate-500" /> Partner Network</Link>
          <Link href="/admin/promos" className={navLink}><Tags className="w-5 h-5 text-slate-500" /> Promo Manager</Link>
          <Link href="/admin/financials" className={navLink}><PiggyBank className="w-5 h-5 text-slate-500" /> Financials</Link>
          <Link href="/admin/messages" className="flex items-center gap-4 px-5 py-4 bg-gradient-to-r from-blue-600 to-blue-500 text-white rounded-xl shadow-[0_10px_30px_-5px_rgba(37,99,235,0.5)] transition-all hover:-translate-y-0.5 relative overflow-hidden group">
            <div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/10 to-white/0 -translate-x-full group-hover:translate-x-full transition-transform duration-700"></div>
            <MessageCircle className="w-5 h-5" /> Messages
          </Link>
          <Link href="/admin/activity" className={navLink}><Activity className="w-5 h-5 text-slate-500" /> Activity Ledger</Link>
          <Link href="/admin/settings" className={`${navLink} border-t border-slate-800/50 mt-4 pt-6`}><Settings2 className="w-5 h-5 text-slate-500" /> Platform Settings</Link>
        </nav>

        <div className="p-6">
          <button onClick={() => supabase.auth.signOut().then(() => router.push("/admin/login"))} className="flex items-center gap-4 text-sm font-bold hover:text-red-400 transition-colors w-full text-left px-5 py-4 group bg-slate-900/50 rounded-xl border border-slate-800/80 shadow-sm hover:border-red-500/30">
            <LogOut className="w-5 h-5 text-slate-500 group-hover:text-red-500 transition-colors" /> Secure Logout
          </button>
        </div>
      </aside>

      {/* WORKSPACE */}
      <main className="flex-1 p-4 md:p-8 lg:p-12 w-full overflow-y-auto h-screen relative pb-32 md:pb-12 custom-scrollbar z-10">

        {/* HEADER */}
        <div className="relative mb-8 rounded-[2rem] border border-slate-800/80 bg-gradient-to-br from-[#131A2B] to-[#0F1523] shadow-2xl overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-blue-500/40 to-transparent"></div>
          <div className="relative p-6 md:p-8 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
            <div className="flex items-center gap-5">
              <div className="hidden sm:flex w-14 h-14 rounded-2xl bg-gradient-to-br from-blue-600/30 to-blue-600/5 border border-blue-500/30 items-center justify-center shrink-0">
                <MessageCircle className="w-7 h-7 text-blue-400" />
              </div>
              <div>
                <h1 className="text-3xl md:text-4xl font-black tracking-tight bg-gradient-to-r from-white via-white to-blue-200 bg-clip-text text-transparent">Messages</h1>
                <p className="text-slate-400 font-bold text-[10px] uppercase tracking-[0.2em] mt-2">
                  Every SMS sent and received · live from Twilio
                </p>
              </div>
            </div>
            <button onClick={fetchMessages} className="px-5 py-3.5 bg-[#1A2235]/80 hover:bg-[#1A2235] border border-slate-700 text-slate-300 rounded-xl text-xs font-black uppercase tracking-[0.1em] transition-all flex items-center justify-center gap-2 shrink-0">
              <RefreshCw className={`w-4 h-4 text-blue-400 ${loading ? "animate-spin" : ""}`} /> Refresh
            </button>
          </div>
        </div>

        {/* KPIs */}
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
          {[
            { label: "Total", value: `${stats.total}`, tone: "text-white" },
            { label: "New Replies", value: `${stats.unread}`, tone: stats.unread > 0 ? "text-emerald-400" : "text-white" },
            { label: "Received", value: `${stats.inbound}`, tone: "text-white" },
            { label: "Failed", value: `${stats.failed}`, tone: stats.failed > 0 ? "text-red-400" : "text-white" },
            { label: "Twilio Spend", value: `£${stats.spend.toFixed(2)}`, tone: "text-white" },
          ].map((k) => (
            <div key={k.label} className="bg-[#131A2B] border border-slate-800/80 rounded-2xl px-5 py-4">
              <p className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-500">{k.label}</p>
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
                    : "bg-[#131A2B] border-slate-800 text-slate-400 hover:text-white hover:border-slate-700"
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
          <div className="relative flex-1">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 pointer-events-none" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search name, reference, number or message text…"
              className="w-full bg-[#131A2B] border border-slate-800 hover:border-blue-500/50 rounded-xl py-3 pl-11 pr-4 text-sm text-white font-medium outline-none focus:ring-2 focus:ring-blue-500/40 transition-all placeholder:text-slate-600"
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
            <div className="bg-[#131A2B] border border-slate-800 rounded-3xl p-16 text-center">
              <Inbox className="w-10 h-10 text-slate-700 mx-auto mb-4" />
              <p className="text-slate-400 font-bold text-sm">
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
                    ? "bg-[#131A2B] border-slate-700"
                    : failed
                    ? "bg-red-500/[0.04] border-red-500/25"
                    : "bg-[#131A2B] border-slate-800"
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
                      <p className="font-bold text-white text-sm truncate">
                        {m.customerName || m.counterparty}
                        {isNew(m) && (
                          <span className="ml-2 text-[8px] font-black uppercase tracking-widest bg-emerald-500/15 text-emerald-400 px-2 py-0.5 rounded border border-emerald-500/30 align-middle">New</span>
                        )}
                      </p>
                      <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider truncate">
                        {m.bookingRef ? `${m.bookingRef} · ` : ""}{m.counterparty}
                        {!m.bookingRef && " · not matched to a booking"}
                      </p>
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <p className={`text-[9px] font-black uppercase tracking-widest ${failed ? "text-red-400" : inbound ? "text-emerald-400" : "text-slate-500"}`}>
                      {inbound ? "Received" : m.status}
                    </p>
                    <p className="text-[10px] font-bold text-slate-600 tabular-nums">
                      {m.sentAt ? new Date(m.sentAt).toLocaleString("en-GB", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" }) : "—"}
                      {m.segments > 1 ? ` · ${m.segments} parts` : ""}
                    </p>
                  </div>
                </div>

                <p className="text-sm text-slate-300 leading-relaxed whitespace-pre-wrap">{m.body}</p>

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

      {/* MOBILE NAV */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 z-[100] px-2 pb-6 pt-2 bg-gradient-to-t from-[#0B1120] via-[#0B1120]/95 to-transparent pointer-events-none">
        <nav className="max-w-md mx-auto bg-slate-900/95 backdrop-blur-xl border border-slate-800 rounded-3xl h-20 flex items-center justify-around px-2 shadow-2xl pointer-events-auto">
          <Link href="/admin" className="flex flex-col items-center justify-center gap-1 text-slate-500"><LayoutDashboard className="w-5 h-5" /><span className="text-[8px] font-bold uppercase tracking-tighter">Live</span></Link>
          <Link href="/admin/companies" className="flex flex-col items-center justify-center gap-1 text-slate-500"><Building2 className="w-5 h-5" /><span className="text-[8px] font-bold uppercase tracking-tighter">Ops</span></Link>
          <Link href="/admin/messages" className="flex flex-col items-center justify-center gap-1 text-blue-500 relative">
            <MessageCircle className="w-5 h-5" />
            {stats.unread > 0 && <span className="absolute -top-1 right-2 w-2 h-2 rounded-full bg-emerald-400"></span>}
            <span className="text-[8px] font-bold uppercase tracking-tighter">Texts</span>
          </Link>
          <Link href="/admin/financials" className="flex flex-col items-center justify-center gap-1 text-slate-500"><PiggyBank className="w-5 h-5" /><span className="text-[8px] font-bold uppercase tracking-tighter">Finance</span></Link>
          <Link href="/admin/settings" className="flex flex-col items-center justify-center gap-1 text-slate-500"><Settings2 className="w-5 h-5" /><span className="text-[8px] font-bold uppercase tracking-tighter">Settings</span></Link>
        </nav>
      </div>
    </div>
  );
}
