import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Trash2, Plus, Minus, ShoppingBag } from 'lucide-react';
import { Button } from '../components/ui/button';
import { useCart } from '../contexts/CartContext';
import { toast } from 'sonner';
import api, { formatImageUrl } from '../utils/api';
import PageLoader from '../components/ui/PageLoader';

const Cart = () => {
  const navigate = useNavigate();
  const { cart, updateCartItem, removeFromCart, loading } = useCart();
  const [products, setProducts] = useState({});
  const [loadingProducts, setLoadingProducts] = useState(true);

  useEffect(() => {
    fetchProducts();
  }, []);

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
      const message = error.response?.data?.detail || 'Failed to update quantity';
      toast.error(message);
    }
  };

  const handleRemove = async (productId) => {
    try {
      await removeFromCart(productId);
      toast.success('Item removed from cart');
    } catch (error) {
      toast.error('Failed to remove item');
    }
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

  return (
    <div className="min-h-screen py-12" data-testid="cart-page">
      <div className="max-w-7xl mx-auto px-6 md:px-12 lg:px-24">
        <h1 className="text-4xl md:text-5xl font-bold tracking-tight mb-8" style={{ fontFamily: 'Manrope' }} data-testid="cart-title">
          Shopping Cart
        </h1>

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
                {cart.items.map((item, index) => {
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
                          <p className="text-xl font-bold" style={{ fontFamily: 'Manrope' }}>
                            ₹{product.price}
                          </p>
                        </div>

                        <div className="flex flex-col items-end justify-between">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleRemove(item.product_id)}
                            disabled={loading}
                            data-testid={`remove-item-${product.id}`}
                          >
                            <Trash2 className="w-4 h-4 text-destructive" />
                          </Button>

                          <div className="flex items-center gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleUpdateQuantity(item.product_id, item.quantity - 1)}
                              disabled={loading || item.quantity <= 1}
                              data-testid={`decrease-quantity-${product.id}`}
                            >
                              <Minus className="w-3 h-3" />
                            </Button>
                            <span className="w-8 text-center font-semibold" data-testid={`cart-item-quantity-${product.id}`}>
                              {item.quantity}
                            </span>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleUpdateQuantity(item.product_id, item.quantity + 1)}
                              disabled={loading}
                              data-testid={`increase-quantity-${product.id}`}
                            >
                              <Plus className="w-3 h-3" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            </div>

            <div className="lg:col-span-1">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-secondary/30 border border-border/50 rounded-sm p-6 sticky top-24"
              >
                <h2 className="text-2xl font-bold mb-6" style={{ fontFamily: 'Manrope' }}>
                  Order Summary
                </h2>

                <div className="space-y-4 mb-6">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Subtotal</span>
                    <span className="font-semibold" data-testid="cart-subtotal">₹{total.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Shipping</span>
                    <span className="font-semibold">FREE</span>
                  </div>
                  <div className="border-t border-border/50 pt-4 flex justify-between">
                    <span className="text-lg font-semibold">Total</span>
                    <span className="text-2xl font-bold" style={{ fontFamily: 'Manrope' }} data-testid="cart-total">
                      ₹{total.toFixed(2)}
                    </span>
                  </div>
                </div>

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
    </div>
  );
};

export default Cart;