import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Package, Truck, CreditCard, ExternalLink, Calendar, MapPin, Phone, Upload, Info, Wallet } from 'lucide-react';
import { Button } from '../../../components/ui/button';
import { formatImageUrl } from '../../../utils/api';
import { useProgress } from '../../../components/ui/ProgressToast';
import paymentService from '../../../services/payment.service';
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
      const response = await paymentService.payCODOnline(order.id);
      const { razorpay_order_id, amount, currency, key_id } = response;

      const options = {
        key: key_id || process.env.REACT_APP_RAZORPAY_KEY_ID,
        amount: amount,
        currency: currency || 'INR',
        name: 'DurgaShakti Foils',
        description: `COD Payment - Order ${order.order_number}`,
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
                      <h3 className="text-[10px] font-mono tracking-wider font-semibold text-muted-foreground mb-4 ml-1 uppercase">Timeline</h3>
                      <div className="space-y-6 relative before:absolute before:left-3 before:top-2 before:bottom-2 before:w-px before:bg-border-subtle">
                        {(() => {
                          const status = (order.order_status || '').toLowerCase();
                          const isConfirmed = ['confirmed', 'packaging', 'packed', 'shipped', 'out_for_delivery', 'delivered', 'return_requested', 'return_approved', 'return_rejected', 'refunded'].includes(status);
                          const isShipped = ['shipped', 'out_for_delivery', 'delivered', 'return_requested', 'return_approved', 'return_rejected', 'refunded'].includes(status);
                          const isDelivered = ['delivered', 'return_requested', 'return_approved', 'return_rejected', 'refunded'].includes(status);

                          const steps = [
                            { label: 'Placed', date: order.created_at, status: 'completed' }
                          ];

                          if (status === 'cancelled') {
                            steps.push({ label: 'Cancelled', date: order.updated_at || order.created_at, status: 'completed' });
                          } else {
                            steps.push({ label: 'Confirmed', date: isConfirmed ? order.created_at : null, status: isConfirmed ? 'completed' : 'pending' });
                            steps.push({ label: 'Shipped', date: isShipped ? (order.shipped_at || order.updated_at) : null, status: isShipped ? 'completed' : 'pending' });
                            steps.push({ label: 'Delivered', date: isDelivered ? (order.delivered_at || order.updated_at) : null, status: isDelivered ? 'completed' : 'pending' });

                            if (status === 'return_requested') {
                              steps.push({ label: 'Return Requested', date: order.updated_at, status: 'completed' });
                            } else if (status === 'return_approved' || status === 'refunded') {
                              steps.push({ label: 'Return Approved & Refunded', date: order.updated_at, status: 'completed' });
                            } else if (status === 'return_rejected') {
                              steps.push({ label: 'Return Rejected', date: order.updated_at, status: 'completed' });
                            }
                          }
                          return steps;
                        })().map((step, idx) => (
                          <div key={idx} className="flex gap-4 relative z-10">
                            <div className={`w-6 h-6 rounded-full border-4 border-white flex-shrink-0 shadow-sm ${
                              step.status === 'completed'
                                ? step.label.includes('Cancel') || step.label.includes('Rejected')
                                  ? 'bg-rose-600'
                                  : step.label.includes('Request')
                                    ? 'bg-amber-500'
                                    : step.label.includes('Refund') || step.label.includes('Approved')
                                      ? 'bg-emerald-600'
                                      : 'bg-primary'
                                : 'bg-surface-container'
                            }`} />
                            <div>
                              <p className={`text-xs font-black uppercase tracking-tight ${
                                step.status === 'completed'
                                  ? step.label.includes('Cancel') || step.label.includes('Rejected')
                                    ? 'text-rose-600'
                                    : step.label.includes('Request')
                                      ? 'text-amber-600'
                                      : step.label.includes('Refund') || step.label.includes('Approved')
                                        ? 'text-emerald-600'
                                        : 'text-foreground'
                                  : 'text-muted-foreground'
                              }`}>{step.label}</p>
                              {step.date && <p className="text-[10px] font-mono text-muted-foreground">{new Date(step.date).toLocaleString()}</p>}
                            </div>
                          </div>
                        ))}
                      </div>
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
                      <div className="p-6 rounded-xl bg-sky-50/40 border border-sky-200/50 flex items-center justify-between gap-4">
                        <div>
                          <h3 className="text-[10px] font-mono tracking-wider font-semibold text-sky-600 mb-1 uppercase">Shipment Tracking</h3>
                          <p className="font-black text-foreground font-mono uppercase tracking-tight">{order.carrier || 'Courier'}</p>
                          <p className="text-xs font-mono text-muted-foreground mt-1">{order.tracking_id}</p>
                          {order.tracking_url && (
                            <a href={order.tracking_url} target="_blank" rel="noreferrer" className="text-[10px] font-mono font-semibold uppercase tracking-widest text-sky-700 hover:underline mt-2 inline-block">
                              Track package
                            </a>
                          )}
                        </div>
                        <Truck className="w-8 h-8 text-sky-400/40 shrink-0" />
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
              {order.payment_method === 'cod' && 
               order.payment_status !== 'Paid' && 
               order.payment_status !== 'completed' && 
               !['cancelled', 'refunded', 'failed', 'return_approved'].includes((order.order_status || '').toLowerCase()) && (
                <Button
                  onClick={handlePayOnline}
                  disabled={payingOnline}
                  className="flex-1 h-12 bg-primary hover:bg-primary/95 text-primary-foreground font-black uppercase tracking-widest rounded-lg shadow-sm hover:shadow-emerald-glow"
                >
                  <Wallet className="w-4 h-4 mr-2" /> {payingOnline ? 'Processing...' : 'Pay Online'}
                </Button>
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
