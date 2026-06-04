/**
 * DEPRECATED: Use individual service modules from /services/ instead.
 * This file is kept for backward compatibility with pages that still import it.
 * All calls are now routed through the centralized apiClient with interceptors.
 */
import apiClient from '../services/core/apiClient';

export const api = {
  // Products
  getProducts: (params) => apiClient.cachedGet('/products', { params }),
  getProduct: (id) => apiClient.cachedGet(`/products/${id}`),
  
  // Orders
  createOrder: async (data) => {
    const res = await apiClient.post('/orders', data);
    apiClient.invalidateCache('/orders');
    return res;
  },
  getOrders: () => apiClient.cachedGet('/orders'),
  getOrder: (id) => apiClient.cachedGet(`/orders/${id}`),
  cancelOrder: async (id) => {
    const res = await apiClient.post(`/orders/${id}/cancel`);
    apiClient.invalidateCache('/orders');
    return res;
  },
  returnOrder: async (id, formData) => {
    const res = await apiClient.post(`/orders/${id}/return`, formData, { 
      headers: { 'Content-Type': 'multipart/form-data' } 
    });
    apiClient.invalidateCache('/orders');
    return res;
  },
  
  // Payment
  createRazorpayOrder: (orderId) => apiClient.post(`/payment/razorpay/create-order?order_id=${orderId}`, null, { timeout: 90000 }),
  verifyRazorpayPayment: async (data) => {
    const res = await apiClient.post('/payment/razorpay/verify', data, { timeout: 90000 });
    apiClient.invalidateCache('/cart');
    apiClient.invalidateCache('/orders');
    return res;
  },
  confirmCOD: (orderId) => apiClient.post(`/payment/cod/confirm?order_id=${orderId}`),
  
  // Profile & User Data
  updateProfile: async (data) => {
    const res = await apiClient.put('/auth/me', data);
    apiClient.invalidateCache('/auth/me');
    return res;
  },
  getAddresses: () => apiClient.cachedGet('/user/addresses'),
  addAddress: async (data) => {
    const res = await apiClient.post('/user/addresses', data);
    apiClient.invalidateCache('/user/addresses');
    return res;
  },
  updateAddress: async (id, data) => {
    const res = await apiClient.put(`/user/addresses/${id}`, data);
    apiClient.invalidateCache('/user/addresses');
    return res;
  },
  deleteAddress: async (id) => {
    const res = await apiClient.delete(`/user/addresses/${id}`);
    apiClient.invalidateCache('/user/addresses');
    return res;
  },
  getWishlist: () => apiClient.cachedGet('/user/wishlist'),
  toggleWishlist: async (productId) => {
    const res = await apiClient.post(`/user/wishlist/${productId}`);
    apiClient.invalidateCache('/user/wishlist');
    return res;
  },
  clearWishlist: async () => {
    const res = await apiClient.delete('/user/wishlist');
    apiClient.invalidateCache('/user/wishlist');
    return res;
  },
  getNotifications: () => apiClient.cachedGet('/user/notifications'),
  markNotificationsRead: async () => {
    const res = await apiClient.put('/user/notifications/read-all');
    apiClient.invalidateCache('/user/notifications');
    return res;
  },
  getSavedCards: () => apiClient.cachedGet('/user/cards'),
  addSavedCard: async (data) => {
    const res = await apiClient.post('/user/cards', data);
    apiClient.invalidateCache('/user/cards');
    return res;
  },
  
  // Auth
  changePassword: (data) => apiClient.post('/auth/change-password', data),
  seedProducts: async () => {
    const res = await apiClient.post('/seed-products');
    apiClient.invalidateCache('/products');
    return res;
  },
};

export const formatImageUrl = (url) => {
  if (!url) return '';
  if (url.startsWith('http://') || url.startsWith('https://')) return url;
  if (url.startsWith('/uploads/') || url.startsWith('uploads/')) {
    return url.startsWith('/') ? url : `/${url}`;
  }
  const backendUrl = process.env.REACT_APP_BACKEND_URL || 'https://durgashakti-foils-1.onrender.com';
  return `${backendUrl}${url.startsWith('/') ? '' : '/'}${url}`;
};

export default api;
