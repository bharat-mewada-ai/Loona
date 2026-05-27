import axios from 'axios';
import { router } from 'expo-router';
import { API_URL } from '../constants';
import { useAuthStore } from '../store/authStore';
import { reconnectSocket } from '../utils/socket';

const client = axios.create({
  baseURL: API_URL.endsWith('/') ? API_URL.slice(0, -1) : API_URL,
  timeout: 30_000,
  headers: { 'Content-Type': 'application/json' },
});

// ─── Request interceptor: attach JWT and ensure v1 prefix ────────────────────
client.interceptors.request.use((config) => {
  // Fix: Ensure every request is prefixed with /api/v1 if not already present
  // and handle leading slashes that would otherwise replace the baseURL path
  if (config.url && !config.url.startsWith('http')) {
    const cleanUrl = config.url.startsWith('/') ? config.url.slice(1) : config.url;
    // If the baseURL already ends in v1, we just need to append the cleanUrl
    if (config.baseURL?.endsWith('v1')) {
       config.url = cleanUrl;
    } else {
       // Otherwise (fallback), we ensure the v1 is there
       config.url = `v1/${cleanUrl}`;
    }
  }

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
      // If we never had a token to begin with, don't trigger the logout flow.
      // This handles app-startup race where a query fires before loadStoredAuth() finishes.
      const currentToken = useAuthStore.getState().token;
      if (!currentToken) {
        return Promise.reject(err);
      }

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
        // Use raw axios to avoid interceptor loop. Ensure v1 prefix is present.
        const refreshUrl = API_URL.endsWith('v1') || API_URL.endsWith('v1/')
          ? `${API_URL.endsWith('/') ? API_URL.slice(0, -1) : API_URL}/auth/refresh`
          : `${API_URL.endsWith('/') ? API_URL.slice(0, -1) : API_URL}/v1/auth/refresh`;
        
        const { data } = await axios.post(refreshUrl, { refreshToken });
        const newToken = data.token;
        
        setToken(newToken);
        reconnectSocket(newToken);
        processQueue(null, newToken);
        isRefreshing = false;

        originalRequest.headers.Authorization = `Bearer ${newToken}`;
        return client(originalRequest);
      } catch (refreshErr: any) {
        processQueue(refreshErr, null);
        isRefreshing = false;
        
        // Only log out if the server explicitly rejects the refresh token
        // e.g., 400 (bad/expired token), 401 (unauthorized), or 403 (forbidden)
        const isAuthError = refreshErr.response && [400, 401, 403].includes(refreshErr.response.status);
        if (isAuthError) {
          logout();
          router.replace('/(auth)/login');
        }
        return Promise.reject(refreshErr);
      }
    }

    return Promise.reject(err);
  }
);

export default client;