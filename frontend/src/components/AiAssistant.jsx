import React, { useState, useRef, useEffect } from 'react';
import { MessageSquare, X, Send, Bot, User, Loader2, Power, ThumbsUp, ThumbsDown, PhoneCall, History, PlusCircle, Clock } from 'lucide-react';
import apiClient from '../services/core/apiClient';
import { useAuth } from '../contexts/AuthContext';

export default function AiAssistant() {
  const { user } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [isDark, setIsDark] = useState(() => localStorage.getItem('themeMode') !== 'light');
  const [sessionId, setSessionId] = useState(() => {
    let id = localStorage.getItem('ai_session_id');
    if (!id) {
      id = 'session-' + Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
      localStorage.setItem('ai_session_id', id);
    }
    return id;
  });
  
  const [messages, setMessages] = useState([
    { sender: 'bot', text: 'Hello Customer, how can I assist you with DurgaShakti Foils today?' }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [showSurvey, setShowSurvey] = useState(false);
  const [showEscalationConfirm, setShowEscalationConfirm] = useState(false);
  const [sessionStatus, setSessionStatus] = useState('active'); // 'active', 'ended', 'resolved', 'escalated'
  const [helplineNumber, setHelplineNumber] = useState('+91 98765 43210');
  
  // Chat History / Sessions Sidebar State
  const [showHistory, setShowHistory] = useState(false);
  const [userSessions, setUserSessions] = useState([]);
  const scrollRef = useRef(null);

  useEffect(() => {
    const fetchHelpline = async () => {
      try {
        const res = await apiClient.cachedGet('/settings/public');
        if (res.data?.company_profile?.companyPhone) {
          setHelplineNumber(res.data.company_profile.companyPhone);
        }
      } catch (ignored) {}
    };
    fetchHelpline();
  }, []);

  useEffect(() => {
    const handleThemeToggle = (e) => {
      setIsDark(e.detail === 'dark');
    };
    window.addEventListener('theme-toggle', handleThemeToggle);
    return () => window.removeEventListener('theme-toggle', handleThemeToggle);
  }, []);

  // Update welcome message dynamically when user profile loads
  useEffect(() => {
    if (messages.length === 1 && messages[0].sender === 'bot') {
      const name = user?.full_name ? user.full_name : 'Customer';
      setMessages([
        { sender: 'bot', text: `Hello ${name}, how can I assist you with DurgaShakti Foils today?` }
      ]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  const fetchUserSessions = async () => {
    try {
      let sessions = [];
      if (user) {
        const res = await apiClient.get('/chat/user/sessions');
        if (Array.isArray(res.data) && res.data.length > 0) {
          sessions = res.data;
        }
      }
      
      const localStr = localStorage.getItem('ai_user_sessions_list');
      let localList = localStr ? JSON.parse(localStr) : [];

      const exists = localList.some(s => s.sessionId === sessionId);
      if (!exists && sessionId) {
        const lastMsg = messages[messages.length - 1]?.text || 'Started conversation';
        localList.unshift({
          sessionId,
          status: sessionStatus,
          lastMessage: lastMsg,
          createdAt: new Date().toISOString()
        });
      }

      const mergedMap = new Map();
      localList.forEach(s => mergedMap.set(s.sessionId, s));
      sessions.forEach(s => mergedMap.set(s.sessionId, s));
      
      const mergedArray = Array.from(mergedMap.values()).sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
      setUserSessions(mergedArray);
      localStorage.setItem('ai_user_sessions_list', JSON.stringify(mergedArray));
    } catch (err) {
      console.error("Failed to fetch user sessions:", err);
    }
  };

  // Fetch chat history from database when chat window opens (and poll for human agent updates)
  useEffect(() => {
    let intervalId;
    if (isOpen && !showHistory) {
      const fetchHistory = async (showLoadingState = true) => {
        if (showLoadingState) setLoadingHistory(true);
        try {
          const res = await apiClient.get(`/chat/history?sessionId=${sessionId}`);
          if (res.data) {
            const historyMsgs = res.data.messages || [];
            if (historyMsgs.length > 0) {
              setMessages(historyMsgs);
            }
            if (res.data.status) {
              setSessionStatus(res.data.status);
            }
          }
        } catch (err) {
          console.error("Failed to load chat history:", err);
        } finally {
          if (showLoadingState) setLoadingHistory(false);
        }
      };
      
      fetchHistory(true);
      
      intervalId = setInterval(() => {
        fetchHistory(false);
      }, 4000);
    }
    
    return () => {
      if (intervalId) clearInterval(intervalId);
    };
  }, [isOpen, sessionId, showHistory]);

  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading, showSurvey, showEscalationConfirm, sessionStatus, showHistory]);

  const handleSend = async (e) => {
    e.preventDefault();
    if (!input.trim() || loading || loadingHistory || sessionStatus === 'escalated' || sessionStatus === 'ended' || sessionStatus === 'resolved') return;

    const userText = input;
    setInput('');
    setMessages((prev) => [...prev, { sender: 'user', text: userText }]);
    setLoading(true);

    try {
      const res = await apiClient.post('/chat', { 
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

  const handleEndChat = async () => {
    try {
      await apiClient.post('/chat/session/close', { sessionId });
    } catch (err) {
      console.error("Failed to close session:", err);
    } finally {
      setSessionStatus('ended');
      setShowSurvey(false);
      setShowEscalationConfirm(false);
      await fetchUserSessions();
      setShowHistory(true);
    }
  };

  const handleFeedback = async (satisfied) => {
    setShowSurvey(false);
    setLoading(true);
    try {
      const res = await apiClient.post('/chat/session/feedback', { 
        sessionId, 
        satisfied 
      });
      
      setMessages((prev) => [...prev, { sender: 'bot', text: res.data.response }]);
      
      if (!satisfied) {
        setShowEscalationConfirm(true);
      } else {
        setSessionStatus('resolved');
      }
    } catch (err) {
      console.error("Failed to submit feedback:", err);
    } finally {
      setLoading(false);
    }
  };

  const triggerEscalation = async () => {
    setShowEscalationConfirm(false);
    setLoading(true);
    try {
      const res = await apiClient.post('/chat/session/escalate', { sessionId });
      setMessages((prev) => [...prev, { sender: 'bot', text: res.data.response }]);
      setSessionStatus('escalated');
    } catch (err) {
      console.error("Failed to escalate session:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleStartNewChat = () => {
    const newId = 'session-' + Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
    localStorage.setItem('ai_session_id', newId);
    setSessionId(newId);
    setSessionStatus('active');
    setShowSurvey(false);
    setShowEscalationConfirm(false);
    setShowHistory(false);
    const name = user?.full_name ? user.full_name : 'Customer';
    setMessages([
      { sender: 'bot', text: `Hello ${name}, how can I assist you with DurgaShakti Foils today?` }
    ]);
  };

  const handleSelectSession = (selectedSessionId, status) => {
    setSessionId(selectedSessionId);
    localStorage.setItem('ai_session_id', selectedSessionId);
    setSessionStatus(status || 'active');
    setShowSurvey(false);
    setShowEscalationConfirm(false);
    setShowHistory(false);
  };

  const toggleHistoryView = () => {
    if (!showHistory) {
      fetchUserSessions();
    }
    setShowHistory(!showHistory);
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
        <div className={`flex h-[490px] w-[320px] sm:w-[360px] flex-col rounded-2xl border shadow-2xl overflow-hidden transition-all animate-in fade-in slide-in-from-bottom-5 ${
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
                <span className={`text-[9px] font-bold ${sessionStatus === 'ended' || sessionStatus === 'resolved' ? 'text-slate-400' : (isDark ? 'text-[#25D958]' : 'text-[#006e1b]')}`}>
                  {sessionStatus === 'ended' || sessionStatus === 'resolved' ? 'Ended' : 'Online'}
                </span>
              </div>
            </div>
            
            <div className="flex items-center gap-1.5">
              {/* History Toggle Icon Button */}
              <button
                onClick={toggleHistoryView}
                title="View Chat Sessions History"
                className={`p-1.5 rounded-full transition-colors ${
                  showHistory 
                    ? (isDark ? 'bg-[#25D958]/20 text-[#25D958]' : 'bg-[#006e1b]/20 text-[#006e1b]') 
                    : (isDark ? 'text-slate-300 hover:bg-white/10' : 'text-slate-600 hover:bg-black/5')
                }`}
              >
                <History className="h-4 w-4" />
              </button>

              {/* End Chat Session Button */}
              {!showHistory && sessionStatus === 'active' && !showSurvey && !showEscalationConfirm && (
                <button
                  onClick={handleEndChat}
                  title="End Active Chat Session"
                  className={`flex items-center gap-1 text-[9px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full border transition-all ${
                    isDark 
                      ? 'border-red-500/30 text-red-400 hover:bg-red-500/10' 
                      : 'border-red-600/30 text-red-600 hover:bg-red-500/10'
                  }`}
                >
                  <Power className="h-3 w-3" />
                  <span>End</span>
                </button>
              )}

              {/* Close Button */}
              <button 
                onClick={() => setIsOpen(false)} 
                className={`rounded-full p-1 transition-colors ${
                  isDark ? 'text-slate-400 hover:bg-white/5 hover:text-white' : 'text-slate-500 hover:bg-black/5 hover:text-slate-855'
                }`}
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>

          {/* CHAT SESSIONS HISTORY VIEW */}
          {showHistory ? (
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              <div className="flex items-center justify-between pb-2 border-b border-white/10">
                <h5 className="text-xs font-bold flex items-center gap-1.5">
                  <Clock className="h-3.5 w-3.5 text-primary" />
                  <span>Chat Sessions History</span>
                </h5>
                <button
                  onClick={handleStartNewChat}
                  className={`flex items-center gap-1 text-[10px] font-bold px-3 py-1.5 rounded-full transition-all ${
                    isDark ? 'bg-[#25D958] text-black hover:bg-[#25D958]/90' : 'bg-[#006e1b] text-white hover:bg-[#006e1b]/90'
                  }`}
                >
                  <PlusCircle className="h-3.5 w-3.5" />
                  <span>New Chat</span>
                </button>
              </div>

              {userSessions.length === 0 ? (
                <div className="text-center py-8 text-slate-400 text-xs">
                  No previous chat sessions found.
                </div>
              ) : (
                <div className="space-y-2">
                  {userSessions.map((s, idx) => {
                    const isCurrent = s.sessionId === sessionId;
                    const isEnded = s.status === 'ended' || s.status === 'resolved';
                    return (
                      <div
                        key={s.sessionId || idx}
                        className={`p-3 rounded-xl border transition-all ${
                          isCurrent 
                            ? (isDark ? 'bg-[#25D958]/10 border-[#25D958]/30' : 'bg-[#006e1b]/10 border-[#006e1b]/30')
                            : (isDark ? 'bg-white/5 border-white/10 hover:border-white/20' : 'bg-slate-50 border-slate-200 hover:bg-slate-100')
                        }`}
                      >
                        <div className="flex items-center justify-between mb-1.5">
                          <span className="text-[11px] font-bold truncate max-w-[170px]">
                            Session #{userSessions.length - idx}
                          </span>
                          <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full uppercase ${
                            isEnded 
                              ? (isDark ? 'bg-slate-800 text-slate-400' : 'bg-slate-200 text-slate-600')
                              : (isDark ? 'bg-[#25D958]/20 text-[#25D958]' : 'bg-[#006e1b]/20 text-[#006e1b]')
                          }`}>
                            {isEnded ? 'Ended' : 'Active'}
                          </span>
                        </div>
                        <p className={`text-[10px] line-clamp-2 mb-2 ${isDark ? 'text-slate-300' : 'text-slate-600'}`}>
                          {s.lastMessage || 'Click to view conversation'}
                        </p>
                        <div className="flex justify-end">
                          <button
                            onClick={() => handleSelectSession(s.sessionId, s.status)}
                            className={`text-[10px] font-bold px-3 py-1 rounded-lg transition-all ${
                              isCurrent
                                ? (isDark ? 'bg-[#25D958] text-black' : 'bg-[#006e1b] text-white')
                                : (isDark ? 'bg-white/10 hover:bg-white/20 text-white' : 'bg-slate-200 hover:bg-slate-300 text-slate-800')
                            }`}
                          >
                            {isCurrent ? 'Viewing' : (isEnded ? 'View History' : 'Continue Chat')}
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          ) : (
            /* ACTIVE MESSAGES LIST VIEW */
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
                  
                  {/* Swiggy Thumbs Up/Down Survey Card */}
                  {showSurvey && (
                    <div className={`flex flex-col items-center p-4 rounded-2xl border text-center animate-in fade-in duration-300 ${
                      isDark ? 'bg-[#0c1816] border-[#25D958]/20' : 'bg-[#f0f5f2] border-[#006e1b]/20'
                    }`}>
                      <h5 className="text-[11px] font-bold mb-2.5">Are you satisfied with our assistance?</h5>
                      <div className="flex gap-4">
                        <button
                          onClick={() => handleFeedback(true)}
                          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-wider transition-all border ${
                            isDark 
                              ? 'bg-[#25D958]/10 border-[#25D958]/30 text-[#25D958] hover:bg-[#25D958]/20' 
                              : 'bg-[#006e1b]/10 border-[#006e1b]/30 text-[#006e1b] hover:bg-[#006e1b]/20'
                          }`}
                        >
                          <ThumbsUp className="h-3.5 w-3.5" />
                          Yes
                        </button>
                        <button
                          onClick={() => handleFeedback(false)}
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-wider border border-red-500/30 text-red-500 bg-red-500/10 hover:bg-red-500/20 transition-all"
                        >
                          <ThumbsDown className="h-3.5 w-3.5" />
                          No
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Confirm escalation layout before connecting live agent */}
                  {showEscalationConfirm && (
                    <div className={`flex flex-col items-center p-4 rounded-2xl border text-center animate-in fade-in duration-300 ${
                      isDark ? 'bg-[#0c1816] border-red-500/20' : 'bg-[#fdf3f2] border-red-500/20'
                    }`}>
                      <h5 className="text-[11px] font-bold mb-2.5">Would you like us to connect you with a live support agent?</h5>
                      <div className="flex gap-3">
                        <button
                          onClick={triggerEscalation}
                          className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-red-600 text-white hover:bg-red-700 transition-all border border-transparent"
                        >
                          Yes, Connect Me
                        </button>
                        <button
                          onClick={() => {
                            setShowEscalationConfirm(false);
                            setSessionStatus('resolved');
                          }}
                          className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-wider border transition-all ${
                            isDark ? 'bg-white/5 border-white/10 text-slate-300 hover:bg-white/10' : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-55'
                          }`}
                        >
                          No, Thanks
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Swiggy Live Agent Escalation / Call Helpline Card */}
                  {sessionStatus === 'escalated' && (
                    <div className={`p-4 rounded-2xl border text-center space-y-3 animate-in slide-in-from-bottom-2 ${
                      isDark ? 'bg-red-500/5 border-red-500/20' : 'bg-red-50/50 border-red-500/20'
                    }`}>
                      <div className="flex justify-center gap-2 items-center text-red-500">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        <span className="text-[11px] font-bold uppercase tracking-wider">Connecting Live Agent...</span>
                      </div>
                      <p className={`text-[10px] leading-relaxed ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                        All live chat agents are currently in queue. For immediate assistance, please call our toll-free customer helpline.
                      </p>
                      <a
                        href={`tel:${helplineNumber.replace(/\s+/g, '')}`}
                        className="flex items-center justify-center gap-2 w-full py-2 rounded-xl text-[11px] font-bold bg-red-600 text-white hover:bg-red-700 transition-colors shadow-md shadow-red-600/10"
                      >
                        <PhoneCall className="h-3.5 w-3.5" />
                        Call Helpline: {helplineNumber}
                      </a>
                      <button
                        onClick={handleStartNewChat}
                        className={`text-[9px] font-bold uppercase tracking-wider border-b ${
                          isDark ? 'text-slate-400 border-slate-600 hover:text-white' : 'text-slate-500 border-slate-300 hover:text-slate-700'
                        }`}
                      >
                        Start New Chat
                      </button>
                    </div>
                  )}

                  {(sessionStatus === 'ended' || sessionStatus === 'resolved') && (
                    <div className="text-center py-3 bg-[#25D958]/10 rounded-xl border border-[#25D958]/20 my-2">
                      <p className="text-[10px] font-bold text-slate-300 mb-1">This session has ended.</p>
                      <button
                        onClick={handleStartNewChat}
                        className={`text-[10px] font-bold uppercase tracking-wider px-3 py-1 rounded-full ${
                          isDark ? 'bg-[#25D958] text-black hover:bg-[#25D958]/90' : 'bg-[#006e1b] text-white hover:bg-[#006e1b]/90'
                        }`}
                      >
                        Start New Chat
                      </button>
                    </div>
                  )}

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
          )}

          {/* Acknowledgement Expiry Warning Tag */}
          <div className={`text-[8.5px] text-center py-1 font-semibold uppercase tracking-wider border-t ${
            isDark ? 'bg-[#0c1816]/30 border-white/5 text-slate-500' : 'bg-[#f0f5f2]/40 border-[#ebefed] text-slate-400'
          }`}>
            🔒 Chat history is auto-deleted after 15 days
          </div>

          {/* Input Footer */}
          {!showHistory && (
            <form onSubmit={handleSend} className={`p-3 flex gap-2 border-t ${
              isDark ? 'bg-[#070b09] border-white/5' : 'bg-[#f0f5f2] border-[#ebefed]'
            }`}>
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                disabled={loadingHistory || loading || showSurvey || showEscalationConfirm || sessionStatus === 'ended' || sessionStatus === 'resolved'}
                placeholder={
                  sessionStatus === 'escalated' 
                    ? "Chat redirected to Live Agent..." 
                    : (sessionStatus === 'ended' || sessionStatus === 'resolved')
                      ? "This session has ended."
                      : (showSurvey || showEscalationConfirm)
                        ? "Please rate our service..."
                        : loadingHistory 
                          ? "Loading history..." 
                          : "Ask foils, microns, track order..."
                }
                className={`flex-1 rounded-full border px-4 py-2 text-[11px] focus:outline-none transition-all ${
                  isDark 
                    ? 'bg-white/5 border-white/10 text-white placeholder-slate-500 focus:border-[#25D958]/30 disabled:opacity-50' 
                    : 'bg-white border-slate-200 text-slate-855 placeholder-slate-400 focus:border-[#006e1b]/30 disabled:opacity-50'
                }`}
              />
              <button
                type="submit"
                disabled={!input.trim() || loading || loadingHistory || showSurvey || showEscalationConfirm || sessionStatus === 'ended' || sessionStatus === 'resolved'}
                className={`flex h-8 w-8 items-center justify-center rounded-full disabled:opacity-50 transition-opacity ${
                  isDark ? 'bg-[#25D958] text-black' : 'bg-[#006e1b] text-white'
                }`}
              >
                <Send className="h-3.5 w-3.5" />
              </button>
            </form>
          )}
        </div>
      )}
    </div>
  );
}
