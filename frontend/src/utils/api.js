/**
 * DEPRECATED: Use individual service modules from /services/ instead.
 * This file is kept for backward compatibility with pages that still import it.
 * All calls are now routed through the centralized apiClient with interceptors.
 */
import apiClient from '../services/core/apiClient';

export const api = {
  // Products
  getProducts: (params) => apiClient.get('/products', { params }),
  getProduct: (id) => apiClient.get(`/products/${id}`),
  
  // Orders
  createOrder: (data) => apiClient.post('/orders', data),
  getOrders: () => apiClient.get('/orders'),
  getOrder: (id) => apiClient.get(`/orders/${id}`),
  cancelOrder: (id) => apiClient.post(`/orders/${id}/cancel`),
  returnOrder: (id, formData) => apiClient.post(`/orders/${id}/return`, formData, { 
    headers: { 'Content-Type': 'multipart/form-data' } 
  }),
  
  // Payment
  createRazorpayOrder: (orderId) => apiClient.post(`/payment/razorpay/create-order?order_id=${orderId}`),
  verifyRazorpayPayment: (data) => apiClient.post('/payment/razorpay/verify', data),
  confirmCOD: (orderId) => apiClient.post(`/payment/cod/confirm?order_id=${orderId}`),
  
  // Profile & User Data
  updateProfile: (data) => apiClient.put('/auth/me', data),
  getAddresses: () => apiClient.get('/user/addresses'),
  addAddress: (data) => apiClient.post('/user/addresses', data),
  updateAddress: (id, data) => apiClient.put(`/user/addresses/${id}`, data),
  deleteAddress: (id) => apiClient.delete(`/user/addresses/${id}`),
  getWishlist: () => apiClient.get('/user/wishlist'),
  toggleWishlist: (productId) => apiClient.post(`/user/wishlist/${productId}`),
  getNotifications: () => apiClient.get('/user/notifications'),
  markNotificationsRead: () => apiClient.put('/user/notifications/read-all'),
  getSavedCards: () => apiClient.get('/user/cards'),
  addSavedCard: (data) => apiClient.post('/user/cards', data),
  
  // Auth
  changePassword: (data) => apiClient.post('/auth/change-password', data),
  seedProducts: () => apiClient.post('/seed-products'),
};

export const formatImageUrl = (url) => {
  if (!url) return '';
  if (url.startsWith('http://') || url.startsWith('https://')) return url;
  const backendUrl = process.env.REACT_APP_BACKEND_URL || 'https://durgashakti-foils-1.onrender.com';
  return `${backendUrl}${url.startsWith('/') ? '' : '/'}${url}`;
};

export default api;