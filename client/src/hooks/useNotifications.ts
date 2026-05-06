import { useEffect, useRef } from 'react';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import client from '../api/client';
import type { Notification as InAppNotification } from '../types';
import { useAuthStore } from '../store/authStore';

// ─── In-App Notifications Hook ──────────────────────────────────────────────
export const useInAppNotifications = () => {
  return useQuery<InAppNotification[]>({
    queryKey: ['notifications'],
    queryFn: async () => {
      const { data } = await client.get('/notifications');
      return data;
    },
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
  const notificationListener = useRef<any>();
  const responseListener = useRef<any>();

  useEffect(() => {
    if (!user) return;

    // Register token
    registerForPushNotificationsAsync().then(token => {
      if (token) {
        client.patch('/auth/me', { expoPushToken: token }).catch(() => {});
      }
    });

    // Handle tapping on notification (Deep-linking)
    responseListener.current = Notifications.addNotificationResponseReceivedListener(response => {
      const data = response.notification.request.content.data;
      
      if (data?.postId) {
        // Navigate to the post (using a query param or separate screen)
        // For now, since we don't have a dedicated post detail screen, 
        // we'll just ensure the feed is focused.
        // In the future, this would be router.push(`/post/${data.postId}`)
        router.push('/'); 
      } else if (data?.chatId) {
        router.push(`/chat/${data.chatId}`);
      }
    });

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
