import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { 
  CreditCard, ArrowUpRight, ArrowDownLeft, Search, Filter, 
  ChevronDown, Calendar, XCircle, Clock, IndianRupee, CheckCircle2, AlertCircle
} from 'lucide-react';
import { Button } from '../../../components/ui/button';
import TablePagination from '../../../components/ui/TablePagination';

const CustomSelect = ({ value, onChange, options }) => {
  const [isOpen, setIsOpen] = useState(false);
  const selectedOption = options.find(opt => opt.value === value) || options[0];
  const containerRef = React.useRef(null);

  React.useEffect(() => {
    const handleOutsideClick = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, []);

  return (
    <div className="relative w-full text-slate-800" ref={containerRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between rounded-xl border border-slate-200 p-2.5 text-sm bg-white text-left focus:outline-none focus:ring-2 focus:ring-primary/25 font-semibold transition-all shadow-sm"
      >
        <span className="truncate">{selectedOption?.label}</span>
        <ChevronDown className={`w-4 h-4 text-slate-400 shrink-0 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>
      {isOpen && (
        <div className="absolute left-0 right-0 mt-1.5 max-h-48 overflow-y-auto rounded-xl border border-slate-200 bg-white shadow-xl z-50 py-1.5 animate-in fade-in slide-in-from-top-1 duration-150">
          {options.map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() => {
                onChange(option.value);
                setIsOpen(false);
              }}
              className={`w-full text-left px-3.5 py-2 text-sm font-semibold transition-colors hover:bg-slate-50 ${
                option.value === value ? 'text-primary bg-primary/5 font-bold' : 'text-slate-700'
              }`}
            >
              {option.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

const TransactionsTab = ({ orders, loading, error }) => {
  const [currentPage, setCurrentPage] = useState(1);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterOpen, setFilterOpen] = useState(false);
  const [methodFilter, setMethodFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [timeframeFilter, setTimeframeFilter] = useState('all');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const PAGE_SIZE = 10;

  if (loading && (!orders || orders.length === 0)) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[350px] bg-white rounded-3xl border border-slate-200 shadow-sm p-8">
        <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-primary mb-3"></div>
        <p className="text-xs text-slate-500 font-medium">Securing transaction ledger...</p>
      </div>
    );
  }

  if (error && (!orders || orders.length === 0)) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[350px] bg-white rounded-3xl border border-slate-200 shadow-sm p-8 text-center">
        <AlertCircle className="w-12 h-12 text-rose-500 mb-3 shrink-0" />
        <p className="text-sm font-bold text-slate-800">{error}</p>
      </div>
    );
  }

  const methodOptions = [
    { value: 'all', label: 'All Methods' },
    { value: 'online', label: 'Online Payment' },
    { value: 'cod', label: 'Cash On Delivery (COD)' },
  ];
  const statusOptions = [
    { value: 'all', label: 'All Statuses' },
    { value: 'paid', label: 'Paid / Completed' },
    { value: 'pending', label: 'Pending' },
    { value: 'failed', label: 'Failed / Refunded' },
  ];
  const timeframeOptions = [
    { value: 'all', label: 'All Time' },
    { value: 'today', label: 'Today' },
    { value: 'this_month', label: 'This Month' },
    { value: 'last_month', label: 'Last Month' },
    { value: 'custom', label: 'Date Range' },
  ];

  const transactions = (orders || []).map((order) => ({
    id: order.id,
    transaction_id:
      order.transaction_id ||
      (String(order.payment_method || '').toLowerCase() === 'cod' ? 'Cash on Delivery' : order.id),
    order_number: order.order_number,
    amount: order.total_amount,
    date: order.created_at,
    method: order.payment_method || 'COD',
    status: order.payment_status,
    type: 'debit',
  }));

  const filteredTransactions = transactions.filter((tx) => {
    // 1. Search Query Filter
    const query = searchQuery.toLowerCase().trim();
    let matchesSearch = true;
    if (query) {
      const matchesOrderNumber = (tx.order_number || '').toLowerCase().includes(query);
      const matchesTxId = (tx.transaction_id || '').toLowerCase().includes(query);
      matchesSearch = matchesOrderNumber || matchesTxId;
    }

    // 2. Method Filter
    let matchesMethod = true;
    if (methodFilter !== 'all') {
      const methodStr = (tx.method || '').toLowerCase();
      if (methodFilter === 'cod') {
        matchesMethod = methodStr.includes('cod') || methodStr.includes('cash');
      } else if (methodFilter === 'online') {
        matchesMethod = methodStr.includes('online') || methodStr.includes('razorpay');
      }
    }

    // 3. Status Filter
    let matchesStatus = true;
    if (statusFilter !== 'all') {
      const statusStr = (tx.status || '').toLowerCase();
      if (statusFilter === 'paid') {
        matchesStatus = ['paid', 'completed', 'success'].includes(statusStr);
      } else if (statusFilter === 'pending') {
        matchesStatus = ['pending', 'unpaid', 'processing'].includes(statusStr);
      } else if (statusFilter === 'failed') {
        matchesStatus = ['failed', 'cancelled', 'refunded'].includes(statusStr);
      }
    }

    // 4. Timeframe Filter
    let matchesTimeframe = true;
    if (timeframeFilter !== 'all' && tx.date) {
      const createdDate = new Date(tx.date);
      const now = new Date();
      if (timeframeFilter === 'today') {
        const startOfToday = new Date();
        startOfToday.setHours(0, 0, 0, 0);
        const endOfToday = new Date();
        endOfToday.setHours(23, 59, 59, 999);
        matchesTimeframe = createdDate >= startOfToday && createdDate <= endOfToday;
      } else if (timeframeFilter === 'this_month') {
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        matchesTimeframe = createdDate >= startOfMonth;
      } else if (timeframeFilter === 'last_month') {
        const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        const endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999);
        matchesTimeframe = createdDate >= startOfLastMonth && createdDate <= endOfLastMonth;
      } else if (timeframeFilter === 'custom') {
        if (startDate) {
          const s = new Date(startDate);
          s.setHours(0, 0, 0, 0);
          matchesTimeframe = matchesTimeframe && createdDate >= s;
        }
        if (endDate) {
          const e = new Date(endDate);
          e.setHours(23, 59, 59, 999);
          matchesTimeframe = matchesTimeframe && createdDate <= e;
        }
      }
    }

    return matchesSearch && matchesMethod && matchesStatus && matchesTimeframe;
  });

  const totalFilteredPages = Math.ceil(filteredTransactions.length / PAGE_SIZE);
  const paginatedTransactions = filteredTransactions.slice(
    (currentPage - 1) * PAGE_SIZE,
    currentPage * PAGE_SIZE
  );

  const stats = {
    totalSpent: transactions
      .filter(tx => ['paid', 'completed', 'success'].includes(String(tx.status || '').toLowerCase()))
      .reduce((sum, tx) => sum + Number(tx.amount || 0), 0),
    pendingAmount: transactions
      .filter(tx => ['pending', 'unpaid', 'processing', 'pending_payment'].includes(String(tx.status || '').toLowerCase()))
      .reduce((sum, tx) => sum + Number(tx.amount || 0), 0),
    successCount: transactions
      .filter(tx => ['paid', 'completed', 'success'].includes(String(tx.status || '').toLowerCase()))
      .length,
    refundedAmount: transactions
      .filter(tx => ['refunded', 'refund initiated', 'refund_initiated', 'refund credited', 'refund_credited', 'failed'].includes(String(tx.status || '').toLowerCase()))
      .reduce((sum, tx) => sum + Number(tx.amount || 0), 0),
  };

  return (
    <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="space-y-6">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-3 border-b border-slate-200">
        <div>
          <h2 className="text-2xl md:text-3xl font-black text-slate-900 uppercase tracking-tighter flex items-center gap-2">
            <CreditCard className="w-6 h-6 text-primary" />
            Personal Ledger
          </h2>
          <p className="text-xs text-slate-500 mt-0.5 font-medium">Track your payments, refunds, and order clearances.</p>
        </div>
        <CreditCard className="w-8 h-8 text-muted-foreground/30 hidden lg:block" />
      </div>

      {/* Stats Cards Section */}
      {transactions.length > 0 && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white py-3 px-4 rounded-xl border border-slate-200 shadow-sm flex items-center gap-3">
            <div className="w-9 h-9 bg-emerald-50 text-emerald-600 rounded-lg flex items-center justify-center shrink-0">
              <IndianRupee className="w-5 h-5" />
            </div>
            <div>
              <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Total Spent</div>
              <div className="text-lg font-extrabold text-slate-900 leading-none mt-1">₹{stats.totalSpent.toLocaleString('en-IN')}</div>
            </div>
          </div>
          <div className="bg-white py-3 px-4 rounded-xl border border-slate-200 shadow-sm flex items-center gap-3">
            <div className="w-9 h-9 bg-amber-50 text-amber-600 rounded-lg flex items-center justify-center shrink-0">
              <Clock className="w-5 h-5" />
            </div>
            <div>
              <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Pending</div>
              <div className="text-lg font-extrabold text-slate-900 leading-none mt-1">₹{stats.pendingAmount.toLocaleString('en-IN')}</div>
            </div>
          </div>
          <div className="bg-white py-3 px-4 rounded-xl border border-slate-200 shadow-sm flex items-center gap-3">
            <div className="w-9 h-9 bg-primary/10 text-primary rounded-lg flex items-center justify-center shrink-0">
              <CheckCircle2 className="w-5 h-5" />
            </div>
            <div>
              <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Payments Done</div>
              <div className="text-lg font-extrabold text-slate-900 leading-none mt-1">{stats.successCount}</div>
            </div>
          </div>
          <div className="bg-white py-3 px-4 rounded-xl border border-slate-200 shadow-sm flex items-center gap-3">
            <div className="w-9 h-9 bg-rose-50 text-rose-600 rounded-lg flex items-center justify-center shrink-0">
              <AlertCircle className="w-5 h-5" />
            </div>
            <div>
              <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Refunds & Failed</div>
              <div className="text-lg font-extrabold text-slate-900 leading-none mt-1">₹{stats.refundedAmount.toLocaleString('en-IN')}</div>
            </div>
          </div>
        </div>
      )}

      {transactions.length > 0 && (
        <div className="flex gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search by order # or TXN ID..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full pl-12 pr-4 h-[48px] rounded-lg border border-border-subtle focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all text-sm font-medium text-foreground placeholder:text-muted-foreground bg-surface shadow-sm"
            />
          </div>
          <div className="relative">
            <button
              type="button"
              onClick={() => setFilterOpen((prev) => !prev)}
              className={`inline-flex items-center justify-center w-[48px] h-[48px] rounded-lg border shadow-sm transition-colors ${
                filterOpen || methodFilter !== 'all' || statusFilter !== 'all' || timeframeFilter !== 'all' || startDate !== '' || endDate !== ''
                  ? 'border-primary bg-primary/5 text-primary'
                  : 'border-border-subtle bg-surface text-muted-foreground hover:bg-slate-50'
              }`}
            >
              <Filter className="w-5 h-5" />
            </button>
            {filterOpen && (
              <>
                <div className="fixed inset-0 bg-black/40 z-40 xl:hidden" onClick={() => setFilterOpen(false)} />
                <div className="fixed inset-x-4 top-1/2 -translate-y-1/2 xl:absolute xl:translate-y-0 xl:inset-auto xl:right-0 xl:mt-2 w-auto xl:w-72 bg-white border border-slate-200 rounded-2xl shadow-2xl p-4 z-50 animate-in fade-in zoom-in-95 duration-200">
                  <div className="space-y-4">
                    <h3 className="text-sm font-black text-slate-900">Transaction Filters</h3>
                    <div>
                      <label className="block text-[10px] font-black uppercase tracking-widest text-slate-500 mb-1.5">Payment Method</label>
                      <CustomSelect
                        value={methodFilter}
                        onChange={(val) => {
                          setMethodFilter(val);
                          setCurrentPage(1);
                        }}
                        options={methodOptions}
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-black uppercase tracking-widest text-slate-500 mb-1.5">Payment Status</label>
                      <CustomSelect
                        value={statusFilter}
                        onChange={(val) => {
                          setStatusFilter(val);
                          setCurrentPage(1);
                        }}
                        options={statusOptions}
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-black uppercase tracking-widest text-slate-500 mb-1.5">Timeframe</label>
                      <CustomSelect
                        value={timeframeFilter}
                        onChange={(val) => {
                          setTimeframeFilter(val);
                          setCurrentPage(1);
                        }}
                        options={timeframeOptions}
                      />
                    </div>
                    {timeframeFilter === 'custom' && (
                      <div className="space-y-2 mt-2">
                        <div>
                          <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">Start Date</label>
                          <input
                            type="date"
                            value={startDate}
                            onChange={(e) => {
                              setStartDate(e.target.value);
                              setCurrentPage(1);
                            }}
                            className="w-full rounded-xl border border-slate-200 p-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/25 bg-white"
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">End Date</label>
                          <input
                            type="date"
                            value={endDate}
                            onChange={(e) => {
                              setEndDate(e.target.value);
                              setCurrentPage(1);
                            }}
                            className="w-full rounded-xl border border-slate-200 p-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/25 bg-white"
                          />
                        </div>
                      </div>
                    )}
                    <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                      <Button
                        variant="ghost"
                        onClick={() => {
                          setMethodFilter('all');
                          setStatusFilter('all');
                          setTimeframeFilter('all');
                          setStartDate('');
                          setEndDate('');
                          setFilterOpen(false);
                        }}
                        className="text-xs px-3 py-1.5 h-auto text-slate-500 hover:bg-slate-100 rounded-lg"
                      >
                        Reset
                      </Button>
                      <Button
                        onClick={() => setFilterOpen(false)}
                        className="text-xs px-3 py-1.5 h-auto bg-primary hover:bg-primary/90 text-white rounded-lg font-bold"
                      >
                        Close
                      </Button>
                    </div>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {transactions.length === 0 ? (
        <div className="text-center py-20 bg-surface-container-low rounded-xl border border-dashed border-border-subtle">
          <CreditCard className="w-12 h-12 text-muted-foreground/40 mx-auto mb-4" />
          <p className="text-muted-foreground font-bold">No transactions found</p>
        </div>
      ) : filteredTransactions.length === 0 ? (
        <div className="text-center py-16 bg-surface-container-low/50 rounded-xl border border-dashed border-border-subtle">
          <Search className="w-10 h-10 text-muted-foreground/40 mx-auto mb-3" />
          <p className="text-muted-foreground font-bold">No matching transactions found</p>
          <p className="text-muted-foreground/60 text-xs mt-1">Try refining your search terms</p>
        </div>
      ) : (
        <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-slate-50/85 text-slate-500 border-b border-slate-200">
                  <th className="px-6 py-5 text-[11px] font-black tracking-wider uppercase min-w-[220px]">Reference Code</th>
                  <th className="px-6 py-5 text-[11px] font-black tracking-wider uppercase">Transaction ID</th>
                  <th className="px-6 py-5 text-[11px] font-black tracking-wider uppercase text-center w-[120px]">Method</th>
                  <th className="px-6 py-5 text-[11px] font-black tracking-wider uppercase text-center w-[140px]">Status</th>
                  <th className="px-6 py-5 text-right text-[11px] font-black tracking-wider uppercase w-[150px]">Amount</th>
                  <th className="px-6 py-5 text-right text-[11px] font-black tracking-wider uppercase w-[180px]">Stamp</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {paginatedTransactions.map((tx) => {
                  const statusLower = String(tx.status || '').toLowerCase();
                  const isSuccess = ['paid', 'completed', 'success'].includes(statusLower);
                  const isFailed = ['failed', 'cancelled', 'overdue'].includes(statusLower);
                  const isRefundPending = ['refund_pending', 'refund pending', 'refund_initiated', 'refund initiated'].includes(statusLower);
                  const isRefundSuccess = ['refunded', 'refund_credited', 'refund credited', 'refund_completed', 'refund completed'].includes(statusLower);

                  return (
                    <tr key={tx.id} className="hover:bg-slate-50/50 transition-colors group">
                      <td className="px-6 py-5">
                        <div className={`text-xs font-black flex items-center gap-1.5 ${
                          isFailed ? 'text-slate-400' :
                          isRefundSuccess ? 'text-emerald-600' :
                          isRefundPending ? 'text-amber-600' :
                          isSuccess ? 'text-slate-900' : 'text-amber-600'
                        }`}>
                          {isFailed ? <XCircle className="w-3.5 h-3.5 text-rose-500 shrink-0" /> :
                           isRefundPending ? <ArrowDownLeft className="w-3.5 h-3.5 text-amber-500 shrink-0" /> :
                           isRefundSuccess ? <ArrowDownLeft className="w-3.5 h-3.5 text-emerald-500 shrink-0" /> :
                           isSuccess ? <ArrowUpRight className="w-3.5 h-3.5 text-rose-500 shrink-0" /> :
                           <Clock className="w-3.5 h-3.5 text-amber-500 shrink-0" />}
                          Order #{tx.order_number}
                        </div>
                      </td>
                      <td className="px-6 py-5">
                        <div className="text-xs font-mono font-bold text-slate-700 uppercase tracking-wider bg-slate-100 px-2 py-1.5 rounded inline-block whitespace-normal break-all">
                          {tx.transaction_id || 'INTERNAL_RECON'}
                        </div>
                      </td>
                      <td className="px-6 py-5 text-center">
                        <span className="px-2.5 py-0.5 rounded-full bg-slate-50 text-slate-650 border border-slate-200/60 text-[9px] font-black uppercase tracking-wider">
                          {String(tx.method || 'Gateway').toUpperCase()}
                        </span>
                      </td>
                      <td className="px-6 py-5 text-center">
                        <span className={`px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider ${
                          isSuccess ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' : 
                          isFailed ? 'bg-rose-50 text-rose-600 border border-rose-100' : 
                          isRefundSuccess ? 'bg-indigo-50 text-indigo-600 border border-indigo-100' :
                          'bg-amber-50 text-amber-600 border border-amber-100'
                        }`}>
                          {tx.status}
                        </span>
                      </td>
                      <td className="px-6 py-5 text-right">
                        <div className={`text-sm font-black ${
                          isFailed ? 'text-slate-400 line-through' :
                          isRefundSuccess ? 'text-emerald-600' :
                          isRefundPending ? 'text-amber-600' :
                          'text-slate-900'
                        }`}>
                          {isRefundSuccess ? '+' : ''}₹{Number(tx.amount || 0).toLocaleString('en-IN')}
                        </div>
                      </td>
                      <td className="px-6 py-5 text-right">
                        <div className="text-[10px] font-black text-slate-500 uppercase tracking-widest flex items-center justify-end gap-1.5">
                          <Calendar className="w-3 h-3" />
                          {tx.date ? new Date(tx.date).toLocaleDateString('en-IN', { 
                            day: '2-digit', 
                            month: 'short', 
                            year: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit'
                          }) : '—'}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <TablePagination
            currentPage={currentPage}
            totalPages={totalFilteredPages}
            onPageChange={setCurrentPage}
            totalItems={filteredTransactions.length}
            pageSize={PAGE_SIZE}
          />
        </div>
      )}
    </motion.div>
  );
};

export default TransactionsTab;
