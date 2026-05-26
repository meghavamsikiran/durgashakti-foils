import React, { useEffect, useState, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { Mail, MessageSquare, Clock, Phone, Calendar, User, FileText, CheckCircle2, Circle, AlertCircle, X } from 'lucide-react';
import AdminTable from '../components/AdminTable';
import apiClient from '../../services/core/apiClient';
import DateFilterPopover from '../../components/ui/DateFilterPopover';
import { Button } from '../../components/ui/button';
import { toast } from 'sonner';
import PageLoader from '../../components/ui/PageLoader';
import TablePagination from '../../components/ui/TablePagination';

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
    <div className="space-y-8 max-w-[1500px] mx-auto">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 pb-6 border-b border-slate-200/60">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-primary to-secondary flex items-center justify-center shadow-lg shadow-emerald-glow text-white">
              <MessageSquare className="w-6 h-6" />
            </div>
            <h1 className="text-3xl font-extrabold tracking-tight text-slate-900" style={{ fontFamily: 'Manrope, sans-serif' }}>
              Customer Inquiries
            </h1>
          </div>
          <p className="text-slate-500 font-medium">Manage and respond to messages submitted through the Contact Us form.</p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <div className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-2">
            <span className="text-xs font-black uppercase tracking-wider text-slate-500">Status</span>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="bg-transparent outline-none text-sm font-semibold"
            >
              <option value="all">All</option>
              <option value="pending">Pending</option>
              <option value="in_progress">In Progress</option>
              <option value="replied">Replied</option>
              <option value="resolved">Closed</option>
            </select>
          </div>
          <DateFilterPopover onChange={(value) => setDateFilter(value)} initial={dateFilter} />
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
        <AdminTable
          columns={[
            { key: 'name', title: 'Customer' },
            { key: 'contact', title: 'Contact Info' },
            { key: 'message', title: 'Message Preview' },
            { key: 'status', title: 'Status' },
            { key: 'created_at', title: 'Received On' },
            { key: 'actions', title: 'Actions' },
          ]}
          rows={inquiries.map(item => ({
            ...item,
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
            message: <span className="text-sm text-slate-600 truncate max-w-[200px] block">{item.message}</span>,
            status: (
              <select
                value={item.status || 'pending'}
                onChange={(e) => handleUpdateStatus(item.id, e.target.value)}
                className={`text-xs font-bold uppercase tracking-wider px-3 py-1.5 rounded-full border cursor-pointer outline-none appearance-none pr-8 relative ${getStatusStyle(item.status || 'pending')}`}
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
          }))}
        />
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
          <div className="bg-white rounded-[2rem] max-w-3xl w-full max-h-[92vh] overflow-y-auto p-6 md:p-8 shadow-2xl shadow-slate-900/20 border border-white/50 flex flex-col scrollbar-thin">
            <div className="flex justify-between items-start mb-8">
              <div>
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
                    <MessageSquare className="w-5 h-5" />
                  </div>
                  <h3 className="text-2xl font-extrabold text-slate-900" style={{ fontFamily: 'Manrope, sans-serif' }}>
                    Inquiry Details
                  </h3>
                </div>
                <p className="text-sm text-slate-500 font-medium ml-13">ID: {selectedInquiry.id}</p>
              </div>
              <button 
                onClick={() => setSelectedInquiry(null)}
                className="w-8 h-8 flex items-center justify-center rounded-full bg-slate-100 text-slate-500 hover:bg-rose-100 hover:text-rose-600 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            
            <div className="space-y-6">
              {/* Customer Info Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex items-center gap-4 text-slate-700 bg-slate-50/80 p-4 rounded-2xl border border-slate-100/50">
                  <div className="w-10 h-10 rounded-full bg-white flex items-center justify-center shadow-sm text-primary">
                    <User className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Customer</p>
                    <p className="font-extrabold text-slate-900 text-sm">{selectedInquiry.name}</p>
                  </div>
                </div>

                <div className="flex items-center gap-4 text-slate-700 bg-slate-50/80 p-4 rounded-2xl border border-slate-100/50">
                  <div className="w-10 h-10 rounded-full bg-white flex items-center justify-center shadow-sm text-primary">
                    <Mail className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Email</p>
                    <p className="font-bold text-slate-900 text-sm break-all">{selectedInquiry.email}</p>
                  </div>
                </div>

                <div className="flex items-center gap-4 text-slate-700 bg-slate-50/80 p-4 rounded-2xl border border-slate-100/50">
                  <div className="w-10 h-10 rounded-full bg-white flex items-center justify-center shadow-sm text-primary">
                    <Phone className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Phone</p>
                    <p className="font-bold text-slate-900 text-sm">{selectedInquiry.phone || 'Not Provided'}</p>
                  </div>
                </div>

                <div className="flex items-center gap-4 text-slate-700 bg-slate-50/80 p-4 rounded-2xl border border-slate-100/50">
                  <div className="w-10 h-10 rounded-full bg-white flex items-center justify-center shadow-sm text-primary">
                    <Calendar className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Received</p>
                    <p className="font-bold text-slate-900 text-sm">{new Date(selectedInquiry.created_at).toLocaleString()}</p>
                  </div>
                </div>
              </div>

              {/* Message Content */}
              <div className="flex flex-col gap-3 text-slate-700 bg-gradient-to-b from-slate-50/80 to-slate-100/50 p-6 rounded-3xl border border-slate-200/60 shadow-inner">
                <div className="flex items-center gap-2 text-slate-500 font-black uppercase text-[10px] tracking-widest">
                  <FileText className="w-4 h-4 text-primary" /> Full Message
                </div>
                <p className="text-slate-800 text-sm leading-relaxed whitespace-pre-wrap max-h-64 overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-slate-300 font-medium">
                  {selectedInquiry.message}
                </p>
              </div>

              {/* Status Update */}
              <div className="flex items-center justify-between bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
                <span className="text-sm font-bold text-slate-700">
                  Status:
                </span>
                <select
                  value={selectedInquiry.status || 'pending'}
                  onChange={(e) => handleUpdateStatus(selectedInquiry.id, e.target.value)}
                  className={`text-xs font-bold uppercase tracking-wider px-3 py-1.5 rounded-full border cursor-pointer outline-none appearance-none pr-8 relative ${getStatusStyle(selectedInquiry.status || 'pending')}`}
                  style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='3' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='6 9 12 15 18 9'%3E%3C/polyline%3E%3C/svg%3E")`, backgroundRepeat: 'no-repeat', backgroundPosition: 'right 10px center' }}
                >
                  <option value="pending">Pending</option>
                  <option value="in_progress">In Progress</option>
                  <option value="replied">Replied</option>
                  <option value="resolved">Closed</option>
                </select>
              </div>

              {/* Reply History */}
              {selectedInquiry.reply_message && (
                <div className="flex flex-col gap-3 text-slate-700 bg-primary/5 p-6 rounded-3xl border border-primary/20 shadow-sm">
                  <div className="flex items-center gap-2 text-primary font-black uppercase text-[10px] tracking-widest">
                    <Mail className="w-4 h-4" /> Reply Sent {selectedInquiry.replied_at && `on ${new Date(selectedInquiry.replied_at).toLocaleString()}`}
                  </div>
                  <p className="text-slate-800 text-sm leading-relaxed whitespace-pre-wrap font-medium">
                    {selectedInquiry.reply_message}
                  </p>
                </div>
              )}

              {/* Send Reply Email */}
              {selectedInquiry.status === 'resolved' ? (
                <div className="bg-amber-50 border border-amber-200 text-amber-800 rounded-2xl p-4 text-xs font-semibold flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0 text-amber-600" />
                  This inquiry is closed. You cannot send replies unless it is re-opened (change status to Pending or In Progress).
                </div>
              ) : (
                <form onSubmit={handleSendReply} className="space-y-4 pt-4 border-t border-slate-100">
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[10px] text-slate-400 font-black uppercase tracking-wider ml-1">
                      {selectedInquiry.reply_message ? 'Send Another Reply' : 'Compose Reply'}
                    </label>
                    <textarea
                      required
                      value={replyMessage}
                      onChange={(e) => setReplyMessage(e.target.value)}
                      placeholder="Type your response email here..."
                      className="w-full min-h-[100px] rounded-xl border border-slate-200 bg-slate-50/50 p-4 text-sm focus:border-primary focus:ring-0 transition-all outline-none"
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

            <div className="mt-8 flex justify-end">
              <Button 
                onClick={() => setSelectedInquiry(null)}
                className="bg-slate-900 text-white font-extrabold text-sm px-8 py-4 rounded-2xl tracking-wide hover:bg-primary transition-all shadow-lg hover:shadow-emerald-glow active:scale-95"
              >
                Close Details
              </Button>
            </div>
          </div>
        </div>
      ), document.body)}
    </div>
  );
};

export default InquiriesPage;
