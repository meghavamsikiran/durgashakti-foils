import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Package, Truck, CreditCard, ExternalLink, Calendar, MapPin, Phone, Upload, Info } from 'lucide-react';
import { Button } from '../../../components/ui/button';
import { formatImageUrl } from '../../../utils/api';
import { useProgress } from '../../../components/ui/ProgressToast';

const OrderDetailsModal = ({ order, isOpen, onClose, onReturnOrder }) => {
  const { startProgress, updateProgress, finishProgress } = useProgress();
  const [isReturning, setIsReturning] = useState(false);
  const [reason, setReason] = useState('');
  const [otherDetails, setOtherDetails] = useState('');
  const [image, setImage] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [submittingReturn, setSubmittingReturn] = useState(false);

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

  const handleDownloadInvoice = () => {
    const progressId = startProgress({
      label: `Invoice_${order.order_number}.pdf`,
      type: 'download',
      fileType: 'file',
      message: 'Generating invoice...',
    });

    // Simulate invoice generation (replace with real API call when available)
    setTimeout(() => {
      updateProgress(progressId, { progress: 50, message: 'Building PDF...' });
      setTimeout(() => {
        updateProgress(progressId, { progress: 85, message: 'Preparing download...' });
        setTimeout(() => {
          finishProgress(progressId, { message: 'Invoice ready!' });
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
          className="relative w-full max-w-4xl max-h-[90vh] bg-white rounded-[3rem] shadow-2xl overflow-hidden flex flex-col"
        >
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
            <button onClick={handleClose} className="w-12 h-12 rounded-2xl bg-white border border-slate-200 flex items-center justify-center text-slate-500 hover:text-slate-900 hover:border-slate-200 transition-all">
              <X className="w-6 h-6" />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-8">
            {order.admin_message && (
              <div className="mb-8 p-6 rounded-[2rem] bg-indigo-50 border border-indigo-100 flex gap-4 items-start shadow-sm animate-in slide-in-from-top duration-300">
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
                      <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 ml-1">Upload Proof Image (Optional)</label>
                      <div className="relative group border-2 border-dashed border-slate-200 hover:border-indigo-500 transition-all duration-300 rounded-[2rem] p-4 flex flex-col items-center justify-center bg-white hover:bg-indigo-50/10 cursor-pointer min-h-[140px]">
                        <input
                          type="file"
                          accept="image/*"
                          onChange={handleImageChange}
                          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                        />
                        {imagePreview ? (
                          <div className="relative w-full h-28 rounded-2xl overflow-hidden z-20">
                            <img src={imagePreview} alt="Preview" className="w-full h-full object-cover" />
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                e.preventDefault();
                                setImage(null);
                                setImagePreview(null);
                              }}
                              className="absolute top-1.5 right-1.5 w-6 h-6 rounded-full bg-slate-900/70 text-white flex items-center justify-center hover:bg-slate-900 transition-colors"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        ) : (
                          <div className="text-center flex flex-col items-center justify-center">
                            <Upload className="w-8 h-8 text-slate-400 group-hover:text-indigo-500 transition-colors mb-2" />
                            <span className="text-xs font-bold text-slate-500 group-hover:text-indigo-600">Select Image File</span>
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
                        {[
                          { label: 'Placed', date: order.created_at, status: 'completed' },
                          { label: 'Confirmed', date: order.confirmed_at, status: order.confirmed_at ? 'completed' : 'pending' },
                          { label: 'Shipped', date: order.shipped_at, status: order.shipped_at ? 'completed' : 'pending' },
                          { label: 'Delivered', date: order.delivered_at, status: order.delivered_at ? 'completed' : 'pending' },
                        ].map((step, idx) => (
                          <div key={idx} className="flex gap-4 relative z-10">
                            <div className={`w-6 h-6 rounded-full border-4 border-white flex-shrink-0 shadow-sm ${step.status === 'completed' ? 'bg-indigo-600' : 'bg-slate-200'}`} />
                            <div>
                              <p className={`text-xs font-black uppercase tracking-tight ${step.status === 'completed' ? 'text-slate-900' : 'text-slate-500'}`}>{step.label}</p>
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
                              <span className="text-[9px] font-black uppercase tracking-widest text-amber-600 block mb-0.5">Admin Response</span>
                              <p className="text-xs font-semibold text-slate-700 leading-relaxed">{order.admin_message}</p>
                            </div>
                          )}

                          {order.return_image_url && (
                            <div>
                              <span className="text-[9px] font-black uppercase tracking-widest text-slate-400 block mb-1">Uploaded Proof</span>
                              <a
                                href={formatImageUrl(order.return_image_url)}
                                target="_blank"
                                rel="noreferrer"
                                className="inline-block relative rounded-xl border border-slate-200 overflow-hidden bg-white shadow-sm w-20 h-20 hover:ring-2 hover:ring-indigo-500 transition-all"
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
            <div className="p-8 border-t border-slate-200 flex gap-4">
              <Button
                className="flex-1 h-14 rounded-2xl font-black uppercase tracking-widest shadow-xl shadow-indigo-100"
                onClick={handleDownloadInvoice}
              >
                 <ExternalLink className="w-4 h-4 mr-2" /> Download Invoice
              </Button>
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
        </motion.div>
      </div>
    </AnimatePresence>
  );
};

export default OrderDetailsModal;
