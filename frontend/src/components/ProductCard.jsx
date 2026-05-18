import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { ShoppingCart, Heart, Trash2, Plus, Minus, Bell, X, Check } from 'lucide-react';
import { Button } from './ui/button';
import { useCart } from '../contexts/CartContext';
import { useAuth } from '../contexts/AuthContext';
import { toast } from 'sonner';
import api, { formatImageUrl } from '../utils/api';

const ProductCard = ({ product }) => {
  const navigate = useNavigate();
  const { cart, addToCart, updateCartItem, removeFromCart } = useCart();
  const { user, refreshUser } = useAuth();
  const [loading, setLoading] = React.useState(false);
  const [wishlisting, setWishlisting] = React.useState(false);
  
  // Custom states
  const [showRemoveModal, setShowRemoveModal] = React.useState(false);
  const [showUpdatedBanner, setShowUpdatedBanner] = React.useState(false);
  
  const cartItem = cart?.items?.find(item => item.product_id === product.id);
  const currentQty = cartItem ? cartItem.quantity : 0;
  
  // Synchronous local state for zero-latency clicks
  const [qty, setQty] = React.useState(0);
  const bannerTimeoutRef = React.useRef(null);

  React.useEffect(() => {
    setQty(currentQty);
  }, [currentQty]);

  React.useEffect(() => {
    return () => {
      if (bannerTimeoutRef.current) clearTimeout(bannerTimeoutRef.current);
    };
  }, []);

  const triggerUpdatedBanner = () => {
    setShowUpdatedBanner(true);
    if (bannerTimeoutRef.current) clearTimeout(bannerTimeoutRef.current);
    bannerTimeoutRef.current = setTimeout(() => {
      setShowUpdatedBanner(false);
    }, 4000);
  };

  // Dynamic Tag Logic
  const getDynamicTag = () => {
    if (product.badge) return product.badge; // Admin manual override
    
    const discountPercent = product.price > 0 ? ((product.price - product.discount_price) / product.price) * 100 : 0;
    
    if (product.units_sold >= 50) return "Best Seller";
    if (discountPercent >= 25) return "Hot Deal";
    if (product.units_sold >= 20 && product.stock_quantity < 10) return "High Demand";
    if (product.units_sold >= 10) return "Trending";
    
    return null;
  };

  const activeTag = getDynamicTag();
  const isWishlisted = user?.wishlist?.some(item => item.product_id === product.id);

  const handleToggleWishlist = async (e) => {
    e.stopPropagation();
    if (!user) {
      toast.error('Please login to use wishlist');
      navigate('/login');
      return;
    }

    setWishlisting(true);
    try {
      await api.toggleWishlist(product.id);
      await refreshUser();
      toast.success(isWishlisted ? 'Removed from wishlist' : 'Added to wishlist');
    } catch (error) {
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
      await addToCart(product.id, 1);
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

  const handleNotifyMe = (e) => {
    e.stopPropagation();
    toast.success(`🔔 We will email you once this item is back in stock!`);
  };

  return (
    <>
      <motion.div
        whileHover={{ y: -5 }}
        transition={{ duration: 0.2 }}
        className="group relative overflow-hidden bg-card border border-border/50 rounded-sm hover:border-primary/50 transition-colors cursor-pointer"
        onClick={() => navigate(`/product/${product.id}`)}
        data-testid={`product-card-${product.id}`}
      >
        <div className="aspect-square overflow-hidden bg-secondary/30 relative">
          <img
            src={formatImageUrl(product.image_url)}
            alt={product.name}
            className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
            data-testid="product-image"
          />
          
          {/* Wishlist Button */}
          <button
            onClick={handleToggleWishlist}
            disabled={wishlisting}
            className={`absolute top-3 right-3 p-2 rounded-full backdrop-blur-md transition-all shadow-sm z-10 
              ${isWishlisted 
                ? 'bg-rose-500 text-white shadow-rose-200' 
                : 'bg-white/80 text-slate-500 hover:text-rose-500 hover:bg-white'}`}
            data-testid="wishlist-toggle"
          >
            <Heart className={`w-4 h-4 ${isWishlisted ? 'fill-current' : ''} ${wishlisting ? 'animate-pulse' : ''}`} />
          </button>

          {/* Active Tag */}
          {activeTag && (
            <div className={`absolute top-3 left-0 text-white px-3 py-1 text-[10px] font-black uppercase tracking-widest shadow-lg rounded-r-full z-10
              ${activeTag === 'Best Seller' ? 'bg-indigo-600' : 
                activeTag === 'Hot Deal' ? 'bg-rose-600' : 
                activeTag === 'High Demand' ? 'bg-orange-500' : 
                'bg-amber-500'}`}>
              {activeTag}
            </div>
          )}

          {/* Discount Percentage Tag */}
          {product.discount_price > 0 && product.discount_price < product.price && (
            <div className="absolute bottom-3 right-3 bg-rose-600 text-white px-2 py-0.5 text-[10px] font-black rounded-sm z-10">
              -{Math.round(((product.price - product.discount_price) / product.price) * 100)}%
            </div>
          )}

          {(Number(product.stock_quantity) <= 0 || product.in_stock === false) && (
            <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
              <span className="bg-red-600 text-white px-4 py-2 text-sm font-semibold rounded-sm">Out of Stock</span>
            </div>
          )}

          {/* Non-blocking Quantity updated absolute overlay inside image container */}
          <AnimatePresence>
            {showUpdatedBanner && (
              <motion.div
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 30 }}
                className="absolute bottom-0 left-0 right-0 border-t border-rose-200 bg-white/95 backdrop-blur-sm p-3 px-4 flex items-center justify-between shadow-lg z-20"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="flex items-center gap-2.5">
                  <div className="w-4.5 h-4.5 rounded-full border border-rose-400 flex items-center justify-center bg-rose-50 flex-shrink-0">
                    <Check className="w-2.5 h-2.5 text-rose-500 stroke-[3]" />
                  </div>
                  <span className="text-xs font-semibold text-rose-900 font-manrope">
                    Quantity updated
                  </span>
                </div>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    navigate('/cart');
                  }}
                  className="text-xs font-bold text-slate-900 underline hover:text-rose-700 transition-colors cursor-pointer"
                >
                  Go to cart
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <div className="p-5 flex flex-col justify-between h-[245px]">
          <div>
            <div className="mb-2">
              <span className="text-xs uppercase tracking-widest font-semibold text-muted-foreground">
                {product.size} • {product.thickness}
              </span>
            </div>
            
            <h3 className="font-semibold text-lg mb-2 line-clamp-2" style={{ fontFamily: 'Manrope' }} data-testid="product-name">
              {product.name}
            </h3>
            
            <p className="text-sm text-muted-foreground mb-4 line-clamp-2">
              {product.description}
            </p>
          </div>

          <div>
            <div className="flex items-center justify-between mt-auto">
              {/* Amazon styled price */}
              <div className="flex flex-col gap-0.5 min-w-0">
                {product.discount_price > 0 && product.discount_price < product.price ? (
                  <div className="flex flex-col">
                    <span className="text-2xl font-black text-slate-900 leading-none animate-in fade-in" style={{ fontFamily: 'Manrope' }} data-testid="product-price">
                      ₹{product.discount_price}
                    </span>
                    <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
                      <span className="text-[11px] text-slate-500 font-manrope font-semibold">
                        M.R.P.: <span className="line-through font-bold text-slate-600">₹{product.price}</span>
                      </span>
                      <span className="text-[11px] font-black text-rose-600 font-manrope whitespace-nowrap">
                        ({Math.round(((product.price - product.discount_price) / product.price) * 100)}% off)
                      </span>
                    </div>
                  </div>
                ) : (
                  <span className="text-2xl font-black text-slate-900 leading-none" style={{ fontFamily: 'Manrope' }} data-testid="product-price">
                    ₹{product.price}
                  </span>
                )}
              </div>
              
              {/* Premium Capsule Quantity Selector or Notify Me */}
              <div className="flex-shrink-0" onClick={(e) => e.stopPropagation()}>
                {Number(product.stock_quantity) <= 0 || product.in_stock === false ? (
                  <Button
                    onClick={handleNotifyMe}
                    className="border border-slate-200 bg-white hover:bg-slate-50 text-slate-800 h-10 px-4 rounded-full font-bold transition-all shadow-sm text-xs flex items-center gap-2 cursor-pointer"
                  >
                    <Bell className="w-3.5 h-3.5 text-slate-500" />
                    NOTIFY ME
                  </Button>
                ) : qty > 0 ? (
                  <div className="flex items-center justify-between border border-slate-200 bg-white rounded-full h-10 w-[115px] px-3 shadow-sm hover:border-slate-300 transition-all select-none">
                    <button
                      onClick={handleDecrement}
                      className="h-full flex items-center justify-center text-slate-400 hover:text-slate-700 transition-colors focus:outline-none cursor-pointer"
                      title={qty === 1 ? "Remove item" : "Decrease quantity"}
                    >
                      {qty === 1 ? (
                        <Trash2 className="w-4 h-4 text-slate-400 hover:text-rose-600 transition-colors" />
                      ) : (
                        <Minus className="w-4 h-4 text-slate-400" />
                      )}
                    </button>
                    <span className="font-bold text-slate-900 text-lg tabular-nums">
                      {qty}
                    </span>
                    <button
                      onClick={handleIncrement}
                      className="h-full flex items-center justify-center text-slate-400 hover:text-slate-700 transition-colors focus:outline-none cursor-pointer"
                      title="Increase quantity"
                    >
                      <Plus className="w-4 h-4 text-slate-400" />
                    </button>
                  </div>
                ) : (
                  <Button
                    onClick={handleAddToCart}
                    className="bg-slate-900 hover:bg-slate-800 text-white h-10 px-5 rounded-full font-bold transition-transform active:scale-95 flex items-center gap-2 shadow-sm text-sm cursor-pointer"
                    data-testid="add-to-cart-button"
                  >
                    <ShoppingCart className="w-4 h-4" />
                    Add
                  </Button>
                )}
              </div>
            </div>
          </div>
        </div>

      </motion.div>

      {/* Remove Item Confirmation Modal */}
      <AnimatePresence>
        {showRemoveModal && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={(e) => e.stopPropagation()}>
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