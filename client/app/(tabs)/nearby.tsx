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
  Alert
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { FlashList } from '@shopify/flash-list';
import { useUIStore } from '../../src/store/uiStore';
import { getColors } from '../../src/theme/colors';
import { StatusBar } from 'expo-status-bar';
import { useWaveUser, useAuth, useNearby, useUpdateLocation, useUpdateProfile } from '../../src/hooks/useAuth';
import { useQueryClient } from '@tanstack/react-query';
import { useStartChat } from '../../src/hooks/useChat';
import { requestLocation } from '../../src/hooks/useLocation';
import { useRouter } from 'expo-router';
import { triggerHaptic } from "../../src/utils/haptics";
import { useAnalytics } from '../../src/hooks/useAnalytics';

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
  
  useAnalytics('nearby');

  const [locSynced, setLocSynced] = useState(false);
  const queryClient = useQueryClient();
  const { data: nearbyUsers, isLoading, refetch } = useNearby(locSynced);
  const { mutateAsync: updateLocationAsync } = useUpdateLocation();
  const { mutate: updateProfile } = useUpdateProfile();
  const { mutate: startChat } = useStartChat();
  const { mutate: waveUser } = useWaveUser();

  const [activeActionUserId, setActiveActionUserId] = useState<string | null>(null);
  const [isVisible, setIsVisible] = useState(!user?.isPrivate);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const rotateAnim = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const pingAnim = useRef(new Animated.Value(0)).current;

  const handleRefresh = async () => {
    triggerHaptic('impact');
    setIsRefreshing(true);
    try {
      // forceFresh=true: bypass GPS cache, get actual current position
      const loc = await requestLocation(true);
      if (loc) {
        // Wait for server to confirm location is saved before querying nearby
        await updateLocationAsync(loc);
      }
      // Invalidate cached nearby data so the next fetch always hits the network
      await queryClient.invalidateQueries({ queryKey: ['nearby'] });
      await refetch();
    } catch (err) {
      console.error('Nearby refresh error:', err);
    } finally {
      setIsRefreshing(false);
    }
  };

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

    // Location Logic — on mount, update location then fetch nearby
    (async () => {
      try {
        const loc = await requestLocation(false); // OK to use cached GPS on mount
        if (loc) {
          await updateLocationAsync(loc);
        }
      } catch (err) {
        console.error('Initial location update failed:', err);
      } finally {
        setLocSynced(true);
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
    setActiveActionUserId(targetUserId);
    startChat({ targetUserId, postId: 'nearby' }, {
      onSuccess: (chat) => {
        setActiveActionUserId(null);
        router.push(`/chat/${chat._id}`);
      },
      onError: (err: any) => {
        setActiveActionUserId(null);
        Alert.alert('Error', err.response?.data?.error || 'Could not start chat');
      },
    });
  };

  const handleWave = (userId: string, name: string) => {
    triggerHaptic('impact');
    setActiveActionUserId(userId);
    waveUser(userId, {
      onSuccess: () => {
        setActiveActionUserId(null);
        Alert.alert('👋 Wave Sent!', `You waved at ${name}.`);
      },
      onError: (err: any) => {
        setActiveActionUserId(null);
        Alert.alert('Error', err.response?.data?.error || 'Could not wave');
      },
    });
  };

  const renderRadarPerson = (user: any) => {
    if (user.distance > 500) return null; // Exclude users further than 500m from radar view

    const radarSize = width * 0.6;
    const maxRadius = radarSize * 0.5;
    const radius = Math.max(radarSize * 0.1, Math.min((user.distance / 500) * maxRadius, maxRadius));
    const angle = (parseInt(user._id.slice(-4), 16) % 360) * (Math.PI / 180);
    const x = radius * Math.cos(angle);
    const y = radius * Math.sin(angle);

    return (
      <View key={user._id} style={[s.radarPerson, { transform: [{ translateX: x }, { translateY: y }] }]}>
        <View style={[s.personAvatar, { borderColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)' }]}>
          <Text style={{ fontSize: 16 }}>{user.avatar || '👤'}</Text>
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={[s.container, { backgroundColor: isDark ? '#0a0a0f' : themeColors.bg }]}>
      <StatusBar style={isDark ? "light" : "dark"} />

      {/* NAV */}
      <View style={s.nav}>
        <Text style={[s.navTitle, { color: themeColors.txt }]}>loon<Text style={{ color: LIME }}>a</Text></Text>
        <View style={s.navActions}>
          {/* Potato balance pill */}
          <View style={[s.potatoPill, { backgroundColor: themeColors.card2, borderColor: themeColors.bdr }]}>
            <Text style={{ fontSize: 14 }}>🥔</Text>
            <Text style={[s.potatoCount, { color: isDark ? LIME : '#3f6212' }]}>{user?.potato || 0}</Text>
          </View>
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
          <TouchableOpacity 
            style={[s.iconBtn, { backgroundColor: themeColors.card2, borderColor: themeColors.bdr }]} 
            onPress={handleRefresh}
            disabled={isRefreshing}
          >
            {isRefreshing ? (
              <ActivityIndicator color={themeColors.ogi} size="small" />
            ) : (
              <Text style={{ fontSize: 14 }}>🔄</Text>
            )}
          </TouchableOpacity>
        </View>
      </View>

      {/* RADAR */}
      <View style={s.radarSection}>
        <View style={[s.radarBg, { backgroundColor: isDark ? 'rgba(200, 245, 58, 0.02)' : 'rgba(0, 0, 0, 0.015)' }]} />
        
        {/* Rings */}
        <View style={[s.ring, s.ring3, { borderColor: isDark ? 'rgba(200, 245, 58, 0.05)' : 'rgba(0, 0, 0, 0.08)' }]} />
        <Text style={[s.ringLabel, { top: 32, color: isDark ? 'rgba(255, 255, 255, 0.25)' : 'rgba(0, 0, 0, 0.35)' }]}>500m</Text>

        <View style={[s.ring, s.ring2, { borderColor: isDark ? 'rgba(200, 245, 58, 0.08)' : 'rgba(0, 0, 0, 0.12)' }]} />
        <Text style={[s.ringLabel, { top: 67, color: isDark ? 'rgba(255, 255, 255, 0.25)' : 'rgba(0, 0, 0, 0.35)' }]}>300m</Text>

        <View style={[s.ring, s.ring1, { borderColor: isDark ? 'rgba(200, 245, 58, 0.15)' : 'rgba(0, 0, 0, 0.2)' }]} />
        <Text style={[s.ringLabel, { top: 102, color: isDark ? 'rgba(255, 255, 255, 0.25)' : 'rgba(0, 0, 0, 0.35)' }]}>100m</Text>

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
        <View style={[
          s.countPill, 
          { 
            backgroundColor: isDark ? 'rgba(200, 245, 58, 0.1)' : '#1e293b',
            borderColor: isDark ? 'rgba(200, 245, 58, 0.2)' : '#0f172a'
          }
        ]}>
          <Text style={s.countTxt}>🌙 {nearbyUsers?.length || 0} people around you</Text>
        </View>
      </View>

      {/* LIST */}
      <View style={s.sectionHeader}>
        <Text style={[s.sectionTitle, { color: themeColors.txt3 }]}>Nearby</Text>
        <Text style={[s.sortBtn, { color: isDark ? LIME : '#3f6212' }]}>closest first</Text>
      </View>

      {isLoading ? (
        <ActivityIndicator color={THEME.accent} style={{ marginTop: 20 }} />
      ) : (
        <FlashList
          data={nearbyUsers}
          keyExtractor={item => item._id}
          contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 40 }}
          estimatedItemSize={80}
          renderItem={({ item }) => {
            const isVeryClose = item.distance < 250;
            const isActionPending = activeActionUserId === item._id;
            const isAnyActionPending = !!activeActionUserId;
            return (
              <View style={[
                s.personCard, 
                { 
                  backgroundColor: themeColors.card, 
                  borderColor: themeColors.bdr,
                  ...(!isDark && {
                    shadowColor: '#000',
                    shadowOffset: { width: 0, height: 2 },
                    shadowOpacity: 0.03,
                    shadowRadius: 8,
                    elevation: 1,
                  })
                }, 
                isVeryClose && (
                  isDark 
                    ? s.veryCloseCard 
                    : { borderColor: 'rgba(56, 142, 60, 0.18)', backgroundColor: 'rgba(56, 142, 60, 0.03)' }
                )
              ]}>
                <View style={[s.cardEmoji, { backgroundColor: themeColors.card2, borderColor: themeColors.bdr }]}>
                  <Text style={{ fontSize: 20 }}>{item.avatar || '👤'}</Text>
                </View>
                <View style={s.cardInfo}>
                  <Text style={[s.cardName, { color: themeColors.txt }]}>{item.name}</Text>
                  {!!item.bio && (
                    <Text
                      style={[s.cardBio, { color: themeColors.txt3 }]}
                      numberOfLines={1}
                    >
                      {item.bio}
                    </Text>
                  )}
                  <View style={s.cardMeta}>
                    <View style={[
                      s.zoneBadge, 
                      isVeryClose ? s.zoneClose : s.zoneNear,
                      isVeryClose 
                        ? { backgroundColor: isDark ? 'rgba(200, 245, 58, 0.1)' : 'rgba(22, 163, 74, 0.08)' }
                        : { backgroundColor: isDark ? 'rgba(255, 107, 53, 0.08)' : 'rgba(234, 88, 12, 0.08)' }
                    ]}>
                      <Text style={[s.zoneTxt, { color: isVeryClose ? (isDark ? LIME : '#15803d') : (isDark ? ORANGE : '#c2410c') }]}>
                        {isVeryClose ? 'very close' : 'nearby'}
                      </Text>
                    </View>
                  </View>
                </View>
                <View style={s.cardAction}>
                  <TouchableOpacity
                    style={[
                      s.waveBtn, 
                      { backgroundColor: themeColors.card2, borderColor: themeColors.bdr },
                      isActionPending && { opacity: 0.6 }
                    ]}
                    disabled={isAnyActionPending}
                    onPress={() => isVeryClose ? handleChat(item._id) : handleWave(item._id, item.name)}
                  >
                    {isActionPending ? (
                      <ActivityIndicator size="small" color={isVeryClose ? (isDark ? LIME : '#3f6212') : themeColors.txt} />
                    ) : (
                      <>
                        <Text style={[
                          s.waveBtnTxt, 
                          { color: isVeryClose ? (isDark ? LIME : '#3f6212') : themeColors.txt }
                        ]}>
                          {isVeryClose ? '💬 Chat' : '👋 Wave'}
                        </Text>
                        {/* Cost badge */}
                        <View style={[
                          s.costBadge, 
                          { backgroundColor: isDark ? 'rgba(200,245,58,0.15)' : 'rgba(63,98,18,0.1)' }
                        ]}>
                          <Text style={[s.costTxt, { color: isDark ? LIME : '#3f6212' }]}>
                            🥔{isVeryClose ? 10 : 5}
                          </Text>
                        </View>
                      </>
                    )}
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
  radarBg: { ...StyleSheet.absoluteFillObject, borderRadius: 24 },
  ring: { position: 'absolute', borderRadius: 1000, borderWidth: 1 },
  ring1: { width: 80, height: 80 },
  ring2: { width: 150, height: 150 },
  ring3: { width: 220, height: 220 },
  ringLabel: {
    position: 'absolute',
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 0.5,
  },

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
  personAvatar: { width: 36, height: 36, borderRadius: 18, backgroundColor: THEME.surface2, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },

  countPill: { position: 'absolute', bottom: 16, borderWidth: 1, borderRadius: 20, paddingHorizontal: 14, paddingVertical: 5 },
  countTxt: { color: LIME, fontWeight: '700', fontSize: 11 },

  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 20, marginTop: 10, marginBottom: 12 },
  sectionTitle: { fontSize: 13, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 0.8 },
  sortBtn: { fontSize: 11, fontWeight: '600' },

  personCard: { borderWidth: 1, borderRadius: 18, padding: 14, flexDirection: 'row', alignItems: 'center', gap: 14, marginBottom: 8 },
  veryCloseCard: { borderColor: 'rgba(200, 245, 58, 0.15)', backgroundColor: 'rgba(200, 245, 58, 0.02)' },
  cardEmoji: { width: 44, height: 44, borderRadius: 14, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  cardInfo: { flex: 1 },
  cardName: { fontSize: 15, fontWeight: '700', marginBottom: 1 },
  cardBio: { fontSize: 11, fontWeight: '400', marginBottom: 2, opacity: 0.7 },
  cardMeta: { flexDirection: 'row', alignItems: 'center' },
  zoneBadge: { paddingHorizontal: 7, paddingVertical: 2, borderRadius: 6 },
  zoneClose: { },
  zoneNear: { },
  zoneTxt: { fontSize: 10, fontWeight: '800', textTransform: 'uppercase' },
  
  cardAction: { },
  waveBtn: { 
    paddingHorizontal: 14, 
    paddingVertical: 8, 
    borderRadius: 12, 
    borderWidth: 1, 
    flexDirection: 'row', 
    alignItems: 'center', 
    gap: 6 
  },
  chatBtn: { backgroundColor: LIME, borderColor: LIME },
  waveBtnTxt: { fontSize: 13, fontWeight: '700' },
  costBadge: { paddingHorizontal: 5, paddingVertical: 2, borderRadius: 6 },
  costTxt: { fontSize: 10, fontWeight: '800' },
  potatoPill: { flexDirection: 'row', alignItems: 'center', gap: 4, borderWidth: 1, borderRadius: 16, paddingHorizontal: 10, paddingVertical: 5 },
  potatoCount: { fontSize: 12, fontWeight: '800' },
});
