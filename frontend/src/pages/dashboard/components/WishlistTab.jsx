import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Heart, Trash2, ChevronLeft, ChevronRight, ShoppingCart, Ticket } from 'lucide-react';
import { Button } from '../../../components/ui/button';
import PageLoader from '../../../components/ui/PageLoader';
import { useCart } from '../../../contexts/CartContext';
import { formatImageUrl } from '../../../utils/api';
import { getProductPricing } from '../../../utils/productPricing';
import StarRating from '../../../components/reviews/StarRating';

const ITEMS_PER_PAGE = 4;

const formatCouponValue = (coupon) => {
  if (!coupon) return '';
  if (coupon.discount_type === 'percentage') return `${Number(coupon.discount_value || 0)}% OFF`;
  if (coupon.discount_type === 'flat') return `SAVE Rs ${Number(coupon.discount_value || 0)}`;
  return 'FREE SHIPPING';
};

const WishlistTab = ({ wishlist, loading, onToggleWishlist, onClearWishlist }) => {
  const { cart, addToCart } = useCart();
  const [currentPage, setCurrentPage] = useState(1);
  const [clearing, setClearing] = useState(false);

  if (loading) return <PageLoader message="Loading wishlist..." />;

  const handleClearWishlist = async () => {
    if (window.confirm('Are you sure you want to clear your entire wishlist?')) {
      setClearing(true);
      if (onClearWishlist) {
        await onClearWishlist();
      }
      setClearing(false);
    }
  };

  const totalPages = Math.ceil((wishlist?.length || 0) / ITEMS_PER_PAGE);
  const currentItems = (wishlist || []).slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);

  return (
    <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="space-y-6">
      <div className="flex justify-between items-center flex-wrap gap-4">
        <h2 className="text-2xl md:text-3xl font-black text-foreground uppercase tracking-tighter">Wishlist</h2>
        {wishlist && wishlist.length > 0 && (
          <Button
            variant="outline"
            onClick={handleClearWishlist}
            disabled={clearing}
            className="h-11 text-rose-600 border-rose-200 hover:bg-rose-50 hover:text-rose-700 rounded-lg transition-all"
          >
            <Trash2 className="w-4 h-4 mr-2" />
            Clear All
          </Button>
        )}
      </div>

      {!wishlist || wishlist.length === 0 ? (
        <div className="text-center py-20 bg-surface-container-low rounded-xl border border-dashed border-border-subtle">
          <Heart className="w-12 h-12 text-muted-foreground/40 mx-auto mb-4" />
          <p className="text-muted-foreground font-bold">Your wishlist is empty</p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {currentItems.map((product) => {
              const inCart = cart?.items?.some((i) => String(i.product_id) === String(product.id));
              const { basePrice, displayPrice, hasOffer, discountPercent } = getProductPricing(product);
              const primaryCoupon = Array.isArray(product.applicable_coupons) ? product.applicable_coupons[0] : null;

              return (
                <div
                  key={product.id}
                  className="group rounded-xl border border-border-subtle bg-white hover:shadow-emerald-glow hover:border-primary/50 transition-all overflow-hidden flex flex-col min-h-[356px]"
                >
                  <div className="relative h-44 bg-surface-container-low overflow-hidden">
                    <img
                      src={formatImageUrl(product.image_url)}
                      alt={product.name}
                      className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                    />
                    {hasOffer && (
                      <span className="absolute top-3 right-3 text-[10px] font-black text-rose-600 bg-rose-50/95 border border-rose-100 px-2 py-1 rounded-sm shadow-sm">
                        -{discountPercent}%
                      </span>
                    )}
                    {primaryCoupon && (
                      <div
                        className="absolute bottom-3 left-3 right-3 z-10 flex items-center justify-between gap-2 rounded-xl border border-dashed border-emerald-500/40 bg-white/95 px-3 py-2 text-[10px] font-black uppercase tracking-wider text-emerald-800 shadow-sm backdrop-blur-sm hover:bg-emerald-50/95 transition-all select-none"
                        data-testid="wishlist-coupon-badge"
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
                  </div>

                  <div className="p-4 flex flex-col flex-1">
                    <div className="flex items-center justify-between gap-2 mb-1.5">
                      <p className="text-[10px] font-mono font-bold uppercase tracking-[0.12em] text-on-surface-variant truncate">
                        {product.size} - {product.thickness}
                      </p>
                    </div>

                    <h4 className="font-black text-foreground leading-snug line-clamp-2 min-h-[44px]">
                      {product.name}
                    </h4>

                    {Number(product.review_count || 0) > 0 && (
                      <StarRating value={product.rating_average} count={product.review_count} className="mt-2" />
                    )}

                    <div className="mt-auto pt-4">
                      <div className="flex items-baseline gap-2 mb-4">
                        <span className="text-xl font-black text-primary font-mono">&#8377;{displayPrice}</span>
                        {hasOffer && (
                          <span className="text-[11px] text-text-muted line-through font-semibold">&#8377;{basePrice}</span>
                        )}
                      </div>

                      <div className="flex items-center gap-3">
                        {inCart ? (
                          <Button disabled className="flex-1 h-11 rounded-lg bg-surface-container-low text-muted-foreground opacity-100 cursor-not-allowed hover:bg-surface-container-low">
                            In Cart
                          </Button>
                        ) : (
                          <Button onClick={() => addToCart(product.id)} className="flex-1 h-11 rounded-lg bg-primary hover:bg-primary/90 text-primary-foreground">
                            <ShoppingCart className="w-4 h-4 mr-2" />
                            Add to Cart
                          </Button>
                        )}
                        <Button variant="ghost" onClick={() => onToggleWishlist(product.id)} className="h-11 w-11 rounded-lg text-rose-500 hover:bg-rose-50">
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {totalPages > 1 && (
            <div className="flex justify-center items-center gap-2 mt-8">
              <Button
                variant="outline"
                onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
                disabled={currentPage === 1}
                className="w-10 h-10 p-0 rounded-lg"
              >
                <ChevronLeft className="w-5 h-5" />
              </Button>
              <span className="text-sm font-semibold text-muted-foreground font-mono">
                Page {currentPage} of {totalPages}
              </span>
              <Button
                variant="outline"
                onClick={() => setCurrentPage((prev) => Math.min(prev + 1, totalPages))}
                disabled={currentPage === totalPages}
                className="w-10 h-10 p-0 rounded-lg"
              >
                <ChevronRight className="w-5 h-5" />
              </Button>
            </div>
          )}
        </>
      )}
    </motion.div>
  );
};

export default WishlistTab;
