import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Package, Truck, CreditCard, ExternalLink, Calendar, MapPin, Phone, Upload, Info, Wallet, ArrowLeft, X, Check, ArrowRight } from 'lucide-react';
import { Button } from './../components/ui/button';
import { formatImageUrl } from './../utils/api';
import { useProgress } from './../components/ui/ProgressToast';
import paymentService from './../services/payment.service';
import apiClient from './../services/core/apiClient';
import { toast } from 'sonner';
import PageLoader from './../components/ui/PageLoader';
import { useCart } from './../contexts/CartContext';

const OrderDetailsPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { startProgress, updateProgress, finishProgress } = useProgress();
  const { addToCart } = useCart();
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isReturning, setIsReturning] = useState(false);
  const [reason, setReason] = useState('');
  const [otherDetails, setOtherDetails] = useState('');
  const [returnFiles, setReturnFiles] = useState([]);
  const [returnPreviews, setReturnPreviews] = useState([]);
  const [submittingReturn, setSubmittingReturn] = useState(false);
  const [payingOnline, setPayingOnline] = useState(false);

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [id, isReturning]);

  useEffect(() => {
    const fetchOrder = async () => {
      try {
        const res = await apiClient.get(`/orders/${id}`);
        setOrder(res.data);
      } catch (err) {
        toast.error('Failed to load order details');
        navigate('/dashboard');
      } finally {
        setLoading(false);
      }
    };
    fetchOrder();
  }, [id, navigate]);

  if (loading) return <PageLoader message="Loading order details..." />;
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
    if (returnFiles.length === 0) {
      toast.error('At least one proof image/video is mandatory for returns');
      return;
    }
    setSubmittingReturn(true);
    try {
      const formData = new FormData();
      const finalReason = reason === 'Other' ? `Other: ${otherDetails}` : reason;
      formData.append('reason', finalReason);
      returnFiles.forEach(file => {
        formData.append('image', file);
      });
      await apiClient.post(`/orders/${id}/return`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
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

  const handlePayOnline = async () => {
    if (payingOnline) return;
    
    if (!window.Razorpay) {
      toast.error('Payment gateway not loaded. Refresh and try again.');
      return;
    }
    
    setPayingOnline(true);
    try {
      const isCod = order.payment_method === 'cod';
      const response = isCod 
        ? await paymentService.payCODOnline(order.id)
        : await paymentService.createRazorpayOrder(order.id);
      
      const { razorpay_order_id, amount, currency, key_id } = response;

      const options = {
        key: key_id || process.env.REACT_APP_RAZORPAY_KEY_ID,
        amount: amount,
        currency: currency || 'INR',
        name: 'DurgaShakti Foils',
        description: isCod 
          ? `COD Payment - Order ${order.order_number}`
          : `Prepaid Retry - Order ${order.order_number}`,
        order_id: razorpay_order_id,
        handler: async (paymentResponse) => {
          try {
            await paymentService.verifyRazorpayPayment({
              order_id: order.id,
              razorpay_order_id: paymentResponse.razorpay_order_id,
              razorpay_payment_id: paymentResponse.razorpay_payment_id,
              razorpay_signature: paymentResponse.razorpay_signature
            });
            window.location.reload();
          } catch {
            setPayingOnline(false);
          }
        },
        prefill: {
          name: order.shipping_address?.full_name || '',
          email: '',
          contact: order.shipping_address?.phone || ''
        },
        theme: { color: '#4f46e5' },
        modal: { ondismiss: () => setPayingOnline(false) }
      };

      const rzp = new window.Razorpay(options);
      rzp.on('payment.failed', () => {
        setPayingOnline(false);
      });
      rzp.open();
    } catch {
      setPayingOnline(false);
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

  const generateInvoiceHtml = (orderData) => {
    const itemsHtml = orderData.items.map(item => `
      <tr class="item">
        <td>${item.product_name}</td>
        <td style="text-align: center;">${item.quantity}</td>
        <td style="text-align: right;">₹${item.price.toLocaleString('en-IN')}</td>
        <td style="text-align: right;">₹${(item.quantity * item.price).toLocaleString('en-IN')}</td>
      </tr>
    `).join('');

    const subtotal = orderData.total_amount - (orderData.shipping_cost || 0);

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
    .logo { font-size: 24px; font-weight: 800; color: #4f46e5; text-transform: uppercase; letter-spacing: -0.05em; }
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
    .total-row.grand-total { font-size: 20px; font-weight: 900; color: #4f46e5; border-top: 2px solid #f1f5f9; padding-top: 15px; margin-top: 5px; }
    .total-row span:last-child { font-weight: 800; color: #0f172a; }
    .total-row.grand-total span:last-child { color: #4f46e5; }
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
        <span>Subtotal</span>
        <span>₹${subtotal.toLocaleString('en-IN')}</span>
      </div>
      <div class="total-row">
        <span>Shipping</span>
        <span>₹${(orderData.shipping_cost || 0).toLocaleString('en-IN')}</span>
      </div>
      <div class="total-row grand-total">
        <span>Total Amount</span>
        <span>₹${orderData.total_amount.toLocaleString('en-IN')}</span>
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

  const handleDownloadInvoice = () => {
    const progressId = startProgress({
      label: `Invoice_${order.order_number}.html`,
      type: 'download',
      fileType: 'file',
      message: 'Generating invoice...',
    });

    setTimeout(() => {
      updateProgress(progressId, { progress: 50, message: 'Building HTML Invoice...' });
      setTimeout(() => {
        updateProgress(progressId, { progress: 85, message: 'Preparing download...' });
        setTimeout(() => {
          try {
            const htmlContent = generateInvoiceHtml(order);
            const blob = new Blob([htmlContent], { type: 'text/html;charset=utf-8;' });
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = `Invoice_${order.order_number}.html`;
            link.style.visibility = 'hidden';
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(url);
            finishProgress(progressId, { message: 'Invoice ready!' });
          } catch (err) {
            finishProgress(progressId, { message: 'Failed to download invoice', isError: true });
          }
        }, 600);
      }, 800);
    }, 500);
  };

  return (
    <div className="min-h-screen bg-slate-50/50 pb-20 pt-8 mt-16">
      <div className="max-w-4xl mx-auto px-6">
        
        {/* Amazon-style Breadcrumbs */}
        <div className="flex items-center gap-2 text-xs text-slate-500 mb-6 font-semibold">
          <span className="hover:text-indigo-600 cursor-pointer transition-colors" onClick={() => navigate('/dashboard')}>Your Account</span>
          <span className="text-slate-400 font-normal">&rsaquo;</span>
          <span className="hover:text-indigo-600 cursor-pointer transition-colors" onClick={() => navigate('/dashboard')}>Your Orders</span>
          <span className="text-slate-400 font-normal">&rsaquo;</span>
          <span className="text-slate-800 font-bold">Order Details</span>
        </div>

        {/* Title and Subtitle Block */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
          <div>
            <h1 className="text-3xl font-extrabold tracking-tight text-slate-900">Order Details</h1>
            <p className="text-xs font-semibold text-slate-500 mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1">
              <span>Order placed {new Date(order.created_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' })}</span>
              <span className="text-slate-300 font-normal">|</span>
              <span>Order number {order.order_number}</span>
            </p>
          </div>
          
          <div className="flex items-center gap-3">
            {(order.payment_status === 'Paid' || order.payment_status === 'completed') && (
              <button
                onClick={handleDownloadInvoice}
                className="flex items-center gap-2 text-xs font-black uppercase tracking-widest text-slate-600 hover:text-indigo-600 border border-slate-300 rounded-xl px-4 py-2.5 bg-white transition-all shadow-sm hover:bg-slate-50"
              >
                <ExternalLink className="w-3.5 h-3.5" /> Invoice
              </button>
            )}
          </div>
        </div>

        {/* Admin Store Message Alert Banner */}
        {order.admin_message && !isReturning && (
          <div className="mb-6 p-4 rounded-2xl bg-indigo-50 border border-indigo-100 flex gap-3.5 items-start shadow-sm animate-in fade-in duration-300">
            <Info className="w-5 h-5 text-indigo-600 shrink-0 mt-0.5" />
            <div>
              <h4 className="text-[10px] font-black uppercase tracking-widest text-indigo-600">Update from Store</h4>
              <p className="text-xs font-semibold text-slate-700 mt-0.5 leading-relaxed">{order.admin_message}</p>
            </div>
          </div>
        )}

        {/* 3-Column Info Card (Ship to | Payment Method | Order Summary) */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 mb-6 grid grid-cols-1 md:grid-cols-3 gap-6 divide-y md:divide-y-0 md:divide-x divide-slate-100">
          
          {/* Column 1: Ship to */}
          <div className="space-y-2">
            <h3 className="text-xs font-bold text-slate-900 uppercase tracking-widest">Shipping Address</h3>
            <div className="text-xs text-slate-600 leading-relaxed space-y-0.5">
              <p className="font-extrabold text-slate-900">{order.shipping_address?.full_name}</p>
              <p>{order.shipping_address?.address_line1}</p>
              {order.shipping_address?.address_line2 && <p>{order.shipping_address.address_line2}</p>}
              <p>{order.shipping_address?.city}, {order.shipping_address?.state} - {order.shipping_address?.pincode}</p>
              <p className="text-slate-500 font-bold mt-2.5 flex items-center gap-1">
                <Phone className="w-3 h-3 text-slate-400" />
                {order.shipping_address?.phone}
              </p>
            </div>
          </div>

          {/* Column 2: Payment Method */}
          <div className="space-y-2 pt-4 md:pt-0 md:pl-6">
            <h3 className="text-xs font-bold text-slate-900 uppercase tracking-widest">Payment Method</h3>
            <div className="text-xs text-slate-600 space-y-2.5">
              <p className="font-extrabold text-slate-900 uppercase tracking-wider">{order.payment_method || 'Razorpay'}</p>
              {order.payment_status === 'Paid' || order.payment_status === 'completed' ? (
                <div className="bg-emerald-50 text-emerald-800 text-[10px] rounded-xl p-3 border border-emerald-100/60 space-y-1 font-semibold">
                  <p className="font-extrabold flex items-center gap-1.5 text-emerald-700">
                    <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full"></span> Paid
                  </p>
                  {order.transaction_id && (
                    <p className="font-mono text-slate-500 break-all select-all">ID: {order.transaction_id}</p>
                  )}
                  {order.transaction_date && (
                    <p className="text-slate-500">Date: {new Date(order.transaction_date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}</p>
                  )}
                </div>
              ) : (
                <div className="bg-amber-50 text-amber-800 text-[10px] rounded-xl p-3 border border-amber-100/60 space-y-1 font-semibold">
                  <p className="font-extrabold flex items-center gap-1.5 text-amber-700">
                    <span className="w-1.5 h-1.5 bg-amber-500 rounded-full"></span> Pending Payment
                  </p>
                  <p className="text-slate-500 uppercase tracking-widest text-[8px] font-black">Status: {order.payment_status || 'Unpaid'}</p>
                </div>
              )}
            </div>
          </div>

          {/* Column 3: Order Summary */}
          <div className="space-y-2 pt-4 md:pt-0 md:pl-6">
            <h3 className="text-xs font-bold text-slate-900 uppercase tracking-widest">Order Summary</h3>
            {(() => {
              const subtotal = order.items?.reduce((acc, item) => acc + (item.price * item.quantity), 0) || 0;
              const isNewOrderLayout = Number(order.total_amount) > subtotal;
              const shipping = isNewOrderLayout ? 350.0 : 0.0;
              const cgst = isNewOrderLayout ? subtotal * 0.09 : 0.0;
              const sgst = isNewOrderLayout ? subtotal * 0.09 : 0.0;

              return (
                <div className="space-y-2 text-xs text-slate-500 font-semibold">
                  <div className="flex justify-between">
                    <span>Item(s) Subtotal:</span>
                    <span className="text-slate-900">₹{subtotal.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Shipping Charges:</span>
                    <span className="text-slate-900">
                      {shipping > 0 
                        ? `₹${shipping.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` 
                        : "FREE"
                      }
                    </span>
                  </div>
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
                  <div className="h-px bg-slate-100 my-1" />
                  <div className="flex justify-between font-black text-slate-900 text-sm pt-0.5">
                    <span>Grand Total:</span>
                    <span className="text-indigo-600 text-base">₹{Number(order.total_amount).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                  </div>
                </div>
              );
            })()}
          </div>
        </div>

        {/* Inline Return Form Box */}
        {isReturning && (
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 mb-6 animate-in slide-in-from-top-4 duration-300">
            <div className="flex items-center justify-between pb-3.5 border-b border-slate-100 mb-6">
              <h3 className="text-base font-bold text-slate-900">Request Return</h3>
              <button 
                onClick={() => {
                  setIsReturning(false);
                  setReason('');
                  setOtherDetails('');
                  setReturnFiles([]);
                  setReturnPreviews([]);
                }}
                className="text-slate-400 hover:text-slate-600 transition-colors p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmitReturn} className="space-y-5">
              <div className="space-y-2">
                <label className="block text-[10px] font-black uppercase tracking-widest text-slate-500">Reason for Return</label>
                <select
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  required
                  className="w-full h-12 px-4 rounded-xl border border-slate-200 text-xs font-bold bg-white focus:ring-2 focus:ring-indigo-500 focus:outline-none"
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
                  <label className="block text-[10px] font-black uppercase tracking-widest text-slate-500">Details</label>
                  <textarea
                    placeholder="Please provide details about the return reason..."
                    value={otherDetails}
                    onChange={(e) => setOtherDetails(e.target.value)}
                    required
                    className="w-full p-4 min-h-[100px] rounded-xl border border-slate-200 text-xs font-semibold bg-white focus:ring-2 focus:ring-indigo-500 focus:outline-none resize-none"
                  />
                </div>
              )}

              <div className="space-y-2">
                <label className="block text-[10px] font-black uppercase tracking-widest text-slate-500">Upload Proof (Images/Videos) *</label>
                <div className="relative group border-2 border-dashed border-slate-200 hover:border-indigo-500 transition-all duration-300 rounded-2xl p-6 flex flex-col items-center justify-center bg-white hover:bg-indigo-50/10 cursor-pointer min-h-[140px]">
                  <input
                    type="file"
                    multiple
                    accept="image/*,video/*"
                    onChange={handleFilesChange}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                  />
                  <div className="text-center flex flex-col items-center justify-center pointer-events-none">
                    <Upload className="w-8 h-8 text-slate-400 group-hover:text-indigo-500 transition-colors mb-2" />
                    <span className="text-xs font-bold text-slate-700 group-hover:text-indigo-600">Select Images / Videos</span>
                    <span className="text-[10px] text-slate-400 mt-1">Upload multiple files up to 20MB each</span>
                  </div>
                </div>

                {returnPreviews.length > 0 && (
                  <div className="grid grid-cols-3 gap-3 pt-2">
                    {returnPreviews.map((preview, index) => (
                      <div key={index} className="relative w-full h-24 rounded-xl overflow-hidden border border-slate-200 bg-slate-50 flex items-center justify-center">
                        {preview.type === 'video' ? (
                          <video src={preview.url} className="w-full h-full object-cover" />
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
                  className="flex-1 h-12 rounded-xl font-black uppercase tracking-widest border border-slate-200 text-[10px] text-slate-600 hover:bg-slate-100"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={submittingReturn || !reason}
                  className="flex-1 h-12 rounded-xl font-black uppercase tracking-widest text-[10px] bg-indigo-600 hover:bg-indigo-700 text-white shadow-lg shadow-indigo-100 animate-pulse-subtle"
                >
                  {submittingReturn ? 'Submitting...' : 'Submit Request'}
                </Button>
              </div>
            </form>
          </div>
        )}

        {/* Retry Payment Warning Card */}
        {order.payment_status !== 'Paid' && 
         order.payment_status !== 'completed' && 
         !['cancelled', 'refunded', 'failed', 'return_approved'].includes((order.order_status || '').toLowerCase()) && (
          <div className="bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200 rounded-2xl p-6 mb-6 flex flex-col md:flex-row justify-between items-center gap-4 shadow-sm animate-in slide-in-from-top-2 duration-300">
            <div className="space-y-1">
              <h3 className="font-extrabold text-amber-900 text-sm flex items-center gap-2">
                <Wallet className="w-4 h-4 text-amber-700" />
                Payment Retry Option Available
              </h3>
              <p className="text-xs text-amber-700 font-semibold leading-relaxed">Your payment has not been completed. You can safely complete the payment online using Razorpay to process this order.</p>
            </div>
            <button 
              onClick={handlePayOnline}
              disabled={payingOnline}
              className="bg-indigo-600 hover:bg-indigo-700 text-white font-black uppercase tracking-widest text-[10px] px-6 py-3.5 rounded-xl shadow-md shadow-indigo-100 transition-all whitespace-nowrap"
            >
              {payingOnline ? 'Processing...' : 'Pay Online Now'}
            </button>
          </div>
        )}

        {/* Elegant Horizontal Timeline / Progress Stepper Card */}
        {!isReturning && (
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 mb-6">
            <div className="flex items-center justify-between mb-4 pb-2 border-b border-slate-50">
              <h3 className="text-xs font-black text-slate-500 uppercase tracking-widest">Shipment Progress</h3>
              <span className={`text-[10px] font-black uppercase tracking-widest px-3 py-1 rounded-full ${
                order.order_status === 'delivered' ? 'bg-emerald-100 text-emerald-800' :
                order.order_status === 'cancelled' ? 'bg-rose-100 text-rose-800' :
                'bg-indigo-100 text-indigo-800'
              }`}>
                {order.order_status?.replace('_', ' ')}
              </span>
            </div>

            {(() => {
              const status = (order.order_status || '').toLowerCase();
              const isConfirmed = ['confirmed', 'packaging', 'packed', 'shipped', 'out_for_delivery', 'delivered', 'return_requested', 'return_approved', 'return_rejected', 'refunded'].includes(status);
              const isShipped = ['shipped', 'out_for_delivery', 'delivered', 'return_requested', 'return_approved', 'return_rejected', 'refunded'].includes(status);
              const isDelivered = ['delivered', 'return_requested', 'return_approved', 'return_rejected', 'refunded'].includes(status);

              const steps = [
                { label: 'Ordered', active: true, date: order.created_at },
                { label: 'Confirmed', active: isConfirmed, date: isConfirmed ? order.created_at : null },
                { label: 'Shipped', active: isShipped, date: isShipped ? (order.shipped_at || order.updated_at) : null },
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
                <div className="relative pt-6 pb-2">
                  {/* Progress Line Background */}
                  <div className="absolute top-[32px] left-[10%] right-[10%] h-1 bg-slate-100 -translate-y-1/2 rounded-full" />
                  {/* Active Progress Line */}
                  <div 
                    className="absolute top-[32px] left-[10%] h-1 bg-indigo-600 -translate-y-1/2 rounded-full transition-all duration-700 ease-out" 
                    style={{ 
                      width: isDelivered ? '80%' : isShipped ? '53.33%' : isConfirmed ? '26.66%' : '0%' 
                    }} 
                  />

                  {/* Stepper Dots */}
                  <div className="relative flex justify-between">
                    {steps.map((step, idx) => (
                      <div key={idx} className="flex flex-col items-center w-[25%] text-center">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center border-4 border-white shadow-sm z-10 transition-all duration-300 ${
                          step.active 
                            ? 'bg-indigo-600 text-white ring-4 ring-indigo-500/10' 
                            : 'bg-slate-200 text-slate-400'
                        }`}>
                          {step.active ? <Check className="w-3.5 h-3.5 stroke-[3px]" /> : <span className="text-[10px] font-bold">{idx + 1}</span>}
                        </div>
                        <p className={`text-xs mt-2.5 ${step.active ? 'text-indigo-600 font-black' : 'text-slate-400 font-semibold'}`}>
                          {step.label}
                        </p>
                        {step.date && (
                          <p className="text-[9px] font-bold text-slate-400 mt-1">
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
        )}

        {/* Main Amazon-Style Order Items Card */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden mb-6">
          
          {/* Status Header Bar inside Items Card */}
          <div className="bg-slate-50/70 border-b border-slate-100 px-6 py-4 flex flex-wrap justify-between items-center gap-4 font-semibold">
            <div>
              <h2 className="text-sm font-black text-slate-900 flex items-center gap-1.5">
                {order.order_status === 'delivered' 
                  ? 'Delivered' 
                  : order.order_status === 'cancelled'
                  ? 'Cancelled'
                  : order.order_status === 'return_requested'
                  ? 'Return Pending Approval'
                  : order.order_status === 'return_approved'
                  ? 'Return complete'
                  : order.order_status === 'return_rejected'
                  ? 'Return Request Declined'
                  : `Preparing shipment • Est. Delivery ${getExpectedDeliveryDate(order.created_at)}`
                }
              </h2>
              <p className="text-xs text-slate-500 font-medium mt-0.5">
                {order.order_status === 'delivered' 
                  ? `Your package was delivered on ${new Date(order.delivered_at || order.updated_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' })}`
                  : order.order_status === 'cancelled'
                  ? 'This order has been cancelled and will not be shipped.'
                  : order.order_status === 'return_requested'
                  ? 'Our team is reviewing your return request and proof media.'
                  : order.order_status === 'return_approved' || order.order_status === 'refunded'
                  ? 'Your return was accepted and a refund has been initiated.'
                  : 'We are packaging and preparing your items for courier pickup.'
                }
              </p>
            </div>
            
            {order.tracking_id && (
              <div className="text-xs text-slate-700 bg-white border border-slate-200 rounded-xl px-3 py-1.5 font-bold flex items-center gap-1.5 shadow-sm">
                <Truck className="w-3.5 h-3.5 text-slate-400" />
                <span>{order.carrier || 'Courier'}: {order.tracking_id}</span>
                {order.tracking_url && (
                  <a 
                    href={order.tracking_url} 
                    target="_blank" 
                    rel="noreferrer" 
                    className="text-[9px] font-black text-indigo-600 hover:underline uppercase tracking-wider pl-1.5 border-l border-slate-200"
                  >
                    Track Package
                  </a>
                )}
              </div>
            )}
          </div>

          {/* Items Row list */}
          <div className="p-6 divide-y divide-slate-100">
            {order.items.map((item, idx) => (
              <div key={idx} className="py-6 first:pt-0 last:pb-0 flex flex-col md:flex-row gap-6 items-start justify-between">
                
                {/* Product Detail Left Section */}
                <div className="flex gap-5 flex-1 min-w-0">
                  <img 
                    src={formatImageUrl(item.image_url)} 
                    alt={item.product_name} 
                    className="w-24 h-24 rounded-xl object-cover bg-slate-50 border border-slate-200 shrink-0 shadow-sm" 
                  />
                  <div className="space-y-1.5 min-w-0">
                    <h4 className="font-extrabold text-slate-900 text-sm hover:text-indigo-600 transition-colors cursor-pointer leading-snug">
                      {item.product_name}
                    </h4>
                    <p className="text-xs text-slate-400 font-bold">Sold by: <span className="text-indigo-600 font-black">DurgaShakti Foils</span></p>
                    <p className="text-sm font-black text-slate-900 mt-1">
                      ₹{item.price.toLocaleString('en-IN')} 
                      <span className="text-slate-400 font-bold text-xs pl-2">Quantity: {item.quantity}</span>
                    </p>
                    
                    <div className="pt-2 flex flex-wrap gap-2">
                      <button 
                        onClick={() => handleBuyItAgain(item)}
                        className="bg-[#FFD814] hover:bg-[#F7CA00] text-slate-950 font-extrabold text-[10px] uppercase tracking-widest px-4 py-2.5 rounded-full shadow-sm border border-[#F2C200] transition-colors flex items-center gap-1.5 hover:scale-102 transform active:scale-98"
                      >
                        <Wallet className="w-3.5 h-3.5 text-slate-950" /> Buy it again
                      </button>
                    </div>
                  </div>
                </div>

                {/* E-Commerce Buttons Stack Right Section */}
                <div className="w-full md:w-48 flex flex-col gap-2 pt-2 md:pt-0 shrink-0">
                  <button 
                    onClick={() => navigate(`/product/${item.product_id}`)}
                    className="w-full bg-white hover:bg-slate-50 border border-slate-300 hover:border-slate-400 font-bold text-slate-700 text-xs px-4 py-2.5 rounded-xl shadow-sm transition-all text-center uppercase tracking-widest text-[9px]"
                  >
                    View your item
                  </button>
                  
                  {order.order_status === 'delivered' && (
                    <button 
                      onClick={() => setIsReturning(true)}
                      className="w-full bg-white hover:bg-slate-50 border border-slate-300 hover:border-slate-400 font-bold text-slate-750 text-xs px-4 py-2.5 rounded-xl shadow-sm transition-all text-center uppercase tracking-widest text-[9px]"
                    >
                      Return items
                    </button>
                  )}

                  <button 
                    className="w-full bg-white hover:bg-slate-50 border border-slate-300 hover:border-slate-400 font-bold text-slate-700 text-xs px-4 py-2.5 rounded-xl shadow-sm transition-all text-center uppercase tracking-widest text-[9px]"
                    onClick={() => navigate('/inquiries')}
                  >
                    Ask product question
                  </button>
                </div>

              </div>
            ))}
          </div>
        </div>

        {/* Return Details Card (If request has already been submitted in the past) */}
        {order.return_reason && !isReturning && (
          <div className="bg-amber-50/50 border border-amber-200 rounded-2xl p-6 shadow-sm space-y-4">
            <h3 className="text-xs font-black uppercase tracking-widest text-amber-700 flex items-center gap-2">
              <Package className="w-4 h-4" />
              Return Request History
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1">
                <span className="text-[9px] font-black uppercase tracking-widest text-slate-400">Return Reason</span>
                <p className="text-xs font-bold text-slate-700 bg-white p-3 rounded-xl border border-slate-100">{order.return_reason}</p>
              </div>

              {order.admin_message && (
                <div className="space-y-1">
                  <span className="text-[9px] font-black uppercase tracking-widest text-indigo-500">Store Response Remarks</span>
                  <p className="text-xs font-bold text-slate-700 bg-white p-3 rounded-xl border border-slate-100">{order.admin_message}</p>
                </div>
              )}
            </div>

            {order.return_image_url && (
              <div className="space-y-2">
                <span className="text-[9px] font-black uppercase tracking-widest text-slate-400 block">Uploaded Proof Material</span>
                <div className="flex flex-wrap gap-3">
                  {order.return_image_url.split(',').map((url, index) => {
                    const isVideo = url.match(/\.(mp4|mov|webm|ogg|avi)(\?|$)/i) || url.includes('/video/');
                    const fullUrl = formatImageUrl(url);
                    return (
                      <div key={index} className="relative rounded-xl border border-slate-200 overflow-hidden bg-white shadow-sm w-20 h-20 hover:ring-2 hover:ring-indigo-550 transition-all flex items-center justify-center group cursor-pointer">
                        {isVideo ? (
                          <video src={fullUrl} controls className="w-full h-full object-cover" />
                        ) : (
                          <a href={fullUrl} target="_blank" rel="noreferrer" className="w-full h-full">
                            <img src={fullUrl} alt="Proof" className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
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
    </div>
  );
};

export default OrderDetailsPage;
