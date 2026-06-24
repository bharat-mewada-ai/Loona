import React, { useEffect, useState } from 'react';
import { View, StyleSheet, Platform } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import '../global.css';
import { StatusBar } from 'expo-status-bar';
import { Stack } from 'expo-router';
import * as Updates from 'expo-updates';
import { QueryClientProvider } from '@tanstack/react-query';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { queryClient } from '../src/utils/queryClient';
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

import ComposeSheet from '../src/components/sheets/ComposeSheet';
import ReportSheet from '../src/components/sheets/ReportSheet';
import CommentSheet from '../src/components/sheets/CommentSheet';
import AuthorProfileSheet from '../src/components/sheets/AuthorProfileSheet';
import FeedbackSheet from '../src/components/sheets/FeedbackSheet';
import PrivacySheet from '../src/components/sheets/PrivacySheet';
import StoryViewer from '../src/components/StoryViewer';

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

import { useNotifications } from '../src/hooks/useNotifications';
import { useMe, useUpdateLocation } from '../src/hooks/useAuth';
import { requestLocation } from '../src/hooks/useLocation';

function AuthLoader({ children }: { children: React.ReactNode }) {
  useMe(); // This hook updates useAuthStore automatically
  useNotifications(); // Initialize push notifications here inside the QueryClientProvider context
  
  const { user } = useAuthStore();
  const { mutate: updateLocation } = useUpdateLocation();

  useEffect(() => {
    if (user) {
      (async () => {
        try {
          const loc = await requestLocation(false); // Fast/cached lock on start
          if (loc) {
            updateLocation(loc);
            console.log('[AuthLoader] Auto location update completed:', loc);
          }
        } catch (err) {
          console.error('[AuthLoader] Auto location update failed:', err);
        }
      })();
    }
  }, [user?._id]);

  return <>{children}</>;
}

import * as Notifications from 'expo-notifications';

// Required for web OAuth popup flow to complete
WebBrowser.maybeCompleteAuthSession();

// Configure foreground notification behavior
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  } as any),
});



function RootLayout() {
  const { loadStoredAuth, user, isInitialized } = useAuthStore();
  const { 
    isDark, setCampus, loadStoredTheme,
    showComposeSheet, showReportSheet, showCommentSheet, 
    showFeedbackSheet, showPrivacySheet, showStoryViewer 
  } = useUIStore();
  
  // Sync UI campus with user campus on login/load
  useEffect(() => {
    if (user?.campus) {
      setCampus(user.campus);
    }
  }, [user?._id]);

  // Expo Updates are handled automatically on start via checkAutomatically: "ON_LOAD" in app.json.
  // We disable manual checkForUpdateAsync to prevent startup crash/reload loops on Android.
  useEffect(() => {
    // Manual startup OTA checks disabled to ensure app stability
  }, []);

  // Initialize push notifications on startup
  const [fontsLoaded, fontError] = useFonts({
    Syne_700Bold,
    PlusJakartaSans_400Regular,
    PlusJakartaSans_500Medium,
    PlusJakartaSans_600SemiBold,
    PlusJakartaSans_700Bold,
  });

  const [splashVisible, setSplashVisible] = useState(true);
  const [updateConfig, setUpdateConfig] = useState<any>(null);
  const [needsOnboarding, setNeedsOnboarding] = useState(false);

  useEffect(() => {
    const checkOnboarding = async () => {
      const onboarded = await AsyncStorage.getItem('hasOnboarded');
      if (!onboarded) setNeedsOnboarding(true);
    };
    checkOnboarding();
  }, []);

  useEffect(() => {
    console.log('[RootLayout] State Check:', { fontsLoaded, fontError, splashVisible, hasUpdate: !!updateConfig, needsOnboarding });
  }, [fontsLoaded, splashVisible, updateConfig, needsOnboarding]);

  useEffect(() => {
    loadStoredAuth();
    loadStoredTheme();
  }, []);

  useEffect(() => {
    // Check for force update
    const checkUpdate = async () => {
      try {
        const { data } = await client.get('/config/version');
        const currentVersion = Platform.OS === 'web' ? '1.0.0' : (Application.nativeApplicationVersion || '1.0.0');
        if (data.forceUpdate || isVersionLower(currentVersion, data.minimumVersion)) {
          console.log('[RootLayout] Update Required:', data.minimumVersion);
          setUpdateConfig(data);
        }
      } catch (err) {
        console.warn('[RootLayout] Update check skipped (offline or dev)');
      }
    };
    checkUpdate();

    // Safety: Always hide splash after 2s regardless of fonts
    const safetyTimer = setTimeout(() => {
      console.log('[RootLayout] Safety Timer triggered - hiding splash');
      setSplashVisible(false);
    }, 2000);

    if (fontsLoaded && isInitialized) {
      setSplashVisible(false);
      clearTimeout(safetyTimer);
    }

    return () => clearTimeout(safetyTimer);
  }, [fontsLoaded, isInitialized]);

  let content;
  if (updateConfig) {
    content = <UpdateRequiredScreen {...updateConfig} />;
  } else if (splashVisible) {
    content = <OpeningSplashScreen />;
  } else {
    // If onboarding is needed, Stack will start with onboarding route if we define it in the initial route name
    // However, it is easier to just conditional render if we want to be strict.
    // For simplicity, we let Stack handle it, but we can set initialRouteName if needed.
    content = <Stack screenOptions={{ headerShown: false }} initialRouteName={needsOnboarding ? "onboarding" : undefined} />;
  }

  return (
    <ErrorBoundary>
      <SafeAreaProvider>
        <QueryClientProvider client={queryClient}>
          <AuthLoader>
            <StatusBar 
              style={isDark ? "light" : "dark"} 
              translucent={false} 
              backgroundColor={isDark ? "#000" : "#fff"}
            />
            {content}
            
            {/* Global UI Sheets */}
            {showComposeSheet && <ComposeSheet />}
            {showReportSheet && <ReportSheet />}
            {showCommentSheet && <CommentSheet />}
            {showFeedbackSheet && <FeedbackSheet />}
            {showPrivacySheet && <PrivacySheet />}
            {showStoryViewer && <StoryViewer />}
            <AuthorProfileSheet />
          </AuthLoader>
        </QueryClientProvider>
      </SafeAreaProvider>
    </ErrorBoundary>
  );
}

export default RootLayout;
