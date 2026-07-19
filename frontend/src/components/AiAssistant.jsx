import React, { useState, useRef, useEffect } from 'react';
import { MessageSquare, X, Send, Bot, User, Loader2 } from 'lucide-react';
import apiClient from '../services/core/apiClient';

export default function AiAssistant() {
  const [isOpen, setIsOpen] = useState(false);
  const [isDark, setIsDark] = useState(() => localStorage.getItem('themeMode') !== 'light');
  const [sessionId] = useState(() => {
    let id = localStorage.getItem('ai_session_id');
    if (!id) {
      id = 'session-' + Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
      localStorage.setItem('ai_session_id', id);
    }
    return id;
  });
  
  const [messages, setMessages] = useState([
    { sender: 'bot', text: 'Hello! I am your DurgaShakti assistant. Ask me anything about our foils or track your orders!' }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const scrollRef = useRef(null);

  useEffect(() => {
    const handleThemeToggle = (e) => {
      setIsDark(e.detail === 'dark');
    };
    window.addEventListener('theme-toggle', handleThemeToggle);
    return () => window.removeEventListener('theme-toggle', handleThemeToggle);
  }, []);

  // Fetch chat history from database when chat window opens
  useEffect(() => {
    if (isOpen) {
      const fetchHistory = async () => {
        setLoadingHistory(true);
        try {
          const res = await apiClient.get(`/orders/ai-chat/history?sessionId=${sessionId}`);
          if (res.data && res.data.length > 0) {
            setMessages(res.data);
          }
        } catch (err) {
          console.error("Failed to load chat history:", err);
        } finally {
          setLoadingHistory(false);
        }
      };
      fetchHistory();
    }
  }, [isOpen, sessionId]);

  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  const handleSend = async (e) => {
    e.preventDefault();
    if (!input.trim() || loading || loadingHistory) return;

    const userText = input;
    setInput('');
    setMessages((prev) => [...prev, { sender: 'user', text: userText }]);
    setLoading(true);

    try {
      const res = await apiClient.post('/orders/ai-chat', { 
        message: userText,
        sessionId: sessionId 
      });
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
          className={`flex h-14 w-14 items-center justify-center rounded-full shadow-lg hover:scale-105 active:scale-95 transition-all ${
            isDark 
              ? 'bg-[#25D958] text-[#0C1310] shadow-[#25D958]/20' 
              : 'bg-[#006e1b] text-white shadow-[#006e1b]/20'
          }`}
        >
          <MessageSquare className="h-6 w-6" />
        </button>
      )}

      {/* Chat Window */}
      {isOpen && (
        <div className={`flex h-[470px] w-[320px] sm:w-[350px] flex-col rounded-2xl border shadow-2xl overflow-hidden transition-all animate-in fade-in slide-in-from-bottom-5 ${
          isDark 
            ? 'bg-[#0a0f0d] border-white/10 text-white' 
            : 'bg-white border-[#ebefed] text-slate-800'
        }`}>
          {/* Header */}
          <div className={`flex items-center justify-between border-b px-4 py-3 ${
            isDark ? 'bg-[#0c1816] border-white/5' : 'bg-[#f0f5f2] border-[#ebefed]'
          }`}>
            <div className="flex items-center gap-2.5">
              <div className={`flex h-8 w-8 items-center justify-center rounded-full ${
                isDark ? 'bg-[#25D958]/10 text-[#25D958]' : 'bg-[#006e1b]/10 text-[#006e1b]'
              }`}>
                <Bot className="h-4 w-4" />
              </div>
              <div>
                <h4 className={`text-xs font-bold leading-none ${isDark ? 'text-white' : 'text-slate-850'}`}>DurgaShakti AI</h4>
                <span className={`text-[9px] font-bold ${isDark ? 'text-[#25D958]' : 'text-[#006e1b]'}`}>Online</span>
              </div>
            </div>
            <button 
              onClick={() => setIsOpen(false)} 
              className={`rounded-full p-1 transition-colors ${
                isDark ? 'text-slate-400 hover:bg-white/5 hover:text-white' : 'text-slate-500 hover:bg-black/5 hover:text-slate-855'
              }`}
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* Messages List */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {loadingHistory ? (
              <div className="flex flex-col items-center justify-center min-h-[300px] w-full">
                <div className={`animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 mb-3 ${isDark ? 'border-[#25D958]' : 'border-[#006e1b]'}`}></div>
                <p className={`text-[10px] font-bold uppercase tracking-wider ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>Loading chat history...</p>
              </div>
            ) : (
              <>
                {messages.map((m, idx) => (
                  <div key={idx} className={`flex gap-2.5 ${m.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
                    {m.sender === 'bot' && (
                      <div className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full border ${
                        isDark 
                          ? 'bg-white/5 text-[#25D958] border-white/10' 
                          : 'bg-slate-50 text-[#006e1b] border-[#ebefed]'
                      }`}>
                        <Bot className="h-3.5 w-3.5" />
                      </div>
                    )}
                    <div
                      className={`rounded-2xl px-3.5 py-2 text-[11px] leading-relaxed max-w-[220px] whitespace-pre-wrap ${
                        m.sender === 'user'
                          ? (isDark ? 'bg-[#25D958] text-black font-semibold rounded-tr-none' : 'bg-[#006e1b] text-white font-semibold rounded-tr-none')
                          : (isDark ? 'bg-white/5 text-slate-200 border border-white/10 rounded-tl-none' : 'bg-slate-50 text-slate-700 border-[#ebefed] rounded-tl-none')
                      }`}
                    >
                      {m.text}
                    </div>
                  </div>
                ))}
                {loading && (
                  <div className="flex gap-2.5 justify-start items-center">
                    <div className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full border ${
                      isDark 
                        ? 'bg-white/5 text-[#25D958] border-white/10' 
                        : 'bg-slate-50 text-[#006e1b] border-[#ebefed]'
                    }`}>
                      <Bot className="h-3.5 w-3.5" />
                    </div>
                    <div className={`flex items-center gap-1.5 rounded-2xl border px-3.5 py-2 ${
                      isDark ? 'bg-white/5 border-white/10 text-slate-400' : 'bg-slate-50 border-[#ebefed] text-slate-500'
                    }`}>
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      <span className="text-[10px] font-semibold">Thinking...</span>
                    </div>
                  </div>
                )}
              </>
            )}
            <div ref={scrollRef} />
          </div>

          {/* Acknowledgement Expiry Warning Tag */}
          <div className={`text-[8.5px] text-center py-1 font-semibold uppercase tracking-wider border-t ${
            isDark ? 'bg-[#0c1816]/30 border-white/5 text-slate-500' : 'bg-[#f0f5f2]/40 border-[#ebefed] text-slate-400'
          }`}>
            🔒 Chat history is auto-deleted after 15 days
          </div>

          {/* Input Footer */}
          <form onSubmit={handleSend} className={`p-3 flex gap-2 border-t ${
            isDark ? 'bg-[#070b09] border-white/5' : 'bg-[#f0f5f2] border-[#ebefed]'
          }`}>
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              disabled={loadingHistory || loading}
              placeholder={loadingHistory ? "Loading history..." : "Ask foils, microns, track order..."}
              className={`flex-1 rounded-full border px-4 py-2 text-[11px] focus:outline-none transition-all ${
                isDark 
                  ? 'bg-white/5 border-white/10 text-white placeholder-slate-500 focus:border-[#25D958]/30 disabled:opacity-50' 
                  : 'bg-white border-slate-200 text-slate-850 placeholder-slate-400 focus:border-[#006e1b]/30 disabled:opacity-50'
              }`}
            />
            <button
              type="submit"
              disabled={!input.trim() || loading || loadingHistory}
              className={`flex h-8 w-8 items-center justify-center rounded-full disabled:opacity-50 transition-opacity ${
                isDark ? 'bg-[#25D958] text-black' : 'bg-[#006e1b] text-white'
              }`}
            >
              <Send className="h-3.5 w-3.5" />
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
