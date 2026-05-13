import React, { useEffect, useState, useCallback } from 'react';
import adminApi from '../services/adminApi';
import { 
  CreditCard, IndianRupee, AlertCircle, CheckCircle2, 
  Search, Calendar, Filter, ArrowUpRight
} from 'lucide-react';
import TablePagination from '../../components/ui/TablePagination';
import { toast } from 'sonner';

const PaymentsPage = () => {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [metrics, setMetrics] = useState(null);

  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const PAGE_SIZE = 15;

  const load = useCallback(async (pageNum = 1) => {
    try {
      setLoading(true);
      const response = await adminApi.getPayments({ page: pageNum, limit: PAGE_SIZE, search });
      setRows(response.data.items || []);
      setTotal(response.data.total || 0);
      setPage(pageNum);
      
      const mRes = await adminApi.getDashboardMetrics();
      setMetrics(mRes.data?.metrics || {});
    } catch (err) {
      toast.error('Failed to load transaction data');
    } finally {
      setLoading(false);
    }
  }, [search]);

  const formatDate = (d) => {
    if (!d) return '—';
    try { return new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }); }
    catch { return d; }
  };

  useEffect(() => {
    const timer = setTimeout(() => load(1), 300);
    return () => clearTimeout(timer);
  }, [search, load]);

  const filtered = rows.filter(r => filter === 'all' || r.status === filter);
  const paginatedPayments = filtered;

  const stats = {
    total: metrics?.total_revenue || 0,
    successCount: metrics?.total_orders || 0,
    pending: metrics?.pending_orders || 0,
    failed: 0, // Not provided by summary API currently
    successRate: 100 // Placeholder
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-700">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 pb-6 border-b border-slate-100">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-slate-900 flex items-center gap-3">
            <CreditCard className="w-8 h-8 text-indigo-600" />
            Financial Audit
          </h1>
          <p className="text-slate-500 mt-1 font-medium">Monitor transactional health and revenue clearance.</p>
        </div>
        
        <div className="flex items-center gap-3">
          <div className="relative group">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input 
              type="text"
              placeholder="Order # or Transaction..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm shadow-sm focus:ring-2 focus:ring-indigo-500/20 outline-none w-64 transition-all focus:w-80"
            />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 bg-emerald-50 text-emerald-600 rounded-xl flex items-center justify-center">
            <IndianRupee className="w-6 h-6" />
          </div>
          <div>
            <div className="text-[10px] font-black uppercase tracking-widest text-slate-400">Net Settled</div>
            <div className="text-2xl font-black text-slate-900">₹{stats.total.toLocaleString('en-IN')}</div>
          </div>
        </div>
        <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 bg-amber-50 text-amber-600 rounded-xl flex items-center justify-center">
            <AlertCircle className="w-6 h-6" />
          </div>
          <div>
            <div className="text-[10px] font-black uppercase tracking-widest text-slate-400">Escrow/Pending</div>
            <div className="text-2xl font-black text-slate-900">₹{stats.pending.toLocaleString('en-IN')}</div>
          </div>
        </div>
        <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 bg-indigo-50 text-indigo-600 rounded-xl flex items-center justify-center">
            <CheckCircle2 className="w-6 h-6" />
          </div>
          <div>
            <div className="text-[10px] font-black uppercase tracking-widest text-slate-400">Success Rate</div>
            <div className="text-2xl font-black text-slate-900">{Math.round(stats.successRate)}%</div>
          </div>
        </div>
        <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 bg-rose-50 text-rose-600 rounded-xl flex items-center justify-center">
            <AlertCircle className="w-6 h-6" />
          </div>
          <div>
            <div className="text-[10px] font-black uppercase tracking-widest text-slate-400">Failed Events</div>
            <div className="text-2xl font-black text-slate-900">{stats.failed}</div>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-2 overflow-x-auto pb-2 no-scrollbar">
        {['all', 'completed', 'pending', 'failed'].map(s => (
          <button 
            key={s} 
            onClick={() => setFilter(s)}
            className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap ${
              filter === s 
                ? 'bg-slate-900 text-white shadow-lg shadow-slate-200' 
                : 'bg-white text-slate-400 border border-slate-100 hover:bg-slate-50'
            }`}
          >
            {s} ({s === 'all' ? rows.length : rows.filter(r => r.status === s).length})
          </button>
        ))}
      </div>

      <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full">
            <thead className="bg-slate-50/50 border-b border-slate-100">
              <tr>
                <th className="px-8 py-5 text-left text-[11px] font-black text-slate-400 uppercase tracking-wider">Reference Code</th>
                <th className="px-8 py-5 text-left text-[11px] font-black text-slate-400 uppercase tracking-wider">Transaction ID</th>
                <th className="px-8 py-5 text-center text-[11px] font-black text-slate-400 uppercase tracking-wider">Method</th>
                <th className="px-8 py-5 text-center text-[11px] font-black text-slate-400 uppercase tracking-wider">Status</th>
                <th className="px-8 py-5 text-right text-[11px] font-black text-slate-400 uppercase tracking-wider">Net Amount</th>
                <th className="px-8 py-5 text-right text-[11px] font-black text-slate-400 uppercase tracking-wider">Stamp</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {filtered.map((row) => (
                <tr key={row.id} className="hover:bg-slate-50/50 transition-colors group">
                  <td className="px-8 py-6">
                    <div className="text-xs font-black text-indigo-600 flex items-center gap-1">
                      <ArrowUpRight className="w-3 h-3" />
                      {row.order_number}
                    </div>
                  </td>
                  <td className="px-8 py-6">
                    <div className="text-[10px] font-mono text-slate-400 font-bold uppercase tracking-widest">
                      {row.transaction_id || 'INTERNAL_RECON'}
                    </div>
                  </td>
                  <td className="px-8 py-6 text-center">
                    <span className="px-3 py-1 rounded-full bg-slate-50 text-slate-600 text-[10px] font-black uppercase tracking-widest">
                      {row.provider || 'Gateway'}
                    </span>
                  </td>
                  <td className="px-8 py-6 text-center">
                    <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${
                      row.status === 'completed' ? 'bg-emerald-50 text-emerald-600' : 
                      row.status === 'failed' ? 'bg-rose-50 text-rose-600' : 'bg-amber-50 text-amber-600'
                    }`}>
                      {row.status}
                    </span>
                  </td>
                  <td className="px-8 py-6 text-right">
                    <div className="text-sm font-black text-slate-900">
                      ₹{Number(row.amount || 0).toLocaleString('en-IN')}
                    </div>
                  </td>
                  <td className="px-8 py-6 text-right">
                    <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center justify-end gap-1.5">
                      <Calendar className="w-3 h-3" />
                      {formatDate(row.created_at)}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {filtered.length === 0 && (
            <div className="p-12 text-center text-slate-400 font-medium italic">
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
