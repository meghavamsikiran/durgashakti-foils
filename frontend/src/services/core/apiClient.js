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

export default apiClient;
