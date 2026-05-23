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

const Cart = () => {
  const navigate = useNavigate();
  const { cart, updateCartItem, removeFromCart, clearCart, loading } = useCart();
  const [products, setProducts] = useState({});
  const [loadingProducts, setLoadingProducts] = useState(true);
  const [shippingSettings, setShippingSettings] = useState(null);
  const [removingProductId, setRemovingProductId] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 4;

  useEffect(() => {
    fetchProducts();
    fetchShippingSettings();
  }, []);

  const fetchShippingSettings = async () => {
    try {
      const data = await settingsService.getPublicSettings();
      if (data && data.shipping_settings) {
        setShippingSettings(data.shipping_settings);
      }
    } catch (error) {
      console.error('Error fetching shipping settings:', error);
    }
  };

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
    } finally {
      setLoadingProducts(false);
    }
  };

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
      const product = products[item.product_id];
      const effectivePrice = product ? (product.discount_price || product.price) : 0;
      return total + (effectivePrice * item.quantity);
    }, 0) || 0;
  };

  if (loadingProducts) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <PageLoader />
      </div>
    );
  }

  const total = calculateTotal();
  const totalPages = Math.ceil((cart?.items?.length || 0) / ITEMS_PER_PAGE);
  const currentItems = (cart?.items || []).slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);

  return (
    <div className="min-h-screen py-12" data-testid="cart-page">
      <div className="max-w-7xl mx-auto px-6 md:px-12 lg:px-24">
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-4xl md:text-5xl font-bold tracking-tight" style={{ fontFamily: 'Manrope' }} data-testid="cart-title">
            Shopping Cart
          </h1>
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
              className="text-rose-600 border-rose-200 hover:bg-rose-50 hover:text-rose-700 rounded-sm shadow-sm transition-all"
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
            className="text-center py-24"
          >
            <ShoppingBag className="w-24 h-24 text-muted-foreground mx-auto mb-6" />
            <h2 className="text-2xl font-semibold mb-4" style={{ fontFamily: 'Manrope' }}>
              Your cart is empty
            </h2>
            <p className="text-muted-foreground mb-8">
              Add some products to get started
            </p>
            <Button
              onClick={() => navigate('/shop')}
              className="bg-primary text-primary-foreground hover:bg-primary/90 h-12 px-8 rounded-sm font-semibold"
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
                  const product = products[item.product_id];
                  if (!product) return null;

                  return (
                    <motion.div
                      key={item.product_id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.05 }}
                      className="bg-card border border-border/50 rounded-sm p-6"
                      data-testid={`cart-item-${product.id}`}
                    >
                      <div className="flex gap-6">
                        <div className="w-24 h-24 flex-shrink-0 rounded-sm overflow-hidden bg-secondary/30">
                          <img
                            src={formatImageUrl(product.image_url)}
                            alt={product.name}
                            className="w-full h-full object-cover"
                          />
                        </div>

                        <div className="flex-1">
                          <h3 className="font-semibold text-lg mb-1" style={{ fontFamily: 'Manrope' }}>
                            {product.name}
                          </h3>
                          <p className="text-sm text-muted-foreground mb-3">
                            {product.size} • {product.thickness}
                          </p>
                          <div className="flex items-baseline gap-2 flex-wrap">
                            <p className="text-xl font-bold" style={{ fontFamily: 'Manrope' }}>
                              ₹{product.discount_price || product.price}
                            </p>
                            {product.discount_price && product.discount_price < product.price && (
                              <>
                                <span className="text-sm text-muted-foreground line-through">
                                  M.R.P.: ₹{product.price}
                                </span>
                                <span className="text-xs font-semibold text-green-600">
                                  ({Math.round(((product.price - product.discount_price) / product.price) * 100)}% off)
                                </span>
                              </>
                            )}
                          </div>
                        </div>

                        <div className="flex flex-col items-end justify-center h-full">
                          {/* Premium Capsule Quantity Selector */}
                          <div className="flex items-center justify-between border border-slate-200 bg-white rounded-full h-10 w-[115px] px-3 shadow-sm hover:border-slate-300 transition-all select-none">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDecrement(item.product_id, item.quantity);
                              }}
                              className="h-full flex items-center justify-center text-slate-400 hover:text-slate-700 transition-colors focus:outline-none cursor-pointer disabled:opacity-50"
                              title={item.quantity === 1 ? "Remove item" : "Decrease quantity"}
                              data-testid={`decrease-quantity-${product.id}`}
                            >
                              {item.quantity === 1 ? (
                                <Trash2 className="w-4 h-4 text-slate-400 hover:text-rose-600 transition-colors" />
                              ) : (
                                <Minus className="w-4 h-4 text-slate-400" />
                              )}
                            </button>
                            <span className="font-bold text-slate-900 text-lg tabular-nums" data-testid={`cart-item-quantity-${product.id}`}>
                              {item.quantity}
                            </span>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleIncrement(item.product_id, item.quantity, product.stock_quantity);
                              }}
                              className="h-full flex items-center justify-center text-slate-400 hover:text-slate-700 transition-colors focus:outline-none cursor-pointer disabled:opacity-50"
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
                    className="w-10 h-10 p-0 rounded-full"
                  >
                    <ChevronLeft className="w-5 h-5" />
                  </Button>
                  <span className="text-sm font-semibold text-slate-500">
                    Page {currentPage} of {totalPages}
                  </span>
                  <Button
                    variant="outline"
                    onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                    disabled={currentPage === totalPages}
                    className="w-10 h-10 p-0 rounded-full"
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
                className="bg-secondary/30 border border-border/50 rounded-sm p-6 sticky top-24"
              >
                <h2 className="text-2xl font-bold mb-6" style={{ fontFamily: 'Manrope' }}>
                  Order Summary
                </h2>                {(() => {
                  let shippingCost = 70.0;
                  let enableFreeShipping = true;
                  let freeShippingThreshold = 1099.0;
                  let enableShipping = true;

                  if (shippingSettings) {
                    enableShipping = shippingSettings.enableShipping !== false;
                    enableFreeShipping = shippingSettings.enableFreeShipping !== false;
                    freeShippingThreshold = Number(shippingSettings.freeShippingThreshold ?? 1099);
                    shippingCost = Number(shippingSettings.defaultShippingCharge ?? 70);
                  }

                  let calculatedShipping = 0;
                  if (enableShipping) {
                    if (enableFreeShipping && total >= freeShippingThreshold) {
                      calculatedShipping = 0;
                    } else {
                      calculatedShipping = shippingCost;
                    }
                  }

                  const cgst = total * 0.09;
                  const sgst = total * 0.09;
                  const grandTotal = total + calculatedShipping + cgst + sgst;

                  return (
                    <>
                      {enableFreeShipping && total < freeShippingThreshold && (
                        <div className="bg-indigo-50 border border-indigo-100 text-indigo-700 text-xs rounded-sm p-3.5 mb-5 font-bold flex items-center gap-2 animate-pulse">
                          <Sparkles className="w-4 h-4 text-amber-500 flex-shrink-0" />
                          <span>Add ₹{(freeShippingThreshold - total).toFixed(2)} more for <span className="underline uppercase tracking-wide">FREE SHIPPING</span>!</span>
                        </div>
                      )}

                      <div className="space-y-4 mb-6">
                        <div className="flex justify-between">
                          <span className="text-muted-foreground text-sm font-semibold">Subtotal</span>
                          <span className="font-bold text-slate-800" data-testid="cart-subtotal">₹{total.toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground text-sm font-semibold">Shipping Charges</span>
                          <span className="font-bold text-slate-800">
                            {calculatedShipping > 0 ? `₹${calculatedShipping.toFixed(2)}` : 'FREE'}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground text-sm font-semibold">SGST (9%)</span>
                          <span className="font-bold text-slate-800">₹{sgst.toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground text-sm font-semibold">CGST (9%)</span>
                          <span className="font-bold text-slate-800">₹{cgst.toFixed(2)}</span>
                        </div>
                        <div className="border-t border-border/50 pt-4 flex justify-between">
                          <span className="text-lg font-bold text-slate-900">Total</span>
                          <span className="text-2xl font-extrabold text-indigo-650" style={{ fontFamily: 'Manrope' }} data-testid="cart-total">
                            ₹{grandTotal.toFixed(2)}
                          </span>
                        </div>
                      </div>
                    </>
                  );
                })()}

                <Button
                  onClick={() => navigate('/checkout')}
                  className="w-full bg-primary text-primary-foreground hover:bg-primary/90 h-12 rounded-sm font-semibold"
                  data-testid="proceed-to-checkout-button"
                >
                  Proceed to Checkout
                </Button>

                <Button
                  variant="outline"
                  onClick={() => navigate('/shop')}
                  className="w-full mt-4"
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
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setRemovingProductId(null)}>
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white border border-slate-200 max-w-sm w-full p-6 rounded-sm shadow-2xl relative"
              onClick={(e) => e.stopPropagation()}
            >
              <button 
                onClick={() => setRemovingProductId(null)}
                className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
              
              <h3 className="text-slate-900 font-bold text-xl tracking-wide mb-2" style={{ fontFamily: 'Manrope' }}>
                REMOVE ITEM?
              </h3>
              
              <p className="text-slate-600 text-sm mb-6">
                Are you sure you want to remove this item from your cart?
              </p>
              
              <div className="flex flex-col gap-2">
                <button
                  onClick={() => setRemovingProductId(null)}
                  className="w-full bg-slate-900 hover:bg-slate-800 text-white font-bold py-3 rounded-sm text-center transition-colors tracking-wide text-sm cursor-pointer"
                >
                  GO BACK
                </button>
                <button
                  onClick={handleConfirmRemove}
                  className="w-full border border-slate-300 bg-rose-50/40 hover:bg-rose-50 text-rose-700 font-bold py-3 rounded-sm text-center transition-colors tracking-wide text-sm cursor-pointer"
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