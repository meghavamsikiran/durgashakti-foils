import { toast } from 'sonner';
import { setLoading } from './loadingState';

let coldStartWarningShown = false;
let lastErrorTime = 0;

export const setupInterceptors = (apiClient) => {
  // Request Interceptor
  apiClient.interceptors.request.use(
    (config) => {
      if (!config.silent) setLoading(true);
      const token = localStorage.getItem('token');
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
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

        // Avoid showing toast for certain errors if needed, or handle globally
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

      // Handle network errors - only show once per page/session and avoid repeated toasts
      if (!error.config?.silent) {
        setLoading(false);
        const now = Date.now();
        const networkError = !response && (
          error.message?.includes('Network Error') ||
          error.code === 'ERR_NETWORK' ||
          error.code === 'ENOTFOUND' ||
          error.code === 'ECONNABORTED' ||
          !navigator.onLine
        );

        if (networkError && window.location.pathname !== '/') {
          if (!coldStartWarningShown || now - lastErrorTime > 300000) {
            coldStartWarningShown = true;
            lastErrorTime = now;
            toast.error('🌐 Live server is waking from sleep mode. Please wait 30 seconds and refresh!', {
              duration: 8000,
            });
          }
        } else if (error.message) {
          toast.error(error.message);
        }
      }

      return Promise.reject(error);
    }
  );
};
