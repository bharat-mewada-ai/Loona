import { useEffect } from 'react';
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
    refetchInterval: 10_000, // live patato updates every 10s
  });
};

export const useMe = () => {
  const setUser = useAuthStore((s) => s.setUser);
  const query = useQuery({
    queryKey: ['me'],
    queryFn: authApi.me,
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
  return useMutation<User, Error, { avatar?: string; name?: string; bio?: string; isPrivate?: boolean; tags?: string[]; notificationsEnabled?: boolean }>({
    mutationFn: (payload) => authApi.updateProfile(payload),
    onSuccess: (updatedUser) => {
      setUser(updatedUser);
    },
  });
};

export const useDeleteAccount = () => {
  const logout = useAuthStore((s) => s.logout);
  return useMutation({
    mutationFn: authApi.deleteAccount,
    onSuccess: () => {
      logout();
      router.replace('/(auth)/login');
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