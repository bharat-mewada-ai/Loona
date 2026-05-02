import { useMutation, useQuery } from '@tanstack/react-query';
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
      setAuth(data.user, data.token);
    },
  });
};

// ─── useLogout ────────────────────────────────────────────────────────────────
export const useLogout = (): (() => void) => {
  const logout = useAuthStore((s) => s.logout);
  return () => {
    logout();
    router.replace('/(auth)/login');
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
  return useQuery({
    queryKey: ['me'],
    queryFn: authApi.me,
  });
};

export const useUpdateProfile = () => {
  const setUser = useAuthStore((s) => s.setUser);
  return useMutation<User, Error, { avatar?: string; name?: string }>({
    mutationFn: (payload) => authApi.updateProfile(payload),
    onSuccess: (updatedUser) => {
      setUser(updatedUser);
    },
  });
};