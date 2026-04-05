"use client";

import { useChat } from "@ai-sdk/react";
import { useState } from "react";
import { MessageCircle, X, Send, Plane } from "lucide-react";

export default function Chatbot() {
  const [isOpen, setIsOpen] = useState(false);
  const { messages, input, handleInputChange, handleSubmit, isLoading } = useChat({
    api: '/api/chat',
  });

  return (
    /* We set z-[99999] to ensure it is above EVERYTHING else */
    <div className="fixed bottom-6 right-6 z-[99999] font-sans">
      {isOpen && (
        <div className="mb-4 w-[350px] h-[500px] bg-white rounded-3xl shadow-2xl border border-slate-200 flex flex-col overflow-hidden animate-in slide-in-from-bottom-5">
          {/* Header */}
          <div className="bg-slate-900 p-4 flex items-center justify-between">
            <div className="flex items-center gap-2 text-white">
              <Plane className="w-5 h-5 text-blue-400 rotate-45" />
              <span className="font-bold uppercase text-xs tracking-widest">VIP Assistant</span>
            </div>
            <button onClick={() => setIsOpen(false)} className="text-white/50 hover:text-white p-1">
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Messages */}
          <div className="flex-1 p-4 overflow-y-auto bg-slate-50 flex flex-col gap-3">
            {messages.length === 0 && (
              <div className="text-center mt-10">
                <p className="text-slate-400 text-xs italic">Offline Mode Active</p>
                <p className="text-slate-600 text-sm font-medium mt-2">How can I help you today?</p>
              </div>
            )}
            {messages.map((m) => (
              <div key={m.id} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`p-3 rounded-2xl text-sm shadow-sm ${m.role === 'user' ? 'bg-blue-600 text-white rounded-br-none' : 'bg-white border border-slate-200 text-slate-800 rounded-bl-none'}`}>
                  {m.content}
                </div>
              </div>
            ))}
          </div>

          {/* Input Area - Force high Z-index on the button */}
          <form 
            onSubmit={(e) => {
              e.preventDefault();
              handleSubmit(e);
            }} 
            className="p-3 bg-white border-t border-slate-100 flex items-center gap-2"
          >
            <input
              value={input}
              onChange={handleInputChange}
              placeholder="Type a message..."
              className="flex-1 bg-slate-100 border-none rounded-full px-4 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500 text-slate-900"
            />
            <button 
              type="submit" 
              disabled={isLoading || !input}
              className="w-10 h-10 bg-blue-600 text-white rounded-full flex items-center justify-center hover:bg-blue-700 transition-all active:scale-90 disabled:opacity-30 relative z-[100000]"
            >
              <Send className="w-4 h-4 ml-0.5" />
            </button>
          </form>
        </div>
      )}

      {/* Floating Toggle Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-14 h-14 rounded-full bg-blue-600 text-white flex items-center justify-center shadow-2xl hover:bg-slate-900 hover:scale-110 active:scale-95 transition-all z-[99999]"
      >
        {isOpen ? <X className="w-6 h-6" /> : <MessageCircle className="w-6 h-6" />}
      </button>
    </div>
  );
}