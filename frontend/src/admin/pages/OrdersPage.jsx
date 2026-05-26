import React, { useEffect, useState, useCallback } from 'react';
import { toast } from 'sonner';
import adminService from '../services/admin.service';
import apiClient from '../../services/core/apiClient';
import TablePagination from '../../components/ui/TablePagination';
import {
  ShoppingBag, Clock, CheckCircle2, Truck, AlertCircle,
  Search, Filter, ChevronRight, XCircle, RefreshCcw,
  IndianRupee, Calendar, MoreHorizontal, Eye, PackageCheck,
  MapPin, Phone as PhoneIcon, ChevronDown, ChevronUp, Check
} from 'lucide-react';
import { Button } from '../../components/ui/button';
import { formatImageUrl } from '../../utils/api';
import PageLoader from '../../components/ui/PageLoader';
import DateFilterPopover from '../../components/ui/DateFilterPopover';
import { useAuth } from '../../contexts/AuthContext';


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
  PLACED: { color: 'text-secondary', bg: 'bg-secondary-container', icon: ShoppingBag },
  CONFIRMED: { color: 'text-primary', bg: 'bg-primary/10', icon: CheckCircle2 },
  PACKAGING: { color: 'text-secondary', bg: 'bg-secondary-container', icon: PackageCheck },
  PACKED: { color: 'text-secondary', bg: 'bg-secondary-container', icon: PackageCheck },
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
const uiStatus = (status) => (status || '').toUpperCase();

const patchOrderStatus = (order, status, extraData = {}) => {
  const next = uiStatus(status);
  const patched = {
    ...order,
    ...extraData,
    status: next,
    order_status: next.toLowerCase(),
    updated_at: new Date().toISOString(),
  };
  if (next === 'DELIVERED' && order.payment_method === 'cod' && extraData.mark_paid !== false) {
    patched.payment_status = 'Paid';
  }
  if (next === 'RETURN_APPROVED') {
    patched.status = 'REFUNDED';
    patched.order_status = 'refunded';
    patched.payment_status = 'refunded';
  }
  return patched;
};

const OrdersPage = () => {
  const { hasPermission } = useAuth();
  const [rows, setRows] = useState(() => {
    const cached = adminService.getCached('/admin/orders', { page: 1, limit: PAGE_SIZE, search: '' });
    const items = (cached?.data?.items || []).map((order) => ({
      ...order,
      status: (order.order_status || '').toUpperCase(),
    }));
    return items;
  });
  const [loading, setLoading] = useState(() => {
    const cached = adminService.getCached('/admin/orders', { page: 1, limit: PAGE_SIZE, search: '' });
    return !cached;
  });
  const [filter, setFilter] = useState('ALL');
  const [search, setSearch] = useState('');
  const [dateFilter, setDateFilter] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [total, setTotal] = useState(() => {
    const cached = adminService.getCached('/admin/orders', { page: 1, limit: PAGE_SIZE, search: '' });
    return cached?.data?.total || 0;
  });
  const [page, setPage] = useState(1);
  const [messageModal, setMessageModal] = useState(null);
  const [trackingModal, setTrackingModal] = useState(null);
  const [trackingForm, setTrackingForm] = useState({ carrier: '', tracking_id: '', tracking_url: '' });
  const [adminMessage, setAdminMessage] = useState('');
  const [expandedOrderId, setExpandedOrderId] = useState(null);
  const [selectedOrderForModal, setSelectedOrderForModal] = useState(null);
  const [pendingActionIds, setPendingActionIds] = useState(() => new Set());
  const [timeLeft, setTimeLeft] = useState(null);

  const load = useCallback(async (p = 1) => {
    const params = { page: p, limit: PAGE_SIZE, search };
    if (filter !== 'ALL') {
      params.status_filter = filter;
    }
    if (dateFilter && dateFilter.start_date && dateFilter.end_date) {
      params.start_date = dateFilter.start_date;
      params.end_date = dateFilter.end_date;
    }
    const cached = adminService.getCached('/admin/orders', params);
    if (!cached) {
      setLoading(true);
    }
    try {
      const response = await adminService.getOrders(params);
      setRows(response.data.items || []);
      setTotal(response.data.total || 0);
      setPage(p);
    } catch (err) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  }, [search, filter, dateFilter]);

  const loadSilent = useCallback(async (p = 1) => {
    try {
      const params = { page: p, limit: PAGE_SIZE, search };
      if (filter !== 'ALL') params.status_filter = filter;
      if (dateFilter && dateFilter.start_date && dateFilter.end_date) {
        params.start_date = dateFilter.start_date;
        params.end_date = dateFilter.end_date;
      }
      const response = await apiClient.get('/admin/orders', { params, silent: true });
      const items = (response.data.items || []).map((order) => ({
        ...order,
        status: (order.order_status || '').toUpperCase(),
      }));
      setRows(items);
      setTotal(response.data.total || 0);
    } catch (err) {
      // Ignore background errors
    }
  }, [search, filter, dateFilter]);

  useEffect(() => {
    if (!selectedOrderForModal) {
      setTimeLeft(null);
      return;
    }
    
    const isOnlinePending = 
      selectedOrderForModal.payment_status !== 'Paid' &&
      selectedOrderForModal.payment_status !== 'completed' &&
      (selectedOrderForModal.payment_method || '').toLowerCase() !== 'cod' &&
      !['cancelled', 'refunded', 'failed', 'return_approved'].includes((selectedOrderForModal.order_status || '').toLowerCase());

    if (!isOnlinePending) {
      setTimeLeft(null);
      return;
    }

    const calculateTimeLeft = () => {
      const createdTime = new Date(selectedOrderForModal.created_at).getTime();
      const expiryTime = createdTime + 15 * 60 * 1000;
      const now = new Date().getTime();
      const difference = expiryTime - now;

      if (difference <= 0) {
        setTimeLeft('Expired');
        return false;
      }

      const minutes = Math.floor((difference / 1000 / 60) % 60);
      const seconds = Math.floor((difference / 1000) % 60);
      
      const formattedMin = String(minutes).padStart(2, '0');
      const formattedSec = String(seconds).padStart(2, '0');
      
      setTimeLeft(`${formattedMin}:${formattedSec}`);
      return true;
    };

    const active = calculateTimeLeft();
    if (!active) return;

    const timer = setInterval(() => {
      const active = calculateTimeLeft();
      if (!active) {
        clearInterval(timer);
        loadSilent(page);
      }
    }, 1000);

    return () => clearInterval(timer);
  }, [selectedOrderForModal, page, loadSilent]);

  useEffect(() => {
    const timer = setTimeout(() => {
      load(1);
    }, 100);
    return () => clearTimeout(timer);
  }, [search, filter, load, dateFilter]);

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
    const previousRows = rows;
    const previousModalOrder = selectedOrderForModal;
    const toastId = toast.loading('Updating order...');
    try {
      setPendingActionIds(prev => new Set(prev).add(orderId));
      setSubmitting(true);
      const optimisticPatch = { ...extraData };
      if (message) optimisticPatch.admin_message = message;
      setRows(prev => prev.map(order => order.id === orderId ? patchOrderStatus(order, newStatus, optimisticPatch) : order));
      setSelectedOrderForModal(prev => prev?.id === orderId ? patchOrderStatus(prev, newStatus, optimisticPatch) : prev);
      setMessageModal(null);
      setTrackingModal(null);
      setTrackingForm({ carrier: '', tracking_id: '', tracking_url: '' });
      setAdminMessage('');
      await adminService.updateOrderStatus(orderId, { status: newStatus, admin_message: message, ...extraData });
      toast.success(`Order status updated to ${newStatus.toLowerCase().replace('_', ' ')}`, { id: toastId });
      loadSilent(page);
    } catch (err) {
      setRows(previousRows);
      setSelectedOrderForModal(previousModalOrder);
      toast.error(err.message, { id: toastId });
    } finally {
      setPendingActionIds(prev => {
        const next = new Set(prev);
        next.delete(orderId);
        return next;
      });
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

  if (loading && rows.length === 0) return <PageLoader />;

  return (
    <div className="space-y-8">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 pb-6 border-b border-slate-200">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-slate-900 flex items-center gap-3">
            <ShoppingBag className="w-8 h-8 text-primary" />
            Orders
          </h1>
          <p className="text-slate-500 mt-1 font-medium">View and manage customer orders.</p>
        </div>

        <div className="flex items-center gap-3">
          <div className="relative group flex items-center gap-3">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
            <input
              type="text"
              placeholder="Order Number..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10 pr-4 py-2 bg-white border border-slate-200 rounded-xl text-sm shadow-sm focus:ring-2 focus:ring-primary/20 outline-none w-64"
            />
          </div>
          <DateFilterPopover onChange={(v) => setDateFilter(v)} initial={dateFilter} />
        </div>
      </div>

      {hasPermission('view_analytics') && (
        <div className="hidden md:grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-4">
            <div className="w-12 h-12 bg-primary/10 text-primary rounded-xl flex items-center justify-center">
              <ShoppingBag className="w-6 h-6" />
            </div>
            <div>
              <div className="text-[10px] font-black uppercase tracking-widest text-slate-500">Total Orders</div>
              <div className="text-2xl font-black text-slate-900">{stats.total}</div>
            </div>
          </div>
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-4">
            <div className="w-12 h-12 bg-primary/10 text-primary rounded-xl flex items-center justify-center">
              <CheckCircle2 className="w-6 h-6 text-primary" />
            </div>
            <div>
              <div className="text-[10px] font-black uppercase tracking-widest text-slate-500">Confirmed</div>
              <div className="text-2xl font-black text-slate-900">{stats.confirmed}</div>
            </div>
          </div>
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-4">
            <div className="w-12 h-12 bg-secondary-container text-secondary rounded-xl flex items-center justify-center">
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
      )}

      <div className="bg-slate-50 p-1 rounded-2xl flex flex-wrap items-center gap-1 border border-slate-200">
        {['ALL', 'PENDING_PAYMENT', 'CONFIRMED', 'PACKAGING', 'SHIPPED', 'OUT_FOR_DELIVERY', 'DELIVERED', 'RETURN_REQUESTED', 'CANCELLED', 'FAILED'].map((s) => (
          <button
            key={s}
            onClick={() => setFilter(s)}
            className={`px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-tighter transition-all ${
              filter === s
                ? 'bg-white text-primary shadow-sm ring-1 ring-slate-200'
                : 'text-slate-500 hover:text-slate-900 hover:bg-slate-100/50'
            }`}
          >
            {s.replace('_', ' ')}
          </button>
        ))}
      </div>

      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-[1000px] lg:min-w-full">
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
                const isOrderPending = pendingActionIds.has(order.id);

                return (
                   <React.Fragment key={order.id}>
                     <tr className={`hover:bg-slate-50/50 transition-colors group ${expandedOrderId === order.id ? 'bg-primary/5' : ''}`}>
                       <td className="px-8 py-6">
                         <div className="font-mono text-xs font-black text-primary mb-1">{order.order_number}</div>
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
                           {(() => {
                             const allowedActions = actions.filter((a) => {
                               if (a === 'CANCELLED') {
                                 return hasPermission('cancel_orders');
                               }
                               return hasPermission('update_order_status');
                             });
                             return allowedActions.length > 0 ? allowedActions.map((a) => {
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
                                   disabled={isOrderPending}
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
                                     isOrderPending
                                       ? 'opacity-60 cursor-wait'
                                       : ''
                                   } ${
                                     a === 'CANCELLED' || a === 'RETURN_REJECTED' || a === 'FAILED'
                                       ? 'border-rose-100 text-rose-600 hover:bg-rose-50'
                                     : a === 'DELIVERED' || a === 'RETURN_APPROVED' || a === 'CONFIRMED'
                                       ? 'border-emerald-100 text-emerald-600 hover:bg-emerald-50'
                                       : 'border-primary/20 text-primary hover:bg-primary/10'
                                   }`}
                                 >
                                   {isOrderPending ? 'Updating' : (isDeliverWithCOD ? 'Deliver & Mark Paid' : label)}
                                 </button>
                               );
                             }) : (
                               <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-50 border border-slate-200 text-slate-500">
                                 <CheckCircle2 className="w-3.5 h-3.5" />
                                 <span className="text-[10px] font-black uppercase tracking-widest">{actions.length > 0 ? 'No Permission' : 'Finalized'}</span>
                               </div>
                             );
                           })()}
                         </div>
                       </td>
                       <td className="px-8 py-6 text-center">
                          {hasPermission('view_order_details') ? (
                            <button
                               onClick={() => setSelectedOrderForModal(order)}
                               className="p-2 rounded-xl border border-slate-200 text-slate-500 hover:text-primary hover:bg-white transition-all shadow-sm"
                            >
                               <Eye className="w-4 h-4" />
                            </button>
                          ) : (
                            <span className="text-[10px] font-bold text-slate-400">Restricted</span>
                          )}
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
        <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur">
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
                className="w-full p-4 min-h-[100px] rounded-2xl border border-slate-200 text-xs font-semibold bg-slate-50 focus:bg-white focus:ring-2 focus:ring-primary focus:outline-none resize-none"
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
                className="flex-1 h-12 rounded-xl text-xs font-black uppercase tracking-widest bg-primary hover:bg-emerald-hover text-white shadow-lg shadow-emerald-glow disabled:opacity-50 transition-all"
              >
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}

      {trackingModal && (
        <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur">
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
                className="w-full p-4 rounded-2xl border border-slate-200 text-xs font-semibold bg-slate-50 focus:bg-white focus:ring-2 focus:ring-primary focus:outline-none"
              />
              <input
                placeholder="Tracking ID"
                value={trackingForm.tracking_id}
                onChange={(e) => setTrackingForm({ ...trackingForm, tracking_id: e.target.value })}
                className="w-full p-4 rounded-2xl border border-slate-200 text-xs font-semibold bg-slate-50 focus:bg-white focus:ring-2 focus:ring-primary focus:outline-none"
              />
              <input
                placeholder="Tracking URL (optional)"
                value={trackingForm.tracking_url}
                onChange={(e) => setTrackingForm({ ...trackingForm, tracking_url: e.target.value })}
                className="w-full p-4 rounded-2xl border border-slate-200 text-xs font-semibold bg-slate-50 focus:bg-white focus:ring-2 focus:ring-primary focus:outline-none"
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
                className="flex-1 h-12 rounded-xl text-xs font-black uppercase tracking-widest bg-primary hover:bg-emerald-hover text-white shadow-lg shadow-emerald-glow disabled:opacity-50 transition-all"
              >
                Ship Order
              </button>
            </div>
          </div>
        </div>
      )}

      {selectedOrderForModal && (
        <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur animate-in fade-in duration-300">
          <div className="bg-white rounded-[2.5rem] p-8 max-w-5xl w-full border border-slate-100 shadow-2xl flex flex-col max-h-[95vh] animate-in zoom-in-95 duration-300">

            {/* Modal Header */}
            <div className="flex items-center justify-between pb-5 border-b border-slate-100">
              <div>
                <div className="flex items-center gap-3 mb-1">
                  <div className="w-10 h-10 rounded-2xl bg-primary text-white flex items-center justify-center">
                    <ShoppingBag className="w-5 h-5" />
                  </div>
                  <h2 className="text-2xl font-black text-slate-900 uppercase tracking-tight">Order Details</h2>
                </div>
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-500 ml-1">
                  Order #{selectedOrderForModal.order_number} • Placed {new Date(selectedOrderForModal.created_at).toLocaleString('en-IN')}
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
            <div className="flex-1 overflow-y-auto py-6 space-y-6 pr-2">

              {/* 3-Column Info Card (Ship to | Payment Details | Order Summary) */}
              <div className="bg-slate-50/50 rounded-3xl border border-slate-200/60 p-6 grid grid-cols-1 md:grid-cols-3 gap-6 divide-y md:divide-y-0 md:divide-x divide-slate-200/60 shadow-sm">

                {/* Column 1: Ship to */}
                <div className="space-y-2">
                  <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Shipping Address</h4>
                  <div className="text-xs text-slate-600 leading-relaxed space-y-0.5 font-semibold">
                    <p className="font-extrabold text-slate-900">{selectedOrderForModal.shipping_address?.full_name || 'Guest User'}</p>
                    <p>{selectedOrderForModal.shipping_address?.address_line1 || 'N/A'}</p>
                    {selectedOrderForModal.shipping_address?.address_line2 && <p>{selectedOrderForModal.shipping_address.address_line2}</p>}
                    <p>{selectedOrderForModal.shipping_address?.city}, {selectedOrderForModal.shipping_address?.state} - {selectedOrderForModal.shipping_address?.pincode}</p>
                    <p className="text-slate-500 font-extrabold mt-2.5 flex items-center gap-1">
                      <PhoneIcon className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      {selectedOrderForModal.customer_phone || selectedOrderForModal.shipping_address?.phone || 'N/A'}
                    </p>
                  </div>
                </div>

                {/* Column 2: Payment Details */}
                <div className="space-y-2 pt-4 md:pt-0 md:pl-6">
                  <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Payment Method</h4>
                  <div className="text-xs text-slate-500 space-y-2 font-semibold">
                    <p className="font-extrabold text-slate-900 uppercase tracking-wider">{selectedOrderForModal.payment_method || 'Razorpay'}</p>
                    {selectedOrderForModal.payment_status === 'Paid' || selectedOrderForModal.payment_status === 'completed' ? (
                      <div className="bg-emerald-50 text-emerald-800 text-[10px] rounded-xl p-3 border border-emerald-100/60 space-y-1">
                        <p className="font-extrabold flex items-center gap-1 text-emerald-700">
                          <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full"></span> Paid
                        </p>
                        {selectedOrderForModal.transaction_id && (
                          <p className="font-mono text-slate-500 break-all select-all">Txn: {selectedOrderForModal.transaction_id}</p>
                        )}
                        {selectedOrderForModal.transaction_date && (
                          <p className="text-slate-500">Date: {new Date(selectedOrderForModal.transaction_date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}</p>
                        )}
                      </div>
                    ) : (
                      <div className="bg-amber-50 text-amber-800 text-[10px] rounded-xl p-3 border border-amber-100/60 space-y-1">
                        <p className="font-extrabold flex items-center gap-1.5 text-amber-700">
                          <span className="w-1.5 h-1.5 bg-amber-500 rounded-full"></span> Pending Payment
                        </p>
                        <p className="text-slate-500 uppercase tracking-widest text-[8px] font-black">Status: {selectedOrderForModal.payment_status || 'Unpaid'}</p>
                        {timeLeft && (
                          <p className="flex items-center gap-1 text-[9px] font-black text-rose-600 animate-pulse mt-1">
                            <Clock className="w-3.5 h-3.5 animate-spin" style={{ animationDuration: '4s' }} />
                            Expires in: {timeLeft}
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                {/* Column 3: Order Summary */}
                <div className="space-y-2 pt-4 md:pt-0 md:pl-6">
                  <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Order Summary</h4>
                  {(() => {
                    const metadata = selectedOrderForModal.shipping_address?.shipping_metadata;
                    const subtotal = metadata?.subtotal ?? (selectedOrderForModal.items?.reduce((acc, item) => acc + (item.price * item.quantity), 0) || 0);
                    const shipping = metadata?.shipping_cost ?? (Number(selectedOrderForModal.total_amount) > subtotal ? 350.0 : 0.0);
                    const cgst = metadata?.cgst_amount ?? (Number(selectedOrderForModal.total_amount) > subtotal ? subtotal * 0.09 : 0.0);
                    const sgst = metadata?.sgst_amount ?? (Number(selectedOrderForModal.total_amount) > subtotal ? subtotal * 0.09 : 0.0);
                    const codCharge = metadata?.cod_charge ?? 0.0;

                    return (
                      <div className="space-y-1.5 text-xs text-slate-500 font-semibold">
                        <div className="flex justify-between">
                          <span>Subtotal:</span>
                          <span className="text-slate-900">₹{subtotal.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Shipping Cost:</span>
                          <span className="text-slate-900">
                            {shipping > 0
                              ? `₹${shipping.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
                              : "FREE"
                            }
                          </span>
                        </div>
                        {codCharge > 0 && (
                          <div className="flex justify-between">
                            <span>COD Handling Fee:</span>
                            <span className="text-slate-900">₹{codCharge.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                          </div>
                        )}
                        {cgst > 0 && (
                          <>
                            <div className="flex justify-between">
                              <span>SGST (9%):</span>
                              <span className="text-slate-900">₹{sgst.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                            </div>
                            <div className="flex justify-between">
                              <span>CGST (9%):</span>
                              <span className="text-slate-900">₹{cgst.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                            </div>
                          </>
                        )}
                        <div className="h-px bg-slate-200/60 my-1" />
                        <div className="flex justify-between font-black text-slate-900 text-sm">
                          <span>Grand Total:</span>
                          <span className="text-primary text-base">₹{Number(selectedOrderForModal.total_amount).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                        </div>
                      </div>
                    );
                  })()}
                </div>
              </div>

              {/* Shipment Timeline Progress */}
              <div className="bg-white rounded-3xl border border-slate-200/60 p-5 shadow-sm">
                <div className="flex items-center justify-between mb-4 pb-2 border-b border-slate-50">
                  <h4 className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Order Shipment Timeline</h4>
                  <span className={`text-[10px] font-black uppercase tracking-widest px-3 py-1 rounded-full ${
                    selectedOrderForModal.status === 'DELIVERED' ? 'bg-emerald-100 text-emerald-800' :
                    selectedOrderForModal.status === 'CANCELLED' ? 'bg-rose-100 text-rose-800' :
                    'bg-primary/10 text-primary'
                  }`}>
                    {(selectedOrderForModal.status || selectedOrderForModal.order_status || 'PENDING').replace('_', ' ')}
                  </span>
                </div>

                {(() => {
                  const status = (selectedOrderForModal.status || selectedOrderForModal.order_status || '').toLowerCase();
                  const isConfirmed = ['confirmed', 'packaging', 'packed', 'shipped', 'out_for_delivery', 'delivered', 'return_requested', 'return_approved', 'return_rejected', 'refunded'].includes(status);
                  const isShipped = ['shipped', 'out_for_delivery', 'delivered', 'return_requested', 'return_approved', 'return_rejected', 'refunded'].includes(status);
                  const isDelivered = ['delivered', 'return_requested', 'return_approved', 'return_rejected', 'refunded'].includes(status);

                  const steps = [
                    { label: 'Placed', active: true, date: selectedOrderForModal.created_at },
                    { label: 'Confirmed', active: isConfirmed, date: isConfirmed ? selectedOrderForModal.created_at : null },
                    { label: 'Shipped', active: isShipped, date: isShipped ? (selectedOrderForModal.shipped_at || selectedOrderForModal.updated_at) : null },
                    { label: 'Delivered', active: isDelivered, date: isDelivered ? (selectedOrderForModal.delivered_at || selectedOrderForModal.updated_at) : null },
                  ];

                  if (status === 'cancelled') {
                    return (
                      <div className="flex items-center gap-3 bg-rose-50 border border-rose-100 rounded-xl p-3 text-rose-800 font-semibold text-xs">
                        <XCircle className="w-5 h-5 text-rose-600 shrink-0" />
                        <div>
                          <p className="font-extrabold text-rose-900">Order Cancelled</p>
                          <p className="text-rose-600 mt-0.5">This order was marked as cancelled on {new Date(selectedOrderForModal.updated_at || selectedOrderForModal.created_at).toLocaleString('en-IN')}</p>
                        </div>
                      </div>
                    );
                  }

                  return (
                    <div className="relative pt-4 pb-2">
                      {/* Line Background */}
                      <div className="absolute top-[28px] left-[10%] right-[10%] h-1 bg-slate-100 -translate-y-1/2 rounded-full" />
                      {/* Active Line */}
                      <div
                        className="absolute top-[28px] left-[10%] h-1 bg-primary -translate-y-1/2 rounded-full transition-all duration-700"
                        style={{
                          width: isDelivered ? '80%' : isShipped ? '53.33%' : isConfirmed ? '26.66%' : '0%'
                        }}
                      />

                      {/* Dots */}
                      <div className="relative flex justify-between">
                        {steps.map((step, idx) => (
                          <div key={idx} className="flex flex-col items-center w-[25%] text-center">
                            <div className={`w-7 h-7 rounded-full flex items-center justify-center border-4 border-white shadow-sm z-10 transition-all ${
                              step.active ? 'bg-primary text-white ring-4 ring-primary/10' : 'bg-slate-200 text-slate-400'
                            }`}>
                              {step.active ? <Check className="w-3 h-3 stroke-[3px]" /> : <span className="text-[9px] font-bold">{idx + 1}</span>}
                            </div>
                            <p className={`text-[11px] mt-2 ${step.active ? 'text-primary font-extrabold' : 'text-slate-400 font-bold'}`}>
                              {step.label}
                            </p>
                            {step.date && (
                              <p className="text-[9px] font-bold text-slate-400 mt-0.5">
                                {new Date(step.date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}
                              </p>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })()}
              </div>

              {/* Order Items Table Redesign */}
              <div className="space-y-3">
                <h4 className="text-[10px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-2">
                  <ShoppingBag className="w-4 h-4 text-primary" />
                  Order Items ({selectedOrderForModal.items?.length || 0})
                </h4>

                <div className="bg-white rounded-3xl border border-slate-200/60 overflow-hidden shadow-sm">
                  <table className="min-w-[600px] lg:min-w-full">
                    <thead className="bg-slate-50/70 border-b border-slate-200">
                      <tr>
                        <th className="px-6 py-4 text-left text-[10px] font-black text-slate-500 uppercase tracking-widest">Item Description</th>
                        <th className="px-6 py-4 text-center text-[10px] font-black text-slate-500 uppercase tracking-widest">Qty</th>
                        <th className="px-6 py-4 text-right text-[10px] font-black text-slate-500 uppercase tracking-widest">Unit Price</th>
                        <th className="px-6 py-4 text-right text-[10px] font-black text-slate-500 uppercase tracking-widest">Total Price</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 font-semibold text-slate-700 font-bold">
                      {selectedOrderForModal.items?.map((item, idx) => (
                        <tr key={idx} className="bg-white hover:bg-slate-50/40 transition-colors">
                          <td className="px-6 py-4 text-xs font-extrabold text-slate-900 flex items-center gap-3">
                            {item.image_url ? (
                              <img
                                src={formatImageUrl(item.image_url)}
                                alt=""
                                className="w-12 h-12 rounded-lg object-cover bg-slate-50 border border-slate-100 shrink-0 shadow-sm"
                              />
                            ) : (
                              <div className="w-12 h-12 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center shrink-0">
                                <ShoppingBag className="w-5 h-5 text-primary" />
                              </div>
                            )}
                            <div>
                              <p className="font-extrabold text-slate-900">{item.product_name}</p>
                              <p className="text-[9px] text-slate-400 uppercase tracking-wider font-bold">Sold by: DurgaShakti Foils</p>
                            </div>
                          </td>
                          <td className="px-6 py-4 text-xs text-center font-black text-slate-500">{item.quantity}</td>
                          <td className="px-6 py-4 text-xs text-right font-black text-slate-700">₹{Number(item.price).toLocaleString('en-IN')}</td>
                          <td className="px-6 py-4 text-xs text-right font-black text-primary">₹{Number(item.price * item.quantity).toLocaleString('en-IN')}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Shipment Courier Info (If shipped) */}
              {selectedOrderForModal.tracking_id && (
                <div className="bg-sky-50/60 border border-sky-100/80 rounded-3xl p-5 shadow-sm flex items-start gap-4 animate-in fade-in duration-300">
                  <Truck className="w-6 h-6 text-sky-600 shrink-0 mt-0.5" />
                  <div>
                    <h4 className="text-[10px] font-black text-sky-700 uppercase tracking-widest mb-1.5">Courier & Tracking details</h4>
                    <div className="text-xs text-slate-600 leading-relaxed font-semibold">
                      <p>Carrier Name: <span className="font-extrabold text-slate-900">{selectedOrderForModal.carrier || 'Courier'}</span></p>
                      <p className="mt-0.5">Tracking Number: <span className="font-mono text-slate-900 select-all font-extrabold">{selectedOrderForModal.tracking_id}</span></p>
                      {selectedOrderForModal.tracking_url && (
                        <a
                          href={selectedOrderForModal.tracking_url}
                          target="_blank"
                          rel="noreferrer"
                          className="text-[10px] font-black text-primary uppercase tracking-widest hover:underline mt-2 inline-block"
                        >
                          Launch Tracking URL &rsaquo;
                        </a>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* Return Details Panel inside modal */}
              {selectedOrderForModal.return_reason && (
                <div className="bg-amber-50/70 border border-amber-100 rounded-3xl p-6 shadow-sm flex flex-col md:flex-row gap-6 items-start animate-in slide-in-from-bottom-2 duration-300">
                  <div className="flex-1 space-y-4">
                    <div className="flex items-center justify-between pb-2 border-b border-amber-100/50">
                      <h4 className="text-[10px] font-black text-amber-700 uppercase tracking-widest flex items-center gap-2">
                        <RefreshCcw className="w-4 h-4 shrink-0" />
                        Return Request Details
                      </h4>
                      <span className={`text-[9px] font-black uppercase tracking-widest px-2.5 py-1 rounded-full ${
                        selectedOrderForModal.status === 'RETURN_APPROVED' ? 'bg-emerald-100 text-emerald-800' :
                        selectedOrderForModal.status === 'RETURN_REJECTED' ? 'bg-rose-100 text-rose-800' :
                        'bg-amber-100 text-amber-800'
                      }`}>
                        {selectedOrderForModal.status?.replace('_', ' ')}
                      </span>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <div className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Customer Return Reason</div>
                        <div className="text-xs font-bold text-slate-800 bg-white p-3 rounded-xl border border-slate-100/60 leading-relaxed shadow-sm">{selectedOrderForModal.return_reason}</div>
                      </div>

                      {selectedOrderForModal.admin_message && (
                        <div className="space-y-1">
                          <div className="text-[9px] font-black text-primary uppercase tracking-widest">Admin Resolution Remarks</div>
                          <div className="text-xs font-bold text-slate-800 bg-white p-3 rounded-xl border border-slate-100/60 leading-relaxed shadow-sm">{selectedOrderForModal.admin_message}</div>
                        </div>
                      )}
                    </div>

                    {/* Quick Approve / Reject action shortcuts for admin directly inside details modal! */}
                    {selectedOrderForModal.status === 'RETURN_REQUESTED' && (
                      <div className="pt-2 flex flex-wrap gap-2.5">
                        <button
                          onClick={() => {
                            setMessageModal({ orderId: selectedOrderForModal.id, status: 'RETURN_APPROVED' });
                            setAdminMessage('');
                            setSelectedOrderForModal(null); // Close order details modal so they focus on confirmation message modal
                          }}
                          className="bg-emerald-600 hover:bg-emerald-700 text-white font-black uppercase tracking-widest text-[9px] px-4 py-2.5 rounded-xl shadow-md transition-all shadow-emerald-50 hover:scale-102 transform active:scale-98"
                        >
                          Approve Return Request
                        </button>
                        <button
                          onClick={() => {
                            setMessageModal({ orderId: selectedOrderForModal.id, status: 'RETURN_REJECTED' });
                            setAdminMessage('');
                            setSelectedOrderForModal(null);
                          }}
                          className="bg-rose-600 hover:bg-rose-700 text-white font-black uppercase tracking-widest text-[9px] px-4 py-2.5 rounded-xl shadow-md transition-all shadow-rose-50 hover:scale-102 transform active:scale-98"
                        >
                          Reject Return Request
                        </button>
                      </div>
                    )}
                  </div>

                  {selectedOrderForModal.return_image_url && (
                    <div className="w-full md:w-44 shrink-0 space-y-2">
                      <div className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Uploaded Return Proof</div>
                      <div className="flex flex-wrap gap-2">
                        {selectedOrderForModal.return_image_url.split(',').map((url, idx) => {
                          const isVideo = url.match(/\.(mp4|mov|webm|ogg|avi)(\?|$)/i) || url.includes('/video/');
                          const fullUrl = formatImageUrl(url);
                          return (
                            <div key={idx} className="relative rounded-2xl border border-slate-200 overflow-hidden bg-white shadow-sm hover:ring-2 hover:ring-primary transition-all w-20 h-20 flex items-center justify-center group cursor-pointer">
                              {isVideo ? (
                                <video src={fullUrl} controls className="w-full h-full object-cover" />
                              ) : (
                                <a
                                  href={fullUrl}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="w-full h-full block"
                                >
                                  <img
                                    src={fullUrl}
                                    alt="Proof"
                                    className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                                  />
                                </a>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="pt-5 border-t border-slate-100 flex justify-end">
              <button
                onClick={() => setSelectedOrderForModal(null)}
                className="px-6 h-12 rounded-xl text-xs font-black uppercase tracking-widest bg-slate-100 hover:bg-slate-200 text-slate-700 transition-all hover:scale-[1.02] transform active:scale-[0.98]"
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
