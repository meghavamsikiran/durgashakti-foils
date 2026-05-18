import React, { useEffect, useState, useCallback } from 'react';
import { toast } from 'sonner';
import adminService from '../services/admin.service';
import apiClient from '../../services/core/apiClient';
import TablePagination from '../../components/ui/TablePagination';
import { 
  ShoppingBag, Clock, CheckCircle2, Truck, AlertCircle, 
  Search, Filter, ChevronRight, XCircle, RefreshCcw, 
  IndianRupee, Calendar, MoreHorizontal, Eye, PackageCheck,
  MapPin, Phone as PhoneIcon, ChevronDown, ChevronUp
} from 'lucide-react';
import { Button } from '../../components/ui/button';
import { formatImageUrl } from '../../utils/api';
import PageLoader from '../../components/ui/PageLoader';

const STATUS_FLOW = {
  PENDING_PAYMENT: ['CANCELLED'],
  CONFIRMED: ['PACKAGING', 'CANCELLED'],
  PACKAGING: ['SHIPPED', 'CANCELLED'],
  SHIPPED: ['OUT_FOR_DELIVERY', 'CANCELLED'],
  OUT_FOR_DELIVERY: ['DELIVERED', 'FAILED', 'CANCELLED'],
  DELIVERED: [],
  FAILED: [],
  CANCELLED: [],
  REFUNDED: [],
  // Legacy status support for compatibility
  PENDING: ['CONFIRMED', 'CANCELLED'],
  PROCESSING: ['CONFIRMED', 'CANCELLED'],
  PLACED: ['CONFIRMED', 'CANCELLED'],
  PACKED: ['SHIPPED', 'CANCELLED'],
  RETURN_REQUESTED: ['RETURN_APPROVED', 'RETURN_REJECTED'],
  RETURN_APPROVED: [],
  RETURN_REJECTED: [],
};

const statusConfigs = {
  PENDING: { color: 'text-amber-600', bg: 'bg-amber-50', icon: Clock },
  PENDING_PAYMENT: { color: 'text-rose-600', bg: 'bg-rose-50', icon: Clock },
  PLACED: { color: 'text-blue-600', bg: 'bg-blue-50', icon: ShoppingBag },
  CONFIRMED: { color: 'text-indigo-600', bg: 'bg-indigo-50', icon: CheckCircle2 },
  PACKAGING: { color: 'text-violet-600', bg: 'bg-violet-50', icon: PackageCheck },
  PACKED: { color: 'text-violet-600', bg: 'bg-violet-50', icon: PackageCheck },
  SHIPPED: { color: 'text-sky-600', bg: 'bg-sky-50', icon: Truck },
  OUT_FOR_DELIVERY: { color: 'text-amber-600', bg: 'bg-amber-50', icon: Truck },
  DELIVERED: { color: 'text-emerald-600', bg: 'bg-emerald-50', icon: CheckCircle2 },
  FAILED: { color: 'text-rose-600', bg: 'bg-rose-50', icon: XCircle },
  CANCELLED: { color: 'text-rose-600', bg: 'bg-rose-50', icon: XCircle },
  RETURN_REQUESTED: { color: 'text-orange-600', bg: 'bg-orange-50', icon: RefreshCcw },
  RETURN_APPROVED: { color: 'text-teal-600', bg: 'bg-teal-50', icon: CheckCircle2 },
  RETURN_REJECTED: { color: 'text-rose-600', bg: 'bg-rose-50', icon: AlertCircle },
  REFUNDED: { color: 'text-slate-600', bg: 'bg-slate-50', icon: IndianRupee },
};

const PAGE_SIZE = 15;

const OrdersPage = () => {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('ALL');
  const [search, setSearch] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [messageModal, setMessageModal] = useState(null);
  const [trackingModal, setTrackingModal] = useState(null);
  const [trackingForm, setTrackingForm] = useState({ carrier: '', tracking_id: '', tracking_url: '' });
  const [adminMessage, setAdminMessage] = useState('');
  const [expandedOrderId, setExpandedOrderId] = useState(null);
  const [selectedOrderForModal, setSelectedOrderForModal] = useState(null);

  const load = useCallback(async (p = 1) => {
    try {
      setLoading(true);
      const params = { page: p, limit: PAGE_SIZE, search };
      if (filter !== 'ALL') {
        params.status_filter = filter;
      }
      const response = await adminService.getOrders(params);
      setRows(response.data.items || []);
      setTotal(response.data.total || 0);
      setPage(p);
    } catch (err) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  }, [search, filter]);

  const loadSilent = useCallback(async (p = 1) => {
    try {
      const params = { page: p, limit: PAGE_SIZE, search };
      if (filter !== 'ALL') {
        params.status_filter = filter;
      }
      const response = await apiClient.get('/admin/orders', { params, silent: true });
      setRows(response.data.items || []);
      setTotal(response.data.total || 0);
    } catch (err) {
      // Ignore background errors
    }
  }, [search, filter]);

  useEffect(() => {
    const timer = setTimeout(() => load(1), 300);
    return () => clearTimeout(timer);
  }, [search, filter, load]);

  // Periodic silent polling in the background (every 10 seconds) for real-time order dashboard
  useEffect(() => {
    const timer = setInterval(() => {
      loadSilent(page);
    }, 10000);
    return () => clearInterval(timer);
  }, [loadSilent, page]);

  const handlePageChange = (newPage) => {
    setExpandedOrderId(null);
    load(newPage);
  };

  const updateStatus = async (orderId, newStatus, message = '', extraData = {}) => {
    try {
      setSubmitting(true);
      await adminService.updateOrderStatus(orderId, { status: newStatus, admin_message: message, ...extraData });
      toast.success(`Order status updated to ${newStatus.toLowerCase().replace('_', ' ')}`);
      setMessageModal(null);
      setTrackingModal(null);
      setTrackingForm({ carrier: '', tracking_id: '', tracking_url: '' });
      setAdminMessage('');
      load();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const filtered = rows;
  const totalFilteredPages = Math.ceil(total / PAGE_SIZE);
  const paginatedOrders = filtered;

  const getStats = () => ({
    total: total,
    confirmed: rows.filter(r => (r.status || '').toUpperCase() === 'CONFIRMED').length,
    packaging: rows.filter(r => ['PACKAGING', 'PACKED'].includes((r.status || '').toUpperCase())).length,
    delivered: rows.filter(r => (r.status || '').toUpperCase() === 'DELIVERED').length,
  });

  const stats = getStats();

  if (loading && rows.length === 0) return <PageLoader message="Loading Orders..." />;

  return (
    <div className="space-y-8 animate-in fade-in duration-700">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 pb-6 border-b border-slate-200">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-slate-900 flex items-center gap-3">
            <ShoppingBag className="w-8 h-8 text-indigo-600" />
            Orders
          </h1>
          <p className="text-slate-500 mt-1 font-medium">View and manage customer orders.</p>
        </div>
        
        <div className="flex items-center gap-3">
          <div className="relative group">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
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
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 bg-indigo-50 text-indigo-600 rounded-xl flex items-center justify-center">
            <ShoppingBag className="w-6 h-6" />
          </div>
          <div>
            <div className="text-[10px] font-black uppercase tracking-widest text-slate-500">Total Orders</div>
            <div className="text-2xl font-black text-slate-900">{stats.total}</div>
          </div>
        </div>
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 bg-indigo-50 text-indigo-600 rounded-xl flex items-center justify-center">
            <CheckCircle2 className="w-6 h-6 text-indigo-600" />
          </div>
          <div>
            <div className="text-[10px] font-black uppercase tracking-widest text-slate-500">Confirmed</div>
            <div className="text-2xl font-black text-slate-900">{stats.confirmed}</div>
          </div>
        </div>
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 bg-violet-50 text-violet-600 rounded-xl flex items-center justify-center">
            <Clock className="w-6 h-6" />
          </div>
          <div>
            <div className="text-[10px] font-black uppercase tracking-widest text-slate-500">Packaging</div>
            <div className="text-2xl font-black text-slate-900">{stats.packaging}</div>
          </div>
        </div>
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 bg-emerald-50 text-emerald-600 rounded-xl flex items-center justify-center">
            <Truck className="w-6 h-6" />
          </div>
          <div>
            <div className="text-[10px] font-black uppercase tracking-widest text-slate-500">Delivered</div>
            <div className="text-2xl font-black text-slate-900">{stats.delivered}</div>
          </div>
        </div>
      </div>

      <div className="bg-slate-50 p-1 rounded-2xl flex flex-wrap items-center gap-1 border border-slate-200">
        {['ALL', 'PENDING_PAYMENT', 'CONFIRMED', 'PACKAGING', 'SHIPPED', 'OUT_FOR_DELIVERY', 'DELIVERED', 'RETURN_REQUESTED', 'CANCELLED', 'FAILED'].map((s) => (
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

      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full">
            <thead className="bg-slate-50/50 border-b border-slate-200">
              <tr>
                <th className="px-8 py-5 text-left text-[11px] font-black text-slate-500 uppercase tracking-wider">Order ID</th>
                <th className="px-8 py-5 text-left text-[11px] font-black text-slate-500 uppercase tracking-wider">Customer</th>
                <th className="px-8 py-5 text-center text-[11px] font-black text-slate-500 uppercase tracking-wider">Status</th>
                <th className="px-8 py-5 text-right text-[11px] font-black text-slate-500 uppercase tracking-wider">Amount</th>
                <th className="px-8 py-5 text-center text-[11px] font-black text-slate-500 uppercase tracking-wider">Actions</th>
                <th className="px-8 py-5 text-center text-[11px] font-black text-slate-500 uppercase tracking-wider">Details</th>
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
                         <div className="flex items-center gap-2 text-[10px] text-slate-500 font-bold uppercase tracking-widest">
                           <Calendar className="w-3 h-3" />
                           {new Date(order.created_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}
                         </div>
                       </td>
                       <td className="px-8 py-6">
                         <div className="font-bold text-slate-800">{order.customer_name || 'Guest User'}</div>
                         <div className="text-[10px] text-slate-500 font-bold uppercase tracking-widest flex items-center gap-1.5 mt-1">
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
                               PACKAGING: 'Package',
                               PACKED: 'Package',
                               SHIPPED: 'Ship',
                               OUT_FOR_DELIVERY: 'Dispatch Out',
                               DELIVERED: 'Deliver',
                               FAILED: 'Mark Failed',
                               RETURN_APPROVED: 'Approve',
                               RETURN_REJECTED: 'Reject',
                               REFUNDED: 'Refund'
                             };
                             const label = actionLabels[a] || a.replace('_', ' ');
                              const isDeliverWithCOD = a === 'DELIVERED' && order.payment_method === 'cod' && order.payment_status !== 'Paid' && order.payment_status !== 'completed';
                              
                             return (
                               <button
                                 key={a}
                                 onClick={(e) => { 
                                   e.stopPropagation(); 
                                   if (a === 'SHIPPED') {
                                     setTrackingModal({ orderId: order.id, status: a });
                                     setTrackingForm({
                                       carrier: order.carrier || '',
                                       tracking_id: order.tracking_id || '',
                                       tracking_url: order.tracking_url || ''
                                     });
                                   } else if (['RETURN_APPROVED', 'RETURN_REJECTED', 'CANCELLED'].includes(a)) {
                                     setMessageModal({ orderId: order.id, status: a });
                                     setAdminMessage('');
                                   } else {
                                     updateStatus(order.id, a, '', isDeliverWithCOD ? { mark_paid: true } : {});
                                   }
                                 }}
                                 className={`px-3 py-1.5 rounded-lg border text-[10px] font-black uppercase tracking-widest transition-all ${
                                   a === 'CANCELLED' || a === 'RETURN_REJECTED' || a === 'FAILED'
                                     ? 'border-rose-100 text-rose-600 hover:bg-rose-50' 
                                     : a === 'DELIVERED' || a === 'RETURN_APPROVED' || a === 'CONFIRMED'
                                     ? 'border-emerald-100 text-emerald-600 hover:bg-emerald-50'
                                     : 'border-indigo-100 text-indigo-600 hover:bg-indigo-50'
                                 }`}
                               >
                                 {isDeliverWithCOD ? 'Deliver & Mark Paid' : label}
                               </button>
                             );
                           }) : (
                             <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-50 border border-slate-200 text-slate-500">
                               <CheckCircle2 className="w-3.5 h-3.5" />
                               <span className="text-[10px] font-black uppercase tracking-widest">Finalized</span>
                             </div>
                           )}
                         </div>
                       </td>
                       <td className="px-8 py-6 text-center">
                          <button 
                             onClick={() => setSelectedOrderForModal(order)}
                             className="p-2 rounded-xl border border-slate-200 text-slate-500 hover:text-indigo-600 hover:bg-white transition-all shadow-sm"
                          >
                             <Eye className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    </React.Fragment>

                );
              })}
            </tbody>
          </table>
          {rows.length === 0 && !loading && (
            <div className="p-12 text-center text-slate-500 font-medium italic">
              No orders found matching the filter criteria.
            </div>
          )}
        </div>
        <TablePagination
          currentPage={page}
          totalPages={Math.ceil(total / PAGE_SIZE)}
          onPageChange={handlePageChange}
          totalItems={total}
          pageSize={PAGE_SIZE}
        />
      </div>

      {messageModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/40 backdrop-blur-sm">
          <div className="bg-white rounded-3xl p-8 max-w-md w-full border border-slate-100 shadow-2xl space-y-6">
            <div>
              <h3 className="text-lg font-black text-slate-900 uppercase tracking-tight">
                {messageModal.status === 'RETURN_APPROVED' ? 'Approve Return' : messageModal.status === 'RETURN_REJECTED' ? 'Reject Return' : 'Cancel Order'}
              </h3>
              <p className="text-xs text-slate-500 mt-1">Provide a custom message or reason to deliver respectively to the customer.</p>
            </div>
            
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Message to Customer</label>
              <textarea
                placeholder={
                  messageModal.status === 'RETURN_APPROVED'
                    ? "E.g., Your return has been approved. Refund has been initiated."
                    : messageModal.status === 'RETURN_REJECTED'
                    ? "E.g., Rejection reason: The photo proof does not show any defective quality issues."
                    : "E.g., Order cancelled due to stock unavailability."
                }
                value={adminMessage}
                onChange={(e) => setAdminMessage(e.target.value)}
                required
                className="w-full p-4 min-h-[100px] rounded-2xl border border-slate-200 text-xs font-semibold bg-slate-50 focus:bg-white focus:ring-2 focus:ring-indigo-500 focus:outline-none resize-none"
              />
            </div>
            
            <div className="flex gap-3">
              <button
                onClick={() => setMessageModal(null)}
                className="flex-1 h-12 rounded-xl border border-slate-200 text-xs font-black uppercase tracking-widest text-slate-600 hover:bg-slate-50 transition-all"
              >
                Go Back
              </button>
              <button
                onClick={() => updateStatus(messageModal.orderId, messageModal.status, adminMessage)}
                disabled={!adminMessage.trim()}
                className="flex-1 h-12 rounded-xl text-xs font-black uppercase tracking-widest bg-indigo-600 hover:bg-indigo-700 text-white shadow-lg shadow-indigo-100 disabled:opacity-50 transition-all"
              >
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}

      {trackingModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/40 backdrop-blur-sm">
          <div className="bg-white rounded-3xl p-8 max-w-md w-full border border-slate-100 shadow-2xl space-y-6">
            <div>
              <h3 className="text-lg font-black text-slate-900 uppercase tracking-tight">Shipment Details</h3>
              <p className="text-xs text-slate-500 mt-1">Add courier details before marking this order as shipped.</p>
            </div>
            <div className="space-y-4">
              <input
                placeholder="Carrier / courier"
                value={trackingForm.carrier}
                onChange={(e) => setTrackingForm({ ...trackingForm, carrier: e.target.value })}
                className="w-full p-4 rounded-2xl border border-slate-200 text-xs font-semibold bg-slate-50 focus:bg-white focus:ring-2 focus:ring-indigo-500 focus:outline-none"
              />
              <input
                placeholder="Tracking ID"
                value={trackingForm.tracking_id}
                onChange={(e) => setTrackingForm({ ...trackingForm, tracking_id: e.target.value })}
                className="w-full p-4 rounded-2xl border border-slate-200 text-xs font-semibold bg-slate-50 focus:bg-white focus:ring-2 focus:ring-indigo-500 focus:outline-none"
              />
              <input
                placeholder="Tracking URL (optional)"
                value={trackingForm.tracking_url}
                onChange={(e) => setTrackingForm({ ...trackingForm, tracking_url: e.target.value })}
                className="w-full p-4 rounded-2xl border border-slate-200 text-xs font-semibold bg-slate-50 focus:bg-white focus:ring-2 focus:ring-indigo-500 focus:outline-none"
              />
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setTrackingModal(null)}
                className="flex-1 h-12 rounded-xl border border-slate-200 text-xs font-black uppercase tracking-widest text-slate-600 hover:bg-slate-50 transition-all"
              >
                Go Back
              </button>
              <button
                onClick={() => updateStatus(trackingModal.orderId, trackingModal.status, '', trackingForm)}
                disabled={!trackingForm.tracking_id.trim() || submitting}
                className="flex-1 h-12 rounded-xl text-xs font-black uppercase tracking-widest bg-indigo-600 hover:bg-indigo-700 text-white shadow-lg shadow-indigo-100 disabled:opacity-50 transition-all"
              >
                Ship Order
              </button>
            </div>
          </div>
        </div>
      )}

      {selectedOrderForModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/40 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="bg-white rounded-[2.5rem] p-8 max-w-4xl w-full border border-slate-100 shadow-2xl flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-300">
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-6 border-b border-slate-100">
              <div>
                <div className="flex items-center gap-3 mb-1">
                  <div className="w-10 h-10 rounded-2xl bg-indigo-600 text-white flex items-center justify-center">
                    <ShoppingBag className="w-5 h-5" />
                  </div>
                  <h2 className="text-2xl font-black text-slate-900 uppercase tracking-tight">Order Details</h2>
                </div>
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-500 ml-1">
                  Order #{selectedOrderForModal.order_number} • {new Date(selectedOrderForModal.created_at).toLocaleString()}
                </p>
              </div>
              <button 
                onClick={() => setSelectedOrderForModal(null)} 
                className="w-12 h-12 rounded-2xl bg-slate-50 border border-slate-200 flex items-center justify-center text-slate-500 hover:text-slate-900 transition-all hover:scale-105"
              >
                <XCircle className="w-6 h-6" />
              </button>
            </div>

            {/* Modal Content - Scrollable */}
            <div className="flex-1 overflow-y-auto py-8 space-y-8 pr-2">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Order Items */}
                <div className="space-y-4">
                  <h4 className="text-[10px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-2">
                    <ShoppingBag className="w-4 h-4 text-indigo-500" />
                    Order Items
                  </h4>
                  <div className="bg-slate-50/50 rounded-3xl border border-slate-200/60 overflow-hidden shadow-sm">
                    <table className="min-w-full">
                      <thead className="bg-slate-100/50 border-b border-slate-200">
                        <tr>
                          <th className="px-5 py-3 text-left text-[9px] font-black text-slate-500 uppercase tracking-widest">Product</th>
                          <th className="px-5 py-3 text-center text-[9px] font-black text-slate-500 uppercase tracking-widest">Qty</th>
                          <th className="px-5 py-3 text-right text-[9px] font-black text-slate-500 uppercase tracking-widest">Price</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {selectedOrderForModal.items?.map((item, idx) => (
                          <tr key={idx} className="bg-white/50">
                            <td className="px-5 py-4 text-xs font-bold text-slate-700">{item.product_name}</td>
                            <td className="px-5 py-4 text-xs text-center font-black text-slate-500">{item.quantity}</td>
                            <td className="px-5 py-4 text-xs text-right font-black text-slate-900">₹{Number(item.price * item.quantity).toLocaleString('en-IN')}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Shipping details */}
                <div className="space-y-4">
                  <h4 className="text-[10px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-2">
                    <MapPin className="w-4 h-4 text-rose-500" />
                    Shipping Details
                  </h4>
                  <div className="bg-slate-50/50 rounded-3xl border border-slate-200/60 p-6 shadow-sm space-y-4">
                    <div className="flex items-start gap-3">
                      <MapPin className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
                      <div>
                        <div className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Address</div>
                        <div className="text-xs font-bold text-slate-600 leading-relaxed">
                          {selectedOrderForModal.shipping_address?.address_line1 || 'N/A'}<br />
                          {selectedOrderForModal.shipping_address?.address_line2 && <>{selectedOrderForModal.shipping_address.address_line2}<br /></>}
                          {selectedOrderForModal.shipping_address?.city}, {selectedOrderForModal.shipping_address?.state}<br />
                          PIN: {selectedOrderForModal.shipping_address?.pincode}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <PhoneIcon className="w-4 h-4 text-slate-400 shrink-0" />
                      <div>
                        <div className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Phone Number</div>
                        <div className="text-xs font-bold text-slate-600">{selectedOrderForModal.customer_phone || selectedOrderForModal.shipping_address?.phone || 'N/A'}</div>
                      </div>
                    </div>
                    {selectedOrderForModal.tracking_id && (
                      <div className="flex items-start gap-3">
                        <Truck className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
                        <div>
                          <div className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Tracking</div>
                          <div className="text-xs font-bold text-slate-600">
                            {selectedOrderForModal.carrier || 'Courier'} - {selectedOrderForModal.tracking_id}
                          </div>
                          {selectedOrderForModal.tracking_url && (
                            <a href={selectedOrderForModal.tracking_url} target="_blank" rel="noreferrer" className="text-[10px] font-black text-indigo-600 uppercase tracking-widest hover:underline">
                              Open tracking link
                            </a>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Return details card inside popup */}
              {selectedOrderForModal.return_reason && (
                <div className="bg-orange-50/70 border border-orange-100 rounded-[2rem] p-6 shadow-sm flex flex-col md:flex-row gap-6 items-start">
                  <div className="flex-1 space-y-4">
                    <h4 className="text-[10px] font-black text-orange-600 uppercase tracking-widest flex items-center gap-2">
                      <RefreshCcw className="w-4 h-4" />
                      Return Request Details
                    </h4>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                        <div className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Customer Return Reason</div>
                        <div className="text-xs font-bold text-slate-800 bg-white p-3 rounded-xl border border-slate-100">{selectedOrderForModal.return_reason}</div>
                      </div>
                      
                      {selectedOrderForModal.admin_message && (
                        <div>
                          <div className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Admin Response Message</div>
                          <div className="text-xs font-bold text-slate-800 bg-white p-3 rounded-xl border border-slate-100">{selectedOrderForModal.admin_message}</div>
                        </div>
                      )}
                    </div>
                  </div>

                  {selectedOrderForModal.return_image_url && (
                    <div className="w-full md:w-36 shrink-0 space-y-1.5">
                      <div className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Uploaded Proof Photo</div>
                      <a
                        href={formatImageUrl(selectedOrderForModal.return_image_url)}
                        target="_blank"
                        rel="noreferrer"
                        className="block relative rounded-2xl border border-slate-200 overflow-hidden bg-white shadow-sm hover:ring-2 hover:ring-indigo-500 transition-all group"
                      >
                        <img 
                          src={formatImageUrl(selectedOrderForModal.return_image_url)} 
                          alt="Proof" 
                          className="w-full h-24 object-cover group-hover:scale-105 transition-transform duration-300"
                        />
                        <div className="absolute inset-0 bg-slate-900/30 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-all">
                          <Eye className="w-5 h-5 text-white" />
                        </div>
                      </a>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="pt-6 border-t border-slate-100 flex justify-end">
              <button
                onClick={() => setSelectedOrderForModal(null)}
                className="px-6 h-12 rounded-xl text-xs font-black uppercase tracking-widest bg-slate-100 hover:bg-slate-200 text-slate-700 transition-all"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// Simple Boxes icon for packed since lucide-react might not have specific PackageCheck
const Boxes = ({ className }) => (
  <svg className={className} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M2.97 12.92A2 2 0 0 0 2 14.63v3.24a2 2 0 0 0 .97 1.71l3 1.71a2 2 0 0 0 2.06 0l3-1.71a2 2 0 0 0 .97-1.71v-3.24a2 2 0 0 0-.97-1.71l-3-1.71a2 2 0 0 0-2.06 0l-3 1.71z"/><path d="m7 16.5-4.74-2.85"/><path d="m7 16.5 4.74-2.85"/><path d="M7 16.5v5.17"/><path d="M12.97 4.92A2 2 0 0 0 12 6.63v3.24a2 2 0 0 0 .97 1.71l3 1.71a2 2 0 0 0 2.06 0l3-1.71a2 2 0 0 0 .97-1.71V6.63a2 2 0 0 0-.97-1.71l-3-1.71a2 2 0 0 0-2.06 0l-3 1.71z"/><path d="m17 8.5-4.74-2.85"/><path d="m17 8.5 4.74-2.85"/><path d="M17 8.5v5.17"/><path d="M2.97 4.92A2 2 0 0 0 2 6.63v3.24a2 2 0 0 0 .97 1.71l3 1.71a2 2 0 0 0 2.06 0l3-1.71a2 2 0 0 0 .97-1.71V6.63a2 2 0 0 0-.97-1.71l-3-1.71a2 2 0 0 0-2.06 0l-3 1.71z"/><path d="m7 8.5-4.74-2.85"/><path d="m7 8.5 4.74-2.85"/><path d="M7 8.5v5.17"/></svg>
);

export default OrdersPage;
