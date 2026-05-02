import { create } from 'zustand';
import { storage } from '../utils/storage';
import { disconnectSocket } from '../hooks/useChat';

interface AuthState {
  user: any;
  token: string | null;
  setAuth: (user: any, token: string) => void;
  setUser: (user: any) => void;
  logout: () => void;
  loadStoredAuth: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  token: null,

  setAuth: (user, token) => {
    set({ user, token });
    storage.setItem('loona_token', token);
    storage.setItem('loona_user', JSON.stringify(user));
  },

  setUser: (user) => {
    set({ user });
    storage.setItem('loona_user', JSON.stringify(user));
  },

  logout: () => {
    disconnectSocket();           // tear down the authenticated socket immediately
    set({ user: null, token: null });
    storage.deleteItem('loona_token');
    storage.deleteItem('loona_user');
  },

  loadStoredAuth: async () => {
    try {
      const token = await storage.getItem('loona_token');
      const userStr = await storage.getItem('loona_user');

      if (token && userStr) {
        set({
          token,
          user: JSON.parse(userStr),
        });
      }
    } catch (e) {
      console.log('Auth load error', e);
    }
  },
}));