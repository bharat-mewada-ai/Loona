import axios from 'axios';
import { router } from 'expo-router';
import { API_URL } from '../constants';
import { useAuthStore } from '../store/authStore';

const client = axios.create({
  baseURL: API_URL,
  timeout: 30_000,
  headers: { 'Content-Type': 'application/json' },
});

// ─── Request interceptor: attach JWT from auth store ─────────────────────────
client.interceptors.request.use((config) => {
  // Read token synchronously from Zustand store state
  const token = useAuthStore.getState().token;
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

let isRefreshing = false;
let failedQueue: any[] = [];

const processQueue = (error: any, token: string | null = null) => {
  failedQueue.forEach((prom) => {
    if (error) prom.reject(error);
    else prom.resolve(token);
  });
  failedQueue = [];
};

client.interceptors.response.use(
  (res) => res,
  async (err) => {
    const originalRequest = err.config;

    // If 401 and not already retrying
    if (err.response?.status === 401 && !originalRequest._retry) {
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        })
          .then((token) => {
            originalRequest.headers.Authorization = `Bearer ${token}`;
            return client(originalRequest);
          })
          .catch((err) => Promise.reject(err));
      }

      originalRequest._retry = true;
      isRefreshing = true;

      const { refreshToken, logout, setToken } = useAuthStore.getState();

      if (!refreshToken) {
        isRefreshing = false;
        logout();
        router.replace('/(auth)/login');
        return Promise.reject(err);
      }

      try {
        // Use raw axios to avoid interceptor loop
        const { data } = await axios.post(`${API_URL}/auth/refresh`, { refreshToken });
        const newToken = data.token;
        
        setToken(newToken);
        processQueue(null, newToken);
        isRefreshing = false;

        originalRequest.headers.Authorization = `Bearer ${newToken}`;
        return client(originalRequest);
      } catch (refreshErr) {
        processQueue(refreshErr, null);
        isRefreshing = false;
        logout();
        router.replace('/(auth)/login');
        return Promise.reject(refreshErr);
      }
    }

    return Promise.reject(err);
  }
);

export default client;