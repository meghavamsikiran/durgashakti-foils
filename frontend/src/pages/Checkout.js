import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { CreditCard, Truck, Shield, ChevronRight, Landmark, QrCode } from 'lucide-react';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { useCart } from '../contexts/CartContext';
import { useAuth } from '../contexts/AuthContext';
import { toast } from 'sonner';
import api from '../utils/api';

const RAZORPAY_KEY_ID = process.env.REACT_APP_RAZORPAY_KEY_ID || 'rzp_test_SlmLztmM54CPAn';

const Checkout = () => {
  const navigate = useNavigate();
  const { cart, clearCart } = useCart();
  const { user } = useAuth();
  const [products, setProducts] = useState({});
  const [loading, setLoading] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState('upi');

  const [shippingInfo, setShippingInfo] = useState({
    full_name: user?.full_name || '',
    phone: user?.phone || '',
    address_line1: '',
    address_line2: '',
    city: '',
    state: '',
    pincode: ''
  });

  useEffect(() => {
    if (!user) {
      navigate('/login');
      return;
    }
    if (!cart.items || cart.items.length === 0) {
      navigate('/cart');
      return;
    }
    fetchProducts();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const fetchProducts = async () => {
    try {
      const response = await api.getProducts();
      const productMap = {};
      (response.data.items || []).forEach(p => {
        productMap[p.id] = p;
      });
      setProducts(productMap);
    } catch (error) {
      console.error('Error fetching products:', error);
    }
  };

  const calculateTotal = () => {
    return cart.items?.reduce((total, item) => {
      const product = products[item.product_id];
      const effectivePrice = product ? (product.discount_price || product.price) : 0;
      return total + (effectivePrice * item.quantity);
    }, 0) || 0;
  };

  const handleInputChange = (e) => {
    setShippingInfo({
      ...shippingInfo,
      [e.target.name]: e.target.value
    });
  };

  const handlePlaceOrder = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const orderItems = cart.items.map(item => ({
        product_id: item.product_id,
        product_name: products[item.product_id]?.name || '',
        quantity: item.quantity,
        price: products[item.product_id]?.discount_price || products[item.product_id]?.price || 0
      }));

      // Generate idempotency key to prevent duplicate orders
      const idempotencyKey = `order_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;

      const orderData = {
        items: orderItems,
        total_amount: calculateTotal(),
        payment_method: paymentMethod === 'cod' ? 'cod' : 'razorpay',
        shipping_address: shippingInfo,
        idempotency_key: idempotencyKey
      };

      const response = await api.createOrder(orderData);
      const orderId = response.data.id;

      if (paymentMethod === 'cod') {
        await api.confirmCOD(orderId);
        if (clearCart) clearCart(); // Clear cart after COD confirmation
        toast.success('Order placed successfully!');
        navigate(`/order-success?order_id=${orderId}`);
      } else {
        // UPI, Card, Net Banking — all go through Razorpay
        await handleRazorpayPayment(orderId, paymentMethod);
        // Cart is cleared server-side after payment verification
        if (clearCart) clearCart();
      }
    } catch (error) {
      if (error.message === 'payment_failed') {
        toast.error('Payment failed. You can retry payment from your Dashboard.');
        navigate('/dashboard');
      } else if (error.message === 'payment_cancelled') {
        toast.info('Payment cancelled. Your order is saved, you can complete payment from your Dashboard.');
        navigate('/dashboard');
      } else {
        toast.error(error.response?.data?.detail || 'Failed to place order. Please try again.');
      }
      setLoading(false);
    }
  };

  const handleRazorpayPayment = (orderId, method) => {
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
          image: '', // Add your logo URL here if available
          order_id: razorpay_order_id,
          handler: async (paymentResponse) => {
            try {
              await api.verifyRazorpayPayment({
                order_id: orderId,
                razorpay_order_id: paymentResponse.razorpay_order_id,
                razorpay_payment_id: paymentResponse.razorpay_payment_id,
                razorpay_signature: paymentResponse.razorpay_signature
              });
              toast.success('Payment successful! Order confirmed.');
              navigate(`/order-success?order_id=${orderId}`);
              resolve();
            } catch (err) {
              toast.error('Payment verification failed. Please contact support.');
              setLoading(false);
              reject(err);
            }
          },
          prefill: {
            name: shippingInfo.full_name,
            email: user?.email || '',
            contact: shippingInfo.phone
          },
          notes: {
            order_id: orderId
          },
          theme: {
            color: '#1a56db'
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

        if (!window.Razorpay) {
          toast.error('Payment gateway is not loaded. Please refresh and try again.');
          setLoading(false);
          reject(new Error('Razorpay SDK not loaded'));
          return;
        }

        const rzp = new window.Razorpay(options);
        rzp.on('payment.failed', (response) => {
          reject(new Error('payment_failed'));
        });
        rzp.open();
      } catch (error) {
        toast.error(error.response?.data?.detail || 'Failed to initiate payment. Please try again.');
        setLoading(false);
        reject(error);
      }
    });
  };

  const total = calculateTotal();

  const paymentMethods = [
    {
      id: 'upi',
      name: 'UPI',
      icon: QrCode,
      description: 'Pay via Google Pay, PhonePe, Paytm, or any UPI app'
    },
    {
      id: 'card',
      name: 'Credit / Debit Card',
      icon: CreditCard,
      description: 'Visa, Mastercard, RuPay & more — secured by Razorpay'
    },
    {
      id: 'netbanking',
      name: 'Net Banking',
      icon: Landmark,
      description: 'All major banks supported — SBI, HDFC, ICICI, Axis & more'
    },
    {
      id: 'cod',
      name: 'Cash on Delivery',
      icon: Truck,
      description: 'Pay with cash when your order arrives'
    }
  ];

  return (
    <div className="min-h-screen py-12" data-testid="checkout-page">
      <div className="max-w-7xl mx-auto px-6 md:px-12 lg:px-24">
        <h1 className="text-4xl md:text-5xl font-bold tracking-tight mb-8" style={{ fontFamily: 'Manrope' }} data-testid="checkout-title">
          Checkout
        </h1>

        <form onSubmit={handlePlaceOrder}>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2 space-y-8">

              {/* Shipping Information */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-card border border-border/50 rounded-sm p-6"
              >
                <h2 className="text-2xl font-bold mb-6" style={{ fontFamily: 'Manrope' }}>
                  Shipping Information
                </h2>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="full_name">Full Name *</Label>
                    <Input
                      id="full_name"
                      name="full_name"
                      value={shippingInfo.full_name}
                      onChange={handleInputChange}
                      required
                      placeholder="Enter your full name"
                      data-testid="shipping-fullname-input"
                    />
                  </div>
                  <div>
                    <Label htmlFor="phone">Phone Number *</Label>
                    <Input
                      id="phone"
                      name="phone"
                      type="tel"
                      value={shippingInfo.phone}
                      onChange={handleInputChange}
                      required
                      placeholder="10-digit mobile number"
                      data-testid="shipping-phone-input"
                    />
                  </div>
                  <div className="md:col-span-2">
                    <Label htmlFor="address_line1">Address Line 1 *</Label>
                    <Input
                      id="address_line1"
                      name="address_line1"
                      value={shippingInfo.address_line1}
                      onChange={handleInputChange}
                      required
                      placeholder="House / Flat No., Street, Area"
                      data-testid="shipping-address1-input"
                    />
                  </div>
                  <div className="md:col-span-2">
                    <Label htmlFor="address_line2">Address Line 2</Label>
                    <Input
                      id="address_line2"
                      name="address_line2"
                      value={shippingInfo.address_line2}
                      onChange={handleInputChange}
                      placeholder="Landmark (optional)"
                      data-testid="shipping-address2-input"
                    />
                  </div>
                  <div>
                    <Label htmlFor="city">City *</Label>
                    <Input
                      id="city"
                      name="city"
                      value={shippingInfo.city}
                      onChange={handleInputChange}
                      required
                      placeholder="City"
                      data-testid="shipping-city-input"
                    />
                  </div>
                  <div>
                    <Label htmlFor="state">State *</Label>
                    <Input
                      id="state"
                      name="state"
                      value={shippingInfo.state}
                      onChange={handleInputChange}
                      required
                      placeholder="State"
                      data-testid="shipping-state-input"
                    />
                  </div>
                  <div>
                    <Label htmlFor="pincode">Pincode *</Label>
                    <Input
                      id="pincode"
                      name="pincode"
                      value={shippingInfo.pincode}
                      onChange={handleInputChange}
                      required
                      placeholder="6-digit pincode"
                      pattern="[0-9]{6}"
                      title="Please enter a valid 6-digit pincode"
                      data-testid="shipping-pincode-input"
                    />
                  </div>
                </div>
              </motion.div>

              {/* Payment Method */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="bg-card border border-border/50 rounded-sm p-6"
              >
                <h2 className="text-2xl font-bold mb-6" style={{ fontFamily: 'Manrope' }}>
                  Payment Method
                </h2>

                <div className="space-y-3">
                  {paymentMethods.map((method) => (
                    <label
                      key={method.id}
                      className={`flex items-center gap-4 p-4 border rounded-sm cursor-pointer transition-all ${
                        paymentMethod === method.id
                          ? 'border-primary bg-primary/5'
                          : 'border-border/50 hover:border-primary/50'
                      }`}
                      data-testid={`payment-method-${method.id}`}
                    >
                      <input
                        type="radio"
                        name="payment_method"
                        value={method.id}
                        checked={paymentMethod === method.id}
                        onChange={(e) => setPaymentMethod(e.target.value)}
                        className="w-4 h-4 text-primary"
                      />
                      <div className={`p-2 rounded-sm ${paymentMethod === method.id ? 'bg-primary/10' : 'bg-secondary/50'}`}>
                        <method.icon className={`w-5 h-5 ${paymentMethod === method.id ? 'text-primary' : 'text-muted-foreground'}`} />
                      </div>
                      <div className="flex-1">
                        <p className="font-semibold">{method.name}</p>
                        <p className="text-sm text-muted-foreground">{method.description}</p>
                      </div>
                      {paymentMethod === method.id && (
                        <ChevronRight className="w-4 h-4 text-primary" />
                      )}
                    </label>
                  ))}
                </div>

                {paymentMethod !== 'cod' && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    className="mt-4 p-4 bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 rounded-sm flex items-start gap-3"
                  >
                    <Shield className="w-5 h-5 text-blue-600 dark:text-blue-400 mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="text-sm font-medium text-blue-800 dark:text-blue-300">Secured by Razorpay</p>
                      <p className="text-xs text-blue-600 dark:text-blue-400 mt-0.5">
                        {paymentMethod === 'upi' && 'You will be able to pay using any UPI app. QR code scanning is available in live mode.'}
                        {paymentMethod === 'card' && 'Enter your card details securely. All major cards are accepted.'}
                        {paymentMethod === 'netbanking' && 'You will be redirected to your bank\'s secure login page.'}
                      </p>
                    </div>
                  </motion.div>
                )}
              </motion.div>
            </div>

            {/* Order Summary */}
            <div className="lg:col-span-1">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-secondary/30 border border-border/50 rounded-sm p-6 sticky top-24"
              >
                <h2 className="text-2xl font-bold mb-6" style={{ fontFamily: 'Manrope' }}>
                  Order Summary
                </h2>

                <div className="space-y-4 mb-6">
                  {cart.items?.map((item) => {
                    const product = products[item.product_id];
                    if (!product) return null;
                    return (
                      <div key={item.product_id} className="flex justify-between text-sm">
                        <span className="text-muted-foreground">
                          {product.name} × {item.quantity}
                        </span>
                        <span className="font-semibold">₹{(product.price * item.quantity).toFixed(2)}</span>
                      </div>
                    );
                  })}
                </div>

                <div className="space-y-3 mb-6 pt-4 border-t border-border/50">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Subtotal</span>
                    <span className="font-semibold" data-testid="checkout-subtotal">₹{total.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Shipping</span>
                    <span className="font-semibold text-green-600">FREE</span>
                  </div>
                  <div className="border-t border-border/50 pt-3 flex justify-between">
                    <span className="text-lg font-semibold">Total</span>
                    <span className="text-2xl font-bold" style={{ fontFamily: 'Manrope' }} data-testid="checkout-total">
                      ₹{total.toFixed(2)}
                    </span>
                  </div>
                </div>

                <Button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-primary text-primary-foreground hover:bg-primary/90 h-12 rounded-sm font-semibold text-base"
                  data-testid="place-order-button"
                >
                  {loading
                    ? 'Processing...'
                    : paymentMethod === 'cod'
                    ? 'Place Order — Cash on Delivery'
                    : `Pay ₹${total.toFixed(2)} — ${paymentMethod === 'upi' ? 'UPI' : paymentMethod === 'card' ? 'Card' : 'Net Banking'}`}
                </Button>

                <p className="text-xs text-muted-foreground text-center mt-3 flex items-center justify-center gap-1">
                  <Shield className="w-3 h-3" />
                  Secure checkout. Your data is protected.
                </p>
              </motion.div>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};

export default Checkout;
