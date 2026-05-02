import { useEffect } from 'react';
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform } from 'react-native';
import client from '../api/client';
import { useAuthStore } from '../store/authStore';

export const useNotifications = () => {
  const { user, token } = useAuthStore();

  useEffect(() => {
    if (!user || !token) return;

    const registerForPushNotificationsAsync = async () => {
      if (Device.isDevice) {
        const { status: existingStatus } = await Notifications.getPermissionsAsync();
        let finalStatus = existingStatus;
        if (existingStatus !== 'granted') {
          const { status } = await Notifications.requestPermissionsAsync();
          finalStatus = status;
        }
        if (finalStatus !== 'granted') {
          console.warn('Failed to get push token for push notification!');
          return;
        }
        
        // Get the token from Expo
        try {
          const expoToken = (await Notifications.getExpoPushTokenAsync({
            projectId: '3796f60c-26e6-42b7-84bc-2989c464979e', // Loona Project ID
          })).data;
          
          // Send to backend
          await client.patch('/auth/push-token', { token: expoToken });
          console.log('[Push] Token registered successfully');
        } catch (error) {
          console.error('[Push] Error registering token:', error);
        }
      }

      if (Platform.OS === 'android') {
        Notifications.setNotificationChannelAsync('default', {
          name: 'default',
          importance: Notifications.AndroidImportance.MAX,
          vibrationPattern: [0, 250, 250, 250],
          lightColor: '#FF231F7C',
        });
      }
    };

    registerForPushNotificationsAsync();
  }, [user, token]);
};
