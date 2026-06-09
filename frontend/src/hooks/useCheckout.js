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
const wait = (ms) => new Promise(resolve => setTimeout(resolve, ms));
const PENDING_RAZORPAY_ORDER_KEY = 'pending_razorpay_order';

const loadRazorpayScript = () => {
  return new Promise((resolve) => {
    if (window.Razorpay) {
      resolve(true);
      return;
    }
    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.async = true;
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });
};

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
  const { cart, clearCart, clearLocalCart, cartReady } = useCart();
  
  // Prevent duplicate order submissions
  const orderInProgress = useRef(false);

  const [products, setProducts] = useState({});
  const [loading, setLoading] = useState(false);
  const [checkoutStep, setCheckoutStep] = useState('shipping');
  const [paymentMethod, setPaymentMethod] = useState(() => localStorage.getItem('preferredPaymentMethod') || 'online');
  const [codEnabled, setCodEnabled] = useState(true);
  const [shippingSettings, setShippingSettings] = useState(null);
  const [savedAddresses, setSavedAddresses] = useState(() => {
    const cached = addressService.getCached ? addressService.getCached() : [];
    return Array.isArray(cached) ? cached : [];
  });
  const [addressesLoading, setAddressesLoading] = useState(() => {
    const cached = addressService.getCached ? addressService.getCached() : null;
    return !Array.isArray(cached) || cached.length === 0;
  });
  const [selectedAddressId, setSelectedAddressId] = useState(null);
  const [shippingInfo, setShippingInfo] = useState(() => {
    const list = addressService.getCached ? addressService.getCached() : [];
    const arr = Array.isArray(list) ? list : [];
    const def = arr.find(a => a.is_default) || arr[0];
    if (def) {
      return {
        label: def.label || 'Home',
        full_name: def.full_name,
        phone: def.phone,
        alternate_phone: def.alternate_phone || '',
        address_line1: def.address_line1,
        address_line2: def.address_line2 || '',
        city: def.city,
        state: def.state,
        pincode: def.pincode
      };
    }
    return {
      label: 'Home',
      full_name: '',
      phone: '',
      alternate_phone: '',
      address_line1: '',
      address_line2: '',
      city: '',
      state: '',
      pincode: ''
    };
  });
  
  // Update selected address ID on cache load initial state
  useEffect(() => {
    const list = addressService.getCached ? addressService.getCached() : [];
    const arr = Array.isArray(list) ? list : [];
    const def = arr.find(a => a.is_default) || arr[0];
    if (def && !selectedAddressId) {
      setSelectedAddressId(def.id);
    }
  }, [selectedAddressId]);

  const [appliedCoupons, setAppliedCoupons] = useState([]);
  const [availableLoyaltyCoupons, setAvailableLoyaltyCoupons] = useState([]);
  const [autoApplyCouponsDisabled, setAutoApplyCouponsDisabled] = useState(false);
  const [couponInput, setCouponInput] = useState('');
  const [validatingCoupon, setValidatingCoupon] = useState(false);

  const fetchAddresses = useCallback(async () => {
    const cached = addressService.getCached ? addressService.getCached() : null;
    if (!Array.isArray(cached) || cached.length === 0) {
      setAddressesLoading(true);
    }
    try {
      const data = await addressService.getAddresses();
      setSavedAddresses(data);
      setSelectedAddressId(prev => {
        const activeId = (prev && data.some(a => a.id === prev)) ? prev : null;
        const def = data.find(a => a.is_default) || data[0];
        const finalId = activeId || (def ? def.id : null);
        const matched = data.find(a => a.id === finalId);
        if (matched) {
          setShippingInfo({
            label: matched.label || 'Home',
            full_name: matched.full_name,
            phone: matched.phone,
            alternate_phone: matched.alternate_phone || '',
            address_line1: matched.address_line1,
            address_line2: matched.address_line2 || '',
            city: matched.city,
            state: matched.state,
            pincode: matched.pincode
          });
        }
        return finalId;
      });
    } catch (err) {
      // Silent — addresses are optional at this point
    } finally {
      setAddressesLoading(false);
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

  const userId = user?.id;

  useEffect(() => {
    if (userId) {
      fetchAddresses();
    }
  }, [userId, fetchAddresses]);

  useEffect(() => {
    if (!user) {
      navigate('/login');
      return;
    }
    const pendingOnlineOrder = localStorage.getItem(PENDING_RAZORPAY_ORDER_KEY);
    if (pendingOnlineOrder) {
      try {
        const parsed = JSON.parse(pendingOnlineOrder);
        const isFresh = !parsed?.createdAt || Date.now() - Number(parsed.createdAt) < 30 * 60 * 1000;
        if (!parsed?.orderId || !isFresh) {
          localStorage.removeItem(PENDING_RAZORPAY_ORDER_KEY);
        }
      } catch {
        localStorage.removeItem(PENDING_RAZORPAY_ORDER_KEY);
      }
    }
    if (!cartReady) {
      return;
    }
    if (!cart.items || cart.items.length === 0) {
      if (orderInProgress.current || localStorage.getItem(PENDING_RAZORPAY_ORDER_KEY)) {
        return;
      }
      navigate('/cart');
      return;
    }
    fetchProducts();
    fetchSettings();
  }, [user, cartReady, cart.items, navigate, fetchProducts, fetchSettings]);

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
    
    // Ensure that if saved addresses exist, the customer has picked one, or filled out the new address form
    if (savedAddresses?.length > 0 && !selectedAddressId && !full_name?.trim()) {
      toast.error("Please select a saved shipping address or enter a new address to proceed.");
      return false;
    }
    
    if (!full_name?.trim()) {
      toast.error("Shipping address contact full name is required");
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
          throw new Error(`COD option is only available for orders above ₹${minCod}.`);
        }
        if (subtotal > maxCod) {
          throw new Error(`COD option is only available for orders below ₹${maxCod}.`);
        }
      }

      const { grandTotal } = calculateCheckoutPricing(subtotal, normalizedShippingSettings, paymentMethod, appliedCoupons);

      const orderData = {
        items: orderItems,
        total_amount: Number(grandTotal.toFixed(2)),
        payment_method: paymentMethod,
        shipping_address: shippingInfo,
        idempotency_key: `order_${user.id}_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`,
        coupon_codes: appliedCoupons.map(c => c.code)
      };

      if (paymentMethod === 'online') {
        const scriptLoaded = await loadRazorpayScript();
        if (!scriptLoaded) {
          toast.error("Failed to load the secure payment window. Please check your network connection.");
          setLoading(false);
          orderInProgress.current = false;
          return;
        }

        const response = await orderService.createOrder(orderData);
        const orderId = response.id;
        const orderNumber = response.order_number;
        const rzpOrderId = response.razorpay_order_id;
        const totalAmount = response.total_amount;
        localStorage.setItem(PENDING_RAZORPAY_ORDER_KEY, JSON.stringify({
          orderId,
          orderNumber,
          razorpayOrderId: rzpOrderId,
          createdAt: Date.now()
        }));

        const clearRazorpayLaunchState = () => {
          document.body.classList.remove('razorpay-premium-launching');
        };

        document.body.classList.add('razorpay-premium-launching');

        const options = {
          key: process.env.REACT_APP_RAZORPAY_KEY_ID || 'rzp_live_SsPZ6WqWCSv7VP',
          amount: Math.round(totalAmount * 100),
          currency: "INR",
          name: "DurgaShakti Foils",
          description: `Order #${orderNumber}`,
          image: "/logo-durga.webp",
          theme: {
            color: '#006e1b',
            hide_topbar: false,
            backdrop_color: 'rgba(11, 18, 32, 0.72)'
          },
          retry: {
            enabled: true,
            max_count: 3
          },
          timeout: 900,
          readonly: {
            email: false,
            contact: false
          },
          modal: {
            ondismiss: function () {
              clearRazorpayLaunchState();
              toast.info('Payment window closed. You can complete the payment from the order details page.');
              navigate(`/order/${orderId}`);
              orderInProgress.current = false;
            },
            width: 1200,
            height: 900,
            maxHeight: '95vh',
            maxWidth: '95vw'
          },
          order_id: rzpOrderId,
          prefill: {
            name: user.full_name || '',
            email: user.email || '',
            contact: shippingInfo.phone || ''
          },
          handler: async function (paymentResponse) {
            clearRazorpayLaunchState();
            setLoading(true);
            const paidPaymentId = paymentResponse?.razorpay_payment_id;
            if (paidPaymentId) {
              sessionStorage.setItem(`razorpay_payment_${orderId}`, paidPaymentId);
            }
            try {
              const verifyPayload = {
                razorpay_order_id: rzpOrderId,
                razorpay_payment_id: paidPaymentId,
                razorpay_signature: paymentResponse.razorpay_signature
              };
              const verificationResult = await paymentService.verifyRazorpayPayment(verifyPayload);
              if (verificationResult && verificationResult.success) {
                sessionStorage.removeItem(`razorpay_payment_${orderId}`);
                localStorage.removeItem(PENDING_RAZORPAY_ORDER_KEY);
                toast.success('Payment verified successfully!');
                await clearCart();
                navigate(`/order-success?order_id=${orderId}&order_number=${orderNumber}&payment_method=online`);
              } else {
                toast.error('Payment verification failed.');
                navigate(`/order/${orderId}`);
              }
            } catch (err) {
              // Payment was successful on Razorpay's side but verify call failed
              // (e.g. server cold start, network timeout). The webhook will confirm it.
              toast.info('Payment received! Confirming your order — this may take a moment.');
              clearCart().catch(() => {});
              navigate(`/order/${orderId}`);
            } finally {
              setLoading(false);
              orderInProgress.current = false;
            }
          },
        };

        const rzp = new window.Razorpay(options);
        rzp.on('payment.failed', function (resp) {
          clearRazorpayLaunchState();
          toast.error(resp.error?.description || 'Payment failed.');
          navigate(`/order/${orderId}`);
          orderInProgress.current = false;
        });
        rzp.open();
        setTimeout(clearRazorpayLaunchState, 1500);
        setLoading(false);
        return;
      }

      // COD path
      const response = await orderService.createOrder(orderData);
      const orderId = response.id;

      toast.success('Order placed successfully!');
      clearCart().catch(() => {});
      paymentService.confirmCOD(orderId).catch(() => {});
      navigate(`/order-success?order_id=${orderId}&order_number=${response.order_number}&payment_method=cod`);
      setLoading(false);
      orderInProgress.current = false;
      return;
    } catch (error) {
      const isAxiosError = !!error.response;
      if (!isAxiosError) {
        toast.error(error.message || 'An error occurred.');
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
    addressesLoading,
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
