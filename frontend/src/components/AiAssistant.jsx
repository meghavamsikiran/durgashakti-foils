import React, { useState, useRef, useEffect } from 'react';
import { MessageSquare, X, Send, Bot, User, Loader2 } from 'lucide-react';
import apiClient from '../services/apiClient';

export default function AiAssistant() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([
    { sender: 'bot', text: 'Hello! I am your DurgaShakti assistant. Ask me anything about our foils or track your orders!' }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef(null);

  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  const handleSend = async (e) => {
    e.preventDefault();
    if (!input.trim() || loading) return;

    const userText = input;
    setInput('');
    setMessages((prev) => [...prev, { sender: 'user', text: userText }]);
    setLoading(true);

    try {
      const res = await apiClient.post('/orders/ai-chat', { message: userText });
      setMessages((prev) => [...prev, { sender: 'bot', text: res.data.response }]);
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        { sender: 'bot', text: 'Sorry, I am facing connectivity issues. Please try again in a moment.' }
      ]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed bottom-20 md:bottom-6 right-6 z-[9999] font-sans">
      {/* Trigger Button */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="flex h-14 w-14 items-center justify-center rounded-full bg-[#25D958] text-[#0C1310] shadow-lg hover:scale-105 active:scale-95 transition-all shadow-[#25D958]/20"
        >
          <MessageSquare className="h-6 w-6" />
        </button>
      )}

      {/* Chat Window */}
      {isOpen && (
        <div className="flex h-[450px] w-[320px] sm:w-[350px] flex-col rounded-2xl border border-white/10 bg-[#0a0f0d] text-white shadow-2xl overflow-hidden transition-all animate-in fade-in slide-in-from-bottom-5">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-white/5 bg-[#0c1816] px-4 py-3">
            <div className="flex items-center gap-2.5">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#25D958]/10 text-[#25D958]">
                <Bot className="h-4 w-4" />
              </div>
              <div>
                <h4 className="text-xs font-bold leading-none text-white">DurgaShakti AI</h4>
                <span className="text-[9px] text-[#25D958] font-bold">Online</span>
              </div>
            </div>
            <button onClick={() => setIsOpen(false)} className="rounded-full p-1 text-slate-400 hover:bg-white/5 transition-colors">
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* Messages List */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {messages.map((m, idx) => (
              <div key={idx} className={`flex gap-2.5 ${m.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
                {m.sender === 'bot' && (
                  <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-white/5 text-[#25D958] border border-white/10">
                    <Bot className="h-3.5 w-3.5" />
                  </div>
                )}
                <div
                  className={`rounded-2xl px-3.5 py-2 text-[11px] leading-relaxed max-w-[220px] ${
                    m.sender === 'user'
                      ? 'bg-[#25D958] text-black font-semibold rounded-tr-none'
                      : 'bg-white/5 text-slate-200 border border-white/10 rounded-tl-none'
                  }`}
                >
                  {m.text}
                </div>
              </div>
            ))}
            {loading && (
              <div className="flex gap-2.5 justify-start items-center">
                <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-white/5 text-[#25D958] border border-white/10">
                  <Bot className="h-3.5 w-3.5" />
                </div>
                <div className="flex items-center gap-1.5 rounded-2xl bg-white/5 border border-white/10 px-3.5 py-2 text-slate-400">
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  <span className="text-[10px] font-semibold">Thinking...</span>
                </div>
              </div>
            )}
            <div ref={scrollRef} />
          </div>

          {/* Input Footer */}
          <form onSubmit={handleSend} className="border-t border-white/5 bg-[#070b09] p-3 flex gap-2">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask foils, microns, track order..."
              className="flex-1 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-[11px] text-white placeholder-slate-500 focus:outline-none focus:border-[#25D958]/30"
            />
            <button
              type="submit"
              disabled={!input.trim() || loading}
              className="flex h-8 w-8 items-center justify-center rounded-full bg-[#25D958] text-black disabled:opacity-50 transition-opacity"
            >
              <Send className="h-3.5 w-3.5" />
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
