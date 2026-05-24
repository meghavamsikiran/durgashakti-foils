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
const inFlightGets = new Map();
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
    if (!inFlightGets.has(key)) {
      const refresh = apiClient.get(url, { ...options, silent: true })
        .then(res => {
          apiCache.set(key, { data: res, time: Date.now() });
          return res;
        })
        .catch(() => {})
        .finally(() => inFlightGets.delete(key));
      inFlightGets.set(key, refresh);
    }
    return entry.data;
  }

  if (inFlightGets.has(key)) {
    return inFlightGets.get(key);
  }

  const request = apiClient.get(url, options)
    .then(res => {
      apiCache.set(key, { data: res, time: Date.now() });
      return res;
    })
    .finally(() => inFlightGets.delete(key));
  inFlightGets.set(key, request);
  return request;
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

