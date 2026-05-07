import React, { useEffect, useState, useCallback } from 'react';
import { toast } from 'sonner';
import adminApi from '../services/adminApi';
import { 
  ShoppingBag, Clock, CheckCircle2, Truck, AlertCircle, 
  Search, Filter, ChevronRight, XCircle, RefreshCcw, 
  IndianRupee, Calendar, MoreHorizontal, Eye, PackageCheck,
  MapPin, Phone as PhoneIcon, ChevronDown, ChevronUp
} from 'lucide-react';
import { Button } from '../../components/ui/button';

const STATUS_FLOW = {
  PENDING: ['CONFIRMED', 'CANCELLED'],
  PROCESSING: ['CONFIRMED', 'CANCELLED'],
  PLACED: ['CONFIRMED', 'CANCELLED'],
  CONFIRMED: ['PACKED', 'CANCELLED'],
  PACKED: ['SHIPPED', 'CANCELLED'],
  SHIPPED: ['DELIVERED'],
  DELIVERED: [],
  CANCELLED: [],
  RETURN_REQUESTED: ['RETURN_APPROVED', 'RETURN_REJECTED'],
  RETURN_APPROVED: ['REFUNDED'],
  RETURN_REJECTED: [],
  REFUNDED: [],
};

const statusConfigs = {
  PENDING: { color: 'text-amber-600', bg: 'bg-amber-50', icon: Clock },
  PLACED: { color: 'text-blue-600', bg: 'bg-blue-50', icon: ShoppingBag },
  CONFIRMED: { color: 'text-indigo-600', bg: 'bg-indigo-50', icon: CheckCircle2 },
  PACKED: { color: 'text-violet-600', bg: 'bg-violet-50', icon: PackageCheck },
  SHIPPED: { color: 'text-sky-600', bg: 'bg-sky-50', icon: Truck },
  DELIVERED: { color: 'text-emerald-600', bg: 'bg-emerald-50', icon: CheckCircle2 },
  CANCELLED: { color: 'text-rose-600', bg: 'bg-rose-50', icon: XCircle },
  RETURN_REQUESTED: { color: 'text-orange-600', bg: 'bg-orange-50', icon: RefreshCcw },
  RETURN_APPROVED: { color: 'text-teal-600', bg: 'bg-teal-50', icon: CheckCircle2 },
  RETURN_REJECTED: { color: 'text-rose-600', bg: 'bg-rose-50', icon: AlertCircle },
  REFUNDED: { color: 'text-slate-600', bg: 'bg-slate-50', icon: IndianRupee },
};

const OrdersPage = () => {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('ALL');
  const [search, setSearch] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [total, setTotal] = useState(0);
  const [messageModal, setMessageModal] = useState(null);
  const [adminMessage, setAdminMessage] = useState('');
  const [expandedOrderId, setExpandedOrderId] = useState(null);

  const load = useCallback(async () => {
    try {
      setLoading(false); // Immediate visual feedback
      const response = await adminApi.getOrders({ page: 1, limit: 100 });
      setRows(response.data.items || []);
      setTotal(response.data.total || 0);
    } catch (err) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const updateStatus = async (orderId, newStatus, message = '') => {
    try {
      setSubmitting(true);
      await adminApi.updateOrderStatus(orderId, { status: newStatus, admin_message: message });
      toast.success(`Order status updated to ${newStatus.toLowerCase().replace('_', ' ')}`);
      setMessageModal(null);
      setAdminMessage('');
      load();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const filtered = rows.filter(r => {
    const status = (r.status || r.order_status || '').toUpperCase();
    if (filter !== 'ALL' && status !== filter) return false;
    if (search && !r.order_number?.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const getStats = () => ({
    total: rows.length,
    pending: rows.filter(r => (r.status || '').toUpperCase() === 'PENDING').length,
    confirmed: rows.filter(r => (r.status || '').toUpperCase() === 'CONFIRMED').length,
    returns: rows.filter(r => (r.status || '').toUpperCase().startsWith('RETURN')).length,
    delivered: rows.filter(r => (r.status || '').toUpperCase() === 'DELIVERED').length,
  });

  const stats = getStats();

  return (
    <div className="space-y-8 animate-in fade-in duration-700">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 pb-6 border-b border-slate-100">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-slate-900 flex items-center gap-3">
            <ShoppingBag className="w-8 h-8 text-indigo-600" />
            Orders
          </h1>
          <p className="text-slate-500 mt-1 font-medium">View and manage customer orders.</p>
        </div>
        
        <div className="flex items-center gap-3">
          <div className="relative group">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input 
              type="text"
              placeholder="Order Number..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10 pr-4 py-2 bg-white border border-slate-200 rounded-xl text-sm shadow-sm focus:ring-2 focus:ring-indigo-500/20 outline-none w-64"
            />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 bg-indigo-50 text-indigo-600 rounded-xl flex items-center justify-center">
            <ShoppingBag className="w-6 h-6" />
          </div>
          <div>
            <div className="text-[10px] font-black uppercase tracking-widest text-slate-400">Total Orders</div>
            <div className="text-2xl font-black text-slate-900">{stats.total}</div>
          </div>
        </div>
        <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 bg-amber-50 text-amber-600 rounded-xl flex items-center justify-center">
            <Clock className="w-6 h-6" />
          </div>
          <div>
            <div className="text-[10px] font-black uppercase tracking-widest text-slate-400">Pending</div>
            <div className="text-2xl font-black text-slate-900">{stats.pending}</div>
          </div>
        </div>
        <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 bg-emerald-50 text-emerald-600 rounded-xl flex items-center justify-center">
            <Truck className="w-6 h-6" />
          </div>
          <div>
            <div className="text-[10px] font-black uppercase tracking-widest text-slate-400">Delivered</div>
            <div className="text-2xl font-black text-slate-900">{stats.delivered}</div>
          </div>
        </div>
        <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 bg-rose-50 text-rose-600 rounded-xl flex items-center justify-center">
            <RefreshCcw className="w-6 h-6" />
          </div>
          <div>
            <div className="text-[10px] font-black uppercase tracking-widest text-slate-400">Returns</div>
            <div className="text-2xl font-black text-slate-900">{stats.returns}</div>
          </div>
        </div>
      </div>

      <div className="bg-slate-50 p-1 rounded-2xl flex flex-wrap items-center gap-1 border border-slate-100">
        {['ALL', 'PENDING', 'CONFIRMED', 'SHIPPED', 'DELIVERED', 'CANCELLED', 'RETURN_REQUESTED'].map((s) => (
          <button
            key={s}
            onClick={() => setFilter(s)}
            className={`px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-tighter transition-all ${
              filter === s 
                ? 'bg-white text-indigo-600 shadow-sm ring-1 ring-slate-200' 
                : 'text-slate-500 hover:text-slate-900 hover:bg-slate-100/50'
            }`}
          >
            {s.replace('_', ' ')}
          </button>
        ))}
      </div>

      <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full">
            <thead className="bg-slate-50/50 border-b border-slate-100">
              <tr>
                <th className="px-8 py-5 text-left text-[11px] font-black text-slate-400 uppercase tracking-wider">Order ID</th>
                <th className="px-8 py-5 text-left text-[11px] font-black text-slate-400 uppercase tracking-wider">Customer</th>
                <th className="px-8 py-5 text-center text-[11px] font-black text-slate-400 uppercase tracking-wider">Status</th>
                <th className="px-8 py-5 text-right text-[11px] font-black text-slate-400 uppercase tracking-wider">Amount</th>
                <th className="px-8 py-5 text-center text-[11px] font-black text-slate-400 uppercase tracking-wider">Actions</th>
                <th className="px-8 py-5 text-center text-[11px] font-black text-slate-400 uppercase tracking-wider">Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {filtered.map((order) => {
                const status = (order.status || order.order_status || 'PENDING').toUpperCase();
                const config = statusConfigs[status] || statusConfigs.PENDING;
                const StatusIcon = config.icon;
                const actions = STATUS_FLOW[status] || [];

                return (
                   <React.Fragment key={order.id}>
                     <tr className={`hover:bg-slate-50/50 transition-colors group ${expandedOrderId === order.id ? 'bg-indigo-50/30' : ''}`}>
                       <td className="px-8 py-6">
                         <div className="font-mono text-xs font-black text-indigo-600 mb-1">{order.order_number}</div>
                         <div className="flex items-center gap-2 text-[10px] text-slate-400 font-bold uppercase tracking-widest">
                           <Calendar className="w-3 h-3" />
                           {new Date(order.created_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}
                         </div>
                       </td>
                       <td className="px-8 py-6">
                         <div className="font-bold text-slate-800">{order.customer_name || 'Guest User'}</div>
                         <div className="text-[10px] text-slate-400 font-bold uppercase tracking-widest flex items-center gap-1.5 mt-1">
                           <div className={`w-1.5 h-1.5 rounded-full ${order.payment_status === 'completed' ? 'bg-emerald-500' : 'bg-amber-500'}`}></div>
                           {order.payment_method} • {order.payment_status}
                         </div>
                       </td>
                       <td className="px-8 py-6 text-center">
                         <span className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest ${config.bg} ${config.color}`}>
                           <StatusIcon className="w-3 h-3" />
                           {status.replace('_', ' ')}
                         </span>
                       </td>
                       <td className="px-8 py-6 text-right font-black text-slate-900 text-lg">
                         ₹{Number(order.total_amount).toLocaleString('en-IN')}
                       </td>
                       <td className="px-8 py-6">
                         <div className="flex items-center justify-center gap-2">
                           {actions.length > 0 ? actions.map((a) => {
                             const actionLabels = {
                               CONFIRMED: 'Confirm',
                               CANCELLED: 'Cancel',
                               PACKED: 'Pack',
                               SHIPPED: 'Ship',
                               DELIVERED: 'Deliver',
                               RETURN_APPROVED: 'Approve',
                               RETURN_REJECTED: 'Reject',
                               REFUNDED: 'Refund'
                             };
                             const label = actionLabels[a] || a.replace('_', ' ');
                             
                             return (
                               <button
                                 key={a}
                                 onClick={(e) => { e.stopPropagation(); updateStatus(order.id, a); }}
                                 className={`px-3 py-1.5 rounded-lg border text-[10px] font-black uppercase tracking-widest transition-all ${
                                   a === 'CANCELLED' || a === 'RETURN_REJECTED' 
                                     ? 'border-rose-100 text-rose-600 hover:bg-rose-50' 
                                     : a === 'DELIVERED' || a === 'RETURN_APPROVED' || a === 'CONFIRMED'
                                     ? 'border-emerald-100 text-emerald-600 hover:bg-emerald-50'
                                     : 'border-indigo-100 text-indigo-600 hover:bg-indigo-50'
                                 }`}
                               >
                                 {label}
                               </button>
                             );
                           }) : (
                             <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-50 border border-slate-100 text-slate-400">
                               <CheckCircle2 className="w-3.5 h-3.5" />
                               <span className="text-[10px] font-black uppercase tracking-widest">Finalized</span>
                             </div>
                           )}
                         </div>
                       </td>
                       <td className="px-8 py-6 text-center">
                         <button 
                            onClick={() => setExpandedOrderId(expandedOrderId === order.id ? null : order.id)}
                            className="p-2 rounded-xl border border-slate-100 text-slate-400 hover:text-indigo-600 hover:bg-white transition-all shadow-sm"
                         >
                            {expandedOrderId === order.id ? <ChevronUp className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                         </button>
                       </td>
                     </tr>
                     {expandedOrderId === order.id && (
                       <tr className="bg-slate-50/50">
                         <td colSpan="6" className="px-12 py-8">
                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
                               <div className="space-y-4">
                                  <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                                     <ShoppingBag className="w-4 h-4 text-indigo-500" />
                                     Order Items
                                  </h4>
                                  <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden shadow-sm">
                                     <table className="min-w-full">
                                        <thead className="bg-slate-50/30 border-b border-slate-100">
                                           <tr>
                                              <th className="px-4 py-2 text-left text-[9px] font-black text-slate-400 uppercase tracking-widest">Product</th>
                                              <th className="px-4 py-2 text-center text-[9px] font-black text-slate-400 uppercase tracking-widest">Qty</th>
                                              <th className="px-4 py-2 text-right text-[9px] font-black text-slate-400 uppercase tracking-widest">Price</th>
                                           </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-50">
                                           {order.items?.map((item, idx) => (
                                              <tr key={idx}>
                                                 <td className="px-4 py-3 text-xs font-bold text-slate-700">{item.product_name}</td>
                                                 <td className="px-4 py-3 text-xs text-center font-black text-slate-500">{item.quantity}</td>
                                                 <td className="px-4 py-3 text-xs text-right font-black text-slate-900">₹{Number(item.price * item.quantity).toLocaleString('en-IN')}</td>
                                              </tr>
                                           ))}
                                        </tbody>
                                     </table>
                                  </div>
                               </div>
                               <div className="space-y-4">
                                  <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                                     <MapPin className="w-4 h-4 text-rose-500" />
                                     Shipping Details
                                  </h4>
                                  <div className="bg-white rounded-2xl border border-slate-100 p-6 shadow-sm">
                                     <div className="space-y-4">
                                        <div className="flex items-start gap-3">
                                           <MapPin className="w-4 h-4 text-slate-300 shrink-0 mt-0.5" />
                                           <div>
                                              <div className="text-[9px] font-black text-slate-300 uppercase tracking-widest mb-1">Address</div>
                                              <div className="text-xs font-bold text-slate-600 leading-relaxed">
                                                 {order.shipping_address?.address_line1 || 'N/A'}<br />
                                                 {order.shipping_address?.address_line2 && <>{order.shipping_address.address_line2}<br /></>}
                                                 {order.shipping_address?.city}, {order.shipping_address?.state}<br />
                                                 PIN: {order.shipping_address?.pincode}
                                              </div>
                                           </div>
                                        </div>
                                        <div className="flex items-center gap-3">
                                           <PhoneIcon className="w-4 h-4 text-slate-300 shrink-0" />
                                           <div>
                                              <div className="text-[9px] font-black text-slate-300 uppercase tracking-widest mb-1">Phone Number</div>
                                              <div className="text-xs font-bold text-slate-600">{order.customer_phone || order.shipping_address?.phone || 'N/A'}</div>
                                           </div>
                                        </div>
                                     </div>
                                  </div>
                               </div>
                            </div>
                         </td>
                       </tr>
                     )}
                   </React.Fragment>

                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

// Simple Boxes icon for packed since lucide-react might not have specific PackageCheck
const Boxes = ({ className }) => (
  <svg className={className} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M2.97 12.92A2 2 0 0 0 2 14.63v3.24a2 2 0 0 0 .97 1.71l3 1.71a2 2 0 0 0 2.06 0l3-1.71a2 2 0 0 0 .97-1.71v-3.24a2 2 0 0 0-.97-1.71l-3-1.71a2 2 0 0 0-2.06 0l-3 1.71z"/><path d="m7 16.5-4.74-2.85"/><path d="m7 16.5 4.74-2.85"/><path d="M7 16.5v5.17"/><path d="M12.97 4.92A2 2 0 0 0 12 6.63v3.24a2 2 0 0 0 .97 1.71l3 1.71a2 2 0 0 0 2.06 0l3-1.71a2 2 0 0 0 .97-1.71V6.63a2 2 0 0 0-.97-1.71l-3-1.71a2 2 0 0 0-2.06 0l-3 1.71z"/><path d="m17 8.5-4.74-2.85"/><path d="m17 8.5 4.74-2.85"/><path d="M17 8.5v5.17"/><path d="M2.97 4.92A2 2 0 0 0 2 6.63v3.24a2 2 0 0 0 .97 1.71l3 1.71a2 2 0 0 0 2.06 0l3-1.71a2 2 0 0 0 .97-1.71V6.63a2 2 0 0 0-.97-1.71l-3-1.71a2 2 0 0 0-2.06 0l-3 1.71z"/><path d="m7 8.5-4.74-2.85"/><path d="m7 8.5 4.74-2.85"/><path d="M7 8.5v5.17"/></svg>
);

export default OrdersPage;
