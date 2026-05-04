"use client";

import { useState, useEffect, useRef } from "react";
import { X, Send, Minus, Bot, Sparkles, ShieldCheck } from "lucide-react";
import { useChat } from "@ai-sdk/react";

export default function Chatbot() {
  const [isOpen, setIsOpen] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

// Vercel AI SDK Hook - The 'as any' bypasses the version mismatch errors
  const { messages, input, handleInputChange, handleSubmit, isLoading, error } = (useChat as any)({
    api: '/api/chat',
    initialMessages: [
      { 
        id: 'welcome', 
        role: 'assistant', 
        content: "Hi, I'm Aero! ✈️ I'm currently scanning live rates for Heathrow and Luton. How can I assist with your secure parking today?" 
      }
    ],
  });

  // Auto-scroll logic for a smooth experience
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTo({
        top: scrollRef.current.scrollHeight,
        behavior: "smooth",
      });
    }
  }, [messages, isLoading]);

  return (
    <>
      {/* --- THE AERO FLOATING TRIGGER --- */}
      <button
        onClick={() => setIsOpen(true)}
        className={`fixed bottom-6 right-6 z-50 group transition-all duration-500 ease-[cubic-bezier(0.34,1.56,0.64,1)] ${
          isOpen ? "scale-0 opacity-0 pointer-events-none" : "scale-100 opacity-100"
        }`}
      >
        {/* Tooltip */}
        <div className="absolute -top-12 left-1/2 -translate-x-1/2 whitespace-nowrap bg-slate-900 text-white text-[10px] font-black uppercase tracking-[0.2em] px-4 py-2 rounded-full opacity-0 group-hover:opacity-100 transition-all duration-300 translate-y-2 group-hover:translate-y-0 shadow-xl border border-white/10">
          Initialize Aero
          <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-2 h-2 bg-slate-900 rotate-45"></div>
        </div>

        {/* Floating Icon */}
        <div className="w-16 h-16 bg-blue-600 rounded-[2rem] flex items-center justify-center gap-1.5 shadow-[0_15px_40px_-10px_rgba(37,99,235,0.6)] border border-blue-400/30 overflow-hidden relative transition-all duration-300 group-hover:rounded-2xl group-hover:rotate-3 active:scale-90">
          <div className="absolute inset-0 bg-gradient-to-br from-white/20 to-transparent mix-blend-overlay"></div>
          <div className="w-1.5 h-6 bg-white rounded-full shadow-[0_0_15px_rgba(255,255,255,1)] animate-[pulse_1.5s_infinite]"></div>
          <div className="w-1.5 h-6 bg-white rounded-full shadow-[0_0_15px_rgba(255,255,255,1)] animate-[pulse_1.5s_infinite_0.2s]"></div>
          
          {/* Notification Dot */}
          <div className="absolute top-4 right-4 w-3 h-3 bg-emerald-500 border-2 border-blue-600 rounded-full animate-bounce"></div>
        </div>
      </button>

      {/* --- THE AERO CHAT WINDOW --- */}
      <div 
        className={`fixed bottom-4 right-4 md:bottom-6 md:right-6 w-[calc(100%-2rem)] md:w-[400px] bg-white rounded-[2.5rem] shadow-[0_20px_60px_-15px_rgba(0,0,0,0.3)] border border-slate-200 z-50 overflow-hidden transition-all duration-500 ease-[cubic-bezier(0.34,1.56,0.64,1)] origin-bottom-right flex flex-col ${
          isOpen ? "scale-100 opacity-100 h-[600px]" : "scale-75 opacity-0 pointer-events-none h-0"
        }`}
      >
        {/* Dynamic Glassmorphic Header */}
        <div className="bg-[#0A101D] p-5 flex items-center justify-between relative shrink-0">
          <div className="absolute top-0 left-0 w-full h-[2px] bg-gradient-to-r from-transparent via-blue-400 to-transparent animate-shimmer"></div>
          
          <div className="flex items-center gap-4 relative z-10">
            <div className="relative">
              <div className="w-12 h-12 bg-blue-600 rounded-2xl flex items-center justify-center gap-1 shadow-lg border border-blue-400/30">
                <div className="w-1 h-4 bg-white rounded-full animate-pulse"></div>
                <div className="w-1 h-4 bg-white rounded-full animate-pulse delay-150"></div>
              </div>
              <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-emerald-500 border-2 border-[#0A101D] rounded-full"></div>
            </div>
            
            <div>
              <h3 className="text-white font-black uppercase tracking-[0.15em] text-xs flex items-center gap-2">
                Aero Intelligence <ShieldCheck className="w-3 h-3 text-blue-400" />
              </h3>
              <div className="flex items-center gap-2 mt-0.5">
                <span className="text-emerald-400 text-[10px] font-bold uppercase tracking-widest animate-pulse">Neural Link Active</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 relative z-10">
            <button onClick={() => setIsOpen(false)} className="p-2.5 text-slate-400 hover:text-white hover:bg-white/10 rounded-xl transition-all">
              <Minus className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Message Thread Area */}
        <div 
          ref={scrollRef}
          className="flex-1 bg-[#F8FAFC] p-6 overflow-y-auto flex flex-col gap-5 scrollbar-thin scrollbar-thumb-slate-200"
        >
          {messages.map((m:any) => (
            <div key={m.id} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'} animate-in fade-in slide-in-from-bottom-2 duration-300`}>
              <div className={`max-w-[85%] px-5 py-4 text-sm font-semibold leading-relaxed shadow-sm transition-all ${
                m.role === 'user' 
                  ? 'bg-blue-600 text-white rounded-[1.5rem] rounded-tr-none' 
                  : 'bg-white border border-slate-200 text-slate-700 rounded-[1.5rem] rounded-tl-none'
              }`}>
                <div className="whitespace-pre-wrap break-words">{m.content}</div>
              </div>
            </div>
          ))}

          {/* Scanning / Thinking State */}
          {isLoading && messages[messages.length - 1]?.role === 'user' && (
             <div className="flex justify-start items-center gap-3">
                <div className="bg-white border border-slate-200 rounded-full px-5 py-3 flex items-center gap-3 shadow-sm">
                  <div className="flex gap-1">
                    <div className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-bounce"></div>
                    <div className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-bounce [animation-delay:-0.15s]"></div>
                    <div className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-bounce [animation-delay:-0.3s]"></div>
                  </div>
                  <span className="text-[10px] text-slate-400 font-black uppercase tracking-widest">Scanning Database</span>
                </div>
             </div>
          )}

          {/* Error State */}
          {error && (
            <div className="bg-red-50 border border-red-100 p-4 rounded-2xl text-red-600 text-[11px] font-bold uppercase tracking-wider text-center">
              Connection Interrupted. Please check your network.
            </div>
          )}
        </div>

        {/* Input Control Center */}
        <div className="p-6 bg-white border-t border-slate-100 shrink-0">
          <form onSubmit={handleSubmit} className="flex items-center gap-3 relative">
            <div className="relative w-full">
              <input 
                type="text" 
                value={input}
                onChange={handleInputChange}
                placeholder="Ask Aero about parking, ULEZ, or rates..." 
                className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl pl-5 pr-14 py-4 text-sm font-bold text-slate-700 outline-none focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-500/5 transition-all placeholder:text-slate-400"
              />
              <button 
                type="submit"
                disabled={!input.trim() || isLoading}
                className="absolute right-2 top-1/2 -translate-y-1/2 p-3 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-200 text-white rounded-xl transition-all shadow-lg shadow-blue-500/20 active:scale-95"
              >
                <Send className="w-5 h-5" />
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