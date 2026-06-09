import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Trash2, Plus, Minus, ShoppingBag, X, ChevronLeft, ChevronRight, Sparkles } from 'lucide-react';
import { Button } from '../components/ui/button';
import { useCart } from '../contexts/CartContext';
import { toast } from 'sonner';
import api, { formatImageUrl } from '../utils/api';
import PageLoader from '../components/ui/PageLoader';
import settingsService from '../services/settings.service';
import apiClient from '../services/core/apiClient';
import { calculateCheckoutPricing } from '../utils/checkoutPricing';
import { getProductPricing } from '../utils/productPricing';

const Cart = () => {
  const navigate = useNavigate();
  const { cart, updateCartItem, removeFromCart, clearCart, loading, cartReady } = useCart();

  const getInitialProductsMap = () => {
    const cachedResponse = apiClient.getCachedDataSync('/products');
    const items = cachedResponse?.data?.items || [];
    const productMap = {};
    items.forEach(p => {
      productMap[p.id] = p;
    });
    return productMap;
  };

  const getInitialShipping = () => {
    const cachedResponse = apiClient.getCachedDataSync('/settings/public');
    return cachedResponse?.data?.shipping_settings || null;
  };

  const initialProducts = getInitialProductsMap();
  const initialShipping = getInitialShipping();

  const [products, setProducts] = useState(initialProducts);
  const [loadingProducts, setLoadingProducts] = useState(Object.keys(initialProducts).length === 0);
  const [shippingSettings, setShippingSettings] = useState(initialShipping);
  const [removingProductId, setRemovingProductId] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 4;
  const [paymentMethod, setPaymentMethod] = useState(() => localStorage.getItem('preferredPaymentMethod') || 'online');

  const handlePaymentMethodChange = (method) => {
    setPaymentMethod(method);
    localStorage.setItem('preferredPaymentMethod', method);
  };

  const fetchShippingSettings = async () => {
    const hasCached = !!apiClient.getCachedDataSync('/settings/public');
    if (!hasCached) {
      // Don't set any visual loading state here as shipping doesn't block the main products list
    }
    try {
      const data = await settingsService.getPublicSettings();
      if (data && data.shipping_settings) {
        setShippingSettings(data.shipping_settings);
      }
    } catch (error) {
      console.error('Error fetching shipping settings:', error);
    }
  };

  const fetchShippingSettingsSilent = async () => {
    try {
      const response = await apiClient.get('/settings/public', { silent: true });
      if (response.data && response.data.shipping_settings) {
        setShippingSettings(response.data.shipping_settings);
      }
    } catch {
      // Ignore background errors
    }
  };

  const fetchProducts = async () => {
    const hasCached = !!apiClient.getCachedDataSync('/products');
    if (!hasCached) {
      setLoadingProducts(true);
    }
    try {
      const response = await api.getProducts();
      const productMap = {};
      (response.data.items || []).forEach(p => {
        productMap[p.id] = p;
      });
      setProducts(productMap);
    } catch (error) {
      console.error('Error fetching products:', error);
    } finally {
      setLoadingProducts(false);
    }
  };

  const fetchProductsSilent = async () => {
    try {
      const response = await apiClient.get('/products', { silent: true });
      const productMap = {};
      (response.data.items || []).forEach(p => {
        productMap[p.id] = p;
      });
      setProducts(productMap);
    } catch {
      // Ignore background errors
    }
  };

  useEffect(() => {
    fetchProducts();
    fetchProductsSilent();
    fetchShippingSettings();
    fetchShippingSettingsSilent();
  }, []);

  const handleUpdateQuantity = async (productId, newQuantity) => {
    if (newQuantity < 1) return;
    try {
      await updateCartItem(productId, newQuantity);
    } catch (error) {
      const message = error.message || 'Failed to update quantity';
      toast.error(message);
    }
  };

  const handleIncrement = (productId, currentQty, stockQuantity) => {
    const nextQty = currentQty + 1;
    if (nextQty > Number(stockQuantity || 0)) {
      toast.error(`Only ${stockQuantity || 0} units available in stock`);
      return;
    }
    handleUpdateQuantity(productId, nextQty);
  };

  const handleDecrement = (productId, currentQty) => {
    if (currentQty === 1) {
      setRemovingProductId(productId);
    } else {
      handleUpdateQuantity(productId, currentQty - 1);
    }
  };

  const handleRemove = async (productId) => {
    try {
      await removeFromCart(productId);
    } catch (error) {
      toast.error(error.message || 'Failed to remove item');
    }
  };

  const handleConfirmRemove = async () => {
    if (!removingProductId) return;
    const productId = removingProductId;
    setRemovingProductId(null); // Close modal instantly for optimistic UI
    await handleRemove(productId);
  };

  const calculateTotal = () => {
    return cart.items?.reduce((total, item) => {
      const product = products[item.product_id] || item.product;
      const { displayPrice } = getProductPricing(product);
      return total + (displayPrice * item.quantity);
    }, 0) || 0;
  };

  const hasItems = (cart?.items?.length || 0) > 0;
  const hasMissingProductData = (cart?.items || []).some(item => !products[item.product_id] && !item.product);

  if (!cartReady || (loading && !hasItems) || (loadingProducts && hasMissingProductData)) {
    return (
      <div className="min-h-[calc(100vh-5rem)] bg-surface flex items-center justify-center">
        <PageLoader />
      </div>
    );
  }

  const total = calculateTotal();
  const totalPages = Math.ceil((cart?.items?.length || 0) / ITEMS_PER_PAGE);
  const currentItems = (cart?.items || []).slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);

  return (
    <div className="min-h-screen bg-[#0C1310] py-12 font-sans text-white" data-testid="cart-page">
      <div className="max-w-7xl mx-auto px-6 md:px-12 lg:px-24">
        <div className="flex items-center justify-between mb-8 border-b border-[#26322B] pb-6">
          <div>
            <span className="text-[10px] font-mono font-bold uppercase tracking-[0.25em] text-[#25D958] bg-[#25D958]/10 px-3.5 py-1.5 rounded-full inline-block mb-3 border border-[#25D958]/20">
              CHECKOUT PREPARATION
            </span>
            <h1 className="text-4xl md:text-5xl font-bold tracking-tighter text-white font-sans" data-testid="cart-title">
              Shopping Cart
            </h1>
          </div>
          {cart?.items?.length > 0 && (
            <Button
              variant="outline"
              onClick={async () => {
                if (window.confirm("Are you sure you want to clear your cart?")) {
                  try {
                    await clearCart();
                    toast.success("Cart cleared");
                  } catch (e) {
                    toast.error("Failed to clear cart");
                  }
                }
              }}
              className="text-rose-500 border-rose-500/30 hover:bg-rose-500/10 hover:text-rose-400 rounded-lg shadow-sm h-11 px-4 text-xs font-bold uppercase transition-all tracking-wider"
            >
              <Trash2 className="w-4 h-4 mr-2" />
              Clear Cart
            </Button>
          )}
        </div>

        {!cart.items || cart.items.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center py-24 bg-[#131B17] border border-[#26322B] rounded-xl p-12"
          >
            <ShoppingBag className="w-16 h-16 text-slate-500 mx-auto mb-6" />
            <h2 className="text-2xl font-bold mb-3 font-sans text-white">
              Your cart is empty
            </h2>
            <p className="text-sm text-slate-400 mb-8 font-medium">
              Add some premium foils to get started.
            </p>
            <Button
              onClick={() => navigate('/shop')}
              className="bg-[#25D958] hover:bg-[#1bb847] text-[#0C1310] h-[52px] px-8 rounded-lg font-bold tracking-wider uppercase text-sm"
              data-testid="empty-cart-shop-button"
            >
              Continue Shopping
            </Button>
          </motion.div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2">
              <div className="space-y-4">
                {currentItems.map((item, index) => {
                  const product = products[item.product_id] || item.product;
                  if (!product) return null;
                  const { basePrice, displayPrice, hasOffer, discountPercent } = getProductPricing(product);

                  return (
                    <motion.div
                      key={item.product_id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.05 }}
                      className="bg-[#131B17] border border-[#26322B] rounded-xl p-6 hover:border-[#25D958]/30 transition-all duration-300"
                      data-testid={`cart-item-${product.id}`}
                    >
                      <div className="flex flex-col sm:flex-row gap-4 sm:gap-6">
                        <div className="flex gap-4 items-start flex-1">
                          <div className="w-20 h-20 sm:w-24 sm:h-24 flex-shrink-0 rounded-lg overflow-hidden bg-[#19231F] border border-[#26322B]">
                            <img
                              src={formatImageUrl(product.image_url)}
                              alt={product.name}
                              className="w-full h-full object-cover"
                            />
                          </div>

                          <div className="flex-1 min-w-0">
                            <h3 className="font-bold text-base sm:text-lg font-sans text-white mb-1 truncate">
                              {product.name}
                            </h3>
                            <div className="mb-2">
                              <span className="text-[10px] font-mono font-bold uppercase tracking-[0.12em] text-slate-300 bg-[#19231F] px-2 py-0.5 rounded border border-[#26322B]">
                                {product.size} • {product.thickness}
                              </span>
                            </div>
                            <div className="flex items-baseline gap-2 flex-wrap">
                              <p className="text-base sm:text-lg font-extrabold text-white font-sans">
                                ₹{displayPrice}
                              </p>
                              {hasOffer && (
                                <>
                                  <span className="text-xs text-slate-400 line-through">
                                    M.R.P.: ₹{basePrice}
                                  </span>
                                  <span className="text-[10px] font-bold text-[#25D958] bg-[#25D958]/10 px-1.5 py-0.5 rounded border border-[#25D958]/20">
                                    ({discountPercent}% off)
                                  </span>
                                </>
                              )}
                            </div>
                          </div>
                        </div>

                        <div className="flex sm:flex-col items-center justify-between sm:justify-center gap-3 pt-3 sm:pt-0 border-t border-[#26322B] sm:border-t-0">
                          <span className="sm:hidden text-xs font-bold text-slate-400 uppercase">Quantity</span>
                          
                          {/* Premium Capsule Quantity Selector */}
                          <div className="flex items-center justify-between border border-[#26322B] bg-[#131B17] rounded-full h-10 w-[115px] px-3 hover:border-[#25D958]/30 transition-all select-none">
                            <button
                              onClick={(e) => {
                                  e.stopPropagation();
                                  handleDecrement(item.product_id, item.quantity);
                              }}
                              className="h-full flex items-center justify-center text-slate-450 hover:text-rose-500 transition-colors focus:outline-none cursor-pointer"
                              title={item.quantity === 1 ? "Remove item" : "Decrease quantity"}
                              data-testid={`decrease-quantity-${product.id}`}
                            >
                              {item.quantity === 1 ? (
                                <Trash2 className="w-4 h-4 text-slate-400 hover:text-rose-500 transition-colors" />
                              ) : (
                                <Minus className="w-4 h-4 text-slate-400" />
                              )}
                            </button>
                            <span className="font-bold text-white text-sm font-mono" data-testid={`cart-item-quantity-${product.id}`}>
                              {item.quantity}
                            </span>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleIncrement(item.product_id, item.quantity, product.stock_quantity);
                              }}
                              className="h-full flex items-center justify-center text-slate-400 hover:text-[#25D958] transition-colors focus:outline-none cursor-pointer"
                              title="Increase quantity"
                              data-testid={`increase-quantity-${product.id}`}
                            >
                              <Plus className="w-4 h-4 text-slate-400" />
                            </button>
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  );
                })}
              </div>

              {totalPages > 1 && (
                <div className="flex justify-center items-center gap-2 mt-8">
                  <Button
                    variant="outline"
                    onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                    disabled={currentPage === 1}
                    className="w-10 h-10 p-0 rounded-full border border-[#26322B] bg-[#131B17] text-slate-300 hover:border-[#25D958]"
                  >
                    <ChevronLeft className="w-5 h-5" />
                  </Button>
                  <span className="text-xs font-mono font-bold uppercase tracking-wider text-slate-400">
                    PAGE {currentPage} OF {totalPages}
                  </span>
                  <Button
                    variant="outline"
                    onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                    disabled={currentPage === totalPages}
                    className="w-10 h-10 p-0 rounded-full border border-[#26322B] bg-[#131B17] text-slate-300 hover:border-[#25D958]"
                  >
                    <ChevronRight className="w-5 h-5" />
                  </Button>
                </div>
              )}
            </div>

            <div className="lg:col-span-1">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-[#131B17] border border-[#26322B] rounded-xl p-6 sticky top-24"
              >
                <h2 className="text-2xl font-bold mb-6 font-sans text-white border-b border-[#26322B] pb-4 uppercase tracking-wider text-sm font-label-caps" style={{ letterSpacing: '0.1em' }}>
                  Order Summary
                </h2>
                {(() => {
                  const {
                    config,
                    shipping: calculatedShipping,
                    codCharge,
                    cgst,
                    sgst,
                    grandTotal
                  } = calculateCheckoutPricing(total, shippingSettings, paymentMethod);

                  return (
                    <>
                      {config.enableShipping && config.enableFreeShipping && total < config.freeShippingThreshold && (
                        <div className="bg-[#25D958]/5 border border-[#25D958]/20 text-[#25D958] text-[11px] rounded-lg p-3.5 mb-5 font-bold flex items-center gap-2 animate-pulse font-mono tracking-wide">
                          <Sparkles className="w-4 h-4 text-amber-500 flex-shrink-0" />
                          <span>ADD ₹{(config.freeShippingThreshold - total).toFixed(2)} MORE FOR FREE SHIPPING!</span>
                        </div>
                      )}

                      <div className="space-y-4 mb-6 font-sans">
                        <div className="flex justify-between">
                          <span className="text-slate-400 text-sm font-semibold">Subtotal</span>
                          <span className="font-bold text-white font-mono" data-testid="cart-subtotal">₹{total.toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-400 text-sm font-semibold">Shipping Charges</span>
                          <span className="font-bold text-white font-mono">
                            {calculatedShipping > 0 ? `₹${calculatedShipping.toFixed(2)}` : 'FREE'}
                          </span>
                        </div>
                        {codCharge > 0 && (
                          <div className="flex justify-between">
                            <span className="text-slate-400 text-sm font-semibold">COD Handling Fee</span>
                            <span className="font-bold text-white font-mono">₹{codCharge.toFixed(2)}</span>
                          </div>
                        )}
                        <div className="flex justify-between">
                          <span className="text-slate-400 text-sm font-semibold">SGST (9%)</span>
                          <span className="font-bold text-white font-mono">₹{sgst.toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-400 text-sm font-semibold">CGST (9%)</span>
                          <span className="font-bold text-white font-mono">₹{cgst.toFixed(2)}</span>
                        </div>
                        <div className="border-t border-[#26322B] pt-4 flex justify-between">
                          <span className="text-base font-bold text-white uppercase font-sans">Total</span>
                          <span className="text-2xl font-extrabold text-[#25D958] font-sans" data-testid="cart-total">
                            ₹{grandTotal.toFixed(2)}
                          </span>
                        </div>
                      </div>
                    </>
                  );
                })()}

                <Button
                  onClick={() => navigate('/checkout')}
                  className="w-full bg-[#25D958] hover:bg-[#1bb847] text-[#0C1310] h-[52px] rounded-lg font-black tracking-wider uppercase text-sm cursor-pointer shadow-sm active:scale-95 transition-transform"
                  data-testid="proceed-to-checkout-button"
                >
                  Proceed to Checkout
                </Button>

                <Button
                  variant="outline"
                  onClick={() => navigate('/shop')}
                  className="w-full mt-4 h-[52px] rounded-lg border border-[#26322B] bg-[#131B17] text-slate-300 font-bold hover:border-[#25D958] tracking-wider uppercase text-sm"
                  data-testid="continue-shopping-button"
                >
                  Continue Shopping
                </Button>
              </motion.div>
            </div>
          </div>
        )}
      </div>
      {/* Remove Item Confirmation Modal */}
      <AnimatePresence>
        {removingProductId && (
          <div className="fixed inset-0 bg-[#0C1310]/80 backdrop-blur z-50 flex items-center justify-center p-4" onClick={() => setRemovingProductId(null)}>
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-[#131B17] border border-[#26322B] max-w-sm w-full p-6 rounded-xl shadow-2xl relative text-white"
              onClick={(e) => e.stopPropagation()}
            >
              <button 
                onClick={() => setRemovingProductId(null)}
                className="absolute top-4 right-4 text-slate-400 hover:text-white transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
              
              <h3 className="text-white font-bold text-xl tracking-wide mb-2 font-sans">
                REMOVE ITEM?
              </h3>
              
              <p className="text-slate-400 text-sm mb-6 font-medium">
                Are you sure you want to remove this item from your cart?
              </p>
              
              <div className="flex flex-col gap-2">
                <button
                  onClick={() => setRemovingProductId(null)}
                  className="w-full bg-[#26322B] hover:bg-slate-700 text-white font-bold py-3 rounded-lg text-center transition-colors tracking-wide text-sm cursor-pointer"
                >
                  GO BACK
                </button>
                <button
                  onClick={handleConfirmRemove}
                  className="w-full border border-[#26322B] bg-rose-500/10 hover:bg-rose-500/20 text-rose-500 font-bold py-3 rounded-lg text-center transition-colors tracking-wide text-sm cursor-pointer"
                >
                  REMOVE ITEM
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default Cart;
