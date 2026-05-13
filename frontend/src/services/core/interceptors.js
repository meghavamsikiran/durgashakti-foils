import { toast } from 'sonner';

export const setupInterceptors = (apiClient) => {
  // Request Interceptor
  apiClient.interceptors.request.use(
    (config) => {
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
            // We could trigger a redirect here, but better to let the AuthContext handle it
            // window.location.href = '/login';
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
        if (response.status !== 401) {
          toast.error(errorMessage);
        }
        
        return Promise.reject({
          message: errorMessage,
          status: response.status,
          data: response.data,
        });
      }

      // Handle network errors
      if (error.message === 'Network Error') {
        toast.error('Network error. Please check your connection.');
      } else {
        toast.error(error.message);
      }

      return Promise.reject(error);
    }
  );
};
