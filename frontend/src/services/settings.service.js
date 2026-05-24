import apiClient from './core/apiClient';

const settingsService = {
  getPublicSettings: async (options = {}) => {
    const response = options.force
      ? await apiClient.get('/settings/public', { silent: true })
      : await apiClient.cachedGet('/settings/public', { ttl: options.ttl });
    return response.data;
  },
};

export default settingsService;
