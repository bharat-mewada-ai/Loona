import React from 'react';
import { View, Text, StyleSheet, SafeAreaView, Dimensions, Animated, Easing } from 'react-native';
import { useUIStore } from '../../src/store/uiStore';
import { getColors } from '../../src/theme/colors';
import { StatusBar } from 'expo-status-bar';

const { width } = Dimensions.get('window');

export default function NearbyScreen() {
  const isDark = useUIStore((s) => s.isDark);
  const themeColors = getColors(isDark);

  const rotateAnim = React.useRef(new Animated.Value(0)).current;

  React.useEffect(() => {
    Animated.loop(
      Animated.timing(rotateAnim, {
        toValue: 1,
        duration: 4000,
        easing: Easing.linear,
        useNativeDriver: true,
      })
    ).start();
  }, []);

  const rotation = rotateAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  return (
    <SafeAreaView style={[s.container, { backgroundColor: themeColors.bg }]}>
      <StatusBar style={isDark ? 'light' : 'dark'} />
      <View style={s.header}>
        <Text style={[s.title, { color: themeColors.txt }]}>loona</Text>
        <View style={s.badge}>
          <View style={s.dot} />
          <Text style={s.badgeTxt}>visible</Text>
        </View>
      </View>

      <View style={s.radarContainer}>
        {/* Radar Circles */}
        <View style={[s.circle, s.circle1, { borderColor: themeColors.bdr }]} />
        <View style={[s.circle, s.circle2, { borderColor: themeColors.bdr }]} />
        <View style={[s.circle, s.circle3, { borderColor: themeColors.bdr }]} />

        {/* Radar Sweep */}
        <Animated.View style={[s.sweep, { transform: [{ rotate: rotation }] }]}>
          <View style={s.sweepGradient} />
        </Animated.View>

        {/* Center Avatar */}
        <View style={[s.centerAvatar, { backgroundColor: themeColors.ogi }]}>
          <Text style={s.avatarTxt}>Y</Text>
        </View>
        
        {/* Distance Labels */}
        <Text style={[s.distLabel, { top: '35%', right: '45%' }]}>~90m</Text>
        <Text style={[s.distLabel, { top: '20%', right: '35%' }]}>~150m</Text>
        <Text style={[s.distLabel, { top: '10%', right: '30%' }]}>~400m</Text>
      </View>

      <View style={s.status}>
        <View style={s.statusBar}>
          <Text style={s.statusTxt}>🌙 8 people around you</Text>
        </View>
      </View>

      <View style={s.listHeader}>
        <Text style={[s.nearbyTitle, { color: themeColors.txt }]}>NEARBY</Text>
        <Text style={s.sortTxt}>closest first</Text>
      </View>

      {/* Mock List Item for UI Preview */}
      <View style={[s.card, { backgroundColor: themeColors.card2 }]}>
        <View style={s.cardAvatar}>
          <Text style={{ fontSize: 24 }}>🦊</Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={[s.cardName, { color: themeColors.txt }]}>CrypticFox</Text>
          <Text style={s.cardDist}>~90m away <Text style={s.cardBadge}>VERY CLOSE</Text></Text>
        </View>
        <TouchableOpacity style={s.chatBtn}>
          <Text style={s.chatBtnTxt}>💬 Chat</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20 },
  title: { fontSize: 24, fontWeight: 'bold', letterSpacing: -1 },
  badge: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#1A1A1A', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, gap: 6 },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#A3FF00' },
  badgeTxt: { color: '#888', fontSize: 12, fontWeight: '600' },
  radarContainer: { height: width, width: width, justifyContent: 'center', alignItems: 'center', marginVertical: 20 },
  circle: { position: 'absolute', borderRadius: 1000, borderWidth: 1, opacity: 0.2 },
  circle1: { width: width * 0.3, height: width * 0.3 },
  circle2: { width: width * 0.6, height: width * 0.6 },
  circle3: { width: width * 0.9, height: width * 0.9 },
  sweep: { position: 'absolute', width: width * 0.45, height: width * 0.45, top: width * 0.05, left: width * 0.5, transformOrigin: 'left bottom' },
  sweepGradient: { flex: 1, backgroundColor: 'rgba(163, 255, 0, 0.1)', borderTopLeftRadius: width, opacity: 0.5 },
  centerAvatar: { width: 50, height: 50, borderRadius: 25, alignItems: 'center', justifyContent: 'center', zIndex: 10 },
  avatarTxt: { color: '#000', fontWeight: 'bold', fontSize: 18 },
  distLabel: { position: 'absolute', fontSize: 10, color: '#555', fontWeight: '600' },
  status: { alignItems: 'center', marginBottom: 20 },
  statusBar: { backgroundColor: '#A3FF00', paddingHorizontal: 20, paddingVertical: 8, borderRadius: 25 },
  statusTxt: { color: '#000', fontWeight: '800', fontSize: 13 },
  listHeader: { flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 20, marginBottom: 15 },
  nearbyTitle: { fontSize: 18, fontWeight: '800', letterSpacing: 1 },
  sortTxt: { color: '#A3FF00', fontSize: 12, fontWeight: '700' },
  card: { marginHorizontal: 20, padding: 15, borderRadius: 20, flexDirection: 'row', alignItems: 'center', gap: 15 },
  cardAvatar: { width: 50, height: 50, borderRadius: 25, backgroundColor: '#333', alignItems: 'center', justifyContent: 'center' },
  cardName: { fontSize: 18, fontWeight: '700' },
  cardDist: { fontSize: 13, color: '#888', marginTop: 2 },
  cardBadge: { color: '#A3FF00', fontWeight: '800' },
  chatBtn: { backgroundColor: '#A3FF00', paddingHorizontal: 20, paddingVertical: 10, borderRadius: 15 },
  chatBtnTxt: { color: '#000', fontWeight: '800' }
});

import { TouchableOpacity } from 'react-native';
