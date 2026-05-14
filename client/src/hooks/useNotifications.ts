import { useEffect, useRef } from 'react';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { useQuery, useMutation, useQueryClient, useInfiniteQuery } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import client from '../api/client';
import type { Notification as InAppNotification } from '../types';
import { useAuthStore } from '../store/authStore';

// ─── In-App Notifications Hook (Infinite Scroll) ──────────────────────────────
export const useInAppNotifications = () => {
  return useInfiniteQuery({
    queryKey: ['notifications'],
    queryFn: async ({ pageParam = 1 }) => {
      const { data } = await client.get(`/notifications?page=${pageParam}&limit=20`);
      return data;
    },
    getNextPageParam: (lastPage) => (lastPage.hasMore ? lastPage.page + 1 : undefined),
    initialPageParam: 1,
    refetchInterval: 60_000,
  });
};

export const useMarkNotificationsRead = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => client.patch('/notifications/read'),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['notifications'] });
    },
  });
};

// ─── Push Notification Setup & Deep-linking Hook ───────────────────────────
export const useNotifications = () => {
  const { user } = useAuthStore();
  const router = useRouter();
  const notificationListener = useRef<any>(null);
  const responseListener = useRef<any>(null);

  useEffect(() => {
    if (!user) return;

    // Register token
    registerForPushNotificationsAsync().then(token => {
      if (token) {
        client.patch('/auth/push-token', { token }).catch(() => {});
      }
    });

    // Handle tapping on notification (Deep-linking)
    if (Platform.OS !== 'web') {
      responseListener.current = Notifications.addNotificationResponseReceivedListener(response => {
        const data = response.notification.request.content.data;
        
        if (data?.postId) {
          router.push(`/post/${data.postId}`); 
        } else if (data?.chatId) {
          router.push(`/chat/${data.chatId}`);
        }
      });
    }

    return () => {
      if (responseListener.current) {
        responseListener.current.remove();
      }
    };
  }, [user]);
};

async function registerForPushNotificationsAsync() {
  if (Platform.OS === 'web') return;
  
  let token;
  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;
  
  if (existingStatus !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }
  
  if (finalStatus !== 'granted') return;

  try {
    token = (await Notifications.getExpoPushTokenAsync({
      projectId: '6858e77a-2483-4852-947d-8153b30e0142' // Replace with your Expo project ID
    })).data;
  } catch (e) {
    console.error('Failed to get push token', e);
  }
  
  return token;
}
