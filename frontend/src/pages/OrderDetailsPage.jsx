import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Package, Truck, CreditCard, ExternalLink, Calendar, MapPin, Phone, Upload, Info, Wallet, ArrowLeft, X } from 'lucide-react';
import { Button } from './../components/ui/button';
import { formatImageUrl } from './../utils/api';
import { useProgress } from './../components/ui/ProgressToast';
import paymentService from './../services/payment.service';
import apiClient from './../services/core/apiClient';
import { toast } from 'sonner';
import PageLoader from './../components/ui/PageLoader';

const OrderDetailsPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { startProgress, updateProgress, finishProgress } = useProgress();
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
        
        <button onClick={() => navigate('/dashboard')} className="flex items-center gap-2 text-slate-500 hover:text-indigo-600 transition-colors mb-6 font-bold text-sm">
          <ArrowLeft className="w-4 h-4" /> Back to Dashboard
        </button>

        <div className="bg-white rounded-[3rem] shadow-xl overflow-hidden flex flex-col border border-slate-200">
          {/* Header */}
          <div className="p-8 border-b border-slate-200 flex items-center justify-between bg-slate-50/50">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <div className="w-10 h-10 rounded-2xl bg-indigo-600 text-white flex items-center justify-center">
                  <Package className="w-5 h-5" />
                </div>
                <h2 className="text-2xl font-black text-slate-900 uppercase tracking-tight">Order Details</h2>
              </div>
              <p className="text-xs font-black uppercase tracking-widest text-slate-500 ml-1">Order #{order.order_number}</p>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-8">
            {order.admin_message && (
              <div className="mb-8 p-6 rounded-[2rem] bg-indigo-50 border border-indigo-100 flex gap-4 items-start shadow-sm">
                <div className="w-10 h-10 rounded-xl bg-indigo-600 text-white flex items-center justify-center shrink-0">
                  <Info className="w-5 h-5" />
                </div>
                <div className="space-y-1">
                  <h4 className="text-[10px] font-black uppercase tracking-widest text-indigo-600">Update from Store</h4>
                  <p className="text-sm font-semibold text-slate-850 leading-relaxed">{order.admin_message}</p>
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">
              
              {/* Left Side: Items & Summary */}
              <div className="lg:col-span-7 space-y-8">
                <div className="space-y-4">
                  <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-500 ml-1">Order Items</h3>
                  {order.items.map((item, idx) => (
                    <div key={idx} className="flex gap-4 p-4 rounded-3xl border border-slate-50 bg-slate-50/30">
                      <img src={formatImageUrl(item.image_url)} alt="" className="w-20 h-20 rounded-2xl object-cover bg-white" />
                      <div className="flex-1 min-w-0">
                        <h4 className="font-black text-slate-900 truncate">{item.product_name}</h4>
                        <p className="text-[10px] font-bold text-slate-500 uppercase mt-1">QTY: {item.quantity} × ₹{item.price}</p>
                        <p className="text-lg font-black text-indigo-600 mt-1">₹{(item.quantity * item.price).toLocaleString()}</p>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="p-6 rounded-3xl bg-slate-900 text-white">
                  <div className="space-y-3">
                    <div className="flex justify-between text-sm font-bold text-slate-500">
                      <span>Subtotal</span>
                      <span className="text-white">₹{(order.total_amount - (order.shipping_cost || 0)).toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between text-sm font-bold text-slate-500">
                      <span>Shipping</span>
                      <span className="text-white">₹{(order.shipping_cost || 0).toLocaleString()}</span>
                    </div>
                    <div className="h-px bg-white/10 my-2" />
                    <div className="flex justify-between items-end">
                      <span className="text-xs font-black uppercase tracking-widest text-indigo-400">Total Amount</span>
                      <span className="text-3xl font-black">₹{order.total_amount.toLocaleString()}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Right Side: Status & Shipping OR Return Form */}
              <div className="lg:col-span-5 space-y-8">
                {isReturning ? (
                  <form onSubmit={handleSubmitReturn} className="p-6 rounded-[2rem] border border-slate-200 bg-slate-50/20 space-y-6">
                    <div>
                      <h3 className="text-sm font-black text-slate-900 mb-2 uppercase tracking-tight">Return Request</h3>
                      <p className="text-xs text-slate-500 leading-relaxed">Please select a reason and optional proof image to submit a return request for this order.</p>
                    </div>

                    <div className="space-y-2">
                      <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 ml-1">Reason for Return</label>
                      <select
                        value={reason}
                        onChange={(e) => setReason(e.target.value)}
                        required
                        className="w-full h-12 px-4 rounded-2xl border border-slate-200 text-xs font-bold bg-white focus:ring-2 focus:ring-indigo-500 focus:outline-none"
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
                        <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 ml-1">Details</label>
                        <textarea
                          placeholder="Please provide details about the return reason..."
                          value={otherDetails}
                          onChange={(e) => setOtherDetails(e.target.value)}
                          required
                          className="w-full p-4 min-h-[80px] rounded-2xl border border-slate-200 text-xs font-medium bg-white focus:ring-2 focus:ring-indigo-500 focus:outline-none resize-none"
                        />
                      </div>
                    )}

                    <div className="space-y-2">
                      <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 ml-1">Upload Proof (Images/Videos) *</label>
                      <div className="relative group border-2 border-dashed border-slate-200 hover:border-indigo-500 transition-all duration-300 rounded-[2rem] p-6 flex flex-col items-center justify-center bg-white hover:bg-indigo-50/10 cursor-pointer min-h-[140px]">
                        <input
                          type="file"
                          multiple
                          accept="image/*,video/*"
                          onChange={handleFilesChange}
                          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                        />
                        <div className="text-center flex flex-col items-center justify-center pointer-events-none">
                          <Upload className="w-8 h-8 text-slate-400 group-hover:text-indigo-500 transition-colors mb-2" />
                          <span className="text-xs font-bold text-slate-500 group-hover:text-indigo-600">Select Images / Videos</span>
                          <span className="text-[10px] text-slate-400 mt-1">Upload multiple files up to 20MB each</span>
                        </div>
                      </div>

                      {returnPreviews.length > 0 && (
                        <div className="grid grid-cols-3 gap-3 pt-2">
                          {returnPreviews.map((preview, index) => (
                            <div key={index} className="relative w-full h-24 rounded-2xl overflow-hidden border border-slate-200 bg-slate-50 flex items-center justify-center">
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
                        className="flex-1 h-12 rounded-xl font-black uppercase tracking-widest border border-slate-200 text-xs text-slate-600 hover:bg-slate-100"
                      >
                        Cancel
                      </Button>
                      <Button
                        type="submit"
                        disabled={submittingReturn || !reason}
                        className="flex-1 h-12 rounded-xl font-black uppercase tracking-widest text-xs bg-indigo-600 hover:bg-indigo-700 text-white shadow-lg shadow-indigo-100"
                      >
                        {submittingReturn ? 'Submitting...' : 'Submit'}
                      </Button>
                    </div>
                  </form>
                ) : (
                  <div className="space-y-6">
                    <div>
                      <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-4 ml-1">Timeline</h3>
                      <div className="space-y-6 relative before:absolute before:left-3 before:top-2 before:bottom-2 before:w-px before:bg-slate-100">
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
                                      : 'bg-indigo-600'
                                : 'bg-slate-200'
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
                                        : 'text-slate-900'
                                  : 'text-slate-500'
                              }`}>{step.label}</p>
                              {step.date && <p className="text-[10px] font-bold text-slate-500">{new Date(step.date).toLocaleString()}</p>}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="p-6 rounded-[2rem] border border-slate-200 space-y-4">
                      <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-500">Shipping Address</h3>
                      <div className="flex gap-3">
                        <MapPin className="w-5 h-5 text-indigo-600 flex-shrink-0" />
                        <div className="text-sm font-medium text-slate-600 leading-relaxed">
                          <p className="font-black text-slate-900">{order.shipping_address?.full_name}</p>
                          <p>{order.shipping_address?.address_line1}</p>
                          <p>{order.shipping_address?.city}, {order.shipping_address?.state} - {order.shipping_address?.pincode}</p>
                          <div className="flex items-center gap-2 mt-2 font-bold text-slate-900">
                            <Phone className="w-3.5 h-3.5" />
                            {order.shipping_address?.phone}
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="p-6 rounded-[2rem] bg-indigo-50 border border-indigo-100 flex items-center justify-between">
                      <div>
                        <h3 className="text-[10px] font-black uppercase tracking-widest text-indigo-600 mb-1">Expected Delivery</h3>
                        <p className="font-black text-slate-900 uppercase tracking-tight">
                          {order.order_status === 'delivered' ? 'Delivered' : getExpectedDeliveryDate(order.created_at)}
                        </p>
                      </div>
                      <Calendar className="w-8 h-8 text-indigo-200" />
                    </div>

                    {order.tracking_id && (
                      <div className="p-6 rounded-[2rem] bg-sky-50 border border-sky-100 flex items-center justify-between gap-4">
                        <div>
                          <h3 className="text-[10px] font-black uppercase tracking-widest text-sky-600 mb-1">Shipment Tracking</h3>
                          <p className="font-black text-slate-900 uppercase tracking-tight">{order.carrier || 'Courier'}</p>
                          <p className="text-xs font-bold text-slate-600 mt-1">{order.tracking_id}</p>
                          {order.tracking_url && (
                            <a href={order.tracking_url} target="_blank" rel="noreferrer" className="text-[10px] font-black uppercase tracking-widest text-sky-700 hover:underline mt-2 inline-block">
                              Track package
                            </a>
                          )}
                        </div>
                        <Truck className="w-8 h-8 text-sky-200 shrink-0" />
                      </div>
                    )}

                    <div className="p-6 rounded-[2rem] bg-indigo-50 border border-indigo-100 flex items-center justify-between">
                      <div>
                        <h3 className="text-[10px] font-black uppercase tracking-widest text-indigo-600 mb-1">Payment Method</h3>
                        <p className="font-black text-slate-900 uppercase tracking-tight">{order.payment_method || 'Razorpay'}</p>
                      </div>
                      <CreditCard className="w-8 h-8 text-indigo-200" />
                    </div>

                    {order.return_reason && (
                      <div className="p-6 rounded-[2rem] bg-amber-50 border border-amber-100/70 space-y-4">
                        <h3 className="text-[10px] font-black uppercase tracking-widest text-amber-600">Return Request Details</h3>
                        <div className="space-y-3">
                          <div className="flex justify-between items-center">
                            <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Status</span>
                            <span className={`text-[10px] font-black uppercase tracking-widest px-2.5 py-1 rounded-full ${
                              order.order_status === 'return_approved' ? 'bg-emerald-100 text-emerald-700' :
                              order.order_status === 'return_rejected' ? 'bg-rose-100 text-rose-700' :
                              'bg-orange-100 text-orange-700'
                            }`}>
                              {order.order_status?.replace('_', ' ')}
                            </span>
                          </div>
                          
                          <div>
                            <span className="text-[9px] font-black uppercase tracking-widest text-slate-400">Reason</span>
                            <p className="text-xs font-bold text-slate-700 mt-0.5">{order.return_reason}</p>
                          </div>

                          {order.admin_message && (
                            <div className="bg-white p-3 rounded-xl border border-amber-100/50">
                              <span className="text-[9px] font-black uppercase tracking-widest text-amber-600 block mb-0.5">
                                {order.order_status === 'return_approved' 
                                  ? 'Approval Remarks' 
                                  : order.order_status === 'return_rejected' 
                                    ? 'Rejection Reason' 
                                    : 'Store Remarks'}
                              </span>
                              <p className="text-xs font-semibold text-slate-700 leading-relaxed">{order.admin_message}</p>
                            </div>
                          )}

                          {order.return_image_url && (
                            <div>
                              <span className="text-[9px] font-black uppercase tracking-widest text-slate-400 block mb-2">Uploaded Proof</span>
                              <div className="flex flex-wrap gap-3">
                                {order.return_image_url.split(',').map((url, index) => {
                                  const isVideo = url.match(/\.(mp4|mov|webm|ogg|avi)(\?|$)/i) || url.includes('/video/');
                                  const fullUrl = formatImageUrl(url);
                                  return (
                                    <div key={index} className="relative rounded-xl border border-slate-200 overflow-hidden bg-white shadow-sm w-20 h-20 hover:ring-2 hover:ring-indigo-500 transition-all flex items-center justify-center">
                                      {isVideo ? (
                                        <video src={fullUrl} controls className="w-full h-full object-cover" />
                                      ) : (
                                        <a href={fullUrl} target="_blank" rel="noreferrer" className="w-full h-full">
                                          <img src={fullUrl} alt="Proof" className="w-full h-full object-cover" />
                                        </a>
                                      )}
                                    </div>
                                  );
                                })}
                              </div>
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
            <div className="p-8 border-t border-slate-200 flex gap-4">
              {(order.payment_status === 'Paid' || order.payment_status === 'completed') && (
                <Button
                  className="flex-1 h-14 rounded-2xl font-black uppercase tracking-widest shadow-xl shadow-indigo-100"
                  onClick={handleDownloadInvoice}
                >
                   <ExternalLink className="w-4 h-4 mr-2" /> Download Invoice
                </Button>
              )}
              {order.payment_status !== 'Paid' && 
               order.payment_status !== 'completed' && 
               !['cancelled', 'refunded', 'failed', 'return_approved'].includes((order.order_status || '').toLowerCase()) && (
                <Button
                  onClick={handlePayOnline}
                  disabled={payingOnline}
                  className="flex-1 h-14 rounded-2xl font-black uppercase tracking-widest bg-emerald-600 hover:bg-emerald-700 text-white shadow-xl shadow-emerald-100"
                >
                  <Wallet className="w-4 h-4 mr-2" /> {payingOnline ? 'Processing...' : order.payment_method === 'cod' ? 'Pay Online' : 'Pay Now'}
                </Button>
              )}
              {order.order_status === 'delivered' && (
                <Button
                  variant="ghost"
                  onClick={() => setIsReturning(true)}
                  className="flex-1 h-14 rounded-2xl font-black uppercase tracking-widest border border-slate-200"
                >
                  Return Items
                </Button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default OrderDetailsPage;
