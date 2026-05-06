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
      const safetyTimer = setTimeout(() => setIsReady(true), 5000);
      
      const onboarded = await AsyncStorage.getItem('loona_onboarded_v1');
      setHasOnboarded(!!onboarded);

      await loadStoredAuth();
      
      clearTimeout(safetyTimer);
      setIsReady(true);
    };
    init();
  }, []);

  if (!isReady) {
    return (
      <View style={{ flex: 1, backgroundColor: '#000', justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator color="#fff" />
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
