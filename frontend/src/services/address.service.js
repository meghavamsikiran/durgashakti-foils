import apiClient from './core/apiClient';

const addressService = {
  getAddresses: async () => {
    const response = await apiClient.cachedGet('/user/addresses');
    return response.data;
  },

  getCached: () => {
    const cached = apiClient.getCachedDataSync('/user/addresses');
    return cached?.data;
  },

  addAddress: async (addressData) => {
    const response = await apiClient.post('/user/addresses', addressData);
    apiClient.invalidateCache('/user/addresses');
    return response.data;
  },

  updateAddress: async (id, addressData) => {
    const response = await apiClient.put(`/user/addresses/${id}`, addressData);
    apiClient.invalidateCache('/user/addresses');
    return response.data;
  },

  deleteAddress: async (id) => {
    const response = await apiClient.delete(`/user/addresses/${id}`);
    apiClient.invalidateCache('/user/addresses');
    return response.data;
  },
};

export default addressService;
