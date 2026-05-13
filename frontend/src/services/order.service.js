import apiClient from './core/apiClient';

const orderService = {
  createOrder: async (orderData) => {
    const response = await apiClient.post('/orders', orderData);
    return response.data;
  },

  getOrders: async (params) => {
    const response = await apiClient.get('/orders', { params });
    return response.data;
  },

  getOrder: async (id) => {
    const response = await apiClient.get(`/orders/${id}`);
    return response.data;
  },

  cancelOrder: async (id) => {
    const response = await apiClient.post(`/orders/${id}/cancel`);
    return response.data;
  },

  returnOrder: async (id, formData) => {
    const response = await apiClient.post(`/orders/${id}/return`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return response.data;
  },
};

export default orderService;
