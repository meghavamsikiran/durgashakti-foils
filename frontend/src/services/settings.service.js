import apiClient from './core/apiClient';

const settingsService = {
  getPublicSettings: async (options = {}) => {
    const requestConfig = {
      silent: true,
      ...(options.cacheBust ? { params: { _t: Date.now() } } : {})
    };

    const response = options.force
      ? await apiClient.get('/settings/public', requestConfig)
      : await apiClient.cachedGet('/settings/public', { ttl: options.ttl });
    return response.data;
  },
};

export default settingsService;
