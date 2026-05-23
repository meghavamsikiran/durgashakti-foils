import axios from 'axios';
import { setupInterceptors } from './interceptors';

const API_URL = (process.env.REACT_APP_BACKEND_URL || 'https://durgashakti-foils-1.onrender.com') + '/api';

const apiClient = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 30000,
});

setupInterceptors(apiClient);

// Centralized Stale-While-Revalidate (SWR) cache
const apiCache = new Map();
const DEFAULT_TTL = 60000; // 60 seconds

const getCacheKey = (url, params = {}) => {
  const sortedParams = Object.keys(params || {})
    .sort()
    .reduce((acc, key) => {
      acc[key] = params[key];
      return acc;
    }, {});
  return url + '?' + JSON.stringify(sortedParams);
};

const cachedGet = async (url, options = {}) => {
  const key = getCacheKey(url, options.params);
  const entry = apiCache.get(key);
  const now = Date.now();
  const ttl = options.ttl || DEFAULT_TTL;

  if (entry && (now - entry.time < ttl)) {
    // Return stale data immediately, revalidate silently in background
    apiClient.get(url, { ...options, silent: true })
      .then(res => apiCache.set(key, { data: res, time: Date.now() }))
      .catch(() => {});
    return entry.data;
  }

  const res = await apiClient.get(url, options);
  apiCache.set(key, { data: res, time: now });
  return res;
};

const getCachedDataSync = (url, params = {}) => {
  const key = getCacheKey(url, params);
  const entry = apiCache.get(key);
  if (entry) {
    return entry.data;
  }
  return null;
};

const invalidateCache = (urlPrefix) => {
  for (const key of apiCache.keys()) {
    if (key.startsWith(urlPrefix) || key.includes(urlPrefix)) {
      apiCache.delete(key);
    }
  }
};

apiClient.cachedGet = cachedGet;
apiClient.getCachedDataSync = getCachedDataSync;
apiClient.invalidateCache = invalidateCache;

export default apiClient;

