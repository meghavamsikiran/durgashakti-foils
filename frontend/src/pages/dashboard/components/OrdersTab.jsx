import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { ShoppingBag, Clock, Package, Wallet, Search } from 'lucide-react';
import { Button } from '../../../components/ui/button';
import TablePagination from '../../../components/ui/TablePagination';
import { useNavigate } from 'react-router-dom';
import PageLoader from '../../../components/ui/PageLoader';

const OrdersTab = ({ orders, loading, onCancelOrder, onSelectOrder }) => {
  const navigate = useNavigate();
  const [ordersPage, setOrdersPage] = useState(1);
  const [searchQuery, setSearchQuery] = useState('');
  const ORDERS_PER_PAGE = 5;

  const getStatusBadge = (status) => {
    const s = (status || 'pending').toLowerCase();
    const config = {
      pending: { bg: 'bg-blue-50 text-blue-600', label: 'Placed' },
      pending_payment: { bg: 'bg-rose-50 text-rose-600', label: 'Payment Pending' },
      processing: { bg: 'bg-indigo-50 text-indigo-600', label: 'Processing' },
      confirmed: { bg: 'bg-purple-50 text-purple-600', label: 'Confirmed' },
      packaging: { bg: 'bg-cyan-50 text-cyan-600', label: 'Packaging' },
      packed: { bg: 'bg-cyan-50 text-cyan-600', label: 'Packaging' },
      shipped: { bg: 'bg-violet-50 text-violet-600', label: 'Shipped' },
      out_for_delivery: { bg: 'bg-amber-50 text-amber-600', label: 'Out For Delivery' },
      delivered: { bg: 'bg-emerald-50 text-emerald-600', label: 'Delivered' },
      failed: { bg: 'bg-rose-50 text-rose-600', label: 'Failed' },
      cancelled: { bg: 'bg-rose-50 text-rose-600', label: 'Cancelled' },
      return_requested: { bg: 'bg-orange-50 text-orange-600', label: 'Return Requested' },
      return_approved: { bg: 'bg-teal-50 text-teal-600', label: 'Return Approved' },
      return_rejected: { bg: 'bg-red-50 text-red-600', label: 'Return Rejected' },
      refunded: { bg: 'bg-slate-100 text-slate-600', label: 'Refunded' },
    };
    return config[s] || { bg: 'bg-slate-50 text-slate-600', label: s };
  };

  const filteredOrders = orders.filter(order => {
    const query = searchQuery.toLowerCase().trim();
    if (!query) return true;
    
    // Search order number
    const matchesOrderNumber = (order.order_number || '').toLowerCase().includes(query);
    
    // Search product names
    const matchesProducts = (order.items || []).some(item => 
      (item.product_name || '').toLowerCase().includes(query)
    );
    
    // Search status
    const badge = getStatusBadge(order.order_status);
    const matchesStatus = (badge.label || '').toLowerCase().includes(query) || (order.order_status || '').toLowerCase().includes(query);
    
    return matchesOrderNumber || matchesProducts || matchesStatus;
  });

  if (loading) return <PageLoader message="Loading orders..." />;

  return (
    <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-3xl font-black text-slate-900 uppercase tracking-tighter">My Orders</h2>
        <ShoppingBag className="w-8 h-8 text-slate-100" />
      </div>

      {orders.length > 0 && (
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
          <input
            type="text"
            placeholder="Search by order number, product name, or status..."
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setOrdersPage(1);
            }}
            className="w-full pl-12 pr-4 py-3.5 rounded-2xl border border-slate-200 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 outline-none transition-all text-sm font-medium text-slate-900 placeholder:text-slate-400 shadow-sm"
          />
        </div>
      )}
      
      {orders.length === 0 ? (
        <div className="text-center py-20 bg-slate-50 rounded-3xl border-2 border-dashed border-slate-200">
          <Clock className="w-12 h-12 text-slate-300 mx-auto mb-4" />
          <p className="text-slate-500 font-bold">No orders found yet</p>
          <Button onClick={() => navigate('/shop')} className="mt-6 rounded-xl">Start Shopping</Button>
        </div>
      ) : filteredOrders.length === 0 ? (
        <div className="text-center py-16 bg-slate-50/50 rounded-3xl border border-dashed border-slate-200">
          <Search className="w-10 h-10 text-slate-300 mx-auto mb-3" />
          <p className="text-slate-500 font-bold">No matching orders found</p>
          <p className="text-slate-400 text-xs mt-1">Try refining your search terms</p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredOrders.slice((ordersPage - 1) * ORDERS_PER_PAGE, ordersPage * ORDERS_PER_PAGE).map((order) => {
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
                  <div className="text-left md:text-right flex-shrink-0">
                    <div className="text-2xl font-black text-slate-900 mb-4">₹{(order.total_amount || 0).toLocaleString()}</div>
                    <div className="flex items-center justify-start md:justify-end gap-2">
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

      {filteredOrders.length > ORDERS_PER_PAGE && (
        <TablePagination
          currentPage={ordersPage}
          totalPages={Math.ceil(filteredOrders.length / ORDERS_PER_PAGE)}
          onPageChange={setOrdersPage}
          totalItems={filteredOrders.length}
          pageSize={ORDERS_PER_PAGE}
        />
      )}
    </motion.div>
  );
};

export default OrdersTab;
