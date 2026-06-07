import React, { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import adminService from '../services/admin.service';
import apiClient from '../../services/core/apiClient';
import {
  ShoppingBag, Clock, CheckCircle2, Truck, AlertCircle,
  Search, Filter, ChevronRight, XCircle, RefreshCcw,
  IndianRupee, Calendar, MoreHorizontal, Eye, PackageCheck,
  MapPin, Phone as PhoneIcon, ChevronDown, ChevronUp, Check, Copy, ArrowLeft
} from 'lucide-react';
import { Button } from '../../components/ui/button';
import { formatImageUrl } from '../../utils/api';
import PageLoader from '../../components/ui/PageLoader';
import { useAuth } from '../../contexts/AuthContext';

const AdminOrderDetailsPage = () => {
  const { id: orderId } = useParams();
  const navigate = useNavigate();
  const { hasPermission } = useAuth();
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [refundModal, setRefundModal] = useState(null);
  const [refundAmountInput, setRefundAmountInput] = useState('');
  const [upiVpaInput, setUpiVpaInput] = useState('');
  const [isFetchingVpa, setIsFetchingVpa] = useState(false);
  const [pendingActionIds, setPendingActionIds] = useState(new Set());
  const [copiedId, setCopiedId] = useState(null);

  const fetchOrderDetails = useCallback(async () => {
    try {
      const response = await adminService.getOrderDetails(orderId);
      setOrder(response.data);
    } catch (err) {
      toast.error(err.message || 'Failed to fetch order details');
    } finally {
      setLoading(false);
    }
  }, [orderId]);

  useEffect(() => {
    fetchOrderDetails();
  }, [fetchOrderDetails]);

  const handleCopy = (text, type) => {
    navigator.clipboard.writeText(text);
    setCopiedId(type);
    toast.success('Copied to clipboard');
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleItemReceive = async (productId) => {
    const toastId = toast.loading('Marking item as received...');
    try {
      const response = await apiClient.post(`/admin/orders/${orderId}/items/${productId}/receive`);
      apiClient.invalidateCache('/admin/orders');
      if (response?.data?.order) {
        setOrder(response.data.order);
      }
      toast.success('Item marked as received', { id: toastId });
    } catch (err) {
      toast.error(err?.response?.data?.detail || 'Failed to mark item as received', { id: toastId });
    }
  };

  const handleItemProcessRefund = async (productId, restock = true) => {
    const toastId = toast.loading('Processing refund...');
    try {
      const response = await apiClient.post(`/admin/orders/${orderId}/items/${productId}/process-refund?restock=${restock}`);
      apiClient.invalidateCache('/admin/orders');
      if (response?.data?.order) {
        setOrder(response.data.order);
      }
      if (response?.data?.warning) {
        toast.warning(response.data.warning, { duration: 8000, id: toastId });
      } else {
        toast.success('Refund processed successfully', { id: toastId });
      }
    } catch (err) {
      toast.error(err?.response?.data?.detail || 'Failed to process refund', { id: toastId });
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
        if (response?.data?.order) {
          setOrder(response.data.order);
        }
        toast.success(response?.data?.message || 'Manual refund confirmed successfully.', { id: toastId });
        setRefundModal(null);
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
      if (response?.data?.order) {
        setOrder(response.data.order);
      }
      toast.success('Manual refund confirmed successfully!', { id: toastId });
      setRefundModal(null);
    } catch (err) {
      toast.error(err?.response?.data?.detail || 'Failed to process manual refund', { id: toastId });
    }
  };

  const retryRefund = async () => {
    const toastId = toast.loading('Initiating Razorpay refund...');
    try {
      setPendingActionIds(prev => new Set(prev).add(orderId));
      setSubmitting(true);
      const response = await adminService.retryRefund(orderId);
      if (response?.data?.order) {
        setOrder(response.data.order);
      }
      toast.success(response?.data?.message || 'Razorpay refund has been initiated and is pending bank confirmation.', { id: toastId });
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

  if (loading) return <PageLoader message="Fetching order information..." />;
  if (!order) {
    return (
      <div className="p-8 text-center bg-rose-50 border border-rose-100 rounded-3xl text-rose-600 font-bold text-sm">
        Order details not found.
      </div>
    );
  }

  const statusColors = {
    PENDING: 'text-amber-600 bg-amber-50 border-amber-200',
    PENDING_PAYMENT: 'text-rose-600 bg-rose-50 border-rose-200',
    CONFIRMED: 'text-primary bg-primary/10 border-primary/20',
    PACKAGING: 'text-cyan-600 bg-cyan-50 border-cyan-200',
    SHIPPED: 'text-blue-600 bg-blue-50 border-blue-200',
    IN_TRANSIT: 'text-indigo-600 bg-indigo-50 border-indigo-200',
    OUT_FOR_DELIVERY: 'text-purple-600 bg-purple-50 border-purple-200',
    DELIVERED: 'text-emerald-600 bg-emerald-50 border-emerald-200',
    CANCELLED: 'text-rose-600 bg-rose-50 border-rose-200',
    FAILED: 'text-rose-600 bg-rose-50 border-rose-200',
    RETURNED: 'text-slate-600 bg-slate-50 border-slate-200',
  };

  const currentStatus = (order.order_status || 'PENDING').toUpperCase();
  const paymentStatusUpper = (order.payment_status || 'PENDING').toUpperCase();

  const totalRefundAmount = (order.items || []).reduce((sum, item) => {
    if (['REFUND_INITIATED', 'REFUND_COMPLETED'].includes(item.return_status)) {
      return sum + parseFloat(item.refund_calculations?.refund_amount_credited || 0);
    }
    return sum;
  }, 0);

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-200">
        <div className="flex items-center gap-3">
          <button 
            onClick={() => {
              const isAdmin = window.location.pathname.startsWith('/superadmin');
              navigate(isAdmin ? '/superadmin/orders' : '/admin/orders');
            }} 
            className="p-2 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors"
          >
            <ArrowLeft className="w-5 h-5 text-slate-600" />
          </button>
          <div>
            <h1 className="text-3xl font-extrabold tracking-tight text-slate-900 flex items-center gap-3">
              Order Details
              <span className={`text-[10px] font-black uppercase tracking-widest px-2.5 py-1 rounded-full border ${statusColors[currentStatus] || 'text-slate-600 bg-slate-50 border-slate-200'}`}>
                {order.order_status}
              </span>
            </h1>
            <p className="text-slate-500 mt-1 font-medium text-sm">
              Order #{order.order_number} • Placed {new Date(order.created_at).toLocaleString('en-IN')}
            </p>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-[2.5rem] border border-slate-200 p-8 shadow-sm space-y-8">
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
          <div className="space-y-2 md:pl-6 pt-6 md:pt-0">
            <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Payment Method</h4>
            <div className="text-xs text-slate-600 leading-relaxed space-y-1.5 font-semibold">
              <p className="font-extrabold text-slate-900 uppercase tracking-wide">
                {order.payment_method === 'cod' ? 'Cash on Delivery' : 'Prepaid Online'}
              </p>
              <div className="flex items-center gap-2">
                <span className={`px-2 py-0.5 text-[10px] font-black uppercase tracking-wider rounded ${
                  paymentStatusUpper === 'PAID' ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' :
                  paymentStatusUpper === 'REFUNDED' ? 'bg-slate-100 text-slate-650' :
                  paymentStatusUpper === 'REFUND_PENDING' ? 'bg-amber-50 text-amber-600 border border-amber-200' :
                  'bg-rose-50 text-rose-600 border border-rose-100'
                }`}>
                  {order.payment_status}
                </span>
                <span className="text-[10px] text-slate-400 font-bold uppercase">Payment Mode: {order.payment_method}</span>
              </div>
              {order.razorpay_payment_id && (
                <div className="text-[10px] font-mono font-bold text-slate-500 flex items-center gap-1">
                  <span>Txn:</span>
                  <span className="text-slate-800 bg-slate-100 px-1 rounded truncate select-all">{order.razorpay_payment_id}</span>
                </div>
              )}
            </div>
          </div>

          {/* Column 3: Order Summary */}
          <div className="space-y-2 md:pl-6 pt-6 md:pt-0">
            <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest font-label-caps">Order Summary</h4>
            <div className="space-y-1 text-xs font-semibold text-slate-650">
              <div className="flex justify-between">
                <span>Subtotal:</span>
                <span className="font-mono text-slate-800">₹{parseFloat(order.total_amount - (order.delivery_charge || 0) + (order.discount_amount || 0)).toFixed(2)}</span>
              </div>
              {order.discount_amount > 0 && (
                <div className="flex justify-between text-rose-500 font-bold">
                  <span>Discount Applied:</span>
                  <span className="font-mono">-₹{parseFloat(order.discount_amount).toFixed(2)}</span>
                </div>
              )}
              <div className="flex justify-between">
                <span>Shipping Cost:</span>
                <span className="font-mono text-slate-800">
                  {order.delivery_charge > 0 ? `₹${parseFloat(order.delivery_charge).toFixed(2)}` : 'FREE'}
                </span>
              </div>
              <div className="flex justify-between border-t border-slate-200/80 pt-1.5 text-sm font-black text-slate-900">
                <span>Grand Total:</span>
                <span className="font-mono text-primary">₹{parseFloat(order.total_amount || 0).toFixed(2)}</span>
              </div>
            </div>
          </div>

        </div>

        {/* Timeline Timeline */}
        {order.items?.some(i => i.return_status) && (() => {
          const returnedItems = (order.items || []).filter(i => i.return_status);
          const hasApproved = returnedItems.some(i => ['RETURN_APPROVED', 'SELF_SHIPPED', 'RETURN_RECEIVED', 'REFUND_INITIATED', 'REFUND_COMPLETED'].includes(i.return_status)) || order.order_status === 'refunded' || order.order_status === 'return_approved';
          const hasReceived = returnedItems.some(i => ['RETURN_RECEIVED', 'REFUND_INITIATED', 'REFUND_COMPLETED'].includes(i.return_status)) || order.order_status === 'refunded';
          const hasRefunded = returnedItems.some(i => ['REFUND_INITIATED', 'REFUND_COMPLETED'].includes(i.return_status)) || order.payment_status === 'refunded' || order.order_status === 'refunded';
          const isRejected = (returnedItems.length > 0 && returnedItems.every(i => i.return_status === 'RETURN_REJECTED')) || order.order_status === 'return_rejected';
          const isRefundFailed = order.payment_status === 'refund_failed';

          let steps = [];
          if (isRejected) {
            steps = [
              { label: 'Return Requested', active: true, date: order.updated_at },
              { label: 'Return Rejected', active: true, date: order.updated_at, rejected: true }
            ];
          } else {
            const isRefundInitiated = order.payment_status === 'refund_pending' || isRefundFailed || order.payment_status === 'refunded' || order.order_status === 'refunded';
            const isRefundCredited = order.payment_status === 'refunded' || order.order_status === 'refunded';
            steps = [
              { label: 'Return Requested', active: true, date: order.created_at },
              { label: 'Approved for Return', active: hasApproved, date: hasApproved ? order.updated_at : null },
              { label: 'Return Received', active: hasReceived, date: hasReceived ? order.updated_at : null },
              { label: 'Refund Initiated', active: isRefundInitiated, date: isRefundInitiated ? order.updated_at : null },
              { label: isRefundFailed ? 'Refund Failed' : 'Refund Credited', active: isRefundCredited, date: isRefundCredited ? order.updated_at : null, rejected: isRefundFailed }
            ];
          }

          return (
            <div className="bg-slate-50/30 rounded-3xl border border-slate-200/50 p-6 space-y-4 shadow-sm">
              <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Order Shipment Timeline</h4>
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 pt-2">
                {steps.map((step, idx) => (
                  <div key={idx} className="flex-1 flex items-start md:items-center gap-3 relative">
                    <div className={`w-8 h-8 rounded-full border-2 flex items-center justify-center font-extrabold text-xs shrink-0 transition-all ${
                      step.rejected
                        ? 'border-rose-450 bg-rose-50 text-rose-500 scale-105'
                        : step.active
                        ? 'border-primary bg-primary/10 text-primary scale-105'
                        : 'border-slate-200 bg-slate-50 text-slate-400'
                    }`}>
                      {step.rejected ? '✕' : '✓'}
                    </div>
                    <div>
                      <p className={`text-xs font-black uppercase tracking-wide leading-tight ${
                        step.rejected ? 'text-rose-500 font-extrabold' : step.active ? 'text-slate-800' : 'text-slate-400'
                      }`}>
                        {step.label}
                      </p>
                      {step.date && (
                        <p className="text-[9px] font-mono font-bold text-slate-400 mt-0.5">
                          {new Date(step.date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          );
        })()}

        {/* Itemized Table */}
        <div className="space-y-4">
          <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest font-label-caps">Products Purchased</h4>
          <div className="border border-slate-200 rounded-3xl overflow-hidden shadow-sm">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50/80 border-b border-slate-200 text-[10px] font-black text-slate-450 uppercase tracking-widest">
                  <th className="px-6 py-4">Item Details</th>
                  <th className="px-6 py-4 text-center">Qty</th>
                  <th className="px-6 py-4 text-right">Price</th>
                  <th className="px-6 py-4 text-right">Total</th>
                  <th className="px-6 py-4 text-center">Status / Return Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs text-slate-700 font-semibold">
                {(order.items || []).map((item, idx) => {
                  const hasReturn = !!item.return_status;
                  const itemTotal = parseFloat((item.price * item.quantity).toFixed(2));
                  return (
                    <tr key={idx} className="hover:bg-slate-50/30 transition-colors">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <img
                            src={formatImageUrl(item.image_url)}
                            alt={item.product_name}
                            className="w-12 h-12 rounded-xl border border-slate-200 object-cover bg-white shrink-0"
                          />
                          <div>
                            <p className="font-extrabold text-slate-900 leading-tight">{item.product_name}</p>
                            <p className="text-[9px] font-mono font-bold text-slate-450 mt-1 select-all">SKU: {item.sku || 'N/A'}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-center font-bold text-slate-900">{item.quantity}</td>
                      <td className="px-6 py-4 text-right font-mono">₹{parseFloat(item.price).toFixed(2)}</td>
                      <td className="px-6 py-4 text-right font-mono font-extrabold text-slate-900">₹{itemTotal.toFixed(2)}</td>
                      <td className="px-6 py-4 text-center">
                        <div className="flex flex-col items-center gap-1.5 justify-center">
                          {hasReturn ? (
                            <>
                              <span className={`px-2.5 py-0.5 rounded text-[9px] font-black uppercase tracking-wider ${
                                item.return_status === 'RETURN_REQUESTED' ? 'bg-orange-50 text-orange-600 border border-orange-100' :
                                item.return_status === 'RETURN_APPROVED' ? 'bg-teal-50 text-teal-600 border border-teal-100' :
                                item.return_status === 'RETURN_REJECTED' ? 'bg-red-50 text-red-600 border border-red-100' :
                                item.return_status === 'REFUND_INITIATED' ? 'bg-amber-50 text-amber-600 border border-amber-200' :
                                item.return_status === 'REFUND_COMPLETED' ? 'bg-slate-100 text-slate-650' :
                                'bg-emerald-50 text-emerald-600 border border-emerald-100'
                              }`}>
                                {item.return_status.replace('_', ' ')}
                              </span>
                              {item.return_reason && (
                                <p className="text-[10px] text-slate-500 font-medium max-w-[200px] truncate" title={item.return_reason}>
                                  Reason: "{item.return_reason}"
                                </p>
                              )}
                              {item.return_status === 'RETURN_APPROVED' && (
                                <button
                                  onClick={() => handleItemReceive(item.product_id)}
                                  className="px-3 py-1 bg-primary hover:bg-[#005a14] text-white rounded-lg text-[10px] font-black uppercase tracking-wider shadow-sm transition-all"
                                >
                                  Mark Received
                                </button>
                              )}
                              {item.return_status === 'RETURN_RECEIVED' && (
                                <div className="flex gap-1.5">
                                  <button
                                    onClick={() => handleItemProcessRefund(item.product_id, true)}
                                    className="px-2.5 py-1 bg-primary hover:bg-[#005a14] text-white rounded-lg text-[10px] font-black uppercase tracking-wider shadow-sm transition-all"
                                  >
                                    Refund & Restock
                                  </button>
                                  <button
                                    onClick={() => handleItemProcessRefund(item.product_id, false)}
                                    className="px-2.5 py-1 bg-amber-500 hover:bg-amber-600 text-white rounded-lg text-[10px] font-black uppercase tracking-wider shadow-sm transition-all"
                                  >
                                    Refund Only
                                  </button>
                                </div>
                              )}
                            </>
                          ) : (
                            <span className="text-slate-400 italic">No returns active</span>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Footer actions */}
        <div className="flex flex-col sm:flex-row justify-between items-center gap-4 pt-6 border-t border-slate-100">
          <div className="text-xs text-slate-500 font-bold flex items-center gap-2">
            <span>Customer Phone:</span>
            <span className="font-mono text-slate-900 bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200 select-all">
              {order.shipping_address?.phone || 'customer'}
            </span>
          </div>

          <div className="flex gap-3">
            {paymentStatusUpper === 'REFUND_PENDING' && String(order.payment_method || '').toLowerCase() !== 'cod' && (
              <button
                onClick={retryRefund}
                disabled={submitting || pendingActionIds.has(order.id)}
                className="h-10 px-5 rounded-xl text-xs font-black uppercase tracking-widest border border-primary text-primary hover:bg-primary/5 transition-all disabled:opacity-50"
              >
                Retry Online Refund
              </button>
            )}

            {order.order_status === 'return_approved' && (
              <button
                onClick={() => handleOpenOrderRefundModal(order)}
                className="h-10 px-5 rounded-xl text-xs font-black uppercase tracking-widest bg-primary text-white hover:bg-[#005a14] shadow-md transition-all"
              >
                Process Return Refund
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Manual Refund Payout Modal */}
      {refundModal && (
        <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur animate-in fade-in duration-300">
          <div className="bg-white rounded-[2rem] p-6 max-w-md w-full border border-slate-100 shadow-2xl flex flex-col gap-4 animate-in zoom-in-95 duration-300">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-lg font-black text-slate-900 uppercase tracking-tight">Confirm Manual Refund</h3>
              <button
                onClick={() => setRefundModal(null)}
                className="text-slate-400 hover:text-slate-900 transition-colors"
              >
                <XCircle className="w-5 h-5" />
              </button>
            </div>
            
            <div className="space-y-3 text-xs leading-relaxed text-slate-650 font-medium">
              {refundModal.isOrderLevel ? (
                <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200/60 space-y-1">
                  <p className="text-xs font-bold text-slate-800">
                    Order: <span className="font-semibold text-slate-650">{refundModal.order?.order_number}</span>
                  </p>
                  <p className="text-xs font-bold text-slate-850">
                    Calculated Value: <span className="font-mono text-slate-600">₹{parseFloat(refundModal.initialAmount || 0).toFixed(2)}</span>
                  </p>
                  {refundModal.courierCost > 0 && (
                    <p className="text-xs font-bold text-slate-850">
                      Self-Ship Courier Cost: <span className="font-mono text-slate-600">₹{parseFloat(refundModal.courierCost || 0).toFixed(2)}</span>
                    </p>
                  )}
                </div>
              ) : (
                <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200/60 space-y-1">
                  <p className="text-xs font-bold">Product: <span className="font-semibold text-slate-600">{refundModal.item?.product_name}</span></p>
                  <p className="text-xs font-bold">Calculated Value: <span className="font-mono text-slate-600">₹{refundModal.initialAmount}</span></p>
                  {refundModal.item?.self_shipping_details?.courier_cost > 0 && (
                    <p className="text-xs font-bold">Self-Ship Courier Cost: <span className="font-mono text-slate-600">₹{refundModal.item.self_shipping_details.courier_cost}</span></p>
                  )}
                </div>
              )}

              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">UPI VPA Address</label>
                <input
                  type="text"
                  placeholder="e.g. customer@okaxis"
                  value={upiVpaInput}
                  onChange={(e) => setUpiVpaInput(e.target.value)}
                  disabled={isFetchingVpa}
                  className="w-full p-3.5 rounded-xl border border-slate-200 text-xs font-bold bg-slate-50 focus:bg-white focus:ring-2 focus:ring-primary focus:outline-none"
                />
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Total Refund Amount (₹)</label>
                <input
                  type="number"
                  step="0.01"
                  value={refundAmountInput}
                  onChange={(e) => setRefundAmountInput(e.target.value)}
                  className="w-full p-3.5 rounded-xl border border-slate-200 text-xs font-bold bg-slate-50 focus:bg-white focus:ring-2 focus:ring-primary focus:outline-none"
                />
              </div>
            </div>

            <div className="flex gap-3 pt-2">
              <button
                onClick={() => setRefundModal(null)}
                className="flex-1 h-11 rounded-xl border border-slate-200 text-xs font-black uppercase tracking-widest text-slate-600 hover:bg-slate-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => handleConfirmManualRefundItem(true)}
                className="flex-1 h-11 rounded-xl text-xs font-black uppercase tracking-widest bg-primary hover:bg-[#005a14] text-white shadow-md transition-colors"
              >
                Confirm Refund
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminOrderDetailsPage;
