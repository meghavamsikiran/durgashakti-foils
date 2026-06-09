import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { 
  CreditCard, ArrowUpRight, ArrowDownLeft, Search, Filter, 
  ChevronDown, Calendar, XCircle, Clock, IndianRupee, CheckCircle2, AlertCircle, Copy
} from 'lucide-react';
import { toast } from 'sonner';
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
    <div className="relative w-full text-white" ref={containerRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between rounded-xl border border-[#26322B] p-2.5 text-sm bg-[#131B17] text-left focus:outline-none focus:ring-1 focus:ring-[#25D958]/30 font-semibold transition-all shadow-sm"
      >
        <span className="truncate">{selectedOption?.label}</span>
        <ChevronDown className={`w-4 h-4 text-slate-400 shrink-0 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>
      {isOpen && (
        <div className="absolute left-0 right-0 mt-1.5 max-h-48 overflow-y-auto rounded-xl border border-[#26322B] bg-[#19231F] shadow-xl z-50 py-1.5 animate-in fade-in slide-in-from-top-1 duration-150">
          {options.map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() => {
                onChange(option.value);
                setIsOpen(false);
              }}
              className={`w-full text-left px-3.5 py-2 text-sm font-semibold transition-colors hover:bg-[#131B17] ${
                option.value === value ? 'text-[#25D958] bg-[#25D958]/10 font-bold' : 'text-slate-350'
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
  const handleCopy = (text, type) => {
    navigator.clipboard.writeText(text);
    toast.success(`${type} copied to clipboard!`);
  };
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
      <div className="flex flex-col items-center justify-center min-h-[350px] bg-[#19231F] rounded-3xl border border-[#26322B] shadow-sm p-8">
        <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-[#25D958] mb-3"></div>
        <p className="text-xs text-slate-400 font-medium">Securing transaction ledger...</p>
      </div>
    );
  }

  if (error && (!orders || orders.length === 0)) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[350px] bg-[#19231F] rounded-3xl border border-[#26322B] shadow-sm p-8 text-center text-white">
        <AlertCircle className="w-12 h-12 text-rose-500 mb-3 shrink-0" />
        <p className="text-sm font-bold text-slate-300">{error}</p>
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
      .filter(tx => ['paid', 'completed', 'success', 'delivered'].includes(String(tx.status || '').toLowerCase()))
      .reduce((sum, tx) => sum + Number(tx.amount || 0), 0),
    pendingAmount: transactions
      .filter(tx => ['pending', 'unpaid', 'processing', 'pending_payment'].includes(String(tx.status || '').toLowerCase()))
      .reduce((sum, tx) => sum + Number(tx.amount || 0), 0),
    successCount: transactions
      .filter(tx => ['paid', 'completed', 'success', 'delivered'].includes(String(tx.status || '').toLowerCase()))
      .length,
    refundedAmount: transactions
      .filter(tx => ['refunded', 'refund initiated', 'refund_initiated', 'refund credited', 'refund_credited', 'failed'].includes(String(tx.status || '').toLowerCase()))
      .reduce((sum, tx) => sum + Number(tx.amount || 0), 0),
  };

  return (
    <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="space-y-4 text-white">
      {/* Search & Stats Control Center */}
      {transactions.length > 0 && (
        <div className="bg-[#19231F] p-5 rounded-2xl border border-[#26322B] shadow-sm space-y-4">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            {/* Quick Stats Pills inline */}
            <div className="flex flex-wrap items-center gap-2 text-xs font-semibold text-slate-400">
              <div className="bg-[#131B17] border border-[#26322B]/65 px-3.5 py-1.5 rounded-lg shrink-0">
                <span>Spent: <span className="font-bold text-white">₹{stats.totalSpent.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span></span>
              </div>
              <div className="bg-[#131B17] border border-[#26322B]/65 px-3.5 py-1.5 rounded-lg shrink-0">
                <span>Pending: <span className="font-bold text-white">₹{stats.pendingAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span></span>
              </div>
              <div className="bg-[#131B17] border border-[#26322B]/65 px-3.5 py-1.5 rounded-lg shrink-0">
                <span>Done: <span className="font-bold text-[#25D958]">{stats.successCount}</span></span>
              </div>
              <div className="bg-[#131B17] border border-[#26322B]/65 px-3.5 py-1.5 rounded-lg shrink-0">
                <span>Refunds/Failed: <span className="font-bold text-white">₹{stats.refundedAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span></span>
              </div>
            </div>

            {/* Search Box & Filter Row */}
            <div className="flex gap-2.5 flex-1 max-w-md w-full">
              <div className="relative flex-1">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-450" />
                <input
                  type="text"
                  placeholder="Search by order # or TXN ID..."
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="w-full pl-10 pr-4 h-[40px] rounded-xl border border-[#26322B] focus:border-[#25D958] focus:ring-0 outline-none transition-all text-sm text-white bg-[#131B17]"
                />
              </div>
              <button
                type="button"
                onClick={() => setFilterOpen((prev) => !prev)}
                className={`inline-flex items-center justify-center w-[40px] h-[40px] rounded-xl border shadow-sm transition-colors shrink-0 ${
                  filterOpen || methodFilter !== 'all' || statusFilter !== 'all' || timeframeFilter !== 'all' || startDate !== '' || endDate !== ''
                    ? 'border-[#25D958] bg-[#25D958]/10 text-[#25D958]'
                    : 'border-[#26322B] bg-[#131B17] text-slate-400 hover:text-white'
                }`}
                title="Advanced Filters"
              >
                <Filter className="w-4 h-4" />
              </button>
            </div>
          </div>
          {filterOpen && (
              <>
                <div className="fixed inset-0 bg-black/40 z-40 xl:hidden" onClick={() => setFilterOpen(false)} />
                <div className="fixed inset-x-4 top-1/2 -translate-y-1/2 xl:absolute xl:translate-y-0 xl:inset-auto xl:right-0 xl:mt-2 w-auto xl:w-72 bg-[#19231F] border border-[#26322B] rounded-2xl shadow-2xl p-4 z-50 animate-in fade-in zoom-in-95 duration-200">
                  <div className="space-y-4 text-white">
                    <h3 className="text-sm font-black font-serif">Transaction Filters</h3>
                    <div>
                      <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1.5">Payment Method</label>
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
                      <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1.5">Payment Status</label>
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
                      <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1.5">Timeframe</label>
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
                            className="w-full rounded-xl border border-[#26322B] p-2 text-sm bg-[#131B17] text-white focus:outline-none"
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
                            className="w-full rounded-xl border border-[#26322B] p-2 text-sm bg-[#131B17] text-white focus:outline-none"
                          />
                        </div>
                      </div>
                    )}
                    <div className="flex justify-end gap-2 pt-2 border-t border-[#26322B]/60">
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
                        className="text-xs px-3 py-1.5 h-auto text-slate-400 hover:bg-white/5 hover:text-white rounded-lg"
                      >
                        Reset
                      </Button>
                      <Button
                        onClick={() => setFilterOpen(false)}
                        className="text-xs px-3 py-1.5 h-auto bg-[#25D958] hover:bg-[#1bb847] text-[#0C1310] rounded-lg font-bold"
                      >
                        Close
                      </Button>
                    </div>
                  </div>
                </div>
              </>
            )}
        </div>
      )}

      {transactions.length === 0 ? (
        <div className="text-center py-20 bg-[#19231F] rounded-xl border border-dashed border-[#26322B] text-slate-350">
          <CreditCard className="w-12 h-12 text-slate-500 mx-auto mb-4" />
          <p className="text-slate-300 font-bold">No transactions found</p>
        </div>
      ) : filteredTransactions.length === 0 ? (
        <div className="text-center py-16 bg-[#19231F] rounded-xl border border-dashed border-[#26322B] text-slate-355">
          <Search className="w-10 h-10 text-slate-550 mx-auto mb-3" />
          <p className="text-slate-300 font-bold">No matching transactions found</p>
          <p className="text-slate-500 text-xs mt-1">Try refining your search terms</p>
        </div>
      ) : (
        <div className="bg-[#19231F] rounded-3xl border border-[#26322B] shadow-sm overflow-hidden">
          <div className="overflow-x-auto overflow-y-auto customer-table-container">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-[#131B17] text-slate-400 border-b border-[#26322B]">
                  <th className="px-6 py-5 text-[11px] font-black tracking-wider uppercase min-w-[220px]">Reference Code</th>
                  <th className="px-6 py-5 text-[11px] font-black tracking-wider uppercase">Transaction ID</th>
                  <th className="px-6 py-5 text-[11px] font-black tracking-wider uppercase text-center w-[120px]">Method</th>
                  <th className="px-6 py-5 text-[11px] font-black tracking-wider uppercase text-center w-[140px]">Status</th>
                  <th className="px-6 py-5 text-right text-[11px] font-black tracking-wider uppercase w-[150px]">Amount</th>
                  <th className="px-6 py-5 text-right text-[11px] font-black tracking-wider uppercase w-[180px]">Stamp</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#26322B]/40">
                {paginatedTransactions.map((tx) => {
                  const statusLower = String(tx.status || '').toLowerCase();
                  const isSuccess = ['paid', 'completed', 'success'].includes(statusLower);
                  const isFailed = ['failed', 'cancelled', 'overdue'].includes(statusLower);
                  const isRefundPending = ['refund_pending', 'refund pending', 'refund_initiated', 'refund initiated'].includes(statusLower);
                  const isRefundSuccess = ['refunded', 'refund_credited', 'refund credited', 'refund_completed', 'refund completed'].includes(statusLower);

                  return (
                    <tr key={tx.id} className="hover:bg-[#131B17]/35 transition-colors group">
                      <td className="px-6 py-5">
                        <div className="flex items-center gap-2">
                          <div className={`text-xs font-bold flex items-center gap-1.5 ${
                            isFailed ? 'text-slate-500 line-through' :
                            isRefundSuccess ? 'text-[#25D958]' :
                            isRefundPending ? 'text-[#fedb41]' :
                            isSuccess ? 'text-white' : 'text-[#fedb41]'
                          }`}>
                            {isFailed ? <XCircle className="w-3.5 h-3.5 text-rose-500 shrink-0" /> :
                             isRefundPending ? <ArrowDownLeft className="w-3.5 h-3.5 text-[#fedb41] shrink-0" /> :
                             isRefundSuccess ? <ArrowDownLeft className="w-3.5 h-3.5 text-[#25D958] shrink-0" /> :
                             isSuccess ? <ArrowUpRight className="w-3.5 h-3.5 text-[#25D958] shrink-0" /> :
                             <Clock className="w-3.5 h-3.5 text-[#fedb41] shrink-0" />}
                            Order #{tx.order_number}
                          </div>
                          {tx.order_number && (
                            <button
                              type="button"
                              onClick={() => handleCopy(tx.order_number, 'Order number')}
                              className="text-slate-400 hover:text-white p-1 rounded transition-colors shrink-0"
                              title="Copy Order Number"
                            >
                              <Copy className="w-3 h-3" />
                            </button>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-5">
                        <div className="flex items-center gap-2 max-w-[200px]">
                          <div className="text-xs font-mono font-bold text-slate-300 uppercase tracking-wider bg-[#131B17] border border-[#26322B]/60 px-2 py-1.5 rounded inline-block whitespace-normal break-all">
                            {tx.transaction_id || 'INTERNAL_RECON'}
                          </div>
                          {tx.transaction_id && tx.transaction_id !== 'Cash on Delivery' && (
                            <button
                              type="button"
                              onClick={() => handleCopy(tx.transaction_id, 'Transaction ID')}
                              className="text-slate-400 hover:text-white p-1 rounded transition-colors shrink-0"
                              title="Copy Transaction ID"
                            >
                              <Copy className="w-3 h-3" />
                            </button>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-5 text-center">
                        <span className="px-2.5 py-0.5 rounded-full bg-[#131B17] text-slate-300 border border-[#26322B] text-[9px] font-black uppercase tracking-wider">
                          {String(tx.method || 'Gateway').toUpperCase()}
                        </span>
                      </td>
                      <td className="px-6 py-5 text-center">
                        <span className={`px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider ${
                          isSuccess ? 'bg-[#25D958]/10 text-[#25D958] border border-[#25D958]/20' : 
                          isFailed ? 'bg-rose-500/10 text-rose-450 border border-rose-500/20' : 
                          isRefundSuccess ? 'bg-purple-500/10 text-purple-400 border border-purple-500/20' :
                          'bg-amber-500/10 text-[#fedb41] border border-amber-500/20'
                        }`}>
                          {tx.status}
                        </span>
                      </td>
                      <td className="px-6 py-5 text-right">
                        <div className={`text-sm font-bold font-mono ${
                          isFailed ? 'text-slate-500 line-through' :
                          isRefundSuccess ? 'text-[#25D958]' :
                          isRefundPending ? 'text-[#fedb41]' :
                          'text-white'
                        }`}>
                          {isRefundSuccess ? '+' : ''}₹{Number(tx.amount || 0).toLocaleString('en-IN')}
                        </div>
                      </td>
                      <td className="px-6 py-5 text-right">
                        <div className="text-[10px] font-black text-slate-450 uppercase tracking-widest flex items-center justify-end gap-1.5">
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
            variant="dark"
          />
        </div>
      )}
    </motion.div>
  );
};

export default TransactionsTab;
