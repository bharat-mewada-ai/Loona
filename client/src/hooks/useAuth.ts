import { useEffect } from 'react';
import { Alert } from 'react-native';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { authApi } from '../api/auth.api';
import { useAuthStore } from '../store/authStore';
import { router } from 'expo-router';
import type { User, AuthResponse } from '../types';

// ─── useAuth — read current session state ────────────────────────────────────
export const useAuth = (): { user: User | null; token: string | null; isAuthenticated: boolean } => {
  const user = useAuthStore((s) => s.user);
  const token = useAuthStore((s) => s.token);
  return { user, token, isAuthenticated: !!token };
};

// ─── useGoogleAuth ────────────────────────────────────────────────────────────
export const useGoogleAuth = () => {
  const setAuth = useAuthStore((s) => s.setAuth);
  return useMutation<AuthResponse, Error, { token: string; campus?: string }>({
    mutationFn: (payload) => authApi.googleAuth(payload),
    onSuccess: (data) => {
      setAuth(data.user, data.token, data.refreshToken);
    },
  });
};

// ─── useLogout ────────────────────────────────────────────────────────────────
export const useLogout = (): (() => void) => {
  const logout = useAuthStore((s) => s.logout);
  const refreshToken = useAuthStore((s) => s.refreshToken);

  return async () => {
    try {
      // Revoke refresh token on server so stolen devices can't re-auth
      if (refreshToken) {
        await authApi.logout(refreshToken);
      }
    } catch {
      // Always log out locally even if server call fails
    } finally {
      logout();
      router.replace('/(auth)/login');
    }
  };
};

export const useLeaderboard = () => {
  return useQuery({
    queryKey: ['leaderboard'],
    queryFn: authApi.getLeaderboard,
    refetchInterval: 120_000, // live potato updates every 2m
    staleTime: 120_000,
  });
};

export const useMe = () => {
  const setUser = useAuthStore((s) => s.setUser);
  const token = useAuthStore((s) => s.token);
  const query = useQuery({
    queryKey: ['me'],
    queryFn: authApi.me,
    staleTime: 30_000, // 30s — background refetchInterval keeps it fresh
    refetchInterval: 10_000, // Auto-sync user details and potato count in background every 10s
    // Only run when we actually have a token — prevents a race-condition
    // where the query fires before loadStoredAuth() finishes and causes a
    // spurious 401 → token-refresh-fail → logout() loop.
    enabled: !!token,
    retry: false, // Don't retry on 401 — the interceptor handles refresh
  });

  useEffect(() => {
    if (query.data) {
      setUser(query.data);
    }
  }, [query.data, setUser]);

  return query;
};

export const useUpdateProfile = () => {
  const setUser = useAuthStore((s) => s.setUser);
  return useMutation<User, Error, { avatar?: string; name?: string; bio?: string; isPrivate?: boolean; tags?: string[]; notificationsEnabled?: boolean; campus?: string }>({
    mutationFn: (payload) => authApi.updateProfile(payload),
    onSuccess: (updatedUser) => {
      setUser(updatedUser);
    },
    onError: (error: any) => {
      console.error('Update Profile Failed:', error);
      const msg = error.response?.data?.error || error.message;
      const stack = error.response?.data?.stack;
      Alert.alert('Update Failed', `${msg}\n${stack ? 'Check console for stack.' : ''}`);
    }
  });
};

export const useDeleteAccount = () => {
  const logout = useAuthStore((s) => s.logout);
  return useMutation({
    mutationFn: authApi.deleteAccount,
    onSuccess: (_data) => {
      // Soft delete: server revokes tokens and schedules deletion.
      // Log user out on client side.
      logout();
      router.replace('/(auth)/login');
    },
  });
};

export const useCancelDeletion = () => {
  const setUser = useAuthStore((s) => s.setUser);
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: authApi.cancelDeletion,
    onSuccess: async () => {
      // Refresh user data to clear scheduledForDeletion flag
      queryClient.invalidateQueries({ queryKey: ['me'] });
    },
  });
};

// ─── Blocking Hooks ─────────────────────────────────────────────────────────
export const useBlockUser = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (userId: string) => authApi.blockUser(userId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['posts'] });
      queryClient.invalidateQueries({ queryKey: ['blocked-users'] });
    },
  });
};

export const useUnblockUser = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (userId: string) => authApi.unblockUser(userId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['blocked-users'] });
    },
  });
};

export const useBlockedUsers = () => {
  return useQuery({
    queryKey: ['blocked-users'],
    queryFn: authApi.getBlockedUsers,
  });
};

export const useUpdateLocation = () => {
  return useMutation({
    mutationFn: ({ latitude, longitude }: { latitude: number; longitude: number }) =>
      authApi.updateLocation(latitude, longitude),
  });
};

export const useNearby = () => {
  return useQuery({
    queryKey: ['nearby'],
    queryFn: authApi.getNearby,
    staleTime: 0,          // Always treat cached data as stale → every refetch() hits the network
    gcTime: 0,             // Don't keep stale nearby data in memory at all
    refetchInterval: 30_000, // Auto-refresh every 30s
    refetchOnWindowFocus: false, // Prevent spurious refetches on app-foreground
  });
};

export const useWaveUser = () => {
  const queryClient = useQueryClient();
  const setUser = useAuthStore((s) => s.setUser);
  return useMutation({
    mutationFn: (userId: string) => authApi.waveUser(userId),
    onMutate: async () => {
      // Optimistic update: Deduct 5 potatoes instantly on UI
      const currentUser = useAuthStore.getState().user;
      if (currentUser) {
        setUser({
          ...currentUser,
          potato: Math.max(0, (currentUser.potato || 0) - 5)
        });
      }
    },
    onError: async () => {
      // Rollback/sync if it fails
      queryClient.invalidateQueries({ queryKey: ['me'] });
    },
    onSuccess: async () => {
      try {
        const updatedUser = await authApi.me();
        setUser(updatedUser);
        queryClient.invalidateQueries({ queryKey: ['me'] });
      } catch (err) {
        console.error('Failed to sync user profile after wave:', err);
      }
    },
  });
};