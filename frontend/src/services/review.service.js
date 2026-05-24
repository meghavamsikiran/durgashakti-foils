import apiClient from './core/apiClient';

const reviewService = {
  getProductReviews: async (productId, params = {}) => {
    const response = await apiClient.cachedGet(`/products/${productId}/reviews`, { params, ttl: 30000 });
    return response.data;
  },

  getEligibility: async (productId, orderId) => {
    const response = await apiClient.get('/reviews/eligibility', {
      params: { product_id: productId, order_id: orderId },
    });
    return response.data;
  },

  submitReview: async (formData) => {
    const response = await apiClient.post('/reviews', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    apiClient.invalidateCache('/products');
    apiClient.invalidateCache('/reviews');
    return response.data;
  },

  deleteReview: async (reviewId) => {
    const response = await apiClient.delete(`/reviews/${reviewId}`);
    apiClient.invalidateCache('/products');
    apiClient.invalidateCache('/reviews');
    return response.data;
  },
};

export default reviewService;
