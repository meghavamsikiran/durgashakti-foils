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
      <h2 className="text-3xl font-black text-slate-900 uppercase tracking-tighter">Transaction History</h2>
      
      {transactions.length === 0 ? (
        <div className="text-center py-20 bg-slate-50 rounded-[2.5rem]">
          <CreditCard className="w-12 h-12 text-slate-300 mx-auto mb-4" />
          <p className="text-slate-500 font-bold">No transactions found</p>
        </div>
      ) : (
        <div className="bg-white rounded-[2.5rem] border border-slate-200 shadow-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-slate-900 text-white">
                  <th className="px-8 py-6 text-[10px] font-black uppercase tracking-[0.2em]">Transaction</th>
                  <th className="px-8 py-6 text-[10px] font-black uppercase tracking-[0.2em]">Date</th>
                  <th className="px-8 py-6 text-[10px] font-black uppercase tracking-[0.2em]">Method</th>
                  <th className="px-8 py-6 text-[10px] font-black uppercase tracking-[0.2em]">Status</th>
                  <th className="px-8 py-6 text-right text-[10px] font-black uppercase tracking-[0.2em]">Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {transactions.map((tx) => (
                  <tr key={tx.id} className="hover:bg-slate-50 transition-colors group">
                    <td className="px-8 py-6">
                      <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${tx.type === 'debit' ? 'bg-indigo-50 text-indigo-600' : 'bg-emerald-50 text-emerald-600'}`}>
                          {tx.type === 'debit' ? <ArrowUpRight className="w-5 h-5" /> : <ArrowDownLeft className="w-5 h-5" />}
                        </div>
                        <div>
                          <p className="font-black text-slate-900 text-sm">Order #{tx.order_number}</p>
                          <p className="text-[10px] font-bold text-slate-500 uppercase">TXN ID: {tx.id.slice(0, 8)}...</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-8 py-6 text-sm font-bold text-slate-600">
                      {new Date(tx.date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                    </td>
                    <td className="px-8 py-6 text-sm font-black text-slate-900 uppercase tracking-tight">{tx.method}</td>
                    <td className="px-8 py-6">
                      <span className={`px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest ${tx.status === 'completed' ? 'bg-emerald-50 text-emerald-600' : 'bg-amber-50 text-amber-600'}`}>
                        {tx.status}
                      </span>
                    </td>
                    <td className="px-8 py-6 text-right">
                      <span className="text-lg font-black text-slate-900">₹{tx.amount.toLocaleString()}</span>
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
