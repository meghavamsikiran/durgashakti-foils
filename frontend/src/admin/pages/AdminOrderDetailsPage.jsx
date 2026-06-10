import React, { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import adminService from '../services/admin.service';
import apiClient from '../../services/core/apiClient';
import {
  ShoppingBag, Clock, CheckCircle2, Truck, AlertCircle,
  XCircle, RefreshCcw, IndianRupee, Eye, Check, Copy, ArrowLeft
} from 'lucide-react';
import PageLoader from '../../components/ui/PageLoader';
import { useAuth } from '../../contexts/AuthContext';
import { formatImageUrl } from '../../utils/api';

const COURIER_OPTIONS = ["BlueDart", "DTDC", "Delhivery", "India Post", "Ecom Express", "XpressBees", "Shadowfax", "Ekart Logistics", "DHL", "Professional Couriers", "Other"];

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
  REFUND_PENDING: 'Refund Initiated',
  REFUND_FAILED: 'Refund Failed',
  RETURN_APPROVED_PENDING_SHIP: 'Return Approved (Self-Ship Pending)',
  SELF_SHIPPED: 'Self-Shipped by Customer',
  RETURN_RECEIVED: 'Return Received',
};

const uiStatus = (status) => (status || '').toUpperCase();
const getDisplayStatus = (order) => {
  if (!order) return 'PENDING';
  const payStatus = String(order.payment_status || '').toLowerCase();
  const ordStatus = String(order.status || order.order_status || 'PENDING').toUpperCase();
  
  if (payStatus === 'refund_pending') return 'REFUND_PENDING';
  if (payStatus === 'refund_failed') return 'REFUND_FAILED';
  if (payStatus === 'refunded') return 'REFUNDED';
  
  if (ordStatus === 'RETURN_APPROVED') {
    const items = order.items || [];
    const hasReceived = items.some(i => i.return_status === 'RETURN_RECEIVED');
    const hasSelfShipped = items.some(i => i.return_status === 'SELF_SHIPPED');
    const hasApproved = items.some(i => i.return_status === 'RETURN_APPROVED');
    
    if (hasReceived) return 'RETURN_RECEIVED';
    if (hasSelfShipped) return 'SELF_SHIPPED';
    if (hasApproved) return 'RETURN_APPROVED_PENDING_SHIP';
  }
  
  return ordStatus;
};

const statusLabel = (status) => STATUS_LABELS[uiStatus(status)] || uiStatus(status).replace(/_/g, ' ');
const PhoneIcon = ({ className }) => (
  <svg className={className} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/></svg>
);

const AdminOrderDetailsPage = () => {
  const { id: orderId } = useParams();
  const navigate = useNavigate();
  const { hasPermission } = useAuth();
  
  // Try loading cached order details from localStorage first
  const [order, setOrder] = useState(() => {
    try {
      const cached = localStorage.getItem(`admin_order_detail_${orderId}`);
      return cached ? JSON.parse(cached) : null;
    } catch (e) {
      return null;
    }
  });

  const [loading, setLoading] = useState(!order);
  const [submitting, setSubmitting] = useState(false);
  const [refundModal, setRefundModal] = useState(null);
  const [refundAmountInput, setRefundAmountInput] = useState('');
  const [upiVpaInput, setUpiVpaInput] = useState('');
  const [isFetchingVpa, setIsFetchingVpa] = useState(false);
  const [pendingActionIds, setPendingActionIds] = useState(new Set());
  const [messageModal, setMessageModal] = useState(null);
  const [adminMessage, setAdminMessage] = useState('');
  const [timeLeft, setTimeLeft] = useState(null);
  const [shipExchangeModal, setShipExchangeModal] = useState(null);
  const [exCourierName, setExCourierName] = useState('');
  const [exTrackingNumber, setExTrackingNumber] = useState('');
  const [exExpectedDate, setExExpectedDate] = useState('');
  const [exNotes, setExNotes] = useState('');
  const [submittingExShip, setSubmittingExShip] = useState(false);

  const fetchOrderDetails = useCallback(async (silent = false) => {
    if (!silent && !order) setLoading(true);
    try {
      const response = await adminService.getOrderDetails(orderId);
      setOrder(response.data);
      try {
        localStorage.setItem(`admin_order_detail_${orderId}`, JSON.stringify(response.data));
      } catch (e) {}
    } catch (err) {
      toast.error(err.message || 'Failed to fetch order details');
    } finally {
      setLoading(false);
    }
  }, [orderId, order]);

  useEffect(() => {
    fetchOrderDetails();
  }, [fetchOrderDetails]);

  // Online Payment Timer Expiry Countdown (15 minutes)
  useEffect(() => {
    if (!order) {
      setTimeLeft(null);
      return;
    }
    
    const isOnlinePending = 
      order.payment_status !== 'Paid' &&
      order.payment_status !== 'completed' &&
      (order.payment_method || '').toLowerCase() !== 'cod' &&
      !['cancelled', 'refunded', 'failed', 'return_approved'].includes((order.order_status || '').toLowerCase());

    if (!isOnlinePending) {
      setTimeLeft(null);
      return;
    }

    const calculateTimeLeft = () => {
      const createdTime = new Date(order.created_at).getTime();
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
        fetchOrderDetails(true);
      }
    }, 1000);

    return () => clearInterval(timer);
  }, [order, fetchOrderDetails]);

  const handleItemReturnAction = async (orderId, productId, action, remarks = '') => {
    const actionKey = `${productId}-${action}`;
    setPendingActionIds(prev => {
      const next = new Set(prev);
      next.add(actionKey);
      return next;
    });
    const toastId = toast.loading(`${action === 'approve' ? 'Approving' : 'Rejecting'} item return...`);
    try {
      const response = await apiClient.post(`/admin/orders/${orderId}/items/${productId}/return-action`, { action, remarks });
      apiClient.invalidateCache('/admin/orders');
      const serverOrder = response?.data?.order;
      if (serverOrder) {
        setOrder(serverOrder);
      }
      setMessageModal(null);
      setAdminMessage('');
      toast.success(`Item return ${action}d successfully`, { id: toastId });
      setTimeout(() => fetchOrderDetails(true), 800);
    } catch (err) {
      toast.error(err?.response?.data?.detail || `Failed to process item return ${action}`, { id: toastId });
    } finally {
      setPendingActionIds(prev => {
        const next = new Set(prev);
        next.delete(actionKey);
        return next;
      });
    }
  };

  const handleItemReceive = async (orderId, productId) => {
    const actionKey = `${productId}-receive`;
    setPendingActionIds(prev => {
      const next = new Set(prev);
      next.add(actionKey);
      return next;
    });
    const toastId = toast.loading('Marking item as received...');
    try {
      const response = await apiClient.post(`/admin/orders/${orderId}/items/${productId}/receive`);
      apiClient.invalidateCache('/admin/orders');
      const serverOrder = response?.data?.order;
      if (serverOrder) {
        setOrder(serverOrder);
      } else {
        setOrder(prev => {
          if (!prev) return prev;
          const updatedItems = (prev.items || []).map(item => {
            if (item.product_id === productId) {
              return { ...item, return_status: item.return_type === 'exchange' ? 'EXCHANGE_RECEIVED' : 'RETURN_RECEIVED' };
            }
            return item;
          });
          return { ...prev, items: updatedItems };
        });
      }
      toast.success('Item marked as received', { id: toastId });
      await fetchOrderDetails(true);
    } catch (err) {
      toast.error(err?.response?.data?.detail || 'Failed to mark item as received', { id: toastId });
    } finally {
      setPendingActionIds(prev => {
        const next = new Set(prev);
        next.delete(actionKey);
        return next;
      });
    }
  };

  const handleItemProcessRefund = async (orderId, productId, restock = true) => {
    const actionKey = `${productId}-refund`;
    setPendingActionIds(prev => {
      const next = new Set(prev);
      next.add(actionKey);
      return next;
    });
    const toastId = toast.loading('Processing refund...');
    try {
      const response = await apiClient.post(`/admin/orders/${orderId}/items/${productId}/process-refund?restock=${restock}`);
      apiClient.invalidateCache('/admin/orders');
      const serverOrder = response?.data?.order;
      if (serverOrder) {
        setOrder(serverOrder);
      }
      if (response?.data?.warning) {
        toast.warning(response.data.warning, { duration: 8000, id: toastId });
      } else {
        toast.success('Refund processed successfully', { id: toastId });
      }
      setTimeout(() => fetchOrderDetails(true), 800);
    } catch (err) {
      toast.error(err?.response?.data?.detail || 'Failed to process refund', { id: toastId });
    } finally {
      setPendingActionIds(prev => {
        const next = new Set(prev);
        next.delete(actionKey);
        return next;
      });
    }
  };

  const handleItemCompleteExchange = async (orderId, productId) => {
    const actionKey = `${productId}-complete-exchange`;
    setPendingActionIds(prev => {
      const next = new Set(prev);
      next.add(actionKey);
      return next;
    });
    const toastId = toast.loading('Completing exchange...');
    try {
      const response = await apiClient.post(`/admin/orders/${orderId}/items/${productId}/complete-exchange`);
      apiClient.invalidateCache('/admin/orders');
      const serverOrder = response?.data?.order;
      if (serverOrder) {
        setOrder(serverOrder);
      }
      toast.success('Exchange completed successfully', { id: toastId });
      setTimeout(() => fetchOrderDetails(true), 800);
    } catch (err) {
      toast.error(err?.response?.data?.detail || 'Failed to complete exchange', { id: toastId });
    } finally {
      setPendingActionIds(prev => {
        const next = new Set(prev);
        next.delete(actionKey);
        return next;
      });
    }
  };

  const handleShipExchangeSubmit = async (e) => {
    e.preventDefault();
    if (!exCourierName || !exTrackingNumber) {
      toast.error('Courier name and Tracking number are required');
      return;
    }
    setSubmittingExShip(true);
    const toastId = toast.loading('Submitting exchange shipping details...');
    try {
      const payload = {
        exchange_courier_name: exCourierName,
        exchange_tracking_number: exTrackingNumber,
        exchange_expected_delivery_date: exExpectedDate || null,
        exchange_shipment_notes: exNotes || null
      };
      const response = await apiClient.post(`/admin/orders/${shipExchangeModal.orderId}/items/${shipExchangeModal.productId}/ship-exchange`, payload);
      apiClient.invalidateCache('/admin/orders');
      const serverOrder = response?.data?.order;
      if (serverOrder) {
        setOrder(serverOrder);
      }
      toast.success('Exchange shipment details submitted successfully', { id: toastId });
      setShipExchangeModal(null);
      setExCourierName('');
      setExTrackingNumber('');
      setExExpectedDate('');
      setExNotes('');
      setTimeout(() => fetchOrderDetails(true), 800);
    } catch (err) {
      toast.error(err?.response?.data?.detail || 'Failed to submit exchange shipping details', { id: toastId });
    } finally {
      setSubmittingExShip(false);
    }
  };

  const handleOpenRefundModal = async (productId, item) => {
    const calc = item.refund_calculations || {};
    const initialAmount = parseFloat(calc.refundable_amount || 0);
    const courierCost = ['REFUND_COMPLETED', 'REFUND_INITIATED'].includes(item.return_status) ? 0 : parseFloat(item.self_shipping_details?.courier_cost || 0);
    const totalRefundDefault = Math.round((initialAmount + courierCost) * 100) / 100;
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
      // Ignore
    } finally {
      setIsFetchingVpa(false);
    }
  };

  const handleOpenOrderRefundModal = async (orderData) => {
    const hasReturnRequest = (orderData.items || []).some(i => i.return_status);
    const itemsToSum = hasReturnRequest
      ? (orderData.items || []).filter(i => ['RETURN_APPROVED', 'SELF_SHIPPED', 'RETURN_RECEIVED', 'REFUND_INITIATED', 'REFUND_COMPLETED'].includes(i.return_status))
      : (orderData.items || []);
    
    const initialAmount = itemsToSum.reduce((sum, i) => sum + parseFloat(i.refund_calculations?.refundable_amount || 0), 0);
    const courierCost = itemsToSum.reduce((sum, i) => sum + (['REFUND_COMPLETED', 'REFUND_INITIATED'].includes(i.return_status) ? 0 : parseFloat(i.self_shipping_details?.courier_cost || 0)), 0);
    const totalRefundDefault = Math.round((initialAmount + courierCost) * 100) / 100;

    setRefundModal({
      orderId: orderData.id,
      isOrderLevel: true,
      refundItems: itemsToSum,
      initialAmount,
      courierCost,
      totalRefundDefault,
      order: orderData
    });
    setRefundAmountInput(String(totalRefundDefault));
    setUpiVpaInput('');
    setIsFetchingVpa(true);
    try {
      const response = await apiClient.get(`/admin/orders/${orderData.id}/payment-vpa`);
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
    const { productId, isOrderLevel } = refundModal;
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
        apiClient.invalidateCache('/admin/orders');
        const serverOrder = response?.data?.order;
        if (serverOrder) {
          setOrder(serverOrder);
        }
        toast.success(response?.data?.message || 'Manual refund confirmed successfully.', { id: toastId });
        setRefundModal(null);
        setTimeout(() => fetchOrderDetails(true), 800);
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
      apiClient.invalidateCache('/admin/orders');
      const serverOrder = response?.data?.order;
      if (serverOrder) {
        setOrder(serverOrder);
      }
      toast.success('Manual refund confirmed successfully!', { id: toastId });
      setRefundModal(null);
      setTimeout(() => fetchOrderDetails(true), 800);
    } catch (err) {
      toast.error(err?.response?.data?.detail || 'Failed to process manual refund', { id: toastId });
    }
  };

  const retryRefund = async (orderId) => {
    const toastId = toast.loading('Initiating Razorpay refund...');
    try {
      setPendingActionIds(prev => new Set(prev).add(orderId));
      setSubmitting(true);
      const response = await adminService.retryRefund(orderId);
      const serverOrder = response?.data?.order;
      if (serverOrder) {
        setOrder(serverOrder);
      }
      toast.success(response?.data?.message || 'Razorpay refund has been initiated and is pending bank confirmation.', { id: toastId });
      setTimeout(() => fetchOrderDetails(true), 800);
    } catch (err) {
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

  const updateStatus = async (orderId, newStatus, message = '', extraData = {}) => {
    const toastId = toast.loading('Updating order...');
    try {
      setPendingActionIds(prev => new Set(prev).add(orderId));
      setSubmitting(true);
      setMessageModal(null);
      setAdminMessage('');
      const response = await adminService.updateOrderStatus(orderId, { status: newStatus, admin_message: message, ...extraData });
      const serverOrder = response?.data?.order;
      if (serverOrder) {
        setOrder(serverOrder);
      }
      if (response?.data?.warning) {
        toast.warning(response.data.warning, { duration: 8000 });
      }
      toast.success(`Order status updated to ${statusLabel(newStatus)}`, { id: toastId });
      setTimeout(() => fetchOrderDetails(true), 800);
    } catch (err) {
      const detail = err?.data?.detail || err?.response?.data?.detail || err?.message;
      if (err.status === 400 && String(detail).includes('Razorpay account has insufficient balance')) {
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

  if (loading) return <PageLoader message="Fetching order information..." />;
  if (!order) {
    return (
      <div className="p-8 text-center bg-rose-50 border border-rose-100 rounded-3xl text-rose-600 font-bold text-sm">
        Order details not found.
      </div>
    );
  }

  // Restore the exact layout structure of the previous modal body
  return (
    <div className="min-h-screen bg-slate-50/50 p-4 md:p-8 flex items-center justify-center">
      <div className="bg-white rounded-[2.5rem] p-8 max-w-5xl w-full border border-slate-100 shadow-2xl flex flex-col animate-in zoom-in-95 duration-300">

        {/* Header */}
        <div className="flex items-center justify-between pb-5 border-b border-slate-100">
          <div>
            <div className="flex items-center gap-3 mb-1">
              <div className="w-10 h-10 rounded-2xl bg-primary text-white flex items-center justify-center">
                <ShoppingBag className="w-5 h-5" />
              </div>
              <h2 className="text-2xl font-black text-slate-900 uppercase tracking-tight">Order Details</h2>
            </div>
            <p className="text-[10px] font-black uppercase tracking-widest text-slate-500 ml-1">
              Order #{order.order_number} • Placed {new Date(order.created_at).toLocaleString('en-IN')}
            </p>
          </div>
          <button
            onClick={() => window.close()}
            className="w-12 h-12 rounded-2xl bg-slate-50 border border-slate-200 flex items-center justify-center text-slate-500 hover:text-slate-900 transition-all hover:scale-105"
          >
            <XCircle className="w-6 h-6" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 py-6 space-y-6">

          {/* 3-Column Info Card (Ship to | Payment Details | Order Summary) */}
          <div className="bg-slate-50/50 rounded-3xl border border-slate-200/60 p-6 grid grid-cols-1 md:grid-cols-3 gap-6 divide-y md:divide-y-0 md:divide-x divide-slate-200/60 shadow-sm">

            {/* Column 1: Ship to */}
            <div className="space-y-2">
              <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Shipping Address</h4>
              <div className="text-xs text-slate-600 leading-relaxed space-y-0.5 font-semibold">
                <p className="font-extrabold text-slate-900">{order.shipping_address?.full_name || 'Guest User'}</p>
                <p>{order.shipping_address?.address_line1 || 'N/A'}</p>
                {order.shipping_address?.address_line2 && <p>{order.shipping_address.address_line2}</p>}
                <p>{order.shipping_address?.city}, {order.shipping_address?.state} - {order.shipping_address?.pincode}</p>
                <p className="text-slate-500 font-extrabold mt-2.5 flex items-center gap-1">
                  <PhoneIcon className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                  {order.customer_phone || order.shipping_address?.phone || 'N/A'}
                </p>
              </div>
            </div>

            {/* Column 2: Payment Details */}
            <div className="space-y-2 pt-4 md:pt-0 md:pl-6">
              <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Payment Method</h4>
              <div className="text-xs text-slate-500 space-y-2 font-semibold">
                {(() => {
                  const isCod = String(order.payment_method || '').toLowerCase() === 'cod';
                  const paymentStatus = String(order.payment_status || '').toLowerCase();
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
                        {order.transaction_id && (
                           <div className="pt-1 mt-1 border-t border-slate-200/50 space-y-0.5">
                             <p className="text-[8px] text-slate-400 font-black uppercase">Transaction ID</p>
                             <p className="font-mono text-slate-800 break-all select-all flex items-center gap-1.5">
                               {order.transaction_id === 'COD' ? 'COD' : order.transaction_id}
                               {order.transaction_id !== 'COD' && (
                                 <button
                                   onClick={() => {
                                     navigator.clipboard.writeText(order.transaction_id);
                                     toast.success('Transaction ID copied!');
                                   }}
                                   className="p-0.5 text-slate-400 hover:text-slate-600 transition-colors inline-flex items-center"
                                   title="Copy Transaction ID"
                                 >
                                   <Copy className="w-3 h-3" />
                                 </button>
                               )}
                             </p>
                           </div>
                         )}
                         {order.razorpay_payment_id && order.razorpay_payment_id !== order.transaction_id && (
                           <div className="pt-1 mt-1 border-t border-slate-200/50 space-y-0.5">
                             <p className="text-[8px] text-slate-400 font-black uppercase">Customer Razorpay ID</p>
                             <p className="font-mono text-slate-800 break-all select-all flex items-center gap-1.5">
                               {order.razorpay_payment_id}
                               <button
                                 onClick={() => {
                                   navigator.clipboard.writeText(order.razorpay_payment_id);
                                   toast.success('Razorpay ID copied!');
                                 }}
                                 className="p-0.5 text-slate-400 hover:text-slate-600 transition-colors inline-flex items-center"
                                 title="Copy Razorpay ID"
                               >
                                 <Copy className="w-3 h-3" />
                               </button>
                             </p>
                           </div>
                         )}
                        {/* Refund Payout details helper */}
                        {order.payment_status === 'refund_pending' && (() => {
                          const refundItems = (order.items || []).filter(i => ['REFUND_COMPLETED', 'REFUND_INITIATED'].includes(i.return_status));
                          const totalRefundAmount = refundItems.reduce((sum, i) => sum + parseFloat(i.refund_calculations?.refundable_amount || 0), 0);
                          const selfShipCost = refundItems.reduce((sum, i) => sum + (['REFUND_COMPLETED', 'REFUND_INITIATED'].includes(i.return_status) ? 0 : parseFloat(i.self_shipping_details?.courier_cost || 0)), 0);
                          const isCod = String(order.payment_method || '').toLowerCase() === 'cod';
                          return (
                            <div className="pt-1.5 mt-1 border-t border-dashed border-sky-200 text-sky-900 leading-snug space-y-1.5">
                              <p className="text-[8px] font-black uppercase text-sky-700">{isCod ? 'Manual' : 'Automatic'} Refund Payout Details</p>
                              {totalRefundAmount > 0 && (
                                <p className="text-[11px] font-black text-emerald-700 bg-emerald-50 px-2 py-1 rounded-lg border border-emerald-100">
                                  Refund Amount: ₹{totalRefundAmount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                </p>
                              )}
                              {selfShipCost > 0 && (
                                <p className="text-[10px] text-slate-600">Self-Ship Courier Cost: ₹{selfShipCost.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
                              )}
                              {isCod ? (
                                <>
                                  <p>Customer Phone: <span className="font-mono font-extrabold bg-white px-1 py-0.5 rounded border border-sky-100 select-all">{order.shipping_address?.phone || 'N/A'}</span></p>
                                  <p className="text-[8px] text-sky-600 font-medium mt-1">Please settle the refund amount manually via UPI / bank transfer and click "Confirm Manual Refund Paid" below.</p>
                                </>
                              ) : (
                                <p className="text-[8px] text-sky-600 font-medium mt-1">The refund has been automatically initiated via Razorpay and will credit to the original payment method. Webhook/reconciliation will update status once credited.</p>
                              )}
                            </div>
                          );
                        })()}
                        {order.transaction_date && (
                          <p className="text-slate-500">Date: {new Date(order.transaction_date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}</p>
                        )}
                        {order.refund_error && (
                          <p className="text-rose-700 normal-case tracking-normal leading-snug font-semibold">
                            {order.refund_error}
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
                const metadata = order.shipping_address?.shipping_metadata;
                const subtotal = metadata?.subtotal ?? (order.items?.reduce((acc, item) => acc + (item.price * item.quantity), 0) || 0);
                const shipping = metadata?.shipping_cost ?? (Number(order.total_amount) > subtotal ? 350.0 : 0.0);
                const cgst = metadata?.cgst_amount ?? (Number(order.total_amount) > subtotal ? subtotal * 0.09 : 0.0);
                const sgst = metadata?.sgst_amount ?? (Number(order.total_amount) > subtotal ? subtotal * 0.09 : 0.0);
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
                      <span className="text-primary text-base">₹{Number(order.total_amount).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
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
                order.status === 'DELIVERED' ? 'bg-emerald-100 text-emerald-800' :
                order.status === 'CANCELLED' ? 'bg-rose-100 text-rose-800' :
                'bg-primary/10 text-primary'
              }`}>
                {(order.status || order.order_status || 'PENDING').replace('_', ' ')}
              </span>
            </div>

            {(() => {
              const status = (order.status || order.order_status || '').toLowerCase();
              const isConfirmed = ['confirmed', 'packaging', 'packed', 'shipped', 'in_transit', 'out_for_delivery', 'delivered', 'return_requested', 'return_approved', 'return_rejected', 'refunded'].includes(status);
              const isShipped = ['shipped', 'in_transit', 'out_for_delivery', 'delivered', 'return_requested', 'return_approved', 'return_rejected', 'refunded'].includes(status);
              const isInTransit = ['in_transit', 'out_for_delivery', 'delivered', 'return_requested', 'return_approved', 'return_rejected', 'refunded'].includes(status);
              const isOutForDelivery = ['out_for_delivery', 'delivered', 'return_requested', 'return_approved', 'return_rejected', 'refunded'].includes(status);
              const isDelivered = ['delivered', 'return_requested', 'return_approved', 'return_rejected', 'refunded'].includes(status);

              const steps = [
                { label: 'Placed', active: true, date: order.created_at },
                { label: 'Confirmed', active: isConfirmed, date: isConfirmed ? order.created_at : null },
                { label: 'Shipped', active: isShipped, date: isShipped ? (order.shipped_at || order.updated_at) : null },
                { label: 'In Transit', active: isInTransit, date: null },
                { label: 'Out For Delivery', active: isOutForDelivery, date: null },
                { label: 'Delivered', active: isDelivered, date: isDelivered ? (order.delivered_at || order.updated_at) : null },
              ];

              if (status === 'cancelled') {
                return (
                  <div className="flex items-center gap-3 bg-rose-50 border border-rose-100 rounded-xl p-3 text-rose-800 font-semibold text-xs">
                    <XCircle className="w-5 h-5 text-rose-600 shrink-0" />
                    <div>
                      <p className="font-extrabold text-rose-900">Order Cancelled</p>
                      <p className="text-rose-600 mt-0.5">This order was marked as cancelled on {new Date(order.updated_at || order.created_at).toLocaleString('en-IN')}</p>
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
              Order Items ({order.items?.length || 0})
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
                  {order.items?.map((item, idx) => (
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
          {order.tracking_id && (
            <div className="bg-sky-50/60 dark:bg-[#19231F] border border-sky-100/80 dark:border-[#26322B] rounded-3xl p-5 shadow-sm flex items-start gap-4 animate-in fade-in duration-300">
              <Truck className="w-6 h-6 text-sky-600 dark:text-sky-400 shrink-0 mt-0.5" />
              <div>
                <h4 className="text-[10px] font-black text-sky-700 dark:text-sky-400 uppercase tracking-widest mb-1.5">Courier & Tracking details</h4>
                <div className="text-xs text-slate-600 leading-relaxed font-semibold">
                  <p>Carrier Name: <span className="font-extrabold text-slate-900">{order.carrier || 'Courier'}</span></p>
                   <p className="mt-0.5 flex items-center gap-1.5">
                    Tracking Number: <span className="font-mono text-slate-900 select-all font-extrabold">{order.tracking_id}</span>
                    <button
                      onClick={() => {
                        navigator.clipboard.writeText(order.tracking_id);
                        toast.success('Tracking number copied!');
                      }}
                      className="p-0.5 text-slate-400 hover:text-slate-650 transition-colors inline-flex items-center"
                      title="Copy Tracking Number"
                    >
                      <Copy className="w-3.5 h-3.5" />
                    </button>
                  </p>
                  {order.tracking_url && (
                    <div className="pt-2">
                      <a
                        href={order.tracking_url}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1 bg-sky-600 hover:bg-sky-700 text-white font-black uppercase tracking-widest text-[8px] px-3.5 py-2 rounded-lg transition-all shadow-sm w-fit"
                      >
                        Track Shipment
                      </a>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Return Details Panel inside modal */}
          {order.return_reason && (
            <div className="bg-amber-50/70 dark:bg-[#19231F] border border-amber-100 dark:border-[#26322B] rounded-3xl p-6 shadow-sm flex flex-col md:flex-row gap-6 items-start animate-in slide-in-from-bottom-2 duration-300">
              <div className="flex-1 space-y-4">
                <div className="flex items-center justify-between pb-2 border-b border-amber-100/50 dark:border-[#26322B]">
                  <h4 className="text-[10px] font-black text-amber-700 dark:text-amber-400 uppercase tracking-widest flex items-center gap-2">
                    <RefreshCcw className="w-4 h-4 shrink-0" />
                    Return Request Details
                  </h4>
                  <span className={`text-[9px] font-black uppercase tracking-widest px-2.5 py-1 rounded-full ${
                    getDisplayStatus(order) === 'REFUND_PENDING' ? 'bg-sky-100 text-sky-800 animate-pulse' :
                    getDisplayStatus(order) === 'REFUND_FAILED' ? 'bg-rose-100 text-rose-800 border border-rose-200' :
                    getDisplayStatus(order) === 'REFUNDED' ? 'bg-emerald-100 text-emerald-800' :
                    order.status === 'RETURN_APPROVED' ? 'bg-emerald-100 text-emerald-800' :
                    order.status === 'RETURN_REJECTED' ? 'bg-rose-100 text-rose-800' :
                    'bg-amber-100 text-amber-800'
                  }`}>
                    {statusLabel(getDisplayStatus(order))}
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <div className="text-[9px] font-black text-slate-400 dark:text-slate-300 uppercase tracking-widest">Customer Return Reason</div>
                    <div className="text-xs font-bold text-slate-800 dark:text-white bg-white dark:bg-[#131B17] p-3 rounded-xl border border-slate-100/60 dark:border-[#26322B] leading-relaxed shadow-sm">{order.return_reason}</div>
                  </div>

                  {order.admin_message && (
                    <div className="space-y-1">
                      <div className="text-[9px] font-black text-primary dark:text-[#25D958] uppercase tracking-widest">Admin Resolution Remarks</div>
                      <div className="text-xs font-bold text-slate-800 dark:text-white bg-white dark:bg-[#131B17] p-3 rounded-xl border border-slate-100/60 dark:border-[#26322B] leading-relaxed shadow-sm">{order.admin_message}</div>
                    </div>
                  )}
                </div>

                <div className="mt-4 space-y-3.5">
                  <div className="text-[10px] font-black text-slate-500 dark:text-slate-300 uppercase tracking-widest">Items In This Return Request</div>
                  <div className="space-y-3">
                    {order.items?.filter(item => item.return_status).map((item, idx) => (
                      <div key={idx} className="bg-white border border-slate-100 rounded-2xl p-4 shadow-sm space-y-3">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3 flex-1 min-w-0">
                            {item.image_url && (
                              <img 
                                src={formatImageUrl(item.image_url)} 
                                onError={(e) => { e.target.src = '/logo-durga.webp'; }}
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
                            item.return_status === 'RETURN_REQUESTED' || item.return_status === 'EXCHANGE_REQUESTED' ? 'bg-amber-100 text-amber-800' :
                            item.return_status === 'RETURN_APPROVED' || item.return_status === 'EXCHANGE_APPROVED' ? 'bg-sky-100 text-sky-800' :
                            item.return_status === 'SELF_SHIPPED' ? 'bg-indigo-100 text-indigo-800' :
                            item.return_status === 'RETURN_RECEIVED' || item.return_status === 'EXCHANGE_RECEIVED' ? 'bg-purple-100 text-purple-800' :
                            item.return_status === 'EXCHANGE_SHIPPED' ? 'bg-blue-100 text-blue-800' :
                            item.return_status === 'REFUND_COMPLETED' || item.return_status === 'EXCHANGE_COMPLETED' ? 'bg-emerald-100 text-emerald-800' :
                            'bg-rose-100 text-rose-800'
                          }`}>
                            {item.return_status.replace('_', ' ')}
                          </span>
                        </div>

                        {item.return_type !== 'exchange' && item.refund_calculations && (() => {
                          const prodRefund = Number(item.refund_calculations.refundable_amount || 0);
                          const courierRefund = Number(item.self_shipping_details?.courier_cost || 0);
                          const isRefunded = ['REFUND_COMPLETED', 'REFUND_INITIATED'].includes(item.return_status);
                          const actualProductRefund = isRefunded ? Math.max(0, prodRefund - courierRefund) : prodRefund;
                          const totalRefundable = isRefunded ? prodRefund : (prodRefund + courierRefund);
                          
                          return (
                            <div className="text-[10px] font-extrabold text-slate-500 bg-slate-50 p-2.5 rounded-xl flex flex-wrap gap-x-4 gap-y-1 w-full">
                              <span>Taxable: ₹{Number(item.refund_calculations.taxable_amount || 0).toFixed(2)}</span>
                              <span>CGST 9%: ₹{Number(item.refund_calculations.cgst_amount || 0).toFixed(2)}</span>
                              <span>SGST 9%: ₹{Number(item.refund_calculations.sgst_amount || 0).toFixed(2)}</span>
                              <span>Discount Share: -₹{Number(item.refund_calculations.coupon_discount_share || 0).toFixed(2)}</span>
                              <span className="text-primary font-black w-full mt-1 border-t border-slate-200/50 pt-1">
                                Est. Refundable: ₹{totalRefundable.toFixed(2)} 
                                {courierRefund > 0 ? ` (Product: ₹${actualProductRefund.toFixed(2)} + Courier: ₹${courierRefund.toFixed(2)})` : ''}
                              </span>
                            </div>
                          );
                        })()}

                        {item.self_shipping_details && (
                          <div className="text-[10px] text-slate-650 font-bold bg-slate-50 p-3 rounded-xl border border-slate-100 space-y-1.5">
                            <p className="text-[9px] text-indigo-700 font-black uppercase tracking-wider">Self-Shipping Proof Details</p>
                            <div className="grid grid-cols-2 gap-2">
                              <p>Courier: <span className="font-extrabold text-slate-900">{item.self_shipping_details.courier_name}</span></p>
                              <p className="flex items-center gap-1.5">
                                Tracking #: <span className="font-mono font-extrabold text-slate-900 select-all">{item.self_shipping_details.tracking_number}</span>
                                <button
                                  onClick={() => {
                                    navigator.clipboard.writeText(item.self_shipping_details.tracking_number);
                                    toast.success('Tracking number copied!');
                                  }}
                                  className="p-0.5 text-slate-400 hover:text-slate-650 transition-colors inline-flex items-center"
                                  title="Copy Tracking Number"
                                >
                                  <Copy className="w-3 h-3" />
                                </button>
                              </p>
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
                              {(() => {
                                const rawNum = item.self_shipping_details.tracking_number;
                                const cleanNum = rawNum ? String(rawNum).trim() : '';
                                const trackUrl = cleanNum ? `https://t.17track.net/en#nums=${cleanNum}` : '';
                                return (
                                  <a
                                    href={trackUrl || '#'}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="inline-flex items-center gap-1 bg-indigo-600 hover:bg-indigo-700 text-white font-black uppercase tracking-widest text-[8px] px-3.5 py-2 rounded-lg transition-all shadow-sm"
                                  >
                                    Track Return Shipment
                                  </a>
                                );
                              })()}
                            </div>
                            {item.self_shipping_details.notes && (
                              <p className="text-[10px] text-slate-500 italic">Notes: {item.self_shipping_details.notes}</p>
                            )}
                          </div>
                        )}

                        {(item.return_status === 'RETURN_APPROVED' || item.return_status === 'EXCHANGE_APPROVED') && (
                          <div className="text-[10px] text-amber-800 font-extrabold bg-amber-50 p-3 rounded-xl border border-amber-100 flex flex-col gap-1">
                            <p className="uppercase tracking-wider font-black">Self-Shipping Status</p>
                            <p className="font-semibold text-slate-600">Self Shipping by customer is pending. The customer has a maximum of 3 days to submit courier/tracking details.</p>
                          </div>
                        )}

                        {item.exchange_shipping_details && (
                          <div className="text-[10px] text-sky-800 font-extrabold bg-sky-50 p-3 rounded-xl border border-sky-105 flex flex-col gap-1.5">
                            <p className="uppercase tracking-wider font-black">Exchange Shipping Details</p>
                            <p className="font-semibold text-slate-600">Courier: <span className="font-bold">{item.exchange_shipping_details.exchange_courier_name}</span></p>
                            <p className="font-semibold text-slate-600 flex items-center gap-1.5">Tracking Number: <span className="font-mono font-bold">{item.exchange_shipping_details.exchange_tracking_number}</span>
                              <button
                                onClick={() => {
                                  navigator.clipboard.writeText(item.exchange_shipping_details.exchange_tracking_number);
                                  toast.success('Tracking number copied!');
                                }}
                                className="p-0.5 text-slate-400 hover:text-slate-600 transition-colors inline-flex items-center"
                                title="Copy Tracking Number"
                              >
                                <Copy className="w-3.5 h-3.5" />
                              </button>
                            </p>
                            {item.exchange_shipping_details.exchange_expected_delivery_date && (
                              <p className="font-semibold text-slate-600">Expected Delivery: <span className="font-bold">{item.exchange_shipping_details.exchange_expected_delivery_date}</span></p>
                            )}
                            {item.exchange_shipping_details.exchange_shipment_notes && (
                              <p className="text-[9px] text-slate-500 italic">Notes: {item.exchange_shipping_details.exchange_shipment_notes}</p>
                            )}
                            {(() => {
                              const trackingNum = item.exchange_shipping_details.exchange_tracking_number;
                              const cleanNum = trackingNum ? String(trackingNum).trim() : '';
                              const trackUrl = cleanNum ? `https://t.17track.net/en#nums=${cleanNum}` : '';
                              return trackUrl && (
                                <a
                                  href={trackUrl}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="inline-flex items-center gap-1 bg-sky-600 hover:bg-sky-700 text-white font-black uppercase tracking-widest text-[8px] px-3.5 py-2 rounded-lg transition-all shadow-sm w-fit"
                                >
                                  Track Exchange Shipment
                                </a>
                              );
                            })()}
                          </div>
                        )}

                        <div className="flex flex-wrap gap-2 pt-1 border-t border-slate-50">
                          {(item.return_status === 'RETURN_REQUESTED' || item.return_status === 'EXCHANGE_REQUESTED') && (
                            <>
                              <button
                                onClick={() => {
                                  setMessageModal({
                                    orderId: order.id,
                                    productId: item.product_id,
                                    action: 'approve'
                                  });
                                  setAdminMessage('');
                                }}
                                className="bg-emerald-600 hover:bg-emerald-700 text-white font-black uppercase tracking-widest text-[8px] px-3.5 py-2 rounded-lg transition-all"
                              >
                                {item.return_status === 'EXCHANGE_REQUESTED' ? 'Approve Exchange' : 'Approve Return'}
                              </button>
                              <button
                                onClick={() => {
                                  setMessageModal({
                                    orderId: order.id,
                                    productId: item.product_id,
                                    action: 'reject'
                                  });
                                  setAdminMessage('');
                                }}
                                className="bg-rose-600 hover:bg-rose-700 text-white font-black uppercase tracking-widest text-[8px] px-3.5 py-2 rounded-lg transition-all"
                              >
                                {item.return_status === 'EXCHANGE_REQUESTED' ? 'Reject Exchange' : 'Reject Return'}
                              </button>
                            </>
                          )}

                          {item.return_status === 'SELF_SHIPPED' && (
                             <button
                               onClick={() => handleItemReceive(order.id, item.product_id)}
                               disabled={pendingActionIds.has(`${item.product_id}-receive`)}
                               className="bg-indigo-600 hover:bg-indigo-700 text-white font-black uppercase tracking-widest text-[8px] px-3.5 py-2 rounded-lg transition-all disabled:opacity-50"
                             >
                               {pendingActionIds.has(`${item.product_id}-receive`) ? 'Processing...' : 'Mark Received'}
                             </button>
                           )}

                           {item.return_status === 'RETURN_RECEIVED' && (
                             <button
                               onClick={() => {
                                 if (window.confirm("Are you sure you want to initiate an automatic Razorpay refund for this item?")) {
                                   handleItemProcessRefund(order.id, item.product_id, true);
                                 }
                               }}
                               disabled={pendingActionIds.has(`${item.product_id}-refund`)}
                               className="bg-primary hover:bg-emerald-hover text-white font-black uppercase tracking-widest text-[8px] px-3.5 py-2 rounded-lg transition-all shadow-md shadow-emerald-glow disabled:opacity-50"
                             >
                               {pendingActionIds.has(`${item.product_id}-refund`) ? 'Refunding...' : 'Process Refund & Restock'}
                             </button>
                           )}

                           {item.return_status === 'EXCHANGE_RECEIVED' && (
                             <button
                               onClick={() => {
                                 setShipExchangeModal({
                                   orderId: order.id,
                                   productId: item.product_id
                                 });
                               }}
                               className="bg-sky-600 hover:bg-sky-700 text-white font-black uppercase tracking-widest text-[8px] px-3.5 py-2 rounded-lg transition-all shadow-md"
                             >
                               Ship Exchange Product
                             </button>
                           )}

                           {item.return_status === 'EXCHANGE_SHIPPED' && (
                             <button
                               onClick={() => {
                                 if (window.confirm("Are you sure you want to complete this exchange?")) {
                                   handleItemCompleteExchange(order.id, item.product_id);
                                 }
                               }}
                               disabled={pendingActionIds.has(`${item.product_id}-complete-exchange`)}
                               className="bg-emerald-600 hover:bg-emerald-700 text-white font-black uppercase tracking-widest text-[8px] px-3.5 py-2 rounded-lg transition-all shadow-md disabled:opacity-50"
                             >
                               {pendingActionIds.has(`${item.product_id}-complete-exchange`) ? 'Completing...' : 'Complete Exchange'}
                             </button>
                           )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {order.return_image_url && (
                <div className="w-full md:w-44 shrink-0 space-y-2">
                  <div className="text-[9px] font-black text-slate-400 dark:text-slate-300 uppercase tracking-widest">Uploaded Return Proof</div>
                  <div className="flex flex-wrap gap-2">
                    {order.return_image_url.split(',').map((url, idx) => {
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
                                onError={(e) => { e.target.src = '/logo-durga.webp'; }}
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
          {order.items?.some(i => i.return_status) && (() => {
            const returnedItems = (order.items || []).filter(i => i.return_status);
            const hasApproved = returnedItems.some(i => ['RETURN_APPROVED', 'SELF_SHIPPED', 'RETURN_RECEIVED', 'REFUND_INITIATED', 'REFUND_COMPLETED'].includes(i.return_status));
            const hasSelfShipped = returnedItems.some(i => ['SELF_SHIPPED', 'RETURN_RECEIVED', 'REFUND_INITIATED', 'REFUND_COMPLETED'].includes(i.return_status));
            const hasReceived = returnedItems.some(i => ['RETURN_RECEIVED', 'REFUND_INITIATED', 'REFUND_COMPLETED'].includes(i.return_status));
            const hasRefunded = returnedItems.some(i => ['REFUND_INITIATED', 'REFUND_COMPLETED'].includes(i.return_status)) || order.payment_status === 'refunded' || order.order_status === 'refunded';
            const isRejected = (returnedItems.length > 0 && returnedItems.every(i => i.return_status === 'RETURN_REJECTED')) || order.order_status === 'return_rejected';
            const isRefundFailed = order.payment_status === 'refund_failed';

            let returnSteps = [];
            let progressWidth = '0%';
            let timelineTitle = 'Return Request Timeline';
            const isExchangeOrder = returnedItems.some(i => i.return_type === 'exchange' || i.return_status?.startsWith('EXCHANGE_'));

            if (isExchangeOrder) {
              const hasExRequested = returnedItems.some(i => ['EXCHANGE_REQUESTED', 'EXCHANGE_APPROVED', 'SELF_SHIPPED', 'EXCHANGE_RECEIVED', 'EXCHANGE_SHIPPED', 'EXCHANGE_COMPLETED'].includes(i.return_status));
              const hasExApproved = returnedItems.some(i => ['EXCHANGE_APPROVED', 'SELF_SHIPPED', 'EXCHANGE_RECEIVED', 'EXCHANGE_SHIPPED', 'EXCHANGE_COMPLETED'].includes(i.return_status));
              const hasExSelfShipped = returnedItems.some(i => ['SELF_SHIPPED', 'EXCHANGE_RECEIVED', 'EXCHANGE_SHIPPED', 'EXCHANGE_COMPLETED'].includes(i.return_status));
              const hasExReceived = returnedItems.some(i => ['EXCHANGE_RECEIVED', 'EXCHANGE_SHIPPED', 'EXCHANGE_COMPLETED'].includes(i.return_status));
              const hasExShipped = returnedItems.some(i => ['EXCHANGE_SHIPPED', 'EXCHANGE_COMPLETED'].includes(i.return_status));
              const hasExCompleted = returnedItems.some(i => i.return_status === 'EXCHANGE_COMPLETED');
              const isExRejected = returnedItems.every(i => i.return_status === 'EXCHANGE_REJECTED');

              if (isExRejected) {
                returnSteps = [
                  { label: 'Exchange Requested', active: true, date: order.updated_at },
                  { label: 'Exchange Rejected', active: true, date: order.updated_at, rejected: true }
                ];
                progressWidth = '100%';
                timelineTitle = 'Exchange Request Declined';
              } else {
                returnSteps = [
                  { label: 'Exchange Requested', active: hasExRequested, date: order.created_at },
                  { label: 'Approved for Exchange', active: hasExApproved, date: hasExApproved ? order.updated_at : null },
                  { label: 'Returned Item Self-Shipped', active: hasExSelfShipped, date: null },
                  { label: 'Returned Item Received', active: hasExReceived, date: null },
                  { label: 'Exchange Product Shipped', active: hasExShipped, date: null },
                  { label: 'Exchange Completed', active: hasExCompleted, date: null }
                ];
                progressWidth = hasExCompleted ? '100%' : hasExShipped ? '80%' : hasExReceived ? '60%' : hasExSelfShipped ? '40%' : hasExApproved ? '20%' : '0%';
                timelineTitle = 'Exchange Process Timeline';
              }
            } else if (isRejected) {
              returnSteps = [
                { label: 'Return Requested', active: true, date: order.updated_at },
                { label: 'Return Rejected', active: true, date: order.updated_at, rejected: true }
              ];
              progressWidth = '100%';
              timelineTitle = 'Return Request Declined';
            } else if (hasRefunded || hasReceived || isRefundFailed) {
              const isRefundInitiated = order.payment_status === 'refund_pending' || isRefundFailed || order.payment_status === 'refunded' || order.order_status === 'refunded';
              const isRefundCredited = order.payment_status === 'refunded' || order.order_status === 'refunded';
              returnSteps = [
                { label: 'Return Received', active: true, date: order.updated_at },
                { label: 'Refund Initiated', active: isRefundInitiated, date: isRefundInitiated ? order.updated_at : null },
                { label: isRefundFailed ? 'Refund Failed' : 'Refund Credited', active: isRefundCredited, date: isRefundCredited ? order.updated_at : null, rejected: isRefundFailed }
              ];
              progressWidth = isRefundCredited ? '100%' : isRefundInitiated ? '50%' : '0%';
              timelineTitle = 'Refund Process Timeline';
            } else {
              returnSteps = [
                { label: 'Return Requested', active: true, date: order.created_at },
                { label: 'Approved for Return', active: hasApproved, date: hasApproved ? order.updated_at : null },
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

        {/* Footer */}
        <div className="pt-5 border-t border-slate-100 flex flex-col sm:flex-row justify-between items-center gap-3">
          {(() => {
            const hasReturnRequest = (order.items || []).some(i => i.return_status);
            const itemsToSum = hasReturnRequest
              ? (order.items || []).filter(i => ['RETURN_APPROVED', 'SELF_SHIPPED', 'RETURN_RECEIVED', 'REFUND_INITIATED', 'REFUND_COMPLETED'].includes(i.return_status))
              : (order.items || []);
            const totalRefundAmount = itemsToSum.reduce((sum, i) => {
              const itemAmount = parseFloat(i.refund_calculations?.refundable_amount || 0);
              const courierCost = ['REFUND_COMPLETED', 'REFUND_INITIATED'].includes(i.return_status) ? 0 : parseFloat(i.self_shipping_details?.courier_cost || 0);
              return sum + itemAmount + courierCost;
            }, 0);

            const isCod = String(order.payment_method || '').toLowerCase() === 'cod';
            const showRefundActions = (
              isCod
                ? ['refund_pending', 'refund_failed'].includes(order.payment_status)
                : ['refund_failed'].includes(order.payment_status)
            ) && totalRefundAmount > 0;
            const showRefundInfo = ['refund_pending', 'refunded', 'refund_failed'].includes(order.payment_status) && totalRefundAmount > 0;

            return (
              <>
                {showRefundInfo ? (
                  <div className="text-[10px] text-slate-500 font-extrabold text-left w-full sm:w-auto flex flex-wrap items-center gap-2">
                    <span>Refund: <span className="font-mono text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200 select-all">₹{totalRefundAmount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span></span>
                    <span>{' → '}</span>
                    <span className="font-mono text-slate-900 bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200 select-all">{order.shipping_address?.phone || 'customer'}</span>
                    {order.payment_status === 'refund_pending' && !isCod && (
                      <span className="px-2 py-0.5 bg-sky-50 text-sky-700 border border-sky-100 rounded text-[9px] font-black uppercase tracking-wider animate-pulse">Refund Processing Automatically</span>
                    )}
                  </div>
                ) : (
                  <div></div>
                )}
                <div className="flex gap-3 justify-end w-full sm:w-auto shrink-0">
                  {showRefundActions && hasPermission('update_order_status') && (
                    String(order.payment_method || '').toLowerCase() === 'cod' ? (
                      <button
                        onClick={() => {
                          handleOpenOrderRefundModal(order);
                        }}
                        className="px-6 h-12 rounded-xl text-xs font-black uppercase tracking-widest bg-emerald-600 hover:bg-emerald-700 text-white transition-all hover:scale-[1.02] transform active:scale-[0.98] shadow-md shadow-emerald-glow"
                      >
                        Confirm Manual Refund Paid
                      </button>
                    ) : (
                      <button
                        onClick={() => {
                          retryRefund(order.id);
                        }}
                        className="px-6 h-12 rounded-xl text-xs font-black uppercase tracking-widest bg-sky-600 hover:bg-sky-700 text-white transition-all hover:scale-[1.02] transform active:scale-[0.98] shadow-md shadow-sky-glow"
                      >
                        Retry Auto Refund
                      </button>
                    )
                  )}
                  <button
                    onClick={() => window.close()}
                    className="px-6 h-12 rounded-xl text-xs font-black uppercase tracking-widest bg-slate-100 hover:bg-slate-200 text-slate-700 transition-all hover:scale-[1.02] transform active:scale-[0.98]"
                  >
                    Close
                  </button>
                </div>
              </>
            );
          })()}
        </div>

      </div>

      {/* Item Resolution Message Modal */}
      {messageModal && (
        <div className="fixed inset-0 z-[999999] flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur animate-in fade-in duration-300">
          <div className="bg-white rounded-3xl p-8 max-w-md w-full border border-slate-100 shadow-2xl space-y-6 animate-in zoom-in-95 duration-200">
            <div>
              <h3 className="text-lg font-black text-slate-900 uppercase tracking-tight">
                {messageModal.status === 'RETURN_APPROVED' || messageModal.action === 'approve'
                  ? 'Approve Return'
                  : messageModal.status === 'RETURN_REJECTED' || messageModal.action === 'reject'
                  ? 'Reject Return'
                  : 'Cancel Order'}
              </h3>
              <p className="text-xs text-slate-500 mt-1">Provide a custom message or reason to deliver respectively to the customer.</p>
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Message to Customer</label>
              <textarea
                placeholder={
                  messageModal.status === 'RETURN_APPROVED' || messageModal.action === 'approve'
                    ? "E.g., Your return has been approved. Refund has been initiated."
                    : messageModal.status === 'RETURN_REJECTED' || messageModal.action === 'reject'
                    ? "E.g., Rejection reason: The photo proof does not show any defective quality issues."
                    : "E.g., Order cancelled due to stock unavailability."
                }
                value={adminMessage}
                onChange={(e) => setAdminMessage(e.target.value)}
                required
                className="w-full p-4 min-h-[100px] rounded-2xl border border-slate-200 dark:border-[#26322B] text-xs font-semibold bg-slate-50 dark:bg-[#131B17] text-slate-800 dark:text-white focus:bg-white dark:focus:bg-[#19231F] focus:ring-2 focus:ring-primary focus:outline-none resize-none"
              />
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => {
                  setMessageModal(null);
                  setAdminMessage('');
                }}
                className="flex-1 h-12 rounded-xl border border-slate-200 text-xs font-black uppercase tracking-widest text-slate-600 hover:bg-slate-50 transition-all"
              >
                Go Back
              </button>
              <button
                onClick={() => {
                  if (messageModal.action) {
                    handleItemReturnAction(messageModal.orderId, messageModal.productId, messageModal.action, adminMessage);
                  } else {
                    updateStatus(messageModal.orderId, messageModal.status, adminMessage);
                  }
                }}
                disabled={!adminMessage.trim() || (messageModal.action && pendingActionIds.has(`${messageModal.productId}-${messageModal.action}`))}
                className="flex-1 h-12 rounded-xl text-xs font-black uppercase tracking-widest bg-primary hover:bg-emerald-hover text-white shadow-lg shadow-emerald-glow disabled:opacity-50 transition-all"
              >
                {messageModal.action && pendingActionIds.has(`${messageModal.productId}-${messageModal.action}`) ? 'Processing...' : 'Confirm'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Manual Refund Settlement Modal */}
      {refundModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[999999] flex items-center justify-center p-4">
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
                  className="flex-1 h-12 rounded-xl text-xs font-black uppercase tracking-widest bg-emerald-600 hover:bg-emerald-700 text-white transition-colors cursor-pointer shadow-md shadow-emerald-glow flex items-center justify-center gap-1.5"
                  disabled={!upiVpaInput || !refundAmountInput}
                >
                  Confirm Refund Paid
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Ship Exchange Modal */}
      {shipExchangeModal && (
        <div className="fixed inset-0 z-[999999] flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur animate-in fade-in duration-300">
          <div className="bg-white rounded-3xl p-8 max-w-md w-full border border-slate-100 shadow-2xl space-y-5 animate-in zoom-in-95 duration-200">
            <div>
              <h3 className="text-lg font-black text-slate-900 uppercase tracking-tight">Ship Exchange Product</h3>
              <p className="text-xs text-slate-500 mt-1">Provide tracking and delivery details for the exchanged product shipment.</p>
            </div>

            <form onSubmit={handleShipExchangeSubmit} className="space-y-4">
              <div className="space-y-1">
                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Courier / Carrier Name *</label>
                <select
                  required
                  value={COURIER_OPTIONS.includes(exCourierName) ? exCourierName : (exCourierName ? 'Other' : '')}
                  onChange={(e) => {
                    const val = e.target.value;
                    if (val === 'Other') {
                      setExCourierName('');
                    } else {
                      setExCourierName(val);
                    }
                  }}
                  className="w-full h-11 px-3.5 rounded-xl border border-slate-200 text-xs font-bold bg-white focus:ring-2 focus:ring-primary/20 focus:outline-none"
                >
                  <option value="">Select Courier</option>
                  {COURIER_OPTIONS.map(opt => (
                    <option key={opt} value={opt}>{opt}</option>
                  ))}
                </select>
                {exCourierName && (!COURIER_OPTIONS.includes(exCourierName) || exCourierName === 'Other') && (
                  <input
                    type="text"
                    required
                    placeholder="Enter custom courier name"
                    value={exCourierName}
                    onChange={(e) => setExCourierName(e.target.value)}
                    className="w-full h-11 mt-2 px-3.5 rounded-xl border border-slate-200 text-xs font-bold bg-white focus:ring-2 focus:ring-primary/20 focus:outline-none"
                  />
                )}
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Tracking Number / Waybill *</label>
                <input
                  type="text"
                  required
                  placeholder="Enter exchange tracking number"
                  value={exTrackingNumber}
                  onChange={(e) => setExTrackingNumber(e.target.value)}
                  className="w-full h-11 px-3.5 rounded-xl border border-slate-200 text-xs font-bold bg-white focus:ring-2 focus:ring-primary/20 focus:outline-none font-mono"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Expected Delivery Date (Optional)</label>
                <input
                  type="date"
                  value={exExpectedDate}
                  onChange={(e) => setExExpectedDate(e.target.value)}
                  className="w-full h-11 px-3.5 rounded-xl border border-slate-200 text-xs font-bold bg-white focus:ring-2 focus:ring-primary/20 focus:outline-none"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Shipment Notes (Optional)</label>
                <textarea
                  placeholder="Any additional shipment details or comments..."
                  value={exNotes}
                  onChange={(e) => setExNotes(e.target.value)}
                  className="w-full p-3 min-h-[80px] rounded-xl border border-slate-200 text-xs font-semibold bg-white focus:ring-2 focus:ring-primary/20 focus:outline-none resize-none"
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setShipExchangeModal(null);
                    setExCourierName('');
                    setExTrackingNumber('');
                    setExExpectedDate('');
                    setExNotes('');
                  }}
                  className="flex-1 h-12 rounded-xl border border-slate-200 text-xs font-black uppercase tracking-widest text-slate-600 hover:bg-slate-50 transition-all"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingExShip}
                  className="flex-1 h-12 rounded-xl text-xs font-black uppercase tracking-widest bg-primary hover:bg-emerald-hover text-white shadow-lg shadow-emerald-glow disabled:opacity-50 transition-all"
                >
                  {submittingExShip ? 'Shipping...' : 'Ship Product'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminOrderDetailsPage;
