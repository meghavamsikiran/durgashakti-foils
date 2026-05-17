import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { ShoppingBag, Clock, Package, Wallet } from 'lucide-react';
import { Button } from '../../../components/ui/button';
import TablePagination from '../../../components/ui/TablePagination';
import { useNavigate } from 'react-router-dom';

const OrdersTab = ({ orders, loading, onCancelOrder, onSelectOrder }) => {
  const navigate = useNavigate();
  const [ordersPage, setOrdersPage] = useState(1);
  const ORDERS_PER_PAGE = 5;

  const getStatusBadge = (status) => {
    const s = (status || 'pending').toLowerCase();
    const config = {
      pending: { bg: 'bg-blue-50 text-blue-600', label: 'Placed' },
      pending_payment: { bg: 'bg-rose-50 text-rose-600', label: 'Payment Pending' },
      processing: { bg: 'bg-indigo-50 text-indigo-600', label: 'Processing' },
      confirmed: { bg: 'bg-purple-50 text-purple-600', label: 'Confirmed' },
      packed: { bg: 'bg-cyan-50 text-cyan-600', label: 'Packed' },
      shipped: { bg: 'bg-violet-50 text-violet-600', label: 'Shipped' },
      delivered: { bg: 'bg-emerald-50 text-emerald-600', label: 'Delivered' },
      cancelled: { bg: 'bg-rose-50 text-rose-600', label: 'Cancelled' },
      return_requested: { bg: 'bg-orange-50 text-orange-600', label: 'Return Requested' },
      return_approved: { bg: 'bg-teal-50 text-teal-600', label: 'Return Approved' },
      return_rejected: { bg: 'bg-red-50 text-red-600', label: 'Return Rejected' },
      refunded: { bg: 'bg-slate-100 text-slate-600', label: 'Refunded' },
    };
    return config[s] || { bg: 'bg-slate-50 text-slate-600', label: s };
  };

  if (loading) return (
    <div className="flex flex-col items-center justify-center py-20">
      <div className="w-12 h-12 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mb-4"></div>
      <p className="text-slate-500 font-bold uppercase tracking-widest text-[10px]">Loading orders...</p>
    </div>
  );

  return (
    <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="space-y-8">
      <div className="flex items-center justify-between">
        <h2 className="text-3xl font-black text-slate-900 uppercase tracking-tighter">My Orders</h2>
        <ShoppingBag className="w-8 h-8 text-slate-100" />
      </div>
      
      {orders.length === 0 ? (
        <div className="text-center py-20 bg-slate-50 rounded-3xl border-2 border-dashed border-slate-200">
          <Clock className="w-12 h-12 text-slate-300 mx-auto mb-4" />
          <p className="text-slate-500 font-bold">No orders found yet</p>
          <Button onClick={() => navigate('/shop')} className="mt-6 rounded-xl">Start Shopping</Button>
        </div>
      ) : (
        <div className="space-y-4">
          {orders.slice((ordersPage - 1) * ORDERS_PER_PAGE, ordersPage * ORDERS_PER_PAGE).map((order) => {
            const badge = getStatusBadge(order.order_status);
            return (
              <div key={order.id} className="p-6 rounded-3xl border border-slate-200 hover:border-indigo-100 transition-all bg-white shadow-sm hover:shadow-md">
                <div className="flex flex-col md:flex-row gap-6">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-3">
                      <span className="text-xs font-black uppercase tracking-widest text-slate-500">Order #{order.order_number}</span>
                      <span className={`px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest ${badge.bg}`}>
                        {badge.label}
                      </span>
                    </div>
                  <h3 className="text-lg font-black text-slate-900 mb-1">
                    {(order.items || []).map(item => item.product_name).join(', ')}
                  </h3>
                  <p className="text-sm text-slate-500 font-medium">Placed on {order.created_at ? new Date(order.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' }) : 'N/A'}</p>
                </div>
                <div className="text-right">
                  <div className="text-2xl font-black text-slate-900 mb-4">₹{(order.total_amount || 0).toLocaleString()}</div>
                  <div className="flex items-center justify-end gap-2">
                    {['pending', 'pending_payment', 'processing'].includes(order.order_status) && (
                      <Button variant="ghost" onClick={() => onCancelOrder(order.id)} className="text-rose-500 hover:bg-rose-50 rounded-xl text-xs font-bold px-4">Cancel</Button>
                    )}
                    <Button onClick={() => onSelectOrder(order)} className="rounded-xl px-6 font-bold shadow-indigo-100 shadow-lg">View Details</Button>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
        </div>
      )}

      {orders.length > ORDERS_PER_PAGE && (
        <TablePagination
          currentPage={ordersPage}
          totalPages={Math.ceil(orders.length / ORDERS_PER_PAGE)}
          onPageChange={setOrdersPage}
          totalItems={orders.length}
          pageSize={ORDERS_PER_PAGE}
        />
      )}
    </motion.div>
  );
};

export default OrdersTab;
