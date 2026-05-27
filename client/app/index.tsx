import { useRouter } from 'expo-router';
import { useAuthStore } from '../src/store/authStore';
import { useEffect, useState } from 'react';
import { View, ActivityIndicator } from 'react-native';
import client from '../src/api/client';
import AsyncStorage from '@react-native-async-storage/async-storage';

export default function Index() {
  const { token, isInitialized } = useAuthStore();
  const router = useRouter();
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    setIsReady(true);
  }, []);

  useEffect(() => {
    if (!isReady || !isInitialized) return;

    // Direct imperative navigation is more stable on Web than <Redirect />
    if (token) {
      router.replace('/(tabs)');
    } else {
      router.replace('/(auth)/login');
    }
  }, [isReady, isInitialized, token]);

  // Render a matching background while navigating to avoid "White Flash"
  return (
    <View style={{ flex: 1, backgroundColor: '#0d0d0f', justifyContent: 'center', alignItems: 'center' }}>
      <ActivityIndicator color="#fff" />
    </View>
  );
}
