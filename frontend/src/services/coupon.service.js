import apiClient from './core/apiClient';

const cachedGet = (url, options) => apiClient.cachedGet(url, options);
const invalidateCache = (urlPrefix) => apiClient.invalidateCache(urlPrefix);

const couponService = {
  // Customer Side
  validateCoupons: async (codes, subtotal) => {
    const response = await apiClient.post('/coupons/validate', {
      codes,
      cart_subtotal: subtotal
    });
    return response.data;
  },

  getEligibleCoupons: async () => {
    const response = await apiClient.get('/coupons/eligible', { silent: true });
    return response.data;
  },

  // Admin CRUD
  getCoupons: async (params = {}) => {
    const response = await cachedGet('/admin/coupons', { params });
    return response.data;
  },
  
  getCoupon: async (couponId) => {
    const response = await cachedGet(`/admin/coupons/${couponId}`);
    return response.data;
  },
  
  createCoupon: async (payload) => {
    invalidateCache('/admin/coupons');
    invalidateCache('/settings/public');
    invalidateCache('/admin/settings');
    const response = await apiClient.post('/admin/coupons', payload);
    return response.data;
  },
  
  updateCoupon: async (couponId, payload) => {
    invalidateCache('/admin/coupons');
    invalidateCache('/settings/public');
    invalidateCache('/admin/settings');
    const response = await apiClient.put(`/admin/coupons/${couponId}`, payload);
    return response.data;
  },
  
  deleteCoupon: async (couponId) => {
    invalidateCache('/admin/coupons');
    invalidateCache('/settings/public');
    invalidateCache('/admin/settings');
    const response = await apiClient.delete(`/admin/coupons/${couponId}`);
    return response.data;
  },

  getLoyalCustomers: async (params = {}) => {
    const response = await cachedGet('/admin/coupons/loyal-customers', { params, ttl: 15000, silent: true });
    return response.data;
  },

  getAnalytics: async () => {
    const response = await cachedGet('/admin/coupons/analytics', { ttl: 30000 });
    return response.data;
  },

  // Global Settings
  getSettings: async () => {
    const response = await cachedGet('/admin/coupons/settings');
    return response.data;
  },
  
  updateSettings: async (payload) => {
    invalidateCache('/admin/coupons/settings');
    invalidateCache('/settings/public'); // invalidate public settings as well if they include coupons
    const response = await apiClient.post('/admin/coupons/settings', payload);
    return response.data;
  }
};

export default couponService;
