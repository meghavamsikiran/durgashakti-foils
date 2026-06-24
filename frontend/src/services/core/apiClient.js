import axios from 'axios';
import { setupInterceptors } from './interceptors';

export const getBackendUrl = () => {
  if (typeof window !== 'undefined') {
    const hostname = window.location.hostname;
    if (hostname === 'localhost' || hostname === '127.0.0.1') {
      return process.env.REACT_APP_BACKEND_URL || 'http://localhost:8001';
    }
  }
  return 'https://durgashakti-foils-2.onrender.com';
};

const API_URL = `${getBackendUrl()}/api`;

const apiClient = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 60000,
});

setupInterceptors(apiClient);

// Centralized Stale-While-Revalidate (SWR) cache
const apiCache = new Map();
const inFlightGets = new Map();
const DEFAULT_TTL = 60000; // 60 seconds

// Load cache from localStorage on initialization
try {
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key && key.startsWith('ds_api_cache:')) {
      const entryStr = localStorage.getItem(key);
      if (entryStr) {
        const entry = JSON.parse(entryStr);
        if (entry && entry.data) {
          apiCache.set(key.replace('ds_api_cache:', ''), entry);
        }
      }
    }
  }
} catch (e) {
  // Ignore localStorage security/quota blocks
}

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
    // Cache is fresh — revalidate silently in the background
    if (!inFlightGets.has(key)) {
      const refresh = apiClient.get(url, { ...options, silent: true })
        .then(res => {
          const serializedData = { data: res.data, status: res.status };
          apiCache.set(key, { data: serializedData, time: Date.now() });
          try {
            localStorage.setItem('ds_api_cache:' + key, JSON.stringify({ data: serializedData, time: Date.now() }));
          } catch (e) {}
          return serializedData;
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

  // Cache is stale or missing — fetch fresh data.
  // If stale data exists (expired TTL), use silent:true so the user
  // sees the stale content without an error toast if the request fails.
  const hasStaleData = !!entry;
  const fetchOptions = hasStaleData ? { ...options, silent: true } : options;

  const request = apiClient.get(url, fetchOptions)
    .then(res => {
      const serializedData = { data: res.data, status: res.status };
      apiCache.set(key, { data: serializedData, time: Date.now() });
      try {
        localStorage.setItem('ds_api_cache:' + key, JSON.stringify({ data: serializedData, time: Date.now() }));
      } catch (e) {}
      return serializedData;
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
  try {
    const keysToRemove = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith('ds_api_cache:') && (key.includes(urlPrefix) || key.startsWith('ds_api_cache:' + urlPrefix))) {
        keysToRemove.push(key);
      }
    }
    for (const key of keysToRemove) {
      localStorage.removeItem(key);
    }
  } catch (e) {}
};

const clearAllCache = () => {
  apiCache.clear();
  try {
    const keysToRemove = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && (key.startsWith('ds_api_cache:') || key.startsWith('admin_order_detail_') || key === 'pending_razorpay_order' || key === 'ds_cached_user_cart')) {
        keysToRemove.push(key);
      }
    }
    for (const key of keysToRemove) {
      localStorage.removeItem(key);
    }
  } catch (e) {}
};

apiClient.cachedGet = cachedGet;
apiClient.getCachedDataSync = getCachedDataSync;
apiClient.invalidateCache = invalidateCache;
apiClient.clearAllCache = clearAllCache;

export default apiClient;

