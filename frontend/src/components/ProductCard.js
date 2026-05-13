import React from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { ShoppingCart, Heart } from 'lucide-react';
import { Button } from './ui/button';
import { useCart } from '../contexts/CartContext';
import { useAuth } from '../contexts/AuthContext';
import { toast } from 'sonner';
import api from '../utils/api';

const ProductCard = ({ product }) => {
  const navigate = useNavigate();
  const { addToCart } = useCart();
  const { user, refreshUser } = useAuth();
  const [loading, setLoading] = React.useState(false);
  const [wishlisting, setWishlisting] = React.useState(false);

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

    setLoading(true);
    try {
      await addToCart(product.id, 1);
      toast.success('Added to cart!');
    } catch (error) {
      const message = error.response?.data?.detail || 'Failed to add to cart';
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <motion.div
      whileHover={{ y: -5 }}
      transition={{ duration: 0.2 }}
      className="group relative overflow-hidden bg-card border border-border/50 rounded-sm hover:border-primary/50 transition-colors cursor-pointer"
      onClick={() => navigate(`/product/${product.id}`)}
      data-testid={`product-card-${product.id}`}
    >
      <div className="aspect-square overflow-hidden bg-secondary/30 relative">
        <img
          src={product.image_url}
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
              : 'bg-white/80 text-slate-400 hover:text-rose-500 hover:bg-white'}`}
          data-testid="wishlist-toggle"
        >
          <Heart className={`w-4 h-4 ${isWishlisted ? 'fill-current' : ''} ${wishlisting ? 'animate-pulse' : ''}`} />
        </button>

        {/* Badge Tag */}
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
          <div className="absolute bottom-3 left-3 bg-rose-600 text-white px-2 py-0.5 text-[10px] font-black rounded-sm z-10">
            -{Math.round(((product.price - product.discount_price) / product.price) * 100)}%
          </div>
        )}

        {(Number(product.stock_quantity) <= 0 || product.in_stock === false) && (
          <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
            <span className="bg-red-600 text-white px-4 py-2 text-sm font-semibold rounded">Out of Stock</span>
          </div>
        )}
      </div>

      <div className="p-6">
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

        <div className="flex items-center justify-between">
          <div className="flex flex-col">
            {product.discount_price > 0 && product.discount_price < product.price ? (
              <>
                <span className="text-2xl font-bold text-slate-900" style={{ fontFamily: 'Manrope' }} data-testid="product-price">
                  ₹{product.discount_price}
                </span>
                <span className="text-xs text-slate-400 line-through">₹{product.price}</span>
              </>
            ) : (
              <span className="text-2xl font-bold text-slate-900" style={{ fontFamily: 'Manrope' }} data-testid="product-price">
                ₹{product.price}
              </span>
            )}
          </div>
          
          <Button
            onClick={handleAddToCart}
            disabled={loading || Number(product.stock_quantity) <= 0 || product.in_stock === false}
            className="bg-primary text-primary-foreground hover:bg-primary/90 h-10 px-6 rounded-sm font-semibold transition-transform active:scale-95"
            data-testid="add-to-cart-button"
          >
            {loading ? (
              'Adding...'
            ) : (Number(product.stock_quantity) <= 0 || product.in_stock === false) ? (
              'Out of Stock'
            ) : (
              <>
                <ShoppingCart className="w-4 h-4 mr-2" />
                Add
              </>
            )}
          </Button>
        </div>
      </div>
    </motion.div>
  );
};

export default ProductCard;