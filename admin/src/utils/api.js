import axios from 'axios';
import { getAuthToken } from './auth';

let API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';
// Remove trailing slash if exists, then ensure it ends with /v1
API_URL = API_URL.replace(/\/$/, '');
if (!API_URL.endsWith('/v1')) {
  API_URL += '/v1';
}

const api = axios.create({
  baseURL: API_URL,
});

// Add a request interceptor to add the auth token to every request
api.interceptors.request.use(
  (config) => {
    const token = getAuthToken();
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

export default api;
