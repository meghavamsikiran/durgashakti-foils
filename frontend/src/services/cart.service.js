import apiClient from './core/apiClient';

const cartService = {
  getCart: async () => {
    const response = await apiClient.get('/cart');
    return response.data;
  },

  addToCart: async (productId, quantity) => {
    const response = await apiClient.post('/cart/add', { product_id: productId, quantity });
    return response.data;
  },

  updateCartItem: async (productId, quantity) => {
    const response = await apiClient.put('/cart/update', { product_id: productId, quantity });
    return response.data;
  },

  removeFromCart: async (productId) => {
    const response = await apiClient.delete(`/cart/remove/${productId}`);
    return response.data;
  },

  clearCart: async () => {
    const response = await apiClient.delete('/cart/clear');
    return response.data;
  },

  syncCart: async (items) => {
    const response = await apiClient.post('/cart/bulk-sync', items);
    return response.data;
  },
};

export default cartService;
