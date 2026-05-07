import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { CreditCard, Truck, Shield, ChevronRight, Landmark, QrCode, ArrowLeft } from 'lucide-react';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { useCart } from '../contexts/CartContext';
import { useAuth } from '../contexts/AuthContext';
import { toast } from 'sonner';
import api from '../utils/api';
import PhoneInput from 'react-phone-number-input';
import 'react-phone-number-input/style.css';
import { ShoppingCart, CheckCircle2, MapPin, CreditCard as CreditCardIcon, ArrowRight, Loader2 } from 'lucide-react';

const RAZORPAY_KEY_ID = process.env.REACT_APP_RAZORPAY_KEY_ID;

const INDIAN_STATES = [
  "Andhra Pradesh", "Arunachal Pradesh", "Assam", "Bihar", "Chhattisgarh", "Goa", "Gujarat", "Haryana", 
  "Himachal Pradesh", "Jharkhand", "Karnataka", "Kerala", "Madhya Pradesh", "Maharashtra", "Manipur", 
  "Meghalaya", "Mizoram", "Nagaland", "Odisha", "Punjab", "Rajasthan", "Sikkim", "Tamil Nadu", 
  "Telangana", "Tripura", "Uttar Pradesh", "Uttarakhand", "West Bengal", "Andaman and Nicobar Islands", 
  "Chandigarh", "Dadra and Nagar Haveli and Daman and Diu", "Delhi", "Jammu and Kashmir", "Ladakh", "Lakshadweep", "Puducherry"
];

const Checkout = () => {
  const navigate = useNavigate();
  const { cart, clearCart } = useCart();
  const { user } = useAuth();
  const [products, setProducts] = useState({});
  const [loading, setLoading] = useState(false);
  const [checkingPincode, setCheckingPincode] = useState(false);
  const [checkoutStep, setCheckoutStep] = useState('shipping'); // 'shipping' | 'payment'
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
    const { name, value } = e.target;
    setShippingInfo(prev => ({ ...prev, [name]: value }));
  };

  const handlePincodeChange = async (e) => {
    const pin = e.target.value.replace(/\D/g, '').slice(0, 6);
    setShippingInfo(prev => ({ ...prev, pincode: pin }));

    if (pin.length === 6) {
      setCheckingPincode(true);
      try {
        const res = await fetch(`https://api.postalpincode.in/pincode/${pin}`);
        const data = await res.json();
        if (data[0].Status === "Success") {
          const postOffice = data[0].PostOffice[0];
          setShippingInfo(prev => ({
            ...prev,
            state: postOffice.State,
            city: postOffice.District || postOffice.Block
          }));
          toast.success(`Location detected: ${postOffice.District}, ${postOffice.State}`);
        } else {
          toast.error("Invalid Pincode");
        }
      } catch (err) {
        console.error("Pincode API failed:", err);
      } finally {
        setCheckingPincode(false);
      }
    }
  };

  const validateShipping = () => {
    const { full_name, phone, address_line1, city, state, pincode } = shippingInfo;
    if (!full_name || !phone || !address_line1 || !city || !state || pincode.length !== 6) {
      toast.error("Please fill all required fields correctly");
      return false;
    }
    return true;
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
        navigate(`/order-success?order_id=${orderId}&order_number=${response.data.order_number}`);
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
              // We need the order number here too
              const orderRes = await api.getOrder(orderId);
              navigate(`/order-success?order_id=${orderId}&order_number=${orderRes.data.order_number}`);
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
    <div className="min-h-screen bg-slate-50/50 pb-32 lg:pb-12">
      {/* Step Progress Bar */}
      <div className="bg-white border-b sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
           <div className="flex items-center gap-2 cursor-pointer" onClick={() => navigate('/cart')}>
              <ArrowLeft className="w-5 h-5" />
              <span className="font-bold text-lg">Checkout</span>
           </div>
           <div className="flex items-center gap-8">
              <div className={`flex items-center gap-2 text-sm font-bold ${checkoutStep === 'shipping' ? 'text-indigo-600' : 'text-slate-400'}`}>
                 <div className={`w-6 h-6 rounded-full flex items-center justify-center border-2 ${checkoutStep === 'shipping' ? 'border-indigo-600 bg-indigo-600 text-white' : 'border-slate-300'}`}>1</div>
                 <span className="hidden md:inline">Address</span>
              </div>
              <div className={`flex items-center gap-2 text-sm font-bold ${checkoutStep === 'payment' ? 'text-indigo-600' : 'text-slate-400'}`}>
                 <div className={`w-6 h-6 rounded-full flex items-center justify-center border-2 ${checkoutStep === 'payment' ? 'border-indigo-600 bg-indigo-600 text-white' : 'border-slate-300'}`}>2</div>
                 <span className="hidden md:inline">Payment</span>
              </div>
           </div>
           <div className="hidden md:block">
              <Shield className="w-5 h-5 text-emerald-500" />
           </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 mt-8">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">
            
            <div className="lg:col-span-8 space-y-8">
              <AnimatePresence mode="wait">
                {checkoutStep === 'shipping' ? (
                  <motion.div
                    key="shipping"
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 20 }}
                    className="bg-white rounded-[2rem] p-8 shadow-sm border border-slate-100"
                  >
                    <h2 className="text-2xl font-black text-slate-900 mb-8 uppercase tracking-tighter">Shipping Details</h2>
                    
                    <div className="space-y-6">
                       <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                          <div className="space-y-2">
                             <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Full Name</Label>
                             <Input name="full_name" value={shippingInfo.full_name} onChange={handleInputChange} placeholder="e.g. Rahul Sharma" className="rounded-xl h-14" />
                          </div>
                          <div className="space-y-2">
                             <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Mobile Number</Label>
                             <PhoneInput
                               international
                               defaultCountry="IN"
                               value={shippingInfo.phone}
                               onChange={val => setShippingInfo(prev => ({ ...prev, phone: val || '' }))}
                               displayInitialValueAsLocalNumber={false}
                               className="flex h-14 w-full rounded-xl border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                             />
                          </div>
                       </div>

                       <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                          <div className="space-y-2">
                             <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Pincode</Label>
                             <div className="relative">
                                <Input name="pincode" value={shippingInfo.pincode} onChange={handlePincodeChange} placeholder="6 digits" className="rounded-xl h-14" maxLength={6} />
                                {checkingPincode && <Loader2 className="absolute right-4 top-4 w-5 h-5 animate-spin text-indigo-600" />}
                             </div>
                          </div>
                          <div className="space-y-2">
                             <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">State</Label>
                             <select 
                                name="state"
                                value={shippingInfo.state} 
                                onChange={handleInputChange}
                                className="w-full rounded-xl h-14 bg-white border border-input px-4 text-sm font-medium focus:ring-2 focus:ring-indigo-500 outline-none appearance-none cursor-pointer"
                             >
                                <option value="">Select State</option>
                                {INDIAN_STATES.map(state => (
                                   <option key={state} value={state}>{state}</option>
                                ))}
                             </select>
                          </div>
                          <div className="space-y-2">
                             <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">City / District</Label>
                             <Input name="city" value={shippingInfo.city} onChange={handleInputChange} placeholder="Enter City" className="rounded-xl h-14" />
                          </div>
                       </div>

                       <div className="space-y-2">
                          <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Flat, House no., Building, Apartment</Label>
                          <Input name="address_line1" value={shippingInfo.address_line1} onChange={handleInputChange} className="rounded-xl h-14" />
                       </div>

                       <div className="space-y-2">
                          <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Area, Street, Landmark (Optional)</Label>
                          <Input name="address_line2" value={shippingInfo.address_line2} onChange={handleInputChange} className="rounded-xl h-14" />
                       </div>

                       <div className="pt-4">
                          <Button onClick={() => validateShipping() && setCheckoutStep('payment')} className="w-full h-16 rounded-2xl text-lg font-black uppercase tracking-widest shadow-xl shadow-indigo-100">
                             Continue to Payment <ArrowRight className="ml-2 w-5 h-5" />
                          </Button>
                       </div>
                    </div>
                  </motion.div>
                ) : (
                  <motion.div
                    key="payment"
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    className="bg-white rounded-[2.5rem] p-8 shadow-sm border border-slate-100"
                  >
                    <div className="flex items-center justify-between mb-8">
                       <h2 className="text-2xl font-black text-slate-900 uppercase tracking-tighter">Payment Selection</h2>
                       <Button variant="ghost" onClick={() => setCheckoutStep('shipping')} className="text-indigo-600 font-bold">Edit Address</Button>
                    </div>

                    <div className="space-y-4">
                      {paymentMethods.map((method) => (
                        <label
                          key={method.id}
                          className={`flex items-center gap-4 p-6 border-2 rounded-3xl cursor-pointer transition-all ${
                            paymentMethod === method.id
                              ? 'border-indigo-600 bg-indigo-50/30'
                              : 'border-slate-100 hover:border-slate-200 bg-slate-50/50'
                          }`}
                        >
                          <input
                            type="radio"
                            name="payment_method"
                            value={method.id}
                            checked={paymentMethod === method.id}
                            onChange={(e) => setPaymentMethod(e.target.value)}
                            className="w-5 h-5 text-indigo-600 border-slate-300 focus:ring-indigo-600"
                          />
                          <div className={`p-3 rounded-2xl ${paymentMethod === method.id ? 'bg-indigo-600 text-white' : 'bg-white text-slate-400 border border-slate-200'}`}>
                            <method.icon className="w-6 h-6" />
                          </div>
                          <div className="flex-1">
                            <p className="font-black text-slate-900 uppercase tracking-tight">{method.name}</p>
                            <p className="text-xs text-slate-500 font-medium mt-1">{method.description}</p>
                          </div>
                        </label>
                      ))}
                    </div>

                    <div className="mt-12 p-6 bg-slate-900 rounded-[2rem] text-white">
                       <div className="flex items-center gap-3 mb-4">
                          <Shield className="w-6 h-6 text-indigo-400" />
                          <span className="font-bold uppercase tracking-widest text-xs">Secure Transaction</span>
                       </div>
                       <p className="text-sm text-slate-400 leading-relaxed">Your payment information is encrypted and processed securely by Razorpay. We do not store your full card details.</p>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            <div className="lg:col-span-4">
               <div className="sticky top-24 space-y-8">
                  <div className="bg-white rounded-[2.5rem] p-8 border border-slate-100 shadow-sm">
                     <h3 className="text-xl font-black text-slate-900 mb-6 uppercase tracking-tighter">Order Summary</h3>
                     <div className="space-y-4 mb-8">
                        {cart.items?.map((item) => {
                          const product = products[item.product_id];
                          if (!product) return null;
                          return (
                            <div key={item.product_id} className="flex justify-between items-center gap-4">
                               <div className="flex items-center gap-3">
                                  <div className="w-12 h-12 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-center font-bold text-xs">
                                     {item.quantity}x
                                  </div>
                                  <div className="text-sm font-bold text-slate-700 truncate max-w-[120px]">{product.name}</div>
                               </div>
                               <div className="font-black text-slate-900">₹{(product.price * item.quantity).toLocaleString()}</div>
                            </div>
                          );
                        })}
                     </div>

                     <div className="space-y-4 pt-6 border-t border-slate-100">
                        <div className="flex justify-between text-sm">
                           <span className="text-slate-500 font-bold uppercase tracking-widest text-[10px]">Subtotal</span>
                           <span className="font-black text-slate-900">₹{total.toLocaleString()}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                           <span className="text-slate-500 font-bold uppercase tracking-widest text-[10px]">Shipping</span>
                           <span className="font-black text-emerald-500 uppercase tracking-widest text-[10px]">Free</span>
                        </div>
                        <div className="pt-4 flex justify-between items-end">
                           <span className="text-slate-900 font-black uppercase tracking-tighter">Total Amount</span>
                           <div className="text-3xl font-black text-indigo-600 tracking-tighter">₹{total.toLocaleString()}</div>
                        </div>
                     </div>

                     {checkoutStep === 'payment' && (
                        <Button 
                          onClick={handlePlaceOrder}
                          disabled={loading}
                          className="w-full h-16 rounded-2xl mt-8 text-lg font-black uppercase tracking-widest shadow-2xl shadow-indigo-100"
                        >
                          {loading ? <Loader2 className="animate-spin w-6 h-6" /> : `Pay ₹${total.toLocaleString()}`}
                        </Button>
                     )}
                  </div>
               </div>
            </div>
          </div>
      </div>

      {/* Mobile Sticky Footer */}
      <div className="lg:hidden fixed bottom-0 left-0 right-0 bg-white border-t p-4 z-50 flex items-center justify-between gap-4 shadow-[0_-10px_30px_rgba(0,0,0,0.05)]">
          <div className="flex flex-col">
             <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Total Amount</span>
             <span className="text-xl font-black text-indigo-600">₹{total.toLocaleString()}</span>
          </div>
          {checkoutStep === 'shipping' ? (
             <Button onClick={() => validateShipping() && setCheckoutStep('payment')} className="rounded-xl px-8 h-12 font-black uppercase tracking-widest">Next Step</Button>
          ) : (
             <Button onClick={handlePlaceOrder} disabled={loading} className="rounded-xl px-8 h-12 font-black uppercase tracking-widest">
                {loading ? <Loader2 className="animate-spin w-5 h-5" /> : 'Pay Now'}
             </Button>
          )}
      </div>
    </div>
  );
};

export default Checkout;
