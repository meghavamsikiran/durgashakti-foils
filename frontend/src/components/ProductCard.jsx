import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { ShoppingCart, Heart, Trash2, Plus, Minus, Bell, X, Check, Ticket } from 'lucide-react';
import { Button } from './ui/button';
import { useCart } from '../contexts/CartContext';
import { useAuth } from '../contexts/AuthContext';
import { toast } from 'sonner';
import api, { formatImageUrl } from '../utils/api';
import { getProductPricing } from '../utils/productPricing';
import { getBadgeClasses, getProductBadge } from '../utils/productBadges';
import StarRating from './reviews/StarRating';

const ProductCard = ({ product }) => {
  const navigate = useNavigate();
  const { cart, addToCart, updateCartItem, removeFromCart } = useCart();
  const { user, refreshUser } = useAuth();
  const [loading, setLoading] = React.useState(false);
  const [wishlisting, setWishlisting] = React.useState(false);
  
  // Custom states
  const [showRemoveModal, setShowRemoveModal] = React.useState(false);
  const { basePrice, displayPrice, hasOffer, discountPercent } = getProductPricing(product);
  const isUnavailable = Number(product.stock_quantity) <= 0 || product.in_stock === false;
  const primaryCoupon = Array.isArray(product.applicable_coupons) ? product.applicable_coupons[0] : null;
  
  const cartItem = cart?.items?.find(item => String(item.product_id) === String(product.id));
  const currentQty = cartItem ? cartItem.quantity : 0;
  
  // Synchronous local state for zero-latency clicks
  const [qty, setQty] = React.useState(0);

  React.useEffect(() => {
    setQty(currentQty);
  }, [currentQty]);

  const triggerUpdatedBanner = () => {
    toast.success('Quantity updated', {
      id: `qty-update-${product.id}`,
      action: {
        label: 'Go to cart',
        onClick: () => navigate('/cart')
      }
    });
  };

  const activeTag = getProductBadge(product, discountPercent);
  const actualWishlisted = user?.wishlist?.some(item => item.product_id === product.id);
  const [optimisticWishlist, setOptimisticWishlist] = React.useState(null);

  const formatCouponValue = (coupon) => {
    if (coupon.discount_type === 'percentage') return `${Number(coupon.discount_value || 0)}% OFF`;
    if (coupon.discount_type === 'flat') return `SAVE Rs ${Number(coupon.discount_value || 0)}`;
    return 'FREE SHIPPING';
  };

  React.useEffect(() => {
    setOptimisticWishlist(actualWishlisted);
  }, [actualWishlisted]);

  const isWishlisted = optimisticWishlist !== null ? optimisticWishlist : actualWishlisted;

  const handleToggleWishlist = async (e) => {
    e.stopPropagation();
    if (!user) {
      toast.error('Please login to use wishlist');
      navigate('/login');
      return;
    }

    const previousState = isWishlisted;
    setOptimisticWishlist(!previousState); // Instant visual update
    setWishlisting(true);
    toast.success(previousState ? 'Removed from wishlist' : 'Added to wishlist');
    
    try {
      await api.toggleWishlist(product.id);
      refreshUser().catch(() => {});
    } catch (error) {
      setOptimisticWishlist(previousState); // Rollback on failure
      toast.error('Failed to update wishlist');
    } finally {
      setWishlisting(false);
    }
  };

  const handleAddToCart = async (e) => {
    e.stopPropagation();
    
    if (!user) {
      toast.error('Please login to add items to cart');
      navigate('/login');
      return;
    }

    setQty(1); // Synchronous optimistic update
    triggerUpdatedBanner();
    
    try {
      await addToCart(product.id, 1, product);
    } catch (error) {
      setQty(0); // Rollback
      const message = error.response?.data?.detail || 'Failed to add to cart';
      toast.error(message);
    }
  };

  const handleDecrement = async (e) => {
    e.stopPropagation();
    if (qty === 1) {
      setShowRemoveModal(true);
      return;
    }
    
    const nextQty = qty - 1;
    setQty(nextQty); // Synchronous optimistic update
    triggerUpdatedBanner();
    
    try {
      await updateCartItem(product.id, nextQty);
    } catch (error) {
      setQty(qty); // Rollback
      toast.error('Failed to update cart');
    }
  };

  const handleIncrement = async (e) => {
    e.stopPropagation();
    const nextQty = qty + 1;
    if (nextQty > product.stock_quantity) {
      toast.error(`Only ${product.stock_quantity} units available in stock`);
      return;
    }
    
    setQty(nextQty); // Synchronous optimistic update
    triggerUpdatedBanner();
    
    try {
      await updateCartItem(product.id, nextQty);
    } catch (error) {
      setQty(qty); // Rollback
      toast.error('Failed to update cart');
    }
  };

  const handleConfirmRemove = async () => {
    setShowRemoveModal(false);
    setQty(0); // Synchronous optimistic update
    triggerUpdatedBanner();
    
    try {
      await removeFromCart(product.id);
      toast.success('Removed from cart');
    } catch (error) {
      setQty(qty); // Rollback
      toast.error('Failed to remove item');
    }
  };


  return (
    <>
      <motion.div
        whileHover={{ y: -5 }}
        transition={{ duration: 0.2 }}
        className="group relative overflow-hidden bg-white border border-border-subtle rounded-xl hover:border-primary hover:shadow-emerald-glow transition-all duration-300 cursor-pointer flex flex-col h-full"
        onClick={() => navigate(`/product/${product.id}`)}
        data-testid={`product-card-${product.id}`}
      >
        <div className="aspect-square overflow-hidden bg-surface-container-low relative">
          <img
            src={formatImageUrl(product.image_url)}
            alt={product.name}
            className="w-full h-full object-cover transition-transform duration-500 ease-out group-hover:scale-105"
            data-testid="product-image"
          />
          
          {/* Wishlist Button */}
          <button
            onClick={handleToggleWishlist}
            disabled={wishlisting}
            className={`absolute top-3 right-3 p-2 rounded-full backdrop-blur-md transition-all duration-200 shadow-sm z-10 
              ${isWishlisted 
                ? 'bg-rose-500 text-white shadow-md shadow-rose-500/20' 
                : 'bg-white/90 text-rose-500/70 hover:text-rose-600 hover:bg-white hover:scale-110'}`}
            data-testid="wishlist-toggle"
          >
            <Heart className={`w-4 h-4 ${isWishlisted ? 'fill-current' : ''} ${wishlisting ? 'animate-pulse' : ''}`} />
          </button>

          {/* Active Tag */}
          {activeTag && (
            <div className={`absolute top-3 left-0 px-3 py-1 text-[9px] font-black uppercase tracking-widest shadow-md rounded-r-full z-10 ${getBadgeClasses(activeTag)}`}>
              {activeTag}
            </div>
          )}

          {primaryCoupon && (
            <div
              className="absolute bottom-3 left-3 right-3 z-10 flex items-center justify-between gap-2 rounded-xl border border-dashed border-emerald-500/40 bg-white/95 px-3 py-2 text-[10px] font-black uppercase tracking-wider text-emerald-800 shadow-sm backdrop-blur-sm hover:bg-emerald-50/95 transition-all select-none"
              data-testid="product-coupon-badge"
            >
              <div className="flex items-center gap-1.5 min-w-0">
                <Ticket className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                <span className="min-w-0 truncate">Coupon <span className="font-mono text-emerald-600 font-extrabold">{primaryCoupon.code}</span></span>
              </div>
              <span className="shrink-0 rounded bg-emerald-600 px-2 py-0.5 text-[9px] font-extrabold text-white shadow-sm tracking-wide">
                {formatCouponValue(primaryCoupon)}
              </span>
            </div>
          )}

          {isUnavailable && (
            <div className="absolute inset-0 bg-black/40 flex items-center justify-center z-10">
              <span className="bg-destructive text-white px-4 py-2 text-xs font-bold uppercase tracking-wider rounded-lg">Out of Stock</span>
            </div>
          )}
        </div>

        <div className="p-5 flex flex-col justify-between flex-1">
          <div>
            <div className="mb-1.5 flex items-center justify-between">
              <span className="text-[10px] font-mono font-bold uppercase tracking-[0.15em] text-on-surface-variant bg-surface-container-low px-2 py-0.5 rounded border border-border-subtle">
                {product.size} • {product.thickness}
              </span>
              {hasOffer && (
                <span className="text-[10px] font-black text-rose-600 bg-rose-50 border border-rose-100 px-1.5 py-0.5 rounded-sm">
                  -{discountPercent}%
                </span>
              )}
            </div>
            
            <h3 className="font-bold text-base font-manrope text-ink-slate mb-1 line-clamp-2 hover:text-primary transition-colors" data-testid="product-name">
              {product.name}
            </h3>

            {Number(product.review_count || 0) > 0 && (
              <StarRating
                value={product.rating_average}
                count={product.review_count}
                className="mb-2"
              />
            )}
            
            <p className="text-xs text-text-muted leading-relaxed line-clamp-2 font-inter mb-4">
              {product.description}
            </p>
          </div>

          <div>
            <div className="flex items-center justify-between mt-auto">
              <div className="flex flex-col gap-0.5 min-w-0">
                {hasOffer ? (
                  <div className="flex items-baseline gap-2">
                    <span className="text-xl font-black text-ink-slate font-manrope leading-none" data-testid="product-price">
                      ₹{displayPrice}
                    </span>
                    <span className="text-[11px] text-text-muted line-through font-semibold">
                      ₹{basePrice}
                    </span>
                  </div>
                ) : (
                  <span className="text-xl font-black text-ink-slate font-manrope leading-none" data-testid="product-price">
                    ₹{displayPrice}
                  </span>
                )}
              </div>
              
            </div>
            <div className="pt-4" onClick={(e) => e.stopPropagation()}>
              {isUnavailable ? (
                <Button
                  onClick={(e) => { e.stopPropagation(); toast.success('🔔 We will email you once this item is back in stock!'); }}
                  className="w-full border border-border-subtle bg-white hover:bg-slate-50 text-slate-700 h-10 rounded-lg font-bold transition-all shadow-sm text-[10px] flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <Bell className="w-3 h-3 text-slate-500" />
                  NOTIFY ME
                </Button>
              ) : qty > 0 ? (
                <div className="flex items-center justify-between border border-border-subtle bg-white rounded-full h-10 w-full px-3.5 shadow-sm hover:border-primary/50 transition-all select-none">
                  <button
                    onClick={handleDecrement}
                    className="h-full flex items-center justify-center text-slate-400 hover:text-rose-600 transition-colors focus:outline-none cursor-pointer"
                    title={qty === 1 ? "Remove item" : "Decrease quantity"}
                    data-testid={`decrease-quantity-${product.id}`}
                  >
                    {qty === 1 ? (
                      <Trash2 className="w-4 h-4 text-slate-400 hover:text-rose-600 transition-colors" />
                    ) : (
                      <Minus className="w-4 h-4 text-slate-400" />
                    )}
                  </button>
                  <span className="font-bold text-slate-800 text-xs font-mono tracking-wider">
                    {qty} IN CART
                  </span>
                  <button
                    onClick={handleIncrement}
                    className="h-full flex items-center justify-center text-slate-400 hover:text-primary transition-colors focus:outline-none cursor-pointer"
                    title="Increase quantity"
                    data-testid={`increase-quantity-${product.id}`}
                  >
                    <Plus className="w-4 h-4 text-slate-400" />
                  </button>
                </div>
              ) : (
                <Button
                  onClick={handleAddToCart}
                  className="w-full bg-primary hover:bg-emerald-hover text-white h-10 rounded-lg font-bold transition-all flex items-center justify-center gap-2 shadow-sm text-xs cursor-pointer active:scale-95"
                  data-testid="add-to-cart-button"
                >
                  <ShoppingCart className="w-3.5 h-3.5" />
                  ADD TO CART
                </Button>
              )}
            </div>
          </div>
        </div>

      </motion.div>

      {/* Remove Item Confirmation Modal */}
      <AnimatePresence>
        {showRemoveModal && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur z-50 flex items-center justify-center p-4" onClick={(e) => e.stopPropagation()}>
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white border border-slate-200 max-w-sm w-full p-6 rounded-sm shadow-2xl relative"
            >
              <button 
                onClick={() => setShowRemoveModal(false)}
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
                  onClick={() => setShowRemoveModal(false)}
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
    </>
  );
};

export default ProductCard;
