import axios from 'axios';

const API_URL = process.env.REACT_APP_BACKEND_URL + '/api';

const getAuthHeader = () => {
  const token = localStorage.getItem('token');
  return token ? { Authorization: `Bearer ${token}` } : {};
};

export const api = {
  // Products
  getProducts: (params) => axios.get(`${API_URL}/products`, { params }),
  getProduct: (id) => axios.get(`${API_URL}/products/${id}`),
  
  // Orders
  createOrder: (data) => axios.post(`${API_URL}/orders`, data, { headers: getAuthHeader() }),
  getOrders: () => axios.get(`${API_URL}/orders`, { headers: getAuthHeader() }),
  getOrder: (id) => axios.get(`${API_URL}/orders/${id}`, { headers: getAuthHeader() }),
  cancelOrder: (id) => axios.post(`${API_URL}/orders/${id}/cancel`, {}, { headers: getAuthHeader() }),
  returnOrder: (id, formData) => axios.post(`${API_URL}/orders/${id}/return`, formData, { 
    headers: { ...getAuthHeader(), 'Content-Type': 'multipart/form-data' } 
  }),
  
  // Payment
  createRazorpayOrder: (orderId) => axios.post(`${API_URL}/payment/razorpay/create-order?order_id=${orderId}`, {}, { headers: getAuthHeader() }),
  verifyRazorpayPayment: (data) => axios.post(`${API_URL}/payment/razorpay/verify`, data, { headers: getAuthHeader() }),
  confirmCOD: (orderId) => axios.post(`${API_URL}/payment/cod/confirm?order_id=${orderId}`, {}, { headers: getAuthHeader() }),
  
  // Profile & User Data
  updateProfile: (data) => axios.put(`${API_URL}/auth/me`, data, { headers: getAuthHeader() }),
  getAddresses: () => axios.get(`${API_URL}/user/addresses`, { headers: getAuthHeader() }),
  addAddress: (data) => axios.post(`${API_URL}/user/addresses`, data, { headers: getAuthHeader() }),
  deleteAddress: (id) => axios.delete(`${API_URL}/user/addresses/${id}`, { headers: getAuthHeader() }),
  getWishlist: () => axios.get(`${API_URL}/user/wishlist`, { headers: getAuthHeader() }),
  toggleWishlist: (productId) => axios.post(`${API_URL}/user/wishlist/${productId}`, {}, { headers: getAuthHeader() }),
  getNotifications: () => axios.get(`${API_URL}/user/notifications`, { headers: getAuthHeader() }),
  markNotificationsRead: () => axios.put(`${API_URL}/user/notifications/read-all`, {}, { headers: getAuthHeader() }),
  getSavedCards: () => axios.get(`${API_URL}/user/cards`, { headers: getAuthHeader() }),
  addSavedCard: (data) => axios.post(`${API_URL}/user/cards`, data, { headers: getAuthHeader() }),
  
  // Auth
  changePassword: (data) => axios.post(`${API_URL}/auth/change-password`, data, { headers: getAuthHeader() }),
  seedProducts: () => axios.post(`${API_URL}/seed-products`),
};

export default api;