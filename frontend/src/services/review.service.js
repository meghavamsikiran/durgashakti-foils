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

  getAdminReviews: async (params = {}) => {
    const response = await apiClient.cachedGet('/admin/reviews', { params, ttl: 15000 });
    return response.data;
  },

  updateAdminReviewStatus: async (reviewId, status) => {
    const response = await apiClient.put(`/admin/reviews/${reviewId}/status`, { status });
    apiClient.invalidateCache('/admin/reviews');
    apiClient.invalidateCache('/products');
    return response.data;
  },

  replyToReview: async (reviewId, reply) => {
    const response = await apiClient.put(`/admin/reviews/${reviewId}/reply`, { reply });
    apiClient.invalidateCache('/admin/reviews');
    apiClient.invalidateCache('/products');
    return response.data;
  },

  deleteReviewReply: async (reviewId) => {
    const response = await apiClient.put(`/admin/reviews/${reviewId}/reply`, { reply: '' });
    apiClient.invalidateCache('/admin/reviews');
    apiClient.invalidateCache('/products');
    return response.data;
  },

  deleteAdminReview: async (reviewId) => {
    const response = await apiClient.delete(`/admin/reviews/${reviewId}`);
    apiClient.invalidateCache('/admin/reviews');
    apiClient.invalidateCache('/products');
    return response.data;
  },
};

export default reviewService;
