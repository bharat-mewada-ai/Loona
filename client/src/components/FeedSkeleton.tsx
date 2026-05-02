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
    outputRange: [0.4, 0.85],
  });

  const base = isDark ? '#2A2A2A' : '#E5E5E5';

  return (
    <Animated.View style={[s.card, { backgroundColor: themeColors.card, opacity }]}>
      {/* Header row: avatar + name + campus badge */}
      <View style={s.header}>
        <View style={[s.avatar, { backgroundColor: base }]} />
        <View style={s.headerText}>
          <View style={[s.line, { width: '40%', height: 12, backgroundColor: base }]} />
          <View style={[s.line, { width: '25%', height: 10, backgroundColor: base, marginTop: 6 }]} />
        </View>
      </View>
      {/* Title */}
      <View style={[s.line, { width: '85%', height: 14, backgroundColor: base }]} />
      <View style={[s.line, { width: '60%', height: 14, backgroundColor: base, marginTop: 8 }]} />
      {/* Body lines */}
      <View style={[s.line, { width: '100%', height: 11, backgroundColor: base, marginTop: 14 }]} />
      <View style={[s.line, { width: '90%', height: 11, backgroundColor: base, marginTop: 7 }]} />
      <View style={[s.line, { width: '70%', height: 11, backgroundColor: base, marginTop: 7 }]} />
      {/* Footer row: reactions placeholder */}
      <View style={s.footer}>
        {[...Array(4)].map((_, i) => (
          <View key={i} style={[s.reactionChip, { backgroundColor: base }]} />
        ))}
      </View>
    </Animated.View>
  );
}

/**
 * Renders N skeleton cards for the feed loading state.
 */
export default function FeedSkeleton({ count = 4 }: { count?: number }) {
  return (
    <View>
      {[...Array(count)].map((_, i) => (
        <SkeletonCard key={i} />
      ))}
    </View>
  );
}

const s = StyleSheet.create({
  card: {
    borderRadius: 20,
    padding: 16,
    marginHorizontal: 16,
    marginBottom: 12,
  },
  header: { flexDirection: 'row', alignItems: 'center', marginBottom: 14 },
  avatar: { width: 36, height: 36, borderRadius: 18, marginRight: 10 },
  headerText: { flex: 1 },
  line: { borderRadius: 6 },
  footer: { flexDirection: 'row', gap: 8, marginTop: 16 },
  reactionChip: { width: 48, height: 28, borderRadius: 14 },
});
