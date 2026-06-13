import React, { useEffect, useState, useCallback, useRef } from 'react';
import { createPortal } from 'react-dom';
import { Mail, MessageSquare, Clock, Phone, Calendar, User, FileText, CheckCircle2, Circle, AlertCircle, X, Filter, Image as ImageIcon } from 'lucide-react';
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

  const [filterOpen, setFilterOpen] = useState(false);
  const [tempStatus, setTempStatus] = useState('all');
  const [tempPreset, setTempPreset] = useState('');
  const [tempCustom, setTempCustom] = useState({ start: '', end: '' });
  const filterRef = useRef(null);

  useEffect(() => {
    function handleOutsideClick(e) {
      if (filterRef.current && !filterRef.current.contains(e.target)) {
        setFilterOpen(false);
      }
    }
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, []);

  const handleToggleFilter = () => {
    if (!filterOpen) {
      setTempStatus(statusFilter);
      setTempPreset(dateFilter?.label || '');
      setTempCustom({
        start: dateFilter?.label === 'custom' ? (dateFilter.start_date || '').slice(0, 10) : '',
        end: dateFilter?.label === 'custom' ? (dateFilter.end_date || '').slice(0, 10) : '',
      });
    }
    setFilterOpen(!filterOpen);
  };

  const handleApplyFilters = () => {
    setStatusFilter(tempStatus);
    if (tempPreset === 'custom') {
      if (tempCustom.start && tempCustom.end) {
        const s = new Date(tempCustom.start);
        const e = new Date(tempCustom.end);
        if (s <= e) {
          setDateFilter({
            start_date: toISODateStart(s),
            end_date: toISODateEnd(e),
            label: 'custom'
          });
        }
      }
    } else if (tempPreset) {
      const range = rangeForPreset(tempPreset);
      if (range) {
        setDateFilter({
          start_date: range.start,
          end_date: range.end,
          label: tempPreset
        });
      }
    } else {
      setDateFilter(null);
    }
    setPage(1);
    setFilterOpen(false);
  };

  const handleClearFilters = () => {
    setStatusFilter('all');
    setDateFilter(null);
    setTempStatus('all');
    setTempPreset('');
    setTempCustom({ start: '', end: '' });
    setPage(1);
    setFilterOpen(false);
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
    loadInquiries();
    loadInquiriesSilent();
  }, [loadInquiries, loadInquiriesSilent]);

  const handleUpdateStatus = async (id, newStatus) => {
    try {
      await apiClient.put(`/admin/contacts/${id}/status`, { status: newStatus });
      toast.success('Status updated successfully');
      setInquiries(inquiries.map(inc => inc.id === id ? { ...inc, status: newStatus } : inc));
      if (selectedInquiry?.id === id) {
        setSelectedInquiry({ ...selectedInquiry, status: newStatus });
      }
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed to update status');
    }
  };

  const handleSendReply = async (e) => {
    e.preventDefault();
    if (!replyMessage.trim()) {
      toast.error('Reply message cannot be empty');
      return;
    }
    try {
      setSubmittingReply(true);
      const response = await apiClient.post(`/admin/contacts/${selectedInquiry.id}/reply`, {
        reply_message: replyMessage
      });
      
      if (response.data.email_sent === false) {
        toast.warning(`Reply saved, but email delivery failed: ${response.data.email_error}`);
      } else {
        toast.success(response.data.message || 'Reply sent successfully');
      }
      
      const updated = { 
        ...selectedInquiry, 
        reply_message: replyMessage, 
        replied_at: new Date().toISOString(),
        status: 'replied' 
      };
      
      setInquiries(inquiries.map(inc => inc.id === selectedInquiry.id ? updated : inc));
      setSelectedInquiry(updated);
      setReplyMessage('');
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed to send reply');
    } finally {
      setSubmittingReply(false);
    }
  };

  const getStatusStyle = (status) => {
    switch (status) {
      case 'resolved': return 'bg-emerald-50 text-emerald-600 border-emerald-200';
      case 'replied': return 'bg-primary/10 text-primary border-primary/20';
      case 'in_progress': return 'bg-amber-50 text-amber-600 border-amber-200';
      default: return 'bg-slate-50 text-slate-600 border-slate-200';
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'resolved': return <CheckCircle2 className="w-3.5 h-3.5 mr-1.5" />;
      case 'replied': return <Mail className="w-3.5 h-3.5 mr-1.5" />;
      case 'in_progress': return <AlertCircle className="w-3.5 h-3.5 mr-1.5" />;
      default: return <Circle className="w-3.5 h-3.5 mr-1.5" />;
    }
  };

  if (loading && inquiries.length === 0) return <PageLoader />;

  return (
    <div className="space-y-2.5 max-w-[1500px] mx-auto">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 pb-2.5 border-b border-slate-200">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-slate-900 flex items-center gap-2">
            <MessageSquare className="w-5 h-5 text-primary" />
            Customer Support Cases
          </h1>
          <p className="text-xs text-slate-500 mt-0.5 font-medium">Manage and respond to tickets submitted by customers through the Support Cases system.</p>
        </div>
        <div className="relative" ref={filterRef}>
          <button
            type="button"
            onClick={handleToggleFilter}
            className={`h-11 inline-flex items-center justify-center gap-2 shadow-sm transition-all admin-filter-btn ${
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

      {/* Table */}
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
                // 1. Status Filter
                if (statusFilter && statusFilter !== 'all') {
                  if ((item.status || '').toLowerCase() !== statusFilter.toLowerCase()) return false;
                }
                // 2. Date Filter
                if (dateFilter?.start_date && dateFilter?.end_date) {
                  const itemDate = new Date(item.created_at || item.updated_at);
                  const start = new Date(dateFilter.start_date);
                  const end = new Date(dateFilter.end_date);
                  end.setHours(23, 59, 59, 999);
                  if (itemDate < start || itemDate > end) return false;
                }
                return true;
              });
              return filteredInquiries.map(item => ({
              ...item,
              ticket_id: (
                <span className="font-mono text-xs font-bold text-primary bg-primary/10 px-2 py-1 rounded-lg">
                  {item.ticket_id}
                </span>
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
              created_at: (
                <span className="text-sm text-slate-600 flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-slate-400" />
                  {new Date(item.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                </span>
              ),
              message: (
                <span className="text-sm text-slate-600 truncate max-w-[200px] block">
                  {item.message ? item.message.split('\n\n[Attachments]\n')[0] : ''}
                </span>
              ),
              status: (
                <select
                  value={item.status || 'pending'}
                  disabled={item.status === 'resolved'}
                  onChange={(e) => handleUpdateStatus(item.id, e.target.value)}
                  className={`text-xs font-bold uppercase tracking-wider px-3 py-1.5 rounded-full border cursor-pointer outline-none appearance-none pr-8 relative ${item.status === 'resolved' ? 'opacity-65 cursor-not-allowed' : ''} ${getStatusStyle(item.status || 'pending')}`}
                  style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='3' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='6 9 12 15 18 9'%3E%3C/polyline%3E%3C/svg%3E")`, backgroundRepeat: 'no-repeat', backgroundPosition: 'right 10px center' }}
                >
                  <option value="pending">Pending</option>
                  <option value="in_progress">In Progress</option>
                  <option value="replied">Replied</option>
                  <option value="resolved">Closed</option>
                </select>
              ),
              actions: (
                <button 
                  onClick={() => setSelectedInquiry(item)}
                  className="bg-slate-100 hover:bg-primary hover:text-white text-slate-700 font-bold px-4 py-2 rounded-xl text-xs transition-all shadow-sm active:scale-95"
                >
                  Review
                </button>
              )
            }));
          })()}
          />
        </div>
        <TablePagination
          currentPage={page}
          totalPages={Math.ceil(total / PAGE_SIZE)}
          onPageChange={(p) => loadInquiries(p)}
          totalItems={total}
          pageSize={PAGE_SIZE}
        />
      </div>

      {/* Inquiry Detail Modal */}
      {selectedInquiry && createPortal((
        <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md">
          <div className="admin-shell bg-white dark:bg-[#131B17] text-slate-900 dark:text-white rounded-[2rem] max-w-3xl w-full max-h-[92vh] overflow-y-auto p-6 md:p-8 shadow-2xl shadow-slate-900/20 border border-white/50 dark:border-[#26322B] flex flex-col scrollbar-thin">
            <div className="flex justify-between items-start mb-8">
              <div>
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
                    <MessageSquare className="w-5 h-5" />
                  </div>
                  <h3 className="text-2xl font-extrabold text-slate-900 dark:text-white" style={{ fontFamily: 'Manrope, sans-serif' }}>
                    Case Details
                  </h3>
                </div>
                <p className="text-sm text-slate-500 dark:text-slate-400 font-medium ml-13">Case Ticket ID: {selectedInquiry.ticket_id}</p>
              </div>
              <button 
                onClick={() => setSelectedInquiry(null)}
                className="w-8 h-8 flex items-center justify-center rounded-full bg-slate-100 dark:bg-[#1E2722] text-slate-500 dark:text-slate-450 hover:bg-rose-100 dark:hover:bg-rose-950/30 hover:text-rose-600 dark:hover:text-rose-400 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            
            <div className="space-y-6">
              {/* Customer Info Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex items-center gap-4 text-slate-700 dark:text-slate-300 bg-slate-50/80 dark:bg-[#1E2722] p-4 rounded-2xl border border-slate-100/50 dark:border-[#26322B]">
                  <div className="w-10 h-10 rounded-full bg-white dark:bg-[#131B17] flex items-center justify-center shadow-sm text-primary">
                    <User className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">Customer</p>
                    <p className="font-extrabold text-slate-900 dark:text-white text-sm">{selectedInquiry.name}</p>
                  </div>
                </div>

                <div className="flex items-center gap-4 text-slate-700 dark:text-slate-300 bg-slate-50/80 dark:bg-[#1E2722] p-4 rounded-2xl border border-slate-100/50 dark:border-[#26322B]">
                  <div className="w-10 h-10 rounded-full bg-white dark:bg-[#131B17] flex items-center justify-center shadow-sm text-primary">
                    <Mail className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">Email</p>
                    <p className="font-bold text-slate-900 dark:text-white text-sm break-all">{selectedInquiry.email}</p>
                  </div>
                </div>

                <div className="flex items-center gap-4 text-slate-700 dark:text-slate-300 bg-slate-50/80 dark:bg-[#1E2722] p-4 rounded-2xl border border-slate-100/50 dark:border-[#26322B]">
                  <div className="w-10 h-10 rounded-full bg-white dark:bg-[#131B17] flex items-center justify-center shadow-sm text-primary">
                    <Phone className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">Phone</p>
                    <p className="font-bold text-slate-900 dark:text-white text-sm">{selectedInquiry.phone || 'Not Provided'}</p>
                  </div>
                </div>

                <div className="flex items-center gap-4 text-slate-700 dark:text-slate-300 bg-slate-50/80 dark:bg-[#1E2722] p-4 rounded-2xl border border-slate-100/50 dark:border-[#26322B]">
                  <div className="w-10 h-10 rounded-full bg-white dark:bg-[#131B17] flex items-center justify-center shadow-sm text-primary">
                    <Calendar className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">Received</p>
                    <p className="font-bold text-slate-900 dark:text-white text-sm">{new Date(selectedInquiry.created_at).toLocaleString()}</p>
                  </div>
                </div>
              </div>

              {/* Message Content & Attachments */}
              {(() => {
                const parseMessageAndAttachments = (message) => {
                  if (!message) return { cleanMessage: '', attachments: [] };
                  const parts = message.split('\n\n[Attachments]\n');
                  if (parts.length > 1) {
                    const cleanMessage = parts[0];
                    const attachments = parts[1].split('\n').filter(url => url.trim().length > 0);
                    return { cleanMessage, attachments };
                  }
                  return { cleanMessage: message, attachments: [] };
                };
                const { cleanMessage, attachments } = parseMessageAndAttachments(selectedInquiry.message);
                return (
                  <>
                    <div className="flex flex-col gap-3 text-slate-700 dark:text-slate-300 bg-gradient-to-b from-slate-50/80 to-slate-100/50 dark:from-[#1E2722]/50 dark:to-[#1E2722] p-6 rounded-3xl border border-slate-200/60 dark:border-[#26322B] shadow-inner">
                      <div className="flex items-center gap-2 text-slate-500 dark:text-slate-450 font-black uppercase text-[10px] tracking-widest">
                        <FileText className="w-4 h-4 text-primary" /> Full Message
                      </div>
                      <p className="text-slate-800 dark:text-slate-200 text-sm leading-relaxed whitespace-pre-wrap max-h-64 overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-slate-300 dark:scrollbar-thumb-[#26322B] font-medium font-sans">
                        {cleanMessage}
                      </p>
                    </div>

                    {attachments.length > 0 && (
                      <div className="flex flex-col gap-3 p-6 bg-slate-50/80 dark:bg-[#1E2722] rounded-3xl border border-slate-200/60 dark:border-[#26322B] shadow-inner">
                        <div className="text-slate-500 dark:text-slate-450 font-black uppercase text-[10px] tracking-widest flex items-center gap-1.5 font-sans">
                          <ImageIcon className="w-4 h-4 text-primary" /> Attachment Images
                        </div>
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                          {attachments.map((url, idx) => (
                            <a 
                              key={idx} 
                              href={url} 
                              target="_blank" 
                              rel="noopener noreferrer" 
                              className="group relative aspect-square bg-[#050807] rounded-2xl overflow-hidden border border-slate-200 dark:border-[#26322B] hover:border-primary transition-all"
                            >
                              <img src={url} alt={`Attachment ${idx + 1}`} className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105" />
                              <div className="absolute inset-0 bg-black/55 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                <span className="text-[10px] font-bold uppercase tracking-wider text-white bg-primary px-2.5 py-1 rounded-lg">View Full</span>
                              </div>
                            </a>
                          ))}
                        </div>
                      </div>
                    )}
                  </>
                );
              })()}

              {/* Status Update */}
              <div className="flex items-center justify-between bg-white dark:bg-[#1E2722] p-4 rounded-2xl border border-slate-200 dark:border-[#26322B] shadow-sm">
                <span className="text-sm font-bold text-slate-700 dark:text-slate-300">
                  Status:
                </span>
                <select
                  value={selectedInquiry.status || 'pending'}
                  disabled={selectedInquiry.status === 'resolved'}
                  onChange={(e) => handleUpdateStatus(selectedInquiry.id, e.target.value)}
                  className={`text-xs font-bold uppercase tracking-wider px-3 py-1.5 rounded-full border cursor-pointer outline-none appearance-none pr-8 relative bg-white dark:bg-[#131B17] text-slate-900 dark:text-white ${selectedInquiry.status === 'resolved' ? 'opacity-60 cursor-not-allowed' : ''} ${getStatusStyle(selectedInquiry.status || 'pending')}`}
                  style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='3' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='6 9 12 15 18 9'%3E%3C/polyline%3E%3C/svg%3E")`, backgroundRepeat: 'no-repeat', backgroundPosition: 'right 10px center' }}
                >
                  <option value="pending" className="dark:bg-[#131B17] dark:text-white">Pending</option>
                  <option value="in_progress" className="dark:bg-[#131B17] dark:text-white">In Progress</option>
                  <option value="replied" className="dark:bg-[#131B17] dark:text-white">Replied</option>
                  <option value="resolved" className="dark:bg-[#131B17] dark:text-white">Closed</option>
                </select>
              </div>

              {/* Reply History */}
              {selectedInquiry.reply_message && (
                <div className="flex flex-col gap-3 text-slate-700 dark:text-slate-300 bg-primary/5 dark:bg-emerald-950/20 p-6 rounded-3xl border border-primary/20 dark:border-emerald-900/50 shadow-sm">
                  <div className="flex items-center gap-2 text-primary font-black uppercase text-[10px] tracking-widest">
                    <Mail className="w-4 h-4" /> Reply Sent {selectedInquiry.replied_at && `on ${new Date(selectedInquiry.replied_at).toLocaleString()}`}
                  </div>
                  <p className="text-slate-800 dark:text-slate-200 text-sm leading-relaxed whitespace-pre-wrap font-medium font-sans">
                    {selectedInquiry.reply_message}
                  </p>
                </div>
              )}

              {/* Send Reply Email */}
              {selectedInquiry.status === 'resolved' ? (
                <div className="bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/50 text-amber-800 dark:text-amber-400 rounded-2xl p-4 text-xs font-semibold flex items-center gap-2 font-sans">
                  <AlertCircle className="w-4 h-4 shrink-0 text-amber-600 dark:text-amber-400" />
                  This case is closed. You cannot send replies unless it is re-opened (click Re-Open Case below).
                </div>
              ) : (
                <form onSubmit={handleSendReply} className="space-y-4 pt-4 border-t border-slate-100 dark:border-[#26322B]">
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[10px] text-slate-400 dark:text-slate-500 font-black uppercase tracking-wider ml-1">
                      {selectedInquiry.reply_message ? 'Send Another Reply' : 'Compose Reply'}
                    </label>
                    <textarea
                      required
                      value={replyMessage}
                      onChange={(e) => setReplyMessage(e.target.value)}
                      placeholder="Type your response email here..."
                      className="w-full min-h-[100px] rounded-xl border border-slate-200 dark:border-[#26322B] bg-slate-50/50 dark:bg-[#1E2722] p-4 text-sm focus:border-primary focus:ring-0 transition-all outline-none text-slate-900 dark:text-white"
                    />
                  </div>
                  <Button
                    type="submit"
                    disabled={submittingReply}
                    className="w-full bg-primary hover:bg-emerald-hover text-white font-black uppercase tracking-widest py-3 rounded-xl text-xs transition-all shadow-md disabled:opacity-50"
                  >
                    {submittingReply ? 'Sending Email...' : 'Send Reply Email'}
                  </Button>
                </form>
              )}
            </div>

            <div className="mt-8 flex justify-end gap-3.5">
              <Button 
                onClick={() => setSelectedInquiry(null)}
                className="bg-slate-900 dark:bg-[#1E2722] text-white font-extrabold text-sm px-6 py-4 rounded-2xl tracking-wide hover:bg-slate-800 transition-all shadow-lg active:scale-95 border border-transparent dark:border-[#26322B]"
              >
                Cancel
              </Button>
              {selectedInquiry.status === 'resolved' ? (
                <Button 
                  onClick={() => handleUpdateStatus(selectedInquiry.id, 'pending')}
                  className="bg-primary hover:bg-[#1bb847] text-white font-extrabold text-sm px-8 py-4 rounded-2xl tracking-wide transition-all shadow-lg active:scale-95 border border-transparent"
                >
                  Re-Open Case
                </Button>
              ) : (
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
      ), document.body)}
    </div>
  );
};

export default InquiriesPage;
