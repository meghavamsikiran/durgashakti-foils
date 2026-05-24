import React, { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ShoppingCart, Check, ArrowLeft, Heart, Trash2, Plus, Minus, AlertTriangle } from 'lucide-react';
import { Button } from '../components/ui/button';
import { useCart } from '../contexts/CartContext';
import { useAuth } from '../contexts/AuthContext';
import { toast } from 'sonner';
import api, { formatImageUrl } from '../utils/api';
import PageLoader from '../components/ui/PageLoader';
import apiClient from '../services/core/apiClient';

const ProductDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const getInitialProduct = useCallback(() => {
    const cachedResponse = apiClient.getCachedDataSync(`/products/${id}`);
    if (cachedResponse?.data) {
      return cachedResponse.data;
    }
    const cachedProductsRes = apiClient.getCachedDataSync('/products');
    const items = cachedProductsRes?.data?.items || [];
    return items.find(item => String(item.id) === String(id)) || null;
  }, [id]);

  const [product, setProduct] = useState(() => getInitialProduct());
  const [loading, setLoading] = useState(() => !getInitialProduct());
  const [adding, setAdding] = useState(false);
  const [quantity, setQuantity] = useState(1);
  const { cart, addToCart, updateCartItem, removeFromCart, setPendingQty } = useCart();
  const { user, refreshUser } = useAuth();
  const [wishlisting, setWishlisting] = useState(false);
  const [activeMediaIndex, setActiveMediaIndex] = useState(0);
  
  // Dynamic Tag Logic
  const getDynamicTag = () => {
    if (product?.badge) return product.badge;
    const discountPercent = product?.price > 0 ? ((product.price - (product.discount_price || 0)) / product.price) * 100 : 0;
    if (product?.units_sold >= 50) return "Best Seller";
    if (discountPercent >= 25) return "Hot Deal";
    if (product?.units_sold >= 20 && product?.stock_quantity < 10) return "High Demand";
    if (product?.units_sold >= 10) return "Trending";
    return null;
  };

  const activeTag = getDynamicTag();
  const actualWishlisted = user?.wishlist?.some(item => item.product_id === product?.id);
  const [optimisticWishlist, setOptimisticWishlist] = useState(null);

  useEffect(() => {
    setOptimisticWishlist(actualWishlisted);
  }, [actualWishlisted]);

  const isWishlisted = optimisticWishlist !== null ? optimisticWishlist : actualWishlisted;

  const handleToggleWishlist = async () => {
    if (!user) {
      toast.error('Please login to use wishlist');
      navigate('/login');
      return;
    }
    
    const previousState = isWishlisted;
    setOptimisticWishlist(!previousState);
    setWishlisting(true);
    
    try {
      await api.toggleWishlist(product.id);
      await refreshUser();
      toast.success(previousState ? 'Removed from wishlist' : 'Added to wishlist');
    } catch (err) {
      setOptimisticWishlist(previousState);
      toast.error('Failed to update wishlist');
    } finally {
      setWishlisting(false);
    }
  };

  const fetchProduct = useCallback(async () => {
    const hasCached = !!getInitialProduct();
    if (!hasCached) {
      setLoading(true);
    }
    try {
      const response = await api.getProduct(id);
      setProduct(response.data);
    } catch (error) {
      toast.error('Product not found');
      navigate('/shop');
    } finally {
      setLoading(false);
    }
  }, [id, navigate, getInitialProduct]);

  const fetchProductSilent = useCallback(async () => {
    try {
      const response = await apiClient.get(`/products/${id}`, { silent: true });
      setProduct(response.data);
    } catch {
      // Ignore background errors
    }
  }, [id]);

  useEffect(() => {
    fetchProduct();
    fetchProductSilent();
  }, [fetchProduct, fetchProductSilent]);



  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-transparent">
        <PageLoader />
      </div>
    );
  }

  if (!product) return null;

  const mediaList = product.media_urls && product.media_urls.length > 0 
    ? product.media_urls 
    : [{ url: product.image_url, type: 'image' }];
  const activeMedia = mediaList[activeMediaIndex] || mediaList[0];

  return (
    <div className="min-h-screen py-12" data-testid="product-detail-page">
      <div className="max-w-7xl mx-auto px-6 md:px-12 lg:px-24">
        <Button
          variant="ghost"
          onClick={() => navigate('/shop')}
          className="mb-8"
          data-testid="back-to-shop-button"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Shop
        </Button>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5 }}
            className="flex flex-col gap-4 md:flex-row md:items-start"
          >
            {/* Desktop Thumbnail Sidebar (visible on md and up) */}
            <div className="hidden md:flex flex-col gap-3 max-h-[500px] overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-slate-200">
              {mediaList.map((item, idx) => (
                <button
                  key={idx}
                  onClick={() => setActiveMediaIndex(idx)}
                  className={`w-16 h-16 rounded-lg overflow-hidden border-2 bg-secondary/20 transition-all flex-shrink-0 flex items-center justify-center relative ${
                    activeMediaIndex === idx 
                      ? 'border-primary shadow-md ring-2 ring-primary/10' 
                      : 'border-slate-200 hover:border-primary/30'
                  }`}
                >
                  {item.type === 'video' ? (
                    <div className="w-full h-full relative flex items-center justify-center bg-slate-950 text-white">
                      <video src={formatImageUrl(item.url)} className="w-full h-full object-cover opacity-60" muted playsInline />
                      <div className="absolute inset-0 flex items-center justify-center">
                        <div className="w-6 h-6 rounded-full bg-primary flex items-center justify-center shadow-sm">
                          <svg className="w-3.5 h-3.5 text-white fill-current translate-x-[1px]" viewBox="0 0 24 24">
                            <path d="M8 5v14l11-7z" />
                          </svg>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <img
                      src={formatImageUrl(item.url)}
                      alt=""
                      className="w-full h-full object-cover"
                    />
                  )}
                </button>
              ))}
            </div>

            {/* Main Interactive Media Box */}
            <div className="flex-1 flex flex-col gap-4">
              <div className="aspect-square w-full rounded-2xl overflow-hidden bg-secondary/20 border border-slate-100 shadow-lg relative group flex items-center justify-center">
                {activeMedia.type === 'video' ? (
                  <div className="w-full h-full bg-slate-950 flex items-center justify-center relative">
                    <video
                      key={activeMedia.url}
                      src={formatImageUrl(activeMedia.url)}
                      className="w-full h-full object-contain"
                      controls
                      autoPlay
                      muted
                      loop
                      playsInline
                    />
                  </div>
                ) : (
                  <div className="w-full h-full overflow-hidden relative cursor-zoom-in">
                    <img
                      src={formatImageUrl(activeMedia.url)}
                      alt={product.name}
                      className="w-full h-full object-cover transition-transform duration-500 ease-out origin-center group-hover:scale-150"
                      data-testid="product-detail-image"
                    />
                    <div className="absolute bottom-4 right-4 bg-white/80 backdrop-blur-md px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest text-slate-500 shadow-sm border border-slate-100/50">
                      Hover to zoom
                    </div>
                  </div>
                )}
                
                {/* Wishlist Heart Overlay on Image */}
                <button
                  onClick={handleToggleWishlist}
                  disabled={wishlisting}
                  className={`absolute top-4 left-4 p-2.5 rounded-full backdrop-blur-md transition-all shadow-md z-10 
                    ${isWishlisted 
                      ? 'bg-rose-500 text-white shadow-rose-200' 
                      : 'bg-white/80 text-slate-500 hover:text-rose-500 hover:bg-white'}`}
                >
                  <Heart className={`w-4 h-4 ${isWishlisted ? 'fill-current' : ''} ${wishlisting ? 'animate-pulse' : ''}`} />
                </button>
              </div>

              {/* Mobile Horizontal Carousel Indicators */}
              <div className="flex md:hidden items-center justify-between gap-4 mt-2">
                <div className="flex items-center gap-1.5 overflow-x-auto py-1 px-2 w-full justify-center scrollbar-none">
                  {mediaList.map((item, idx) => (
                    <button
                      key={idx}
                      onClick={() => setActiveMediaIndex(idx)}
                      className={`w-3 h-3 rounded-full transition-all border ${
                        activeMediaIndex === idx 
                          ? 'bg-primary w-6 border-primary' 
                          : 'bg-slate-300 border-transparent hover:bg-slate-400'
                      }`}
                    />
                  ))}
                </div>
                <span className="text-[10px] font-black text-slate-500 bg-slate-100 border border-slate-200/50 px-2.5 py-0.5 rounded-full shrink-0">
                  {activeMediaIndex + 1} / {mediaList.length}
                </span>
              </div>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5 }}
            className="flex flex-col"
          >
            <div className="mb-4 flex items-center gap-3">
              <span className="text-[10px] font-mono font-bold uppercase tracking-[0.15em] text-primary bg-primary/10 px-3.5 py-1.5 rounded border border-primary/20">
                {product.category}
              </span>
              {activeTag && (
                <span className={`text-[10px] font-mono font-bold uppercase tracking-[0.15em] px-3.5 py-1.5 rounded border border-border-subtle animate-pulse
                  ${activeTag === 'Best Seller' ? 'text-white bg-primary border-primary/30' : 
                    activeTag === 'Hot Deal' ? 'text-white bg-rose-600 border-rose-700/30' : 
                    'text-warning-orange bg-warning-orange/10 border-warning-orange/20'}`}>
                  {activeTag}
                </span>
              )}
            </div>

            <h1 className="text-4xl md:text-5xl font-bold tracking-tighter text-ink-slate mb-4 font-manrope" data-testid="product-detail-name">
              {product.name}
            </h1>

            <div className="flex items-center gap-4 mb-6">
              <span className="text-xs font-mono font-bold uppercase tracking-[0.12em] text-on-surface-variant bg-surface-container-low px-2.5 py-1 rounded border border-border-subtle">
                {product.size}
              </span>
              <span className="text-xs font-mono font-bold uppercase tracking-[0.12em] text-on-surface-variant bg-surface-container-low px-2.5 py-1 rounded border border-border-subtle">
                {product.thickness}
              </span>
            </div>

            <div className="mb-8 flex items-baseline gap-4">
              {product.discount_price > 0 && product.discount_price < product.price ? (
                <>
                  <span className="text-5xl font-black text-ink-slate font-manrope tracking-tight animate-in fade-in" data-testid="product-detail-price">
                    ₹{product.discount_price}
                  </span>
                  <span className="text-xl text-slate-400 line-through font-bold">M.R.P.: ₹{product.price}</span>
                  <span className="text-primary font-bold uppercase tracking-wider text-xs font-mono bg-primary/10 px-2 py-1 rounded border border-primary/20">
                    SAVE {Math.round(((product.price - product.discount_price) / product.price) * 100)}%
                  </span>
                </>
              ) : (
                <span className="text-5xl font-black text-ink-slate font-manrope tracking-tight" data-testid="product-detail-price">
                  ₹{product.price}
                </span>
              )}
            </div>

            <p className="text-base leading-relaxed text-on-surface-variant mb-8 font-medium">
              {product.description}
            </p>

            <div className="mb-8 border-t border-border-subtle pt-6">
              <h3 className="font-bold text-lg font-manrope text-ink-slate mb-4 uppercase tracking-wider text-sm font-label-caps">
                Key Features
              </h3>
              <ul className="space-y-3 font-inter">
                {product.features.map((feature, index) => (
                  <li key={index} className="flex items-start gap-2.5">
                    <Check className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                    <span className="text-sm font-semibold text-slate-700">{feature}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Cart Sync Logic */}
            {(() => {
              const cartItem = cart?.items?.find(item => item.product_id === product?.id);
              const cartQty = cartItem ? cartItem.quantity : 0;

              if (cartQty > 0) {
                return (
                  <div className="mb-6 flex flex-col gap-4 animate-in fade-in zoom-in-95 duration-300">
                    <label className="text-xs font-mono font-bold uppercase tracking-wider text-primary bg-primary/10 px-3 py-1 rounded border border-primary/25 w-max">
                      Item added to Cart ({cartQty} units)
                    </label>
                    <div className="flex items-center gap-4">
                      <Button
                        onClick={() => navigate('/cart')}
                        className="bg-primary hover:bg-emerald-hover text-white h-[52px] px-8 rounded-lg font-bold shadow-emerald-glow transition-all duration-200 active:scale-95 cursor-pointer text-base tracking-wide flex items-center gap-2"
                      >
                        <ShoppingCart className="w-5 h-5" />
                        GO TO CART
                      </Button>
                    </div>
                  </div>
                );
              }

              return (
                <>
                  <div className="mb-6 border-t border-border-subtle pt-6">
                    <label className="text-xs font-mono font-bold uppercase tracking-wider text-slate-400 mb-3 block">Quantity</label>
                    <div className="flex items-center gap-4 flex-wrap">
                      <Button
                        variant="outline"
                        onClick={() => {
                          const next = Math.max(0, quantity - 1);
                          setQuantity(next);
                          if (setPendingQty) setPendingQty(product.id, next);
                        }}
                        disabled={quantity <= 0}
                        className="w-12 h-12 p-0 rounded-lg flex items-center justify-center border border-border-subtle bg-white text-slate-700 hover:border-primary"
                        data-testid="decrease-quantity"
                      >
                        {quantity <= 1 ? <Trash2 className="w-4 h-4 text-slate-400" /> : <Minus className="w-4 h-4" />}
                      </Button>
                      <span className="text-xl font-bold w-12 text-center font-mono" data-testid="product-quantity">{quantity}</span>
                      <Button
                        variant="outline"
                        onClick={() => {
                          const next = Math.min(quantity + 1, Number(product.stock_quantity) || 999);
                          setQuantity(next);
                          if (setPendingQty) setPendingQty(product.id, next);
                        }}
                        disabled={quantity >= Number(product.stock_quantity)}
                        className="w-12 h-12 p-0 rounded-lg flex items-center justify-center border border-border-subtle bg-white text-slate-700 hover:border-primary"
                        data-testid="increase-quantity"
                      >
                        <Plus className="w-4 h-4" />
                      </Button>
                      {Number(product.stock_quantity) <= 10 && Number(product.stock_quantity) > 0 && (
                        <span className="flex items-center gap-1.5 text-xs font-bold text-rose-600 animate-pulse bg-rose-50 px-3 py-1 rounded border border-rose-100 font-mono tracking-wide">
                          <AlertTriangle className="w-4 h-4" />
                          ONLY {product.stock_quantity} LEFT
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex gap-4">
                    <Button
                      onClick={async () => {
                        try {
                          setAdding(true);
                          await addToCart(product.id, quantity);
                          toast.success('Added to cart!');
                        } catch (error) {
                          toast.error(error.message || 'Failed to add to cart');
                        } finally {
                          setAdding(false);
                        }
                      }}
                      disabled={adding || Number(product.stock_quantity) <= 0 || product.in_stock === false || quantity === 0}
                      className="flex-1 bg-primary hover:bg-emerald-hover text-white h-[52px] rounded-lg font-bold tracking-wider uppercase text-sm cursor-pointer shadow-sm"
                      data-testid="add-to-cart-detail-button"
                    >
                      {adding ? (
                        'ADDING...'
                      ) : (Number(product.stock_quantity) <= 0 || product.in_stock === false) ? (
                        'OUT OF STOCK'
                      ) : (
                        <>
                          <ShoppingCart className="w-4 h-4 mr-2" />
                          ADD TO CART
                        </>
                      )}
                    </Button>
                    <Button
                      variant="outline"
                      onClick={handleToggleWishlist}
                      disabled={wishlisting}
                      className={`w-[52px] h-[52px] p-0 rounded-lg flex items-center justify-center border transition-all cursor-pointer ${isWishlisted ? 'border-rose-500 text-rose-500 bg-rose-50' : 'border-border-subtle text-slate-400 hover:text-rose-500 hover:border-rose-300'}`}
                    >
                      <Heart className={`w-5 h-5 ${isWishlisted ? 'fill-current' : ''} ${wishlisting ? 'animate-pulse' : ''}`} />
                    </Button>
                  </div>
                </>
              );
            })()}

            {(Number(product.stock_quantity) <= 0 || product.in_stock === false) && (
              <p className="text-sm font-bold text-rose-600 mt-4 bg-rose-50 px-4 py-3.5 rounded border border-rose-100 uppercase tracking-wider text-center">This product is currently out of stock</p>
            )}
          </motion.div>
        </div>
      </div>
    </div>
  );
};

export default ProductDetail;