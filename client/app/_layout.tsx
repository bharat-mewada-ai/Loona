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
  PlusJakartaSans_700Bold,
} from '@expo-google-fonts/plus-jakarta-sans';
import * as WebBrowser from 'expo-web-browser';
import { useAuthStore } from '../src/store/authStore';
import { useUIStore } from '../src/store/uiStore';
import ErrorBoundary from '../src/components/ErrorBoundary';
import OpeningSplashScreen from '../src/components/OpeningSplashScreen';
import * as Application from 'expo-application';
import UpdateRequiredScreen from '../src/components/UpdateRequiredScreen';
import client from '../src/api/client';

const isVersionLower = (current: string, minimum: string) => {
  if (!current || !minimum) return false;
  const c = current.split('.').map(Number);
  const m = minimum.split('.').map(Number);
  for (let i = 0; i < 3; i++) {
    if ((c[i] || 0) < (m[i] || 0)) return true;
    if ((c[i] || 0) > (m[i] || 0)) return false;
  }
  return false;
};
import { useState } from 'react';
import * as Updates from 'expo-updates';
import { useNotifications } from '../src/hooks/useNotifications';

// Required for web OAuth popup flow to complete
WebBrowser.maybeCompleteAuthSession();

const queryClient = new QueryClient({
  defaultOptions: { queries: { staleTime: 30_000, retry: 1 } },
});

function RootLayout() {
  const { loadStoredAuth, user } = useAuthStore();
  const { isDark, setCampus } = useUIStore();
  
  // Sync UI campus with user campus on login/load
  useEffect(() => {
    if (user?.campus) {
      setCampus(user.campus);
    }
  }, [user?._id]);

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
    PlusJakartaSans_700Bold,
  });

  const [splashVisible, setSplashVisible] = useState(true);
  const [updateConfig, setUpdateConfig] = useState<any>(null);

  useEffect(() => {
    console.log('[RootLayout] State Check:', { fontsLoaded, fontError, splashVisible, hasUpdate: !!updateConfig });
  }, [fontsLoaded, splashVisible, updateConfig]);

  useEffect(() => {
    loadStoredAuth();
  }, []);

  useEffect(() => {
    // Check for force update
    const checkUpdate = async () => {
      try {
        const { data } = await client.get('/config/version');
        const currentVersion = Application.nativeApplicationVersion || '1.0.0';
        if (data.forceUpdate || isVersionLower(currentVersion, data.minimumVersion)) {
          console.log('[RootLayout] Update Required:', data.minimumVersion);
          setUpdateConfig(data);
        }
      } catch (err) {
        console.warn('[RootLayout] Update check skipped (offline or dev)');
      }
    };
    checkUpdate();

    // Safety: Always hide splash after 5s regardless of fonts
    const safetyTimer = setTimeout(() => {
      console.log('[RootLayout] Safety Timer triggered - hiding splash');
      setSplashVisible(false);
    }, 5000);

    if (fontsLoaded) {
      setSplashVisible(false);
      clearTimeout(safetyTimer);
    }

    return () => clearTimeout(safetyTimer);
  }, [fontsLoaded]);

  let content;
  if (updateConfig) {
    content = <UpdateRequiredScreen {...updateConfig} />;
  } else if (splashVisible) {
    content = <OpeningSplashScreen />;
  } else {
    content = <Stack screenOptions={{ headerShown: false }} />;
  }

  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <StatusBar style="light" />
        {content}
      </QueryClientProvider>
    </ErrorBoundary>
  );
}

export default RootLayout;
