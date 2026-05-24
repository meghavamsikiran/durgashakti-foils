import React from 'react';
import { motion } from 'framer-motion';
import { CreditCard, ArrowUpRight, ArrowDownLeft } from 'lucide-react';

const TransactionsTab = ({ orders }) => {
  const transactions = orders.map(order => ({
    id: order.id,
    order_number: order.order_number,
    amount: order.total_amount,
    date: order.created_at,
    method: order.payment_method || 'Razorpay',
    status: order.payment_status,
    type: 'debit'
  }));

  return (
    <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="space-y-8">
      <h2 className="text-3xl font-black text-foreground uppercase tracking-tighter">Transaction History</h2>
      
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
                  <th className="px-8 py-6 text-[10px] font-mono tracking-wider font-semibold uppercase">Transaction</th>
                  <th className="px-8 py-6 text-[10px] font-mono tracking-wider font-semibold uppercase">Date</th>
                  <th className="px-8 py-6 text-[10px] font-mono tracking-wider font-semibold uppercase">Method</th>
                  <th className="px-8 py-6 text-[10px] font-mono tracking-wider font-semibold uppercase">Status</th>
                  <th className="px-8 py-6 text-right text-[10px] font-mono tracking-wider font-semibold uppercase">Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border-subtle">
                {transactions.map((tx) => (
                  <tr key={tx.id} className="hover:bg-surface-container-low transition-colors group">
                    <td className="px-8 py-6">
                      <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${tx.type === 'debit' ? 'bg-primary/10 text-primary' : 'bg-emerald-50 text-emerald-600'}`}>
                          {tx.type === 'debit' ? <ArrowUpRight className="w-5 h-5" /> : <ArrowDownLeft className="w-5 h-5" />}
                        </div>
                        <div>
                          <p className="font-bold text-foreground text-sm font-mono">Order #{tx.order_number}</p>
                          <p className="text-[10px] font-mono text-muted-foreground uppercase">TXN ID: {tx.id.slice(0, 8)}...</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-8 py-6 text-sm font-mono text-muted-foreground">
                      {new Date(tx.date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                    </td>
                    <td className="px-8 py-6 text-sm font-bold text-foreground uppercase tracking-tight">{tx.method}</td>
                    <td className="px-8 py-6">
                      <span className={`px-2.5 py-1 rounded-sm text-[10px] font-mono tracking-wider font-semibold ${['completed', 'paid'].includes(tx.status?.toLowerCase()) ? 'bg-primary/10 text-primary' : 'bg-amber-50 text-amber-600'}`}>
                        {tx.status}
                      </span>
                    </td>
                    <td className="px-8 py-6 text-right">
                      <span className="text-lg font-black text-foreground font-mono">₹{tx.amount.toLocaleString()}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </motion.div>
  );
};

export default TransactionsTab;
