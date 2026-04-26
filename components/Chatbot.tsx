"use client";

import { useState } from "react";
import { X, Send, Minus } from "lucide-react";

export default function Chatbot() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([
    { sender: "aero", text: "Hi, I'm Aero! How can I assist with your secure parking today?" }
  ]);
  const [input, setInput] = useState("");

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;

    const userMessage = input;
    
    // 1. Add user message to screen
    setMessages(prev => [...prev, { sender: "user", text: userMessage }]);
    setInput("");

    // 2. Add a temporary "Aero is typing..." message
    setMessages(prev => [...prev, { sender: "aero", text: "..." }]);

    try {
      // 3. Ping your new OpenAI API
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: userMessage }),
      });

      const data = await res.json();

      // 4. Replace the "..." with Aero's real answer from OpenAI
      setMessages(prev => {
        const newMsgs = [...prev];
        newMsgs[newMsgs.length - 1] = { 
          sender: "aero", 
          text: data.reply || "My connection to the mainframe was interrupted. Please try again." 
        };
        return newMsgs;
      });

    } catch (error) {
      setMessages(prev => {
        const newMsgs = [...prev];
        newMsgs[newMsgs.length - 1] = { sender: "aero", text: "I am experiencing network interference. Please contact info@aeroparkdirect.co.uk." };
        return newMsgs;
      });
    }
  };

  return (
    <>
      {/* THE AERO FLOATING BUTTON */}
      <button
        onClick={() => setIsOpen(true)}
        className={`fixed bottom-6 right-6 z-50 group transition-all duration-500 ease-[cubic-bezier(0.34,1.56,0.64,1)] ${
          isOpen ? "scale-0 opacity-0 pointer-events-none" : "scale-100 opacity-100 cursor-pointer"
        }`}
      >
        <div className="absolute -top-10 left-1/2 -translate-x-1/2 whitespace-nowrap bg-slate-900 text-white text-[10px] font-black uppercase tracking-widest px-3 py-1.5 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none">
          Ask Aero
          <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-2 h-2 bg-slate-900 rotate-45"></div>
        </div>

        <div className="w-14 h-14 md:w-16 md:h-16 bg-blue-600 rounded-2xl flex items-center justify-center gap-1.5 shadow-[0_10px_30px_rgba(37,99,235,0.4)] border border-blue-400/30 overflow-hidden relative transition-transform duration-300 group-hover:scale-105 active:scale-95">
          <div className="absolute inset-0 bg-gradient-to-br from-blue-400/20 to-transparent mix-blend-overlay"></div>
          <div className="w-1.5 h-5 bg-white rounded-full shadow-[0_0_10px_rgba(255,255,255,0.8)] animate-pulse"></div>
          <div className="w-1.5 h-5 bg-white rounded-full shadow-[0_0_10px_rgba(255,255,255,0.8)] animate-pulse delay-75"></div>
          <div className="absolute top-2 right-2 w-2.5 h-2.5 bg-red-500 border-2 border-blue-600 rounded-full"></div>
        </div>
      </button>

      {/* THE AERO CHAT WINDOW */}
      <div 
        className={`fixed bottom-4 right-4 md:bottom-6 md:right-6 w-[calc(100%-2rem)] md:w-[380px] bg-white rounded-3xl shadow-2xl border border-slate-200 z-50 overflow-hidden transition-all duration-500 ease-[cubic-bezier(0.34,1.56,0.64,1)] origin-bottom-right flex flex-col ${
          isOpen ? "scale-100 opacity-100 pointer-events-auto h-[450px]" : "scale-50 opacity-0 pointer-events-none h-0"
        }`}
      >
        {/* Header */}
        <div className="bg-[#0A101D] p-4 flex items-center justify-between relative overflow-hidden shrink-0">
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-500 to-emerald-400"></div>
          
          <div className="flex items-center gap-3 relative z-10">
            <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center gap-1 shadow-lg border border-blue-400/30 relative">
              <div className="absolute inset-0 bg-gradient-to-br from-blue-400/20 to-transparent mix-blend-overlay rounded-xl"></div>
              <div className="w-1 h-3 bg-white rounded-full shadow-[0_0_5px_rgba(255,255,255,0.8)] animate-pulse"></div>
              <div className="w-1 h-3 bg-white rounded-full shadow-[0_0_5px_rgba(255,255,255,0.8)] animate-pulse delay-75"></div>
            </div>
            
            <div>
              <h3 className="text-white font-black uppercase tracking-widest text-sm">Aero Assistant</h3>
              <div className="flex items-center gap-1.5">
                <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></div>
                <span className="text-emerald-400 text-[9px] font-bold uppercase tracking-widest">Online & Scanning</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-1 relative z-10">
            <button onClick={() => setIsOpen(false)} className="p-2 text-slate-400 hover:text-white hover:bg-white/10 rounded-lg transition-colors">
              <Minus className="w-4 h-4" />
            </button>
            <button onClick={() => setIsOpen(false)} className="p-2 text-slate-400 hover:text-white hover:bg-white/10 rounded-lg transition-colors">
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Chat Area */}
        <div className="flex-1 bg-slate-50 p-4 overflow-y-auto flex flex-col gap-4">
          {messages.map((msg, i) => (
            <div key={i} className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[85%] rounded-2xl p-3 text-sm font-medium leading-relaxed ${
                msg.sender === 'user' 
                  ? 'bg-blue-600 text-white rounded-br-sm' 
                  : 'bg-white border border-slate-200 text-slate-700 rounded-bl-sm shadow-sm'
              }`}>
                {msg.text}
              </div>
            </div>
          ))}
        </div>

        {/* Input Area */}
        <div className="p-4 bg-white border-t border-slate-100 shrink-0">
          <form onSubmit={handleSend} className="flex items-center gap-2 relative">
            <input 
              type="text" 
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask about cancellation, security..." 
              className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-4 pr-12 py-3 text-sm font-semibold outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all"
            />
            <button 
              type="submit"
              disabled={!input.trim()}
              className="absolute right-2 p-2 bg-blue-600 hover:bg-blue-500 disabled:bg-slate-300 text-white rounded-lg transition-colors"
            >
              <Send className="w-4 h-4" />
            </button>
          </form>
        </div>
      </div>
    </>
  );
}