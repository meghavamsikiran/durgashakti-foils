import apiClient from '../../services/core/apiClient';

const cachedGet = (url, options) => apiClient.cachedGet(url, options);
const invalidateCache = (urlPrefix) => apiClient.invalidateCache(urlPrefix);

/**
 * Admin API Service — uses centralized apiClient with interceptors.
 * All auth headers and error handling are managed by the interceptor layer.
 * GET requests are cached for instant tab switching.
 */
const adminService = {
  // Synchronous Cache Lookup
  getCached: (url, params) => apiClient.getCachedDataSync(url, params),

  // Dashboard
  getDashboardMetrics: (timeframe, params = {}) => cachedGet('/admin/analytics/summary', { params: { timeframe, ...params } }),

  // Products
  getProducts: (params) => cachedGet('/admin/products', { params }),
  createProduct: (payload) => {
    invalidateCache('/products');
    invalidateCache('/admin/products');
    return apiClient.post('/admin/products/bulk', payload);
  },
  updateProduct: (productId, payload) => {
    invalidateCache('/products');
    invalidateCache('/admin/products');
    return apiClient.put(`/admin/products/${productId}`, payload);
  },
  deleteProduct: (productId) => {
    invalidateCache('/products');
    invalidateCache('/admin/products');
    return apiClient.delete(`/admin/products/${productId}`);
  },
  toggleProductStatus: (productId, isActive) => {
    invalidateCache('/products');
    invalidateCache('/admin/products');
    return apiClient.put(`/admin/products/${productId}/status`, { is_active: isActive });
  },
  uploadProductImage: async (file) => {
    const formData = new FormData();
    formData.append('file', file);
    return apiClient.post('/admin/uploads/image', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },
  uploadProductMedia: async (file) => {
    const formData = new FormData();
    formData.append('file', file);
    return apiClient.post('/admin/uploads/media', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },

  // Inventory
  getInventory: async (params = {}) => {
    const limit = Math.min(params.limit || 20, 100);
    const response = await cachedGet('/admin/products', { params: { ...params, limit } });
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
      is_active: product.is_active,
    }));
    return { data: { ...response.data, items } };
  },
  adjustInventory: (productId, payload) => {
    invalidateCache('/products');
    invalidateCache('/admin/products');
    return apiClient.post(`/admin/products/${productId}/inventory`, { delta: payload.delta_quantity });
  },

  getOrders: async (params) => {
    const response = await cachedGet('/admin/orders', { params });
    const items = (response.data.items || []).map((order) => ({
      ...order,
      status: (order.order_status || '').toUpperCase(),
    }));
    return { data: { ...response.data, items } };
  },
  getOrderDetails: (orderId) => apiClient.get(`/admin/orders/${orderId}`),
  updateOrderStatus: (orderId, payload) => {
    invalidateCache('/admin/orders');
    return apiClient.put(`/admin/orders/${orderId}/status`, payload, { silent: true, timeout: 120000 });
  },
  retryRefund: (orderId) => {
    invalidateCache('/admin/orders');
    return apiClient.put(`/admin/orders/${orderId}/refund-retry`, {}, { silent: true, timeout: 120000 });
  },
  bulkShipOrders: (payload) => {
    invalidateCache('/admin/orders');
    return apiClient.post('/admin/orders/bulk-ship', payload);
  },

  // Customers
  getCustomers: (params) => cachedGet('/admin/customers', { params }),
  getCustomerDetails: (customerId) => cachedGet(`/admin/customers/${customerId}`),

  // Payments
  getPayments: (params) => cachedGet('/admin/payments', { params }),

  // Audit Logs
  getAuditLogs: (params) => cachedGet('/admin/audit-logs', { params }),
  exportAuditLogs: () => apiClient.get('/admin/audit-logs/export', { responseType: 'blob', timeout: 180000, silent: true, headers: { Accept: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' } }),

  // Settings
  getSettings: (options = {}) => cachedGet('/admin/settings', options),
  updateSetting: (payload) => {
    invalidateCache('/admin/settings');
    invalidateCache('/settings/public');
    return apiClient.post('/admin/settings', payload);
  },

  // Admin User Management
  getAdminUsers: () => cachedGet('/superadmin/admins'),
  createAdminUser: (payload) => {
    invalidateCache('/superadmin/admins');
    return apiClient.post('/superadmin/admins', payload);
  },
  updateAdminStatus: (userId, isActive) => {
    invalidateCache('/superadmin/admins');
    return apiClient.put(`/superadmin/admins/${userId}/status`, { is_active: isActive });
  },
  updateAdminUser: (userId, payload) => {
    invalidateCache('/superadmin/admins');
    return apiClient.put(`/superadmin/admins/${userId}`, payload);
  },
  deleteAdminUser: (userId) => {
    invalidateCache('/superadmin/admins');
    return apiClient.delete(`/superadmin/admins/${userId}`);
  },
  resetAdminPassword: (userId, newPassword) =>
    apiClient.put(`/superadmin/admins/${userId}/reset-password`, { new_password: newPassword }),

  // Categories
  getCategories: () => cachedGet('/admin/categories'),
  createCategory: (payload) => {
    invalidateCache('/admin/categories');
    invalidateCache('/categories');
    return apiClient.post('/admin/categories', payload);
  },
  updateCategory: (categoryId, payload) => {
    invalidateCache('/admin/categories');
    invalidateCache('/categories');
    return apiClient.put(`/admin/categories/${categoryId}`, payload);
  },
  deleteCategory: (categoryId) => {
    invalidateCache('/admin/categories');
    invalidateCache('/categories');
    return apiClient.delete(`/admin/categories/${categoryId}`);
  },
  getPublicCategories: () => cachedGet('/categories'),

  // Auth
  changePassword: (payload) => apiClient.post('/auth/change-password', payload),
  getMe: () => cachedGet('/auth/me'),
  updateProfile: (payload) => {
    invalidateCache('/auth/me');
    return apiClient.put('/auth/me', payload);
  },
};

export default adminService;
