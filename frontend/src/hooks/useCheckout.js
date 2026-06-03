import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { useAuth } from '../contexts/AuthContext';
import { useCart } from '../contexts/CartContext';
import productService from '../services/product.service';
import addressService from '../services/address.service';
import orderService from '../services/order.service';
import paymentService from '../services/payment.service';
import settingsService from '../services/settings.service';
import couponService from '../services/coupon.service';
import { calculateCheckoutPricing, normalizeShippingSettings } from '../utils/checkoutPricing';
import { getProductPricing } from '../utils/productPricing';

const RAZORPAY_KEY_ID = process.env.REACT_APP_RAZORPAY_KEY_ID;

const loadRazorpaySdk = () => new Promise((resolve, reject) => {
  if (window.Razorpay) {
    resolve();
    return;
  }
  const existingScript = document.querySelector('script[src="https://checkout.razorpay.com/v1/checkout.js"]');
  if (existingScript) {
    existingScript.addEventListener('load', resolve, { once: true });
    existingScript.addEventListener('error', reject, { once: true });
    return;
  }
  const script = document.createElement('script');
  script.src = 'https://checkout.razorpay.com/v1/checkout.js';
  script.async = true;
  script.onload = resolve;
  script.onerror = reject;
  document.head.appendChild(script);
});

const getCustomerCouponError = (message) => {
  if (!message) return 'This coupon could not be applied. Please check the code and try again.';
  const lowerMessage = String(message).toLowerCase();
  if (lowerMessage.includes('already redeemed') || lowerMessage.includes('already used') || lowerMessage.includes('used this coupon')) {
    return 'You have already redeemed this coupon code on a past order.';
  }
  if (lowerMessage.includes('only one coupon can be used per customer') || lowerMessage.includes('only one coupon order')) {
    return 'You have already redeemed a coupon on a past order. Only one coupon order can be placed per account.';
  }
  if (lowerMessage.includes('stacking')) {
    return 'Only one coupon can be used per order. Remove the applied coupon before using another code.';
  }
  if (lowerMessage.includes('not found')) {
    return 'We could not find that coupon code. Please check the code and try again.';
  }
  if (lowerMessage.includes('inactive')) {
    return 'This coupon is not active right now.';
  }
  if (lowerMessage.includes('expired')) {
    return 'This coupon has expired.';
  }
  if (lowerMessage.includes('minimum cart value')) {
    return message.replace('Minimum cart value', 'Minimum order amount');
  }
  if (lowerMessage.includes('usage limit reached')) {
    return 'This coupon has reached its usage limit.';
  }
  if (lowerMessage.includes('coupon system is currently disabled')) {
    return 'Coupons are not available right now.';
  }
  return message;
};

export const useCheckout = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { cart, clearCart, cartReady } = useCart();
  
  // Prevent duplicate order submissions
  const orderInProgress = useRef(false);

  const [products, setProducts] = useState({});
  const [loading, setLoading] = useState(false);
  const [checkoutStep, setCheckoutStep] = useState('shipping');
  const [paymentMethod, setPaymentMethod] = useState('upi');
  const [codEnabled, setCodEnabled] = useState(true);
  const [shippingSettings, setShippingSettings] = useState(null);
  const [savedAddresses, setSavedAddresses] = useState([]);
  const [selectedAddressId, setSelectedAddressId] = useState(null);
  const [shippingInfo, setShippingInfo] = useState({
    label: 'Home',
    full_name: '',
    phone: '',
    alternate_phone: '',
    address_line1: '',
    address_line2: '',
    city: '',
    state: '',
    pincode: ''
  });

  const [appliedCoupons, setAppliedCoupons] = useState([]);
  const [availableLoyaltyCoupons, setAvailableLoyaltyCoupons] = useState([]);
  const [autoApplyCouponsDisabled, setAutoApplyCouponsDisabled] = useState(false);
  const [couponInput, setCouponInput] = useState('');
  const [validatingCoupon, setValidatingCoupon] = useState(false);

  const fetchAddresses = useCallback(async () => {
    try {
      const data = await addressService.getAddresses();
      setSavedAddresses(data);
      setSelectedAddressId(null);
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

  const fetchSettings = useCallback(async () => {
    try {
      const data = await settingsService.getPublicSettings();
      if (data && data.shipping_settings) {
        setShippingSettings(data.shipping_settings);
        const isCodActive = data.shipping_settings.codEnabled !== false && data.shipping_settings.codStatus === 'Active';
        setCodEnabled(isCodActive);
      } else {
        const codState = data.payment_settings?.cod_enabled !== false;
        setCodEnabled(codState);
      }
    } catch (err) {
      // Safe fallback
    }
  }, []);

  useEffect(() => {
    if (!user) {
      navigate('/login');
      return;
    }
    if (!cartReady) {
      return;
    }
    if (!cart.items || cart.items.length === 0) {
      navigate('/cart');
      return;
    }
    fetchProducts();
    fetchAddresses();
    fetchSettings();
  }, [user, cartReady, cart.items, navigate, fetchProducts, fetchAddresses, fetchSettings]);

  const calculateTotal = useCallback(() => {
    return cart.items?.reduce((total, item) => {
      const product = products[item.product_id] || item.product;
      const { displayPrice } = getProductPricing(product);
      return total + (displayPrice * item.quantity);
    }, 0) || 0;
  }, [cart.items, products]);

  useEffect(() => {
    if (!user || !cartReady || !cart.items?.length || Object.keys(products).length === 0 || appliedCoupons.length > 0) {
      return;
    }

    let active = true;
    const loadLoyaltyCoupons = async () => {
      try {
        const data = await couponService.getEligibleCoupons();
        if (!active) return;
        const subtotal = calculateTotal();
        const eligible = (data.coupons || []).filter(c => subtotal >= Number(c.min_cart_value || 0));
        setAvailableLoyaltyCoupons(eligible);

        if (!autoApplyCouponsDisabled && eligible.length > 0) {
          const bestCoupon = eligible[0];
          const res = await couponService.validateCoupons([bestCoupon.code], subtotal);
          if (active && res.valid && res.applied_coupons?.length) {
            setAppliedCoupons(res.applied_coupons);
            toast.success(`Loyalty coupon "${bestCoupon.code}" applied automatically.`);
          }
        }
      } catch {
        if (active) setAvailableLoyaltyCoupons([]);
      }
    };

    loadLoyaltyCoupons();
    return () => {
      active = false;
    };
  }, [user, cartReady, cart.items, products, appliedCoupons.length, autoApplyCouponsDisabled, calculateTotal]);

  const handleSelectAddress = (addr) => {
    setSelectedAddressId(addr.id);
    setShippingInfo({
      label: addr.label || 'Home',
      full_name: addr.full_name,
      phone: addr.phone,
      alternate_phone: addr.alternate_phone || '',
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

  const handleRazorpayPayment = (orderId, orderNumber) => {
    return new Promise(async (resolve, reject) => {
      if (!window.Razorpay) {
        try {
          await loadRazorpaySdk();
        } catch {
          toast.error('Payment gateway could not load. Check your connection and try again.');
          reject(new Error('razorpay_sdk_missing'));
          return;
        }
      }

      let openingToastId;
      try {
        openingToastId = toast.loading('Opening secure payment...');
        const response = await paymentService.createRazorpayOrder(orderId);
        toast.dismiss(openingToastId);
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
              clearCart().catch(() => {});
              toast.success('Payment successful! Order confirmed.');
              navigate(`/order-success?order_id=${orderId}&order_number=${orderNumber || ''}`);
              resolve();
            } catch (err) {
              toast.error('Payment verification failed. Check your dashboard.');
              reject(err);
            }
          },
          prefill: {
            name: shippingInfo.full_name,
            email: '',
            contact: shippingInfo.phone
          },
          theme: { color: '#1a56db' },
          modal: { ondismiss: () => reject(new Error('payment_cancelled')) }
        };

        const rzp = new window.Razorpay(options);
        rzp.on('payment.failed', (response) => {
          toast.error('Payment failed. You can retry from your dashboard.');
          reject(new Error('payment_failed'));
        });
        rzp.open();
      } catch (error) {
        if (openingToastId) toast.dismiss(openingToastId);
        reject(error);
      }
    });
  };

  const handleApplyCoupon = async (codeToApply) => {
    if (!codeToApply?.trim()) {
      toast.error('Please enter a coupon code.');
      return;
    }
    const cleanCode = codeToApply.trim().toUpperCase();
    
    if (appliedCoupons.some(c => c.code.toUpperCase() === cleanCode)) {
      toast.error('This coupon is already applied.');
      return;
    }
    
    setValidatingCoupon(true);
    try {
      const subtotal = calculateTotal();
      const currentCodes = [...appliedCoupons.map(c => c.code), cleanCode];
      const res = await couponService.validateCoupons(currentCodes, subtotal);
      
      if (res.errors && res.errors[cleanCode]) {
        toast.error(getCustomerCouponError(res.errors[cleanCode]));
        return;
      }

      if (res.valid) {
        setAppliedCoupons(res.applied_coupons || []);
        setAutoApplyCouponsDisabled(false);
        setCouponInput('');
        toast.success(`Coupon "${cleanCode}" applied successfully!`);
      } else {
        const firstError = res.errors ? Object.values(res.errors)[0] : null;
        toast.error(getCustomerCouponError(firstError || res.error || 'Invalid coupon code.'));
      }
    } catch (error) {
      const detail = error.response?.data?.detail || error.message || 'Failed to validate coupon.';
      toast.error(getCustomerCouponError(detail));
    } finally {
      setValidatingCoupon(false);
    }
  };

  const handleRemoveCoupon = async (codeToRemove) => {
    setAutoApplyCouponsDisabled(true);
    const remainingCoupons = appliedCoupons.filter(c => c.code.toUpperCase() !== codeToRemove.toUpperCase());
    
    if (remainingCoupons.length === 0) {
      setAppliedCoupons([]);
      toast.info('Coupon removed.');
      return;
    }
    
    setValidatingCoupon(true);
    try {
      const subtotal = calculateTotal();
      const remainingCodes = remainingCoupons.map(c => c.code);
      const res = await couponService.validateCoupons(remainingCodes, subtotal);
      
      if (res.valid) {
        setAppliedCoupons(res.applied_coupons || []);
        toast.info(`Coupon removed.`);
      } else {
        setAppliedCoupons([]);
        toast.error('Remaining coupons became invalid and were removed.');
      }
    } catch (error) {
      setAppliedCoupons([]);
      toast.error('Failed to validate remaining coupons.');
    } finally {
      setValidatingCoupon(false);
    }
  };

  const handlePlaceOrder = async () => {
    // Prevent duplicate submissions
    if (orderInProgress.current) return;
    orderInProgress.current = true;
    setLoading(true);

    try {
      const orderItems = cart.items.map(item => {
        const product = products[item.product_id] || item.product;
        if (!product) {
          throw new Error(`Product information not loaded. Please refresh and try again.`);
        }
        const { displayPrice: price } = getProductPricing(product);
        if (price <= 0) {
          throw new Error(`Invalid price for "${product.name}". Please contact support.`);
        }
        return {
          product_id: item.product_id,
          product_name: product.name || '',
          quantity: item.quantity,
          price: price
        };
      });

      const subtotal = calculateTotal();
      const normalizedShippingSettings = normalizeShippingSettings(shippingSettings);

      if (paymentMethod === 'cod') {
        const minCod = normalizedShippingSettings.minimumCodAmount;
        const maxCod = normalizedShippingSettings.maximumCodAmount;
        if (subtotal < minCod) {
          throw new Error(`COD option is only available for orders above ₹${minCod}. Please select a different payment option.`);
        }
        if (subtotal > maxCod) {
          throw new Error(`COD option is only available for orders below ₹${maxCod}. Please select a different payment option.`);
        }
      }

      const { grandTotal } = calculateCheckoutPricing(subtotal, normalizedShippingSettings, paymentMethod, appliedCoupons);

      const orderData = {
        items: orderItems,
        total_amount: Number(grandTotal.toFixed(2)),
        payment_method: paymentMethod === 'cod' ? 'cod' : 'razorpay',
        shipping_address: shippingInfo,
        idempotency_key: `order_${user.id}_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`,
        coupon_codes: appliedCoupons.map(c => c.code)
      };

      const response = await orderService.createOrder(orderData);
      const orderId = response.id;

      if (paymentMethod === 'cod') {
        toast.success('Order placed successfully!');
        clearCart().catch(() => {});
        paymentService.confirmCOD(orderId).catch(() => {});
        navigate(`/order-success?order_id=${orderId}&order_number=${response.order_number}`);
        setLoading(false);
        orderInProgress.current = false;
        return;
      } else {
        await handleRazorpayPayment(orderId, response.order_number);
        // Cart already cleared inside handleRazorpayPayment handler
      }
    } catch (error) {
      const msg = error.message || '';
      if (msg === 'payment_failed') {
        navigate('/dashboard');
      } else if (msg === 'payment_cancelled') {
        toast.info('Payment cancelled. Your order is saved in your dashboard.');
        navigate('/dashboard');
      } else if (msg === 'razorpay_sdk_missing') {
        // Toast already shown
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
    codEnabled,
    shippingSettings,
    savedAddresses,
    selectedAddressId,
    shippingInfo,
    setShippingInfo,
    handleSelectAddress,
    validateShipping,
    handlePlaceOrder,
    total: calculateTotal(),
    appliedCoupons,
    availableLoyaltyCoupons,
    couponInput,
    setCouponInput,
    validatingCoupon,
    handleApplyCoupon,
    handleRemoveCoupon
  };
};
