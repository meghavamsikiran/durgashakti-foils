import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Package, Truck, CreditCard, ExternalLink, Calendar, MapPin, Phone, Upload, Info, Wallet, ArrowLeft, X, Check, ArrowRight, Star, Clock, Copy, ChevronDown } from 'lucide-react';
import { Button } from './../components/ui/button';
import { formatImageUrl } from './../utils/api';
import { useProgress } from './../components/ui/ProgressToast';
import paymentService from './../services/payment.service';
import apiClient from './../services/core/apiClient';
import { toast } from 'sonner';
import PageLoader from './../components/ui/PageLoader';
import { useCart } from './../contexts/CartContext';

const PENDING_RAZORPAY_ORDER_KEY = 'pending_razorpay_order';
const COURIER_OPTIONS = ["BlueDart", "DTDC", "Delhivery", "India Post", "Ecom Express", "XpressBees", "Shadowfax", "Ekart Logistics", "DHL", "Professional Couriers", "Other"];
const isPaidPaymentStatus = (status) => ['paid', 'completed'].includes((status || '').toLowerCase());
const isRefundPaymentStatus = (status) => ['refund_pending', 'refund_failed', 'refunded'].includes((status || '').toLowerCase());
const isOnlinePaymentPendingOrder = (orderData) => {
  const paymentStatus = (orderData?.payment_status || '').toLowerCase();
  const orderStatus = (orderData?.order_status || '').toLowerCase();
  return (
    !isPaidPaymentStatus(paymentStatus) &&
    !isRefundPaymentStatus(paymentStatus) &&
    !['failed', 'cancelled'].includes(paymentStatus) &&
    (orderData?.payment_method || '').toLowerCase() !== 'cod' &&
    !['cancelled', 'failed', 'refunded', 'return_approved', 'return_rejected', 'overdue'].includes(orderStatus)
  );
};

const OrderDetailsPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { startProgress, updateProgress, finishProgress } = useProgress();
  const { addToCart } = useCart();
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isReturning, setIsReturning] = useState(false);
  const [returnType, setReturnType] = useState('refund');
  const [reason, setReason] = useState('');
  const [otherDetails, setOtherDetails] = useState('');
  const [returnFiles, setReturnFiles] = useState([]);
  const [returnPreviews, setReturnPreviews] = useState([]);
  const [submittingReturn, setSubmittingReturn] = useState(false);
  const [timeLeft, setTimeLeft] = useState(null);
  const [retryingPayment, setRetryingPayment] = useState(false);

  // Item-level returns and self-shipping states
  const [selectedItemsForReturn, setSelectedItemsForReturn] = useState({});
  const [selfShipModal, setSelfShipModal] = useState(null);
  const [courierName, setCourierName] = useState('');
  const [trackingNumber, setTrackingNumber] = useState('');
  const [trackingUrl, setTrackingUrl] = useState('');
  const [courierCost, setCourierCost] = useState('');
  const [notes, setNotes] = useState('');
  const [invoiceFile, setInvoiceFile] = useState(null);
  const [submittingSelfShip, setSubmittingSelfShip] = useState(false);
  const [courierDropdownOpen, setCourierDropdownOpen] = useState(false);
  const [isCustomCourier, setIsCustomCourier] = useState(false);

  React.useEffect(() => {
    if (selfShipModal) {
      setCourierName('');
      setTrackingNumber('');
      setCourierDropdownOpen(false);
      setIsCustomCourier(false);
    }
  }, [selfShipModal]);

  React.useEffect(() => {
    if (isReturning && order?.items) {
      const initial = {};
      order.items.forEach(item => {
        const isPreselected = isReturning === true ? false : (isReturning === item.product_id);
        initial[item.product_id] = { selected: isPreselected, quantity: 1 };
      });
      setSelectedItemsForReturn(initial);
    }
  }, [isReturning, order]);

  const handleSubmitSelfShip = async (e) => {
    e.preventDefault();
    if (!courierName || !trackingNumber) {
      toast.error('Courier name and Tracking number are required');
      return;
    }
    setSubmittingSelfShip(true);
    try {
      const formData = new FormData();
      formData.append('courier_name', courierName);
      formData.append('tracking_number', trackingNumber);
      if (trackingUrl) formData.append('tracking_url', trackingUrl);
      if (courierCost) formData.append('courier_cost', parseFloat(courierCost));
      if (notes) formData.append('notes', notes);
      if (invoiceFile) {
        formData.append('invoice', invoiceFile);
      }
      
      await apiClient.post(`/orders/${id}/items/${selfShipModal.product_id}/self-ship`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      apiClient.invalidateCache('/orders');
      apiClient.invalidateCache(`/orders/${id}`);
      toast.success('Self shipping details submitted successfully');
      setSelfShipModal(null);
      setCourierName('');
      setTrackingNumber('');
      setTrackingUrl('');
      setCourierCost('');
      setNotes('');
      setInvoiceFile(null);
      
      // Reload order
      const res = await apiClient.get(`/orders/${id}`);
      setOrder(res.data);
    } catch (err) {
      // Handled by interceptor
    } finally {
      setSubmittingSelfShip(false);
    }
  };

  const fetchOrder = useCallback(async (silent = false) => {
    // 1. Try to find the order in the cached order list first for instant load
    let foundOrder = null;
    const cachedList = apiClient.getCachedDataSync('/orders');
    if (cachedList && cachedList.data) {
      foundOrder = cachedList.data.find(o => String(o.id) === String(id));
    }
    // 2. If not found in list, check if there is a direct details cache
    if (!foundOrder) {
      const cachedDetail = apiClient.getCachedDataSync(`/orders/${id}`);
      if (cachedDetail) {
        foundOrder = cachedDetail.data;
      }
    }
    
    if (foundOrder) {
      setOrder(foundOrder);
      setLoading(false);
    } else if (!silent) {
      setLoading(true);
    }

    try {
      const res = await apiClient.cachedGet(`/orders/${id}`);
      let orderData = res.data;
      const isOnlinePending = isOnlinePaymentPendingOrder(orderData);
      const rememberedPaymentId = sessionStorage.getItem(`razorpay_payment_${id}`);

      if (isOnlinePending) {
        try {
          const syncResult = await paymentService.syncRazorpayPayment({
            order_id: id,
            razorpay_order_id: orderData.razorpay_order_id,
            razorpay_payment_id: rememberedPaymentId
          });
          if (syncResult?.success) {
            sessionStorage.removeItem(`razorpay_payment_${id}`);
            apiClient.invalidateCache(`/orders/${id}`);
            apiClient.invalidateCache('/orders');
            const refreshed = await apiClient.cachedGet(`/orders/${id}`);
            orderData = refreshed.data;
          }
        } catch {}
      }

      if (isPaidPaymentStatus(orderData.payment_status) || isRefundPaymentStatus(orderData.payment_status)) {
        localStorage.removeItem(PENDING_RAZORPAY_ORDER_KEY);
        sessionStorage.removeItem(`razorpay_payment_${id}`);
      }

      setOrder(orderData);
    } catch (err) {
      if (!silent && !foundOrder) {
        toast.error('Failed to load order details');
        navigate('/dashboard');
      }
    } finally {
      if (!silent) setLoading(false);
    }
  }, [id, navigate]);

  const handleRetryPayment = async () => {
    if (retryingPayment) return;
    setRetryingPayment(true);
    try {
      // Load Razorpay script dynamically
      const scriptLoaded = await new Promise((resolve) => {
        if (window.Razorpay) { resolve(true); return; }
        const script = document.createElement('script');
        script.src = 'https://checkout.razorpay.com/v1/checkout.js';
        script.async = true;
        script.onload = () => resolve(true);
        script.onerror = () => resolve(false);
        document.body.appendChild(script);
      });
      if (!scriptLoaded) {
        toast.error('Failed to load payment gateway. Please check your network.');
        setRetryingPayment(false);
        return;
      }

      let payableOrder = order;
      let rzpOrderId = order.razorpay_order_id;
      if (!rzpOrderId || (order.payment_method || '').toLowerCase() === 'cod') {
        const created = await paymentService.createRazorpayOrderForExistingOrder(id);
        payableOrder = created.order || order;
        rzpOrderId = created.razorpay_order_id || payableOrder.razorpay_order_id;
        setOrder(payableOrder);
      }
      const totalAmount = Number(payableOrder.total_amount || order.total_amount);

      const options = {
        key: process.env.REACT_APP_RAZORPAY_KEY_ID || 'rzp_live_SsPZ6WqWCSv7VP',
        amount: Math.round(totalAmount * 100),
        currency: 'INR',
        name: 'DurgaShakti Foils',
        description: `Order #${payableOrder.order_number || order.order_number}`,
        image: '/logo-durga.webp',
        theme: {
          color: '#006e1b',
          hide_topbar: false,
          backdrop_color: 'rgba(24, 28, 27, 0.55)'
        },
        modal: {
          ondismiss: function () {
            toast.info('Payment window closed. You can retry anytime within the time limit.');
            setRetryingPayment(false);
          },
          width: 1200,
          height: 900,
          maxHeight: '95vh',
          maxWidth: '95vw'
        },
        order_id: rzpOrderId,
        handler: async function (paymentResponse) {
          const paidPaymentId = paymentResponse?.razorpay_payment_id;
          if (paidPaymentId) {
            sessionStorage.setItem(`razorpay_payment_${id}`, paidPaymentId);
          }
          try {
            const verifyPayload = {
              razorpay_order_id: rzpOrderId,
              razorpay_payment_id: paidPaymentId,
              razorpay_signature: paymentResponse.razorpay_signature
            };
            const result = await paymentService.verifyRazorpayPayment(verifyPayload);
            if (result && result.success) {
              sessionStorage.removeItem(`razorpay_payment_${id}`);
              toast.success('Payment verified successfully!');
              const res = await apiClient.get(`/orders/${id}`);
              setOrder(res.data);
            } else {
              toast.error('Payment verification failed.');
            }
          } catch (err) {
            toast.error(err.response?.data?.detail || 'Payment verification failed.');
          } finally {
            setRetryingPayment(false);
          }
        },
        modal: {
          ondismiss: function () {
            toast.info('Payment window closed. You can retry anytime within the time limit.');
            setRetryingPayment(false);
          }
        }
      };

      const rzp = new window.Razorpay(options);
      rzp.on('payment.failed', function (resp) {
        toast.error(resp.error?.description || 'Payment failed. Please try again.');
        setRetryingPayment(false);
      });
      rzp.open();
    } catch (err) {
      toast.error('Something went wrong. Please try again.');
      setRetryingPayment(false);
    }
  };

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [id, isReturning]);

  useEffect(() => {
    if (!order) return;
    
    const isOnlinePending = isOnlinePaymentPendingOrder(order);

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

    // Countdown timer — tick every second
    const timer = setInterval(() => {
      const active = calculateTimeLeft();
      if (!active) {
        clearInterval(timer);
        const fetchOrderSilently = async () => {
          try {
            const res = await apiClient.get(`/orders/${id}`);
            setOrder(res.data);
          } catch {}
        };
        fetchOrderSilently();
      }
    }, 1000);

    // Auto-poll quickly to detect Razorpay-confirmed payments after a browser refresh.
    const poller = setInterval(async () => {
      try {
        const res = await apiClient.get(`/orders/${id}`);
        const updated = res.data;
        if (
          isPaidPaymentStatus(updated.payment_status) ||
          isRefundPaymentStatus(updated.payment_status) ||
          updated.order_status === 'confirmed' ||
          updated.order_status === 'cancelled'
        ) {
          setOrder(updated);
          clearInterval(poller);
          clearInterval(timer);
        }
      } catch {}
    }, 2500);

    return () => {
      clearInterval(timer);
      clearInterval(poller);
    };
  }, [order, id]);

  useEffect(() => {
    fetchOrder(false);
  }, [id, fetchOrder]);

  // Poll active/non-terminal orders every 5 seconds to get updates instantly
  useEffect(() => {
    if (!order) return;

    const isTerminal = ['cancelled', 'failed', 'refunded', 'return_rejected', 'delivered'].includes(
      (order.order_status || '').toLowerCase()
    );

    if (isTerminal) return;

    const pollTimer = setInterval(() => {
      fetchOrder(true);
    }, 5000);

    return () => clearInterval(pollTimer);
  }, [order, fetchOrder]);

  if (loading) {
    return (
      <div className="min-h-[calc(100vh-5rem)] bg-surface flex items-center justify-center">
        <PageLoader />
      </div>
    );
  }
  if (!order) return null;

  const handleFilesChange = (e) => {
    const files = Array.from(e.target.files);
    if (files.length > 0) {
      setReturnFiles(prev => [...prev, ...files]);
      
      files.forEach(file => {
        const reader = new FileReader();
        reader.onloadend = () => {
          setReturnPreviews(prev => [...prev, {
            type: file.type.startsWith('video/') ? 'video' : 'image',
            url: reader.result,
            name: file.name
          }]);
        };
        reader.readAsDataURL(file);
      });
    }
  };

  const handleRemoveFile = (index) => {
    setReturnFiles(prev => prev.filter((_, i) => i !== index));
    setReturnPreviews(prev => prev.filter((_, i) => i !== index));
  };

  const handleSubmitReturn = async (e) => {
    e.preventDefault();
    if (!reason) return;

    const selectedList = Object.keys(selectedItemsForReturn)
      .filter(key => selectedItemsForReturn[key].selected)
      .map(key => ({
        product_id: key,
        quantity: selectedItemsForReturn[key].quantity
      }));
      
    if (selectedList.length === 0) {
      toast.error('Please select at least one item to return');
      return;
    }

    if (returnFiles.length === 0) {
      toast.error('At least one proof image/video is mandatory for returns');
      return;
    }
    setSubmittingReturn(true);
    try {
      const formData = new FormData();
      const finalReason = reason === 'Other' ? `Other: ${otherDetails}` : reason;
      formData.append('reason', finalReason);
      formData.append('items', JSON.stringify(selectedList));
      formData.append('return_type', returnType);
      returnFiles.forEach(file => {
        formData.append('image', file);
      });
      await apiClient.post(`/orders/${id}/return`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      apiClient.invalidateCache('/orders');
      apiClient.invalidateCache(`/orders/${id}`);
      toast.success("Return request submitted successfully");
      setIsReturning(false);
      setReturnFiles([]);
      setReturnPreviews([]);
      // Reload order
      const res = await apiClient.get(`/orders/${id}`);
      setOrder(res.data);
    } catch (err) {
      // Handled by interceptor
    } finally {
      setSubmittingReturn(false);
    }
  };



  const getExpectedDeliveryDate = (createdAt) => {
    if (!createdAt) return '—';
    const date = new Date(createdAt);
    date.setDate(date.getDate() + 4);
    return date.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
  };

  const handleBuyItAgain = async (item) => {
    try {
      await addToCart(item.product_id, 1);
      toast.success(`${item.product_name} added to cart`);
      navigate('/cart');
    } catch (err) {
      toast.error('Failed to add item to cart');
    }
  };

  const canReviewOrder = () => {
    const status = (order.order_status || '').toLowerCase();
    return ['delivered', 'return_requested', 'return_approved', 'return_rejected', 'refunded'].includes(status);
  };

  const generateInvoiceHtml = (orderData) => {
    const itemsHtml = orderData.items.map(item => `
      <tr class="item">
        <td>${item.product_name}</td>
        <td style="text-align: center;">${item.quantity}</td>
        <td style="text-align: right;">₹${item.price.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
        <td style="text-align: right;">₹${(item.quantity * item.price).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
      </tr>
    `).join('');

    const metadata = orderData.shipping_address?.shipping_metadata;
    const subtotal = metadata?.subtotal ?? (orderData.items?.reduce((acc, item) => acc + (item.price * item.quantity), 0) || 0);
    const shipping = metadata?.shipping_cost ?? (Number(orderData.total_amount) > subtotal ? 350.0 : 0.0);
    const cgst = metadata?.cgst_amount ?? (Number(orderData.total_amount) > subtotal ? subtotal * 0.09 : 0.0);
    const sgst = metadata?.sgst_amount ?? (Number(orderData.total_amount) > subtotal ? subtotal * 0.09 : 0.0);
    const codCharge = metadata?.cod_charge ?? 0.0;

    return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Invoice - ${orderData.order_number}</title>
  <style>
    body { font-family: 'Inter', 'Helvetica Neue', Helvetica, Arial, sans-serif; color: #1e293b; margin: 0; padding: 40px; background-color: #f8fafc; }
    .invoice-box { max-width: 800px; margin: auto; padding: 40px; border: 1px solid #e2e8f0; border-radius: 24px; background: #ffffff; box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.05), 0 4px 6px -4px rgba(0, 0, 0, 0.05); }
    .header { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 2px solid #f1f5f9; padding-bottom: 30px; margin-bottom: 30px; }
    .logo { font-size: 24px; font-weight: 800; color: #006e1b; text-transform: uppercase; letter-spacing: -0.05em; }
    .invoice-title { text-align: right; }
    .invoice-title h1 { margin: 0; font-size: 28px; font-weight: 900; color: #0f172a; text-transform: uppercase; }
    .invoice-title p { margin: 5px 0 0 0; font-size: 14px; color: #64748b; font-weight: 600; }
    .details { display: grid; grid-template-columns: 1fr 1fr; gap: 40px; margin-bottom: 40px; }
    .details h3 { margin: 0 0 10px 0; font-size: 11px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.1em; color: #94a3b8; }
    .details p { margin: 0; font-size: 14px; font-weight: 600; line-height: 1.5; color: #334155; }
    .details .phone { font-weight: 700; color: #0f172a; margin-top: 5px; }
    .table-container { margin-bottom: 40px; }
    table { width: 100%; border-collapse: collapse; text-align: left; }
    th { padding: 12px 16px; font-size: 11px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.1em; color: #94a3b8; border-bottom: 2px solid #f1f5f9; }
    td { padding: 16px; font-size: 14px; font-weight: 600; color: #334155; border-bottom: 1px solid #f1f5f9; }
    tr.item:hover { background-color: #f8fafc; }
    .totals { display: flex; flex-direction: column; align-items: flex-end; gap: 12px; margin-top: 30px; }
    .total-row { display: flex; justify-content: space-between; width: 300px; font-size: 14px; font-weight: 600; color: #64748b; }
    .total-row.grand-total { font-size: 20px; font-weight: 900; color: #006e1b; border-top: 2px solid #f1f5f9; padding-top: 15px; margin-top: 5px; }
    .total-row span:last-child { font-weight: 800; color: #0f172a; }
    .total-row.grand-total span:last-child { color: #006e1b; }
    .footer { text-align: center; border-top: 2px solid #f1f5f9; padding-top: 30px; margin-top: 50px; font-size: 12px; color: #94a3b8; font-weight: 600; }
  </style>
</head>
<body>
  <div class="invoice-box">
    <div class="header">
      <div class="logo">DurgaShakti Foils</div>
      <div class="invoice-title">
        <h1>Invoice</h1>
        <p>Order #${orderData.order_number}</p>
      </div>
    </div>
    
    <div class="details">
      <div>
        <h3>Billed To</h3>
        <p>${orderData.shipping_address?.full_name}</p>
        <p>${orderData.shipping_address?.address_line1}</p>
        <p>${orderData.shipping_address?.city}, ${orderData.shipping_address?.state} - ${orderData.shipping_address?.pincode}</p>
        <p class="phone">Phone: ${orderData.shipping_address?.phone}</p>
      </div>
      <div style="text-align: right;">
        <h3>Invoice Details</h3>
        <p><strong>Date:</strong> ${new Date(orderData.created_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' })}</p>
        <p><strong>Payment Method:</strong> ${orderData.payment_method ? orderData.payment_method.toUpperCase() : 'N/A'}</p>
        <p><strong>Payment Status:</strong> ${orderData.payment_status ? orderData.payment_status.toUpperCase() : 'N/A'}</p>
        ${orderData.transaction_id ? `<p><strong>Transaction ID:</strong> <span style="font-family: monospace; font-size: 11px;">${orderData.transaction_id}</span></p>` : `<p><strong>Transaction ID:</strong> N/A (COD)</p>`}
      </div>
    </div>

    <div class="table-container">
      <table>
        <thead>
          <tr>
            <th>Product Description</th>
            <th style="text-align: center; width: 80px;">Qty</th>
            <th style="text-align: right; width: 120px;">Unit Price</th>
            <th style="text-align: right; width: 120px;">Amount</th>
          </tr>
        </thead>
        <tbody>
          ${itemsHtml}
        </tbody>
      </table>
    </div>

    <div class="totals">
      <div class="total-row">
        <span>Items Subtotal</span>
        <span>₹${subtotal.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
      </div>
      <div class="total-row">
        <span>Shipping Charges</span>
        <span>₹${shipping.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
      </div>
      ${codCharge > 0 ? `
      <div class="total-row">
        <span>COD Handling Fee</span>
        <span>₹${codCharge.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
      </div>
      ` : ''}
      ${cgst > 0 ? `
      <div class="total-row">
        <span>SGST (9%)</span>
        <span>₹${sgst.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
      </div>
      <div class="total-row">
        <span>CGST (9%)</span>
        <span>₹${cgst.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
      </div>
      ` : ''}
      <div class="total-row grand-total">
        <span>Grand Total</span>
        <span>₹${Number(orderData.total_amount).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
      </div>
    </div>

    <div class="footer">
      <p>Thank you for shopping with DurgaShakti Foils!</p>
      <p>For any queries, contact support at support@durgashaktifoils.com</p>
    </div>
  </div>
</body>
</html>
    `;
  };

  const handleDownloadInvoice = async () => {
    const progressId = startProgress({
      label: `Tax_Invoice_${order.order_number}.pdf`,
      type: 'download',
      fileType: 'file',
      message: 'Generating invoice...',
    });

    try {
      updateProgress(progressId, { progress: 45, message: 'Building tax invoice PDF...' });
      const response = await apiClient.get(`/orders/${order.id}/invoice`, { responseType: 'blob', timeout: 120000 });
      const blob = new Blob([response.data], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `Tax_Invoice_${order.order_number}.pdf`;
      document.body.appendChild(link);
      updateProgress(progressId, { progress: 85, message: 'Downloading invoice...' });
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      finishProgress(progressId, { message: 'Invoice ready!' });
    } catch (err) {
      finishProgress(progressId, { message: 'Failed to download invoice', isError: true });
    }
  };

  return (
    <div className="min-h-screen bg-slate-50/50 dark:bg-[#0C1310] pb-20 pt-8 mt-16">
      <div className="max-w-4xl mx-auto px-6">
        
        {/* Amazon-style Breadcrumbs */}
        <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-300 mb-6 font-semibold">
          <span className="hover:text-primary cursor-pointer transition-colors" onClick={() => navigate('/dashboard')}>Your Account</span>
          <span className="text-slate-400 dark:text-slate-500 font-normal">&rsaquo;</span>
          <span className="hover:text-primary cursor-pointer transition-colors" onClick={() => navigate('/dashboard')}>Your Orders</span>
          <span className="text-slate-400 dark:text-slate-500 font-normal">&rsaquo;</span>
          <span className="text-slate-800 dark:text-slate-200 font-bold">Order Details</span>
        </div>

        {/* Title and Subtitle Block */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
          <div>
            <h1 className="text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white">Order Details</h1>
            <p className="text-xs font-semibold text-slate-500 dark:text-slate-300 mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1">
              <span>Order placed {new Date(order.created_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' })}</span>
              <span className="text-slate-300 font-normal">|</span>
              <span className="flex items-center gap-1.5">
                Order number {order.order_number}
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(order.order_number);
                    toast.success('Order number copied!');
                  }}
                  className="p-1 text-slate-400 dark:text-slate-500 hover:text-slate-650 dark:text-slate-300 transition-colors inline-flex items-center"
                  title="Copy Order Number"
                >
                  <Copy className="w-3.5 h-3.5" />
                </button>
              </span>
            </p>
          </div>
          
          <div className="flex items-center gap-3">
            {((order.payment_status || '').toLowerCase() === 'paid' || (order.payment_status || '').toLowerCase() === 'completed') && (
              <button
                onClick={handleDownloadInvoice}
                className="flex items-center gap-2 text-xs font-black uppercase tracking-widest text-slate-600 dark:text-slate-400 hover:text-primary border border-slate-300 rounded-xl px-4 py-2.5 bg-white dark:bg-[#131B17] transition-all shadow-sm dark:shadow-none hover:bg-slate-50 dark:bg-[#26322B]/40"
              >
                <ExternalLink className="w-3.5 h-3.5" /> Invoice
              </button>
            )}
          </div>
        </div>

        {/* Admin Store Message Alert Banner */}
        {order.admin_message && !isReturning && (
          <div className="mb-6 p-4 rounded-2xl bg-primary/5 border border-primary/10 flex gap-3.5 items-start shadow-sm dark:shadow-none animate-in fade-in duration-300">
            <Info className="w-5 h-5 text-primary shrink-0 mt-0.5" />
            <div>
              <h4 className="text-[10px] font-black uppercase tracking-widest text-primary">Update from Store</h4>
              <p className="text-xs font-semibold text-slate-700 dark:text-slate-300 mt-0.5 leading-relaxed">{order.admin_message}</p>
            </div>
          </div>
        )}

        {/* 3-Column Info Card (Ship to | Payment Method | Order Summary) */}
        <div className="bg-white dark:bg-[#131B17] rounded-2xl border border-slate-200 dark:border-[#26322B] shadow-sm dark:shadow-none p-6 mb-6 grid grid-cols-1 md:grid-cols-3 gap-6 divide-y md:divide-y-0 md:divide-x divide-slate-100 dark:divide-[#26322B]">
          
          {/* Column 1: Ship to */}
          <div className="space-y-2">
            <h3 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-widest">Shipping Address</h3>
            <div className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed space-y-0.5">
              <p className="font-extrabold text-slate-900 dark:text-white">{order.shipping_address?.full_name}</p>
              <p>{order.shipping_address?.address_line1}</p>
              {order.shipping_address?.address_line2 && <p>{order.shipping_address.address_line2}</p>}
              <p>{order.shipping_address?.city}, {order.shipping_address?.state} - {order.shipping_address?.pincode}</p>
              <p className="text-slate-500 dark:text-slate-300 font-bold mt-2.5 flex items-center gap-1">
                <Phone className="w-3 h-3 text-slate-400 dark:text-slate-500" />
                {order.shipping_address?.phone}
              </p>
            </div>
          </div>

          {/* Column 2: Payment Method */}
          <div className="space-y-2 pt-4 md:pt-0 md:pl-6">
            <h3 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-widest">Payment Method</h3>
            <div className="text-xs text-slate-600 dark:text-slate-400 space-y-2.5">
              {(() => {
                const paymentMethod = (order.payment_method || '').toLowerCase();
                const paymentStatus = (order.payment_status || '').toLowerCase();
                const isPaid = isPaidPaymentStatus(paymentStatus);
                const isRefundPending = paymentStatus === 'refund_pending';
                const isRefundFailed = paymentStatus === 'refund_failed';
                const isRefunded = paymentStatus === 'refunded';
                const isCod = paymentMethod === 'cod';
                const canPayOnline = isCod && !isPaid && !isRefundPending && !isRefundFailed && !isRefunded && !['cancelled', 'failed', 'refunded', 'return_approved', 'delivered'].includes((order.order_status || '').toLowerCase());
                return (
                  <>
                    <p className="font-extrabold text-slate-900 dark:text-white uppercase tracking-wider">{isCod ? 'Cash on Delivery' : 'Prepaid Online'}</p>
                    {isRefunded ? (
                      <div className="bg-emerald-50 dark:bg-emerald-950/20 text-emerald-800 dark:text-emerald-300 text-[10px] rounded-xl p-3 border border-emerald-100/60 dark:border-emerald-900/30 space-y-1.5 font-semibold">
                        <p className="font-extrabold flex items-center gap-1.5 text-emerald-700 dark:text-emerald-400">
                          <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full"></span> Refund Credited
                        </p>
                        {order.transaction_id && order.transaction_id !== 'COD' && (
                          <p className="font-mono text-slate-650 dark:text-slate-300 break-all select-all flex items-center gap-1">
                            Paid Txn: {order.transaction_id}
                            <button
                              onClick={() => {
                                navigator.clipboard.writeText(order.transaction_id);
                                toast.success('Transaction ID copied!');
                              }}
                              className="p-0.5 text-slate-400 dark:text-slate-500 hover:text-slate-650 dark:text-slate-350 transition-colors inline-flex items-center"
                              title="Copy Transaction ID"
                            >
                              <Copy className="w-3.5 h-3.5" />
                            </button>
                          </p>
                        )}
                      </div>
                    ) : isRefundFailed ? (
                      <div className="bg-rose-50 dark:bg-rose-950/20 text-rose-800 dark:text-rose-300 text-[10px] rounded-xl p-3 border border-rose-100/80 dark:border-rose-900/30 space-y-1 font-semibold">
                        <p className="font-extrabold flex items-center gap-1.5 text-rose-700 dark:text-rose-400">
                          <span className="w-1.5 h-1.5 bg-rose-500 rounded-full"></span> Refund Failed
                        </p>
                        {order.refund_error && (
                          <p className="text-rose-750 dark:text-rose-350 leading-snug">{order.refund_error}</p>
                        )}
                      </div>
                    ) : isRefundPending ? (
                      <div className="bg-sky-50 dark:bg-sky-950/20 text-sky-800 dark:text-sky-300 text-[10px] rounded-xl p-3 border border-sky-100/80 dark:border-sky-900/30 space-y-1.5 font-semibold">
                        <p className="font-extrabold flex items-center gap-1.5 text-sky-700 dark:text-sky-400">
                          <span className="w-1.5 h-1.5 bg-sky-500 rounded-full animate-pulse"></span> Refund Initiated
                        </p>
                        <p className="text-slate-500 dark:text-slate-400 uppercase tracking-widest text-[8px] font-black">Razorpay is processing the refund.</p>
                        {order.transaction_id && order.transaction_id !== 'COD' && (
                          <p className="font-mono text-slate-650 dark:text-slate-300 break-all select-all flex items-center gap-1">
                            Paid Txn: {order.transaction_id}
                            <button
                              onClick={() => {
                                navigator.clipboard.writeText(order.transaction_id);
                                toast.success('Transaction ID copied!');
                              }}
                              className="p-0.5 text-slate-400 dark:text-slate-500 hover:text-slate-650 dark:text-slate-350 transition-colors inline-flex items-center"
                              title="Copy Transaction ID"
                            >
                              <Copy className="w-3.5 h-3.5" />
                            </button>
                          </p>
                        )}
                      </div>
                    ) : isPaid ? (
                      <div className="bg-emerald-50 dark:bg-emerald-950/20 text-emerald-800 dark:text-emerald-300 text-[10px] rounded-xl p-3 border border-emerald-100/60 dark:border-emerald-900/30 space-y-1.5 font-semibold">
                        <p className="font-extrabold flex items-center gap-1.5 text-emerald-700 dark:text-emerald-400">
                          <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full"></span> Paid
                        </p>
                        {order.transaction_id && order.transaction_id !== 'COD' && (
                          <p className="font-mono text-slate-650 dark:text-slate-300 break-all select-all flex items-center gap-1">
                            Txn: {order.transaction_id}
                            <button
                              onClick={() => {
                                navigator.clipboard.writeText(order.transaction_id);
                                toast.success('Transaction ID copied!');
                              }}
                              className="p-0.5 text-slate-400 dark:text-slate-500 hover:text-slate-650 dark:text-slate-350 transition-colors inline-flex items-center"
                              title="Copy Transaction ID"
                            >
                              <Copy className="w-3.5 h-3.5" />
                            </button>
                          </p>
                        )}
                      </div>
                    ) : isCod ? (
                      <div className="bg-slate-50 dark:bg-[#26322B]/40 text-slate-700 dark:text-slate-300 text-[10px] rounded-xl p-3 border border-slate-200 dark:border-[#26322B] space-y-2 font-semibold">
                        <p className="font-extrabold flex items-center gap-1.5 text-slate-700 dark:text-slate-300">
                          <span className="w-1.5 h-1.5 bg-slate-400 rounded-full"></span> Cash to be collected on delivery
                        </p>
                        {canPayOnline && (
                          <button
                            onClick={handleRetryPayment}
                            disabled={retryingPayment}
                            className="w-full bg-primary hover:bg-emerald-hover text-white font-black text-[10px] uppercase tracking-widest py-2.5 rounded-lg shadow-sm dark:shadow-none transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-1.5"
                          >
                            <CreditCard className="w-3.5 h-3.5" />
                            {retryingPayment ? 'Processing...' : 'Pay Online'}
                          </button>
                        )}
                      </div>
                    ) : (order.order_status || '').toLowerCase() === 'overdue' ? (
                      <div className="bg-rose-50 text-rose-800 text-[10px] rounded-xl p-3 border border-rose-100/80 space-y-1 font-semibold">
                        <p className="font-extrabold flex items-center gap-1.5 text-rose-700">
                          <span className="w-1.5 h-1.5 bg-rose-500 rounded-full"></span> Payment Window Expired
                        </p>
                        <p className="text-slate-500 dark:text-slate-300 uppercase tracking-widest text-[8px] font-black">This order is overdue and cancelled.</p>
                      </div>
                    ) : (
                      <div className="bg-amber-50 text-amber-800 text-[10px] rounded-xl p-3 border border-amber-100/60 space-y-2 font-semibold">
                        <p className="font-extrabold flex items-center gap-1.5 text-amber-700">
                          <span className="w-1.5 h-1.5 bg-amber-500 rounded-full animate-pulse"></span> Confirming Payment
                        </p>
                        <p className="text-slate-500 dark:text-slate-300 uppercase tracking-widest text-[8px] font-black">Status updates automatically.</p>
                        {timeLeft && timeLeft !== 'Expired' && !['cancelled', 'failed'].includes((order.order_status || '').toLowerCase()) && (
                          <div className="mt-2 space-y-2">
                            <div className="flex items-center gap-2 bg-white dark:bg-[#26322B]/60 rounded-lg px-3 py-2 border border-amber-200">
                              <Clock className="w-3.5 h-3.5 text-amber-600" />
                              <span className="text-xs font-black text-amber-800 tabular-nums">{timeLeft}</span>
                              <span className="text-[9px] font-bold text-amber-600">remaining in payment window</span>
                            </div>
                            <button
                              onClick={handleRetryPayment}
                              disabled={retryingPayment}
                              className="w-full bg-primary hover:bg-emerald-hover text-white font-black text-[10px] uppercase tracking-widest py-2.5 rounded-lg shadow-sm dark:shadow-none transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-1.5"
                            >
                              <CreditCard className="w-3.5 h-3.5" />
                              {retryingPayment ? 'Processing...' : 'Complete Payment Now'}
                            </button>
                          </div>
                        )}
                        {timeLeft === 'Expired' && (
                          <div className="mt-2 bg-rose-50 text-rose-700 text-[9px] font-bold rounded-lg px-3 py-2 border border-rose-200">
                            Payment window has expired. This order will be automatically cancelled.
                          </div>
                        )}
                      </div>
                    )}
                  </>
                );
              })()}
            </div>
          </div>

          {/* Column 3: Order Summary */}
          <div className="space-y-2 pt-4 md:pt-0 md:pl-6">
            <h3 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-widest">Order Summary</h3>
            {(() => {
              const metadata = order.shipping_address?.shipping_metadata;
              const subtotal = metadata?.subtotal ?? (order.items?.reduce((acc, item) => acc + (item.price * item.quantity), 0) || 0);
              const shipping = metadata?.shipping_cost ?? (Number(order.total_amount) > subtotal ? 350.0 : 0.0);
              const cgst = metadata?.cgst_amount ?? (Number(order.total_amount) > subtotal ? subtotal * 0.09 : 0.0);
              const sgst = metadata?.sgst_amount ?? (Number(order.total_amount) > subtotal ? subtotal * 0.09 : 0.0);
              const codCharge = metadata?.cod_charge ?? 0.0;

              return (
                <div className="space-y-2 text-xs text-slate-500 dark:text-slate-300 font-semibold">
                  <div className="flex justify-between">
                    <span>Item(s) Subtotal:</span>
                    <span className="text-slate-900 dark:text-white">₹{subtotal.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Shipping Charges:</span>
                    <span className="text-slate-900 dark:text-white">
                      {shipping > 0 
                        ? `₹${shipping.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` 
                        : "FREE"
                      }
                    </span>
                  </div>
                  {codCharge > 0 && (
                    <div className="flex justify-between">
                      <span>COD Handling Fee:</span>
                      <span className="text-slate-900 dark:text-white">₹{codCharge.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                    </div>
                  )}
                  {cgst > 0 && (
                    <>
                      <div className="flex justify-between">
                        <span>SGST (9%):</span>
                        <span className="text-slate-900 dark:text-white">₹{sgst.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>CGST (9%):</span>
                        <span className="text-slate-900 dark:text-white">₹{cgst.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                      </div>
                    </>
                  )}
                  <div className="h-px bg-slate-100 dark:bg-[#26322B] my-1" />
                  <div className="flex justify-between font-black text-slate-900 dark:text-white text-sm pt-0.5">
                    <span>Grand Total:</span>
                    <span className="text-primary text-base font-extrabold">₹{Number(order.total_amount).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                  </div>
                </div>
              );
            })()}
          </div>
        </div>

        {/* Inline Return Form Box */}
        {isReturning && (
          <div className="bg-white dark:bg-[#131B17] rounded-2xl border border-slate-200 dark:border-[#26322B] shadow-sm dark:shadow-none p-6 mb-6 animate-in slide-in-from-top-4 duration-300">
            <div className="flex items-center justify-between pb-3.5 border-b border-slate-100 dark:border-[#26322B] mb-6">
              <h3 className="text-base font-bold text-slate-900 dark:text-white">Request Return</h3>
              <button 
                onClick={() => {
                  setIsReturning(false);
                  setReason('');
                  setOtherDetails('');
                  setReturnFiles([]);
                  setReturnPreviews([]);
                }}
                className="text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:text-slate-400 transition-colors p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmitReturn} className="space-y-5">
              <div className="bg-amber-50 dark:bg-amber-950/20 text-amber-800 dark:text-amber-300 text-[10px] rounded-xl p-3 border border-amber-100/60 dark:border-amber-900/30 flex gap-2 items-start font-semibold">
                <Info className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                <p className="leading-normal">
                  <strong>Return Policy:</strong> Return or exchange requests must be submitted within <strong>3 days</strong> of the delivery date.
                </p>
              </div>

              <div className="space-y-3">
                <label className="block text-[10px] font-black uppercase tracking-widest text-slate-500 dark:text-slate-300">Select Items to Return</label>
                <div className="space-y-2.5 max-h-[250px] overflow-y-auto pr-1">
                  {order.items.filter(item => !item.return_status).map((item) => {
                    const returnInfo = selectedItemsForReturn[item.product_id] || { selected: false, quantity: 1 };
                    return (
                      <div key={item.product_id} className="flex items-center justify-between p-3 border border-slate-100 dark:border-[#26322B] rounded-xl hover:bg-slate-50 dark:bg-[#26322B]/40 transition-colors">
                        <div className="flex items-center gap-3">
                          <input
                            type="checkbox"
                            checked={returnInfo.selected}
                            onChange={(e) => {
                              setSelectedItemsForReturn(prev => ({
                                ...prev,
                                [item.product_id]: { ...returnInfo, selected: e.target.checked }
                              }));
                            }}
                            className="w-4 h-4 text-primary rounded border-slate-350 focus:ring-primary/20"
                          />
                          {item.image_url && (
                            <img 
                              src={formatImageUrl(item.image_url)} 
                              onError={(e) => { e.target.src = '/logo-durga.webp'; }}
                              alt="" 
                              className="w-10 h-10 rounded-lg object-cover bg-slate-50 dark:bg-[#26322B]/40 border border-slate-100 dark:border-[#26322B]" 
                            />
                          )}
                          <div>
                            <p className="text-xs font-bold text-slate-800 dark:text-slate-200">{item.product_name}</p>
                            <p className="text-[10px] text-slate-400 dark:text-slate-500 font-bold">₹{item.price} • Original Qty: {item.quantity}</p>
                          </div>
                        </div>
                        {returnInfo.selected && (
                          <div className="flex items-center gap-1.5 font-bold">
                            <span className="text-[10px] text-slate-400 dark:text-slate-500 font-extrabold uppercase">Qty:</span>
                            <select
                              value={returnInfo.quantity}
                              onChange={(e) => {
                                setSelectedItemsForReturn(prev => ({
                                  ...prev,
                                  [item.product_id]: { ...returnInfo, quantity: parseInt(e.target.value) }
                                }));
                              }}
                                                            className="px-2 py-1 rounded-lg border border-slate-200 dark:border-[#26322B] text-xs font-bold bg-white dark:bg-[#131B17] text-slate-800 dark:text-white focus:outline-none"
                            >
                              {[...Array(item.quantity)].map((_, i) => (
                                <option key={i+1} value={i+1}>{i+1}</option>
                              ))}
                            </select>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="space-y-3">
                <label className="block text-[10px] font-black uppercase tracking-widest text-slate-500 dark:text-slate-300">Return Option</label>
                <div className="grid grid-cols-2 gap-4">
                  <div 
                    onClick={() => setReturnType('refund')}
                    className={`p-4 rounded-2xl border-2 cursor-pointer transition-all ${
                      returnType === 'refund' 
                        ? 'border-primary bg-primary/5 text-primary' 
                        : 'border-slate-200 dark:border-[#26322B] hover:border-slate-300 text-slate-600 dark:text-slate-400 bg-white dark:bg-[#131B17]'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-black uppercase tracking-wider">Refund</span>
                      {returnType === 'refund' && <Check className="w-4 h-4 stroke-[3px]" />}
                    </div>
                    <p className="text-[10px] font-medium mt-1 text-slate-500 dark:text-slate-300 leading-snug">Original payment method (credited in 5-7 business days)</p>
                  </div>
                  <div 
                    onClick={() => setReturnType('exchange')}
                    className={`p-4 rounded-2xl border-2 cursor-pointer transition-all ${
                      returnType === 'exchange' 
                        ? 'border-primary bg-primary/5 text-primary' 
                        : 'border-slate-200 dark:border-[#26322B] hover:border-slate-300 text-slate-600 dark:text-slate-400 bg-white dark:bg-[#131B17]'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-black uppercase tracking-wider">Exchange</span>
                      {returnType === 'exchange' && <Check className="w-4 h-4 stroke-[3px]" />}
                    </div>
                    <p className="text-[10px] font-medium mt-1 text-slate-500 dark:text-slate-300 leading-snug">Swap for the same product (self-ship return to warehouse)</p>
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <label className="block text-[10px] font-black uppercase tracking-widest text-slate-500 dark:text-slate-300">Reason for Return</label>
                <select
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  required
                   className="w-full h-12 px-4 rounded-xl border border-slate-200 dark:border-[#26322B] text-xs font-bold bg-white dark:bg-[#131B17] text-slate-800 dark:text-white focus:ring-2 focus:ring-primary/20 focus:outline-none"
                >
                  <option value="">Select a reason...</option>
                  <option value="Damaged/Defective Product">Damaged or Defective Product</option>
                  <option value="Incorrect Item Received">Incorrect Item Received</option>
                  <option value="Poor Quality/Not as Expected">Poor Quality / Not as Expected</option>
                  <option value="Other">Other (Specify below)</option>
                </select>
              </div>

              {reason === 'Other' && (
                <div className="space-y-2 animate-fade-in">
                  <label className="block text-[10px] font-black uppercase tracking-widest text-slate-500 dark:text-slate-300">Details</label>
                  <textarea
                    placeholder="Please provide details about the return reason..."
                    value={otherDetails}
                    onChange={(e) => setOtherDetails(e.target.value)}
                    required
                    className="w-full p-4 min-h-[100px] rounded-xl border border-slate-200 dark:border-[#26322B] text-xs font-semibold bg-white dark:bg-[#131B17] focus:ring-2 focus:ring-primary/20 focus:outline-none resize-none"
                  />
                </div>
              )}

              <div className="space-y-2">
                <label className="block text-[10px] font-black uppercase tracking-widest text-slate-500 dark:text-slate-300">Upload Proof (Images/Videos) *</label>
                <div className="relative group border-2 border-dashed border-slate-200 dark:border-[#26322B] hover:border-primary transition-all duration-300 rounded-2xl p-6 flex flex-col items-center justify-center bg-white dark:bg-[#131B17] hover:bg-primary/5 cursor-pointer min-h-[140px]">
                  <input
                    type="file"
                    multiple
                    accept="image/*,video/*"
                    onChange={handleFilesChange}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                  />
                  <div className="text-center flex flex-col items-center justify-center pointer-events-none">
                    <Upload className="w-8 h-8 text-slate-400 dark:text-slate-500 group-hover:text-primary transition-colors mb-2" />
                    <span className="text-xs font-bold text-slate-700 dark:text-slate-300 group-hover:text-primary">Select Images / Videos</span>
                    <span className="text-[10px] text-slate-400 dark:text-slate-500 mt-1">Upload multiple files up to 20MB each</span>
                  </div>
                </div>

                {returnPreviews.length > 0 && (
                  <div className="grid grid-cols-3 gap-3 pt-2">
                    {returnPreviews.map((preview, index) => (
                      <div key={index} className="relative w-full h-24 rounded-xl overflow-hidden border border-slate-200 dark:border-[#26322B] bg-slate-50 dark:bg-[#26322B]/40 flex items-center justify-center">
                        {preview.type === 'video' ? (
                          <video src={`${preview.url}#t=0.001`} className="w-full h-full object-cover" preload="metadata" />
                        ) : (
                          <img src={preview.url} alt="Preview" className="w-full h-full object-cover" />
                        )}
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            e.preventDefault();
                            handleRemoveFile(index);
                          }}
                          className="absolute top-1.5 right-1.5 w-6 h-6 rounded-full bg-slate-900/70 text-white flex items-center justify-center hover:bg-slate-900 transition-colors z-20"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="flex gap-3 pt-2">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => {
                    setIsReturning(false);
                    setReason('');
                    setOtherDetails('');
                    setReturnFiles([]);
                    setReturnPreviews([]);
                  }}
                  className="flex-1 h-12 rounded-xl font-black uppercase tracking-widest border border-slate-200 dark:border-[#26322B] text-[10px] text-slate-600 dark:text-slate-400 hover:bg-slate-100"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={submittingReturn || !reason}
                  className="flex-1 h-12 rounded-xl font-black uppercase tracking-widest text-[10px] bg-primary hover:bg-emerald-hover text-white shadow-lg shadow-emerald-glow animate-pulse-subtle"
                >
                  {submittingReturn ? 'Submitting...' : 'Submit Request'}
                </Button>
              </div>
            </form>
          </div>
        )}



        {/* Elegant Horizontal/Responsive Stepper Timeline Card */}
        {!isReturning && (
          <div className="bg-white dark:bg-[#131B17] rounded-2xl border border-slate-200 dark:border-[#26322B] shadow-sm dark:shadow-none p-6 mb-6">
            <div className="flex items-center justify-between mb-6 pb-2 border-b border-slate-50 dark:border-[#26322B]">
              <h3 className="text-xs font-black text-slate-500 dark:text-slate-300 uppercase tracking-widest">Shipment Timeline</h3>
              <span className={`text-[10px] font-black uppercase tracking-widest px-3 py-1 rounded-full ${
                order.order_status === 'delivered' ? 'bg-emerald-100 text-emerald-800' :
                order.order_status === 'cancelled' ? 'bg-rose-100 text-rose-800' :
                (() => {
                  const s = (order.order_status || '').toLowerCase();
                  const p = (order.payment_status || '').toLowerCase();
                  if (s === 'return_approved') {
                    if (p === 'refunded') return 'bg-emerald-105 text-emerald-800';
                    if (p === 'refund_failed') return 'bg-rose-100 text-rose-800 border border-rose-200';
                    if (p === 'refund_pending') return 'bg-sky-100 text-sky-850 border border-sky-200 animate-pulse';
                    
                    const items = order.items || [];
                    if (items.some(i => i.return_status === 'RETURN_RECEIVED')) return 'bg-purple-100 text-purple-800 border border-purple-200';
                    if (items.some(i => i.return_status === 'SELF_SHIPPED')) return 'bg-indigo-100 text-indigo-800 border border-indigo-200';
                    return 'bg-teal-100 text-teal-800 border border-teal-200';
                  }
                  return 'bg-primary/10 text-primary';
                })()
              }`}>
                {(() => {
                  const s = (order.order_status || '').toLowerCase();
                  const p = (order.payment_status || '').toLowerCase();
                  if (s === 'return_approved') {
                    if (p === 'refunded') return 'Refund Credited';
                    if (p === 'refund_failed') return 'Refund Failed';
                    if (p === 'refund_pending') return 'Refund Initiated';
                    
                    const items = order.items || [];
                    if (items.some(i => i.return_status === 'RETURN_RECEIVED')) return 'Return Received';
                    if (items.some(i => i.return_status === 'SELF_SHIPPED')) return 'Self-Shipped (Verification Pending)';
                    return 'Return Approved (Self-Ship Pending)';
                  }
                  return order.order_status?.replace('_', ' ');
                })()}
              </span>
            </div>

            {(() => {
              const status = (order.order_status || '').toLowerCase();
              const paymentStatus = (order.payment_status || '').toLowerCase();
              const isPaid = isPaidPaymentStatus(paymentStatus) || isRefundPaymentStatus(paymentStatus) || order.payment_method?.toLowerCase() === 'cod';
              const isConfirmed = ['confirmed', 'packaging', 'packed', 'shipped', 'in_transit', 'out_for_delivery', 'delivered', 'return_requested', 'return_approved', 'return_rejected', 'refunded'].includes(status);
              const isPacked = ['packaging', 'packed', 'shipped', 'in_transit', 'out_for_delivery', 'delivered', 'return_requested', 'return_approved', 'return_rejected', 'refunded'].includes(status);
              const isShipped = ['shipped', 'in_transit', 'out_for_delivery', 'delivered', 'return_requested', 'return_approved', 'return_rejected', 'refunded'].includes(status);
              const isInTransit = ['in_transit', 'out_for_delivery', 'delivered', 'return_requested', 'return_approved', 'return_rejected', 'refunded'].includes(status);
              const isOutForDelivery = ['out_for_delivery', 'delivered', 'return_requested', 'return_approved', 'return_rejected', 'refunded'].includes(status);
              const isDelivered = ['delivered', 'return_requested', 'return_approved', 'return_rejected', 'refunded'].includes(status);

              const steps = [
                { label: 'Order Placed', active: true, date: order.created_at },
                { label: 'Payment Successful', active: isPaid, date: isPaid ? (order.transaction_date || order.created_at) : null },
                { label: 'Order Confirmed', active: isConfirmed, date: isConfirmed ? order.created_at : null },
                { label: 'Packed', active: isPacked, date: null },
                { label: 'Shipped', active: isShipped, date: isShipped ? (order.shipped_at || order.shipment_date) : null },
                { label: 'In Transit', active: isInTransit, date: null },
                { label: 'Out For Delivery', active: isOutForDelivery, date: null },
                { label: 'Delivered', active: isDelivered, date: isDelivered ? (order.delivered_at || order.updated_at) : null },
              ];

              if (status === 'cancelled') {
                return (
                  <div className="flex items-center gap-3 bg-rose-50 border border-rose-100 rounded-xl p-4 text-rose-800 font-semibold text-xs">
                    <X className="w-5 h-5 text-rose-600 shrink-0" />
                    <div>
                      <p className="font-extrabold text-rose-900">Order Cancelled</p>
                      <p className="text-rose-600 mt-0.5">This order was cancelled on {new Date(order.updated_at || order.created_at).toLocaleString('en-IN')}</p>
                    </div>
                  </div>
                );
              }

              return (
                <div className="relative pt-6 pb-2 overflow-x-auto">
                  <div className="min-w-[700px] relative">
                    {/* Progress Line Background */}
                    <div className="absolute top-[16px] left-[5%] right-[5%] h-1 bg-slate-100 -translate-y-1/2 rounded-full" />
                    {/* Active Progress Line */}
                    <div 
                      className="absolute top-[16px] left-[5%] h-1 bg-primary -translate-y-1/2 rounded-full transition-all duration-700 ease-out" 
                      style={{ 
                        width: isDelivered ? '90%' : isOutForDelivery ? '77.14%' : isInTransit ? '64.28%' : isShipped ? '51.42%' : isPacked ? '38.56%' : isConfirmed ? '25.7%' : isPaid ? '12.85%' : '0%' 
                      }} 
                    />

                    {/* Stepper Dots */}
                    <div className="relative flex justify-between">
                      {steps.map((step, idx) => (
                        <div key={idx} className="flex flex-col items-center w-[12.5%] text-center">
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center border-4 border-white shadow-sm dark:shadow-none z-10 transition-all duration-300 ${
                            step.active 
                              ? 'bg-primary text-white ring-4 ring-primary/10' 
                              : 'bg-slate-200 text-slate-400 dark:text-slate-500'
                          }`}>
                            {step.active ? <Check className="w-3.5 h-3.5 stroke-[3px]" /> : <span className="text-[10px] font-bold">{idx + 1}</span>}
                          </div>
                          <p className={`text-[10px] mt-2.5 leading-tight font-black ${step.active ? 'text-primary' : 'text-slate-400 dark:text-slate-500'}`}>
                            {step.label}
                          </p>
                          {step.date && (
                            <p className="text-[8px] font-bold text-slate-400 dark:text-slate-500 mt-1">
                              {new Date(step.date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}
                            </p>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              );
            })()}
          </div>
        )}

        {(() => {
          const status = (order.order_status || '').toLowerCase();
          const paymentStatus = (order.payment_status || '').toLowerCase();
          
          // Identify specific item return statuses
          const returnedItems = order.items?.filter(item => item.return_status) || [];
          const hasRequested = returnedItems.some(i => i.return_status === 'RETURN_REQUESTED');
          const hasApproved = returnedItems.some(i => ['RETURN_APPROVED', 'SELF_SHIPPED', 'RETURN_RECEIVED', 'REFUND_INITIATED', 'REFUND_COMPLETED'].includes(i.return_status));
          const hasSelfShipped = returnedItems.some(i => ['SELF_SHIPPED', 'RETURN_RECEIVED', 'REFUND_INITIATED', 'REFUND_COMPLETED'].includes(i.return_status));
          const hasReceived = returnedItems.some(i => ['RETURN_RECEIVED', 'REFUND_INITIATED', 'REFUND_COMPLETED'].includes(i.return_status));
          const hasRefunded = returnedItems.some(i => ['REFUND_INITIATED', 'REFUND_COMPLETED'].includes(i.return_status)) || paymentStatus === 'refunded' || status === 'refunded' || paymentStatus === 'refund_pending';
          const isRejected = (returnedItems.length > 0 && returnedItems.every(i => i.return_status === 'RETURN_REJECTED')) || status === 'return_rejected';
          const isRefundFailed = paymentStatus === 'refund_failed';

          // Show return timeline if any item has been requested, approved, shipped, received, or refunded
          const showTimeline = returnedItems.length > 0 && !isReturning;
          if (!showTimeline) return null;

          // Steps list config
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
            // Refund Timeline (Visible after admin receives returned order)
            const isRefundInitiated = paymentStatus === 'refund_pending' || isRefundFailed || paymentStatus === 'refunded';
            const isRefundCredited = paymentStatus === 'refunded';
            returnSteps = [
              { label: 'Return Received', active: true, date: order.updated_at },
              { label: 'Refund Initiated', active: isRefundInitiated, date: isRefundInitiated ? order.updated_at : null },
              { label: isRefundFailed ? 'Refund Failed' : 'Refund Credited', active: isRefundCredited, date: isRefundCredited ? order.updated_at : null, rejected: isRefundFailed }
            ];
            progressWidth = isRefundCredited ? '100%' : isRefundInitiated ? '50%' : '0%';
            timelineTitle = 'Refund Process Timeline';
          } else {
            // Self Shipment & Tracking Timeline
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
            <div className="bg-white dark:bg-[#131B17] rounded-2xl border border-slate-200 dark:border-[#26322B] shadow-sm dark:shadow-none p-6 mb-6">
              <div className="flex items-center justify-between mb-6 pb-2 border-b border-slate-50 dark:border-[#26322B]">
                <h3 className="text-xs font-black text-slate-500 dark:text-slate-300 uppercase tracking-widest">{timelineTitle}</h3>
                <span className={`text-[10px] font-black uppercase tracking-widest px-3 py-1 rounded-full ${
                  isRejected || isRefundFailed ? 'bg-rose-100 text-rose-800' : hasRefunded ? (paymentStatus === 'refunded' ? 'bg-emerald-100 text-emerald-800' : 'bg-sky-100 text-sky-800') : 'bg-sky-100 text-sky-800'
                }`}>
                  {isRejected ? 'Return Rejected' : isRefundFailed ? 'Refund Failed' : paymentStatus === 'refunded' ? 'Refund Credited' : paymentStatus === 'refund_pending' ? 'Refund Initiated' : hasReceived ? 'Return Received' : hasSelfShipped ? 'Self Shipped' : hasApproved ? 'Approved' : 'Requested'}
                </span>
              </div>
              <div className="relative pt-6 pb-2 overflow-x-auto">
                <div className="relative" style={{ minWidth: returnSteps.length === 2 ? '300px' : '560px' }}>
                  <div className="absolute top-[16px] left-[12%] right-[12%] h-1 bg-slate-100 -translate-y-1/2 rounded-full" />
                  <div
                    className={`absolute top-[16px] left-[12%] h-1 -translate-y-1/2 rounded-full transition-all duration-700 ease-out ${isRejected || isRefundFailed ? 'bg-rose-500' : 'bg-primary'}`}
                    style={{ width: `calc(${progressWidth} * 0.76)` }}
                  />
                  <div className="relative flex justify-between px-[8%]">
                    {returnSteps.map((step, idx) => (
                      <div key={step.label} className="flex flex-col items-center text-center" style={{ width: `${100 / returnSteps.length}%` }}>
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center border-4 border-white shadow-sm dark:shadow-none z-10 transition-all duration-300 ${
                          step.active
                            ? step.rejected ? 'bg-rose-600 text-white ring-4 ring-rose-100' : 'bg-primary text-white ring-4 ring-primary/10'
                            : 'bg-slate-200 text-slate-400 dark:text-slate-500'
                        }`}>
                          {step.active ? (step.rejected ? <X className="w-3.5 h-3.5 stroke-[3px]" /> : <Check className="w-3.5 h-3.5 stroke-[3px]" />) : <span className="text-[10px] font-bold">{idx + 1}</span>}
                        </div>
                        <p className={`text-[10px] mt-2.5 leading-tight font-black ${step.active ? step.rejected ? 'text-rose-600' : 'text-primary' : 'text-slate-400 dark:text-slate-500'}`}>
                          {step.label}
                        </p>
                        {step.date && (
                          <p className="text-[8px] font-bold text-slate-400 dark:text-slate-500 mt-1">
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

        {/* Courier Details Card */}
        {order.tracking_id && (
          <div className="bg-sky-50/50 dark:bg-[#0f1f1a] border border-sky-100 dark:border-[#1e3028] rounded-2xl p-5 mb-6 shadow-sm dark:shadow-none flex flex-col md:flex-row md:items-center justify-between gap-4 animate-in fade-in duration-300">
            <div className="flex items-start gap-4">
              <Truck className="w-6 h-6 text-sky-600 shrink-0 mt-0.5" />
              <div className="space-y-1 flex-1">
                <h4 className="text-[10px] font-black text-sky-700 dark:text-sky-400 uppercase tracking-widest">Shipment Tracking details</h4>
                <div className="text-xs text-slate-650 dark:text-slate-300 leading-relaxed font-semibold">
                  <p>Courier: <span className="font-extrabold text-slate-900 dark:text-white">{order.courier_name || order.carrier || 'Courier'}</span></p>
                  <p className="flex items-center gap-2 mt-0.5">
                    Tracking Number: <span className="font-mono text-slate-900 dark:text-white font-extrabold select-all">{order.tracking_number || order.tracking_id}</span>
                    <button
                      onClick={() => {
                        navigator.clipboard.writeText(order.tracking_number || order.tracking_id);
                        toast.success('Tracking number copied!');
                      }}
                      className="p-1 text-slate-400 dark:text-slate-500 hover:text-slate-655 transition-colors inline-flex items-center"
                      title="Copy Tracking Number"
                    >
                      <Copy className="w-3.5 h-3.5" />
                    </button>
                  </p>
                  {order.expected_delivery_date && (
                    <p className="mt-0.5 text-slate-700 dark:text-slate-300">Estimated Delivery: <span className="font-extrabold text-slate-900 dark:text-white">{new Date(order.expected_delivery_date).toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' })}</span></p>
                  )}
                  {order.shipment_notes && (
                    <p className="mt-1 text-slate-700 dark:text-slate-200 italic bg-white dark:bg-[#19231F] p-2 rounded-lg border border-slate-100 dark:border-[#26322B]">Notes: {order.shipment_notes}</p>
                  )}
                </div>
              </div>
            </div>
            {(() => {
              const trackingNum = order.tracking_number || order.tracking_id;
              const cleanNum = trackingNum ? String(trackingNum).trim() : '';
              const carrier = String(order.courier_name || order.carrier || '').toLowerCase();
              let targetUrl = order.tracking_url;
              if (cleanNum && (carrier.includes('india post') || carrier.includes('speed post') || !targetUrl)) {
                targetUrl = `https://t.17track.net/en#nums=${cleanNum}`;
              }
              return targetUrl ? (
                <a 
                  href={targetUrl} 
                  target="_blank" 
                  rel="noreferrer"
                  className="bg-primary hover:bg-emerald-hover text-white font-black uppercase tracking-widest text-[9px] px-5 py-3 rounded-xl shadow-md shadow-emerald-glow transition-all whitespace-nowrap text-center"
                >
                  Track Shipment
                </a>
              ) : (
                <span className="text-[9px] font-black uppercase tracking-wider text-slate-400 dark:text-slate-500 bg-slate-100 dark:bg-[#131B17] border border-slate-200 dark:border-[#26322B] px-3 py-2 rounded-xl">
                  No Direct Tracking Link
                </span>
              );
            })()}
          </div>
        )}

        {/* Main Amazon-Style Order Items Card */}
        <div className="bg-white dark:bg-[#131B17] rounded-2xl border border-slate-200 dark:border-[#26322B] shadow-sm dark:shadow-none overflow-hidden mb-6">
          
          {/* Status Header Bar inside Items Card */}
          <div className="bg-slate-50/70 dark:bg-[#131B17]/70 border-b border-slate-100 dark:border-[#26322B] px-6 py-4 flex flex-wrap justify-between items-center gap-4 font-semibold">
            <div>
              <h2 className="text-sm font-black text-slate-900 dark:text-white flex items-center gap-1.5">
                {order.order_status === 'delivered' 
                  ? 'Delivered' 
                  : order.order_status === 'cancelled'
                  ? 'Cancelled'
                  : order.order_status === 'return_requested'
                  ? 'Return Pending Approval'
                  : order.order_status === 'return_approved'
                  ? (() => {
                      const pay = (order.payment_status || '').toLowerCase();
                      if (pay === 'refunded') return 'Refund Credited';
                      if (pay === 'refund_failed') return 'Refund Failed';
                      if (pay === 'refund_pending') return 'Refund Initiated';
                      
                      const items = order.items || [];
                      if (items.some(i => i.return_status === 'RETURN_RECEIVED')) return 'Return Received';
                      if (items.some(i => i.return_status === 'SELF_SHIPPED')) return 'Self-Shipped (Receipt Verification Pending)';
                      return 'Return Approved (Self-Ship Pending)';
                    })()
                  : order.order_status === 'return_rejected'
                  ? 'Return Request Declined'
                  : `Preparing shipment • Est. Delivery ${getExpectedDeliveryDate(order.created_at)}`
                }
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-300 font-medium mt-0.5">
                {order.order_status === 'delivered' 
                  ? `Your package was delivered on ${new Date(order.delivered_at || order.updated_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' })}`
                  : order.order_status === 'cancelled'
                  ? 'This order has been cancelled and will not be shipped.'
                  : order.order_status === 'return_requested'
                  ? 'Our team is reviewing your return request and proof media.'
                  : order.order_status === 'return_approved' || order.order_status === 'refunded'
                  ? (() => {
                      const pay = (order.payment_status || '').toLowerCase();
                      if (pay === 'refunded') return 'Your return was accepted and the refund has been credited.';
                      if (pay === 'refund_failed') return order.refund_error || 'Your refund could not be completed. Our team will retry it after resolving the payment gateway issue.';
                      if (pay === 'refund_pending') return 'Your return was accepted and the refund has been initiated.';
                      
                      const items = order.items || [];
                      if (items.some(i => i.return_status === 'RETURN_RECEIVED')) return 'We have physically received your return. Your refund is processing.';
                      if (items.some(i => i.return_status === 'SELF_SHIPPED')) return 'We have received your shipment tracking details. Verification is in progress.';
                      return 'Your return request was approved. Please self-ship the return package to the store.';
                    })()
                  : 'We are packaging and preparing your items for courier pickup.'
                }
              </p>
            </div>
          </div>

          {/* Items Row list */}
          <div className="p-6 divide-y divide-slate-100 dark:divide-[#26322B]">
            {order.items.map((item, idx) => (
              <div key={idx} className="py-6 first:pt-0 last:pb-0 flex flex-col md:flex-row gap-6 items-start justify-between">
                
                {/* Product Detail Left Section */}
                <div className="flex gap-5 flex-1 min-w-0">
                  <img 
                    src={formatImageUrl(item.image_url)} 
                    onError={(e) => { e.target.src = '/logo-durga.webp'; }}
                    alt={item.product_name} 
                    className="w-24 h-24 rounded-xl object-cover bg-slate-50 dark:bg-[#26322B]/40 border border-slate-200 dark:border-[#26322B] shrink-0 shadow-sm dark:shadow-none"
                    loading="lazy"
                  />
                  <div className="space-y-1.5 min-w-0">
                    <h4 className="font-extrabold text-slate-900 dark:text-white text-sm hover:text-primary transition-colors cursor-pointer leading-snug">
                      {item.product_name}
                    </h4>
                    <p className="text-xs text-slate-400 dark:text-slate-500 font-bold">Sold by: <span className="text-primary font-black">DurgaShakti Foils</span></p>
                    <p className="text-sm font-black text-slate-900 dark:text-white mt-1">
                      ₹{item.price.toLocaleString('en-IN')} 
                      <span className="text-slate-400 dark:text-slate-500 font-bold text-xs pl-2">Quantity: {item.quantity}</span>
                    </p>
                    
                    <div className="pt-2 flex flex-wrap gap-2">
                      <button 
                        onClick={() => handleBuyItAgain(item)}
                        className="bg-primary hover:bg-emerald-hover text-white font-extrabold text-[10px] uppercase tracking-widest px-4 py-2.5 rounded-full shadow-sm dark:shadow-none border border-primary/20 transition-all flex items-center gap-1.5 hover:scale-102 transform active:scale-98 hover:shadow-emerald-glow"
                      >
                        <Wallet className="w-3.5 h-3.5 text-white" /> Buy it again
                      </button>
                    </div>

                    {item.return_status && (
                      <div className="mt-3 p-3 bg-slate-50 dark:bg-[#26322B]/40 border border-slate-150 rounded-xl space-y-2 max-w-md">
                        <div className="flex items-center gap-2">
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
                          <span className="text-[10px] text-slate-500 dark:text-slate-300 font-extrabold">{item.return_type === 'exchange' ? 'Qty Exchanged' : 'Qty Returned'}: {item.returned_quantity}</span>
                        </div>
                        {item.return_reason && (
                          <p className="text-[10px] text-slate-600 dark:text-slate-400 font-medium">Reason: <span className="font-bold">{item.return_reason}</span></p>
                        )}
                        {item.return_type !== 'exchange' && item.refund_calculations && (() => {
                          const prodRefund = Number(item.refund_calculations.refundable_amount || 0);
                          const courierRefund = Number(item.self_shipping_details?.courier_cost || 0);
                          const isRefunded = ['REFUND_COMPLETED', 'REFUND_INITIATED'].includes(item.return_status);
                          const actualProductRefund = isRefunded ? Math.max(0, prodRefund - courierRefund) : prodRefund;
                          const totalRefundable = isRefunded ? prodRefund : (prodRefund + courierRefund);
                          
                          return (
                            <div className="text-[10px] font-extrabold text-slate-500 dark:text-slate-300 bg-white dark:bg-[#131B17] p-2.5 rounded-xl border border-slate-100 dark:border-[#26322B] flex flex-wrap gap-x-4 gap-y-1">
                              <span>Product Price: ₹{Number(item.refund_calculations.taxable_amount || 0).toFixed(2)}</span>
                              <span>CGST 9%: ₹{Number(item.refund_calculations.cgst_amount || 0).toFixed(2)}</span>
                              <span>SGST 9%: ₹{Number(item.refund_calculations.sgst_amount || 0).toFixed(2)}</span>
                              <span>Discount Share: {Number(item.refund_calculations.coupon_discount_share || 0) > 0 ? '-' : ''}₹{Number(item.refund_calculations.coupon_discount_share || 0).toFixed(2)}</span>
                              <span className="text-primary font-black w-full mt-1 border-t border-slate-200 dark:border-[#26322B]/50 pt-1">
                                Est. Refundable: ₹{totalRefundable.toFixed(2)} 
                                {courierRefund > 0 ? ` (Product: ₹${actualProductRefund.toFixed(2)} + Courier: ₹${courierRefund.toFixed(2)})` : ''}
                              </span>
                            </div>
                          );
                        })()}
                        {item.self_shipping_details && (
                          <div className="text-[10px] text-slate-500 dark:text-slate-300 space-y-1.5 font-semibold">
                            <div>
                               <p className="flex items-center gap-1.5">
                                Courier: <span className="font-extrabold text-slate-800 dark:text-slate-200">{item.self_shipping_details.courier_name}</span>
                              </p>
                              <p className="flex items-center gap-1.5">
                                Tracking: <span className="font-mono text-slate-800 dark:text-slate-200 font-extrabold">{item.self_shipping_details.tracking_number}</span>
                                <button
                                  onClick={() => {
                                    navigator.clipboard.writeText(item.self_shipping_details.tracking_number);
                                    toast.success('Tracking number copied!');
                                  }}
                                  className="p-0.5 text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:text-slate-400 transition-colors inline-flex items-center"
                                  title="Copy Tracking Number"
                                >
                                  <Copy className="w-3.5 h-3.5" />
                                </button>
                              </p>
                              {item.self_shipping_details.courier_cost > 0 && <p>Courier Cost: <span className="font-bold text-slate-850">₹{item.self_shipping_details.courier_cost}</span></p>}
                            </div>
                            <div className="pt-1.5 border-t border-slate-100 dark:border-[#26322B] flex flex-wrap gap-2">
                              {(() => {
                                const rawNum = item.self_shipping_details.tracking_number;
                                const cleanNum = rawNum ? String(rawNum).trim() : '';
                                const trackUrl = cleanNum ? `https://t.17track.net/en#nums=${cleanNum}` : '';
                                return (
                                  <a
                                    href={trackUrl || '#'}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="inline-flex items-center gap-1 bg-indigo-50 text-indigo-700 hover:bg-indigo-100 border border-indigo-150 font-black uppercase tracking-widest text-[8px] px-3 py-1.5 rounded-lg transition-all"
                                  >
                                    Track Return Shipment
                                  </a>
                                );
                              })()}
                            </div>
                          </div>
                        )}
                        {item.exchange_shipping_details && (
                          <div className="mt-3 p-3 bg-sky-55 border border-sky-150 rounded-xl space-y-2">
                            <h4 className="text-[10px] font-black text-sky-700 uppercase tracking-widest flex items-center gap-1.5">
                              <Truck className="w-3.5 h-3.5" /> Exchanged Product Shipment Details
                            </h4>
                            <div className="text-[10px] text-slate-600 dark:text-slate-400 font-semibold space-y-0.5">
                              <p>Courier: <span className="font-extrabold text-slate-800 dark:text-slate-200">{item.exchange_shipping_details.exchange_courier_name}</span></p>
                              <p className="flex items-center gap-2">
                                Tracking Number: <span className="font-mono text-slate-800 dark:text-slate-200 font-extrabold">{item.exchange_shipping_details.exchange_tracking_number}</span>
                                <button
                                  onClick={() => {
                                    navigator.clipboard.writeText(item.exchange_shipping_details.exchange_tracking_number);
                                    toast.success('Tracking number copied!');
                                  }}
                                  className="p-0.5 text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:text-slate-400 transition-colors inline-flex items-center"
                                  title="Copy Tracking Number"
                                >
                                  <Copy className="w-3.5 h-3.5" />
                                </button>
                              </p>
                              {item.exchange_shipping_details.exchange_expected_delivery_date && (
                                <p>Expected Delivery: <span className="font-extrabold text-slate-800 dark:text-slate-200">{item.exchange_shipping_details.exchange_expected_delivery_date}</span></p>
                              )}
                              {item.exchange_shipping_details.exchange_shipment_notes && (
                                <p className="text-slate-500 dark:text-slate-300 italic bg-white dark:bg-[#131B17]/65 p-2 rounded-lg border border-slate-100 dark:border-[#26322B]">Notes: {item.exchange_shipping_details.exchange_shipment_notes}</p>
                              )}
                            </div>
                            {(() => {
                              const trackingNum = item.exchange_shipping_details.exchange_tracking_number;
                              const cleanNum = trackingNum ? String(trackingNum).trim() : '';
                              let targetUrl = '';
                              if (cleanNum) {
                                targetUrl = `https://t.17track.net/en#nums=${cleanNum}`;
                              }
                              return targetUrl && (
                                <a 
                                  href={targetUrl} 
                                  target="_blank" 
                                  rel="noreferrer"
                                  className="inline-flex items-center gap-1 bg-primary hover:bg-emerald-hover text-white font-black uppercase tracking-widest text-[8px] px-3 py-1.5 rounded-lg transition-all"
                                >
                                  Track Exchange Shipment
                                </a>
                              );
                            })()}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                {/* E-Commerce Buttons Stack Right Section */}
                <div className="w-full md:w-48 flex flex-col gap-2 pt-2 md:pt-0 shrink-0">
                  <button 
                    onClick={() => navigate(`/product/${item.product_id}`)}
                    className="w-full bg-white dark:bg-[#131B17] hover:bg-slate-50 dark:bg-[#26322B]/40 border border-slate-300 hover:border-slate-400 font-bold text-slate-700 dark:text-slate-300 text-xs px-4 py-2.5 rounded-xl shadow-sm dark:shadow-none transition-all text-center uppercase tracking-widest text-[9px]"
                  >
                    View your item
                  </button>
                  
                  {order.order_status === 'delivered' && !item.return_status && order.payment_method?.toLowerCase() !== 'cod' && (
                    <button 
                      onClick={() => setIsReturning(item.product_id)}
                      className="w-full bg-white dark:bg-[#131B17] hover:bg-slate-50 dark:bg-[#26322B]/40 border border-slate-300 hover:border-slate-400 font-bold text-slate-700 dark:text-slate-300 text-xs px-4 py-2.5 rounded-xl shadow-sm dark:shadow-none transition-all text-center uppercase tracking-widest text-[9px]"
                    >
                      Return items
                    </button>
                  )}

                  {order.payment_method?.toLowerCase() === 'cod' && (
                    <div className="bg-slate-50 dark:bg-[#26322B]/40 border border-slate-200 dark:border-[#26322B] text-slate-500 dark:text-slate-300 rounded-xl p-3.5 text-[9px] font-black uppercase tracking-wider text-center leading-normal">
                      Returns not allowed for COD
                    </div>
                  )}

                  {(item.return_status === 'RETURN_APPROVED' || item.return_status === 'return_approved' || item.return_status === 'EXCHANGE_APPROVED') && (
                    <button
                      onClick={() => setSelfShipModal(item)}
                      className="w-full bg-emerald-600 hover:bg-emerald-700 font-black text-white text-[9px] px-4 py-2.5 rounded-xl shadow-md transition-all text-center uppercase tracking-widest"
                    >
                      Self-Ship Return
                    </button>
                  )}

                  {canReviewOrder() && (
                    <button
                      className="w-full bg-primary hover:bg-emerald-hover border border-primary/20 font-black text-white text-xs px-4 py-2.5 rounded-xl shadow-sm dark:shadow-none transition-all text-center uppercase tracking-widest text-[9px] flex items-center justify-center gap-1.5 hover:shadow-emerald-glow"
                      onClick={() => navigate(`/review/${order.id}/${item.product_id}`)}
                    >
                      <Star className="w-3.5 h-3.5 fill-white text-white" />
                      Write product review
                    </button>
                  )}
                </div>

              </div>
            ))}
          </div>
        </div>

        {/* Return Details Card (If request has already been submitted in the past) */}
        {order.return_reason && !isReturning && (
          <div className="bg-amber-50/50 dark:bg-[#1a1500] border border-amber-200 dark:border-amber-900/40 rounded-2xl p-6 shadow-sm dark:shadow-none space-y-4">
            <h3 className="text-xs font-black uppercase tracking-widest text-amber-700 dark:text-amber-400 flex items-center gap-2">
              <Package className="w-4 h-4" />
              Return Request History
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1">
                <span className="text-[9px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500">Return Reason</span>
                <p className="text-xs font-bold text-slate-700 dark:text-slate-300 bg-white dark:bg-[#131B17] p-3 rounded-xl border border-slate-100 dark:border-[#26322B]">{order.return_reason}</p>
              </div>

              {order.admin_message && (
                <div className="space-y-1">
                  <span className="text-[9px] font-black uppercase tracking-widest text-primary">Store Response Remarks</span>
                  <p className="text-xs font-bold text-slate-700 dark:text-slate-300 bg-white dark:bg-[#131B17] p-3 rounded-xl border border-slate-100 dark:border-[#26322B]">{order.admin_message}</p>
                </div>
              )}
            </div>

            {order.return_image_url && (
              <div className="space-y-2">
                <span className="text-[9px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500 block">Uploaded Proof Material</span>
                <div className="flex flex-wrap gap-3">
                  {order.return_image_url.split(',').map((url, index) => {
                    const isVideo = url.match(/\.(mp4|mov|webm|ogg|avi)(\?|$)/i) || url.includes('/video/');
                    const fullUrl = formatImageUrl(url);
                    return (
                       <div key={index} className="relative rounded-xl border border-slate-200 dark:border-[#26322B] overflow-hidden bg-white dark:bg-[#131B17] shadow-sm dark:shadow-none w-20 h-20 hover:ring-2 hover:ring-primary transition-all flex items-center justify-center group cursor-pointer">
                        {isVideo ? (
                          <a
                            href={fullUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="w-full h-full block relative"
                          >
                            <video src={fullUrl} className="w-full h-full object-cover" muted autoPlay loop playsInline />
                            <div className="absolute inset-0 bg-black/30 flex items-center justify-center group-hover:bg-black/50 transition-colors">
                              <div className="w-7 h-7 rounded-full bg-white dark:bg-[#131B17]/30 backdrop-blur-sm flex items-center justify-center text-white border border-white/20">
                                <svg className="w-3 h-3 fill-current ml-0.5" viewBox="0 0 24 24">
                                  <path d="M8 5v14l11-7z" />
                                </svg>
                              </div>
                            </div>
                          </a>
                        ) : (
                          <a href={fullUrl} target="_blank" rel="noreferrer" className="w-full h-full">
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

        {selfShipModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-white dark:bg-[#131B17] rounded-3xl border border-slate-200 dark:border-[#26322B] shadow-2xl p-6 max-w-md w-full animate-in zoom-in-95 duration-200">
              <div className="flex items-center justify-between pb-3.5 border-b border-slate-100 dark:border-[#26322B] mb-5">
                <div>
                  <h3 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-wider">Self-Ship Return Courier Info</h3>
                  <p className="text-[10px] text-slate-400 dark:text-slate-500 font-extrabold mt-0.5">{selfShipModal.product_name}</p>
                </div>
                <button 
                  onClick={() => setSelfShipModal(null)}
                  className="text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:text-slate-400 transition-colors p-1"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleSubmitSelfShip} className="space-y-4">
                <div className="bg-amber-50 dark:bg-amber-950/20 text-amber-800 dark:text-amber-300 text-[10px] rounded-xl p-3 border border-amber-100/60 dark:border-amber-900/30 flex gap-2 items-start font-semibold">
                  <Info className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                  <p className="leading-normal">
                    <strong>Self-Shipping Deadline:</strong> Please ship the item and submit your courier details within <strong>7 days</strong> of return approval.
                  </p>
                </div>

                <div className="space-y-1">
                  <label className="block text-[9px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500">Courier / Carrier Name *</label>
                  <div className="relative">
                    <button
                      type="button"
                      onClick={() => setCourierDropdownOpen(!courierDropdownOpen)}
                      className="w-full h-11 px-3.5 rounded-xl border border-slate-200 dark:border-[#26322B] text-xs font-bold bg-white dark:bg-[#131B17] text-slate-800 dark:text-white focus:ring-2 focus:ring-primary/20 focus:outline-none flex items-center justify-between text-left cursor-pointer"
                    >
                      <span>
                        {isCustomCourier 
                          ? 'Other' 
                          : (courierName || 'Select Courier')}
                      </span>
                      <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform duration-200 ${courierDropdownOpen ? 'rotate-180' : ''}`} />
                    </button>
                    {courierDropdownOpen && (
                      <div className="absolute z-[999999] w-full mt-1.5 rounded-xl border border-slate-200 dark:border-[#26322B] bg-white dark:bg-[#131B17] shadow-xl max-h-[180px] overflow-y-auto">
                        <div className="p-1 space-y-0.5">
                          <button
                            type="button"
                            onClick={() => {
                              setCourierName('');
                              setIsCustomCourier(false);
                              setCourierDropdownOpen(false);
                            }}
                            className="w-full text-left px-3 py-2 text-xs font-bold rounded-lg text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-[#19231F] transition-all cursor-pointer"
                          >
                            Select Courier
                          </button>
                          {COURIER_OPTIONS.map(opt => (
                            <button
                              key={opt}
                              type="button"
                              onClick={() => {
                                if (opt === 'Other') {
                                  setCourierName('');
                                  setIsCustomCourier(true);
                                } else {
                                  setCourierName(opt);
                                  setIsCustomCourier(false);
                                }
                                setCourierDropdownOpen(false);
                              }}
                              className={`w-full text-left px-3 py-2 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                                (opt === 'Other' && isCustomCourier) || (!isCustomCourier && courierName === opt)
                                  ? 'bg-primary/10 text-primary'
                                  : 'text-slate-800 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-[#19231F]'
                              }`}
                            >
                              {opt}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                  {isCustomCourier && (
                    <input
                      type="text"
                      required
                      placeholder="Enter custom courier name"
                      value={courierName}
                      onChange={(e) => setCourierName(e.target.value)}
                      className="w-full h-11 mt-2 px-3.5 rounded-xl border border-slate-200 dark:border-[#26322B] text-xs font-bold bg-white dark:bg-[#131B17] text-slate-800 dark:text-white focus:ring-2 focus:ring-primary/20 focus:outline-none"
                    />
                  )}
                </div>

                <div className="space-y-1">
                  <label className="block text-[9px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500">Tracking Number / Waybill ID *</label>
                  <input
                    type="text"
                    required
                    placeholder="Enter shipment tracking number"
                    value={trackingNumber}
                    onChange={(e) => setTrackingNumber(e.target.value)}
                    className="w-full h-11 px-3.5 rounded-xl border border-slate-200 dark:border-[#26322B] text-xs font-bold bg-white dark:bg-[#131B17] focus:ring-2 focus:ring-primary/20 focus:outline-none font-mono dark:text-slate-300"
                  />
                </div>



                <div className="flex gap-2.5 pt-1.5">
                  <button
                    type="button"
                    onClick={() => setSelfShipModal(null)}
                    className="flex-1 h-11 rounded-xl font-black uppercase tracking-widest border border-slate-200 dark:border-[#26322B] text-[9px] text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-[#26322B]"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={submittingSelfShip}
                    className="flex-1 h-11 rounded-xl font-black uppercase tracking-widest text-[9px] bg-primary hover:bg-emerald-hover text-white shadow-md transition-all"
                  >
                    {submittingSelfShip ? 'Submitting...' : 'Submit Details'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

      </div>
    </div>
  );
};

export default OrderDetailsPage;
