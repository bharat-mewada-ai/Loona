import { Redirect } from 'expo-router';
import { useAuthStore } from '../src/store/authStore';
import { useEffect, useState } from 'react';
import { View, ActivityIndicator } from 'react-native';
import client from '../src/api/client';
import AsyncStorage from '@react-native-async-storage/async-storage';

export default function Index() {
  const { token, loadStoredAuth, logout } = useAuthStore();
  const [isReady, setIsReady] = useState(false);
  const [hasOnboarded, setHasOnboarded] = useState(true); // default true avoids flash

  useEffect(() => {
    const init = async () => {
      // Check onboarding first
      const onboarded = await AsyncStorage.getItem('loona_onboarded_v1');
      setHasOnboarded(!!onboarded);

      await loadStoredAuth();
      // After loading stored auth, validate token against server
      const { token: storedToken } = useAuthStore.getState();
      if (storedToken) {
        try {
          await client.get('/auth/me');
          // Token is valid, proceed to feed
        } catch (e) {
          // Token is invalid/expired — clear and go to login
          logout();
        }
      }
      setIsReady(true);
    };
    init();
  }, []);

  if (!isReady) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#0A0A0A' }}>
        <ActivityIndicator size="large" color="#ffffff" />
      </View>
    );
  }

  if (!hasOnboarded) {
    return <Redirect href="/onboarding" />;
  }

  if (token) {
    return <Redirect href="/(tabs)" />;
  }

  return <Redirect href="/(auth)/login" />;
}
