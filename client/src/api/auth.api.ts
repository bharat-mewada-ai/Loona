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

  refresh: async (refreshToken: string): Promise<{ token: string }> => {
    const { data } = await client.post('/auth/refresh', { refreshToken });
    return data;
  },

  // ── Get current user ─────────────────────────────────────────────────────
  me: async (): Promise<User> => {
    const { data } = await client.get<User>('/auth/me');
    return data;
  },

  // ── Logout — sends refreshToken to server for revocation ──────────────────
  logout: async (refreshToken: string): Promise<void> => {
    await client.post('/auth/logout', { refreshToken });
  },

  // ── Campus leaderboard ───────────────────────────────────────────────────
  getLeaderboard: async (): Promise<{
    campusWar: { _id: string; potato: number }[];
    topUsers: User[];
  }> => {
    const { data } = await client.get('/auth/leaderboard');
    return data;
  },

  updateProfile: async (payload: { avatar?: string; name?: string; bio?: string; isPrivate?: boolean; tags?: string[]; notificationsEnabled?: boolean; campus?: string }): Promise<User> => {
    const { data } = await client.patch<User>('/auth/update-profile', payload);
    return data;
  },

  // ── Register Expo push token ───────────────────────────────────────────
  registerPushToken: async (token: string): Promise<void> => {
    await client.patch('/auth/push-token', { token });
  },
  
  deleteAccount: async (): Promise<{ scheduledForDeletion: boolean; deletionScheduledAt: string; message: string }> => {
    const { data } = await client.delete('/auth/delete-account');
    return data;
  },

  cancelDeletion: async (): Promise<{ message: string }> => {
    const { data } = await client.post('/auth/cancel-deletion');
    return data;
  },

  // ── Blocking ────────────────────────────────────────────────────────────
  blockUser: async (userId: string): Promise<void> => {
    await client.post(`/auth/block/${userId}`);
  },
  unblockUser: async (userId: string): Promise<void> => {
    await client.delete(`/auth/unblock/${userId}`);
  },
  getBlockedUsers: async (): Promise<User[]> => {
    const { data } = await client.get('/auth/blocks');
    return data;
  },

  getPublicProfile: async (userId: string): Promise<User> => {
    const { data } = await client.get<User>(`/auth/users/${userId}`);
    return data;
  },

  updateLocation: async (latitude: number, longitude: number): Promise<void> => {
    await client.patch('/auth/location', { latitude, longitude });
  },

  getNearby: async (): Promise<{
    _id: string;
    name: string;
    avatar: string;
    bio?: string;
    isVerified?: boolean;
    vagueDistance: string;
    distance: number;
  }[]> => {
    const { data } = await client.get('/auth/nearby');
    return data;
  },

  waveUser: async (userId: string): Promise<void> => {
    await client.post(`/auth/wave/${userId}`);
  },

  getStreakStatus: async (): Promise<{
    currentLeader: string | null;
    streakDays: number;
    multiplierActive: boolean;
    multiplierValue: number;
  }> => {
    const { data } = await client.get('/streaks/status');
    return data;
  },
};