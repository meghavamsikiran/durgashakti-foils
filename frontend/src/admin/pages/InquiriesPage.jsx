import React, { useEffect, useState } from 'react';
import { Mail, MessageSquare, Clock, Phone, Calendar, User, FileText, CheckCircle2, Circle, AlertCircle } from 'lucide-react';
import AdminTable from '../components/AdminTable';
import apiClient from '../../services/core/apiClient';
import { Button } from '../../components/ui/button';
import { toast } from 'sonner';

const InquiriesPage = () => {
  const [inquiries, setInquiries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [selectedInquiry, setSelectedInquiry] = useState(null);
  const PAGE_SIZE = 20;

  const loadInquiries = async (pageNum = 1) => {
    try {
      setLoading(true);
      const response = await apiClient.get('/admin/contacts', {
        params: { page: pageNum, limit: PAGE_SIZE },
        silent: true
      });
      setInquiries(response.data.items || []);
      setTotal(response.data.total || 0);
      setPage(pageNum);
    } catch (err) {
      console.error('Failed to load inquiries:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadInquiries();
  }, []);

  const handleUpdateStatus = async (id, newStatus) => {
    try {
      await apiClient.put(`/admin/contacts/${id}/status`, { status: newStatus });
      toast.success('Status updated successfully');
      setInquiries(inquiries.map(inc => inc.id === id ? { ...inc, status: newStatus } : inc));
      if (selectedInquiry?.id === id) {
        setSelectedInquiry({ ...selectedInquiry, status: newStatus });
      }
    } catch (err) {
      toast.error('Failed to update status');
    }
  };

  const getStatusStyle = (status) => {
    switch (status) {
      case 'resolved': return 'bg-emerald-50 text-emerald-600 border-emerald-200';
      case 'in_progress': return 'bg-amber-50 text-amber-600 border-amber-200';
      default: return 'bg-slate-50 text-slate-600 border-slate-200';
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'resolved': return <CheckCircle2 className="w-3.5 h-3.5 mr-1.5" />;
      case 'in_progress': return <AlertCircle className="w-3.5 h-3.5 mr-1.5" />;
      default: return <Circle className="w-3.5 h-3.5 mr-1.5" />;
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-700 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 pb-6 border-b border-slate-200/60">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-indigo-500 to-purple-500 flex items-center justify-center shadow-lg shadow-indigo-500/20 text-white">
              <MessageSquare className="w-6 h-6" />
            </div>
            <h1 className="text-3xl font-extrabold tracking-tight text-slate-900" style={{ fontFamily: 'Manrope, sans-serif' }}>
              Customer Inquiries
            </h1>
          </div>
          <p className="text-slate-500 font-medium">Manage and respond to messages submitted through the Contact Us form.</p>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-3xl border border-slate-200/60 shadow-xl shadow-slate-200/20 overflow-hidden backdrop-blur-xl">
        <div className="px-8 py-6 bg-slate-50/50 border-b border-slate-200/60 flex items-center justify-between">
          <h3 className="font-bold text-slate-800 flex items-center gap-2">
            <Clock className="w-4 h-4 text-indigo-600" /> Recent Messages
          </h3>
          <span className="text-xs font-black uppercase tracking-widest text-indigo-600 bg-indigo-50 px-4 py-1.5 rounded-full border border-indigo-100/50 shadow-sm">
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
                <option value="resolved">Resolved</option>
              </select>
            ),
            actions: (
              <button 
                onClick={() => setSelectedInquiry(item)}
                className="bg-slate-100 hover:bg-indigo-600 hover:text-white text-slate-700 font-bold px-4 py-2 rounded-xl text-xs transition-all shadow-sm active:scale-95"
              >
                Review
              </button>
            )
          }))}
        />
      </div>

      {/* Inquiry Detail Modal */}
      {selectedInquiry && (
        <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-md animate-in fade-in duration-200">
          <div className="bg-white rounded-[2rem] max-w-2xl w-full p-8 shadow-2xl shadow-indigo-900/20 border border-white/50 flex flex-col">
            <div className="flex justify-between items-start mb-8">
              <div>
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-10 h-10 rounded-xl bg-indigo-50 flex items-center justify-center text-indigo-600">
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
                ✕
              </button>
            </div>
            
            <div className="space-y-6">
              {/* Customer Info Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex items-center gap-4 text-slate-700 bg-slate-50/80 p-4 rounded-2xl border border-slate-100/50">
                  <div className="w-10 h-10 rounded-full bg-white flex items-center justify-center shadow-sm text-indigo-500">
                    <User className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Customer</p>
                    <p className="font-extrabold text-slate-900 text-sm">{selectedInquiry.name}</p>
                  </div>
                </div>

                <div className="flex items-center gap-4 text-slate-700 bg-slate-50/80 p-4 rounded-2xl border border-slate-100/50">
                  <div className="w-10 h-10 rounded-full bg-white flex items-center justify-center shadow-sm text-indigo-500">
                    <Mail className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Email</p>
                    <p className="font-bold text-slate-900 text-sm break-all">{selectedInquiry.email}</p>
                  </div>
                </div>

                <div className="flex items-center gap-4 text-slate-700 bg-slate-50/80 p-4 rounded-2xl border border-slate-100/50">
                  <div className="w-10 h-10 rounded-full bg-white flex items-center justify-center shadow-sm text-indigo-500">
                    <Phone className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Phone</p>
                    <p className="font-bold text-slate-900 text-sm">{selectedInquiry.phone || 'Not Provided'}</p>
                  </div>
                </div>

                <div className="flex items-center gap-4 text-slate-700 bg-slate-50/80 p-4 rounded-2xl border border-slate-100/50">
                  <div className="w-10 h-10 rounded-full bg-white flex items-center justify-center shadow-sm text-indigo-500">
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
                  <FileText className="w-4 h-4 text-indigo-500" /> Full Message
                </div>
                <p className="text-slate-800 text-sm leading-relaxed whitespace-pre-wrap max-h-64 overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-slate-300 font-medium">
                  {selectedInquiry.message}
                </p>
              </div>

              {/* Status Update */}
              <div className="flex items-center justify-between bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
                <span className="text-sm font-bold text-slate-700 flex items-center gap-2">
                  Status: 
                  <span className={`px-3 py-1 rounded-full text-xs font-black uppercase tracking-widest flex items-center border ${getStatusStyle(selectedInquiry.status || 'pending')}`}>
                    {getStatusIcon(selectedInquiry.status || 'pending')}
                    {(selectedInquiry.status || 'pending').replace('_', ' ')}
                  </span>
                </span>
                <select
                  value={selectedInquiry.status || 'pending'}
                  onChange={(e) => handleUpdateStatus(selectedInquiry.id, e.target.value)}
                  className="bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold px-4 py-2 rounded-xl text-xs transition-colors outline-none cursor-pointer appearance-none pr-8 relative"
                  style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='3' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='6 9 12 15 18 9'%3E%3C/polyline%3E%3C/svg%3E")`, backgroundRepeat: 'no-repeat', backgroundPosition: 'right 12px center' }}
                >
                  <option value="pending">Mark as Pending</option>
                  <option value="in_progress">Mark In Progress</option>
                  <option value="resolved">Mark as Resolved</option>
                </select>
              </div>
            </div>

            <div className="mt-8 flex justify-end">
              <Button 
                onClick={() => setSelectedInquiry(null)}
                className="bg-slate-900 text-white font-extrabold text-sm px-8 py-4 rounded-2xl tracking-wide hover:bg-indigo-600 transition-all shadow-lg hover:shadow-indigo-500/25 active:scale-95"
              >
                Close Inquiry
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default InquiriesPage;
