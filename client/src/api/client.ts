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

// ─── Response interceptor: handle 401 → clear auth & hard-redirect ───────────
// A 401 mid-session means the JWT expired or was revoked (e.g. secret rotation).
// We clear the store and push to login immediately — the user lands cleanly on
// the login screen without any stale UI state.
let isRedirecting = false; // guard against redirect loops on concurrent requests

client.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401 && !isRedirecting) {
      isRedirecting = true;
      useAuthStore.getState().logout();
      // expo-router imperative navigation — works from any context (hooks, utils)
      router.replace('/(auth)/login');
      // Reset the flag after a tick so future legitimate 401s still redirect
      setTimeout(() => { isRedirecting = false; }, 2000);
    }
    return Promise.reject(err);
  }
);

export default client;