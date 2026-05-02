import { useEffect } from 'react';
import { View } from 'react-native';
import * as Sentry from '@sentry/react-native';
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

// Required for web OAuth popup flow to complete
WebBrowser.maybeCompleteAuthSession();

const queryClient = new QueryClient({
  defaultOptions: { queries: { staleTime: 30_000, retry: 1 } },
});

Sentry.init({
  dsn: process.env.EXPO_PUBLIC_SENTRY_DSN || "",
  debug: __DEV__,
});

import * as Updates from 'expo-updates';
import { useNotifications } from '../src/hooks/useNotifications';
import { PostHogProvider } from 'posthog-react-native';
import { posthog } from '../src/utils/posthog';

function RootLayout() {
  const { loadStoredAuth } = useAuthStore();
  const { isDark } = useUIStore();
  
  useEffect(() => {
    async function onFetchUpdateAsync() {
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

  useEffect(() => {
    loadStoredAuth();
  }, []);

  // Don't block render if fonts fail to load (e.g. no internet on web)
  if (!fontsLoaded && !fontError) return null;

  return (
    <PostHogProvider client={posthog}>
      <ErrorBoundary>
        <QueryClientProvider client={queryClient}>
          <View style={{ flex: 1, backgroundColor: isDark ? '#000' : '#fff' }}>
            <StatusBar style={isDark ? 'light' : 'dark'} />
            <Stack screenOptions={{ headerShown: false }} />
          </View>
        </QueryClientProvider>
      </ErrorBoundary>
    </PostHogProvider>
  );
}

export default Sentry.wrap(RootLayout);
