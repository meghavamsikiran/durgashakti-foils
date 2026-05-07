import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ShoppingCart, Check, ArrowLeft } from 'lucide-react';
import { Button } from '../components/ui/button';
import { useCart } from '../contexts/CartContext';
import { useAuth } from '../contexts/AuthContext';
import { toast } from 'sonner';
import api from '../utils/api';

const ProductDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);
  const [quantity, setQuantity] = useState(1);
  const { addToCart } = useCart();
  const { user } = useAuth();

  useEffect(() => {
    fetchProduct();
  }, [id]);

  const fetchProduct = async () => {
    try {
      const response = await api.getProduct(id);
      setProduct(response.data);
    } catch (error) {
      toast.error('Product not found');
      navigate('/shop');
    } finally {
      setLoading(false);
    }
  };

  const handleAddToCart = async () => {
    if (!user) {
      toast.error('Please login to add items to cart');
      navigate('/login');
      return;
    }

    setAdding(true);
    try {
      await addToCart(product.id, quantity);
      toast.success('Added to cart!');
    } catch (error) {
      const message = error.response?.data?.detail || 'Failed to add to cart';
      toast.error(message);
    } finally {
      setAdding(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-muted-foreground">Loading...</p>
      </div>
    );
  }

  if (!product) return null;

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
          >
            <div className="aspect-square rounded-sm overflow-hidden bg-secondary/30 shadow-float">
              <img
                src={product.image_url}
                alt={product.name}
                className="w-full h-full object-cover"
                data-testid="product-detail-image"
              />
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5 }}
            className="flex flex-col"
          >
            <div className="mb-4">
              <span className="text-xs uppercase tracking-widest font-semibold text-muted-foreground">
                {product.category}
              </span>
            </div>

            <h1 className="text-4xl md:text-5xl font-bold tracking-tight mb-4" style={{ fontFamily: 'Manrope' }} data-testid="product-detail-name">
              {product.name}
            </h1>

            <div className="flex items-center gap-4 mb-6">
              <span className="text-xs uppercase tracking-widest font-semibold text-muted-foreground">
                {product.size}
              </span>
              <span className="text-xs uppercase tracking-widest font-semibold text-muted-foreground">
                {product.thickness}
              </span>
            </div>

            <div className="mb-8">
              <span className="text-4xl font-bold" style={{ fontFamily: 'Manrope' }} data-testid="product-detail-price">
                ₹{product.price}
              </span>
            </div>

            <p className="text-lg leading-relaxed text-muted-foreground mb-8">
              {product.description}
            </p>

            <div className="mb-8">
              <h3 className="font-semibold text-lg mb-4" style={{ fontFamily: 'Manrope' }}>
                Key Features
              </h3>
              <ul className="space-y-2">
                {product.features.map((feature, index) => (
                  <li key={index} className="flex items-start gap-2">
                    <Check className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                    <span className="text-sm">{feature}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="mb-6">
              <label className="text-sm font-semibold mb-2 block">Quantity</label>
              <div className="flex items-center gap-4">
                <Button
                  variant="outline"
                  onClick={() => setQuantity(Math.max(1, quantity - 1))}
                  disabled={quantity <= 1}
                  data-testid="decrease-quantity"
                >
                  -
                </Button>
                <span className="text-xl font-semibold w-12 text-center" data-testid="product-quantity">{quantity}</span>
                <Button
                  variant="outline"
                  onClick={() => setQuantity(Math.min(quantity + 1, Number(product.stock_quantity) || 999))}
                  disabled={quantity >= Number(product.stock_quantity)}
                  data-testid="increase-quantity"
                >
                  +
                </Button>
                {Number(product.stock_quantity) > 0 && (
                  <span className="text-sm text-muted-foreground">{product.stock_quantity} available</span>
                )}
              </div>
            </div>

            <div className="flex gap-4">
              <Button
                onClick={handleAddToCart}
                disabled={adding || Number(product.stock_quantity) <= 0 || product.in_stock === false}
                className="flex-1 bg-primary text-primary-foreground hover:bg-primary/90 h-12 rounded-sm font-semibold"
                data-testid="add-to-cart-detail-button"
              >
                {adding ? (
                  'Adding...'
                ) : (Number(product.stock_quantity) <= 0 || product.in_stock === false) ? (
                  'Out of Stock'
                ) : (
                  <>
                    <ShoppingCart className="w-4 h-4 mr-2" />
                    Add to Cart
                  </>
                )}
              </Button>
            </div>

            {(Number(product.stock_quantity) <= 0 || product.in_stock === false) && (
              <p className="text-sm text-destructive mt-4 font-semibold">This product is currently out of stock</p>
            )}
          </motion.div>
        </div>
      </div>
    </div>
  );
};

export default ProductDetail;