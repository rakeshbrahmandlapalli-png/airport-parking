"use client";

/**
 * AERO Chatbot — Original Design Restored
 * SDK: ai@4.x · @ai-sdk/react@1.x (all type fixes kept)
 * Design: Original aesthetic from v1 — dark header, waveform trigger,
 *         shimmer line, Neural Link Active, large avatar, frosted glass feel
 */

import { useState, useEffect, useRef } from "react";
import { Send, Minus, Bot, ShieldCheck, Mail, Volume2, VolumeX, CheckCircle2, Loader2 } from "lucide-react";
import { useChat } from "@ai-sdk/react";
import type { Message, ToolInvocation } from "ai";

// ─── CONSTANTS ────────────────────────────────────────────────────────────────
const STORAGE_KEY = "aero_chat_history_v1";
const QUICK_REPLIES = [
  "Heathrow parking prices",
  "Luton Meet & Greet",
  "Any discount codes?",
  "Is there ULEZ?",
];
const WELCOME_MESSAGE: Message = {
  id: "welcome",
  role: "assistant",
  content:
    "Hi, I'm Aero! ✈️ I can check live rates for Heathrow and Luton, find discount codes, and build your booking. How can I help?",
};

// Detect an airport mention in free chat text for the email-quote lead.
function detectAirport(messages: Message[]): string {
  const text = messages.map((m) => m.content || "").join(" ").toLowerCase();
  if (text.includes("heathrow") || text.includes("lhr")) return "Heathrow (LHR)";
  return "Luton (LTN)";
}

// ─── RESULT TYPES ─────────────────────────────────────────────────────────────
interface PriceRate {
  provider:   string;
  type:       string;
  dailyRate:  number | null;
  total?:     number | null;
  priceType?: 'total' | 'from-daily';
}
interface CheckLivePricesResult {
  airport?: string;
  rates?:   PriceRate[];
  dated?:   boolean;
  error?:   string;
}
interface BuildBookingResult {
  success?: boolean;
  url?:     string;
}
interface GetPromoResult {
  hasPromo?:        boolean;
  code?:            string;
  discountPercent?: number;
  message?:         string;
}

// ─── TOOL BLOCK ───────────────────────────────────────────────────────────────
function ToolBlock({ tool }: { tool: ToolInvocation }) {

  if (tool.toolName === "checkLivePrices" && tool.state !== "result") {
    return (
      <div className="text-blue-500/70 text-[10px] font-black uppercase tracking-widest animate-pulse mt-1">
        Scanning live database...
      </div>
    );
  }

  if (tool.toolName === "checkLivePrices" && tool.state === "result") {
    const data = tool.result as CheckLivePricesResult;
    if (!data || data.error || !data.rates?.length) return null;
    return (
      <div className="mt-3 space-y-2">
        <p className="text-[9px] font-black uppercase tracking-widest text-slate-400 mb-1">
          {data.dated ? "Live total for your dates" : "Live rates"} — {data.airport}
        </p>
        {data.rates.map((r, i) => {
          const hasTotal = r.total != null && Number(r.total) > 0;
          return (
            <div key={i} className="flex items-center justify-between bg-slate-50 border border-slate-100 rounded-xl px-3 py-2.5">
              <div>
                <p className="text-xs font-black text-slate-800 leading-tight">{r.provider}</p>
                <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">
                  {r.type?.replace("-", " ")}
                </p>
              </div>
              <span className="text-sm font-black text-blue-600 text-right">
                {hasTotal ? (
                  <>£{Number(r.total).toFixed(2)}<span className="text-[9px] font-bold text-slate-400"> total</span></>
                ) : r.dailyRate != null ? (
                  <><span className="text-[9px] font-bold text-slate-400">from </span>£{Number(r.dailyRate).toFixed(2)}<span className="text-[9px] font-bold text-slate-400">/day</span></>
                ) : null}
              </span>
            </div>
          );
        })}
      </div>
    );
  }

  if (tool.toolName === "getActivePromo" && tool.state === "result") {
    const data = tool.result as GetPromoResult;
    if (!data?.hasPromo || !data.code) return null;
    return (
      <div className="mt-3 bg-emerald-50 border border-emerald-200 rounded-xl px-3 py-3 flex items-center gap-3">
        <span className="text-lg">🎟️</span>
        <div>
          <p className="text-xs font-black text-emerald-700 tracking-wide">
            {data.discountPercent}% OFF · code <span className="font-mono">{data.code}</span>
          </p>
          <p className="text-[10px] font-bold text-emerald-600/80">Apply at checkout</p>
        </div>
      </div>
    );
  }

  if (tool.toolName === "buildCustomBooking" && tool.state !== "result") {
    return (
      <div className="text-blue-500/70 text-[10px] font-black uppercase tracking-widest animate-pulse mt-1">
        Generating your booking...
      </div>
    );
  }

  if (tool.toolName === "buildCustomBooking" && tool.state === "result") {
    const data = tool.result as BuildBookingResult;
    if (!data?.url) return null;
    return (
      <a
        href={data.url}
        onClick={() => { try { (window as any).gtag?.("event", "chat_booking_click", { destination: data.url }); } catch {} }}
        className="inline-block mt-3 bg-blue-600 text-white px-5 py-3 rounded-xl text-xs font-black uppercase tracking-wider hover:bg-blue-700 transition-all shadow-md active:scale-95"
      >
        👉 View Custom Parking Options
      </a>
    );
  }

  return null;
}

// ─── MESSAGE BUBBLE ───────────────────────────────────────────────────────────
function MessageBubble({ message }: { message: Message }) {
  const isUser = message.role === "user";
  if (!isUser && !message.content && !message.toolInvocations?.length) return null;

  return (
    <div className={`flex ${isUser ? "justify-end" : "justify-start"}`}>
      <div className={`max-w-[85%] px-5 py-4 text-sm font-semibold leading-relaxed shadow-sm transition-all ${
        isUser
          ? "bg-blue-600 text-white rounded-[1.5rem] rounded-tr-none"
          : "bg-white border border-slate-200 text-slate-700 rounded-[1.5rem] rounded-tl-none"
      }`}>
        {message.content && message.content.trim() !== "" && (
          <div className="whitespace-pre-wrap break-words">{message.content}</div>
        )}
        {message.toolInvocations?.map((t) => (
          <ToolBlock key={t.toolCallId} tool={t} />
        ))}
      </div>
    </div>
  );
}

// ─── TYPING INDICATOR ─────────────────────────────────────────────────────────
function TypingIndicator() {
  return (
    <div className="flex justify-start items-center gap-3">
      <div className="bg-white border border-slate-200 rounded-full px-5 py-3 flex items-center gap-3 shadow-sm">
        <div className="flex gap-1">
          <div className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-bounce" />
          <div className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-bounce [animation-delay:-0.15s]" />
          <div className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-bounce [animation-delay:-0.3s]" />
        </div>
        <span className="text-[10px] text-slate-400 font-black uppercase tracking-widest">AERO Processing</span>
      </div>
    </div>
  );
}

// ─── MAIN ─────────────────────────────────────────────────────────────────────
export default function Chatbot() {
  const [isOpen, setIsOpen] = useState(false);
  const [showNudge, setShowNudge] = useState(false);
  const [ttsOn, setTtsOn] = useState(false);
  const [showEmailForm, setShowEmailForm] = useState(false);
  const [leadEmail, setLeadEmail] = useState("");
  const [leadStatus, setLeadStatus] = useState<"idle" | "sending" | "sent" | "error">("idle");
  const scrollRef = useRef<HTMLDivElement>(null);
  const spokenRef = useRef<Set<string>>(new Set());

  const {
    messages,
    input,
    handleInputChange,
    handleSubmit,
    append,
    setMessages,
    isLoading,
    error,
  } = useChat({
    api:      "/api/chat",
    maxSteps: 5,
    initialMessages: [WELCOME_MESSAGE],
  });

  // ── Restore persisted conversation on mount ──────────────────────────────
  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const saved = JSON.parse(raw) as Message[];
        if (Array.isArray(saved) && saved.length > 1) setMessages(saved);
      }
    } catch { /* ignore corrupt storage */ }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Persist conversation whenever it changes ─────────────────────────────
  useEffect(() => {
    try {
      if (messages.length > 1) localStorage.setItem(STORAGE_KEY, JSON.stringify(messages.slice(-40)));
    } catch { /* quota / private mode — ignore */ }
  }, [messages]);

  // ── Auto-scroll ──────────────────────────────────────────────────────────
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
    }
  }, [messages, isLoading]);

  // ── Proactive nudge after inactivity (once per session) ──────────────────
  useEffect(() => {
    if (isOpen) { setShowNudge(false); return; }
    if (sessionStorage.getItem("aero_nudged")) return;
    const t = setTimeout(() => {
      if (!isOpen) {
        setShowNudge(true);
        try { sessionStorage.setItem("aero_nudged", "1"); } catch {}
        try { (window as any).gtag?.("event", "chat_nudge_shown"); } catch {}
      }
    }, 25000);
    return () => clearTimeout(t);
  }, [isOpen]);

  // ── Speak new assistant replies when TTS is enabled ──────────────────────
  useEffect(() => {
    if (!ttsOn || typeof window === "undefined" || !window.speechSynthesis) return;
    const last = messages[messages.length - 1];
    if (!last || last.role !== "assistant" || !last.content || isLoading) return;
    if (spokenRef.current.has(last.id)) return;
    spokenRef.current.add(last.id);
    try {
      const u = new SpeechSynthesisUtterance(last.content.replace(/[*_#`]/g, ""));
      u.rate = 1.05; u.pitch = 1; u.lang = "en-GB";
      window.speechSynthesis.cancel();
      window.speechSynthesis.speak(u);
    } catch { /* TTS unsupported — ignore */ }
  }, [messages, ttsOn, isLoading]);

  const openChat = () => {
    setIsOpen(true);
    setShowNudge(false);
    try { (window as any).gtag?.("event", "chat_opened"); } catch {}
  };

  const closeChat = () => {
    setIsOpen(false);
    try { window.speechSynthesis?.cancel(); } catch {}
  };

  const sendQuickReply = (text: string) => {
    try { (window as any).gtag?.("event", "chat_quick_reply", { reply: text }); } catch {}
    append({ role: "user", content: text });
  };

  const toggleTts = () => {
    setTtsOn((on) => {
      if (on) { try { window.speechSynthesis?.cancel(); } catch {} }
      return !on;
    });
  };

  const submitLead = async (e: React.FormEvent) => {
    e.preventDefault();
    const valid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(leadEmail.trim());
    if (!valid || leadStatus === "sending") return;
    setLeadStatus("sending");
    try {
      const res = await fetch("/api/email-quote", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: leadEmail.trim(), airport: detectAirport(messages), serviceType: "meet-greet" }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok && data?.success) {
        setLeadStatus("sent");
        try { (window as any).gtag?.("event", "generate_lead", { source: "chatbot" }); } catch {}
      } else {
        setLeadStatus("error");
      }
    } catch { setLeadStatus("error"); }
  };

  // Show quick replies only at the very start of a conversation.
  const showQuickReplies = messages.length <= 1 && !isLoading;

  return (
    <>
      <style>{`
        @keyframes shimmer { to { background-position: 200% center } }
        .shimmer-line {
          background: linear-gradient(90deg, transparent, rgba(96,165,250,0.8), transparent);
          background-size: 200% auto;
          animation: shimmer 3s linear infinite;
        }
        .chat-scroll::-webkit-scrollbar       { width: 4px }
        .chat-scroll::-webkit-scrollbar-track { background: transparent }
        .chat-scroll::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 99px }
        .chat-scroll { scrollbar-width: thin; scrollbar-color: #cbd5e1 transparent }
      `}</style>

      {/* ── PROACTIVE NUDGE ───────────────────────────────────────────────── */}
      {showNudge && !isOpen && (
        <button
          onClick={openChat}
          aria-label="Open Aero — get a quote"
          className="fixed bottom-24 right-6 z-50 max-w-[260px] bg-white border border-slate-200 rounded-2xl rounded-br-none shadow-[0_15px_40px_-10px_rgba(0,0,0,0.25)] px-4 py-3 text-left animate-in slide-in-from-bottom-2 fade-in"
        >
          <p className="text-[10px] font-black uppercase tracking-widest text-blue-600 mb-1 flex items-center gap-1.5">
            <span className="relative flex h-2 w-2"><span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" /><span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" /></span>
            Aero
          </p>
          <p className="text-xs font-bold text-slate-700 leading-snug">👋 Need a price for Luton or Heathrow? I can check live rates in seconds.</p>
        </button>
      )}

      {/* ── FLOATING TRIGGER ──────────────────────────────────────────────── */}
      <button
        onClick={openChat}
        aria-hidden={isOpen}
        tabIndex={isOpen ? -1 : 0}
        aria-label="Open AERO parking assistant"
        className={`fixed bottom-6 right-6 z-50 group transition-all duration-500 ease-[cubic-bezier(0.34,1.56,0.64,1)] ${
          isOpen ? "scale-0 opacity-0 pointer-events-none" : "scale-100 opacity-100"
        }`}
      >
        {/* Tooltip */}
        <div className="absolute -top-12 left-1/2 -translate-x-1/2 whitespace-nowrap bg-slate-900 text-white text-[10px] font-black uppercase tracking-[0.2em] px-4 py-2 rounded-full opacity-0 group-hover:opacity-100 transition-all duration-300 translate-y-2 group-hover:translate-y-0 shadow-xl border border-white/10 pointer-events-none">
          Initialize Aero
          <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-2 h-2 bg-slate-900 rotate-45" />
        </div>

        {/* Button — original waveform design */}
        <div className="w-16 h-16 bg-blue-600 rounded-[2rem] flex items-center justify-center gap-1.5 shadow-[0_15px_40px_-10px_rgba(37,99,235,0.6)] border border-blue-400/30 overflow-hidden relative transition-all duration-300 group-hover:rounded-2xl group-hover:rotate-3 active:scale-90">
          <div className="absolute inset-0 bg-gradient-to-br from-white/20 to-transparent mix-blend-overlay" />
          {/* Waveform bars */}
          <div className="w-1.5 h-6 bg-white rounded-full shadow-[0_0_15px_rgba(255,255,255,1)] animate-[pulse_1.5s_infinite]" />
          <div className="w-1.5 h-6 bg-white rounded-full shadow-[0_0_15px_rgba(255,255,255,1)] animate-[pulse_1.5s_infinite_0.2s]" />
          {/* Live dot */}
          <div className="absolute top-4 right-4 w-3 h-3 bg-emerald-500 border-2 border-blue-600 rounded-full animate-bounce" />
        </div>
      </button>

      {/* ── CHAT WINDOW ───────────────────────────────────────────────────── */}
      <div
        role="dialog"
        aria-label="AERO parking assistant"
        aria-modal="true"
        className={`fixed bottom-4 right-4 md:bottom-6 md:right-6 w-[calc(100%-2rem)] md:w-[400px] bg-white rounded-[2.5rem] shadow-[0_20px_60px_-15px_rgba(0,0,0,0.3)] border border-slate-200 z-50 overflow-hidden transition-all duration-500 ease-[cubic-bezier(0.34,1.56,0.64,1)] origin-bottom-right flex flex-col ${
          isOpen
            ? "scale-100 opacity-100 h-[600px]"
            : "scale-75 opacity-0 pointer-events-none h-0"
        }`}
      >
        {/* ── HEADER — original dark design ───────────────────────────────── */}
        <div className="bg-[#0A101D] p-5 flex items-center justify-between relative shrink-0">
          {/* Shimmer line */}
          <div className="absolute top-0 left-0 w-full h-[2px] shimmer-line" />

          <div className="flex items-center gap-4 relative z-10">
            {/* Avatar — original large w-12 h-12 with two pulse bars */}
            <div className="relative">
              <div className="w-12 h-12 bg-blue-600 rounded-2xl flex items-center justify-center gap-1 shadow-lg border border-blue-400/30">
                <div className="w-1 h-4 bg-white rounded-full animate-pulse" />
                <div className="w-1 h-4 bg-white rounded-full animate-pulse [animation-delay:150ms]" />
              </div>
              {/* Live indicator */}
              <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-emerald-500 border-2 border-[#0A101D] rounded-full" />
            </div>

            <div>
              <h3 className="text-white font-black uppercase tracking-[0.15em] text-xs flex items-center gap-2">
                Aero Intelligence <ShieldCheck className="w-3 h-3 text-blue-400" />
              </h3>
              {/* Original "Neural Link Active" status */}
              <div className="flex items-center gap-2 mt-0.5">
                <span className="text-emerald-400 text-[10px] font-bold uppercase tracking-widest animate-pulse">
                  Neural Link Active
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 relative z-10">
            <button
              onClick={toggleTts}
              aria-label={ttsOn ? "Mute Aero voice" : "Enable Aero voice"}
              aria-pressed={ttsOn}
              className={`p-2.5 rounded-xl transition-all ${ttsOn ? "text-blue-400 bg-blue-500/10" : "text-slate-400 hover:text-white hover:bg-white/10"}`}
            >
              {ttsOn ? <Volume2 className="w-5 h-5" /> : <VolumeX className="w-5 h-5" />}
            </button>
            <button
              onClick={closeChat}
              aria-label="Minimise chat"
              className="p-2.5 text-slate-400 hover:text-white hover:bg-white/10 rounded-xl transition-all"
            >
              <Minus className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* ── MESSAGES ────────────────────────────────────────────────────── */}
        <div
          ref={scrollRef}
          className="flex-1 bg-[#F8FAFC] p-6 overflow-y-auto flex flex-col gap-5 chat-scroll"
        >
          {messages.map((m) => (
            <MessageBubble key={m.id} message={m} />
          ))}

          {isLoading && <TypingIndicator />}

          {showQuickReplies && (
            <div className="flex flex-wrap gap-2 mt-1">
              {QUICK_REPLIES.map((q) => (
                <button
                  key={q}
                  onClick={() => sendQuickReply(q)}
                  className="bg-white border border-slate-200 text-slate-600 hover:border-blue-400 hover:text-blue-600 text-[11px] font-bold px-3.5 py-2 rounded-full transition-all active:scale-95 shadow-sm"
                >
                  {q}
                </button>
              ))}
            </div>
          )}

          {error && (
            <div className="bg-red-50 border border-red-100 p-4 rounded-2xl text-red-600 text-[11px] font-bold uppercase tracking-wider text-center">
              AERO Connection Offline. Refreshing neural link...
            </div>
          )}
        </div>

        {/* ── EMAIL QUOTE CAPTURE ─────────────────────────────────────────── */}
        <div className="px-6 pt-3 bg-white shrink-0">
          {leadStatus === "sent" ? (
            <p className="flex items-center justify-center gap-2 text-[11px] font-bold text-emerald-600 py-1">
              <CheckCircle2 className="w-4 h-4" /> Quote on its way — check your inbox.
            </p>
          ) : showEmailForm ? (
            <form onSubmit={submitLead} className="flex items-center gap-2">
              <input
                type="email"
                value={leadEmail}
                onChange={(e) => { setLeadEmail(e.target.value); if (leadStatus === "error") setLeadStatus("idle"); }}
                placeholder="your@email.com"
                autoComplete="email"
                aria-label="Email for your quote"
                className="flex-1 bg-slate-50 border-2 border-slate-100 rounded-xl px-4 py-2.5 text-xs font-bold text-slate-700 outline-none focus:border-blue-500 transition-all"
              />
              <button
                type="submit"
                disabled={leadStatus === "sending"}
                className="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-xl text-[11px] font-black uppercase tracking-wider transition-all active:scale-95 flex items-center gap-1.5"
              >
                {leadStatus === "sending" ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : "Send"}
              </button>
            </form>
          ) : (
            <button
              onClick={() => setShowEmailForm(true)}
              className="w-full flex items-center justify-center gap-2 text-[11px] font-bold text-slate-500 hover:text-blue-600 transition-colors py-1"
            >
              <Mail className="w-3.5 h-3.5" /> Email me this quote
            </button>
          )}
          {leadStatus === "error" && (
            <p className="text-rose-500 text-[10px] font-semibold text-center mt-1">Couldn't send — please try again.</p>
          )}
        </div>

        {/* ── INPUT ───────────────────────────────────────────────────────── */}
        <div className="p-6 pt-3 bg-white border-t border-slate-100 shrink-0">
          <form onSubmit={handleSubmit} className="flex items-center gap-3 relative">
            <div className="relative w-full">
              <input
                type="text"
                value={input}
                onChange={handleInputChange}
                placeholder="Ask Aero about parking, ULEZ, or rates..."
                aria-label="Message AERO"
                disabled={isLoading}
                className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl pl-5 pr-14 py-4 text-sm font-bold text-slate-700 outline-none focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-500/5 transition-all disabled:opacity-60"
              />
              <button
                type="submit"
                disabled={!input.trim() || isLoading}
                aria-label="Send message"
                className="absolute right-2 top-1/2 -translate-y-1/2 p-3 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-200 disabled:text-slate-400 text-white rounded-xl transition-all shadow-lg active:scale-95 flex items-center justify-center"
              >
                {isLoading
                  ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  : <Send className="w-5 h-5" />
                }
              </button>
            </div>
          </form>

          <p className="text-center text-[9px] text-slate-400 font-bold uppercase tracking-widest mt-4 flex items-center justify-center gap-2">
            <Bot className="w-3 h-3" /> Powered by Aero Intelligence v3.4
          </p>
        </div>
      </div>
    </>
  );
}