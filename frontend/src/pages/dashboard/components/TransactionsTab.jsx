import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { CreditCard, ArrowUpRight, ArrowDownLeft, Search, Filter } from 'lucide-react';
import { Button } from '../../../components/ui/button';
import TablePagination from '../../../components/ui/TablePagination';

const TransactionsTab = ({ orders }) => {
  const [currentPage, setCurrentPage] = useState(1);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterOpen, setFilterOpen] = useState(false);
  const [methodFilter, setMethodFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [timeframeFilter, setTimeframeFilter] = useState('all');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const PAGE_SIZE = 10;

  const transactions = (orders || []).map((order) => ({
    id: order.id,
    transaction_id:
      order.transaction_id ||
      order.razorpay_payment_id ||
      order.razorpay_order_id ||
      (String(order.payment_method || '').toLowerCase() === 'cod' ? 'Cash on delivery' : order.id),
    order_number: order.order_number,
    amount: order.total_amount,
    date: order.created_at,
    method: order.payment_method || 'Razorpay',
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
      } else if (methodFilter === 'razorpay') {
        matchesMethod = methodStr.includes('razorpay') || methodStr.includes('card') || methodStr.includes('net') || methodStr.includes('upi') || methodStr.includes('online');
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

  return (
    <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl md:text-3xl font-black text-foreground uppercase tracking-tighter">Transaction History</h2>
        <CreditCard className="w-8 h-8 text-muted-foreground/30" />
      </div>

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
                      <select
                        value={methodFilter}
                        onChange={(e) => {
                          setMethodFilter(e.target.value);
                          setCurrentPage(1);
                        }}
                        className="w-full rounded-xl border border-slate-200 p-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/25"
                      >
                        <option value="all">All Methods</option>
                        <option value="cod">Cash On Delivery (COD)</option>
                        <option value="razorpay">Razorpay / Online</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-[10px] font-black uppercase tracking-widest text-slate-500 mb-1.5">Payment Status</label>
                      <select
                        value={statusFilter}
                        onChange={(e) => {
                          setStatusFilter(e.target.value);
                          setCurrentPage(1);
                        }}
                        className="w-full rounded-xl border border-slate-200 p-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/25"
                      >
                        <option value="all">All Statuses</option>
                        <option value="paid">Paid / Completed</option>
                        <option value="pending">Pending</option>
                        <option value="failed">Failed / Refunded</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-[10px] font-black uppercase tracking-widest text-slate-500 mb-1.5">Timeframe</label>
                      <select
                        value={timeframeFilter}
                        onChange={(e) => {
                          setTimeframeFilter(e.target.value);
                          setCurrentPage(1);
                        }}
                        className="w-full rounded-xl border border-slate-200 p-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/25"
                      >
                        <option value="all">All Time</option>
                        <option value="today">Today</option>
                        <option value="this_month">This Month</option>
                        <option value="last_month">Last Month</option>
                        <option value="custom">Date Range</option>
                      </select>
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
        <div className="bg-surface-container-lowest rounded-xl border border-border-subtle shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-slate-50/80 text-slate-500 border-b border-border-subtle/50">
                  <th className="px-5 py-3.5 text-[11px] font-bold tracking-wider uppercase min-w-[300px]">Transaction</th>
                  <th className="px-5 py-3.5 text-[11px] font-bold tracking-wider uppercase">Date</th>
                  <th className="px-5 py-3.5 text-[11px] font-bold tracking-wider uppercase">Method</th>
                  <th className="px-5 py-3.5 text-[11px] font-bold tracking-wider uppercase">Status</th>
                  <th className="px-5 py-3.5 text-right text-[11px] font-bold tracking-wider uppercase">Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border-subtle">
                {paginatedTransactions.map((tx) => (
                  <tr key={tx.id} className="hover:bg-surface-container-low transition-colors group">
                    <td className="px-5 py-5">
                      <div className="flex items-center gap-3">
                        <div className={`w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 ${tx.type === 'debit' ? 'bg-primary/10 text-primary' : 'bg-emerald-50 text-emerald-600'}`}>
                          {tx.type === 'debit' ? <ArrowUpRight className="w-5 h-5" /> : <ArrowDownLeft className="w-5 h-5" />}
                        </div>
                        <div className="min-w-0">
                          <p className="font-bold text-foreground text-sm font-mono">Order #{tx.order_number}</p>
                          <p className="text-[10px] font-mono text-muted-foreground uppercase break-all leading-relaxed">
                            TXN ID: {tx.transaction_id}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-5 text-sm font-mono text-muted-foreground whitespace-nowrap">
                      {new Date(tx.date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                    </td>
                    <td className="px-5 py-5 text-sm font-bold text-foreground uppercase tracking-tight whitespace-nowrap">{tx.method}</td>
                    <td className="px-5 py-5">
                      <span className={`px-2.5 py-1 rounded-sm text-[10px] font-mono tracking-wider font-semibold ${['completed', 'paid'].includes(tx.status?.toLowerCase()) ? 'bg-emerald-50 text-emerald-600' : 'bg-amber-50 text-amber-600'}`}>
                        {tx.status}
                      </span>
                    </td>
                    <td className="px-5 py-5 text-right whitespace-nowrap">
                      <span className="text-lg font-black text-foreground font-mono">&#8377;{Number(tx.amount || 0).toLocaleString()}</span>
                    </td>
                  </tr>
                ))}
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
