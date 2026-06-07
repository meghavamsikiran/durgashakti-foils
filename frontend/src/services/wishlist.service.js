import apiClient from './core/apiClient';

const wishlistService = {
  getWishlist: async () => {
    const response = await apiClient.cachedGet('/user/wishlist');
    return response.data;
  },

  getCached: () => {
    const cached = apiClient.getCachedDataSync('/user/wishlist');
    return cached?.data;
  },

  toggleWishlist: async (productId) => {
    const response = await apiClient.post(`/user/wishlist/${productId}`);
    apiClient.invalidateCache('/user/wishlist');
    return response.data;
  },

  clearWishlist: async () => {
    const response = await apiClient.delete('/user/wishlist');
    apiClient.invalidateCache('/user/wishlist');
    return response.data;
  }
};

export default wishlistService;
