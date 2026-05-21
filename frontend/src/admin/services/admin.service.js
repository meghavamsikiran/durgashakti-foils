import apiClient from '../../services/core/apiClient';

/**
 * Simple in-memory cache for GET requests.
 * - On first call: fetches from server, stores result, returns it.
 * - On subsequent calls within TTL: returns cached data instantly,
 *   then refreshes in the background (stale-while-revalidate).
 */
const cache = new Map();
const CACHE_TTL = 60000; // 60 seconds

const cachedGet = async (url, options = {}) => {
  const key = url + JSON.stringify(options.params || {});
  const entry = cache.get(key);
  const now = Date.now();

  if (entry && (now - entry.time < CACHE_TTL)) {
    // Return cached data immediately, refresh in background
    apiClient.get(url, { ...options, silent: true })
      .then(res => cache.set(key, { data: res, time: Date.now() }))
      .catch(() => {});
    return entry.data;
  }

  const res = await apiClient.get(url, options);
  cache.set(key, { data: res, time: now });
  return res;
};

const invalidateCache = (urlPrefix) => {
  for (const key of cache.keys()) {
    if (key.startsWith(urlPrefix)) cache.delete(key);
  }
};

/**
 * Admin API Service — uses centralized apiClient with interceptors.
 * All auth headers and error handling are managed by the interceptor layer.
 * GET requests are cached for instant tab switching.
 */
const adminService = {
  // Dashboard
  getDashboardMetrics: (timeframe) => cachedGet('/admin/analytics/summary', { params: { timeframe } }),

  // Products
  getProducts: (params) => cachedGet('/products', { params }),
  createProduct: (payload) => {
    invalidateCache('/products');
    return apiClient.post('/admin/products/bulk', payload);
  },
  updateProduct: (productId, payload) => {
    invalidateCache('/products');
    return apiClient.put(`/admin/products/${productId}`, payload);
  },
  deleteProduct: (productId) => {
    invalidateCache('/products');
    return apiClient.delete(`/admin/products/${productId}`);
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
    const response = await cachedGet('/products', { params: { ...params, limit } });
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
  adjustInventory: (productId, payload) => {
    invalidateCache('/products');
    return apiClient.post(`/admin/products/${productId}/inventory`, { delta: payload.delta_quantity });
  },

  // Orders
  getOrders: async (params) => {
    const response = await cachedGet('/admin/orders', { params });
    const items = (response.data.items || []).map((order) => ({
      ...order,
      status: (order.order_status || '').toUpperCase(),
    }));
    return { data: { ...response.data, items } };
  },
  updateOrderStatus: (orderId, payload) => {
    invalidateCache('/admin/orders');
    return apiClient.put(`/admin/orders/${orderId}/status`, payload);
  },

  // Customers
  getCustomers: (params) => cachedGet('/admin/customers', { params }),

  // Payments
  getPayments: (params) => cachedGet('/admin/payments', { params }),

  // GST
  importGST: (formData) => {
    invalidateCache('/admin/gst');
    return apiClient.post('/admin/gst/import', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },
  getGSTImports: () => cachedGet('/admin/gst/imports'),
  getGSTRecords: (params) => cachedGet('/admin/gst/reports', { params }),
  seedSampleGST: () => {
    invalidateCache('/admin/gst');
    return apiClient.post('/admin/gst/seed-sample');
  },

  // Audit Logs
  getAuditLogs: (params) => cachedGet('/admin/audit-logs', { params }),

  // Settings
  getSettings: () => cachedGet('/admin/settings'),
  updateSetting: (payload) => {
    invalidateCache('/admin/settings');
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

  // Auth
  changePassword: (payload) => apiClient.post('/auth/change-password', payload),
  getMe: () => cachedGet('/auth/me'),
};

export default adminService;
