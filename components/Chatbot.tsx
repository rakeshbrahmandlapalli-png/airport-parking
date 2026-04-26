"use client";

import { useState, useEffect } from "react";
import { MessageCircle, X, Send, Bot, ShieldCheck, Zap } from "lucide-react";

export default function Chatbot() {
  const [isOpen, setIsOpen] = useState(false);
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<{role: string, content: string}[]>([]);
  const [isTyping, setIsTyping] = useState(false);

  // 🟢 AERO'S AUTOMATED WELCOME
  useEffect(() => {
    if (isOpen && messages.length === 0) {
      setIsTyping(true);
      setTimeout(() => {
        setMessages([
          { 
            role: "assistant", 
            content: "Hi! I'm AERO, your Smart Booking Agent. I've already scanned today's best rates. How can I help you secure your parking?" 
          }
        ]);
        setIsTyping(false);
      }, 800);
    }
  }, [isOpen, messages.length]);

  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isTyping) return;

    const userMsg = { role: "user", content: input };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setIsTyping(true);

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        body: JSON.stringify({ messages: [...messages, userMsg] }),
      });

      const data = await response.text();
      setMessages((prev) => [...prev, { role: "assistant", content: data }]);
    } catch (error) {
      setMessages((prev) => [...prev, { role: "assistant", content: "I'm having trouble connecting to the hub. Please try again." }]);
    } finally {
      setIsTyping(false);
    }
  };

  return (
    <div className="fixed bottom-6 right-6 z-[999999]">
      {isOpen && (
        <div className="mb-4 w-[350px] h-[550px] bg-white rounded-[2.5rem] shadow-[0_20px_50px_rgba(0,0,0,0.2)] border border-slate-200 flex flex-col overflow-hidden">
          
          {/* 🟢 AERO HEADER */}
          <div className="bg-slate-900 p-5 flex items-center justify-between text-white relative overflow-hidden">
            <div className="absolute inset-0 bg-blue-600/10 animate-pulse"></div>
            <div className="flex items-center gap-3 relative z-10">
              <div className="w-10 h-10 rounded-2xl bg-blue-600 flex items-center justify-center shadow-lg shadow-blue-600/40">
                <Bot className="w-6 h-6 text-white" />
              </div>
              <div className="flex flex-col">
                <span className="font-black text-xs uppercase tracking-[0.2em]">AERO</span>
                <div className="flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                  <span className="text-[9px] font-black text-emerald-400 uppercase tracking-widest">Smart Agent Online</span>
                </div>
              </div>
            </div>
            <button 
              onClick={() => setIsOpen(false)}
              className="relative z-10 p-2 hover:bg-white/10 rounded-full transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* CHAT AREA */}
          <div className="flex-1 p-4 overflow-y-auto bg-slate-50 flex flex-col gap-4">
            {messages.map((m, i) => (
              <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`p-4 rounded-[1.5rem] text-sm max-w-[85%] leading-relaxed shadow-sm ${
                  m.role === 'user' 
                  ? 'bg-blue-600 text-white rounded-tr-none' 
                  : 'bg-white border border-slate-100 text-slate-800 rounded-tl-none'
                }`}>
                  {m.content}
                </div>
              </div>
            ))}
            
            {isTyping && (
              <div className="flex items-center gap-2 text-blue-500">
                <Zap className="w-3 h-3 animate-bounce" />
                <span className="text-[10px] font-black uppercase tracking-widest">AERO is thinking...</span>
              </div>
            )}
          </div>

          {/* INPUT AREA */}
          <form onSubmit={sendMessage} className="p-4 bg-white border-t border-slate-100 flex items-center gap-2">
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask AERO about parking..."
              className="flex-1 bg-slate-100 rounded-2xl px-5 py-3 text-sm outline-none text-black placeholder:text-slate-400 font-medium"
            />
            <button 
              type="submit" 
              disabled={isTyping}
              className="w-12 h-12 bg-slate-900 text-white rounded-2xl flex items-center justify-center hover:bg-blue-600 transition-all active:scale-90 disabled:opacity-50"
            >
              <Send className="w-5 h-5 ml-0.5" />
            </button>
          </form>
        </div>
      )}

      {/* FLOATING BUTTON */}
      <button 
        onClick={() => setIsOpen(!isOpen)} 
        className={`w-16 h-16 rounded-[1.5rem] flex items-center justify-center shadow-2xl transition-all duration-300 ${
          isOpen ? 'bg-slate-900 rotate-90' : 'bg-blue-600 hover:scale-110 active:scale-95'
        } text-white`}
      >
        {isOpen ? <X className="w-7 h-7" /> : <Bot className="w-8 h-8" />}
      </button>
    </div>
  );
}