import React, { useEffect, useState, useCallback } from 'react';
import adminService from '../services/admin.service';
import { 
  CreditCard, IndianRupee, AlertCircle, CheckCircle2, 
  Search, Calendar, Filter, ArrowUpRight, ArrowDownLeft, RefreshCcw, XCircle, Clock, Copy
} from 'lucide-react';
import TablePagination from '../../components/ui/TablePagination';
import { toast } from 'sonner';
import PageLoader from '../../components/ui/PageLoader';
import DateFilterPopover from '../../components/ui/DateFilterPopover';
import apiClient from '../../services/core/apiClient';
import { useAuth } from '../../contexts/AuthContext';
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
      const diff = now.getDate() - day + (day === 0 ? -6 : 1);
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
  const [tempStatus, setTempStatus] = useState('all');
  const [tempDatePreset, setTempDatePreset] = useState('');
  const [tempCustomStart, setTempCustomStart] = useState('');
  const [tempCustomEnd, setTempCustomEnd] = useState('');
  const [filterOpen, setFilterOpen] = useState(false);
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [dateFilter, setDateFilter] = useState(null);
  const [metrics, setMetrics] = useState(() => {
    const cached = adminService.getCached('/admin/analytics/summary');
    return cached?.data?.metrics || null;
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

  // Debounce search input changes
  useEffect(() => {
    const handler = setTimeout(() => {
      setSearch(searchInput);
    }, 450); // 450ms debounce
    return () => clearTimeout(handler);
  }, [searchInput]);

  useEffect(() => {
    load(1);
  }, [search, load]);

  // Periodic silent polling in the background (every 10 seconds) for real-time payments list
  useEffect(() => {
    const timer = setInterval(() => {
      loadSilent(page);
    }, 10000);
    return () => clearInterval(timer);
  }, [loadSilent, page]);

  const filtered = rows.filter(r => {
    if (filter === 'all') return true;
    const sLower = String(r.status || '').toLowerCase();
    const fLower = String(filter).toLowerCase();
    if (fLower === 'refund initiated') {
      return sLower === 'refund initiated' || sLower === 'refund_initiated';
    }
    if (fLower === 'refund credited') {
      return sLower === 'refund credited' || sLower === 'refund_credited';
    }
    return sLower === fLower;
  });
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
    <div className="space-y-4">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-3 border-b border-slate-200">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-slate-900 flex items-center gap-2">
            <CreditCard className="w-5 h-5 text-primary" />
            Financial Audit
          </h1>
          <p className="text-xs text-slate-500 mt-0.5 font-medium">Monitor transactional health and revenue clearance.</p>
        </div>
        
        <div className="flex items-center gap-3 relative">
          <div className="relative group">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
            <input 
              type="text"
              placeholder="Order # or Transaction..."
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              className="pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm shadow-sm focus:ring-2 focus:ring-primary/20 outline-none w-64 transition-all focus:w-80"
            />
          </div>
          <div className="relative">
            <button
              type="button"
              onClick={() => {
                setTempStatus(filter);
                setTempDatePreset(dateFilter?.label || '');
                setTempCustomStart(dateFilter?.label === 'custom' ? (dateFilter.start_date || '').slice(0, 10) : '');
                setTempCustomEnd(dateFilter?.label === 'custom' ? (dateFilter.end_date || '').slice(0, 10) : '');
                setFilterOpen((prev) => !prev);
              }}
              className="inline-flex items-center gap-2 px-3 py-2 rounded-xl border border-slate-200 bg-white shadow-sm hover:bg-slate-50"
            >
              <Filter className="w-4 h-4 text-slate-600" />
              <span className="text-xs font-black uppercase tracking-widest text-slate-600">Filter</span>
              {(filter !== 'all' || dateFilter) && (
                <span className="ml-1 px-1.5 py-0.5 text-[9px] bg-primary text-white rounded-full font-black">
                  Active
                </span>
              )}
            </button>
            {filterOpen && (
              <>
                <div className="fixed inset-0 bg-black/40 z-40 md:hidden" onClick={() => setFilterOpen(false)} />
                <div className="fixed inset-x-4 top-1/2 -translate-y-1/2 md:absolute md:translate-y-0 md:inset-auto md:right-0 md:mt-2 w-auto md:w-80 bg-white border border-slate-200 rounded-2xl shadow-2xl p-4 z-50">
                  <div className="space-y-4">
                    <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                      <h3 className="text-sm font-black text-slate-900">Payment Filters</h3>
                      <button
                        type="button"
                        onClick={() => {
                          setTempStatus('all');
                          setTempDatePreset('');
                          setTempCustomStart('');
                          setTempCustomEnd('');
                          setFilter('all');
                          setDateFilter(null);
                          setFilterOpen(false);
                        }}
                        className="text-[10px] font-black text-rose-500 uppercase tracking-widest hover:underline"
                      >
                        Reset All
                      </button>
                    </div>

                    <div className="space-y-1">
                      <label className="block text-[10px] font-black uppercase tracking-widest text-slate-500">Transaction Status</label>
                      <select
                        value={tempStatus}
                        onChange={(e) => setTempStatus(e.target.value)}
                        className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs bg-white bg-[image:none]"
                      >
                        <option value="all">All Statuses</option>
                        <option value="completed">Completed / Paid</option>
                        <option value="pending">Pending</option>
                        <option value="failed">Failed</option>
                        <option value="refund initiated">Refund Initiated</option>
                        <option value="refund credited">Refund Credited</option>
                      </select>
                    </div>

                    <div className="space-y-1.5">
                      <label className="block text-[10px] font-black uppercase tracking-widest text-slate-500">Date Preset</label>
                      <div className="grid grid-cols-2 gap-1.5">
                        {DATE_PRESETS.map(p => (
                          <button
                            type="button"
                            key={p.key}
                            onClick={() => {
                              setTempDatePreset(p.key);
                            }}
                            className={`px-2 py-1.5 rounded-lg text-xs font-semibold text-center border transition-all ${
                              tempDatePreset === p.key 
                                ? 'bg-primary text-white border-primary' 
                                : 'bg-slate-50 text-slate-700 border-slate-100 hover:bg-slate-100'
                            }`}
                          >
                            {p.label}
                          </button>
                        ))}
                      </div>
                    </div>

                    {tempDatePreset === 'custom' && (
                      <div className="grid grid-cols-2 gap-2 border-t border-slate-100 pt-2">
                        <div>
                          <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest block">Start Date</label>
                          <input 
                            type="date" 
                            value={tempCustomStart} 
                            onChange={(e) => setTempCustomStart(e.target.value)} 
                            className="w-full mt-1 p-1.5 rounded-lg border border-slate-200 text-xs" 
                          />
                        </div>
                        <div>
                          <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest block">End Date</label>
                          <input 
                            type="date" 
                            value={tempCustomEnd} 
                            onChange={(e) => setTempCustomEnd(e.target.value)} 
                            className="w-full mt-1 p-1.5 rounded-lg border border-slate-200 text-xs" 
                          />
                        </div>
                      </div>
                    )}

                    <div className="flex justify-end gap-2 border-t border-slate-100 pt-3">
                      <button
                        type="button"
                        onClick={() => setFilterOpen(false)}
                        className="px-3 py-2 rounded-xl border border-slate-200 text-slate-600 text-xs font-black uppercase tracking-widest hover:bg-slate-50"
                      >
                        Cancel
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setFilter(tempStatus);
                          if (tempDatePreset) {
                            if (tempDatePreset === 'custom') {
                              if (tempCustomStart && tempCustomEnd) {
                                const s = new Date(tempCustomStart);
                                const e = new Date(tempCustomEnd);
                                if (s <= e) {
                                  setDateFilter({ start_date: toISODateStart(s), end_date: toISODateEnd(e), label: 'custom' });
                                }
                              }
                            } else {
                              const r = rangeForPreset(tempDatePreset);
                              if (r) {
                                setDateFilter({ start_date: r.start, end_date: r.end, label: tempDatePreset });
                              }
                            }
                          } else {
                            setDateFilter(null);
                          }
                          setFilterOpen(false);
                        }}
                        className="px-3 py-2 rounded-xl bg-primary text-white text-xs font-black uppercase tracking-widest"
                      >
                        Apply Filters
                      </button>
                    </div>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {hasPermission('view_analytics') && metrics && (
        <div className="hidden md:grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white py-2 px-3 rounded-xl border border-slate-200 shadow-sm flex items-center gap-2.5">
            <div className="w-8 h-8 bg-emerald-50 text-emerald-600 rounded-lg flex items-center justify-center shrink-0">
              <IndianRupee className="w-4.5 h-4.5" />
            </div>
            <div>
              <div className="text-[9px] font-bold uppercase tracking-wider text-slate-500">Net Settled</div>
              <div className="text-base font-extrabold text-slate-900 leading-none mt-0.5">₹{stats.total.toLocaleString('en-IN')}</div>
            </div>
          </div>
          <div className="bg-white py-2 px-3 rounded-xl border border-slate-200 shadow-sm flex items-center gap-2.5">
            <div className="w-8 h-8 bg-amber-50 text-amber-600 rounded-lg flex items-center justify-center shrink-0">
              <AlertCircle className="w-4.5 h-4.5" />
            </div>
            <div>
              <div className="text-[9px] font-bold uppercase tracking-wider text-slate-500">Escrow/Pending</div>
              <div className="text-base font-extrabold text-slate-900 leading-none mt-0.5">₹{stats.pending.toLocaleString('en-IN')}</div>
            </div>
          </div>
          <div className="bg-white py-2 px-3 rounded-xl border border-slate-200 shadow-sm flex items-center gap-2.5">
            <div className="w-8 h-8 bg-primary/10 text-primary rounded-lg flex items-center justify-center shrink-0">
              <CheckCircle2 className="w-4.5 h-4.5" />
            </div>
            <div>
              <div className="text-[9px] font-bold uppercase tracking-wider text-slate-500">Success Rate</div>
              <div className="text-base font-extrabold text-slate-900 leading-none mt-0.5">{Math.round(stats.successRate)}%</div>
            </div>
          </div>
          <div className="bg-white py-2 px-3 rounded-xl border border-slate-200 shadow-sm flex items-center gap-2.5">
            <div className="w-8 h-8 bg-rose-50 text-rose-600 rounded-lg flex items-center justify-center shrink-0">
              <AlertCircle className="w-4.5 h-4.5" />
            </div>
            <div>
              <div className="text-[9px] font-bold uppercase tracking-wider text-slate-500">Failed Events</div>
              <div className="text-base font-extrabold text-slate-900 leading-none mt-0.5">{stats.failed}</div>
            </div>
          </div>
        </div>
      )}

      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto overflow-y-auto admin-table-container-stats" style={{ minHeight: '420px' }}>
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
                      <div className="flex items-center gap-1.5 bg-slate-100 px-2 py-1.5 rounded w-fit">
                        <span className="text-xs font-mono font-bold text-slate-700 uppercase tracking-wider whitespace-nowrap select-all">
                          {row.transaction_id || 'INTERNAL_RECON'}
                        </span>
                        {row.transaction_id && (
                          <button
                            onClick={() => {
                              navigator.clipboard.writeText(row.transaction_id);
                              toast.success('Transaction ID copied!');
                            }}
                            className="p-0.5 text-slate-400 hover:text-slate-650 transition-colors inline-flex items-center"
                            title="Copy Transaction ID"
                          >
                            <Copy className="w-3.5 h-3.5" />
                          </button>
                        )}
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
