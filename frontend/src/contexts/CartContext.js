import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { useAuth } from './AuthContext';

const CartContext = createContext();

export const useCart = () => {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error('useCart must be used within CartProvider');
  }
  return context;
};

export const CartProvider = ({ children }) => {
  const [cart, setCart] = useState({ items: [] });
  const [loading, setLoading] = useState(false);
  const { token, user } = useAuth();

  const API_URL = process.env.REACT_APP_BACKEND_URL + '/api';

  const fetchCart = useCallback(async () => {
    if (!token) return;
    try {
      const response = await axios.get(`${API_URL}/cart`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setCart(response.data);
    } catch (error) {
      console.error('Error fetching cart:', error);
    }
  }, [token, API_URL]);

  const syncGuestCart = useCallback(async () => {
    const guestCart = JSON.parse(localStorage.getItem('ds_guest_cart') || '{"items":[]}');
    if (guestCart.items.length > 0 && token) {
      try {
        await axios.post(
          `${API_URL}/cart/bulk-sync`,
          guestCart.items,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        localStorage.removeItem('ds_guest_cart');
        await fetchCart();
      } catch (e) {
        console.error("Failed to sync guest cart", e);
      }
    }
  }, [token, API_URL, fetchCart]);

  useEffect(() => {
    if (token && user) {
      fetchCart();
      syncGuestCart();
    } else {
      const saved = localStorage.getItem('ds_guest_cart');
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          setCart(parsed);
        } catch (e) {
          setCart({ items: [] });
        }
      }
    }
  }, [token, user, fetchCart, syncGuestCart]);

  const addToCart = async (productId, quantity = 1) => {
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
      localStorage.setItem('ds_guest_cart', JSON.stringify(newCart));
      return;
    }

    setLoading(true);
    try {
      await axios.post(
        `${API_URL}/cart/add`,
        { product_id: productId, quantity },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      await fetchCart();
    } catch (error) {
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const updateCartItem = async (productId, quantity) => {
    if (!token) {
      const newItems = cart.items.map(i => i.product_id === productId ? {...i, quantity} : i);
      const newCart = { items: newItems };
      setCart(newCart);
      localStorage.setItem('ds_guest_cart', JSON.stringify(newCart));
      return;
    }

    setLoading(true);
    try {
      await axios.put(
        `${API_URL}/cart/update`,
        { product_id: productId, quantity },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      await fetchCart();
    } catch (error) {
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const removeFromCart = async (productId) => {
    if (!token) {
      const newItems = cart.items.filter(i => i.product_id !== productId);
      const newCart = { items: newItems };
      setCart(newCart);
      localStorage.setItem('ds_guest_cart', JSON.stringify(newCart));
      return;
    }

    setLoading(true);
    try {
      await axios.delete(`${API_URL}/cart/remove/${productId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      await fetchCart();
    } catch (error) {
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const clearCart = async () => {
    if (!token) {
      setCart({ items: [] });
      localStorage.removeItem('ds_guest_cart');
      return;
    }

    setLoading(true);
    try {
      await axios.delete(`${API_URL}/cart/clear`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setCart({ items: [] });
    } catch (error) {
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const cartItemCount = cart.items?.reduce((total, item) => total + item.quantity, 0) || 0;

  return (
    <CartContext.Provider
      value={{
        cart,
        loading,
        addToCart,
        updateCartItem,
        removeFromCart,
        clearCart,
        fetchCart,
        cartItemCount
      }}
    >
      {children}
    </CartContext.Provider>
  );
};