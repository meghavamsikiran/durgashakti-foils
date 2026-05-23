import apiClient from './core/apiClient';

const settingsService = {
  getPublicSettings: async () => {
    const response = await apiClient.cachedGet('/settings/public');
    return response.data;
  },
};

export default settingsService;

