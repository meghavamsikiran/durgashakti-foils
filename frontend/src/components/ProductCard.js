import React from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { ShoppingCart } from 'lucide-react';
import { Button } from './ui/button';
import { useCart } from '../contexts/CartContext';
import { useAuth } from '../contexts/AuthContext';
import { toast } from 'sonner';

const ProductCard = ({ product }) => {
  const navigate = useNavigate();
  const { addToCart } = useCart();
  const { user } = useAuth();
  const [loading, setLoading] = React.useState(false);

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
          <span className="text-2xl font-bold" style={{ fontFamily: 'Manrope' }} data-testid="product-price">
            ₹{product.price}
          </span>
          
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