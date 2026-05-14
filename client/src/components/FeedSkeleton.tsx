import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, Animated } from 'react-native';
import { getColors } from '../theme/colors';
import { useUIStore } from '../store/uiStore';

/**
 * A single animated shimmer card matching the PostCard dimensions.
 * Used in the feed's ListEmptyComponent / loading state.
 */
function SkeletonCard() {
  const { isDark } = useUIStore();
  const themeColors = getColors(isDark);

  const shimmer = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(shimmer, {
          toValue: 1,
          duration: 900,
          useNativeDriver: true,
        }),
        Animated.timing(shimmer, {
          toValue: 0,
          duration: 900,
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, []);

  const opacity = shimmer.interpolate({
    inputRange: [0, 1],
    outputRange: [0.3, 0.6],
  });

  const base = isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)';

  return (
    <View style={[s.card, { backgroundColor: themeColors.card, borderColor: themeColors.bdr, borderWidth: 1 }]}>
      <View style={s.header}>
        <Animated.View style={[s.avatar, { backgroundColor: base, opacity }]} />
        <View style={s.headerText}>
          <Animated.View style={[s.line, { width: 100, height: 14, backgroundColor: base, opacity }]} />
          <Animated.View style={[s.line, { width: 60, height: 10, backgroundColor: base, opacity, marginTop: 6 }]} />
        </View>
      </View>
      
      <Animated.View style={[s.line, { width: '85%', height: 20, backgroundColor: base, opacity, borderRadius: 10 }]} />
      <Animated.View style={[s.line, { width: '100%', height: 12, backgroundColor: base, opacity, marginTop: 12 }]} />
      <Animated.View style={[s.line, { width: '90%', height: 12, backgroundColor: base, opacity, marginTop: 8 }]} />
      <Animated.View style={[s.line, { width: '60%', height: 12, backgroundColor: base, opacity, marginTop: 8 }]} />

      <View style={s.footer}>
        <Animated.View style={[s.reactionChip, { backgroundColor: base, opacity }]} />
        <Animated.View style={[s.reactionChip, { backgroundColor: base, opacity }]} />
        <Animated.View style={[s.reactionChip, { backgroundColor: base, opacity }]} />
      </View>
    </View>
  );
}

/**
 * Renders N skeleton cards for the feed loading state.
 */
export default function FeedSkeleton({ count = 5 }: { count?: number }) {
  return (
    <View style={{ paddingVertical: 10 }}>
      {[...Array(count)].map((_, i) => (
        <SkeletonCard key={i} />
      ))}
    </View>
  );
}

const s = StyleSheet.create({
  card: {
    borderRadius: 24,
    padding: 20,
    marginHorizontal: 16,
    marginBottom: 16,
  },
  header: { flexDirection: 'row', alignItems: 'center', marginBottom: 18 },
  avatar: { width: 42, height: 42, borderRadius: 21, marginRight: 12 },
  headerText: { flex: 1 },
  line: { borderRadius: 8 },
  footer: { flexDirection: 'row', gap: 10, marginTop: 20 },
  reactionChip: { width: 60, height: 32, borderRadius: 16 },
});
