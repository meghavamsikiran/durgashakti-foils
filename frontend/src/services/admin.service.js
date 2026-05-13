import apiClient from './core/apiClient';

const adminService = {
  getDashboardMetrics: async () => {
    const response = await apiClient.get('/admin/analytics/summary');
    return response.data;
  },

  getProducts: async (params) => {
    const response = await apiClient.get('/products', { params });
    return response.data;
  },

  createProduct: async (payload) => {
    const response = await apiClient.post('/admin/products/bulk', payload);
    return response.data;
  },

  updateProduct: async (productId, payload) => {
    const response = await apiClient.put(`/admin/products/${productId}`, payload);
    return response.data;
  },

  deleteProduct: async (productId) => {
    const response = await apiClient.delete(`/admin/products/${productId}`);
    return response.data;
  },

  uploadProductImage: async (file) => {
    const formData = new FormData();
    formData.append('file', file);
    const response = await apiClient.post('/admin/uploads/image', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return response.data;
  },

  getOrders: async (params) => {
    const response = await apiClient.get('/admin/orders', { params });
    return response.data;
  },

  updateOrderStatus: async (orderId, status) => {
    const response = await apiClient.put(`/admin/orders/${orderId}/status`, { status });
    return response.data;
  },

  getCustomers: async (params) => {
    const response = await apiClient.get('/admin/customers', { params });
    return response.data;
  },

  getPayments: async (params) => {
    const response = await apiClient.get('/admin/payments', { params });
    return response.data;
  },

  importGST: async (formData) => {
    const response = await apiClient.post('/admin/gst/import', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return response.data;
  },

  getGSTRecords: async (params) => {
    const response = await apiClient.get('/admin/gst/reports', { params });
    return response.data;
  },

  getAuditLogs: async (params) => {
    const response = await apiClient.get('/admin/audit-logs', { params });
    return response.data;
  },

  getSettings: async () => {
    const response = await apiClient.get('/admin/settings');
    return response.data;
  },

  updateSetting: async (payload) => {
    const response = await apiClient.post('/admin/settings', payload);
    return response.data;
  },

  getAdminUsers: async () => {
    const response = await apiClient.get('/admin/admin-users');
    return response.data;
  },

  createAdminUser: async (payload) => {
    const response = await apiClient.post('/admin/admin-users', payload);
    return response.data;
  },

  updateAdminUser: async (userId, payload) => {
    const response = await apiClient.put(`/admin/admin-users/${userId}`, payload);
    return response.data;
  },

  deleteAdminUser: async (userId) => {
    const response = await apiClient.delete(`/admin/admin-users/${userId}`);
    return response.data;
  },
};

export default adminService;
