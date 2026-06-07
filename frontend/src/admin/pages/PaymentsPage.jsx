import React, { useEffect, useState, useCallback } from 'react';
import adminService from '../services/admin.service';
import { 
  CreditCard, IndianRupee, AlertCircle, CheckCircle2, 
  Search, Calendar, Filter, ArrowUpRight, ArrowDownLeft, RefreshCcw, XCircle, Clock
} from 'lucide-react';
import TablePagination from '../../components/ui/TablePagination';
import { toast } from 'sonner';
import PageLoader from '../../components/ui/PageLoader';
import DateFilterPopover from '../../components/ui/DateFilterPopover';
import apiClient from '../../services/core/apiClient';
import { useAuth } from '../../contexts/AuthContext';

const PaymentsPage = () => {
  const { hasPermission } = useAuth();
  const PAGE_SIZE = 15;
  const [rows, setRows] = useState(() => {
    const cached = adminService.getCached('/admin/payments', { page: 1, limit: PAGE_SIZE, search: '' });
    return cached?.data?.items || [];
  });
  const [loading, setLoading] = useState(() => {
    const cached = adminService.getCached('/admin/payments', { page: 1, limit: PAGE_SIZE, search: '' });
    return !cached;
  });
  const [filter, setFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [dateFilter, setDateFilter] = useState(null);
  const [metrics, setMetrics] = useState(() => {
    const cached = adminService.getCached('/admin/analytics/summary');
    return cached?.metrics || null;
  });

  const [total, setTotal] = useState(() => {
    const cached = adminService.getCached('/admin/payments', { page: 1, limit: PAGE_SIZE, search: '' });
    return cached?.data?.total || 0;
  });
  const [page, setPage] = useState(1);

  const load = useCallback(async (pageNum = 1) => {
    const params = { page: pageNum, limit: PAGE_SIZE, search };
    const cached = adminService.getCached('/admin/payments', params);
    if (!cached) {
      setLoading(true);
    }
    try {
      if (dateFilter && dateFilter.start_date && dateFilter.end_date) {
        params.start_date = dateFilter.start_date;
        params.end_date = dateFilter.end_date;
      }
      const response = await adminService.getPayments(params);
      setRows(response.data?.items || []);
      setTotal(response.data?.total || 0);
      setPage(pageNum);
      adminService.getDashboardMetrics().then((mRes) => {
        setMetrics(mRes.data?.metrics || null);
      }).catch(() => {});
    } catch (err) {
      toast.error('Failed to load transaction data');
    } finally {
      setLoading(false);
    }
  }, [search, dateFilter]);

  const loadSilent = useCallback(async (pageNum = 1) => {
    try {
      const params = { page: pageNum, limit: PAGE_SIZE, search };
      if (dateFilter && dateFilter.start_date && dateFilter.end_date) {
        params.start_date = dateFilter.start_date;
        params.end_date = dateFilter.end_date;
      }
      const response = await apiClient.get('/admin/payments', { params, silent: true });
      setRows(response.data?.items || []);
      setTotal(response.data?.total || 0);
    } catch (err) {
      // Ignore background errors
    }
  }, [search, dateFilter]);

  const formatDate = (d) => {
    if (!d) return '—';
    try { return new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }); }
    catch { return d; }
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      load(1);
    }, 100);
    return () => clearTimeout(timer);
  }, [search, load]);

  // Periodic silent polling in the background (every 10 seconds) for real-time payments list
  useEffect(() => {
    const timer = setInterval(() => {
      loadSilent(page);
    }, 10000);
    return () => clearInterval(timer);
  }, [loadSilent, page]);

  const filtered = rows.filter(r => filter === 'all' || r.status === filter);
  const paginatedPayments = filtered;

  const stats = {
    total: metrics?.total_revenue || 0,
    successCount: metrics?.paid_payments_count || 0,
    pending: metrics?.pending_payment_amount || 0,
    failed: metrics?.failed_payments_count || 0,
    successRate: metrics?.payment_success_rate ?? 100
  };

  if (loading && rows.length === 0) return <PageLoader />;

  return (
    <div className="space-y-8">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 pb-6 border-b border-slate-200">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-slate-900 flex items-center gap-3">
            <CreditCard className="w-8 h-8 text-primary" />
            Financial Audit
          </h1>
          <p className="text-slate-500 mt-1 font-medium">Monitor transactional health and revenue clearance.</p>
        </div>
        
        <div className="flex items-center gap-3">
          <div className="relative group">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
            <input 
              type="text"
              placeholder="Order # or Transaction..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm shadow-sm focus:ring-2 focus:ring-primary/20 outline-none w-64 transition-all focus:w-80"
            />
          </div>
          <DateFilterPopover onChange={(v) => setDateFilter(v)} initial={dateFilter} />
        </div>
      </div>

      {hasPermission('view_analytics') && metrics && (
        <div className="hidden md:grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-sm flex items-center gap-3">
            <div className="w-9 h-9 bg-emerald-50 text-emerald-600 rounded-lg flex items-center justify-center shrink-0">
              <IndianRupee className="w-5 h-5" />
            </div>
            <div>
              <div className="text-[9px] font-black uppercase tracking-widest text-slate-500">Net Settled</div>
              <div className="text-xl font-black text-slate-900 leading-none mt-0.5">₹{stats.total.toLocaleString('en-IN')}</div>
            </div>
          </div>
          <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-sm flex items-center gap-3">
            <div className="w-9 h-9 bg-amber-50 text-amber-600 rounded-lg flex items-center justify-center shrink-0">
              <AlertCircle className="w-5 h-5" />
            </div>
            <div>
              <div className="text-[9px] font-black uppercase tracking-widest text-slate-500">Escrow/Pending</div>
              <div className="text-xl font-black text-slate-900 leading-none mt-0.5">₹{stats.pending.toLocaleString('en-IN')}</div>
            </div>
          </div>
          <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-sm flex items-center gap-3">
            <div className="w-9 h-9 bg-primary/10 text-primary rounded-lg flex items-center justify-center shrink-0">
              <CheckCircle2 className="w-5 h-5" />
            </div>
            <div>
              <div className="text-[9px] font-black uppercase tracking-widest text-slate-500">Success Rate</div>
              <div className="text-xl font-black text-slate-900 leading-none mt-0.5">{Math.round(stats.successRate)}%</div>
            </div>
          </div>
          <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-sm flex items-center gap-3">
            <div className="w-9 h-9 bg-rose-50 text-rose-600 rounded-lg flex items-center justify-center shrink-0">
              <AlertCircle className="w-5 h-5" />
            </div>
            <div>
              <div className="text-[9px] font-black uppercase tracking-widest text-slate-500">Failed Events</div>
              <div className="text-xl font-black text-slate-900 leading-none mt-0.5">{stats.failed}</div>
            </div>
          </div>
        </div>
      )}

      <div className="flex items-center gap-2 overflow-x-auto pb-2 no-scrollbar">
        {['all', 'completed', 'pending', 'failed'].map(s => (
          <button 
            key={s} 
            onClick={() => setFilter(s)}
            className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap ${
              filter === s 
                ? 'bg-slate-900 text-white shadow-lg shadow-slate-200' 
                : 'bg-white text-slate-500 border border-slate-200 hover:bg-slate-50'
            }`}
          >
            {s} ({s === 'all' ? rows.length : rows.filter(r => r.status === s).length})
          </button>
        ))}
      </div>

      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto overflow-y-auto max-h-[calc(100vh-420px)]">
          <table className="w-full">
            <thead className="sticky top-0 bg-slate-50 z-10 shadow-[0_1px_0_0_rgba(226,232,240,1)]">
              <tr>
                <th className="px-6 py-5 text-left text-[11px] font-black text-slate-500 uppercase tracking-wider w-[180px]">Reference Code</th>
                <th className="px-6 py-5 text-left text-[11px] font-black text-slate-500 uppercase tracking-wider">Transaction ID</th>
                <th className="px-6 py-5 text-center text-[11px] font-black text-slate-500 uppercase tracking-wider w-[120px]">Method</th>
                <th className="px-6 py-5 text-center text-[11px] font-black text-slate-500 uppercase tracking-wider w-[140px]">Status</th>
                <th className="px-6 py-5 text-right text-[11px] font-black text-slate-500 uppercase tracking-wider w-[150px]">Net Amount</th>
                <th className="px-6 py-5 text-right text-[11px] font-black text-slate-500 uppercase tracking-wider w-[180px]">Stamp</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {filtered.map((row) => {
                const statusLower = String(row.status || '').toLowerCase();
                const isRefund = statusLower.includes('refund');
                const isFailed = statusLower.includes('failed');
                const isPending = statusLower.includes('pending') || statusLower.includes('initiated');
                const isSuccess = statusLower.includes('completed') || statusLower.includes('paid');

                return (
                  <tr key={row.id} className="hover:bg-slate-50/50 transition-colors group">
                    <td className="px-6 py-5">
                      <div className={`text-xs font-black flex items-center gap-1.5 ${
                        isFailed ? 'text-rose-600' :
                        isRefund ? 'text-indigo-650' :
                        isPending ? 'text-amber-600' : 'text-emerald-600'
                      }`}>
                        {isFailed ? <XCircle className="w-3.5 h-3.5 text-rose-500 shrink-0" /> :
                         isRefund ? <ArrowUpRight className="w-3.5 h-3.5 text-rose-500 shrink-0" /> :
                         isPending ? <Clock className="w-3.5 h-3.5 text-amber-500 shrink-0" /> :
                         <ArrowDownLeft className="w-3.5 h-3.5 text-emerald-500 shrink-0" />}
                        {row.order_number}
                      </div>
                    </td>
                    <td className="px-6 py-5">
                      <div className="text-xs font-mono font-bold text-slate-700 uppercase tracking-wider bg-slate-100 px-2 py-1.5 rounded inline-block whitespace-normal break-all">
                        {row.transaction_id || 'INTERNAL_RECON'}
                      </div>
                    </td>
                    <td className="px-6 py-5 text-center">
                      <span className="px-2.5 py-0.5 rounded-full bg-slate-50 text-slate-650 border border-slate-200/60 text-[9px] font-black uppercase tracking-wider">
                        {row.provider || 'Gateway'}
                      </span>
                    </td>
                    <td className="px-6 py-5 text-center">
                      <span className={`px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider ${
                        isSuccess ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' : 
                        isFailed ? 'bg-rose-50 text-rose-600 border border-rose-100' : 
                        isRefund ? 'bg-indigo-50 text-indigo-600 border border-indigo-100' :
                        'bg-amber-50 text-amber-600 border border-amber-100'
                      }`}>
                        {row.status}
                      </span>
                    </td>
                    <td className="px-6 py-5 text-right">
                      <div className={`text-sm font-black ${
                        isFailed ? 'text-slate-400 line-through' :
                        isRefund ? 'text-indigo-600' : 'text-slate-900'
                      }`}>
                        {isRefund ? '-' : ''}₹{Number(row.amount || 0).toLocaleString('en-IN')}
                      </div>
                    </td>
                    <td className="px-6 py-5 text-right">
                      <div className="text-[10px] font-black text-slate-500 uppercase tracking-widest flex items-center justify-end gap-1.5">
                        <Calendar className="w-3 h-3" />
                        {formatDate(row.created_at)}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {filtered.length === 0 && !loading && (
            <div className="p-12 text-center text-slate-500 font-medium italic">
              No financial records found for this criteria.
            </div>
          )}
        </div>
        <TablePagination
          currentPage={page}
          totalPages={Math.ceil(total / PAGE_SIZE)}
          onPageChange={load}
          totalItems={total}
          pageSize={PAGE_SIZE}
        />
      </div>
    </div>
  );
};

export default PaymentsPage;
