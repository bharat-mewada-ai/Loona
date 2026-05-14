import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, Animated, Dimensions } from 'react-native';
import { getColors } from '../theme/colors';
import { useUIStore } from '../store/uiStore';

const { width } = Dimensions.get('window');

export default function SkeletonCard() {
  const { isDark } = useUIStore();
  const themeColors = getColors(isDark);
  const shimmerAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(shimmerAnim, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        }),
        Animated.timing(shimmerAnim, {
          toValue: 0,
          duration: 1000,
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, [shimmerAnim]);

  const opacity = shimmerAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0.3, 0.7],
  });

  return (
    <View style={[s.card, { backgroundColor: themeColors.card }]}>
      <View style={s.header}>
        <Animated.View style={[s.avatar, { backgroundColor: themeColors.card2, opacity }]} />
        <View style={s.headerText}>
          <Animated.View style={[s.line, { width: '40%', backgroundColor: themeColors.card2, opacity }]} />
          <Animated.View style={[s.line, { width: '25%', height: 8, marginTop: 6, backgroundColor: themeColors.card2, opacity }]} />
        </View>
      </View>
      
      <View style={s.content}>
        <Animated.View style={[s.line, { width: '90%', height: 16, backgroundColor: themeColors.card2, opacity }]} />
        <Animated.View style={[s.line, { width: '70%', height: 16, marginTop: 10, backgroundColor: themeColors.card2, opacity }]} />
      </View>

      <View style={s.footer}>
        <Animated.View style={[s.pill, { backgroundColor: themeColors.card2, opacity }]} />
        <Animated.View style={[s.pill, { width: 60, backgroundColor: themeColors.card2, opacity }]} />
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  card: {
    padding: 16,
    borderRadius: 24,
    marginBottom: 12,
    width: '100%',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
  },
  headerText: {
    marginLeft: 12,
    flex: 1,
  },
  line: {
    height: 12,
    borderRadius: 6,
  },
  content: {
    marginBottom: 20,
  },
  footer: {
    flexDirection: 'row',
    gap: 12,
  },
  pill: {
    height: 32,
    width: 80,
    borderRadius: 16,
  }
});
