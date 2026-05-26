import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { CreditCard, ArrowUpRight, ArrowDownLeft } from 'lucide-react';
import TablePagination from '../../../components/ui/TablePagination';

const TransactionsTab = ({ orders }) => {
  const [currentPage, setCurrentPage] = useState(1);
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

  const totalFilteredPages = Math.ceil(transactions.length / PAGE_SIZE);
  const paginatedTransactions = transactions.slice(
    (currentPage - 1) * PAGE_SIZE,
    currentPage * PAGE_SIZE
  );

  return (
    <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="space-y-6">
      <h2 className="text-2xl md:text-3xl font-black text-foreground uppercase tracking-tighter">Transaction History</h2>

      {transactions.length === 0 ? (
        <div className="text-center py-20 bg-surface-container-low rounded-xl border border-dashed border-border-subtle">
          <CreditCard className="w-12 h-12 text-muted-foreground/40 mx-auto mb-4" />
          <p className="text-muted-foreground font-bold">No transactions found</p>
        </div>
      ) : (
        <div className="bg-surface-container-lowest rounded-xl border border-border-subtle shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-[#0B1220] text-slate-200 border-b border-border-subtle/10">
                  <th className="px-5 py-4 text-[10px] font-mono tracking-wider font-semibold uppercase min-w-[300px]">Transaction</th>
                  <th className="px-5 py-4 text-[10px] font-mono tracking-wider font-semibold uppercase">Date</th>
                  <th className="px-5 py-4 text-[10px] font-mono tracking-wider font-semibold uppercase">Method</th>
                  <th className="px-5 py-4 text-[10px] font-mono tracking-wider font-semibold uppercase">Status</th>
                  <th className="px-5 py-4 text-right text-[10px] font-mono tracking-wider font-semibold uppercase">Amount</th>
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
                      <span className={`px-2.5 py-1 rounded-sm text-[10px] font-mono tracking-wider font-semibold ${['completed', 'paid'].includes(tx.status?.toLowerCase()) ? 'bg-primary/10 text-primary' : 'bg-amber-50 text-amber-600'}`}>
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
            totalItems={transactions.length}
            pageSize={PAGE_SIZE}
          />
        </div>
      )}
    </motion.div>
  );
};

export default TransactionsTab;
