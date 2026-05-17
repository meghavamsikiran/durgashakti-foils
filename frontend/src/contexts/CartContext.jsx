import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import apiClient from '../services/core/apiClient';
import { useAuth } from './AuthContext';

const CartContext = createContext(null);

export const useCart = () => {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error('useCart must be used within CartProvider');
  }
  return context;
};

const GUEST_CART_KEY = 'ds_guest_cart';

const getGuestCart = () => {
  try {
    return JSON.parse(localStorage.getItem(GUEST_CART_KEY) || '{"items":[]}');
  } catch {
    return { items: [] };
  }
};

const saveGuestCart = (cart) => {
  localStorage.setItem(GUEST_CART_KEY, JSON.stringify(cart));
};

export const CartProvider = ({ children }) => {
  const [cart, setCart] = useState({ items: [] });
  const [loading, setLoading] = useState(false);
  const { token, user } = useAuth();

  const fetchCart = useCallback(async () => {
    if (!token) return;
    try {
      const response = await apiClient.get('/cart');
      setCart(response.data || { items: [] });
    } catch (error) {
      console.error('Error fetching cart:', error);
    }
  }, [token]);

  const syncGuestCart = useCallback(async () => {
    const guestCart = getGuestCart();
    if (guestCart.items.length > 0 && token) {
      try {
        await apiClient.post('/cart/bulk-sync', guestCart.items);
        localStorage.removeItem(GUEST_CART_KEY);
        await fetchCart();
      } catch (e) {
        console.error("Failed to sync guest cart", e);
      }
    }
  }, [token, fetchCart]);

  useEffect(() => {
    if (token && user) {
      fetchCart();
      syncGuestCart();
    } else if (!token) {
      setCart(getGuestCart());
    }
  }, [token, user, fetchCart, syncGuestCart]);

  const addToCart = useCallback(async (productId, quantity = 1) => {
    if (!token) {
      const newItems = [...cart.items];
      const existing = newItems.find(i => i.product_id === productId);
      if (existing) {
        existing.quantity += quantity;
      } else {
        newItems.push({ product_id: productId, quantity });
      }
      const newCart = { items: newItems };
      setCart(newCart);
      saveGuestCart(newCart);
      return;
    }

    setLoading(true);
    try {
      await apiClient.post('/cart/add', { product_id: productId, quantity });
      await fetchCart();
    } catch (error) {
      throw error;
    } finally {
      setLoading(false);
    }
  }, [token, cart.items, fetchCart]);

  const updateCartItem = useCallback(async (productId, quantity) => {
    if (!token) {
      const newItems = cart.items.map(i =>
        i.product_id === productId ? { ...i, quantity } : i
      );
      const newCart = { items: newItems };
      setCart(newCart);
      saveGuestCart(newCart);
      return;
    }

    setLoading(true);
    try {
      await apiClient.put('/cart/update', { product_id: productId, quantity });
      await fetchCart();
    } catch (error) {
      throw error;
    } finally {
      setLoading(false);
    }
  }, [token, cart.items, fetchCart]);

  const removeFromCart = useCallback(async (productId) => {
    if (!token) {
      const newItems = cart.items.filter(i => i.product_id !== productId);
      const newCart = { items: newItems };
      setCart(newCart);
      saveGuestCart(newCart);
      return;
    }

    setLoading(true);
    try {
      await apiClient.delete(`/cart/remove/${productId}`);
      await fetchCart();
    } catch (error) {
      throw error;
    } finally {
      setLoading(false);
    }
  }, [token, cart.items, fetchCart]);

  const clearCart = useCallback(async () => {
    if (!token) {
      setCart({ items: [] });
      localStorage.removeItem(GUEST_CART_KEY);
      return;
    }

    setLoading(true);
    try {
      await apiClient.delete('/cart/clear');
      setCart({ items: [] });
    } catch (error) {
      throw error;
    } finally {
      setLoading(false);
    }
  }, [token]);

  const cartItemCount = useMemo(() =>
    cart.items?.reduce((total, item) => total + (item.quantity || 0), 0) || 0,
    [cart.items]
  );

  const value = useMemo(() => ({
    cart,
    loading,
    addToCart,
    updateCartItem,
    removeFromCart,
    clearCart,
    fetchCart,
    cartItemCount
  }), [cart, loading, addToCart, updateCartItem, removeFromCart, clearCart, fetchCart, cartItemCount]);

  return (
    <CartContext.Provider value={value}>
      {children}
    </CartContext.Provider>
  );
};