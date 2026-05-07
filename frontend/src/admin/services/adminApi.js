import axios from 'axios';

const BASE_URL = `${process.env.REACT_APP_BACKEND_URL}/api`;

const authHeaders = () => {
  const token = localStorage.getItem('token');
  return token ? { Authorization: `Bearer ${token}` } : {};
};

const client = axios.create({ baseURL: BASE_URL, timeout: 20000 });

client.interceptors.response.use(
  (response) => response,
  (error) => {
    const detail = error?.response?.data?.detail;
    let message = 'Request failed';
    if (Array.isArray(detail)) {
      message = detail.map((entry) => entry?.msg || entry?.type || 'Validation error').join(', ');
    } else if (typeof detail === 'string') {
      message = detail;
    }
    return Promise.reject(new Error(message));
  },
);

const adminApi = {
  getDashboardMetrics: async () => client.get('/admin/analytics/summary', { headers: authHeaders() }),
  getProducts: async (params) => {
    const response = await client.get('/products', { params, headers: authHeaders() });
    return response;
  },
  createProduct: (payload) => client.post('/admin/products/bulk', payload, { headers: authHeaders() }),
  updateProduct: (productId, payload) => client.put(`/admin/products/${productId}`, payload, { headers: authHeaders() }),
  deleteProduct: (productId) => client.delete(`/admin/products/${productId}`, { headers: authHeaders() }),
  uploadProductImage: async (file) => {
    const formData = new FormData();
    formData.append('file', file);
    return client.post('/admin/uploads/image', formData, {
      headers: { ...authHeaders(), 'Content-Type': 'multipart/form-data' },
    });
  },
  getInventory: async (params = {}) => {
    // Ensure limit doesn't exceed backend max of 100
    const limit = Math.min(params.limit || 20, 100);
    const response = await client.get('/products', { 
      params: { ...params, limit }, 
      headers: authHeaders() 
    });
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
  adjustInventory: async (productId, payload) =>
    client.post(`/admin/products/${productId}/inventory`, { delta: payload.delta_quantity }, { headers: authHeaders() }),
  getOrders: async (params) => {
    const response = await client.get('/admin/orders', { params, headers: authHeaders() });
    const items = (response.data.items || []).map((order) => ({
      ...order,
      status: (order.order_status || '').toUpperCase(),
    }));
    return { data: { ...response.data, items } };
  },
  updateOrderStatus: (orderId, payload) =>
    client.put(`/admin/orders/${orderId}/status`, payload, { headers: authHeaders() }),
  getCustomers: async (params) => {
    return client.get('/admin/customers', { params, headers: authHeaders() });
  },
  getPayments: async (params) => {
    return client.get('/admin/payments', { params, headers: authHeaders() });
  },
  importGST: async (formData) =>
    client.post('/admin/gst/import', formData, {
      headers: { ...authHeaders(), 'Content-Type': 'multipart/form-data' },
    }),
  getGSTImports: async () => client.get('/admin/gst/imports', { headers: authHeaders() }),
  getGSTRecords: async (params) => client.get('/admin/gst/reports', { params, headers: authHeaders() }),
  getAuditLogs: async (params) => client.get('/admin/audit-logs', { params, headers: authHeaders() }),
  seedSampleGST: async () => client.post('/admin/gst/seed-sample', {}, { headers: authHeaders() }),
  // Settings — now backed by real API
  getSettings: async () => client.get('/admin/settings', { headers: authHeaders() }),
  updateSetting: async (payload) => client.post('/admin/settings', payload, { headers: authHeaders() }),
  // Admin user management
  getAdminUsers: async () => client.get('/admin/admin-users', { headers: authHeaders() }),
  createAdminUser: async (payload) => client.post('/admin/admin-users', payload, { headers: authHeaders() }),
  updateAdminStatus: async (userId, isActive) =>
    client.put(`/admin/admin-users/${userId}/status`, { is_active: isActive }, { headers: authHeaders() }),
  updateAdminUser: async (userId, payload) =>
    client.put(`/admin/admin-users/${userId}`, payload, { headers: authHeaders() }),
  deleteAdminUser: async (userId) =>
    client.delete(`/admin/admin-users/${userId}`, { headers: authHeaders() }),
  resetAdminPassword: async (userId, newPassword) =>
    client.put(`/admin/admin-users/${userId}/reset-password`, { new_password: newPassword }, { headers: authHeaders() }),
  changePassword: async (payload) => client.post('/auth/change-password', payload, { headers: authHeaders() }),
  getMe: async () => client.get('/auth/me', { headers: authHeaders() }),
};

export default adminApi;
