"use client";

import { useState } from "react";
import { MessageCircle, X, Send, Plane } from "lucide-react";

export default function Chatbot() {
  const [isOpen, setIsOpen] = useState(false);
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<{role: string, content: string}[]>([]);
  const [isTyping, setIsTyping] = useState(false);

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
      setMessages((prev) => [...prev, { role: "assistant", content: "Sorry, I'm having trouble connecting." }]);
    } finally {
      setIsTyping(false);
    }
  };

  return (
    <div className="fixed bottom-6 right-6 z-[999999]">
      {isOpen && (
        <div className="mb-4 w-[350px] h-[500px] bg-white rounded-3xl shadow-2xl border border-slate-200 flex flex-col overflow-hidden">
          <div className="bg-slate-900 p-4 flex items-center justify-between text-white">
            <div className="flex items-center gap-2">
              <Plane className="w-5 h-5 text-blue-400 rotate-45" />
              <span className="font-bold text-xs uppercase tracking-widest">AEROPARK SUPPORT</span>
            </div>
            <button onClick={() => setIsOpen(false)}><X /></button>
          </div>

          <div className="flex-1 p-4 overflow-y-auto bg-slate-50 flex flex-col gap-3">
            {messages.length === 0 && <p className="text-center text-slate-400 text-xs mt-10">How can I help you with parking?</p>}
            {messages.map((m, i) => (
              <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`p-3 rounded-2xl text-sm max-w-[85%] ${m.role === 'user' ? 'bg-blue-600 text-white' : 'bg-white border text-slate-800'}`}>
                  {m.content}
                </div>
              </div>
            ))}
            {isTyping && <div className="text-xs text-blue-500 animate-pulse">Assistant is typing...</div>}
          </div>

          <form onSubmit={sendMessage} className="p-3 bg-white border-t flex items-center gap-2">
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Type here..."
              className="flex-1 bg-slate-100 rounded-full px-4 py-2 text-sm outline-none text-black"
            />
            <button type="submit" className="w-10 h-10 bg-blue-600 text-white rounded-full flex items-center justify-center">
              <Send className="w-4 h-4 ml-0.5" />
            </button>
          </form>
        </div>
      )}

      <button onClick={() => setIsOpen(!isOpen)} className="w-14 h-14 rounded-full bg-blue-600 text-white flex items-center justify-center shadow-2xl">
        {isOpen ? <X /> : <MessageCircle />}
      </button>
    </div>
  );
}