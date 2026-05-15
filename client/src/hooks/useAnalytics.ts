import { useEffect } from 'react';
import api from '../api/client';

/**
 * Hook to track screen views in the app.
 * @param screenName The name of the screen being viewed (e.g., 'home', 'profile', 'chat')
 */
export const useAnalytics = (screenName: string) => {
  useEffect(() => {
    const logScreenView = async () => {
      try {
        await api.post('/analytics/log', {
          event: 'SCREEN_VIEW',
          screen: screenName,
          metadata: { platform: 'mobile' }
        });
      } catch (err) {
        // Silent fail for analytics
        console.log('[Analytics] Failed to log screen view:', screenName);
      }
    };

    logScreenView();
  }, [screenName]);
};
