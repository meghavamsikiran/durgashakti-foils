import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { useAuth } from '../contexts/AuthContext';
import { useCart } from '../contexts/CartContext';
import productService from '../services/product.service';
import addressService from '../services/address.service';
import orderService from '../services/order.service';
import paymentService from '../services/payment.service';

const RAZORPAY_KEY_ID = process.env.REACT_APP_RAZORPAY_KEY_ID || 'rzp_test_SlmLztmM54CPAn';

export const useCheckout = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { cart, clearCart } = useCart();
  
  // Prevent duplicate order submissions
  const orderInProgress = useRef(false);

  const [products, setProducts] = useState({});
  const [loading, setLoading] = useState(false);
  const [checkoutStep, setCheckoutStep] = useState('shipping');
  const [paymentMethod, setPaymentMethod] = useState('upi');
  const [savedAddresses, setSavedAddresses] = useState([]);
  const [selectedAddressId, setSelectedAddressId] = useState(null);
  const [shippingInfo, setShippingInfo] = useState({
    full_name: user?.full_name || '',
    phone: user?.phone || '',
    address_line1: '',
    address_line2: '',
    city: '',
    state: '',
    pincode: ''
  });

  const fetchAddresses = useCallback(async () => {
    try {
      const data = await addressService.getAddresses();
      setSavedAddresses(data);
      if (data.length > 0) {
        const primary = data.find(a => a.is_default) || data[0];
        setSelectedAddressId(primary.id);
        setShippingInfo({
          full_name: primary.full_name,
          phone: primary.phone,
          address_line1: primary.address_line1,
          address_line2: primary.address_line2 || '',
          city: primary.city,
          state: primary.state,
          pincode: primary.pincode
        });
      }
    } catch (err) {
      // Silent — addresses are optional at this point
    }
  }, []);

  const fetchProducts = useCallback(async () => {
    try {
      const data = await productService.getProducts();
      const productMap = {};
      (data.items || []).forEach(p => {
        productMap[p.id] = p;
      });
      setProducts(productMap);
    } catch (error) {
      toast.error('Failed to load product information');
    }
  }, []);

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
    fetchAddresses();
  }, [user, cart.items, navigate, fetchProducts, fetchAddresses]);

  const calculateTotal = useCallback(() => {
    return cart.items?.reduce((total, item) => {
      const product = products[item.product_id];
      const effectivePrice = product ? (product.discount_price || product.price) : 0;
      return total + (effectivePrice * item.quantity);
    }, 0) || 0;
  }, [cart.items, products]);

  const handleSelectAddress = (addr) => {
    setSelectedAddressId(addr.id);
    setShippingInfo({
      full_name: addr.full_name,
      phone: addr.phone,
      address_line1: addr.address_line1,
      address_line2: addr.address_line2 || '',
      city: addr.city,
      state: addr.state,
      pincode: addr.pincode
    });
  };

  const validateShipping = async () => {
    const { full_name, phone, address_line1, city, state, pincode } = shippingInfo;
    if (!full_name?.trim()) {
      toast.error("Full name is required");
      return false;
    }
    if (!phone?.trim()) {
      toast.error("Phone number is required");
      return false;
    }
    if (!address_line1?.trim()) {
      toast.error("Address is required");
      return false;
    }
    if (!city?.trim()) {
      toast.error("City is required");
      return false;
    }
    if (!state?.trim()) {
      toast.error("State is required");
      return false;
    }
    if (!pincode || pincode.length !== 6 || !/^\d{6}$/.test(pincode)) {
      toast.error("Please enter a valid 6-digit pincode");
      return false;
    }
    return true;
  };

  const handleRazorpayPayment = (orderId) => {
    return new Promise(async (resolve, reject) => {
      try {
        const response = await paymentService.createRazorpayOrder(orderId);
        const { razorpay_order_id, amount, currency, key_id } = response;

        const options = {
          key: key_id || RAZORPAY_KEY_ID,
          amount: amount,
          currency: currency || 'INR',
          name: 'DurgaShakti Foils',
          description: 'Secure Payment',
          order_id: razorpay_order_id,
          handler: async (paymentResponse) => {
            try {
              await paymentService.verifyRazorpayPayment({
                order_id: orderId,
                razorpay_order_id: paymentResponse.razorpay_order_id,
                razorpay_payment_id: paymentResponse.razorpay_payment_id,
                razorpay_signature: paymentResponse.razorpay_signature
              });
              // Clear cart BEFORE navigating to prevent race condition
              try { await clearCart(); } catch {}
              toast.success('Payment successful! Order confirmed.');
              const orderData = await orderService.getOrder(orderId);
              navigate(`/order-success?order_id=${orderId}&order_number=${orderData.order_number}`);
              resolve();
            } catch (err) {
              toast.error('Payment verification failed. Check your dashboard.');
              reject(err);
            }
          },
          prefill: {
            name: shippingInfo.full_name,
            email: user?.email || '',
            contact: shippingInfo.phone
          },
          theme: { color: '#1a56db' },
          modal: { ondismiss: () => reject(new Error('payment_cancelled')) }
        };

        if (!window.Razorpay) {
          toast.error('Payment gateway not loaded. Refresh and try again.');
          reject(new Error('Razorpay SDK not loaded'));
          return;
        }

        const rzp = new window.Razorpay(options);
        rzp.on('payment.failed', (response) => {
          toast.error('Payment failed. You can retry from your dashboard.');
          reject(new Error('payment_failed'));
        });
        rzp.open();
      } catch (error) {
        reject(error);
      }
    });
  };

  const handlePlaceOrder = async () => {
    // Prevent duplicate submissions
    if (orderInProgress.current) return;
    orderInProgress.current = true;
    setLoading(true);

    try {
      const orderItems = cart.items.map(item => ({
        product_id: item.product_id,
        product_name: products[item.product_id]?.name || '',
        quantity: item.quantity,
        price: products[item.product_id]?.discount_price || products[item.product_id]?.price || 0
      }));

      const orderData = {
        items: orderItems,
        total_amount: calculateTotal(),
        payment_method: paymentMethod === 'cod' ? 'cod' : 'razorpay',
        shipping_address: shippingInfo,
        idempotency_key: `order_${user.id}_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`
      };

      const response = await orderService.createOrder(orderData);
      const orderId = response.id;

      if (paymentMethod === 'cod') {
        await paymentService.confirmCOD(orderId);
        // Clear cart BEFORE navigating
        try { await clearCart(); } catch {}
        toast.success('Order placed successfully!');
        navigate(`/order-success?order_id=${orderId}&order_number=${response.order_number}`);
      } else {
        await handleRazorpayPayment(orderId);
        // Cart already cleared inside handleRazorpayPayment handler
      }
    } catch (error) {
      if (error.message === 'payment_failed') {
        navigate('/dashboard');
      } else if (error.message === 'payment_cancelled') {
        toast.info('Payment cancelled. Your order is saved in your dashboard.');
        navigate('/dashboard');
      } else {
        // Error already toasted by interceptor
      }
    } finally {
      setLoading(false);
      orderInProgress.current = false;
    }
  };

  return {
    products,
    loading,
    checkoutStep,
    setCheckoutStep,
    paymentMethod,
    setPaymentMethod,
    savedAddresses,
    selectedAddressId,
    shippingInfo,
    setShippingInfo,
    handleSelectAddress,
    validateShipping,
    handlePlaceOrder,
    total: calculateTotal()
  };
};
