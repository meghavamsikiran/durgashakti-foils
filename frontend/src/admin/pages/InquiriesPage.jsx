import React, { useEffect, useState } from 'react';
import { Mail, MessageSquare, Clock, Search } from 'lucide-react';
import AdminTable from '../components/AdminTable';
import apiClient from '../../services/core/apiClient';

const InquiriesPage = () => {
  const [inquiries, setInquiries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
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
          ]}
          rows={inquiries.map(item => ({
            ...item,
            created_at: new Date(item.created_at).toLocaleString(),
            message: <span className="text-xs text-slate-600 truncate max-w-xs block">{item.message}</span>
          }))}
        />
      </div>
    </div>
  );
};

export default InquiriesPage;
