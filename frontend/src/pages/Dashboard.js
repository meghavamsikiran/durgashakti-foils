import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Package, User, Calendar, X } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import api from '../utils/api';
import { toast } from 'sonner';
import { Button } from '../components/ui/button';

const RAZORPAY_KEY_ID = process.env.REACT_APP_RAZORPAY_KEY_ID || 'rzp_test_SlmLztmM54CPAn';

const Dashboard = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  // Return Modal State
  const [returnOrderId, setReturnOrderId] = useState(null);
  const [returnReason, setReturnReason] = useState('');
  const [returnImage, setReturnImage] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!user && !localStorage.getItem('token')) {
      navigate('/login');
      return;
    }
    if (user) {
      fetchOrders();
    }
  }, [user]);

  const fetchOrders = async () => {
    try {
      const response = await api.getOrders();
      setOrders(response.data);
    } catch (error) {
      console.error('Error fetching orders:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCancelOrder = async (orderId) => {
    if (!window.confirm('Are you sure you want to cancel this order?')) return;
    try {
      await api.cancelOrder(orderId);
      toast.success('Order cancelled successfully');
      fetchOrders();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to cancel order');
    }
  };

  const handleReturnSubmit = async (e) => {
    e.preventDefault();
    if (!returnReason.trim()) {
      toast.error('Please provide a reason for the return');
      return;
    }
    
    setIsSubmitting(true);
    try {
      const formData = new FormData();
      formData.append('reason', returnReason);
      if (returnImage) {
        formData.append('image', returnImage);
      }
      
      await api.returnOrder(returnOrderId, formData);
      toast.success('Return request submitted successfully');
      setReturnOrderId(null);
      setReturnReason('');
      setReturnImage(null);
      fetchOrders();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to submit return request');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRazorpayPayment = (orderId) => {
    return new Promise(async (resolve, reject) => {
      try {
        const response = await api.createRazorpayOrder(orderId);
        const { razorpay_order_id, amount, currency, key_id } = response.data;

        const options = {
          key: key_id || RAZORPAY_KEY_ID,
          amount: amount,
          currency: currency || 'INR',
          name: 'DurgaShakti Foils',
          description: 'Secure Payment',
          image: '',
          order_id: razorpay_order_id,
          handler: async (paymentResponse) => {
            try {
              await api.verifyRazorpayPayment({
                order_id: orderId,
                razorpay_order_id: paymentResponse.razorpay_order_id,
                razorpay_payment_id: paymentResponse.razorpay_payment_id,
                razorpay_signature: paymentResponse.razorpay_signature
              });
              toast.success('Payment successful!');
              fetchOrders();
              resolve();
            } catch (err) {
              toast.error('Payment verification failed.');
              reject(err);
            }
          },
          prefill: {
            name: user?.full_name,
            email: user?.email,
            contact: user?.phone
          },
          theme: {
            color: '#000000'
          },
          modal: {
            ondismiss: () => {
              reject(new Error('payment_cancelled'));
            }
          },
          retry: {
            enabled: false
          }
        };

        const paymentObject = new window.Razorpay(options);
        paymentObject.on('payment.failed', function (response) {
          reject(new Error('payment_failed'));
        });
        paymentObject.open();
      } catch (error) {
        toast.error('Could not initialize payment. Please try again.');
        reject(error);
      }
    });
  };

  const getStatusColor = (status) => {
    switch ((status || '').toLowerCase()) {
      case 'completed':
        return 'text-green-600 bg-green-50';
      case 'pending':
        return 'text-yellow-600 bg-yellow-50';
      case 'processing':
        return 'text-blue-600 bg-blue-50';
      case 'confirmed':
        return 'text-indigo-600 bg-indigo-50';
      case 'packed':
        return 'text-yellow-600 bg-yellow-50';
      case 'shipped':
        return 'text-purple-600 bg-purple-50';
      case 'delivered':
        return 'text-green-600 bg-green-50';
      case 'cancelled':
        return 'text-red-600 bg-red-50';
      case 'return_requested':
        return 'text-orange-600 bg-orange-50';
      case 'return_approved':
        return 'text-teal-600 bg-teal-50';
      case 'return_rejected':
        return 'text-red-600 bg-red-50';
      case 'refunded':
        return 'text-gray-600 bg-gray-50';
      default:
        return 'text-gray-600 bg-gray-50';
    }
  };

  const isReturnEligible = (order) => {
    if (order.order_status?.toLowerCase() !== 'delivered') return false;
    // Prioritize delivered_at for accurate tracking
    const deliveryDate = new Date(order.delivered_at || order.updated_at || order.created_at);
    const currentDate = new Date();
    const diffTime = currentDate.getTime() - deliveryDate.getTime();
    const diffDays = diffTime / (1000 * 60 * 60 * 24); 
    return diffDays <= 3;
  };

  const getReturnExpiryMessage = (order) => {
    if (order.order_status?.toLowerCase() !== 'delivered') return null;
    const deliveryDate = new Date(order.delivered_at || order.updated_at || order.created_at);
    const expiryDate = new Date(deliveryDate);
    expiryDate.setDate(expiryDate.getDate() + 3);
    
    if (isReturnEligible(order)) {
        return `Return eligible until ${expiryDate.toLocaleDateString()}`;
    }
    return "Return window closed";
  };

  return (
    <div className="min-h-screen py-12" data-testid="dashboard-page">
      <div className="max-w-7xl mx-auto px-6 md:px-12 lg:px-24">
        <h1 className="text-4xl md:text-5xl font-bold tracking-tight mb-8" style={{ fontFamily: 'Manrope' }} data-testid="dashboard-title">
          My Dashboard
        </h1>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white border border-border p-6 rounded-sm flex flex-col gap-2"
          >
            <User className="w-8 h-8 text-primary mb-2" />
            <span className="text-sm text-muted-foreground">Name</span>
            <span className="text-xl font-semibold" style={{ fontFamily: 'Manrope' }} data-testid="user-name">
              {user?.full_name}
            </span>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-white border border-border p-6 rounded-sm flex flex-col gap-2"
          >
            <Package className="w-8 h-8 text-primary mb-2" />
            <span className="text-sm text-muted-foreground">Total Orders</span>
            <span className="text-xl font-semibold" style={{ fontFamily: 'Manrope' }} data-testid="total-orders">
              {orders.length}
            </span>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="bg-white border border-border p-6 rounded-sm flex flex-col gap-2"
          >
            <Calendar className="w-8 h-8 text-primary mb-2" />
            <span className="text-sm text-muted-foreground">Member Since</span>
            <span className="text-xl font-semibold" style={{ fontFamily: 'Manrope' }}>
              {new Date(user?.created_at).toLocaleDateString()}
            </span>
          </motion.div>
        </div>

        <h2 className="text-2xl font-bold mb-6" style={{ fontFamily: 'Manrope' }}>
          Order History
        </h2>

        {loading ? (
          <div className="text-center py-12">
            <p className="text-muted-foreground">Loading orders...</p>
          </div>
        ) : orders.length === 0 ? (
          <div className="text-center py-12 bg-secondary/30 border border-border/50 rounded-sm">
            <Package className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground">No orders yet</p>
          </div>
        ) : (
          <div className="space-y-4">
            {orders.map((order, index) => (
              <motion.div
                key={order.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
                className="bg-card border border-border/50 rounded-sm p-6 transition-colors"
                data-testid={`order-${order.id}`}
              >
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-4 mb-2">
                      <h3 className="font-semibold text-lg" style={{ fontFamily: 'Manrope' }}>
                        Order #{order.order_number}
                      </h3>
                      <span className={`text-xs px-3 py-1 rounded-full font-semibold ${getStatusColor(order.order_status)}`}>
                        {order.order_status.toUpperCase()}
                      </span>
                    </div>
                    <p className="text-sm text-muted-foreground mb-2">
                      {order.items.length} item{order.items.length !== 1 ? 's' : ''} • 
                      Placed on {new Date(order.created_at).toLocaleDateString()}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      Payment: {order.payment_method.toUpperCase()} • {order.payment_status}
                    </p>
                  </div>
                  <div className="text-right flex flex-col items-end gap-2">
                    <p className="text-2xl font-bold" style={{ fontFamily: 'Manrope' }}>
                      ₹{order.total_amount.toFixed(2)}
                    </p>
                    {order.payment_status === 'pending' && !['cancelled', 'refunded', 'return_requested', 'return_approved'].includes(order.order_status?.toLowerCase()) && (
                      <Button 
                        variant="default" 
                        size="sm" 
                        onClick={() => {
                          handleRazorpayPayment(order.id).catch(err => {
                            if (err.message !== 'payment_failed' && err.message !== 'payment_cancelled') {
                              toast.error('Payment process failed');
                            }
                          });
                        }}
                        className="bg-black text-white hover:bg-gray-800"
                      >
                        Pay Now
                      </Button>
                    )}
                    {['pending', 'processing', 'placed'].includes(order.order_status?.toLowerCase()) && (
                      <Button 
                        variant="destructive" 
                        size="sm" 
                        onClick={() => handleCancelOrder(order.id)}
                      >
                        Cancel Order
                      </Button>
                    )}
                    {order.order_status?.toLowerCase() === 'delivered' && (
                      <div className="flex flex-col items-end gap-1">
                        {isReturnEligible(order) ? (
                          <Button 
                            variant="outline" 
                            size="sm" 
                            onClick={() => setReturnOrderId(order.id)}
                          >
                            Return Order
                          </Button>
                        ) : (
                          <span className="text-xs text-red-500 font-medium">Return window closed</span>
                        )}
                        {isReturnEligible(order) && (
                          <span className="text-xs text-gray-500">{getReturnExpiryMessage(order)}</span>
                        )}
                      </div>
                    )}
                  </div>
                </div>
                {/* Admin message to customer */}
                {order.admin_message && (
                  <div className={`mt-4 p-4 rounded-lg border ${
                    order.order_status?.toLowerCase() === 'return_rejected' 
                      ? 'bg-red-50 border-red-200' 
                      : 'bg-indigo-50 border-indigo-200'
                  }`}>
                    <p className={`text-xs font-semibold uppercase tracking-wider mb-1 ${
                      order.order_status?.toLowerCase() === 'return_rejected'
                        ? 'text-red-600'
                        : 'text-indigo-600'
                    }`}>
                      {order.order_status?.toLowerCase() === 'return_rejected' ? 'Return Rejected' : 'Message from DurgaShakti Foils'}
                    </p>
                    <p className="text-sm text-gray-700 leading-relaxed">{order.admin_message}</p>
                  </div>
                )}
              </motion.div>
            ))}
          </div>
        )}
      </div>

      {returnOrderId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-lg p-6 w-full max-w-md relative"
          >
            <button
              onClick={() => {
                setReturnOrderId(null);
                setReturnReason('');
                setReturnImage(null);
              }}
              className="absolute top-4 right-4 text-gray-500 hover:text-black"
            >
              <X className="w-5 h-5" />
            </button>
            <h2 className="text-xl font-bold mb-4" style={{ fontFamily: 'Manrope' }}>
              Return Order
            </h2>
            <form onSubmit={handleReturnSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Reason for Return
                </label>
                <textarea
                  required
                  className="w-full border border-gray-300 rounded-md p-2 text-sm"
                  rows="4"
                  placeholder="Please describe why you are returning this item..."
                  value={returnReason}
                  onChange={(e) => setReturnReason(e.target.value)}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Upload Picture (Optional)
                </label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => setReturnImage(e.target.files[0])}
                  className="w-full text-sm"
                />
              </div>
              <Button type="submit" disabled={isSubmitting} className="w-full">
                {isSubmitting ? 'Submitting...' : 'Submit Return Request'}
              </Button>
            </form>
          </motion.div>
        </div>
      )}
    </div>
  );
};

export default Dashboard;