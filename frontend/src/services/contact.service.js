import apiClient from './core/apiClient';

const contactService = {
  submitContact: async (formData) => {
    const response = await apiClient.post('/contacts', formData);
    apiClient.invalidateCache('/contacts/my');
    apiClient.invalidateCache('/admin/contacts');
    return response.data;
  },
  getMyTickets: async () => {
    const response = await apiClient.cachedGet('/contacts/my');
    return response.data;
  },
  uploadAttachment: async (file) => {
    const formData = new FormData();
    formData.append('file', file);
    const response = await apiClient.post('/contacts/upload', formData);
    return response.data;
  }
};

export default contactService;

