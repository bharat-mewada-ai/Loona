import { useEffect, useRef } from 'react';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import Constants from 'expo-constants';
import { useQuery, useMutation, useQueryClient, useInfiniteQuery } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import client from '../api/client';
import type { Notification as InAppNotification } from '../types';
import { useAuthStore } from '../store/authStore';
import { getSocket } from '../utils/socket';

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
  const { user, token } = useAuthStore();
  const router = useRouter();
  const qc = useQueryClient();
  const notificationListener = useRef<any>(null);
  const responseListener = useRef<any>(null);
  // Track last notification ID per chatId so we can dismiss it before showing new grouped one
  const pendingChatNotifs = useRef<Map<string, string>>(new Map());

  useEffect(() => {
    if (!user || !token) return;

    // Register token
    registerForPushNotificationsAsync().then(pushToken => {
      if (pushToken) {
        client.patch('/auth/push-token', { token: pushToken }).catch(() => {});
      }
    });

    // Listen to newNotification events on global socket
    const s = getSocket(token);
    const handleNewNotification = (notification: any) => {
      qc.invalidateQueries({ queryKey: ['chats'] });
      qc.invalidateQueries({ queryKey: ['notifications'] });
      if (notification?.type === 'potato_update') {
        qc.invalidateQueries({ queryKey: ['me'] });
      }
    };
    
    s.on('newNotification', handleNewNotification);

    // Direct potato_update socket event — server emits { potato } when vote changes balance.
    // This gives instant potato count feedback without waiting for the 60s polling interval.
    const handlePotatoUpdate = (data: { potato: number }) => {
      const setUser = useAuthStore.getState().setUser;
      const currentUser = useAuthStore.getState().user;
      if (currentUser && typeof data?.potato === 'number') {
        setUser({ ...currentUser, potato: data.potato });
      }
    };
    s.on('potato_update', handlePotatoUpdate);

    // Handle notifications in foreground & deep-linking
    if (Platform.OS !== 'web') {
      // Invalidate query when user receives potato-related notifications in foreground
      notificationListener.current = Notifications.addNotificationReceivedListener(async notification => {
        const title = notification.request.content.title?.toLowerCase() || '';
        const body = notification.request.content.body?.toLowerCase() || '';
        const data = notification.request.content.data || {};

        // Collapse chat notifications: dismiss old one from same chat, track new one
        const chatId = data?.chatId as string | undefined;
        if (chatId) {
          const prevNotifId = pendingChatNotifs.current.get(chatId);
          if (prevNotifId) {
            await Notifications.dismissNotificationAsync(prevNotifId).catch(() => {});
          }
          pendingChatNotifs.current.set(chatId, notification.request.identifier);
        }

        if (data?.type === 'potato_update' || title.includes('potato') || body.includes('potato')) {
          qc.invalidateQueries({ queryKey: ['me'] });
        }
      });

      responseListener.current = Notifications.addNotificationResponseReceivedListener(response => {
        const data = response.notification.request.content.data;
        const chatId = data?.chatId as string | undefined;
        // Clean up tracking once user taps the notification
        if (chatId) pendingChatNotifs.current.delete(chatId);
        
        if (data?.postId) {
          router.push(`/post/${data.postId}`); 
        } else if (chatId) {
          router.push(`/chat/${chatId}`);
        } else if (data?.type === 'wave' && data?.senderId) {
          router.push(`/user/${data.senderId}`);
        }
      });
    }

    return () => {
      s.off('newNotification', handleNewNotification);
      s.off('potato_update', handlePotatoUpdate);
      if (notificationListener.current) {
        notificationListener.current.remove();
      }
      if (responseListener.current) {
        responseListener.current.remove();
      }
    };
  }, [user, token, qc]);
};

async function registerForPushNotificationsAsync() {
  if (Platform.OS === 'web') return;
  
  let token;

  if (Platform.OS === 'android') {
    // Default channel for general notifications
    await Notifications.setNotificationChannelAsync('default', {
      name: 'General',
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#c8f53a',
      showBadge: true,
    });
    // Dedicated channel for chat messages — supports grouping
    await Notifications.setNotificationChannelAsync('messages', {
      name: 'Messages',
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 200],
      lightColor: '#c8f53a',
      showBadge: true,
      groupId: 'chat_group',
      // Android groups all 'messages' channel notifications under one shade entry
    });
    // Group summary channel — provides the collapsible header in notification shade
    await Notifications.setNotificationChannelGroupAsync('chat_group', {
      name: 'Chats',
      description: 'All your Loona conversations',
    }).catch(() => {}); // May not be supported on older Android
  }

  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;
  
  if (existingStatus !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }
  
  if (finalStatus !== 'granted') return;

  try {
    const projectId = Constants.expoConfig?.extra?.eas?.projectId || '45dd7a2a-df99-4eb9-98ca-4ab0b68b3c1c';
    token = (await Notifications.getExpoPushTokenAsync({
      projectId
    })).data;
  } catch (e) {
    console.error('Failed to get push token', e);
  }
  
  return token;
}
