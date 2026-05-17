import apiClient from '../../services/core/apiClient';

/**
 * Admin API Service — uses centralized apiClient with interceptors.
 * All auth headers and error handling are managed by the interceptor layer.
 */
const adminService = {
  // Dashboard
  getDashboardMetrics: () => apiClient.get('/admin/analytics/summary'),

  // Products
  getProducts: (params) => apiClient.get('/products', { params }),
  createProduct: (payload) => apiClient.post('/admin/products/bulk', payload),
  updateProduct: (productId, payload) => apiClient.put(`/admin/products/${productId}`, payload),
  deleteProduct: (productId) => apiClient.delete(`/admin/products/${productId}`),
  uploadProductImage: async (file) => {
    const formData = new FormData();
    formData.append('file', file);
    return apiClient.post('/admin/uploads/image', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },

  // Inventory
  getInventory: async (params = {}) => {
    const limit = Math.min(params.limit || 20, 100);
    const response = await apiClient.get('/products', { params: { ...params, limit } });
    const rawItems = response.data.items || [];
    const items = rawItems.map((product) => ({
      id: product.id,
      name: product.name,
      sku: product.batch_no || product.variant_sku || '—',
      size: product.size || '—',
      stock_quantity: Number(product.stock_quantity || 0),
      units_sold: Number(product.units_sold || 0),
      low_stock_threshold: Number(product.low_stock_threshold || 20),
      in_stock: product.in_stock,
      price: product.price,
      image_url: product.image_url,
      category: product.category,
    }));
    return { data: { ...response.data, items } };
  },
  adjustInventory: (productId, payload) =>
    apiClient.post(`/admin/products/${productId}/inventory`, { delta: payload.delta_quantity }),

  // Orders
  getOrders: async (params) => {
    const response = await apiClient.get('/admin/orders', { params });
    const items = (response.data.items || []).map((order) => ({
      ...order,
      status: (order.order_status || '').toUpperCase(),
    }));
    return { data: { ...response.data, items } };
  },
  updateOrderStatus: (orderId, payload) =>
    apiClient.put(`/admin/orders/${orderId}/status`, payload),

  // Customers
  getCustomers: (params) => apiClient.get('/admin/customers', { params }),

  // Payments
  getPayments: (params) => apiClient.get('/admin/payments', { params }),

  // GST
  importGST: (formData) =>
    apiClient.post('/admin/gst/import', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }),
  getGSTImports: () => apiClient.get('/admin/gst/imports'),
  getGSTRecords: (params) => apiClient.get('/admin/gst/reports', { params }),
  seedSampleGST: () => apiClient.post('/admin/gst/seed-sample'),

  // Audit Logs
  getAuditLogs: (params) => apiClient.get('/admin/audit-logs', { params }),

  // Settings
  getSettings: () => apiClient.get('/admin/settings'),
  updateSetting: (payload) => apiClient.post('/admin/settings', payload),

  // Admin User Management
  getAdminUsers: () => apiClient.get('/admin/admin-users'),
  createAdminUser: (payload) => apiClient.post('/admin/admin-users', payload),
  updateAdminStatus: (userId, isActive) =>
    apiClient.put(`/admin/admin-users/${userId}/status`, { is_active: isActive }),
  updateAdminUser: (userId, payload) =>
    apiClient.put(`/admin/admin-users/${userId}`, payload),
  deleteAdminUser: (userId) =>
    apiClient.delete(`/admin/admin-users/${userId}`),
  resetAdminPassword: (userId, newPassword) =>
    apiClient.put(`/admin/admin-users/${userId}/reset-password`, { new_password: newPassword }),

  // Auth
  changePassword: (payload) => apiClient.post('/auth/change-password', payload),
  getMe: () => apiClient.get('/auth/me'),
};

export default adminService;
