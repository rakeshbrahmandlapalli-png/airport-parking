"use client";

/**
 * AERO Chatbot — Original Design Restored
 * SDK: ai@4.x · @ai-sdk/react@1.x (all type fixes kept)
 * Design: Original aesthetic from v1 — dark header, waveform trigger,
 *         shimmer line, Neural Link Active, large avatar, frosted glass feel
 */

import { useState, useEffect, useRef } from "react";
import { Send, Minus, Bot, ShieldCheck, Plane } from "lucide-react";
import { useChat } from "@ai-sdk/react";
import type { Message, ToolInvocation } from "ai";

// ─── RESULT TYPES ─────────────────────────────────────────────────────────────
interface PriceRate {
  provider:  string;
  type:      string;
  dailyRate: number;
}
interface CheckLivePricesResult {
  airport?: string;
  rates?:   PriceRate[];
  error?:   string;
}
interface BuildBookingResult {
  success?: boolean;
  url?:     string;
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
          Live rates — {data.airport}
        </p>
        {data.rates.map((r, i) => (
          <div key={i} className="flex items-center justify-between bg-slate-50 border border-slate-100 rounded-xl px-3 py-2.5">
            <div>
              <p className="text-xs font-black text-slate-800 leading-tight">{r.provider}</p>
              <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">
                {r.type?.replace("-", " ")}
              </p>
            </div>
            <span className="text-sm font-black text-blue-600">
              £{Number(r.dailyRate).toFixed(2)}
              <span className="text-[9px] font-bold text-slate-400">/day</span>
            </span>
          </div>
        ))}
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
  const scrollRef = useRef<HTMLDivElement>(null);

  const {
    messages,
    input,
    handleInputChange,
    handleSubmit,
    isLoading,
    error,
  } = useChat({
    api:      "/api/chat",
    maxSteps: 5,
    initialMessages: [{
      id:      "welcome",
      role:    "assistant",
      content: "Hi, I'm Aero! ✈️ I'm currently scanning live rates for Heathrow and Luton. How can I assist with your secure parking today?",
    }],
  });

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
    }
  }, [messages, isLoading]);

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

      {/* ── FLOATING TRIGGER ──────────────────────────────────────────────── */}
      <button
        onClick={() => setIsOpen(true)}
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
              onClick={() => setIsOpen(false)}
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

          {error && (
            <div className="bg-red-50 border border-red-100 p-4 rounded-2xl text-red-600 text-[11px] font-bold uppercase tracking-wider text-center">
              AERO Connection Offline. Refreshing neural link...
            </div>
          )}
        </div>

        {/* ── INPUT ───────────────────────────────────────────────────────── */}
        <div className="p-6 bg-white border-t border-slate-100 shrink-0">
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