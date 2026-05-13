import apiClient from './core/apiClient';

const wishlistService = {
  getWishlist: async () => {
    const response = await apiClient.get('/user/wishlist');
    return response.data;
  },

  toggleWishlist: async (productId) => {
    const response = await apiClient.post(`/user/wishlist/${productId}`);
    return response.data;
  },
};

export default wishlistService;
