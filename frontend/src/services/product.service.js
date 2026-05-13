import apiClient from './core/apiClient';

const productService = {
  getProducts: async (params) => {
    const response = await apiClient.get('/products', { params });
    return response.data;
  },

  getProduct: async (id) => {
    const response = await apiClient.get(`/products/${id}`);
    return response.data;
  },

  seedProducts: async () => {
    const response = await apiClient.post('/seed-products');
    return response.data;
  },
};

export default productService;
