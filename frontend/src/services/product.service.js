import apiClient from './core/apiClient';

const productService = {
  getProducts: async (params) => {
    const response = await apiClient.cachedGet('/products', { params });
    return response.data;
  },

  getProduct: async (id) => {
    const response = await apiClient.cachedGet(`/products/${id}`);
    return response.data;
  },

  seedProducts: async () => {
    const response = await apiClient.post('/seed-products');
    apiClient.invalidateCache('/products');
    return response.data;
  },
};

export default productService;

