import * as Haptics from 'expo-haptics';
import { Platform } from 'react-native';
import { useUIStore } from '../store/uiStore';

export const triggerHaptic = (type: 'impact' | 'notification' | 'selection' = 'selection') => {
  const { hapticsEnabled } = useUIStore.getState();
  if (!hapticsEnabled || Platform.OS === 'web') return;

  if (type === 'impact') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
  else if (type === 'notification') Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  else Haptics.selectionAsync();
};
