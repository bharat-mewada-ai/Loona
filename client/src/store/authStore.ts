import { create } from 'zustand';
import { storage } from '../utils/storage';
import { disconnectSocket } from '../utils/socket';
import { User } from '../types';
import { authApi } from '../api/auth.api';

interface AuthState {
  user: User | null;
  token: string | null;
  refreshToken: string | null;
  setAuth: (user: User, token: string, refreshToken: string) => void;
  setUser: (user: User) => void;
  setToken: (token: string) => void;
  logout: () => void;
  loadStoredAuth: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  token: null,
  refreshToken: null,

  setAuth: (user, token, refreshToken) => {
    set({ user, token, refreshToken });
    storage.setItem('loona_token', token);
    storage.setItem('loona_refresh_token', refreshToken);
    storage.setItem('loona_user', JSON.stringify(user));
  },

  setUser: (user) => {
    set({ user });
    storage.setItem('loona_user', JSON.stringify(user));
  },

  setToken: (token) => {
    set({ token });
    storage.setItem('loona_token', token);
  },

  logout: () => {
    const { refreshToken } = useAuthStore.getState();
    if (refreshToken) {
      authApi.logout(refreshToken).catch((err) => console.log('Server logout failed:', err));
    }
    disconnectSocket();           // tear down the authenticated socket immediately
    set({ user: null, token: null, refreshToken: null });
    storage.deleteItem('loona_token');
    storage.deleteItem('loona_refresh_token');
    storage.deleteItem('loona_user');
  },

  loadStoredAuth: async () => {
    try {
      const token = await storage.getItem('loona_token');
      const refreshToken = await storage.getItem('loona_refresh_token');
      const userStr = await storage.getItem('loona_user');

      if (token && userStr) {
        set({
          token,
          refreshToken,
          user: JSON.parse(userStr),
        });
      }
    } catch (e) {
      console.log('Auth load error', e);
    }
  },
}));