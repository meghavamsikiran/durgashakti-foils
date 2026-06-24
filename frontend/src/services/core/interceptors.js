import { toast } from 'sonner';
import { setLoading } from './loadingState';

let coldStartWarningShown = false;
let lastErrorTime = 0;

export const setupInterceptors = (apiClient) => {
  apiClient.interceptors.request.use(
    (config) => {
      if (!config.silent) setLoading(true);
      const token = localStorage.getItem('token');
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
      
      // Prevent browser caching for all GET requests by appending a unique timestamp query parameter.
      // We avoid custom non-safelisted headers (like Cache-Control, Pragma, Expires) to prevent triggering CORS preflight OPTIONS requests, which fail on slow/mobile connections.
      if (config.method?.toLowerCase() === 'get') {
        if (config.url) {
          const separator = config.url.includes('?') ? '&' : '?';
          config.url = `${config.url}${separator}_t=${Date.now()}`;
        }
      }
      return config;
    },
    (error) => {
      return Promise.reject(error);
    }
  );

  // Response Interceptor
  apiClient.interceptors.response.use(
    (response) => {
      if (!response.config?.silent) setLoading(false);
      coldStartWarningShown = false;
      return response;
    },
    (error) => {
      const { response } = error;

      if (response) {
        // Handle unauthorized (expired token)
        if (response.status === 401) {
          const isAuthPage = window.location.pathname === '/login';
          if (!isAuthPage) {
            localStorage.removeItem('token');
            localStorage.removeItem('user');
          }
        }

        // Handle error messages
        const detail = response.data?.detail;
        let errorMessage = 'An unexpected error occurred';

        if (Array.isArray(detail)) {
          errorMessage = detail.map((err) => err.msg).join(', ');
        } else if (typeof detail === 'string') {
          errorMessage = detail;
        } else if (response.data?.message) {
          errorMessage = response.data.message;
        }

        if (response.status !== 401 && !response.config?.silent) {
          toast.error(errorMessage);
        }

        if (!response.config?.silent) setLoading(false);
        return Promise.reject({
          message: errorMessage,
          status: response.status,
          data: response.data,
        });
      }

      // Only show network/timeout toasts for user-triggered mutations (POST, PUT, DELETE, PATCH).
      // GET requests are always background data fetches — a failure should never pop a toast,
      // regardless of the silent flag, to avoid spamming on cold-start / transient outages.
      const isGetRequest = (error.config?.method || '').toLowerCase() === 'get';
      if (!error.config?.silent && !isGetRequest) {
        setLoading(false);
        const now = Date.now();
        const timedOut = error.code === 'ECONNABORTED';
        const networkError = !response && (
          error.message?.includes('Network Error') ||
          error.code === 'ERR_NETWORK' ||
          error.code === 'ENOTFOUND' ||
          timedOut ||
          !navigator.onLine
        );

        if (timedOut) {
          toast.error('The server is taking longer than expected. Please wait a moment and try again.', {
            duration: 8000,
          });
        } else if (networkError && window.location.pathname !== '/') {
          if (!coldStartWarningShown || now - lastErrorTime > 300000) {
            coldStartWarningShown = true;
            lastErrorTime = now;
            toast.error('Unable to reach the server right now. Please check your connection and try again.', {
              duration: 8000,
            });
          }
        } else if (error.message) {
          toast.error(error.message);
        }
      } else if (!error.config?.silent && isGetRequest) {
        setLoading(false);
      }

      return Promise.reject(error);
    }
  );
};
