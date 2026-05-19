import apiClient from './core/apiClient';

const authService = {
  login: async (credentials) => {
    const response = await apiClient.post('/auth/login', credentials);
    if (response.data.token) {
      localStorage.setItem('token', response.data.token);
    }
    return response.data;
  },

  register: async (userData) => {
    const response = await apiClient.post('/auth/register', userData);
    if (response.data.token) {
      localStorage.setItem('token', response.data.token);
    }
    return response.data;
  },

  logout: () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
  },

  getMe: async () => {
    const response = await apiClient.get('/auth/me');
    return response.data;
  },

  updateProfile: async (data) => {
    const response = await apiClient.put('/auth/me', data);
    return response.data;
  },

  changePassword: async (data) => {
    const response = await apiClient.post('/auth/change-password', data);
    return response.data;
  },

  forgotPassword: async (email) => {
    const response = await apiClient.post('/auth/forgot-password', { email });
    return response.data;
  },

  resetPassword: async (data) => {
    const response = await apiClient.post('/auth/reset-password', data);
    return response.data;
  },

  deleteAccount: async () => {
    const response = await apiClient.delete('/auth/me');
    return response.data;
  },
};

export default authService;
