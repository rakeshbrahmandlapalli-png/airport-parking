"use client";

import { logger } from "@/app/lib/logger";
import { useState, useEffect, useMemo } from "react";
import { supabase } from "@/app/lib/supabase";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { AdminSidebar, AdminMobileNav } from "@/components/admin/AdminNav";
import {
  AlertCircle, ArrowDownLeft, ArrowUpRight, Inbox, Loader2, RefreshCw, Search,
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
    <div className="min-h-screen bg-canvas flex flex-col items-center justify-center text-fg">
      <Loader2 className="w-6 h-6 text-fg-3 animate-spin" aria-hidden="true" />
      <p className="text-sm text-fg-3 mt-3">Loading messages…</p>
    </div>
  );

  const when = (iso: string | null) =>
    iso ? new Date(iso).toLocaleString("en-GB", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }) : "";

  return (
    <div className="min-h-screen bg-canvas font-sans flex flex-col md:flex-row overflow-hidden text-fg antialiased">
      <AdminSidebar unreadMessages={stats.unread} />

      <main className="flex-1 p-4 md:p-8 w-full overflow-y-auto h-screen pb-32 md:pb-10 custom-scrollbar">
        <div className="max-w-4xl">
          {/* HEADER + STATS */}
          <div className="mb-6 rounded-xl border border-fg/[0.08] bg-panel overflow-hidden">
            <div className="p-5 md:p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-fg/[0.08]">
              <div>
                <h1 className="text-2xl font-semibold text-fg">Messages</h1>
                <p className="mt-1 text-sm text-fg-3">Every text message sent to and received from customers.</p>
              </div>
              <button type="button" onClick={fetchMessages} disabled={loading}
                className="px-4 py-2.5 bg-fg/[0.04] hover:bg-fg/[0.08] border border-fg/10 text-fg-2 rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-2 shrink-0 disabled:opacity-60">
                <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} aria-hidden="true" /> Refresh
              </button>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 divide-x divide-fg/[0.08]">
              {[
                { label: "New replies", value: `${stats.unread}`, tone: stats.unread > 0 ? "text-emerald-400" : "text-fg" },
                { label: "Received", value: `${stats.inbound}`, tone: "text-fg" },
                { label: "Failed to send", value: `${stats.failed}`, tone: stats.failed > 0 ? "text-red-400" : "text-fg" },
                { label: "SMS cost", value: `£${stats.spend.toFixed(2)}`, tone: "text-fg" },
              ].map((k) => (
                <div key={k.label} className="p-4 md:p-5 border-t border-fg/[0.08] sm:border-t-0">
                  <p className="text-sm text-fg-3">{k.label}</p>
                  <p className={`mt-1 text-xl font-semibold tabular-nums ${k.tone}`}>{k.value}</p>
                </div>
              ))}
            </div>
          </div>

          {/* FILTERS + SEARCH */}
          <div className="flex flex-col sm:flex-row gap-2.5 mb-5">
            <div role="group" aria-label="Show" className="flex items-center bg-fg/[0.05] rounded-lg p-1 self-start">
              {([
                { id: "all", label: "All" },
                { id: "inbound", label: "Received" },
                { id: "outbound", label: "Sent" },
                { id: "failed", label: "Failed" },
              ] as { id: Filter; label: string }[]).map((f) => (
                <button
                  key={f.id}
                  type="button"
                  onClick={() => setFilter(f.id)}
                  aria-pressed={filter === f.id}
                  className={`px-3 py-1.5 rounded-md text-sm transition-colors ${
                    filter === f.id ? "bg-panel text-fg font-medium shadow-sm ring-1 ring-fg/10" : "text-fg-3 hover:text-fg"
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>
            <div className="relative flex-1">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-fg-4 pointer-events-none" aria-hidden="true" />
              <input
                type="search"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search name, reference, number or text"
                aria-label="Search messages"
                className="w-full bg-panel border border-fg/[0.08] hover:border-fg/15 rounded-lg py-2.5 pl-10 pr-4 text-base md:text-sm text-fg outline-none focus:ring-1 focus:ring-blue-500/40 transition-colors placeholder:text-fg-4"
              />
            </div>
          </div>

          {error && (
            <p role="alert" className="mb-5 flex items-start gap-2 rounded-lg border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-300">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" aria-hidden="true" /> {error}
            </p>
          )}

          {/* LIST */}
          <div className="rounded-xl border border-fg/[0.08] bg-panel divide-y divide-fg/[0.06] mb-10">
            {visible.length === 0 && !loading && (
              <div className="px-6 py-14 text-center">
                <Inbox className="w-6 h-6 text-fg-4 mx-auto mb-3" aria-hidden="true" />
                <p className="text-sm text-fg-3">
                  {messages.length === 0 ? "No text messages yet." : "No messages match."}
                </p>
              </div>
            )}

            {visible.map((m) => {
              const failed = ["failed", "undelivered"].includes(m.status);
              const inbound = m.direction === "inbound";
              const fresh = isNew(m);
              return (
                <div key={m.sid} className={`p-4 md:p-5 ${fresh ? "bg-emerald-500/[0.06]" : ""}`}>
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3 min-w-0">
                      <span className={`mt-0.5 w-7 h-7 rounded-full flex items-center justify-center shrink-0 ${inbound ? "bg-emerald-500/10 text-emerald-400" : "bg-fg/[0.06] text-fg-3"}`}
                        title={inbound ? "Received" : "Sent"}>
                        {inbound ? <ArrowDownLeft className="w-4 h-4" aria-hidden="true" /> : <ArrowUpRight className="w-4 h-4" aria-hidden="true" />}
                        <span className="sr-only">{inbound ? "Received" : "Sent"}</span>
                      </span>
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-fg truncate">
                          {m.customerName || m.counterparty}
                          {fresh && <span className="ml-2 align-middle rounded bg-emerald-500/15 px-1.5 py-0.5 text-xs font-medium text-emerald-400">New</span>}
                        </p>
                        <p className="text-xs text-fg-4 truncate tabular-nums">
                          {m.bookingRef ? <span className="font-mono">{m.bookingRef}</span> : "No booking found"} · {m.counterparty}
                        </p>
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-xs text-fg-3 tabular-nums">{when(m.sentAt)}</p>
                      <p className={`text-xs capitalize ${failed ? "text-red-400" : "text-fg-4"}`}>
                        {inbound ? "received" : m.status}{m.segments > 1 ? ` · ${m.segments} parts` : ""}
                      </p>
                    </div>
                  </div>

                  <p className="mt-2.5 pl-10 text-sm text-fg-2 leading-relaxed whitespace-pre-wrap break-words">{m.body}</p>

                  {failed && m.errorMessage && (
                    <p className="mt-2 pl-10 text-sm text-red-400 flex items-start gap-1.5">
                      <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" aria-hidden="true" /> {m.errorMessage}
                    </p>
                  )}

                  {m.bookingRef && (
                    <Link href={`/admin?search=${encodeURIComponent(m.bookingRef)}`} className="mt-2 ml-10 inline-block text-sm text-blue-400 hover:underline underline-offset-4">
                      Open booking
                    </Link>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </main>

      <AdminMobileNav unreadMessages={stats.unread} />
    </div>
  );
}
