import React, { createContext, useContext, useState, useEffect, useCallback, useMemo, useRef } from 'react';
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
  const [pendingQty, setPendingQtyState] = useState({}); // productId -> qty preview before add
  const { token, user } = useAuth();
  const activeRequestsCount = useRef(0);

  // Called from PDP to preview qty in navbar badge live before adding to cart
  const setPendingQty = useCallback((productId, qty) => {
    setPendingQtyState(prev => ({ ...prev, [productId]: qty }));
  }, []);

  const fetchCart = useCallback(async () => {
    if (!token) return;
    try {
      const response = await apiClient.get('/cart');
      // Ignore background fetch responses if there are active, newer local state updates in progress
      if (activeRequestsCount.current === 0) {
        setCart(response.data || { items: [] });
      }
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
    let rollbackCart = null;
    
    setCart(prev => {
      rollbackCart = prev;
      const items = prev.items || [];
      const existingIdx = items.findIndex(i => i.product_id === productId);
      let newItems;
      if (existingIdx >= 0) {
        newItems = items.map((item, idx) =>
          idx === existingIdx ? { ...item, quantity: (item.quantity || 0) + quantity } : item
        );
      } else {
        newItems = [...items, { product_id: productId, quantity }];
      }
      const newCart = { ...prev, items: newItems };
      if (!token) {
        saveGuestCart(newCart);
      }
      return newCart;
    });

    if (!token) return;

    activeRequestsCount.current += 1;
    setLoading(true);
    try {
      await apiClient.post('/cart/add', { product_id: productId, quantity });
      activeRequestsCount.current -= 1;
      // Clear pending preview for this product once it's in cart
      setPendingQtyState(prev => { const n = { ...prev }; delete n[productId]; return n; });
      await fetchCart();
    } catch (error) {
      activeRequestsCount.current -= 1;
      if (rollbackCart) {
        setCart(rollbackCart);
      }
      throw error;
    } finally {
      setLoading(false);
    }
  }, [token, fetchCart]);

  const updateCartItem = useCallback(async (productId, quantity) => {
    let rollbackCart = null;

    setCart(prev => {
      rollbackCart = prev;
      const newItems = (prev.items || []).map(i =>
        i.product_id === productId ? { ...i, quantity } : i
      );
      const newCart = { ...prev, items: newItems };
      if (!token) {
        saveGuestCart(newCart);
      }
      return newCart;
    });

    if (!token) return;

    activeRequestsCount.current += 1;
    setLoading(true);
    try {
      await apiClient.put('/cart/update', { product_id: productId, quantity });
      activeRequestsCount.current -= 1;
      await fetchCart();
    } catch (error) {
      activeRequestsCount.current -= 1;
      if (rollbackCart) {
        setCart(rollbackCart);
      }
      throw error;
    } finally {
      setLoading(false);
    }
  }, [token, fetchCart]);

  const removeFromCart = useCallback(async (productId) => {
    let rollbackCart = null;

    setCart(prev => {
      rollbackCart = prev;
      const newItems = (prev.items || []).filter(i => i.product_id !== productId);
      const newCart = { ...prev, items: newItems };
      if (!token) {
        saveGuestCart(newCart);
      }
      return newCart;
    });

    if (!token) return;

    activeRequestsCount.current += 1;
    setLoading(true);
    try {
      await apiClient.delete(`/cart/remove/${productId}`);
      activeRequestsCount.current -= 1;
      await fetchCart();
    } catch (error) {
      activeRequestsCount.current -= 1;
      if (rollbackCart) {
        setCart(rollbackCart);
      }
      throw error;
    } finally {
      setLoading(false);
    }
  }, [token, fetchCart]);

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

  const cartItemCount = useMemo(() => {
    const cartTotal = cart.items?.reduce((total, item) => total + (item.quantity || 0), 0) || 0;
    // Add pending previews for products NOT yet in cart
    const pendingTotal = Object.entries(pendingQty).reduce((total, [productId, qty]) => {
      const alreadyInCart = cart.items?.some(i => i.product_id === Number(productId));
      return alreadyInCart ? total : total + qty;
    }, 0);
    return cartTotal + pendingTotal;
  }, [cart.items, pendingQty]);

  const value = useMemo(() => ({
    cart,
    loading,
    addToCart,
    updateCartItem,
    removeFromCart,
    clearCart,
    fetchCart,
    cartItemCount,
    setPendingQty
  }), [cart, loading, addToCart, updateCartItem, removeFromCart, clearCart, fetchCart, cartItemCount, setPendingQty]);

  return (
    <CartContext.Provider value={value}>
      {children}
    </CartContext.Provider>
  );
};