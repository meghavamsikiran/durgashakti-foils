import apiClient from './core/apiClient';

let cachedPublicSettings = null;
let cacheTimestamp = null;
const CACHE_DURATION = 10 * 1000; // 10 seconds cache

const settingsService = {
  getPublicSettings: async () => {
    const now = Date.now();
    if (cachedPublicSettings && cacheTimestamp && (now - cacheTimestamp < CACHE_DURATION)) {
      return cachedPublicSettings;
    }
    const response = await apiClient.get('/settings/public');
    cachedPublicSettings = response.data;
    cacheTimestamp = now;
    return response.data;
  },
};

export default settingsService;
