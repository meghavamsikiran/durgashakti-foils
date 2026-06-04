import apiClient from './core/apiClient';

const orderService = {
  createOrder: async (orderData) => {
    const response = await apiClient.post('/orders', orderData);
    apiClient.invalidateCache('/orders');
    apiClient.invalidateCache('/admin/orders');
    apiClient.invalidateCache('/admin/analytics/summary');
    return response.data;
  },

  getOrders: async (params, options = {}) => {
    const response = await apiClient.cachedGet('/orders', { params, ...options });
    return response.data;
  },

  getOrder: async (id) => {
    const response = await apiClient.cachedGet(`/orders/${id}`);
    return response.data;
  },

  cancelOrder: async (id) => {
    const response = await apiClient.post(`/orders/${id}/cancel`);
    apiClient.invalidateCache('/orders');
    apiClient.invalidateCache('/admin/orders');
    apiClient.invalidateCache('/admin/analytics/summary');
    return response.data;
  },

  returnOrder: async (id, formData) => {
    const response = await apiClient.post(`/orders/${id}/return`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    apiClient.invalidateCache('/orders');
    apiClient.invalidateCache('/admin/orders');
    apiClient.invalidateCache('/admin/analytics/summary');
    return response.data;
  },
};

export default orderService;
