import React, { useState, useEffect, useRef } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  Dimensions, 
  Animated, 
  Easing, 
  TouchableOpacity, 
  ActivityIndicator, 
  FlatList,
  Alert
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useUIStore } from '../../src/store/uiStore';
import { getColors } from '../../src/theme/colors';
import { StatusBar } from 'expo-status-bar';
import * as Location from 'expo-location';
import { useWaveUser, useAuth, useNearby, useUpdateLocation, useUpdateProfile } from '../../src/hooks/useAuth';
import { useStartChat } from '../../src/hooks/useChat';
import { requestLocation } from '../../src/hooks/useLocation';
import { useRouter } from 'expo-router';
import { triggerHaptic } from "../../src/utils/haptics";

const { width } = Dimensions.get('window');
const LIME = '#c8f53a'; // Loona lime accent — brand color, intentionally fixed
const ORANGE = '#ff6b35'; // burnt orange

const THEME = {
  bg: '#0a0a0f',
  accent: LIME,
  border: 'rgba(255,255,255,0.05)',
  surface2: 'rgba(255,255,255,0.03)',
};

export default function NearbyScreen() {
  const isDark = useUIStore((s) => s.isDark);
  const themeColors = getColors(isDark);
  const router = useRouter();
  const { user } = useAuth();

  const { data: nearbyUsers, isLoading, refetch } = useNearby();
  const { mutate: updateLocation } = useUpdateLocation();
  const { mutate: updateProfile } = useUpdateProfile();
  const { mutate: startChat, isPending: isStartingChat } = useStartChat();
  const { mutate: waveUser } = useWaveUser();

  const [isVisible, setIsVisible] = useState(!user?.isPrivate);
  const rotateAnim = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const pingAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Sweep Animation
    const sweep = Animated.loop(
      Animated.timing(rotateAnim, {
        toValue: 1,
        duration: 3000,
        easing: Easing.linear,
        useNativeDriver: false,
      })
    );
    sweep.start();

    // Pulse Animation
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.5, duration: 1000, useNativeDriver: false }),
        Animated.timing(pulseAnim, { toValue: 1, duration: 1000, useNativeDriver: false }),
      ])
    ).start();

    // Ping Animation (Expanding Rings)
    Animated.loop(
      Animated.timing(pingAnim, {
        toValue: 1,
        duration: 2000,
        easing: Easing.out(Easing.quad),
        useNativeDriver: false,
      })
    ).start();

    // Location Logic
    (async () => {
      const loc = await requestLocation();
      if (loc) {
        updateLocation(loc);
        refetch();
      }
    })();

    return () => sweep.stop();
  }, []);

  const rotation = rotateAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  const pingScale = pingAnim.interpolate({ inputRange: [0, 1], outputRange: [0, 1.8] });
  const pingOpacity = pingAnim.interpolate({ inputRange: [0, 1], outputRange: [0.4, 0] });

  const handleChat = (targetUserId: string) => {
    triggerHaptic('selection');
    startChat({ targetUserId, postId: 'nearby' }, {
      onSuccess: (chat) => router.push(`/chat/${chat._id}`),
    });
  };

  const handleWave = (userId: string, name: string) => {
    triggerHaptic('impact');
    waveUser(userId, {
      onSuccess: () => Alert.alert('👋 Wave Sent!', `You waved at ${name}.`),
      onError: (err: any) => Alert.alert('Error', err.response?.data?.error || 'Could not wave'),
    });
  };

  const renderRadarPerson = (user: any) => {
    const radarSize = width * 0.6;
    const maxRadius = radarSize * 0.5;
    const radius = Math.max(radarSize * 0.1, Math.min((user.distance / 500) * maxRadius, maxRadius));
    const angle = (parseInt(user._id.slice(-4), 16) % 360) * (Math.PI / 180);
    const x = radius * Math.cos(angle);
    const y = radius * Math.sin(angle);

    return (
      <View key={user._id} style={[s.radarPerson, { transform: [{ translateX: x }, { translateY: y }] }]}>
        <View style={s.personAvatar}>
          <Text style={{ fontSize: 16 }}>{user.avatar || '👤'}</Text>
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={[s.container, { backgroundColor: isDark ? '#0a0a0f' : themeColors.bg }]}>
      <StatusBar style="light" />

      {/* NAV */}
      <View style={s.nav}>
        <Text style={[s.navTitle, { color: themeColors.txt }]}>loon<Text style={{ color: LIME }}>a</Text></Text>
        <View style={s.navActions}>
          <TouchableOpacity
            style={[s.ghostPill, !isVisible && s.ghosted, { backgroundColor: themeColors.card2, borderColor: themeColors.bdr }]}
            onPress={() => {
              const newVisible = !isVisible;
              setIsVisible(newVisible);
              updateProfile({ isPrivate: !newVisible });
            }}
          >
            <View style={[s.dot, !isVisible && { backgroundColor: themeColors.txt3, shadowOpacity: 0 }]} />
            <Text style={[s.ghostLabel, { color: !isVisible ? themeColors.txt3 : themeColors.txt }]}>
              {isVisible ? 'visible' : 'ghosted'}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity style={[s.iconBtn, { backgroundColor: themeColors.card2, borderColor: themeColors.bdr }]} onPress={() => refetch()}>
            <Text style={{ fontSize: 14 }}>🔄</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* RADAR */}
      <View style={s.radarSection}>
        <View style={s.radarBg} />
        
        {/* Rings */}
        <View style={[s.ring, s.ring3]} />
        <View style={[s.ring, s.ring2]} />
        <View style={[s.ring, s.ring1]} />

        {/* Dynamic Ping Waves */}
        <Animated.View style={[s.ping, { transform: [{ scale: pingScale }], opacity: pingOpacity }]} />

        {/* Sweep */}
        <Animated.View style={[s.sweep, { transform: [{ rotate: rotation }] }]}>
          <View style={s.sweepLine} />
          <View style={[s.sweepLine, { transform: [{ rotate: '-10deg' }], opacity: 0.3 }]} />
          <View style={[s.sweepLine, { transform: [{ rotate: '-20deg' }], opacity: 0.1 }]} />
          <View style={s.sweepTail} />
        </Animated.View>

        {/* You Dot */}
        <View style={s.youDot}>
          <Animated.View style={[s.youPulse, { transform: [{ scale: pulseAnim }] }]} />
          <View style={s.youInner}>
            <Text style={s.youTxt}>{user?.name?.charAt(0).toUpperCase() || 'Y'}</Text>
          </View>
        </View>

        {/* People on Radar */}
        {nearbyUsers?.map(u => renderRadarPerson(u))}

        {/* Count Pill */}
        <View style={s.countPill}>
          <Text style={s.countTxt}>🌙 {nearbyUsers?.length || 0} people around you</Text>
        </View>
      </View>

      {/* LIST */}
      <View style={s.sectionHeader}>
        <Text style={[s.sectionTitle, { color: themeColors.txt3 }]}>Nearby</Text>
        <Text style={[s.sortBtn, { color: LIME }]}>closest first</Text>
      </View>

      {isLoading ? (
        <ActivityIndicator color={THEME.accent} style={{ marginTop: 20 }} />
      ) : (
        <FlatList
          data={nearbyUsers}
          keyExtractor={item => item._id}
          contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 40 }}
          renderItem={({ item }) => {
            const isVeryClose = item.distance < 250;
            return (
              <View style={[s.personCard, { backgroundColor: themeColors.card, borderColor: themeColors.bdr }, isVeryClose && s.veryCloseCard]}>
                <View style={[s.cardEmoji, { backgroundColor: themeColors.card2, borderColor: themeColors.bdr }]}>
                  <Text style={{ fontSize: 20 }}>{item.avatar || '👤'}</Text>
                </View>
                <View style={s.cardInfo}>
                  <Text style={[s.cardName, { color: themeColors.txt }]}>{item.name}</Text>
                  <View style={s.cardMeta}>
                    <View style={[s.zoneBadge, isVeryClose ? s.zoneClose : s.zoneNear]}>
                      <Text style={[s.zoneTxt, { color: isVeryClose ? LIME : ORANGE }]}>
                        {isVeryClose ? 'very close' : 'nearby'}
                      </Text>
                    </View>
                  </View>
                </View>
                <View style={s.cardAction}>
                  <TouchableOpacity
                    style={[s.waveBtn, { backgroundColor: themeColors.card2, borderColor: themeColors.bdr }, isVeryClose && s.chatBtn]}
                    onPress={() => isVeryClose ? handleChat(item._id) : handleWave(item._id, item.name)}
                  >
                    <Text style={[s.waveBtnTxt, { color: isVeryClose ? '#0a0a0f' : themeColors.txt }]}>
                      {isVeryClose ? '💬 Chat' : '👋 Wave'}
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            );
          }}
          ListEmptyComponent={() => (
            <View style={{ alignItems: 'center', marginTop: 40 }}>
              <Text style={{ color: themeColors.txt3, fontSize: 14, fontWeight: '600' }}>👻 No one around right now.</Text>
              <Text style={{ color: themeColors.txt3, fontSize: 12, marginTop: 6 }}>Enable location or check back later.</Text>
            </View>
          )}
        />
      )}
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1 },
  nav: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 12 },
  navTitle: { fontSize: 22, fontWeight: '800', letterSpacing: -0.5 },
  navActions: { flexDirection: 'row', gap: 10 },
  iconBtn: { width: 38, height: 38, borderRadius: 12, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  ghostPill: { flexDirection: 'row', alignItems: 'center', gap: 6, borderWidth: 1, borderRadius: 20, paddingHorizontal: 12, paddingVertical: 6 },
  ghosted: { opacity: 0.7 },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: LIME, shadowColor: LIME, shadowOpacity: 0.5, shadowRadius: 4 },
  ghostLabel: { fontSize: 12, fontWeight: '600' },

  radarSection: { height: 280, justifyContent: 'center', alignItems: 'center', marginHorizontal: 20, marginVertical: 8 },
  radarBg: { ...StyleSheet.absoluteFillObject, borderRadius: 24, backgroundColor: 'rgba(200, 245, 58, 0.02)' },
  ring: { position: 'absolute', borderRadius: 1000, borderWidth: 1, borderColor: THEME.border },
  ring1: { width: 80, height: 80, borderColor: 'rgba(200, 245, 58, 0.15)' },
  ring2: { width: 150, height: 150, borderColor: 'rgba(200, 245, 58, 0.08)' },
  ring3: { width: 220, height: 220, borderColor: 'rgba(200, 245, 58, 0.05)' },

  ping: { position: 'absolute', width: 220, height: 220, borderRadius: 110, borderWidth: 2, borderColor: THEME.accent },

  sweep: { position: 'absolute', width: 220, height: 220, justifyContent: 'center', alignItems: 'center' },
  sweepLine: { width: 2, height: '50%', backgroundColor: THEME.accent, opacity: 0.8, position: 'absolute', top: 0, zIndex: 10 },
  sweepTail: { 
    position: 'absolute', 
    top: 0, 
    width: 80, 
    height: '50%', 
    backgroundColor: 'rgba(200, 245, 58, 0.15)',
    borderTopLeftRadius: 110,
    opacity: 0.5,
    transform: [{ translateX: -40 }]
  },

  youDot: { width: 28, height: 28, alignItems: 'center', justifyContent: 'center', zIndex: 10 },
  youInner: { width: 28, height: 28, borderRadius: 14, backgroundColor: THEME.accent, alignItems: 'center', justifyContent: 'center' },
  youTxt: { color: THEME.bg, fontWeight: '800', fontSize: 13 },
  youPulse: { position: 'absolute', width: 28, height: 28, borderRadius: 14, backgroundColor: THEME.accent, opacity: 0.2 },

  radarPerson: { position: 'absolute', zIndex: 5 },
  personAvatar: { width: 36, height: 36, borderRadius: 18, backgroundColor: THEME.surface2, borderWidth: 2, borderColor: THEME.border, alignItems: 'center', justifyContent: 'center' },

  countPill: { position: 'absolute', bottom: 16, backgroundColor: 'rgba(200, 245, 58, 0.1)', borderWidth: 1, borderColor: 'rgba(200, 245, 58, 0.2)', borderRadius: 20, paddingHorizontal: 14, paddingVertical: 5 },
  countTxt: { color: LIME, fontWeight: '700', fontSize: 11 },

  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 20, marginTop: 10, marginBottom: 12 },
  sectionTitle: { fontSize: 13, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 0.8 },
  sortBtn: { fontSize: 11, fontWeight: '600' },

  personCard: { borderWidth: 1, borderRadius: 18, padding: 14, flexDirection: 'row', alignItems: 'center', gap: 14, marginBottom: 8 },
  veryCloseCard: { borderColor: 'rgba(200, 245, 58, 0.15)', backgroundColor: 'rgba(200, 245, 58, 0.02)' },
  cardEmoji: { width: 44, height: 44, borderRadius: 14, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  cardInfo: { flex: 1 },
  cardName: { fontSize: 15, fontWeight: '700', marginBottom: 2 },
  cardMeta: { flexDirection: 'row', alignItems: 'center' },
  zoneBadge: { paddingHorizontal: 7, paddingVertical: 2, borderRadius: 6 },
  zoneClose: { backgroundColor: 'rgba(200, 245, 58, 0.1)' },
  zoneNear: { backgroundColor: 'rgba(255, 107, 53, 0.08)' },
  zoneTxt: { fontSize: 10, fontWeight: '800', textTransform: 'uppercase' },
  
  cardAction: { },
  waveBtn: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 12, borderWidth: 1 },
  chatBtn: { backgroundColor: LIME, borderColor: LIME },
  waveBtnTxt: { fontSize: 13, fontWeight: '700' }
});
