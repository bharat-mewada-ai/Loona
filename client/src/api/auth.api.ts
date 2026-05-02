import client from './client';
import type { AuthResponse, User } from '../types';

export const authApi = {
  // ── Google OAuth login ───────────────────────────────────────────────────
  googleAuth: async (payload: {
    token: string;
    campus?: string;
  }): Promise<AuthResponse> => {
    const { data } = await client.post<AuthResponse>('/auth/google', payload);
    return data;
  },

  // ── Get current user ─────────────────────────────────────────────────────
  me: async (): Promise<User> => {
    const { data } = await client.get<User>('/auth/me');
    return data;
  },

  // ── Logout (server-side is stateless JWT, just signals client) ───────────
  logout: async (): Promise<void> => {
    await client.post('/auth/logout');
  },

  // ── Campus leaderboard ───────────────────────────────────────────────────
  getLeaderboard: async (): Promise<{
    campusWar: { _id: string; karma: number }[];
    topUsers: User[];
  }> => {
    const { data } = await client.get('/auth/leaderboard');
    return data;
  },

  updateProfile: async (payload: { avatar?: string; name?: string }): Promise<User> => {
    const { data } = await client.patch<User>('/auth/update-profile', payload);
    return data;
  },

  // ── Register Expo push token ───────────────────────────────────────────
  registerPushToken: async (token: string): Promise<void> => {
    await client.patch('/auth/push-token', { token });
  },
};