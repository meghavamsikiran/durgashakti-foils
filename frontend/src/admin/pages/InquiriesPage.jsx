import React, { useEffect, useState } from 'react';
import { Mail, MessageSquare, Clock, Search, Phone, Calendar, User, FileText } from 'lucide-react';
import AdminTable from '../components/AdminTable';
import apiClient from '../../services/core/apiClient';
import { Button } from '../../components/ui/button';

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

  return (
    <div className="space-y-8 animate-in fade-in duration-700">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 pb-6 border-b border-slate-200">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-slate-900 flex items-center gap-3">
            <MessageSquare className="w-8 h-8 text-indigo-600" />
            Customer Inquiries
          </h1>
          <p className="text-slate-500 mt-1 font-medium">View and manage messages from the Contact Us form.</p>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="px-8 py-6 bg-slate-50/50 border-b border-slate-200 flex items-center justify-between">
          <h3 className="font-bold text-slate-800 flex items-center gap-2">
            <Clock className="w-4 h-4 text-indigo-600" /> Message History
          </h3>
          <span className="text-[10px] font-black uppercase tracking-widest text-slate-500 bg-white px-3 py-1 rounded-full border">
            {total} messages
          </span>
        </div>
        <AdminTable
          columns={[
            { key: 'name', title: 'Name' },
            { key: 'email', title: 'Email' },
            { key: 'phone', title: 'Phone' },
            { key: 'message', title: 'Message' },
            { key: 'status', title: 'Status' },
            { key: 'created_at', title: 'Date' },
            { key: 'actions', title: 'Actions' },
          ]}
          rows={inquiries.map(item => ({
            ...item,
            created_at: new Date(item.created_at).toLocaleString(),
            message: <span className="text-xs text-slate-600 truncate max-w-xs block">{item.message}</span>,
            actions: (
              <button 
                onClick={() => setSelectedInquiry(item)}
                className="bg-indigo-50 hover:bg-indigo-100 text-indigo-600 font-bold px-3 py-1.5 rounded-xl text-xs transition-colors"
              >
                View
              </button>
            )
          }))}
        />
      </div>

      {/* Inquiry Detail Modal */}
      {selectedInquiry && (
        <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl max-w-lg w-full p-8 shadow-2xl border border-slate-100 flex flex-col space-y-6">
            <div className="flex justify-between items-center border-b pb-4">
              <h3 className="text-xl font-extrabold text-slate-900 flex items-center gap-2" style={{ fontFamily: 'Manrope, sans-serif' }}>
                <MessageSquare className="w-5 h-5 text-indigo-600" />
                Inquiry Details
              </h3>
              <button 
                onClick={() => setSelectedInquiry(null)}
                className="text-slate-400 hover:text-slate-600 font-bold text-sm"
              >
                ✕
              </button>
            </div>
            
            <div className="space-y-4 text-xs">
              <div className="flex items-center gap-3 text-slate-700 bg-slate-50 p-3 rounded-xl">
                <User className="w-4 h-4 text-indigo-500" />
                <div>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Customer Name</p>
                  <p className="font-extrabold text-slate-900">{selectedInquiry.name}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="flex items-center gap-3 text-slate-700 bg-slate-50 p-3 rounded-xl">
                  <Mail className="w-4 h-4 text-indigo-500" />
                  <div>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Email Address</p>
                    <p className="font-bold text-slate-900 break-all">{selectedInquiry.email}</p>
                  </div>
                </div>

                <div className="flex items-center gap-3 text-slate-700 bg-slate-50 p-3 rounded-xl">
                  <Phone className="w-4 h-4 text-indigo-500" />
                  <div>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Phone Number</p>
                    <p className="font-bold text-slate-900">{selectedInquiry.phone || 'N/A'}</p>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-3 text-slate-700 bg-slate-50 p-3 rounded-xl">
                <Calendar className="w-4 h-4 text-indigo-500" />
                <div>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Date Submitted</p>
                  <p className="font-bold text-slate-900">{new Date(selectedInquiry.created_at).toLocaleString()}</p>
                </div>
              </div>

              <div className="flex flex-col gap-2 text-slate-700 bg-slate-50/50 p-4 rounded-xl border border-slate-100">
                <div className="flex items-center gap-2 text-slate-400 font-bold uppercase text-[10px] tracking-wider">
                  <FileText className="w-3.5 h-3.5 text-indigo-500" /> Message
                </div>
                <p className="text-slate-800 text-xs leading-relaxed whitespace-pre-wrap max-h-60 overflow-y-auto pr-1">
                  {selectedInquiry.message}
                </p>
              </div>
            </div>

            <div className="pt-4 border-t flex gap-3">
              <Button 
                onClick={() => setSelectedInquiry(null)}
                className="w-full bg-slate-900 text-white font-bold text-xs uppercase py-3 rounded-xl tracking-wider hover:bg-slate-800"
              >
                Close
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default InquiriesPage;
