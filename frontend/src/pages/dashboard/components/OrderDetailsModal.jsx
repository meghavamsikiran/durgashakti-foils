import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Package, Truck, CreditCard, ExternalLink, Calendar, MapPin, Phone, Upload, Info, Wallet, Clock, Check } from 'lucide-react';
import { Button } from '../../../components/ui/button';
import { formatImageUrl } from '../../../utils/api';
import { useProgress } from '../../../components/ui/ProgressToast';
import paymentService from '../../../services/payment.service';
import apiClient from '../../../services/core/apiClient';
import { toast } from 'sonner';

const OrderDetailsModal = ({ order, isOpen, onClose, onReturnOrder }) => {
  const { startProgress, updateProgress, finishProgress } = useProgress();
  const [isReturning, setIsReturning] = useState(false);
  const [reason, setReason] = useState('');
  const [otherDetails, setOtherDetails] = useState('');
  const [image, setImage] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [submittingReturn, setSubmittingReturn] = useState(false);
  const [payingOnline, setPayingOnline] = useState(false);
  const [timeLeft, setTimeLeft] = useState(null);

  useEffect(() => {
    if (!order || !isOpen) return;
    
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
        window.location.reload();
      }
    }, 1000);

    return () => clearInterval(timer);
  }, [order, isOpen]);

  if (!isOpen || !order) return null;

  const handleClose = () => {
    setIsReturning(false);
    setReason('');
    setOtherDetails('');
    setImage(null);
    setImagePreview(null);
    onClose();
  };

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setImage(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmitReturn = async (e) => {
    e.preventDefault();
    if (!reason) return;
    setSubmittingReturn(true);
    try {
      const formData = new FormData();
      const finalReason = reason === 'Other' ? `Other: ${otherDetails}` : reason;
      formData.append('reason', finalReason);
      if (image) {
        formData.append('image', image);
      }
      const success = await onReturnOrder(order.id, formData);
      if (success) {
        handleClose();
      }
    } catch (err) {
      // Handled by API interceptor toast
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
            window.location.reload();
          }
        },
        prefill: {
          name: order.shipping_address?.full_name || '',
          email: '',
          contact: order.shipping_address?.phone || ''
        },
        theme: { color: '#006e1b' },
        modal: { 
          ondismiss: () => {
            setPayingOnline(false);
            window.location.reload();
          } 
        }
      };

      const rzp = new window.Razorpay(options);
      rzp.on('payment.failed', () => {
        setPayingOnline(false);
        window.location.reload();
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
    <AnimatePresence>
      <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 md:p-8">
        <motion.div 
          initial={{ opacity: 0 }} 
          animate={{ opacity: 1 }} 
          exit={{ opacity: 0 }}
          onClick={handleClose}
          className="absolute inset-0 bg-slate-900/60 backdrop-blur-md"
        />
        
        <motion.div 
          initial={{ opacity: 0, scale: 0.9, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.9, y: 20 }}
          className="relative w-full max-w-4xl max-h-[90vh] bg-surface-container-lowest rounded-xl shadow-emerald-glow border border-border-subtle overflow-hidden flex flex-col"
        >
          {/* Header */}
          <div className="p-8 border-b border-border-subtle flex items-center justify-between bg-surface-container-low/50">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <div className="w-10 h-10 rounded-lg bg-primary text-white flex items-center justify-center">
                  <Package className="w-5 h-5" />
                </div>
                <h2 className="text-2xl font-black text-foreground uppercase tracking-tight">Order Details</h2>
              </div>
              <p className="text-xs font-mono font-semibold tracking-normal text-muted-foreground ml-1">Order #{order.order_number}</p>
            </div>
            <button onClick={handleClose} className="w-10 h-10 rounded-lg bg-surface border border-border-subtle flex items-center justify-center text-muted-foreground hover:text-foreground hover:border-primary/50 transition-all">
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-8">
            {order.admin_message && (
              <div className="mb-8 p-6 rounded-xl bg-primary/5 border border-primary/20 flex gap-4 items-start shadow-sm animate-in slide-in-from-top duration-300">
                <div className="w-10 h-10 rounded-lg bg-primary text-white flex items-center justify-center shrink-0">
                  <Info className="w-5 h-5" />
                </div>
                <div className="space-y-1">
                  <h4 className="text-[10px] font-mono tracking-wider font-semibold text-primary uppercase">Update from Store</h4>
                  <p className="text-sm font-semibold text-foreground/90 leading-relaxed">{order.admin_message}</p>
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">
              
              {/* Left Side: Items & Summary */}
              <div className="lg:col-span-7 space-y-8">
                <div className="space-y-4">
                  <h3 className="text-[10px] font-mono tracking-wider font-semibold text-muted-foreground ml-1 uppercase">Order Items</h3>
                  {order.items.map((item, idx) => (
                    <div key={idx} className="flex gap-4 p-4 rounded-xl border border-border-subtle bg-surface-container-low/40">
                      <img src={formatImageUrl(item.image_url)} alt="" className="w-20 h-20 rounded-lg object-cover bg-surface" />
                      <div className="flex-1 min-w-0">
                        <h4 className="font-black text-foreground truncate">{item.product_name}</h4>
                        <p className="text-[10px] font-mono text-muted-foreground uppercase mt-1">QTY: {item.quantity} × ₹{item.price}</p>
                        <p className="text-lg font-black text-primary font-mono mt-1">₹{(item.quantity * item.price).toLocaleString()}</p>
                      </div>
                    </div>
                  ))}
                </div>

                {(() => {
                  const metadata = order.shipping_address?.shipping_metadata;
                  const subtotal = metadata?.subtotal ?? (order.items?.reduce((acc, item) => acc + (item.price * item.quantity), 0) || 0);
                  const shipping = metadata?.shipping_cost ?? (Number(order.total_amount) > subtotal ? 350.0 : 0.0);
                  const cgst = metadata?.cgst_amount ?? (Number(order.total_amount) > subtotal ? subtotal * 0.09 : 0.0);
                  const sgst = metadata?.sgst_amount ?? (Number(order.total_amount) > subtotal ? subtotal * 0.09 : 0.0);
                  const codCharge = metadata?.cod_charge ?? 0.0;

                  return (
                    <div className="p-6 rounded-xl bg-[#0B1220] text-slate-200 border border-border-subtle/10">
                      <div className="space-y-3 font-mono text-sm">
                        <div className="flex justify-between font-medium text-slate-400">
                          <span>Subtotal</span>
                          <span className="text-white">₹{subtotal.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                        </div>
                        <div className="flex justify-between font-medium text-slate-400">
                          <span>Shipping</span>
                          <span className="text-white">{shipping > 0 ? `₹${shipping.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : 'FREE'}</span>
                        </div>
                        {codCharge > 0 && (
                          <div className="flex justify-between font-medium text-slate-400">
                            <span>COD Handling Fee</span>
                            <span className="text-white">₹{codCharge.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                          </div>
                        )}
                        {cgst > 0 && (
                          <>
                            <div className="flex justify-between font-medium text-slate-400">
                              <span>SGST (9%)</span>
                              <span className="text-white">₹{sgst.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                            </div>
                            <div className="flex justify-between font-medium text-slate-400">
                              <span>CGST (9%)</span>
                              <span className="text-white">₹{cgst.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                            </div>
                          </>
                        )}
                        <div className="h-px bg-white/10 my-2" />
                        <div className="flex justify-between items-end">
                          <span className="text-xs font-mono tracking-wider font-semibold text-primary uppercase">Total Amount</span>
                          <span className="text-3xl font-black text-white">₹{Number(order.total_amount).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                        </div>
                      </div>
                    </div>
                  );
                })()}
              </div>

              {/* Right Side: Status & Shipping OR Return Form */}
              <div className="lg:col-span-5 space-y-8">
                {isReturning ? (
                  <form onSubmit={handleSubmitReturn} className="p-6 rounded-xl border border-border-subtle bg-surface-container-low/20 space-y-6">
                    <div>
                      <h3 className="text-sm font-black text-foreground mb-2 uppercase tracking-tight">Return Request</h3>
                      <p className="text-xs text-muted-foreground leading-relaxed">Please select a reason and optional proof image to submit a return request for this order.</p>
                    </div>

                    <div className="space-y-2">
                      <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Reason for Return</label>
                      <select
                        value={reason}
                        onChange={(e) => setReason(e.target.value)}
                        required
                        className="w-full h-12 px-4 rounded-lg border border-border-subtle text-xs font-bold bg-surface focus:border-primary focus:ring-2 focus:ring-primary/20 focus:outline-none"
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
                        <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Details</label>
                        <textarea
                          placeholder="Please provide details about the return reason..."
                          value={otherDetails}
                          onChange={(e) => setOtherDetails(e.target.value)}
                          required
                          className="w-full p-4 min-h-[80px] rounded-lg border border-border-subtle text-xs font-medium bg-surface focus:border-primary focus:ring-2 focus:ring-primary/20 focus:outline-none resize-none"
                        />
                      </div>
                    )}

                    <div className="space-y-2">
                      <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Upload Proof Image (Optional)</label>
                      <div className="relative group border border-dashed border-border-subtle hover:border-primary/50 transition-all duration-300 rounded-lg p-4 flex flex-col items-center justify-center bg-surface hover:bg-primary/5 cursor-pointer min-h-[140px]">
                        <input
                          type="file"
                          accept="image/*"
                          onChange={handleImageChange}
                          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                        />
                        {imagePreview ? (
                          <div className="relative w-full h-28 rounded-lg overflow-hidden z-20">
                            <img src={imagePreview} alt="Preview" className="w-full h-full object-cover" />
                            <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  e.preventDefault();
                                  setImage(null);
                                  setImagePreview(null);
                                }}
                                className="absolute top-1.5 right-1.5 w-6 h-6 rounded-full bg-[#0B1220]/70 text-white flex items-center justify-center hover:bg-[#0B1220] transition-colors"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        ) : (
                          <div className="text-center flex flex-col items-center justify-center">
                            <Upload className="w-8 h-8 text-muted-foreground/50 group-hover:text-primary transition-colors mb-2" />
                            <span className="text-xs font-bold text-muted-foreground/70 group-hover:text-primary">Select Image File</span>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="flex gap-3 pt-2">
                      <Button
                        type="button"
                        variant="ghost"
                        onClick={() => {
                          setIsReturning(false);
                          setReason('');
                          setOtherDetails('');
                          setImage(null);
                          setImagePreview(null);
                        }}
                        className="flex-1 h-12 rounded-lg font-black uppercase tracking-widest border border-border-subtle text-xs text-muted-foreground hover:bg-surface-container"
                      >
                        Cancel
                      </Button>
                      <Button
                        type="submit"
                        disabled={submittingReturn || !reason}
                        className="flex-1 h-12 rounded-lg font-black uppercase tracking-widest text-xs bg-primary hover:bg-primary/90 text-primary-foreground hover:shadow-emerald-glow"
                      >
                        {submittingReturn ? 'Submitting...' : 'Submit'}
                      </Button>
                    </div>
                  </form>
                ) : (
                  <div className="space-y-6">
                    <div>
                      <div className="flex items-center justify-between mb-4 ml-1">
                        <h3 className="text-[10px] font-mono tracking-wider font-semibold text-muted-foreground uppercase">Timeline</h3>
                        <span className={`text-[9px] font-black uppercase tracking-widest px-2.5 py-1 rounded-md ${
                          (() => {
                            const s = (order.order_status || '').toLowerCase();
                            if (s === 'delivered') return 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20';
                            if (s === 'in_transit') return 'bg-blue-500/10 text-blue-500 border border-blue-500/20';
                            if (s === 'out_for_delivery') return 'bg-amber-500/10 text-amber-500 border border-amber-500/20';
                            if (s === 'failed_delivery' || s === 'failed' || s === 'cancelled') return 'bg-rose-500/10 text-rose-500 border border-rose-500/20';
                            if (s === 'returned' || s === 'return_approved') return 'bg-purple-500/10 text-purple-500 border border-purple-500/20';
                            return 'bg-primary/10 text-primary border border-primary/20';
                          })()
                        }`}>
                          {order.order_status?.replace('_', ' ')}
                        </span>
                      </div>
                      
                      {(() => {
                        const status = (order.order_status || '').toLowerCase();
                        const isPaid = order.payment_status?.toLowerCase() === 'paid' || order.payment_status?.toLowerCase() === 'completed' || order.payment_method?.toLowerCase() === 'cod';
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
                            <div className="flex items-center gap-3 bg-rose-950/20 border border-rose-800/30 rounded-xl p-4 text-rose-400 font-semibold text-xs">
                              <X className="w-5 h-5 text-rose-500 shrink-0" />
                              <div>
                                <p className="font-extrabold text-rose-300">Order Cancelled</p>
                                <p className="text-rose-400/80 mt-0.5">This order was cancelled on {new Date(order.updated_at || order.created_at).toLocaleString('en-IN')}</p>
                              </div>
                            </div>
                          );
                        }

                        return (
                          <div className="space-y-6 relative before:absolute before:left-3 before:top-2 before:bottom-2 before:w-px before:bg-border-subtle">
                            {steps.map((step, idx) => (
                              <div key={idx} className="flex gap-4 relative z-10">
                                <div className={`w-6 h-6 rounded-full border-4 border-surface flex-shrink-0 shadow-sm flex items-center justify-center ${
                                  step.active ? 'bg-primary text-white' : 'bg-surface-container text-muted-foreground'
                                }`}>
                                  {step.active ? <Check className="w-3 h-3 stroke-[3px]" /> : <span className="text-[8px] font-bold">{idx + 1}</span>}
                                </div>
                                <div>
                                  <p className={`text-xs font-black uppercase tracking-tight ${
                                    step.active ? 'text-foreground' : 'text-muted-foreground'
                                  }`}>{step.label}</p>
                                  {step.date && <p className="text-[10px] font-mono text-muted-foreground">{new Date(step.date).toLocaleString()}</p>}
                                </div>
                              </div>
                            ))}
                          </div>
                        );
                      })()}
                    </div>

                    <div className="p-6 rounded-xl border border-border-subtle bg-surface-container-low/20 space-y-4">
                      <h3 className="text-[10px] font-mono tracking-wider font-semibold text-muted-foreground uppercase">Shipping Address</h3>
                      <div className="flex gap-3">
                        <MapPin className="w-5 h-5 text-primary flex-shrink-0" />
                        <div className="text-sm font-medium text-muted-foreground leading-relaxed">
                          <p className="font-black text-foreground">{order.shipping_address?.full_name}</p>
                          <p>{order.shipping_address?.address_line1}</p>
                          <p>{order.shipping_address?.city}, {order.shipping_address?.state} - <span className="font-mono text-foreground font-bold">{order.shipping_address?.pincode}</span></p>
                          <div className="flex items-center gap-2 mt-2 font-mono text-foreground font-semibold">
                            <Phone className="w-3.5 h-3.5 text-muted-foreground" />
                            {order.shipping_address?.phone}
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="p-6 rounded-xl bg-primary/5 border border-primary/25 flex items-center justify-between">
                      <div>
                        <h3 className="text-[10px] font-mono tracking-wider font-semibold text-primary mb-1 uppercase">Expected Delivery</h3>
                        <p className="font-black text-foreground font-mono uppercase tracking-tight">
                          {order.order_status === 'delivered' ? 'Delivered' : getExpectedDeliveryDate(order.created_at)}
                        </p>
                      </div>
                      <Calendar className="w-8 h-8 text-primary/30" />
                    </div>

                    {order.tracking_id && (
                      <div className="p-6 rounded-xl bg-sky-50/5 border border-sky-500/15 flex flex-col gap-4">
                        <div className="flex items-start gap-4">
                          <Truck className="w-6 h-6 text-sky-400 shrink-0 mt-0.5" />
                          <div className="space-y-1 flex-1">
                            <h4 className="text-[10px] font-mono tracking-wider font-semibold text-sky-450 uppercase">Shipment Tracking Details</h4>
                            <div className="text-xs text-muted-foreground leading-relaxed font-semibold">
                              <p>Courier: <span className="font-extrabold text-foreground">{order.courier_name || order.carrier || 'Courier'}</span></p>
                              <p className="flex items-center gap-2 mt-0.5">
                                Tracking Number: <span className="font-mono text-foreground font-extrabold select-all">{order.tracking_number || order.tracking_id}</span>
                                <button
                                  onClick={() => {
                                    navigator.clipboard.writeText(order.tracking_number || order.tracking_id);
                                    toast.success('Tracking number copied!');
                                  }}
                                  className="text-[9px] font-black uppercase text-primary border border-primary/20 bg-surface hover:bg-primary/5 px-2 py-0.5 rounded-md shadow-sm transition-all"
                                >
                                  Copy
                                </button>
                              </p>
                              {order.expected_delivery_date && (
                                <p className="mt-0.5">Estimated Delivery: <span className="font-extrabold text-foreground">{new Date(order.expected_delivery_date).toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' })}</span></p>
                              )}
                              {order.shipment_notes && (
                                <p className="mt-2 text-muted-foreground italic bg-surface-container-low/30 p-2 rounded-lg border border-border-subtle/50">Notes: {order.shipment_notes}</p>
                              )}
                            </div>
                          </div>
                        </div>
                        {order.tracking_url ? (
                          <a 
                            href={order.tracking_url} 
                            target="_blank" 
                            rel="noreferrer"
                            className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-black uppercase tracking-widest text-[9px] px-5 py-3 rounded-lg shadow-md hover:shadow-emerald-glow transition-all whitespace-nowrap text-center"
                          >
                            Track Shipment
                          </a>
                        ) : (
                          <span className="w-full text-[9px] font-black uppercase tracking-wider text-muted-foreground bg-surface-container border border-border-subtle px-3 py-3 rounded-lg text-center">
                            No Direct Tracking Link
                          </span>
                        )}
                      </div>
                    )}

                    <div className="p-6 rounded-xl bg-primary/5 border border-primary/25 flex items-center justify-between">
                      <div>
                        <h3 className="text-[10px] font-mono tracking-wider font-semibold text-primary mb-1 uppercase">Payment Method</h3>
                        <p className="font-black text-foreground font-mono uppercase tracking-tight">{order.payment_method || 'Razorpay'}</p>
                      </div>
                      <CreditCard className="w-8 h-8 text-primary/30" />
                    </div>

                    {order.return_reason && (
                      <div className="p-6 rounded-xl bg-amber-50/40 border border-amber-200/50 space-y-4">
                        <h3 className="text-[10px] font-mono tracking-wider font-semibold text-amber-600 uppercase">Return Request Details</h3>
                        <div className="space-y-3">
                          <div className="flex justify-between items-center">
                            <span className="text-[10px] font-mono tracking-wider font-semibold text-muted-foreground">Status</span>
                            <span className={`text-[10px] font-mono tracking-wider font-semibold px-2.5 py-1 rounded-sm ${
                              order.order_status === 'return_approved' ? 'bg-emerald-100 text-emerald-700' :
                              order.order_status === 'return_rejected' ? 'bg-rose-100 text-rose-700' :
                              'bg-orange-100 text-orange-700'
                            }`}>
                              {order.order_status?.replace('_', ' ')}
                            </span>
                          </div>
                          
                          <div>
                            <span className="text-[9px] font-mono tracking-wider font-semibold text-muted-foreground">Reason</span>
                            <p className="text-xs font-bold text-foreground/80 mt-0.5">{order.return_reason}</p>
                          </div>

                          {order.admin_message && (
                            <div className="bg-surface p-3 rounded-lg border border-amber-200/30">
                              <span className="text-[9px] font-mono tracking-wider font-semibold text-amber-600 block mb-0.5">
                                {order.order_status === 'return_approved' 
                                  ? 'Approval Remarks' 
                                  : order.order_status === 'return_rejected' 
                                    ? 'Rejection Reason' 
                                    : 'Store Remarks'}
                              </span>
                              <p className="text-xs font-semibold text-foreground/80 leading-relaxed">{order.admin_message}</p>
                            </div>
                          )}

                          {order.return_image_url && (
                            <div>
                              <span className="text-[9px] font-mono tracking-wider font-semibold text-muted-foreground block mb-1">Uploaded Proof</span>
                              <a
                                href={formatImageUrl(order.return_image_url)}
                                target="_blank"
                                rel="noreferrer"
                                className="inline-block relative rounded-lg border border-border-subtle overflow-hidden bg-surface shadow-sm w-20 h-20 hover:ring-2 hover:ring-primary/40 transition-all"
                              >
                                <img 
                                  src={formatImageUrl(order.return_image_url)} 
                                  alt="Proof" 
                                  className="w-full h-full object-cover"
                                />
                              </a>
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>

            </div>
          </div>

          {/* Footer */}
          {!isReturning && (
            <div className="p-8 border-t border-border-subtle flex gap-4">
              {(order.payment_status === 'Paid' || order.payment_status === 'completed') && (
                <Button
                  className="flex-1 h-12 bg-primary hover:bg-primary/90 text-primary-foreground font-black uppercase tracking-widest rounded-lg shadow-sm hover:shadow-emerald-glow"
                  onClick={handleDownloadInvoice}
                >
                   <ExternalLink className="w-4 h-4 mr-2" /> Download Invoice
                </Button>
              )}
              {order.payment_status !== 'Paid' && 
               order.payment_status !== 'completed' && 
               !['cancelled', 'refunded', 'failed', 'return_approved'].includes((order.order_status || '').toLowerCase()) && (
                <div className="flex-1 flex flex-col items-center gap-1.5">
                  <Button
                    onClick={handlePayOnline}
                    disabled={payingOnline}
                    className="w-full h-12 bg-primary hover:bg-primary/95 text-primary-foreground font-black uppercase tracking-widest rounded-lg shadow-sm hover:shadow-emerald-glow flex items-center justify-center"
                  >
                    <Wallet className="w-4 h-4 mr-2" /> {payingOnline ? 'Processing...' : 'Pay Now'}
                  </Button>
                  {timeLeft && (
                    <span className="flex items-center gap-1.5 text-xs font-black text-rose-600 animate-pulse">
                      <Clock className="w-3.5 h-3.5 animate-spin" style={{ animationDuration: '4s' }} />
                      Expires in: {timeLeft}
                    </span>
                  )}
                </div>
              )}
              {order.order_status === 'delivered' && (
                <Button
                  variant="ghost"
                  onClick={() => setIsReturning(true)}
                  className="flex-1 h-12 rounded-lg font-black uppercase tracking-widest border border-border-subtle text-muted-foreground hover:bg-surface-container"
                >
                  Return Items
                </Button>
              )}
            </div>
          )}
        </motion.div>
      </div>
    </AnimatePresence>
  );
};

export default OrderDetailsModal;
