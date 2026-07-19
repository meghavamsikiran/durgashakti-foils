import React, { useEffect, useState, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { createPortal } from 'react-dom';
import { Mail, MessageSquare, Clock, Phone, Calendar, User, FileText, CheckCircle2, Circle, AlertCircle, X, Filter, Image as ImageIcon, Copy, Check, Search, Paperclip, Play, AlertOctagon, Send, Power, Loader2 } from 'lucide-react';
import AdminTable from '../components/AdminTable';
import apiClient from '../../services/core/apiClient';
import { Button } from '../../components/ui/button';
import { toast } from 'sonner';
import PageLoader from '../../components/ui/PageLoader';
import TablePagination from '../../components/ui/TablePagination';

const DATE_PRESETS = [
  { key: 'today', label: 'Today' },
  { key: 'last7', label: 'Last 7 Days' },
  { key: 'thisWeek', label: 'This Week' },
  { key: 'thisMonth', label: 'This Month' },
  { key: 'thisYear', label: 'This Year' },
  { key: 'custom', label: 'Custom Range' },
];

function toISODateStart(d) {
  const dt = new Date(d);
  dt.setHours(0, 0, 0, 0);
  return dt.toISOString();
}

function toISODateEnd(d) {
  const dt = new Date(d);
  dt.setHours(23, 59, 59, 999);
  return dt.toISOString();
}

function rangeForPreset(key) {
  const now = new Date();
  const start = new Date();
  switch (key) {
    case 'today':
      return { start: toISODateStart(now), end: toISODateEnd(now) };
    case 'last7':
      start.setDate(now.getDate() - 6);
      return { start: toISODateStart(start), end: toISODateEnd(now) };
    case 'thisWeek': {
      const day = now.getDay();
      const diff = now.getDate() - day + (day === 0 ? -6 : 1); // monday as start
      start.setDate(diff);
      return { start: toISODateStart(start), end: toISODateEnd(now) };
    }
    case 'thisMonth':
      start.setDate(1);
      return { start: toISODateStart(start), end: toISODateEnd(now) };
    case 'thisYear':
      start.setMonth(0, 1);
      return { start: toISODateStart(start), end: toISODateEnd(now) };
    default:
      return null;
  }
}

const InquiriesPage = () => {
  const PAGE_SIZE = 20;
  
  // Tab states
  const [activeSubTab, setActiveSubTab] = useState('tickets'); // 'tickets' or 'live_chat'

  // Inquiry/Ticket list states
  const [inquiries, setInquiries] = useState(() => {
    const cached = apiClient.getCachedDataSync('/admin/contacts', { page: 1, limit: PAGE_SIZE });
    return cached?.data?.items || [];
  });
  const [loading, setLoading] = useState(() => {
    const cached = apiClient.getCachedDataSync('/admin/contacts', { page: 1, limit: PAGE_SIZE });
    return !cached;
  });
  const [total, setTotal] = useState(() => {
    const cached = apiClient.getCachedDataSync('/admin/contacts', { page: 1, limit: PAGE_SIZE });
    return cached?.data?.total || 0;
  });
  const [page, setPage] = useState(1);
  const [selectedInquiry, setSelectedInquiry] = useState(null);
  const [replyMessage, setReplyMessage] = useState('');
  const [submittingReply, setSubmittingReply] = useState(false);
  const [statusFilter, setStatusFilter] = useState('all');
  const [dateFilter, setDateFilter] = useState(null);
  const [copiedTicketId, setCopiedTicketId] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [replyUrls, setReplyUrls] = useState([]);
  const [uploadingReplyFiles, setUploadingReplyFiles] = useState(false);
  
  // Swiggy Live Chat Admin States
  const [chatSessions, setChatSessions] = useState([]);
  const [selectedSessionId, setSelectedSessionId] = useState(null);
  const [chatMessages, setChatMessages] = useState([]);
  const [adminChatMessage, setAdminChatMessage] = useState('');
  const [sendingChatMessage, setSendingChatMessage] = useState(false);
  const [loadingChatHistory, setLoadingChatHistory] = useState(false);
  const chatScrollRef = useRef(null);

  const { caseId } = useParams();
  const navigate = useNavigate();

  // Filters refs
  const [filterOpen, setFilterOpen] = useState(false);
  const [tempStatus, setTempStatus] = useState('all');
  const [tempPreset, setTempPreset] = useState('today');
  const [tempCustom, setTempCustom] = useState({ start: '', end: '' });
  const filterRef = useRef(null);

  const handleToggleFilter = () => setFilterOpen(!filterOpen);
  
  const handleApplyFilters = () => {
    setStatusFilter(tempStatus);
    if (tempPreset === 'custom') {
      if (tempCustom.start && tempCustom.end) {
        setDateFilter({
          start_date: toISODateStart(tempCustom.start),
          end_date: toISODateEnd(tempCustom.end),
        });
      }
    } else {
      const range = rangeForPreset(tempPreset);
      if (range) {
        setDateFilter({
          start_date: range.start,
          end_date: range.end,
        });
      } else {
        setDateFilter(null);
      }
    }
    setPage(1);
    setFilterOpen(false);
  };

  const handleClearFilters = () => {
    setStatusFilter('all');
    setDateFilter(null);
    setTempStatus('all');
    setTempPreset('today');
    setTempCustom({ start: '', end: '' });
    setPage(1);
    setFilterOpen(false);
  };

  const handleClose = () => {
    setSelectedInquiry(null);
    if (caseId) {
      const isSuperadmin = window.location.pathname.startsWith('/superadmin');
      navigate(isSuperadmin ? '/superadmin/cases' : '/admin/cases');
    }
  };

  useEffect(() => {
    if (caseId && inquiries.length > 0) {
      const found = inquiries.find(item => item.id === caseId || item.ticket_id === caseId);
      if (found) {
        setSelectedInquiry(found);
      }
    }
  }, [caseId, inquiries]);

  useEffect(() => {
    if (!selectedInquiry) {
      setReplyMessage('');
      setReplyUrls([]);
      setUploadingReplyFiles(false);
    }
  }, [selectedInquiry]);

  const handleAdminReplyFileChange = async (e) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    const imageCount = replyUrls.length;

    for (const file of files) {
      const ct = file.type.toLowerCase();
      if (ct.startsWith('image/')) {
        if (imageCount >= 3) {
          toast.error("You can upload a maximum of 3 images.");
          return;
        }
        if (file.size > 2 * 1024 * 1024) {
          toast.error("Image file size must be less than 2MB.");
          return;
        }
      } else {
        toast.error("Only image files are supported.");
        return;
      }

      try {
        setUploadingReplyFiles(true);
        const formData = new FormData();
        formData.append('file', file);
        const response = await apiClient.post('/contacts/upload', formData);
        setReplyUrls(prev => [...prev, response.data.url]);
        toast.success(`Uploaded ${file.name} successfully`);
      } catch (err) {
        toast.error(`Failed to upload ${file.name}`);
      } finally {
        setUploadingReplyFiles(false);
      }
    }
  };

  const loadInquiries = useCallback(async (pageNum = 1) => {
    const params = {
      page: pageNum,
      limit: PAGE_SIZE,
      status: statusFilter !== 'all' ? statusFilter : undefined,
      start_date: dateFilter?.start_date,
      end_date: dateFilter?.end_date,
    };
    const cached = apiClient.getCachedDataSync('/admin/contacts', params);
    if (!cached) {
      setLoading(true);
    }
    try {
      const response = await apiClient.cachedGet('/admin/contacts', { params });
      setInquiries(response.data.items || []);
      setTotal(response.data.total || 0);
      setPage(pageNum);
    } catch (err) {
      console.error('Failed to load inquiries:', err);
    } finally {
      setLoading(false);
    }
  }, [statusFilter, dateFilter]);

  const loadInquiriesSilent = useCallback(async (pageNum = 1) => {
    try {
      const params = {
        page: pageNum,
        limit: PAGE_SIZE,
        status: statusFilter !== 'all' ? statusFilter : undefined,
        start_date: dateFilter?.start_date,
        end_date: dateFilter?.end_date,
      };
      const response = await apiClient.get('/admin/contacts', {
        params,
        silent: true
      });
      setInquiries(response.data.items || []);
      setTotal(response.data.total || 0);
    } catch (err) {
      // Ignore background errors
    }
  }, [statusFilter, dateFilter]);

  useEffect(() => {
    if (activeSubTab === 'tickets') {
      loadInquiries();
      const pollInterval = setInterval(() => {
        loadInquiriesSilent();
      }, 12000);
      return () => clearInterval(pollInterval);
    }
  }, [loadInquiries, loadInquiriesSilent, activeSubTab]);

  // Load Swiggy Chat sessions
  const loadChatSessions = useCallback(async () => {
    try {
      const res = await apiClient.get('/chat/sessions');
      setChatSessions(res.data || []);
    } catch (err) {
      console.error("Failed to load chat sessions:", err);
    }
  }, []);

  useEffect(() => {
    if (activeSubTab === 'live_chat') {
      loadChatSessions();
      const interval = setInterval(() => {
        loadChatSessions();
      }, 5000);
      return () => clearInterval(interval);
    }
  }, [loadChatSessions, activeSubTab]);

  // Load selected chat session history
  const loadActiveChatHistory = useCallback(async (id, silent = false) => {
    if (!silent) setLoadingChatHistory(true);
    try {
      const res = await apiClient.get(`/chat/history?sessionId=${id}`);
      setChatMessages(res.data?.messages || []);
    } catch (err) {
      console.error("Failed to fetch chat history:", err);
    } finally {
      if (!silent) setLoadingChatHistory(false);
    }
  }, []);

  useEffect(() => {
    if (selectedSessionId && activeSubTab === 'live_chat') {
      loadActiveChatHistory(selectedSessionId, false);
      const historyPoll = setInterval(() => {
        loadActiveChatHistory(selectedSessionId, true);
      }, 3000);
      return () => clearInterval(historyPoll);
    }
  }, [selectedSessionId, loadActiveChatHistory, activeSubTab]);

  useEffect(() => {
    chatScrollRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages]);

  const sendAdminChatMessage = async (e) => {
    e.preventDefault();
    if (!adminChatMessage.trim() || sendingChatMessage || !selectedSessionId) return;

    setSendingChatMessage(true);
    try {
      await apiClient.post('/chat/admin-message', {
        sessionId: selectedSessionId,
        message: adminChatMessage
      });
      setAdminChatMessage('');
      loadActiveChatHistory(selectedSessionId, true);
    } catch (err) {
      toast.error("Failed to send live agent reply");
    } finally {
      setSendingChatMessage(false);
    }
  };

  const closeChatSession = async (id) => {
    try {
      await apiClient.post('/chat/session/close', { sessionId: id });
      toast.success("Chat session closed successfully");
      loadChatSessions();
      if (selectedSessionId === id) {
        setSelectedSessionId(null);
        setChatMessages([]);
      }
    } catch (err) {
      toast.error("Failed to close chat session");
    }
  };

  const handleUpdateStatus = async (id, newStatus) => {
    try {
      await apiClient.put(`/admin/contacts/${id}/status`, { status: newStatus });
      toast.success('Status updated successfully');
      apiClient.invalidateCache('/admin/contacts');
      apiClient.invalidateCache('/contacts/my');
      setInquiries(inquiries.map(inc => inc.id === id ? { ...inc, status: newStatus } : inc));
      if (selectedInquiry?.id === id) {
        setSelectedInquiry({ ...selectedInquiry, status: newStatus });
      }
    } catch (err) {
      toast.error('Failed to update status');
    }
  };

  const handleReplySubmit = async (e) => {
    e.preventDefault();
    if (!replyMessage.trim() && replyUrls.length === 0) return;
    setSubmittingReply(true);

    try {
      await apiClient.post(`/admin/contacts/${selectedInquiry.id}/reply`, {
        reply_message: replyMessage,
        image_urls: replyUrls,
      });

      toast.success('Reply submitted successfully');
      apiClient.invalidateCache('/admin/contacts');
      apiClient.invalidateCache('/contacts/my');
      
      const now = new Date();
      const dateFormatted = now.toLocaleDateString(undefined, { day: '2-digit', month: 'short', year: 'numeric' });
      const timeFormatted = now.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
      const timestampStr = `${dateFormatted}, ${timeFormatted}`;
      
      let finalReplyText = replyMessage;
      if (replyUrls.length > 0) {
        finalReplyText += "\n\n[Attachments]\n" + replyUrls.join('\n');
      }

      const newReplyBlock = `[Admin - ${timestampStr}]\n${finalReplyText}`;
      const updatedReplyMessage = selectedInquiry.reply_message
        ? `${selectedInquiry.reply_message}\n\n${newReplyBlock}`
        : newReplyBlock;
      
      const updated = { 
        ...selectedInquiry, 
        reply_message: updatedReplyMessage, 
        replied_at: now.toISOString(),
        status: 'replied' 
      };
      
      setInquiries(inquiries.map(inc => inc.id === selectedInquiry.id ? updated : inc));
      setSelectedInquiry(updated);
      setReplyMessage('');
      setReplyUrls([]);
    } catch (err) {
      toast.error('Failed to send reply');
    } finally {
      setSubmittingReply(false);
    }
  };

  const getStatusStyle = (status) => {
    switch (status) {
      case 'resolved': return '!bg-emerald-50 !text-emerald-600 !border-emerald-200 dark:!bg-[#0c3a21] dark:!text-[#25D958] dark:!border-emerald-500/30';
      case 'replied': return '!bg-primary/10 !text-primary !border-primary/20 dark:!bg-[#0a361a] dark:!text-[#25D958] dark:!border-[#25D958]/30';
      case 'reopened': return '!bg-amber-50 !text-amber-600 !border-amber-200 dark:!bg-[#3d2a04] dark:!text-amber-500 dark:!border-amber-500/30';
      case 'in_progress': return '!bg-amber-50 !text-amber-600 !border-amber-200 dark:!bg-[#3d2a04] dark:!text-amber-500 dark:!border-amber-500/30';
      default: return '!bg-slate-50 !text-slate-600 !border-slate-200 dark:!bg-[#1e2924] dark:!text-slate-300 dark:!border-slate-700/50';
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'resolved': return <CheckCircle2 className="w-3.5 h-3.5 mr-1.5" />;
      case 'replied': return <Mail className="w-3.5 h-3.5 mr-1.5" />;
      case 'reopened': return <Clock className="w-3.5 h-3.5 mr-1.5" />;
      case 'in_progress': return <AlertCircle className="w-3.5 h-3.5 mr-1.5" />;
      default: return <Circle className="w-3.5 h-3.5 mr-1.5" />;
    }
  };

  const handleCopy = (e, val) => {
    e.stopPropagation();
    navigator.clipboard.writeText(val);
    setCopiedTicketId(val);
    setTimeout(() => setCopiedTicketId(null), 2000);
    toast.success("Copied Ticket ID to clipboard");
  };

  if (loading && inquiries.length === 0 && activeSubTab === 'tickets') {
    return (
      <div className="flex flex-col items-center justify-center min-h-[calc(100vh-160px)] w-full">
        <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-primary mb-3"></div>
        <p className="text-xs text-slate-500 font-bold uppercase tracking-wider">Loading support cases...</p>
      </div>
    );
  }

  return (
    <div className="space-y-4 max-w-[1500px] mx-auto">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 pb-2.5 border-b border-slate-200">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-slate-900 flex items-center gap-2">
            <MessageSquare className="w-5 h-5 text-primary" />
            Customer Support Cases
          </h1>
          <p className="text-xs text-slate-500 mt-0.5 font-medium">Manage support tickets and respond to Swiggy-like live agent chat escalations.</p>
        </div>

        {/* Tab Selector */}
        <div className="flex border-b border-slate-200">
          <button
            onClick={() => setActiveSubTab('tickets')}
            className={`py-2.5 px-5 text-xs font-bold border-b-2 transition-all ${
              activeSubTab === 'tickets' 
                ? 'border-primary text-primary' 
                : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            Support Tickets
          </button>
          <button
            onClick={() => setActiveSubTab('live_chat')}
            className={`py-2.5 px-5 text-xs font-bold border-b-2 transition-all flex items-center gap-1.5 ${
              activeSubTab === 'live_chat' 
                ? 'border-primary text-primary' 
                : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            Live AI Chats
            {chatSessions.filter(s => (s.status || s.status_field) === 'escalated').length > 0 && (
              <span className="flex h-2 w-2 rounded-full bg-red-500 animate-pulse" />
            )}
          </button>
        </div>
      </div>

      {activeSubTab === 'tickets' ? (
        <>
          {/* Filters Area */}
          <div className="flex items-center justify-between gap-3">
            <div className="relative group flex items-center">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
              <input
                type="text"
                placeholder="Search cases..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 pr-4 py-2 bg-white border border-slate-200 rounded-xl text-xs shadow-sm focus:ring-2 focus:ring-primary/20 outline-none w-64"
              />
            </div>

            <div className="relative" ref={filterRef}>
              <button
                type="button"
                onClick={handleToggleFilter}
                className={`flex items-center gap-2 px-4 py-2 border rounded-xl text-xs font-semibold transition-all shadow-sm h-[40px] admin-filter-btn ${
                  filterOpen || (statusFilter !== 'all' || dateFilter)
                    ? 'active-filter'
                    : ''
                }`}
              >
                <Filter className="w-4 h-4 text-slate-500 dark:text-slate-400" />
                Filter
                {(statusFilter !== 'all' || dateFilter) && (
                  <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1.5 text-[10px] text-white">
                    !
                  </span>
                )}
              </button>

              {filterOpen && (
                <div className="absolute right-0 mt-2 w-80 bg-white border border-slate-200 rounded-2xl shadow-2xl p-5 z-50 space-y-4 text-left">
                  <div>
                    <h4 className="text-xs font-black uppercase tracking-wider text-slate-400 mb-2">Status</h4>
                    <div className="grid grid-cols-2 gap-2">
                      {[
                        { key: 'all', label: 'All' },
                        { key: 'pending', label: 'Pending' },
                        { key: 'reopened', label: 'Re-opened' },
                        { key: 'in_progress', label: 'In Progress' },
                        { key: 'replied', label: 'Replied' },
                        { key: 'resolved', label: 'Closed' }
                      ].map(opt => (
                        <button
                          key={opt.key}
                          type="button"
                          onClick={() => setTempStatus(opt.key)}
                          className={`px-3 py-2 rounded-lg text-xs font-semibold text-center transition-all ${
                            tempStatus === opt.key 
                              ? 'bg-primary text-white shadow-sm' 
                              : 'bg-slate-50 text-slate-700 hover:bg-slate-100'
                          }`}
                        >
                          {opt.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <h4 className="text-xs font-black uppercase tracking-wider text-slate-400 mb-2">Date Range</h4>
                    <div className="grid grid-cols-2 gap-2">
                      {DATE_PRESETS.map(opt => (
                        <button
                          key={opt.key}
                          type="button"
                          onClick={() => setTempPreset(opt.key)}
                          className={`px-3 py-2 rounded-lg text-xs font-semibold text-center transition-all admin-preset-btn ${
                            tempPreset === opt.key 
                              ? 'active-preset' 
                              : ''
                          }`}
                        >
                          {opt.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {tempPreset === 'custom' && (
                    <div className="space-y-2 pt-2 border-t border-slate-100">
                      <div>
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1">Start Date</label>
                        <input
                          type="date"
                          value={tempCustom.start}
                          onChange={(e) => setTempCustom({ ...tempCustom, start: e.target.value })}
                          className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs focus:ring-1 focus:ring-primary focus:border-primary outline-none"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1">End Date</label>
                        <input
                          type="date"
                          value={tempCustom.end}
                          onChange={(e) => setTempCustom({ ...tempCustom, end: e.target.value })}
                          className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs focus:ring-1 focus:ring-primary focus:border-primary outline-none"
                        />
                      </div>
                    </div>
                  )}

                  <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                    <button
                      type="button"
                      onClick={handleClearFilters}
                      className="px-3.5 py-2 rounded-xl border border-slate-200 text-slate-500 hover:bg-slate-50 text-xs font-bold mr-auto"
                    >
                      Reset
                    </button>
                    <button
                      type="button"
                      onClick={handleApplyFilters}
                      className="px-4 py-2 rounded-xl bg-primary hover:bg-[#1bb847] text-white text-xs font-bold"
                    >
                      Apply & Close
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Inquiries Table */}
          <div className="bg-white rounded-3xl border border-slate-200/60 shadow-xl shadow-slate-200/20 overflow-hidden backdrop-blur-xl">
            <div className="px-8 py-6 bg-slate-50/50 border-b border-slate-200/60 flex items-center justify-between">
              <h3 className="font-bold text-slate-800 flex items-center gap-2">
                <Clock className="w-4 h-4 text-primary" /> Recent Messages
              </h3>
              <span className="text-xs font-black uppercase tracking-widest text-primary bg-primary/10 px-4 py-1.5 rounded-full border border-primary/20 shadow-sm">
                {total} Total
              </span>
            </div>
            <div className="overflow-x-auto overflow-y-hidden admin-table-container-standard">
              <AdminTable
                columns={[
                  { key: 'ticket_id', title: 'Case ID' },
                  { key: 'name', title: 'Customer' },
                  { key: 'contact', title: 'Contact Info' },
                  { key: 'message', title: 'Message Preview' },
                  { key: 'status', title: 'Status' },
                  { key: 'created_at', title: 'Received On' },
                  { key: 'actions', title: 'Actions' },
                ]}
                rows={(() => {
                  const filteredInquiries = (inquiries || []).filter(item => {
                    if (searchQuery) {
                      const q = searchQuery.toLowerCase();
                      const ticketId = (item.ticket_id || '').toLowerCase();
                      const name = (item.name || '').toLowerCase();
                      const email = (item.email || '').toLowerCase();
                      const message = (item.message || '').toLowerCase();
                      if (!ticketId.includes(q) && !name.includes(q) && !email.includes(q) && !message.includes(q)) {
                        return false;
                      }
                    }
                    if (statusFilter && statusFilter !== 'all') {
                      if ((item.status || '').toLowerCase() !== statusFilter.toLowerCase()) return false;
                    }
                    if (dateFilter?.start_date && dateFilter?.end_date) {
                      const itemDate = new Date(item.created_at || item.updated_at);
                      const start = new Date(dateFilter.start_date);
                      const end = new Date(dateFilter.end_date);
                      end.setHours(23, 59, 59, 999);
                      if (itemDate < start || itemDate > end) return false;
                    }
                    return true;
                  });
                  const isSuperadmin = window.location.pathname.startsWith('/superadmin');
                  const basePath = isSuperadmin ? '/superadmin/cases' : '/admin/cases';

                  return filteredInquiries.map(item => ({
                    ...item,
                    ticket_id: (
                      <div className="inline-flex items-center gap-1.5 font-mono text-xs font-bold text-primary bg-primary/10 px-2 py-1 rounded-lg">
                        <a href={`${basePath}/${item.id}`} target="_blank" rel="noopener noreferrer" className="hover:underline">{item.ticket_id}</a>
                        <button
                          type="button"
                          onClick={(e) => handleCopy(e, item.ticket_id)}
                          className="hover:text-primary transition-colors p-0.5 rounded focus:outline-none flex items-center justify-center"
                          title="Copy Ticket ID"
                        >
                          {copiedTicketId === item.ticket_id ? (
                            <Check className="w-3.5 h-3.5 text-emerald-600" />
                          ) : (
                            <Copy className="w-3.5 h-3.5 opacity-60 hover:opacity-100 text-primary" />
                          )}
                        </button>
                      </div>
                    ),
                    name: <span className="font-bold text-slate-900">{item.name}</span>,
                    contact: (
                      <div className="flex flex-col gap-1">
                        <span className="text-sm font-medium text-slate-700 flex items-center gap-1.5">
                          <Mail className="w-3.5 h-3.5 text-slate-400" /> {item.email}
                        </span>
                        {item.phone && (
                          <span className="text-xs text-slate-500 flex items-center gap-1.5">
                            <Phone className="w-3.5 h-3.5 text-slate-400" /> {item.phone}
                          </span>
                        )}
                      </div>
                    ),
                    message: (
                      <span className="text-xs font-medium text-slate-600 line-clamp-2 max-w-xs">
                        {item.message}
                      </span>
                    ),
                    status: (
                      <span className={`inline-flex items-center border rounded-full px-2.5 py-1 text-xs font-semibold capitalize tracking-wide select-none ${getStatusStyle(item.status)}`}>
                        {getStatusIcon(item.status)}
                        {item.status === 'resolved' ? 'closed' : item.status.replace('_', ' ')}
                      </span>
                    ),
                    created_at: (
                      <span className="text-xs font-medium text-slate-500 flex items-center gap-1.5">
                        <Calendar className="w-3.5 h-3.5 text-slate-400" />
                        {new Date(item.created_at).toLocaleDateString(undefined, { day: '2-digit', month: 'short', year: 'numeric' })}
                      </span>
                    ),
                    actions: (
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            const isSuper = window.location.pathname.startsWith('/superadmin');
                            navigate(isSuper ? `/superadmin/cases/${item.id}` : `/admin/cases/${item.id}`);
                            setSelectedInquiry(item);
                          }}
                          className="px-3.5 py-1.5 rounded-lg border border-slate-200 dark:border-white/15 text-slate-700 dark:text-slate-205 hover:bg-slate-100 dark:hover:bg-white/5 font-bold transition-all text-[11px]"
                        >
                          View & Reply
                        </button>
                      </div>
                    ),
                  }));
                })()}
              />
            </div>
            {total > PAGE_SIZE && (
              <div className="px-8 py-4 border-t border-slate-200/60 bg-slate-55/30">
                <TablePagination
                  total={total}
                  pageSize={PAGE_SIZE}
                  page={page}
                  onChange={(p) => loadInquiries(p)}
                />
              </div>
            )}
          </div>
        </>
      ) : (
        /* Swiggy Live Chat Panel Dashboard Layout */
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 h-[calc(100vh-210px)] max-h-[700px]">
          
          {/* Left panel: Sessions list */}
          <div className="lg:col-span-4 bg-white dark:bg-[#0c1310] rounded-3xl border border-slate-200 dark:border-[#26322B] shadow-xl overflow-hidden flex flex-col">
            <div className="p-4 border-b border-slate-100 dark:border-[#26322B] bg-slate-50/50 dark:bg-[#1E2722]">
              <h3 className="text-xs font-black uppercase tracking-wider text-slate-400">Escalated Sessions</h3>
            </div>
            
            <div className="flex-1 overflow-y-auto divide-y divide-slate-100 dark:divide-white/5 bg-white dark:bg-[#0c1310]">
              {chatSessions.length === 0 ? (
                <div className="p-8 text-center text-slate-400 text-xs font-semibold">
                  No active chat sessions found.
                </div>
              ) : (
                chatSessions.map((session) => {
                  const sId = session.session_id || session.sessionId;
                  const uId = session.user_id || session.userId;
                  const sStatus = session.status || "active";
                  return (
                    <div
                      key={sId}
                      onClick={() => setSelectedSessionId(sId)}
                      className={`p-4 cursor-pointer transition-colors flex items-center justify-between border-b border-slate-100 dark:border-white/5 ${
                        selectedSessionId === sId 
                          ? 'bg-[#006e1b] text-white shadow-inner' 
                          : 'bg-white dark:bg-[#0c1310] text-slate-800 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-white/5'
                      }`}
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-1.5">
                          <User className={`h-3.5 w-3.5 ${selectedSessionId === sId ? 'text-white' : 'text-slate-450 dark:text-slate-400'}`} />
                          <span className={`text-xs font-bold ${selectedSessionId === sId ? 'text-white' : 'text-slate-900 dark:text-white'}`}>
                            {uId ? `Customer (${uId.toString().substring(0, 8).toUpperCase()})` : "Guest Client"}
                          </span>
                        </div>
                        <p className={`text-[10px] font-mono select-all ${selectedSessionId === sId ? 'text-white/80' : 'text-slate-400 dark:text-slate-500'}`}>Session: {sId ? sId.substring(0, 12) : ""}...</p>
                      </div>
                      
                      <div className="flex flex-col items-end gap-1.5">
                        <span className={`text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full border ${
                          selectedSessionId === sId
                            ? 'bg-white/20 border-white/30 text-white'
                            : sStatus === 'escalated'
                              ? 'bg-rose-50 dark:bg-rose-950/20 border-rose-200 dark:border-rose-500/30 text-rose-600 dark:text-rose-400 animate-pulse'
                              : sStatus === 'resolved'
                                ? 'bg-emerald-50 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-500/30 text-emerald-600 dark:text-[#25D958]'
                                : 'bg-blue-55 dark:bg-blue-950/20 border-blue-200 dark:border-blue-500/30 text-blue-600 dark:text-blue-400'
                        }`}>
                          {sStatus}
                        </span>
                        
                        {sStatus === 'escalated' && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              closeChatSession(sId);
                            }}
                            title="Close Chat Session"
                            className={`p-1 rounded-lg border transition-all ${
                              selectedSessionId === sId
                                ? 'border-white/20 text-white hover:bg-white/10'
                                : 'border-slate-200 dark:border-white/10 text-slate-500 dark:text-slate-400 hover:text-red-500 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/20 hover:border-red-200 dark:hover:border-red-500/30'
                            }`}
                          >
                            <Power className="h-3.5 w-3.5" />
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Right panel: Active Chat history */}
          <div className="lg:col-span-8 bg-white dark:bg-[#0c1310] rounded-3xl border border-slate-200 dark:border-[#26322B] shadow-xl overflow-hidden flex flex-col">
            {selectedSessionId ? (
              <>
                {/* Active Session Header */}
                <div className="p-4 border-b border-slate-100 dark:border-[#26322B] bg-slate-50/50 dark:bg-[#1E2722] flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="h-2 w-2 rounded-full bg-red-500 animate-ping" />
                    <span className="text-xs font-bold text-slate-800 dark:text-white">
                      Live Chat Monitor: {selectedSessionId.substring(0, 15)}...
                    </span>
                  </div>
                  <button
                    onClick={() => closeChatSession(selectedSessionId)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-red-200 dark:border-red-500/30 text-red-600 dark:text-red-450 bg-red-50 dark:bg-red-950/20 hover:bg-red-100 dark:hover:bg-red-950/40 transition-colors text-[10px] font-bold uppercase tracking-wider"
                  >
                    <Power className="h-3.5 w-3.5" />
                    Close Session
                  </button>
                </div>

                {/* History Message List */}
                <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-slate-55/30 dark:bg-[#0c1310]">
                  {loadingChatHistory ? (
                    <div className="flex items-center justify-center h-full">
                      <Loader2 className="h-6 w-6 animate-spin text-primary" />
                    </div>
                  ) : (
                    chatMessages.map((msg, idx) => (
                      <div
                        key={idx}
                        className={`flex ${msg.sender === 'user' ? 'justify-start' : 'justify-end'}`}
                      >
                        <div className={`max-w-[70%] p-3 rounded-2xl text-xs leading-relaxed ${
                          msg.sender === 'user'
                            ? 'bg-slate-100 dark:bg-[#1E2722] text-slate-800 dark:text-slate-100 rounded-tl-none border border-slate-200 dark:border-white/5'
                            : 'bg-primary dark:bg-primary/90 text-white font-semibold rounded-tr-none shadow-md shadow-primary/10'
                        }`}>
                          <div className="text-[9px] uppercase tracking-wider font-extrabold opacity-60 mb-1">
                            {msg.sender === 'user' ? 'Customer' : 'Bot / Live Agent'}
                          </div>
                          <span className="whitespace-pre-wrap">{msg.text}</span>
                        </div>
                      </div>
                    ))
                  )}
                  <div ref={chatScrollRef} />
                </div>

                {/* Reply Form */}
                <form onSubmit={sendAdminChatMessage} className="p-4 border-t border-slate-100 dark:border-[#26322B] bg-white dark:bg-[#0c1310] flex gap-2">
                  <input
                    type="text"
                    value={adminChatMessage}
                    onChange={(e) => setAdminChatMessage(e.target.value)}
                    disabled={sendingChatMessage}
                    placeholder="Type your reply to customer..."
                    className="flex-1 px-4 py-2 border border-slate-200 dark:border-white/10 bg-white dark:bg-[#1E2722] text-slate-850 dark:text-white rounded-xl text-xs focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary disabled:opacity-50 placeholder-slate-400 dark:placeholder-slate-500"
                  />
                  <button
                    type="submit"
                    disabled={!adminChatMessage.trim() || sendingChatMessage}
                    className="bg-primary hover:bg-[#1bb847] text-white p-2.5 rounded-xl disabled:opacity-50 transition-opacity flex items-center justify-center"
                  >
                    <Send className="h-4 w-4" />
                  </button>
                </form>
              </>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center text-center p-8 space-y-2 text-slate-450 dark:text-slate-500 bg-white dark:bg-[#0c1310]">
                <AlertOctagon className="h-10 w-10 opacity-40 text-primary" />
                <h4 className="text-xs font-bold uppercase tracking-wider">Select a Conversation</h4>
                <p className="text-[10px] max-w-xs font-medium leading-relaxed">
                  Click on an escalated customer session from the list on the left to monitor the chat and take over as a Live Agent.
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Ticket Modal Creation Portal */}
      {selectedInquiry && createPortal((
        <div className="fixed inset-0 z-[9999] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 xl:p-8 animate-in fade-in duration-200">
          <div className="bg-white dark:bg-[#0c1310] rounded-3xl max-w-4xl w-full max-h-[90vh] overflow-y-auto shadow-2xl p-6 xl:p-8 border border-slate-100 dark:border-[#26322B] flex flex-col">
            <div className="flex items-center justify-between pb-4 border-b border-slate-200/60 dark:border-[#26322B] mb-6">
              <div className="flex items-center gap-2.5">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary">
                  <FileText className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-slate-900 dark:text-white leading-none flex items-center gap-2">
                    Case Details
                    <span className="font-mono text-sm font-bold text-slate-450">({selectedInquiry.ticket_id})</span>
                  </h3>
                  <span className={`inline-flex items-center border rounded-full px-2 py-0.5 text-[10px] font-bold capitalize mt-1.5 ${getStatusStyle(selectedInquiry.status)}`}>
                    {getStatusIcon(selectedInquiry.status)}
                    {selectedInquiry.status === 'resolved' ? 'closed' : selectedInquiry.status.replace('_', ' ')}
                  </span>
                </div>
              </div>
              <button 
                onClick={handleClose}
                className="text-slate-400 hover:bg-slate-100 dark:hover:bg-white/5 p-2 rounded-full transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 flex-1">
              <div className="space-y-4">
                <div className="bg-slate-50 dark:bg-[#1E2722] border border-slate-200/50 dark:border-[#26322B] rounded-2xl p-5 space-y-3">
                  <h4 className="text-xs font-black uppercase tracking-wider text-slate-400 mb-2">Customer Profile</h4>
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-full bg-slate-200 dark:bg-white/5 flex items-center justify-center text-slate-700 dark:text-slate-200 font-extrabold text-sm uppercase">
                      {selectedInquiry.name.substring(0, 2)}
                    </div>
                    <div>
                      <div className="text-sm font-bold text-slate-950 dark:text-white">{selectedInquiry.name}</div>
                      <div className="text-xs text-slate-500 flex items-center gap-1 mt-0.5"><Mail className="w-3 h-3" /> {selectedInquiry.email}</div>
                    </div>
                  </div>
                  {selectedInquiry.phone && (
                    <div className="text-xs text-slate-600 dark:text-slate-400 flex items-center gap-1.5 pt-2 border-t border-slate-200/40 dark:border-white/5">
                      <Phone className="w-3.5 h-3.5" /> Phone Number: <b>{selectedInquiry.phone}</b>
                    </div>
                  )}
                </div>

                <div className="bg-slate-50 dark:bg-[#1E2722] border border-slate-200/50 dark:border-[#26322B] rounded-2xl p-5 space-y-2">
                  <h4 className="text-xs font-black uppercase tracking-wider text-slate-400 mb-2">Issue / Message</h4>
                  <p className="text-xs font-semibold leading-relaxed text-slate-800 dark:text-slate-100 bg-white dark:bg-[#0c1310] p-4 rounded-xl border border-slate-100 dark:border-[#26322B] whitespace-pre-wrap select-text">
                    {selectedInquiry.message}
                  </p>
                </div>
              </div>

              <div className="flex flex-col space-y-4">
                <div className="bg-slate-50 dark:bg-[#1E2722] border border-slate-200/50 dark:border-[#26322B] rounded-2xl p-5 flex flex-col flex-1 space-y-3">
                  <h4 className="text-xs font-black uppercase tracking-wider text-slate-400 mb-1">Previous Responses</h4>
                  <div className="flex-1 overflow-y-auto max-h-[250px] bg-white dark:bg-[#0c1310] p-4 rounded-xl border border-slate-100 dark:border-[#26322B] text-xs font-medium leading-relaxed whitespace-pre-wrap text-slate-700 dark:text-slate-350 select-text">
                    {selectedInquiry.reply_message ? selectedInquiry.reply_message : (
                      <span className="text-slate-400 font-semibold italic flex items-center justify-center h-full">No replies submitted yet.</span>
                    )}
                  </div>
                </div>

                {selectedInquiry.status !== 'resolved' && (
                  <form onSubmit={handleReplySubmit} className="space-y-3">
                    <div>
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1.5">Reply message</label>
                      <textarea
                        rows="4"
                        value={replyMessage}
                        onChange={(e) => setReplyMessage(e.target.value)}
                        placeholder="Write your official response here..."
                        className="w-full px-4 py-3 bg-white dark:bg-[#1E2722] text-slate-850 dark:text-white border border-slate-200 dark:border-[#26322B] rounded-2xl text-xs shadow-sm focus:ring-1 focus:ring-primary focus:border-primary outline-none transition-all resize-none"
                      />
                    </div>

                    {replyUrls.length > 0 && (
                      <div className="grid grid-cols-3 gap-2 border border-slate-100 dark:border-white/5 p-3 rounded-2xl">
                        {replyUrls.map((url, i) => {
                          const isVid = url.toLowerCase().endsWith('.mp4') || url.toLowerCase().endsWith('.mov');
                          return (
                            <div key={i} className="relative aspect-video rounded-xl overflow-hidden bg-black flex items-center justify-center">
                              {isVid ? (
                                <div className="text-[8px] font-bold text-white flex items-center gap-1"><Play className="w-3.5 h-3.5" /> Video</div>
                              ) : (
                                <img src={url} alt="Attachment" className="w-full h-full object-cover" />
                              )}
                              <button
                                type="button"
                                onClick={() => setReplyUrls(replyUrls.filter(u => u !== url))}
                                className="absolute top-1 right-1 h-5 w-5 bg-black/60 hover:bg-black/90 text-white rounded-full flex items-center justify-center p-0"
                              >
                                <X className="w-3 h-3" />
                              </button>
                            </div>
                          );
                        })}
                      </div>
                    )}

                    <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
                      <label className="flex items-center gap-1.5 px-4 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-[#1E2722] dark:hover:bg-[#26322B] text-slate-700 dark:text-slate-200 rounded-xl cursor-pointer text-xs font-bold transition-colors select-none border border-slate-200 dark:border-[#26322B]">
                        <Paperclip className="w-4 h-4 text-primary" />
                        <span>{uploadingReplyFiles ? 'Uploading...' : 'Attach Images (Max 3, Max 2MB each)'}</span>
                        <input
                          type="file"
                          multiple
                          accept="image/*"
                          onChange={handleAdminReplyFileChange}
                          disabled={uploadingReplyFiles}
                          className="hidden"
                        />
                      </label>

                      <Button
                        type="submit"
                        disabled={submittingReply || uploadingReplyFiles || !replyMessage.trim()}
                        className="h-10 px-6 bg-primary hover:bg-[#1bb847] text-white font-bold uppercase tracking-wider rounded-xl text-xs"
                      >
                        {submittingReply ? 'Replying...' : 'Reply'}
                      </Button>
                    </div>
                  </form>
                )}
              </div>

              <div className="mt-8 flex justify-end gap-3.5">
                <Button 
                  onClick={handleClose}
                  className="bg-slate-900 dark:bg-[#1E2722] text-white font-extrabold text-sm px-6 py-4 rounded-2xl tracking-wide hover:bg-slate-800 transition-all shadow-lg active:scale-95 border border-transparent dark:border-[#26322B]"
                >
                  Cancel
                </Button>
                {selectedInquiry.status !== 'resolved' && (
                  <Button 
                    onClick={() => handleUpdateStatus(selectedInquiry.id, 'resolved')}
                    className="bg-rose-600 hover:bg-rose-500 text-white font-extrabold text-sm px-8 py-4 rounded-2xl tracking-wide transition-all shadow-lg active:scale-95 border border-transparent"
                  >
                    Close Inquiry
                  </Button>
                )}
              </div>
            </div>
          </div>
        </div>
      ), document.body)}
    </div>
  );
};

export default InquiriesPage;
