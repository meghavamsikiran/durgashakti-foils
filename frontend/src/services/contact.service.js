import apiClient from './core/apiClient';

const contactService = {
  submitContact: async (formData) => {
    const response = await apiClient.post('/contact', formData);
    return response.data;
  }
};

export default contactService;
