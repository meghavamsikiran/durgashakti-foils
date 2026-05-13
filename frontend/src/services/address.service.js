import apiClient from './core/apiClient';

const addressService = {
  getAddresses: async () => {
    const response = await apiClient.get('/user/addresses');
    return response.data;
  },

  addAddress: async (addressData) => {
    const response = await apiClient.post('/user/addresses', addressData);
    return response.data;
  },

  updateAddress: async (id, addressData) => {
    const response = await apiClient.put(`/user/addresses/${id}`, addressData);
    return response.data;
  },

  deleteAddress: async (id) => {
    const response = await apiClient.delete(`/user/addresses/${id}`);
    return response.data;
  },
};

export default addressService;
