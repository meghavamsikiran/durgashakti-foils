import apiClient from './core/apiClient';

const settingsService = {
  getPublicSettings: async () => {
    const response = await apiClient.get('/settings/public', {
      params: { t: Date.now() },
      headers: { 'Cache-Control': 'no-cache' },
    });
    return response.data;
  },
};

export default settingsService;
