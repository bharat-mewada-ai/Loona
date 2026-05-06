import { useEffect } from 'react';
import { View, StyleSheet } from 'react-native';
import '../global.css';
import { StatusBar } from 'expo-status-bar';
import { Stack } from 'expo-router';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import {
  useFonts,
  Syne_700Bold,
} from '@expo-google-fonts/syne';
import {
  PlusJakartaSans_400Regular,
  PlusJakartaSans_500Medium,
  PlusJakartaSans_600SemiBold,
} from '@expo-google-fonts/plus-jakarta-sans';
import * as WebBrowser from 'expo-web-browser';
import { useAuthStore } from '../src/store/authStore';
import { useUIStore } from '../src/store/uiStore';
import ErrorBoundary from '../src/components/ErrorBoundary';
import OpeningSplashScreen from '../src/components/OpeningSplashScreen';
import { useState } from 'react';
import * as Updates from 'expo-updates';
import { useNotifications } from '../src/hooks/useNotifications';

// Required for web OAuth popup flow to complete
WebBrowser.maybeCompleteAuthSession();

const queryClient = new QueryClient({
  defaultOptions: { queries: { staleTime: 30_000, retry: 1 } },
});

function RootLayout() {
  const { loadStoredAuth } = useAuthStore();
  const { isDark } = useUIStore();
  
  useEffect(() => {
    async function onFetchUpdateAsync() {
      // expo-updates OTA only works in production builds, not in Expo Go / dev
      if (__DEV__) return;
      try {
        const update = await Updates.checkForUpdateAsync();
        if (update.isAvailable) {
          await Updates.fetchUpdateAsync();
          await Updates.reloadAsync();
        }
      } catch (error) {
        // You can also add an error report here
      }
    }
    onFetchUpdateAsync();
  }, []);

  // Initialize push notifications on startup
  useNotifications();

  const [fontsLoaded, fontError] = useFonts({
    Syne_700Bold,
    PlusJakartaSans_400Regular,
    PlusJakartaSans_500Medium,
    PlusJakartaSans_600SemiBold,
  });

  const [splashVisible, setSplashVisible] = useState(true);

  useEffect(() => {
    loadStoredAuth();
  }, []);

  useEffect(() => {
    const safetyTimer = setTimeout(() => {
      setSplashVisible(false);
    }, 3000); // Force hide after 3s max

    if (fontsLoaded && !fontError) {
      // Fast boot for daily use (800ms)
      const timer = setTimeout(() => {
        setSplashVisible(false);
        clearTimeout(safetyTimer);
      }, 800);
      return () => {
        clearTimeout(timer);
        clearTimeout(safetyTimer);
      };
    }
    return () => clearTimeout(safetyTimer);
  }, [fontsLoaded, fontError]);

  if (splashVisible) {
    return <OpeningSplashScreen />;
  }

  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <View style={{ flex: 1, backgroundColor: isDark ? '#000' : '#fff' }}>
          <StatusBar style={isDark ? 'light' : 'dark'} />
          <Stack screenOptions={{ headerShown: false }} />
        </View>
      </QueryClientProvider>
    </ErrorBoundary>
  );
}

export default RootLayout;
