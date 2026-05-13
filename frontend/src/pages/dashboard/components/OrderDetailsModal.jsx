import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Package, Truck, CreditCard, ExternalLink, Calendar, MapPin, Phone } from 'lucide-react';
import { Button } from '../../../components/ui/button';

const OrderDetailsModal = ({ order, isOpen, onClose }) => {
  if (!isOpen || !order) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 md:p-8">
        <motion.div 
          initial={{ opacity: 0 }} 
          animate={{ opacity: 1 }} 
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="absolute inset-0 bg-slate-900/60 backdrop-blur-md"
        />
        
        <motion.div 
          initial={{ opacity: 0, scale: 0.9, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.9, y: 20 }}
          className="relative w-full max-w-4xl max-h-[90vh] bg-white rounded-[3rem] shadow-2xl overflow-hidden flex flex-col"
        >
          {/* Header */}
          <div className="p-8 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <div className="w-10 h-10 rounded-2xl bg-indigo-600 text-white flex items-center justify-center">
                  <Package className="w-5 h-5" />
                </div>
                <h2 className="text-2xl font-black text-slate-900 uppercase tracking-tight">Order Details</h2>
              </div>
              <p className="text-xs font-black uppercase tracking-widest text-slate-400 ml-1">Order #{order.order_number}</p>
            </div>
            <button onClick={onClose} className="w-12 h-12 rounded-2xl bg-white border border-slate-100 flex items-center justify-center text-slate-400 hover:text-slate-900 hover:border-slate-200 transition-all">
              <X className="w-6 h-6" />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-8">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">
              
              {/* Left Side: Items & Summary */}
              <div className="lg:col-span-7 space-y-8">
                <div className="space-y-4">
                  <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Order Items</h3>
                  {order.items.map((item, idx) => (
                    <div key={idx} className="flex gap-4 p-4 rounded-3xl border border-slate-50 bg-slate-50/30">
                      <img src={item.image_url} alt="" className="w-20 h-20 rounded-2xl object-cover bg-white" />
                      <div className="flex-1 min-w-0">
                        <h4 className="font-black text-slate-900 truncate">{item.product_name}</h4>
                        <p className="text-[10px] font-bold text-slate-400 uppercase mt-1">QTY: {item.quantity} × ₹{item.price}</p>
                        <p className="text-lg font-black text-indigo-600 mt-1">₹{(item.quantity * item.price).toLocaleString()}</p>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="p-6 rounded-3xl bg-slate-900 text-white">
                  <div className="space-y-3">
                    <div className="flex justify-between text-sm font-bold text-slate-400">
                      <span>Subtotal</span>
                      <span className="text-white">₹{(order.total_amount - (order.shipping_cost || 0)).toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between text-sm font-bold text-slate-400">
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

              {/* Right Side: Status & Shipping */}
              <div className="lg:col-span-5 space-y-8">
                <div className="space-y-6">
                  <div>
                    <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-4 ml-1">Timeline</h3>
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
                            <p className={`text-xs font-black uppercase tracking-tight ${step.status === 'completed' ? 'text-slate-900' : 'text-slate-400'}`}>{step.label}</p>
                            {step.date && <p className="text-[10px] font-bold text-slate-400">{new Date(step.date).toLocaleString()}</p>}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="p-6 rounded-[2rem] border border-slate-100 space-y-4">
                    <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-400">Shipping Address</h3>
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
                </div>
              </div>

            </div>
          </div>

          {/* Footer */}
          <div className="p-8 border-t border-slate-100 flex gap-4">
            <Button className="flex-1 h-14 rounded-2xl font-black uppercase tracking-widest shadow-xl shadow-indigo-100">
               <ExternalLink className="w-4 h-4 mr-2" /> Download Invoice
            </Button>
            {order.order_status === 'delivered' && (
              <Button variant="ghost" className="flex-1 h-14 rounded-2xl font-black uppercase tracking-widest border border-slate-100">
                Return Items
              </Button>
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};

export default OrderDetailsModal;
