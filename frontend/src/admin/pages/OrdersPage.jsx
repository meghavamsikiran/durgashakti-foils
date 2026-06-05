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
  SHIPPED: ['IN_TRANSIT', 'OUT_FOR_DELIVERY', 'CANCELLED'],
  IN_TRANSIT: ['OUT_FOR_DELIVERY', 'FAILED', 'CANCELLED'],
  OUT_FOR_DELIVERY: ['DELIVERED', 'FAILED', 'CANCELLED'],
  DELIVERED: [],
  FAILED: ['RETURNED', 'SHIPPED', 'CANCELLED'],
  RETURNED: [],
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
  IN_TRANSIT: { color: 'text-blue-600', bg: 'bg-blue-50', icon: Truck },
  OUT_FOR_DELIVERY: { color: 'text-orange-600', bg: 'bg-orange-50', icon: Truck },
  DELIVERED: { color: 'text-emerald-600', bg: 'bg-emerald-50', icon: CheckCircle2 },
  FAILED: { color: 'text-rose-600', bg: 'bg-rose-50', icon: XCircle },
  RETURNED: { color: 'text-purple-600', bg: 'bg-purple-50', icon: RefreshCcw },
  CANCELLED: { color: 'text-rose-600', bg: 'bg-rose-50', icon: XCircle },
  RETURN_REQUESTED: { color: 'text-orange-600', bg: 'bg-orange-50', icon: RefreshCcw },
  RETURN_APPROVED: { color: 'text-teal-600', bg: 'bg-teal-50', icon: CheckCircle2 },
  RETURN_REJECTED: { color: 'text-rose-600', bg: 'bg-rose-50', icon: AlertCircle },
  REFUNDED: { color: 'text-slate-600', bg: 'bg-slate-50', icon: IndianRupee },
};

const PAGE_SIZE = 15;
const uiStatus = (status) => (status || '').toUpperCase();
const isPaidStatus = (status) => ['paid', 'completed', 'refunded', 'refund_pending', 'refund_failed'].includes(String(status || '').toLowerCase());
const STATUS_LABELS = {
  PENDING_PAYMENT: 'Payment Pending',
  PENDING: 'Placed',
  PROCESSING: 'Processing',
  PLACED: 'Placed',
  CONFIRMED: 'Confirmed',
  PACKAGING: 'Packed',
  PACKED: 'Packed',
  SHIPPED: 'Shipped',
  IN_TRANSIT: 'In Transit',
  OUT_FOR_DELIVERY: 'Out For Delivery',
  DELIVERED: 'Delivered',
  FAILED: 'Delivery Failed',
  RETURNED: 'Returned',
  CANCELLED: 'Cancelled',
  RETURN_REQUESTED: 'Return Requested',
  RETURN_APPROVED: 'Return Approved',
  RETURN_REJECTED: 'Return Rejected',
  REFUNDED: 'Refund Credited',
};
const statusLabel = (status) => STATUS_LABELS[uiStatus(status)] || uiStatus(status).replace(/_/g, ' ');
const paymentMethodLabel = (order) => (String(order.payment_method || '').toLowerCase() === 'cod' ? 'COD' : 'Prepaid');
const paymentStatusLabel = (order) => {
  const value = String(order.payment_status || '').toLowerCase();
  if (value === 'cash on delivery') return 'To Collect';
  if (value === 'paid' || value === 'completed') return 'Paid';
  if (value === 'refund_pending') return 'Refund Initiated';
  if (value === 'refund_failed') return 'Refund Failed';
  if (value === 'refunded') return 'Refund Credited';
  return value ? value.replace(/_/g, ' ') : 'Pending';
};

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
  const [trackingForm, setTrackingForm] = useState({ carrier: 'India Post', tracking_id: '', expected_delivery_date: '', shipment_notes: '', custom_carrier: '' });
  const [selectedOrderIds, setSelectedOrderIds] = useState(new Set());
  const [bulkShipModal, setBulkShipModal] = useState(false);
  const [bulkShipForm, setBulkShipForm] = useState({ courier: 'India Post', custom_carrier: '', expected_delivery_date: '', shipment_notes: '', pasted_text: '' });
  const [courierFilter, setCourierFilter] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [adminMessage, setAdminMessage] = useState('');
  const [expandedOrderId, setExpandedOrderId] = useState(null);
  const [selectedOrderForModal, setSelectedOrderForModal] = useState(null);
  const [pendingActionIds, setPendingActionIds] = useState(() => new Set());
  const [timeLeft, setTimeLeft] = useState(null);
  const skipNextLoadRef = React.useRef(false);

  const [refundModal, setRefundModal] = useState(null); // { orderId, productId, item, initialAmount }
  const [refundAmountInput, setRefundAmountInput] = useState('');
  const [upiVpaInput, setUpiVpaInput] = useState('');
  const [isFetchingVpa, setIsFetchingVpa] = useState(false);

  const load = useCallback(async (p = 1, nextFilter = filter) => {
    const params = { page: p, limit: PAGE_SIZE, search };
    if (nextFilter !== 'ALL') {
      params.status_filter = nextFilter;
    }
    if (dateFilter && dateFilter.start_date && dateFilter.end_date) {
      params.start_date = dateFilter.start_date;
      params.end_date = dateFilter.end_date;
    }
    if (courierFilter) params.courier = courierFilter;

    const cached = adminService.getCached('/admin/orders', params);
    if (cached) {
      setRows(cached.data?.items || []);
      setTotal(cached.data?.total || 0);
    } else {
      setRows([]);
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
  }, [search, filter, dateFilter, courierFilter]);

  const loadSilent = useCallback(async (p = 1) => {
    try {
      const params = { page: p, limit: PAGE_SIZE, search };
      if (filter !== 'ALL') params.status_filter = filter;
      if (dateFilter && dateFilter.start_date && dateFilter.end_date) {
        params.start_date = dateFilter.start_date;
        params.end_date = dateFilter.end_date;
      }
      if (courierFilter) params.courier = courierFilter;

      const response = await apiClient.get('/admin/orders', { params, silent: true });
      const items = (response.data.items || []).map((order) => ({
        ...order,
        status: (order.order_status || '').toUpperCase(),
      }));
      setRows(items);
      setTotal(response.data.total || 0);
      setSelectedOrderForModal((prev) => {
        if (!prev) return null;
        const updated = items.find((item) => item.id === prev.id);
        return updated ? updated : prev;
      });
    } catch (err) {
      // Ignore background errors
    }
  }, [search, filter, dateFilter, courierFilter]);

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
    if (skipNextLoadRef.current) {
      skipNextLoadRef.current = false;
      return;
    }
    load(1);
  }, [search, filter, load, dateFilter, courierFilter]);

  // Periodic silent polling in the background. Keep it light so row actions stay responsive.
  // Polls every 4 seconds if there is a pending refund, otherwise every 30 seconds.
  useEffect(() => {
    const hasPendingRefund = rows.some(
      (order) => String(order.payment_status || '').toLowerCase() === 'refund_pending'
    );
    const interval = hasPendingRefund ? 4000 : 30000;

    const timer = setInterval(() => {
      loadSilent(page);
    }, interval);
    return () => clearInterval(timer);
  }, [loadSilent, page, rows]);

  // Background pre-fetch for the most used status filters only; avoid flooding the admin API.
  useEffect(() => {
    const statuses = ['CONFIRMED', 'PACKAGING', 'SHIPPED', 'RETURN_REQUESTED', 'RETURN_APPROVED'];
    const prefetch = async () => {
      for (const s of statuses) {
        try {
          const params = { page: 1, limit: PAGE_SIZE, search: '', status_filter: s };
          await adminService.getOrders(params);
        } catch (e) {
          // Ignore prefetch errors
        }
      }
    };
    const timer = setTimeout(prefetch, 2500);
    return () => clearTimeout(timer);
  }, []);

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
      const response = await adminService.updateOrderStatus(orderId, { status: newStatus, admin_message: message, ...extraData });
      const serverOrder = response?.data?.order;
      if (serverOrder) {
        const normalizedOrder = { ...serverOrder, status: (serverOrder.order_status || '').toUpperCase() };
        setRows(prev => prev.map(order => order.id === orderId ? normalizedOrder : order));
        setSelectedOrderForModal(prev => prev?.id === orderId ? normalizedOrder : prev);
      }
      if (response?.data?.warning) {
        toast.warning(response.data.warning, { duration: 8000 });
      }
      toast.success(`Order status updated to ${statusLabel(newStatus)}`, { id: toastId });
      setTimeout(() => loadSilent(page), 800);
    } catch (err) {
      setRows(previousRows);
      setSelectedOrderForModal(previousModalOrder);
        const detail = (err && (err.data?.detail || err.message || err.detail || err?.response?.data?.detail)) || '';
        const lower = String(detail).toLowerCase();
        if (lower.includes('insufficient balance') || lower.includes('your account does not have enough balance') || lower.includes('insufficient funds')) {
          toast.error('Razorpay account has insufficient balance to process the refund. Add funds in Razorpay dashboard or capture new payments before retrying.', { id: toastId, duration: 10000 });
        } else {
          toast.error(detail || 'Unable to update the order status. Please try again.', { id: toastId });
        }
    } finally {
      setPendingActionIds(prev => {
        const next = new Set(prev);
        next.delete(orderId);
        return next;
      });
      setSubmitting(false);
    }
  };

  const handleItemReturnAction = async (orderId, productId, action, remarks = '') => {
    const toastId = toast.loading(`${action === 'approve' ? 'Approving' : 'Rejecting'} item return...`);
    try {
      const response = await apiClient.post(`/admin/orders/${orderId}/items/${productId}/return-action`, { action, remarks });
      const serverOrder = response?.data?.order;
      if (serverOrder) {
        const normalizedOrder = { ...serverOrder, status: (serverOrder.order_status || '').toUpperCase() };
        setRows(prev => prev.map(order => order.id === orderId ? normalizedOrder : order));
        setSelectedOrderForModal(prev => prev?.id === orderId ? normalizedOrder : prev);
      }
      toast.success(`Item return ${action}d successfully`, { id: toastId });
      setTimeout(() => loadSilent(page), 800);
    } catch (err) {
      toast.error(err?.response?.data?.detail || `Failed to process item return ${action}`, { id: toastId });
    }
  };

  const handleItemReceive = async (orderId, productId) => {
    const toastId = toast.loading('Marking item as received...');
    try {
      const response = await apiClient.post(`/admin/orders/${orderId}/items/${productId}/receive`);
      const serverOrder = response?.data?.order;
      if (serverOrder) {
        const normalizedOrder = { ...serverOrder, status: (serverOrder.order_status || '').toUpperCase() };
        setRows(prev => prev.map(order => order.id === orderId ? normalizedOrder : order));
        setSelectedOrderForModal(prev => prev?.id === orderId ? normalizedOrder : prev);
      }
      toast.success('Item marked as received', { id: toastId });
      setTimeout(() => loadSilent(page), 800);
    } catch (err) {
      toast.error(err?.response?.data?.detail || 'Failed to mark item as received', { id: toastId });
    }
  };

  const handleOpenRefundModal = async (orderId, productId, item) => {
    const calc = item.refund_calculations || {};
    const initialAmount = parseFloat(calc.refundable_amount || 0);
    const courierCost = parseFloat(item.self_shipping_details?.courier_cost || 0);
    const totalRefundDefault = initialAmount + courierCost;
    setRefundModal({ orderId, productId, item, initialAmount, courierCost, totalRefundDefault, isOrderLevel: false });
    setRefundAmountInput(String(totalRefundDefault));
    setUpiVpaInput('');
    setIsFetchingVpa(true);
    try {
      const response = await apiClient.get(`/admin/orders/${orderId}/payment-vpa`);
      if (response.data?.vpa) {
        setUpiVpaInput(response.data.vpa);
      }
    } catch (err) {
      // Ignore errors fetching VPA
    } finally {
      setIsFetchingVpa(false);
    }
  };

  const handleOpenOrderRefundModal = async (order) => {
    const refundItems = (order.items || []).filter(i => i.return_status === 'REFUND_COMPLETED' || i.return_status === 'RETURN_RECEIVED');
    const itemsToSum = refundItems.length > 0 ? refundItems : (order.items || []);
    
    const initialAmount = itemsToSum.reduce((sum, i) => sum + parseFloat(i.refund_calculations?.refundable_amount || 0), 0);
    const courierCost = itemsToSum.reduce((sum, i) => sum + parseFloat(i.self_shipping_details?.courier_cost || 0), 0);
    const totalRefundDefault = initialAmount + courierCost;

    setRefundModal({
      orderId: order.id,
      isOrderLevel: true,
      refundItems: itemsToSum,
      initialAmount,
      courierCost,
      totalRefundDefault,
      order
    });
    setRefundAmountInput(String(totalRefundDefault));
    setUpiVpaInput('');
    setIsFetchingVpa(true);
    try {
      const response = await apiClient.get(`/admin/orders/${order.id}/payment-vpa`);
      if (response.data?.vpa) {
        setUpiVpaInput(response.data.vpa);
      }
    } catch (err) {
      // Ignore
    } finally {
      setIsFetchingVpa(false);
    }
  };

  const handleConfirmManualRefundItem = async (restock = true) => {
    if (!refundModal) return;
    const { orderId, productId, isOrderLevel } = refundModal;
    const amountVal = parseFloat(refundAmountInput);
    if (isNaN(amountVal) || amountVal < 0) {
      toast.error("Please enter a valid refund amount.");
      return;
    }
    
    if (isOrderLevel) {
      const toastId = toast.loading('Confirming manual refund...');
      try {
        setPendingActionIds(prev => new Set(prev).add(orderId));
        setSubmitting(true);
        const response = await apiClient.put(`/admin/orders/${orderId}/confirm-manual-refund`);
        const serverOrder = response?.data?.order;
        if (serverOrder) {
          const normalizedOrder = { ...serverOrder, status: (serverOrder.order_status || '').toUpperCase() };
          setRows(prev => prev.map(order => order.id === orderId ? normalizedOrder : order));
          setSelectedOrderForModal(prev => prev?.id === orderId ? normalizedOrder : prev);
        }
        toast.success(response?.data?.message || 'Manual refund confirmed successfully.', { id: toastId });
        setRefundModal(null);
        setTimeout(() => loadSilent(page), 800);
      } catch (err) {
        const detail = err?.data?.detail || err?.response?.data?.detail || err?.message;
        toast.error(detail || 'Failed to confirm manual refund.', { id: toastId });
      } finally {
        setPendingActionIds(prev => {
          const next = new Set(prev);
          next.delete(orderId);
          return next;
        });
        setSubmitting(false);
      }
      return;
    }

    const toastId = toast.loading('Confirming manual refund payout...');
    try {
      const response = await apiClient.post(
        `/admin/orders/${orderId}/items/${productId}/process-refund?restock=${restock}&manual_amount=${amountVal}&is_manual=true`
      );
      
      const serverOrder = response?.data?.order;
      if (serverOrder) {
        const normalizedOrder = { ...serverOrder, status: (serverOrder.order_status || '').toUpperCase() };
        setRows(prev => prev.map(order => order.id === orderId ? normalizedOrder : order));
        setSelectedOrderForModal(prev => prev?.id === orderId ? normalizedOrder : prev);
      }
      
      toast.success('Manual refund confirmed successfully!', { id: toastId });
      setRefundModal(null);
      setTimeout(() => loadSilent(page), 800);
    } catch (err) {
      toast.error(err?.response?.data?.detail || 'Failed to process manual refund', { id: toastId });
    }
  };

  const handleItemProcessRefund = async (orderId, productId, restock = true) => {
    const toastId = toast.loading('Processing refund...');
    try {
      const response = await apiClient.post(`/admin/orders/${orderId}/items/${productId}/process-refund?restock=${restock}`);
      const serverOrder = response?.data?.order;
      if (serverOrder) {
        const normalizedOrder = { ...serverOrder, status: (serverOrder.order_status || '').toUpperCase() };
        setRows(prev => prev.map(order => order.id === orderId ? normalizedOrder : order));
        setSelectedOrderForModal(prev => prev?.id === orderId ? normalizedOrder : prev);
      }
      if (response?.data?.warning) {
        toast.warning(response.data.warning, { duration: 8000, id: toastId });
      } else {
        toast.success('Refund processed successfully', { id: toastId });
      }
      setTimeout(() => loadSilent(page), 800);
    } catch (err) {
      toast.error(err?.response?.data?.detail || 'Failed to process refund', { id: toastId });
    }
  };

  const retryRefund = async (orderId) => {
    const previousRows = rows;
    const previousModalOrder = selectedOrderForModal;
    const toastId = toast.loading('Initiating Razorpay refund...');
    try {
      setPendingActionIds(prev => new Set(prev).add(orderId));
      setSubmitting(true);
      const response = await adminService.retryRefund(orderId);
      const serverOrder = response?.data?.order;
      if (serverOrder) {
        const normalizedOrder = { ...serverOrder, status: (serverOrder.order_status || '').toUpperCase() };
        setRows(prev => prev.map(order => order.id === orderId ? normalizedOrder : order));
        setSelectedOrderForModal(prev => prev?.id === orderId ? normalizedOrder : prev);
      }
      toast.success(response?.data?.message || 'Razorpay refund has been initiated and is pending bank confirmation.', { id: toastId });
      setTimeout(() => loadSilent(page), 800);
    } catch (err) {
      setRows(previousRows);
      setSelectedOrderForModal(previousModalOrder);
      const detail = err?.data?.detail || err?.response?.data?.detail || err?.message;
      toast.error(detail || 'Razorpay refund could not be retried. Please try again.', { id: toastId });
    } finally {
      setPendingActionIds(prev => {
        const next = new Set(prev);
        next.delete(orderId);
        return next;
      });
      setSubmitting(false);
    }
  };

  const confirmManualRefund = async (orderId) => {
    const toastId = toast.loading('Confirming manual refund...');
    try {
      setPendingActionIds(prev => new Set(prev).add(orderId));
      setSubmitting(true);
      const response = await apiClient.put(`/admin/orders/${orderId}/confirm-manual-refund`);
      const serverOrder = response?.data?.order;
      if (serverOrder) {
        const normalizedOrder = { ...serverOrder, status: (serverOrder.order_status || '').toUpperCase() };
        setRows(prev => prev.map(order => order.id === orderId ? normalizedOrder : order));
        setSelectedOrderForModal(prev => prev?.id === orderId ? normalizedOrder : prev);
      }
      toast.success(response?.data?.message || 'Manual refund confirmed successfully.', { id: toastId });
      setTimeout(() => loadSilent(page), 800);
    } catch (err) {
      const detail = err?.data?.detail || err?.response?.data?.detail || err?.message;
      toast.error(detail || 'Failed to confirm manual refund.', { id: toastId });
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

        <div className="flex flex-wrap items-center gap-3">
          <div className="relative group flex items-center">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
            <input
              type="text"
              placeholder="Search customer, order, payment ID..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10 pr-4 py-2 bg-white border border-slate-200 rounded-xl text-sm shadow-sm focus:ring-2 focus:ring-primary/20 outline-none w-64"
            />
          </div>

          <div className="relative">
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`flex items-center gap-2 px-4 py-2 border rounded-xl text-sm font-semibold transition-all shadow-sm ${
                showFilters || courierFilter || dateFilter
                  ? 'bg-primary/10 border-primary text-primary'
                  : 'bg-white border-slate-200 text-slate-750 hover:bg-slate-50'
              }`}
            >
              <Filter className="w-4 h-4" />
              <span>Filter</span>
              {(courierFilter || dateFilter) && (
                <span className="w-2 h-2 rounded-full bg-primary animate-pulse" />
              )}
            </button>

            {showFilters && (
              <>
                <div className="fixed inset-0 z-[999]" onClick={() => setShowFilters(false)} />
                <div className="absolute right-0 mt-2 w-72 bg-white rounded-2xl border border-slate-200 shadow-xl p-5 z-[1000] space-y-4 animate-in fade-in slide-in-from-top-2 duration-200">
                  <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                    <span className="text-xs font-black uppercase tracking-widest text-slate-500">Filter Options</span>
                    {(courierFilter || dateFilter) && (
                      <button
                        onClick={() => {
                          setCourierFilter('');
                          setDateFilter(null);
                        }}
                        className="text-[10px] font-black uppercase tracking-widest text-rose-500 hover:text-rose-700"
                      >
                        Reset
                      </button>
                    )}
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Courier</label>
                    <select
                      value={courierFilter}
                      onChange={(e) => setCourierFilter(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-50 hover:bg-slate-100/50 border border-slate-200 rounded-xl text-xs font-semibold outline-none transition-colors"
                    >
                      <option value="">All Couriers</option>
                      <option value="India Post">India Post</option>
                      <option value="Speed Post">Speed Post</option>
                      <option value="DTDC">DTDC</option>
                      <option value="Blue Dart">Blue Dart</option>
                      <option value="Delhivery">Delhivery</option>
                      <option value="Ecom Express">Ecom Express</option>
                      <option value="XpressBees">XpressBees</option>
                      <option value="Professional Couriers">Professional Couriers</option>
                      <option value="Shadowfax">Shadowfax</option>
                      <option value="Ekart">Ekart</option>
                    </select>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 block mb-1">Date Range</label>
                    <DateFilterPopover onChange={(v) => setDateFilter(v)} initial={dateFilter} />
                  </div>
                </div>
              </>
            )}
          </div>
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
              <div className="text-[10px] font-black uppercase tracking-widest text-slate-500">Packed</div>
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

      <div className="bg-slate-50 p-1 rounded-2xl flex flex-nowrap items-center gap-1 border border-slate-200 overflow-x-auto">
        {['ALL', 'PENDING_PAYMENT', 'CONFIRMED', 'PACKAGING', 'SHIPPED', 'IN_TRANSIT', 'OUT_FOR_DELIVERY', 'DELIVERED', 'RETURN_REQUESTED', 'RETURN_APPROVED', 'RETURN_REJECTED', 'REFUNDED', 'RETURNED', 'CANCELLED', 'FAILED'].map((s) => (
          <button
            key={s}
            onClick={() => {
              setExpandedOrderId(null);
              setPage(1);
              skipNextLoadRef.current = true;
              setFilter(s);
              load(1, s);
            }}
            className={`shrink-0 px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-tighter transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/30 ${
              filter === s
                ? 'bg-white text-primary shadow-sm ring-1 ring-slate-200'
                : 'text-slate-500 hover:text-slate-900 hover:bg-slate-100/50'
            }`}
          >
            {s === 'ALL' ? 'All' : statusLabel(s)}
          </button>
        ))}
      </div>

      {selectedOrderIds.size > 0 && (
        <div className="bg-primary/5 border border-primary/20 p-4 rounded-2xl flex items-center justify-between animate-in fade-in slide-in-from-top-4 duration-300">
          <div className="flex items-center gap-3">
            <span className="text-xs font-black uppercase tracking-widest text-primary">{selectedOrderIds.size} Orders Selected</span>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setBulkShipModal(true)}
              className="px-4 py-2 bg-primary hover:bg-emerald-hover text-white text-xs font-black uppercase tracking-widest rounded-xl shadow-lg transition-all"
            >
              Ship Orders in Bulk
            </button>
            <button
              onClick={() => setSelectedOrderIds(new Set())}
              className="px-4 py-2 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-black uppercase tracking-widest rounded-xl transition-all"
            >
              Clear Selection
            </button>
          </div>
        </div>
      )}

      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-[1000px] lg:min-w-full">
            <thead className="bg-slate-50/50 border-b border-slate-200">
              <tr>
                <th className="px-8 py-5 text-left w-12">
                  <input
                    type="checkbox"
                    checked={filtered.length > 0 && selectedOrderIds.size === filtered.length}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setSelectedOrderIds(new Set(filtered.map(r => r.id)));
                      } else {
                        setSelectedOrderIds(new Set());
                      }
                    }}
                    className="w-4 h-4 rounded text-primary border-slate-300 focus:ring-primary cursor-pointer"
                  />
                </th>
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
                         <input
                           type="checkbox"
                           checked={selectedOrderIds.has(order.id)}
                           onChange={(e) => {
                             const next = new Set(selectedOrderIds);
                             if (e.target.checked) {
                               next.add(order.id);
                             } else {
                               next.delete(order.id);
                             }
                             setSelectedOrderIds(next);
                           }}
                           onClick={(e) => e.stopPropagation()}
                           className="w-4 h-4 rounded text-primary border-slate-300 focus:ring-primary cursor-pointer"
                         />
                       </td>
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
                           <div className={`w-1.5 h-1.5 rounded-full ${String(order.payment_status || '').toLowerCase() === 'refund_failed' ? 'bg-rose-500' : isPaidStatus(order.payment_status) ? 'bg-emerald-500' : 'bg-amber-500'}`}></div>
                           <span>{paymentMethodLabel(order)} • {paymentStatusLabel(order)}</span>
                           {order.transaction_id && order.transaction_id !== 'COD' && (
                             <span className="font-mono normal-case tracking-normal select-all">{order.transaction_id}</span>
                           )}
                         </div>
                         {order.refund_error && (
                           <div className="mt-2 max-w-sm text-[10px] leading-snug font-semibold text-rose-700 bg-rose-50 border border-rose-100 rounded-lg px-2.5 py-1.5">
                             {order.refund_error}
                           </div>
                         )}
                       </td>
                       <td className="px-8 py-6 text-center">
                         <span className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest ${config.bg} ${config.color}`}>
                           <StatusIcon className="w-3 h-3" />
                           {statusLabel(status)}
                         </span>
                       </td>
                       <td className="px-8 py-6 text-right font-black text-slate-900 text-lg">
                         ₹{Number(order.total_amount).toLocaleString('en-IN')}
                       </td>
                       <td className="px-8 py-6">
                          <div className="flex items-center justify-center gap-2">
                            {(() => {
                              const refundPaymentStatus = String(order.payment_status || '').toLowerCase();
                              const showRefundPendingButton = ['refund_pending', 'refund_failed'].includes(refundPaymentStatus) && hasPermission('update_order_status');
                              const allowedActions = actions.filter((a) => {
                                if (a === 'CANCELLED') {
                                  return hasPermission('cancel_orders');
                                }
                                return hasPermission('update_order_status');
                              });
                              const buttons = [];
                              if (showRefundPendingButton) {
                                buttons.push(
                                  <button
                                    key="REFUND_MANUAL"
                                    disabled={isOrderPending}
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleOpenOrderRefundModal(order);
                                    }}
                                    className={`px-3 py-1.5 rounded-lg border text-[10px] font-black uppercase tracking-widest transition-all ${
                                      isOrderPending ? 'opacity-60 cursor-wait' : ''
                                    } ${refundPaymentStatus === 'refund_failed' ? 'border-rose-100 text-rose-700 hover:bg-rose-50' : 'border-emerald-100 text-emerald-600 hover:bg-emerald-50'}`}
                                  >
                                    {isOrderPending ? 'Retrying' : refundPaymentStatus === 'refund_failed' ? 'Retry Failed Refund' : 'Retry Refund'}
                                  </button>
                                );
                              }
                              if (allowedActions.length > 0) {
                                allowedActions.forEach((a) => {
                                  const actionLabels = {
                                    CONFIRMED: 'Confirm',
                                    CANCELLED: 'Cancel',
                                    PACKAGING: 'Mark Packed',
                                    PACKED: 'Mark Packed',
                                    SHIPPED: 'Mark Shipped',
                                    IN_TRANSIT: 'Mark In Transit',
                                    OUT_FOR_DELIVERY: 'Mark Out For Delivery',
                                    DELIVERED: 'Mark Delivered',
                                    FAILED: 'Mark Failed Delivery',
                                    RETURNED: 'Mark Returned',
                                    RETURN_APPROVED: 'Approve',
                                    RETURN_REJECTED: 'Reject',
                                    REFUNDED: 'Refund'
                                  };
                                  const label = actionLabels[a] || statusLabel(a);
                                  const paymentStatusValue = String(order.payment_status || '').toLowerCase();
                                  const isDeliverWithCOD = a === 'DELIVERED' && String(order.payment_method || '').toLowerCase() === 'cod' && !['paid', 'completed', 'cash on delivery'].includes(paymentStatusValue);

                                  buttons.push(
                                    <button
                                      key={a}
                                      disabled={isOrderPending}
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        if (a === 'SHIPPED') {
                                          setTrackingModal({ orderId: order.id, status: a });
                                          setTrackingForm({
                                            carrier: order.carrier || 'India Post',
                                            tracking_id: order.tracking_id || '',
                                            expected_delivery_date: order.expected_delivery_date ? new Date(order.expected_delivery_date).toISOString().split('T')[0] : '',
                                            shipment_notes: order.shipment_notes || '',
                                            custom_carrier: ''
                                          });
                                        } else if (['RETURN_APPROVED', 'RETURN_REJECTED', 'CANCELLED'].includes(a)) {
                                          setMessageModal({ orderId: order.id, status: a });
                                          setAdminMessage('');
                                        } else {
                                          updateStatus(order.id, a, '', isDeliverWithCOD ? { mark_paid: true } : {});
                                        }
                                      }}
                                      className={`px-3 py-1.5 rounded-lg border text-[10px] font-black uppercase tracking-widest transition-all ${
                                        isOrderPending ? 'opacity-60 cursor-wait' : ''
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
                                });
                              }

                              if (buttons.length > 0) {
                                return <div className="flex items-center justify-center gap-2">{buttons}</div>;
                              }

                              return (
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

      {bulkShipModal && (
        <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur">
          <div className="bg-white rounded-3xl p-8 max-w-lg w-full border border-slate-100 shadow-2xl space-y-6 max-h-[90vh] overflow-y-auto">
            <div>
              <h3 className="text-lg font-black text-slate-900 uppercase tracking-tight">Bulk Shipping Details</h3>
              <p className="text-xs text-slate-500 mt-1">Ship multiple orders at once by providing tracking details.</p>
            </div>
            <div className="space-y-4">
              <div className="space-y-1">
                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Courier *</label>
                <select
                  value={bulkShipForm.courier}
                  onChange={(e) => setBulkShipForm({ ...bulkShipForm, courier: e.target.value })}
                  className="w-full p-4 rounded-2xl border border-slate-200 text-xs font-semibold bg-slate-50 focus:bg-white focus:ring-2 focus:ring-primary focus:outline-none"
                >
                  <option value="India Post">India Post</option>
                  <option value="Speed Post">Speed Post</option>
                  <option value="DTDC">DTDC</option>
                  <option value="Blue Dart">Blue Dart</option>
                  <option value="Delhivery">Delhivery</option>
                  <option value="Ecom Express">Ecom Express</option>
                  <option value="XpressBees">XpressBees</option>
                  <option value="Professional Couriers">Professional Couriers</option>
                  <option value="Shadowfax">Shadowfax</option>
                  <option value="Ekart">Ekart</option>
                  <option value="Other">Other</option>
                </select>
              </div>

              {bulkShipForm.courier === 'Other' && (
                <div className="space-y-1">
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Custom Courier Name *</label>
                  <input
                    placeholder="Enter Courier Name"
                    value={bulkShipForm.custom_carrier}
                    onChange={(e) => setBulkShipForm({ ...bulkShipForm, custom_carrier: e.target.value })}
                    className="w-full p-4 rounded-2xl border border-slate-200 text-xs font-semibold bg-slate-50 focus:bg-white focus:ring-2 focus:ring-primary focus:outline-none"
                  />
                </div>
              )}

              <div className="space-y-1">
                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Expected Delivery Date</label>
                <input
                  type="date"
                  value={bulkShipForm.expected_delivery_date}
                  onChange={(e) => setBulkShipForm({ ...bulkShipForm, expected_delivery_date: e.target.value })}
                  className="w-full p-4 rounded-2xl border border-slate-200 text-xs font-semibold bg-slate-50 focus:bg-white focus:ring-2 focus:ring-primary focus:outline-none"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Shipment Notes</label>
                <textarea
                  placeholder="Optional shipment notes"
                  value={bulkShipForm.shipment_notes}
                  onChange={(e) => setBulkShipForm({ ...bulkShipForm, shipment_notes: e.target.value })}
                  className="w-full p-4 rounded-2xl border border-slate-200 text-xs font-semibold bg-slate-50 focus:bg-white focus:ring-2 focus:ring-primary focus:outline-none resize-none h-16"
                />
              </div>

              <div className="border-t border-slate-100 pt-4 space-y-4">
                <div className="flex justify-between items-center">
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">CSV Tracking Upload</label>
                  <input
                    type="file"
                    accept=".csv,.txt"
                    onChange={(e) => {
                      const file = e.target.files[0];
                      if (!file) return;
                      const reader = new FileReader();
                      reader.onload = (evt) => {
                        const text = evt.target.result;
                        const lines = text.split('\n');
                        const pairs = [];
                        lines.forEach(line => {
                          const parts = line.split(/[,\t;]+/);
                          if (parts.length >= 2) {
                            const o = parts[0].trim();
                            const t = parts[1].trim();
                            if (o && t) {
                              pairs.push(`${o} - ${t}`);
                            }
                          }
                        });
                        setBulkShipForm(prev => ({ ...prev, pasted_text: pairs.join('\n') }));
                        toast.success(`Parsed ${pairs.length} shipments from CSV!`);
                      };
                      reader.readAsText(file);
                    }}
                    className="text-xs text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-black file:uppercase file:bg-primary/10 file:text-primary hover:file:bg-primary/20 cursor-pointer"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Paste Tracking Numbers (ORDER - TRACKING)</label>
                  <textarea
                    placeholder="E.g.&#10;ORD1001 - TRACK001&#10;ORD1002 - TRACK002"
                    value={bulkShipForm.pasted_text}
                    onChange={(e) => setBulkShipForm({ ...bulkShipForm, pasted_text: e.target.value })}
                    className="w-full p-4 rounded-2xl border border-slate-200 text-xs font-mono bg-slate-50 focus:bg-white focus:ring-2 focus:ring-primary focus:outline-none resize-none h-32"
                  />
                </div>
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setBulkShipModal(false)}
                className="flex-1 h-12 rounded-xl border border-slate-200 text-xs font-black uppercase tracking-widest text-slate-600 hover:bg-slate-50 transition-all"
              >
                Cancel
              </button>
              <button
                onClick={async () => {
                  const toastId = toast.loading('Bulk shipping orders...');
                  try {
                    setSubmitting(true);
                    const payload = {
                      courier: bulkShipForm.courier === 'Other' ? bulkShipForm.custom_carrier : bulkShipForm.courier,
                      expected_delivery_date: bulkShipForm.expected_delivery_date || undefined,
                      shipment_notes: bulkShipForm.shipment_notes || undefined,
                      pasted_text: bulkShipForm.pasted_text || undefined
                    };
                    const res = await adminService.bulkShipOrders(payload);
                    toast.success(res.message || 'Orders shipped successfully!', { id: toastId });
                    if (res.warnings && res.warnings.length > 0) {
                      res.warnings.forEach(w => toast.error(w, { duration: 5000 }));
                    }
                    if (res.errors && res.errors.length > 0) {
                      res.errors.forEach(e => toast.error(e, { duration: 6000 }));
                    }
                    setBulkShipModal(false);
                    setSelectedOrderIds(new Set());
                    setBulkShipForm({ courier: 'India Post', custom_carrier: '', expected_delivery_date: '', shipment_notes: '', pasted_text: '' });
                    load(page);
                  } catch (err) {
                    toast.error(err.message || 'Failed to bulk ship orders', { id: toastId });
                  } finally {
                    setSubmitting(false);
                  }
                }}
                disabled={!bulkShipForm.pasted_text.trim() || (bulkShipForm.courier === 'Other' && !bulkShipForm.custom_carrier.trim()) || submitting}
                className="flex-1 h-12 rounded-xl text-xs font-black uppercase tracking-widest bg-primary hover:bg-emerald-hover text-white shadow-lg shadow-emerald-glow disabled:opacity-50 transition-all"
              >
                Ship All Orders
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
              <div className="space-y-1">
                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Courier *</label>
                <select
                  value={trackingForm.carrier}
                  onChange={(e) => setTrackingForm({ ...trackingForm, carrier: e.target.value })}
                  className="w-full p-4 rounded-2xl border border-slate-200 text-xs font-semibold bg-slate-50 focus:bg-white focus:ring-2 focus:ring-primary focus:outline-none"
                >
                  <option value="India Post">India Post</option>
                  <option value="Speed Post">Speed Post</option>
                  <option value="DTDC">DTDC</option>
                  <option value="Blue Dart">Blue Dart</option>
                  <option value="Delhivery">Delhivery</option>
                  <option value="Ecom Express">Ecom Express</option>
                  <option value="XpressBees">XpressBees</option>
                  <option value="Professional Couriers">Professional Couriers</option>
                  <option value="Shadowfax">Shadowfax</option>
                  <option value="Ekart">Ekart</option>
                  <option value="Other">Other</option>
                </select>
              </div>

              {trackingForm.carrier === 'Other' && (
                <div className="space-y-1">
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Custom Courier Name *</label>
                  <input
                    placeholder="Enter Courier Name"
                    value={trackingForm.custom_carrier}
                    onChange={(e) => setTrackingForm({ ...trackingForm, custom_carrier: e.target.value })}
                    className="w-full p-4 rounded-2xl border border-slate-200 text-xs font-semibold bg-slate-50 focus:bg-white focus:ring-2 focus:ring-primary focus:outline-none"
                  />
                </div>
              )}

              <div className="space-y-1">
                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Tracking Number *</label>
                <input
                  placeholder="Tracking ID"
                  value={trackingForm.tracking_id}
                  onChange={(e) => setTrackingForm({ ...trackingForm, tracking_id: e.target.value })}
                  className="w-full p-4 rounded-2xl border border-slate-200 text-xs font-semibold bg-slate-50 focus:bg-white focus:ring-2 focus:ring-primary focus:outline-none"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Expected Delivery Date</label>
                <input
                  type="date"
                  value={trackingForm.expected_delivery_date}
                  onChange={(e) => setTrackingForm({ ...trackingForm, expected_delivery_date: e.target.value })}
                  className="w-full p-4 rounded-2xl border border-slate-200 text-xs font-semibold bg-slate-50 focus:bg-white focus:ring-2 focus:ring-primary focus:outline-none"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Shipment Notes</label>
                <textarea
                  placeholder="Optional shipment notes"
                  value={trackingForm.shipment_notes}
                  onChange={(e) => setTrackingForm({ ...trackingForm, shipment_notes: e.target.value })}
                  className="w-full p-4 rounded-2xl border border-slate-200 text-xs font-semibold bg-slate-50 focus:bg-white focus:ring-2 focus:ring-primary focus:outline-none resize-none h-20"
                />
              </div>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setTrackingModal(null)}
                className="flex-1 h-12 rounded-xl border border-slate-200 text-xs font-black uppercase tracking-widest text-slate-600 hover:bg-slate-50 transition-all"
              >
                Go Back
              </button>
              <button
                onClick={() => {
                  const payload = {
                    courier_name: trackingForm.carrier === 'Other' ? trackingForm.custom_carrier : trackingForm.carrier,
                    carrier: trackingForm.carrier === 'Other' ? trackingForm.custom_carrier : trackingForm.carrier,
                    tracking_number: trackingForm.tracking_id,
                    tracking_id: trackingForm.tracking_id,
                    expected_delivery_date: trackingForm.expected_delivery_date || undefined,
                    shipment_notes: trackingForm.shipment_notes || undefined
                  };
                  updateStatus(trackingModal.orderId, trackingModal.status, '', payload);
                }}
                disabled={!trackingForm.tracking_id.trim() || (trackingForm.carrier === 'Other' && !trackingForm.custom_carrier.trim()) || submitting}
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
                    {(() => {
                      const isCod = String(selectedOrderForModal.payment_method || '').toLowerCase() === 'cod';
                      const paymentStatus = String(selectedOrderForModal.payment_status || '').toLowerCase();
                      const paidLike = ['paid', 'completed', 'cash on delivery', 'refund_pending', 'refund_failed', 'refunded'].includes(paymentStatus) || isCod;
                      const statusLabel =
                        paymentStatus === 'cash on delivery' ? 'To Collect' :
                        paymentStatus === 'paid' || paymentStatus === 'completed' ? 'Paid' :
                        paymentStatus === 'refund_pending' ? 'Refund Initiated' :
                        paymentStatus === 'refund_failed' ? 'Refund Failed' :
                        paymentStatus === 'refunded' ? 'Refund Credited' :
                        paymentStatus ? paymentStatus.replace(/_/g, ' ') : 'Pending';
                      const isRefund = ['refund_pending', 'refunded', 'refund_failed'].includes(paymentStatus);
                      const isRefundFailed = paymentStatus === 'refund_failed';
                      const tone = isRefundFailed
                        ? 'bg-rose-50 text-rose-800 border-rose-100/80'
                        : isRefund
                        ? 'bg-sky-50 text-sky-800 border-sky-100/80'
                        : paidLike
                          ? 'bg-emerald-50 text-emerald-800 border-emerald-100/60'
                          : 'bg-amber-50 text-amber-800 border-amber-100/60';
                      const dot = isRefundFailed ? 'bg-rose-500' : isRefund ? 'bg-sky-500' : paidLike ? 'bg-emerald-500' : 'bg-amber-500';
                      const labelTone = isRefundFailed ? 'text-rose-700' : isRefund ? 'text-sky-700' : paidLike ? 'text-emerald-700' : 'text-amber-700';
                      return (
                        <>
                          <p className="font-extrabold text-slate-900 uppercase tracking-wider">
                            {isCod ? 'COD' : 'Prepaid Online'}
                          </p>
                          <div className={`${tone} text-[10px] rounded-xl p-3 border space-y-1.5`}>
                            <p className={`font-extrabold flex items-center gap-1.5 capitalize ${labelTone}`}>
                              <span className={`w-1.5 h-1.5 ${dot} rounded-full ${!paidLike ? 'animate-pulse' : ''}`}></span>
                              {statusLabel}
                            </p>
                            <p className="text-slate-500 uppercase tracking-widest text-[8px] font-black">
                              {isCod ? 'Payment: COD' : 'Payment: Prepaid'}
                            </p>
                            {selectedOrderForModal.transaction_id && (
                              <p className="font-mono text-slate-500 break-all select-all">
                                {selectedOrderForModal.transaction_id === 'COD' ? 'Txn: COD' : `Txn: ${selectedOrderForModal.transaction_id}`}
                              </p>
                            )}
                            {/* Display Customer Payout/UPI Details if present */}
                            {selectedOrderForModal.razorpay_payment_id && (
                              <div className="pt-1 mt-1 border-t border-slate-200/50 space-y-0.5 text-slate-600 font-extrabold">
                                <p className="text-[8px] text-slate-400 font-black uppercase">Customer Razorpay ID</p>
                                <p className="font-mono text-slate-800">{selectedOrderForModal.razorpay_payment_id}</p>
                              </div>
                            )}
                            {/* Manual Payout reference placeholder helper */}
                            {selectedOrderForModal.payment_status === 'refund_pending' && (() => {
                              const refundItems = (selectedOrderForModal.items || []).filter(i => i.return_status === 'REFUND_COMPLETED');
                              const totalRefundAmount = refundItems.reduce((sum, i) => sum + parseFloat(i.refund_calculations?.refundable_amount || 0), 0);
                              const selfShipCost = refundItems.reduce((sum, i) => sum + parseFloat(i.self_shipping_details?.courier_cost || 0), 0);
                              return (
                                <div className="pt-1.5 mt-1 border-t border-dashed border-sky-200 text-sky-900 leading-snug space-y-1.5">
                                  <p className="text-[8px] font-black uppercase text-sky-700">Manual Refund Payout Details</p>
                                  {totalRefundAmount > 0 && (
                                    <p className="text-[11px] font-black text-emerald-700 bg-emerald-50 px-2 py-1 rounded-lg border border-emerald-100">
                                      Refund Amount: ₹{totalRefundAmount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                    </p>
                                  )}
                                  {selfShipCost > 0 && (
                                    <p className="text-[10px] text-slate-600">Self-Ship Courier Cost: ₹{selfShipCost.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
                                  )}
                                  <p>Customer Phone: <span className="font-mono font-extrabold bg-white px-1 py-0.5 rounded border border-sky-100 select-all">{selectedOrderForModal.shipping_address?.phone || 'N/A'}</span></p>
                                  <p className="text-[8px] text-sky-600 font-medium mt-1">Please settle the refund amount manually via UPI / bank transfer and click "Confirm Manual Refund Paid" below.</p>
                                </div>
                              );
                            })()}
                            {selectedOrderForModal.transaction_date && (
                              <p className="text-slate-500">Date: {new Date(selectedOrderForModal.transaction_date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}</p>
                            )}
                            {selectedOrderForModal.refund_error && (
                              <p className="text-rose-700 normal-case tracking-normal leading-snug font-semibold">
                                {selectedOrderForModal.refund_error}
                              </p>
                            )}
                            {!paidLike && timeLeft && (
                              <p className="flex items-center gap-1 text-[9px] font-black text-rose-600 animate-pulse mt-1">
                                <Clock className="w-3.5 h-3.5 animate-spin" style={{ animationDuration: '4s' }} />
                                Expires in: {timeLeft}
                              </p>
                            )}
                          </div>
                        </>
                      );
                    })()}
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
                  const isConfirmed = ['confirmed', 'packaging', 'packed', 'shipped', 'in_transit', 'out_for_delivery', 'delivered', 'return_requested', 'return_approved', 'return_rejected', 'refunded'].includes(status);
                  const isShipped = ['shipped', 'in_transit', 'out_for_delivery', 'delivered', 'return_requested', 'return_approved', 'return_rejected', 'refunded'].includes(status);
                  const isInTransit = ['in_transit', 'out_for_delivery', 'delivered', 'return_requested', 'return_approved', 'return_rejected', 'refunded'].includes(status);
                  const isOutForDelivery = ['out_for_delivery', 'delivered', 'return_requested', 'return_approved', 'return_rejected', 'refunded'].includes(status);
                  const isDelivered = ['delivered', 'return_requested', 'return_approved', 'return_rejected', 'refunded'].includes(status);

                  const steps = [
                    { label: 'Placed', active: true, date: selectedOrderForModal.created_at },
                    { label: 'Confirmed', active: isConfirmed, date: isConfirmed ? selectedOrderForModal.created_at : null },
                    { label: 'Shipped', active: isShipped, date: isShipped ? (selectedOrderForModal.shipped_at || selectedOrderForModal.updated_at) : null },
                    { label: 'In Transit', active: isInTransit, date: null },
                    { label: 'Out For Delivery', active: isOutForDelivery, date: null },
                    { label: 'Delivered', active: isDelivered, date: isDelivered ? (selectedOrderForModal.delivered_at || selectedOrderForModal.updated_at) : null },
                  ];

                  if (['return_requested', 'return_approved', 'return_rejected', 'refunded'].includes(status)) {
                    const isReturnRequested = ['return_requested', 'return_approved', 'return_rejected', 'refunded'].includes(status);
                    const isReturnApproved = ['return_approved', 'refunded'].includes(status);
                    const paymentStatus = (selectedOrderForModal.payment_status || '').toLowerCase();
                    const isRefundInitiated = paymentStatus === 'refund_pending' || paymentStatus === 'refunded' || status === 'refunded';
                    const isRefunded = status === 'refunded' || paymentStatus === 'refunded';
                    const isReturnRejected = status === 'return_rejected';
                    const returnProgressWidth = isReturnRejected ? '70%' : isRefunded ? '70%' : isRefundInitiated ? '47%' : isReturnApproved ? '23%' : '0%';

                    const returnSteps = [
                      { label: 'Return Requested', active: isReturnRequested, date: selectedOrderForModal.updated_at },
                      { 
                        label: isReturnRejected ? 'Return Rejected' : 'Return Approved', 
                        active: isReturnApproved || isReturnRejected, 
                        date: (isReturnApproved || isReturnRejected) ? selectedOrderForModal.updated_at : null,
                        isRejected: isReturnRejected 
                      },
                      ...(!isReturnRejected ? [
                        {
                          label: 'Refund Initiated',
                          active: isRefundInitiated,
                          date: isRefundInitiated ? selectedOrderForModal.updated_at : null
                        },
                        {
                          label: 'Refund Credited',
                          active: isRefunded,
                          date: isRefunded ? selectedOrderForModal.updated_at : null
                        }
                      ] : [])
                    ];

                    return (
                      <div className="relative pt-4 pb-2">
                        {/* Line Background */}
                        <div className="absolute top-[28px] left-[12%] right-[12%] h-1 bg-slate-100 -translate-y-1/2 rounded-full" />
                        {/* Active Line */}
                        <div
                          className={`absolute top-[28px] left-[12%] h-1 -translate-y-1/2 rounded-full transition-all duration-700 ${isReturnRejected ? 'bg-rose-500' : 'bg-primary'}`}
                          style={{ width: returnProgressWidth }}
                        />

                        {/* Dots */}
                        <div className="relative flex justify-between px-[8%]">
                          {returnSteps.map((step, idx) => (
                            <div key={idx} className="flex flex-col items-center w-1/4 text-center">
                              <div className={`w-7 h-7 rounded-full flex items-center justify-center border-4 border-white shadow-sm z-10 transition-all ${
                                step.active 
                                  ? (step.isRejected ? 'bg-rose-600 text-white ring-4 ring-rose-100' : 'bg-primary text-white ring-4 ring-primary/10') 
                                  : 'bg-slate-200 text-slate-400'
                              }`}>
                                {step.active ? (step.isRejected ? <X className="w-3 h-3 stroke-[3px]" /> : <Check className="w-3 h-3 stroke-[3px]" />) : <span className="text-[9px] font-bold">{idx + 1}</span>}
                              </div>
                              <p className={`text-[11px] mt-2 ${step.active ? (step.isRejected ? 'text-rose-600 font-extrabold' : 'text-primary font-extrabold') : 'text-slate-400 font-bold'}`}>
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
                  }

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
                          width: isDelivered ? '80%' : isOutForDelivery ? '64%' : isInTransit ? '48%' : isShipped ? '32%' : isConfirmed ? '16%' : '0%'
                        }}
                      />

                      {/* Dots */}
                      <div className="relative flex justify-between">
                        {steps.map((step, idx) => (
                          <div key={idx} className="flex flex-col items-center w-1/6 text-center">
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

                    <div className="mt-4 space-y-3.5">
                      <div className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Items In This Return Request</div>
                      <div className="space-y-3">
                        {selectedOrderForModal.items?.filter(item => item.return_status).map((item, idx) => (
                          <div key={idx} className="bg-white border border-slate-100 rounded-2xl p-4 shadow-sm space-y-3">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-3 flex-1 min-w-0">
                                {item.image_url && (
                                  <img 
                                    src={formatImageUrl(item.image_url)} 
                                    onError={(e) => { e.target.src = '/logo-durga.png'; }}
                                    alt="" 
                                    className="w-10 h-10 rounded-lg object-cover border border-slate-100 shrink-0" 
                                  />
                                )}
                                <div className="min-w-0">
                                  <p className="text-xs font-black text-slate-900 truncate">{item.product_name}</p>
                                  <p className="text-[10px] text-slate-400 font-extrabold">Price: ₹{item.price} • Return Qty: {item.returned_quantity || 1}</p>
                                </div>
                              </div>
                              <span className={`text-[9px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded-full ${
                                item.return_status === 'RETURN_REQUESTED' ? 'bg-amber-100 text-amber-800' :
                                item.return_status === 'RETURN_APPROVED' ? 'bg-sky-100 text-sky-800' :
                                item.return_status === 'SELF_SHIPPED' ? 'bg-indigo-100 text-indigo-800' :
                                item.return_status === 'RETURN_RECEIVED' ? 'bg-purple-100 text-purple-800' :
                                item.return_status === 'REFUND_COMPLETED' ? 'bg-emerald-100 text-emerald-800' :
                                'bg-rose-100 text-rose-800'
                              }`}>
                                {item.return_status.replace('_', ' ')}
                              </span>
                            </div>

                            {item.refund_calculations && (
                              <div className="text-[10px] font-extrabold text-slate-500 bg-slate-50 p-2.5 rounded-xl flex flex-wrap gap-x-4 gap-y-1">
                                <span>Taxable: ₹{item.refund_calculations.taxable_amount}</span>
                                <span>CGST 9%: ₹{item.refund_calculations.cgst_amount}</span>
                                <span>SGST 9%: ₹{item.refund_calculations.sgst_amount}</span>
                                <span>Discount Share: -₹{item.refund_calculations.coupon_discount_share}</span>
                                <span className="text-primary font-black">Est. Refundable: ₹{item.refund_calculations.refundable_amount}</span>
                              </div>
                            )}

                            {item.self_shipping_details && (
                              <div className="text-[10px] text-slate-650 font-bold bg-slate-50 p-3 rounded-xl border border-slate-100 space-y-1.5">
                                <p className="text-[9px] text-indigo-700 font-black uppercase tracking-wider">Self-Shipping Proof Details</p>
                                <div className="grid grid-cols-2 gap-2">
                                  <p>Courier: <span className="font-extrabold text-slate-900">{item.self_shipping_details.courier_name}</span></p>
                                  <p>Tracking #: <span className="font-mono font-extrabold text-slate-900 select-all">{item.self_shipping_details.tracking_number}</span></p>
                                  {item.self_shipping_details.courier_cost > 0 && <p>Courier Cost: <span className="font-extrabold text-slate-900">₹{item.self_shipping_details.courier_cost}</span></p>}
                                  {item.self_shipping_details.courier_invoice_url && (
                                    <p>
                                      Invoice/Receipt: {' '}
                                      <a href={formatImageUrl(item.self_shipping_details.courier_invoice_url)} target="_blank" rel="noreferrer" className="text-primary font-black underline">
                                        View Attachment
                                      </a>
                                    </p>
                                  )}
                                </div>
                                <div className="pt-2 border-t border-slate-200/50 flex flex-wrap gap-2">
                                  {item.self_shipping_details.tracking_url ? (
                                    <a
                                      href={item.self_shipping_details.tracking_url.startsWith('http') ? item.self_shipping_details.tracking_url : `https://${item.self_shipping_details.tracking_url}`}
                                      target="_blank"
                                      rel="noreferrer"
                                      className="inline-flex items-center gap-1 bg-indigo-650 hover:bg-indigo-700 text-white font-black uppercase tracking-widest text-[8px] px-3.5 py-2 rounded-lg transition-all"
                                    >
                                      Track Return Shipment
                                    </a>
                                  ) : (
                                    <a
                                      href={`https://www.google.com/search?q=track+${encodeURIComponent(item.self_shipping_details.courier_name)}+${encodeURIComponent(item.self_shipping_details.tracking_number)}`}
                                      target="_blank"
                                      rel="noreferrer"
                                      className="inline-flex items-center gap-1 bg-indigo-650 hover:bg-indigo-700 text-white font-black uppercase tracking-widest text-[8px] px-3.5 py-2 rounded-lg transition-all"
                                    >
                                      Track Return Shipment
                                    </a>
                                  )}
                                </div>
                                {item.self_shipping_details.notes && (
                                  <p className="text-[10px] text-slate-500 italic">Notes: {item.self_shipping_details.notes}</p>
                                )}
                              </div>
                            )}

                            {item.return_status === 'RETURN_APPROVED' && (
                              <div className="text-[10px] text-amber-800 font-extrabold bg-amber-50 p-3 rounded-xl border border-amber-100 flex flex-col gap-1">
                                <p className="uppercase tracking-wider font-black">Self-Shipping Status</p>
                                <p className="font-semibold text-slate-600">Self Shipping by customer is pending. The customer has a maximum of 3 days to submit courier/tracking details.</p>
                              </div>
                            )}

                            <div className="flex flex-wrap gap-2 pt-1 border-t border-slate-50">
                              {item.return_status === 'RETURN_REQUESTED' && (
                                <>
                                  <button
                                    onClick={() => handleItemReturnAction(selectedOrderForModal.id, item.product_id, 'approve')}
                                    className="bg-emerald-600 hover:bg-emerald-700 text-white font-black uppercase tracking-widest text-[8px] px-3.5 py-2 rounded-lg transition-all"
                                  >
                                    Approve Return
                                  </button>
                                  <button
                                    onClick={() => handleItemReturnAction(selectedOrderForModal.id, item.product_id, 'reject')}
                                    className="bg-rose-600 hover:bg-rose-700 text-white font-black uppercase tracking-widest text-[8px] px-3.5 py-2 rounded-lg transition-all"
                                  >
                                    Reject Return
                                  </button>
                                </>
                              )}

                              {item.return_status === 'SELF_SHIPPED' && (
                                 <button
                                   onClick={() => handleItemReceive(selectedOrderForModal.id, item.product_id)}
                                   className="bg-indigo-600 hover:bg-indigo-700 text-white font-black uppercase tracking-widest text-[8px] px-3.5 py-2 rounded-lg transition-all"
                                 >
                                   Mark Received
                                 </button>
                               )}

                               {item.return_status === 'RETURN_RECEIVED' && (
                                 <button
                                   onClick={() => handleOpenRefundModal(selectedOrderForModal.id, item.product_id, item)}
                                   className="bg-primary hover:bg-emerald-hover text-white font-black uppercase tracking-widest text-[8px] px-3.5 py-2 rounded-lg transition-all shadow-md shadow-emerald-glow"
                                 >
                                   Process Refund & Restock
                                 </button>
                               )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
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
                                <a
                                  href={fullUrl}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="w-full h-full block relative"
                                >
                                  <video src={fullUrl} className="w-full h-full object-cover" muted autoPlay loop playsInline />
                                  <div className="absolute inset-0 bg-black/30 flex items-center justify-center group-hover:bg-black/50 transition-colors">
                                    <div className="w-7 h-7 rounded-full bg-white/30 backdrop-blur-sm flex items-center justify-center text-white border border-white/20">
                                      <svg className="w-3 h-3 fill-current ml-0.5" viewBox="0 0 24 24">
                                        <path d="M8 5v14l11-7z" />
                                      </svg>
                                    </div>
                                  </div>
                                </a>
                              ) : (
                                <a
                                  href={fullUrl}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="w-full h-full block"
                                >
                                  <img
                                    src={fullUrl}
                                    onError={(e) => { e.target.src = '/logo-durga.png'; }}
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

              {/* Return Tracking Timeline */}
              {selectedOrderForModal.items?.some(i => i.return_status) && (() => {
                const returnedItems = (selectedOrderForModal.items || []).filter(i => i.return_status);
                const hasApproved = returnedItems.some(i => ['RETURN_APPROVED', 'SELF_SHIPPED', 'RETURN_RECEIVED', 'REFUND_COMPLETED'].includes(i.return_status));
                const hasSelfShipped = returnedItems.some(i => ['SELF_SHIPPED', 'RETURN_RECEIVED', 'REFUND_COMPLETED'].includes(i.return_status));
                const hasReceived = returnedItems.some(i => ['RETURN_RECEIVED', 'REFUND_COMPLETED'].includes(i.return_status));
                const hasRefunded = returnedItems.some(i => i.return_status === 'REFUND_COMPLETED') || selectedOrderForModal.payment_status === 'refunded' || selectedOrderForModal.order_status === 'refunded';
                const isRejected = returnedItems.some(i => i.return_status === 'RETURN_REJECTED') || selectedOrderForModal.order_status === 'return_rejected';
                const isRefundFailed = selectedOrderForModal.payment_status === 'refund_failed';

                let returnSteps = [];
                let progressWidth = '0%';
                let timelineTitle = 'Return Request Timeline';

                if (isRejected) {
                  returnSteps = [
                    { label: 'Return Requested', active: true, date: selectedOrderForModal.updated_at },
                    { label: 'Return Rejected', active: true, date: selectedOrderForModal.updated_at, rejected: true }
                  ];
                  progressWidth = '100%';
                  timelineTitle = 'Return Request Declined';
                } else if (hasRefunded || hasReceived || isRefundFailed) {
                  const isRefundInitiated = selectedOrderForModal.payment_status === 'refund_pending' || isRefundFailed || hasRefunded;
                  const isRefundCredited = hasRefunded || selectedOrderForModal.payment_status === 'refunded';
                  returnSteps = [
                    { label: 'Return Received', active: true, date: selectedOrderForModal.updated_at },
                    { label: 'Refund Initiated', active: isRefundInitiated, date: isRefundInitiated ? selectedOrderForModal.updated_at : null },
                    { label: isRefundFailed ? 'Refund Failed' : 'Refund Credited', active: isRefundCredited, date: isRefundCredited ? selectedOrderForModal.updated_at : null, rejected: isRefundFailed }
                  ];
                  progressWidth = isRefundCredited ? '100%' : isRefundInitiated ? '50%' : '0%';
                  timelineTitle = 'Refund Process Timeline';
                } else {
                  returnSteps = [
                    { label: 'Return Requested', active: true, date: selectedOrderForModal.created_at },
                    { label: 'Approved for Return', active: hasApproved, date: hasApproved ? selectedOrderForModal.updated_at : null },
                    { label: 'Self Shipped by User', active: hasSelfShipped, date: null },
                    { label: 'Physically Received', active: hasReceived, date: null }
                  ];
                  progressWidth = hasReceived ? '100%' : hasSelfShipped ? '66.6%' : hasApproved ? '33.3%' : '0%';
                  timelineTitle = 'Self-Shipment Tracking Timeline';
                }

                return (
                  <div className="bg-slate-50 border border-slate-200/60 rounded-3xl p-6 shadow-sm">
                    <div className="flex items-center justify-between mb-6 pb-2 border-b border-slate-200">
                      <h3 className="text-xs font-black text-slate-500 uppercase tracking-widest">{timelineTitle}</h3>
                    </div>
                    <div className="relative pt-6 pb-2 overflow-x-auto">
                      <div className="relative" style={{ minWidth: returnSteps.length === 2 ? '300px' : '560px' }}>
                        <div className="absolute top-[16px] left-[12%] right-[12%] h-1 bg-slate-250 -translate-y-1/2 rounded-full" />
                        <div
                          className={`absolute top-[16px] left-[12%] h-1 -translate-y-1/2 rounded-full transition-all duration-700 ease-out bg-primary`}
                          style={{ width: `calc(${progressWidth} * 0.76)` }}
                        />
                        <div className="relative flex justify-between px-[8%]">
                          {returnSteps.map((step, idx) => (
                            <div key={step.label} className="flex flex-col items-center text-center" style={{ width: `${100 / returnSteps.length}%` }}>
                              <div className={`w-8 h-8 rounded-full flex items-center justify-center border-4 border-white shadow-sm z-10 transition-all duration-300 ${
                                step.active
                                  ? step.rejected ? 'bg-rose-600 text-white ring-4 ring-rose-100' : 'bg-primary text-white ring-4 ring-primary/10'
                                  : 'bg-slate-200 text-slate-400'
                              }`}>
                                {step.active ? (step.rejected ? <XCircle className="w-3.5 h-3.5 stroke-[3px]" /> : <Check className="w-3.5 h-3.5 stroke-[3px]" />) : <span className="text-[10px] font-bold">{idx + 1}</span>}
                              </div>
                              <p className={`text-[10px] mt-2.5 leading-tight font-black ${step.active ? step.rejected ? 'text-rose-600' : 'text-primary' : 'text-slate-400'}`}>
                                {step.label}
                              </p>
                              {step.date && (
                                <p className="text-[8px] font-bold text-slate-400 mt-1">
                                  {new Date(step.date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}
                                </p>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })()}
            </div>

            {/* Modal Footer */}
            <div className="pt-5 border-t border-slate-100 flex flex-col sm:flex-row justify-between items-center gap-3">
              {selectedOrderForModal.payment_status === 'refund_pending' && (() => {
                const refundItems = (selectedOrderForModal.items || []).filter(i => i.return_status === 'REFUND_COMPLETED' || i.return_status === 'RETURN_RECEIVED');
                const itemsToSum = refundItems.length > 0 ? refundItems : (selectedOrderForModal.items || []);
                const totalRefundAmount = itemsToSum.reduce((sum, i) => {
                  const itemAmount = parseFloat(i.refund_calculations?.refundable_amount || 0);
                  const courierCost = parseFloat(i.self_shipping_details?.courier_cost || 0);
                  return sum + itemAmount + courierCost;
                }, 0);
                return (
                  <div className="text-[10px] text-slate-500 font-extrabold text-left w-full sm:w-auto">
                    Refund: <span className="font-mono text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200 select-all">₹{totalRefundAmount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                    {' → '}
                    <span className="font-mono text-slate-900 bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200 select-all">{selectedOrderForModal.shipping_address?.phone || 'customer'}</span>
                  </div>
                );
              })()}
              <div className="flex gap-3 justify-end w-full sm:w-auto shrink-0">
                {selectedOrderForModal.payment_status === 'refund_pending' && hasPermission('update_order_status') && (
                  <button
                    onClick={() => {
                      handleOpenOrderRefundModal(selectedOrderForModal);
                    }}
                    className="px-6 h-12 rounded-xl text-xs font-black uppercase tracking-widest bg-emerald-600 hover:bg-emerald-700 text-white transition-all hover:scale-[1.02] transform active:scale-[0.98] shadow-md shadow-emerald-glow"
                  >
                    Confirm Manual Refund Paid
                  </button>
                )}
                <button
                  onClick={() => setSelectedOrderForModal(null)}
                  className="px-6 h-12 rounded-xl text-xs font-black uppercase tracking-widest bg-slate-100 hover:bg-slate-200 text-slate-700 transition-all hover:scale-[1.02] transform active:scale-[0.98]"
                >
                  Close
                </button>
              </div>
            </div>

          </div>
        </div>
      )}

      {/* Manual Refund Payout Modal */}
      {refundModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[99999] flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-slate-200 max-w-md w-full p-6 md:p-8 shadow-2xl relative animate-in fade-in zoom-in-95 duration-200 text-slate-800">
            <button
              onClick={() => setRefundModal(null)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-650 transition-colors cursor-pointer"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>

            <div className="space-y-6">
              <div>
                <span className="text-[10px] font-mono font-black uppercase tracking-[0.2em] text-emerald-600 bg-emerald-50 px-3 py-1.5 rounded-full border border-emerald-100">
                  Manual Payout
                </span>
                <h3 className="text-xl font-black text-slate-900 mt-3 tracking-tight uppercase">Refund Settlement</h3>
                <p className="text-xs text-slate-500 font-semibold mt-1">
                  Decide the refund amount, scan the generated UPI QR code to make the manual transfer, and confirm once complete.
                </p>
              </div>

              {/* Product / Order info */}
              <div className="bg-slate-50 rounded-xl p-3.5 border border-slate-200/60 space-y-1 text-slate-700">
                {refundModal.isOrderLevel ? (
                  <>
                    <p className="text-xs font-bold">
                      Order: <span className="font-semibold text-slate-650">{refundModal.order?.order_number}</span>
                    </p>
                    <p className="text-xs font-bold">
                      Calculated Value: <span className="font-mono text-slate-600">₹{parseFloat(refundModal.initialAmount || 0).toFixed(2)}</span>
                    </p>
                    {refundModal.courierCost > 0 && (
                      <p className="text-xs font-bold">
                        Self-Ship Courier Cost: <span className="font-mono text-slate-600">₹{parseFloat(refundModal.courierCost || 0).toFixed(2)}</span>
                      </p>
                    )}
                    {(refundModal.refundItems || []).some(i => i.self_shipping_details?.invoice_url) && (
                      <div className="mt-2 space-y-1">
                        <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block">Self-Ship Receipts:</span>
                        {(refundModal.refundItems || []).filter(i => i.self_shipping_details?.invoice_url).map((i, idx) => (
                          <p key={idx} className="text-xs">
                            <a
                              href={formatImageUrl(i.self_shipping_details.invoice_url)}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-primary hover:underline font-bold inline-flex items-center gap-1"
                            >
                              Receipt for {i.product_name}
                            </a>
                          </p>
                        ))}
                      </div>
                    )}
                  </>
                ) : (
                  <>
                    <p className="text-xs font-bold">Product: <span className="font-semibold text-slate-600">{refundModal.item?.product_name}</span></p>
                    <p className="text-xs font-bold">Calculated Value: <span className="font-mono text-slate-600">₹{refundModal.initialAmount}</span></p>
                    {refundModal.item?.self_shipping_details?.courier_cost > 0 && (
                      <p className="text-xs font-bold">
                        Self-Ship Courier Cost: <span className="font-mono text-slate-600">₹{refundModal.item.self_shipping_details.courier_cost}</span>
                      </p>
                    )}
                    {refundModal.item?.self_shipping_details?.invoice_url && (
                      <p className="text-xs mt-1">
                        <a
                          href={formatImageUrl(refundModal.item.self_shipping_details.invoice_url)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-primary hover:underline font-bold inline-flex items-center gap-1"
                        >
                          View Self-Ship Invoice / Receipt
                        </a>
                      </p>
                    )}
                  </>
                )}
              </div>

              {/* Amount input */}
              <div>
                <label className="block text-[10px] font-black uppercase tracking-widest text-slate-500 mb-1.5">
                  Refund Payout Amount (₹)
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={refundAmountInput}
                  onChange={(e) => setRefundAmountInput(e.target.value)}
                  className="w-full h-11 px-4 border border-slate-200 rounded-xl text-sm font-bold focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary placeholder-slate-350 bg-slate-50/50"
                  placeholder="Enter payout amount"
                />
              </div>

              {/* UPI ID input */}
              <div>
                <label className="block text-[10px] font-black uppercase tracking-widest text-slate-500 mb-1.5 flex items-center justify-between">
                  <span>Customer UPI ID / VPA</span>
                  {isFetchingVpa && <span className="text-primary animate-pulse normal-case font-bold">Fetching...</span>}
                </label>
                <input
                  type="text"
                  value={upiVpaInput}
                  onChange={(e) => setUpiVpaInput(e.target.value)}
                  className="w-full h-11 px-4 border border-slate-200 rounded-xl text-sm font-mono focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary placeholder-slate-350 bg-slate-50/50"
                  placeholder="Enter UPI VPA (e.g. user@okaxis)"
                />
              </div>

              {/* QR Code section */}
              <div className="flex flex-col items-center justify-center py-4 border-t border-slate-200">
                {upiVpaInput ? (() => {
                  const amt = parseFloat(refundAmountInput) || 0;
                  const upiUri = `upi://pay?pa=${upiVpaInput}&pn=Customer&am=${amt.toFixed(2)}&cu=INR`;
                  const qrSrc = `https://api.qrserver.com/v1/create-qr-code/?size=160x160&data=${encodeURIComponent(upiUri)}`;
                  return (
                    <>
                      <div className="w-44 h-44 border-2 border-slate-200 p-2 rounded-2xl bg-white shadow-sm flex items-center justify-center">
                        <img src={qrSrc} alt="Refund QR Code" className="w-full h-full object-contain" />
                      </div>
                      <p className="text-[10px] text-slate-400 font-bold text-center mt-3 max-w-[280px] leading-relaxed">
                        Scan QR with any UPI app (GPay, PhonePe, Paytm) to automatically populate UPI ID and refund amount of ₹{amt.toFixed(2)}.
                      </p>
                    </>
                  );
                })() : (
                  <div className="w-full py-8 text-center text-xs text-slate-400 font-semibold bg-slate-50 rounded-xl border border-dashed border-slate-200">
                    Enter UPI VPA to generate the payment QR code
                  </div>
                )}
              </div>

              {/* Actions */}
              <div className="flex gap-3 pt-2">
                <button
                  onClick={() => setRefundModal(null)}
                  className="flex-1 h-12 rounded-xl text-xs font-black uppercase tracking-widest bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  onClick={() => handleConfirmManualRefundItem(true)}
                  className="flex-1 h-12 rounded-xl text-xs font-black uppercase tracking-widest bg-emerald-600 hover:bg-emerald-700 text-white transition-colors cursor-pointer shadow-md shadow-emerald-glow"
                  disabled={!upiVpaInput || !refundAmountInput}
                >
                  Confirm Refund Paid
                </button>
              </div>
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
