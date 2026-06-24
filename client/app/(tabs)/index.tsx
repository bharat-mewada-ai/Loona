import React, { useState, useEffect, useCallback } from "react";
import { 
  View, 
  Text, 
  TouchableOpacity, 
  ScrollView, 
  ActivityIndicator, 
  StyleSheet,
  Modal,
  Platform,
  RefreshControl,
  Image,
} from "react-native";
import { SafeAreaView } from 'react-native-safe-area-context';
import { FlashList } from '@shopify/flash-list';
import { Ionicons } from '@expo/vector-icons';
import * as Location from "expo-location";
import NetInfo from '@react-native-community/netinfo';
import { useRouter } from "expo-router";
import { triggerHaptic } from "../../src/utils/haptics";
import { usePosts, useCreatePost } from "../../src/hooks/usePosts";
import { requestLocation } from "../../src/hooks/useLocation";
import { useLeaderboard } from "../../src/hooks/useAuth";
import { useAnalytics } from "../../src/hooks/useAnalytics";
import { useUIStore } from "../../src/store/uiStore";
import { useAuthStore } from "../../src/store/authStore";
import { getColors } from "../../src/theme/colors";
import { CAMPUSES, POST_TYPES } from "../../src/constants";
import PostCard from "../../src/components/PostCard";
import FeedSkeleton from "../../src/components/FeedSkeleton";
import { Campus, TabFilter } from "../../src/types";
import EmptyState from "../../src/components/EmptyState";
import StoryRail from "../../src/components/StoryRail";
import EventsView from "../../src/components/EventsView";
import { useDeletePost } from "../../src/hooks/usePosts";

import { useTodayPoll, useVoteTodayPoll } from "../../src/hooks/useDailyPoll";
import { postsApi } from "../../src/api/posts.api";
import { BlurView } from "expo-blur";

export default function Feed() {
  useAnalytics('home');
  const router = useRouter();
  const { data, fetchNextPage, hasNextPage, isFetchingNextPage, isFetching, isLoading, refetch } = usePosts();
  const { mutate: deletePost } = useDeletePost();
  const { data: leaderboardData } = useLeaderboard();
  
  const { user } = useAuthStore();
  const [userLocation, setUserLocation] = useState<{ latitude: number; longitude: number } | null>(null);

  const { data: poll, isLoading: pollLoading } = useTodayPoll();
  const { mutate: votePoll, isPending: isVoting } = useVoteTodayPoll();
  const [shakeModalVisible, setShakeModalVisible] = useState(false);
  const [randomPost, setRandomPost] = useState<any>(null);
  const [shakeLoading, setShakeLoading] = useState(false);

  useEffect(() => {
    (async () => {
      const loc = await requestLocation();
      if (loc) setUserLocation(loc);
    })();
  }, []);

  // Fix: auto-refetch when user switches to events tab so data appears without manual pull-to-refresh
  useEffect(() => {
    if (activeTab === 'events') {
      refetch();
    }
  }, [activeTab]);

  const handleShakeSneak = async () => {
    if (shakeModalVisible || shakeLoading || !user) return;
    triggerHaptic();
    setShakeLoading(true);
    try {
      const otherCampus = user?.campus === 'ogi' ? 'lnct' : 'ogi';
      const res = await postsApi.getFeed({ campus: otherCampus, limit: 15 });
      if (res && res.posts && res.posts.length > 0) {
        const randomIdx = Math.floor(Math.random() * res.posts.length);
        setRandomPost(res.posts[randomIdx]);
        setShakeModalVisible(true);
      }
    } catch (err) {
      console.warn("Shake to Sneak fetch failed", err);
    } finally {
      setShakeLoading(false);
    }
  };

  // Shake detector (disabled to prevent native module crashes on older builds)
  useEffect(() => {
    console.log("[Accelerometer] Disabled to prevent startup crash on this build version.");
  }, [user, shakeModalVisible, shakeLoading]);

  const activeCampus = useUIStore(s => s.activeCampus);
  const activeTab = useUIStore(s => s.activeTab);
  const setCampus = useUIStore(s => s.setCampus);
  const setTab = useUIStore(s => s.setTab);
  const isDark = useUIStore(s => s.isDark);
  const toggleDark = useUIStore(s => s.toggleDark);
  const openComposeSheet = useUIStore(s => s.openComposeSheet);

  const themeColors = getColors(isDark);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [isOffline, setIsOffline] = useState(false);

  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener(state => {
      setIsOffline(!(state.isConnected && state.isInternetReachable !== false));
    });
    return () => unsubscribe();
  }, []);
  let posts = data?.pages.flatMap((page) => page.posts) ?? [];

  // Filter stories out of 'all' feed because they are in the Rail
  if (activeTab === 'all') {
    posts = posts.filter(p => p.type !== 'stories');
  }

  const handleSelectCampus = (c: Campus) => {
    setCampus(c);
    setDropdownOpen(false);
  };

  const DailyPollWidget = () => {
    if (pollLoading || !poll) return null;
    const totalVotes = poll.options.reduce((acc, opt) => acc + opt.votes, 0);

    return (
      <View style={[s.pollCard, { backgroundColor: themeColors.card, borderColor: themeColors.bdr }]}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 8 }}>
          <Text style={{ fontSize: 11, fontWeight: '900', color: themeColors.ogi, letterSpacing: 1 }}>POLL OF THE DAY</Text>
          <View style={{ backgroundColor: themeColors.ogi + '20', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6 }}>
            <Text style={{ color: themeColors.ogi, fontSize: 8, fontWeight: '900' }}>LIVE</Text>
          </View>
        </View>
        <Text style={{ fontSize: 15, fontWeight: '800', color: themeColors.txt, marginBottom: 12 }}>{poll.question}</Text>
        <View style={{ gap: 8 }}>
          {poll.options.map((opt, idx) => {
            const hasVoted = poll.userVote !== null && poll.userVote !== undefined;
            const isSelected = poll.userVote === idx;
            const percent = totalVotes > 0 ? Math.round((opt.votes / totalVotes) * 100) : 0;

            if (hasVoted) {
              return (
                <View key={idx} style={{ height: 44, borderRadius: 12, backgroundColor: themeColors.card2, overflow: 'hidden', justifyContent: 'center' }}>
                  <View style={{ position: 'absolute', top: 0, bottom: 0, left: 0, width: `${percent}%`, backgroundColor: isSelected ? themeColors.ogi + '25' : themeColors.bdr + '50' }} />
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16 }}>
                    <Text style={{ color: themeColors.txt, fontSize: 13, fontWeight: isSelected ? '700' : '500' }}>
                      {opt.text} {isSelected && ' ⭐️'}
                    </Text>
                    <Text style={{ color: themeColors.txt2, fontSize: 12, fontWeight: '700' }}>{percent}% ({opt.votes})</Text>
                  </View>
                </View>
              );
            }

            return (
              <TouchableOpacity
                key={idx}
                style={{ height: 44, borderRadius: 12, borderWidth: 1, borderColor: themeColors.bdr, justifyContent: 'center', paddingHorizontal: 16 }}
                onPress={() => {
                  triggerHaptic();
                  votePoll(idx);
                }}
                disabled={isVoting}
              >
                <Text style={{ color: themeColors.txt, fontSize: 13, fontWeight: '600' }}>{opt.text}</Text>
              </TouchableOpacity>
            );
          })}
        </View>
        <Text style={{ color: themeColors.txt3, fontSize: 10, marginTop: 10 }}>Total Votes: {totalVotes}</Text>
      </View>
    );
  };

  const renderItem = useCallback(({ item }: { item: any }) => (
    <PostCard
      post={item}
      isAllTab={activeTab === 'all'}
      isConfessionTab={activeTab === 'confess'}
      userLocation={userLocation}
    />
  ), [activeTab, userLocation]);

  const renderHeader = () => {
    // Show Story Rail in 'All' tab only
    if (activeTab === 'all') {
      return (
        <View style={{ gap: 16, marginBottom: 8 }}>
          <StoryRail />
          <DailyPollWidget />
        </View>
      );
    }

    // Show Discussions Section only in Discussion tab
    if (activeTab === 'discussion') {
      return (
        <View style={{ marginBottom: 24 }}>
          <View style={s.sectionHeader}>
            <Text style={[s.sectionTitle, { color: themeColors.txt }]}>DISCUSSIONS</Text>
          </View>
          <TouchableOpacity
            style={[s.startDiscussionBanner, { backgroundColor: themeColors.card, borderColor: themeColors.bdr }]}
            onPress={() => openComposeSheet('discussion')}
            activeOpacity={0.8}
          >
            <Text style={{ fontSize: 28 }}>🗣️</Text>
            <View style={{ flex: 1 }}>
              <Text style={[{ fontSize: 15, fontWeight: '800', color: themeColors.txt }]}>Start a Discussion</Text>
              <Text style={[{ fontSize: 12, color: themeColors.txt3, marginTop: 2 }]}>Ask a question, spark a debate, share an opinion</Text>
            </View>
            <Text style={{ fontSize: 20, color: themeColors.ogi }}>→</Text>
          </TouchableOpacity>
        </View>
      );
    }

    return null;
  };

  return (
    <SafeAreaView style={[s.safe, { backgroundColor: themeColors.bg }]}>
      {/* Header */}
      <View style={s.header}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
          <Image 
            source={require('../../assets/logo.png')} 
            style={s.headerLogo}
            resizeMode="contain"
          />
          <View>
            <Text style={[s.logoText, { color: themeColors.txt }]}>loona</Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <Text style={s.subLogo}>CAMPUS FEED</Text>
              {!!user?.campusRank && (
                <TouchableOpacity 
                  style={[s.rankPill, { backgroundColor: themeColors.ogi }]}
                  onPress={() => router.push('/leaderboard')}
                  activeOpacity={0.7}
                >
                  <Text style={s.rankTxt}>#{user.campusRank}</Text>
                  <Text style={[s.rankTxt, { fontSize: 7, marginLeft: 2 }]}>🏆</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
        </View>
        <View style={s.hActions}>
          <TouchableOpacity 
            style={[s.iconBtn, { backgroundColor: themeColors.card3 || '#1A1A1A' }]}
            onPress={() => router.push('/search')}
          >
            <Ionicons name="search-outline" size={20} color={themeColors.txt} />
          </TouchableOpacity>
          <TouchableOpacity 
            style={[s.iconBtn, { backgroundColor: themeColors.card3 || '#1A1A1A' }]}
            onPress={() => router.push('/notifications')}
          >
            <Ionicons name="notifications-outline" size={20} color={themeColors.txt} />
          </TouchableOpacity>
          <TouchableOpacity 
            style={[s.iconBtn, { backgroundColor: themeColors.card3 || '#1A1A1A' }]}
            onPress={() => router.push('/leaderboard')}
          >
            <Ionicons name="trophy-outline" size={20} color={themeColors.txt} />
          </TouchableOpacity>
          <TouchableOpacity 
            style={[s.iconBtn, { backgroundColor: themeColors.card3 || '#1A1A1A' }]}
            onPress={toggleDark}
          >
            <Ionicons name={isDark ? "moon-outline" : "sunny-outline"} size={20} color={themeColors.txt} />
          </TouchableOpacity>
        </View>
      </View>

      {/* Offline Banner */}
      {isOffline && (
        <View style={[s.offlineBanner, { backgroundColor: themeColors.danger }]}>
          <Text style={s.offlineTxt}>📡 No Internet Connection. You're viewing cached posts.</Text>
        </View>
      )}

      {/* Campus Selector - Top Dropdown */}
      <View style={s.dropdownWrap}>
        <TouchableOpacity style={[s.dropdownBtn, { backgroundColor: themeColors.card2, borderColor: themeColors.bdr }]} onPress={() => setDropdownOpen(true)}>
          <View style={[s.dot, { backgroundColor: activeCampus === 'all' ? '#888' : (CAMPUSES.find(c => c.value === activeCampus)?.dotColor || '#888') }]} />
          <Text style={[s.dropdownTxt, { color: themeColors.txt }]}>
            {activeCampus === 'all' 
              ? '👁️ Sneaking into others...' 
              : (activeCampus !== user?.campus 
                  ? `👁️ Sneaking into ${CAMPUSES.find(c => c.value === activeCampus)?.label || 'others'}...`
                  : CAMPUSES.find(c => c.value === activeCampus)?.label || 'CAMPUS'
                )
            }
          </Text>
          <Text style={{ fontSize: 10, color: themeColors.txt3 }}>▼</Text>
        </TouchableOpacity>
      </View>

      {/* Dropdown Modal */}
      <Modal visible={dropdownOpen} transparent animationType="fade">
        <TouchableOpacity style={s.modalBg} onPress={() => setDropdownOpen(false)}>
          <View style={[s.modalContent, { backgroundColor: themeColors.card }]}>
            <TouchableOpacity style={s.modalItem} onPress={() => handleSelectCampus('all')}>
              <Text style={[s.modalItemTxt, { color: themeColors.txt }]}>👁️ Sneak In (Other Campuses)</Text>
            </TouchableOpacity>
            {CAMPUSES.filter(c => c.value !== 'all').map(c => (
              <TouchableOpacity key={c.value} style={s.modalItem} onPress={() => handleSelectCampus(c.value as Campus)}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                  <View style={[s.dot, { backgroundColor: c.dotColor }]} />
                  <Text style={[s.modalItemTxt, { color: themeColors.txt }]}>{c.label}</Text>
                </View>
              </TouchableOpacity>
            ))}
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Filter Tabs */}
      <View style={[s.filtersWrap, { backgroundColor: themeColors.bg }]}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.filtersScroll}>
          {POST_TYPES.map(t => (
            <TouchableOpacity 
              key={t.value} 
              style={[s.filterPill, activeTab === t.value && { backgroundColor: themeColors.ogi }]}
              onPress={() => setTab(t.value as TabFilter)}
            >
              <Text style={[s.filterPillTxt, { color: activeTab === t.value ? '#FFF' : themeColors.txt2 }]}>
                {t.icon + ' ' + t.label}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* Feed List */}
      {activeTab === 'events' ? (
          <EventsView 
            posts={posts} 
            isLoading={isLoading} 
            onRefresh={refetch} 
            onDelete={(id) => deletePost(id)}
            userLocation={userLocation}
          />
      ) : (
        <FlashList
          data={posts}
          keyExtractor={(item) => item._id}
          ListHeaderComponent={renderHeader}
          renderItem={renderItem}
          estimatedItemSize={380}
          scrollEventThrottle={16}
          contentContainerStyle={[s.listContent, { paddingBottom: 110 }]}
          showsVerticalScrollIndicator={false}
          removeClippedSubviews={true}
          windowSize={7}
          refreshControl={
            <RefreshControl refreshing={isFetching && !isFetchingNextPage} onRefresh={refetch} tintColor={themeColors.ogi} />
          }
          onEndReached={() => {
            if (hasNextPage && !isFetchingNextPage) fetchNextPage();
          }}
          onEndReachedThreshold={0.5}
          ListFooterComponent={
            isFetchingNextPage ? <ActivityIndicator style={{ marginVertical: 20 }} color={themeColors.ogi} /> : null
          }
          ListEmptyComponent={
            isLoading ? (
              <FeedSkeleton count={5} />
            ) : (
              <EmptyState 
                type={
                  (activeTab as string) === 'all' ? 'feed' :
                  (activeTab as string) === 'discussion' ? 'discussions' :
                  (activeTab as string) === 'confess' ? 'confessions' :
                  (activeTab as string) === 'events' ? 'events' :
                  (activeTab as string) === 'bhandara' ? 'bhandara' :
                  (activeTab as string) === 'offers' ? 'offers' :
                  (activeTab as string) === 'place' ? 'place' : 'feed'
                }
                onAction={() => openComposeSheet(activeTab === 'all' ? 'discussion' : activeTab as any)}
              />
            )
          }
        />
      )}

      {/* FAB - Hide if sneaking */}
      {(activeCampus === 'all' || activeCampus === user?.campus) && (
        <TouchableOpacity 
          style={[s.fab, { backgroundColor: themeColors.ogi }]} 
          onPress={() => {
            // Never pass 'all' or 'place' as a post type — default to 'discussion'
            const type = (activeTab === 'all' || activeTab === 'place') ? 'discussion' : activeTab;
            openComposeSheet(type as any);
          }}
          activeOpacity={0.9}
        >
          <Text style={s.fabIcon}>+</Text>
        </TouchableOpacity>
      )}

      {/* Shake to Sneak Modal */}
      <Modal visible={shakeModalVisible} transparent animationType="slide">
        <View style={s.modalBg}>
          <BlurView intensity={90} style={[s.shakeModal, { backgroundColor: isDark ? 'rgba(0,0,0,0.85)' : 'rgba(255,255,255,0.85)', borderColor: themeColors.bdr, borderWidth: 1 }]}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <Text style={{ fontSize: 24 }}>🕵️‍♂️</Text>
                <View>
                  <Text style={{ color: themeColors.txt, fontSize: 16, fontWeight: '900' }}>SHAKE TO SNEAK</Text>
                  <Text style={{ color: themeColors.txt3, fontSize: 10 }}>Spying on the neighboring campus...</Text>
                </View>
              </View>
              <TouchableOpacity onPress={() => setShakeModalVisible(false)} style={{ padding: 4 }}>
                <Ionicons name="close" size={24} color={themeColors.txt} />
              </TouchableOpacity>
            </View>

            {randomPost && (
              <View style={{ backgroundColor: themeColors.card, borderRadius: 20, padding: 16, borderColor: themeColors.ogi, borderWidth: 1.5, gap: 10 }}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Text style={{ color: themeColors.txt3, fontSize: 11, fontWeight: '800' }}>
                    🏫 {randomPost.campus?.toUpperCase()} CAMPUS
                  </Text>
                  <Text style={{ color: themeColors.txt3, fontSize: 10 }}>{new Date(randomPost.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</Text>
                </View>
                <Text style={{ color: themeColors.txt, fontSize: 15, fontWeight: '800' }}>{randomPost.title}</Text>
                {randomPost.body && <Text style={{ color: themeColors.txt2, fontSize: 13 }} numberOfLines={3}>{randomPost.body}</Text>}
                
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 8 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                    <Text style={{ fontSize: 14 }}>🔥</Text>
                    <Text style={{ color: themeColors.ogi, fontWeight: '800', fontSize: 12 }}>{randomPost.upvotes} upvotes</Text>
                  </View>
                  <TouchableOpacity
                    style={{ backgroundColor: themeColors.ogi, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 10 }}
                    onPress={() => {
                      setShakeModalVisible(false);
                      router.push({ pathname: '/post/[id]', params: { id: randomPost._id } } as any);
                    }}
                  >
                    <Text style={{ color: '#FFF', fontSize: 11, fontWeight: '800' }}>Reveal Thread</Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}

            <TouchableOpacity 
              style={{ alignSelf: 'center', marginTop: 20, flexDirection: 'row', alignItems: 'center', gap: 6 }}
              onPress={handleShakeSneak}
              disabled={shakeLoading}
            >
              <Text style={{ color: themeColors.ogi, fontWeight: '800', fontSize: 13 }}>{shakeLoading ? 'Loading...' : '🔄 Shake Again'}</Text>
            </TouchableOpacity>
          </BlurView>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12 },
  headerLogo: { width: 32, height: 32, borderRadius: 10 },
  logoText: { fontSize: 22, fontFamily: 'Syne_700Bold', letterSpacing: -0.5 },
  subLogo: { fontSize: 9, color: '#888', fontWeight: '800', letterSpacing: 1, marginTop: -2 },
  hActions: { flexDirection: 'row', gap: 8 },
  iconBtn: { width: 42, height: 42, borderRadius: 21, alignItems: 'center', justifyContent: 'center' },
  iconTxt: { fontSize: 18 },
  dropdownWrap: { alignItems: 'center', marginBottom: 8 },
  dropdownBtn: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, borderWidth: 1, gap: 8 },
  dot: { width: 8, height: 8, borderRadius: 4 },
  dropdownTxt: { fontSize: 13, fontWeight: '700' },
  modalBg: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', alignItems: 'center' },
  modalContent: { width: 240, borderRadius: 24, padding: 10 },
  modalItem: { paddingVertical: 14, paddingHorizontal: 16 },
  modalItemTxt: { fontSize: 15, fontWeight: '600' },
  filtersWrap: { paddingVertical: 12 },
  filtersScroll: { paddingHorizontal: 16, gap: 10 },
  filterPill: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.05)' },
  filterPillTxt: { fontSize: 13, fontWeight: '700' },
  listContent: { padding: 16, paddingBottom: 100 },
  emptyContainer: { alignItems: 'center', marginTop: 80 },
  emptyEmoji: { fontSize: 64, marginBottom: 16 },
  emptyTxt: { fontSize: 15, fontFamily: 'PlusJakartaSans_400Regular' },
  fab: { width: 60, height: 60, borderRadius: 30, position: 'absolute', bottom: 24, right: 24, alignItems: 'center', justifyContent: 'center', elevation: 8, shadowColor: '#000', shadowOpacity: 0.3, shadowRadius: 10, shadowOffset: { width: 0, height: 4 } },
  fabIcon: { color: '#FFF', fontSize: 32, fontWeight: '300' },
  rankPill: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 6, paddingVertical: 1, borderRadius: 6, marginTop: -2 },
  rankTxt: { color: '#FFF', fontSize: 9, fontWeight: '900' },

  // Sections
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 20, paddingHorizontal: 6, marginBottom: 12 },
  sectionTitle: { fontSize: 12, fontWeight: '900', letterSpacing: 1 },
  viewAll: { fontSize: 11, color: '#888', fontWeight: '700' },
  storiesScroll: { paddingRight: 20, gap: 12 },
  storyCard: { width: 140, height: 180, borderRadius: 24, padding: 16, justifyContent: 'space-between' },
  storyEmoji: { fontSize: 32 },
  storyText: { color: '#FFF', fontSize: 13, fontWeight: '700', lineHeight: 18 },
  addStory: { width: 140, height: 180, borderRadius: 24, borderWidth: 2, borderStyle: 'dashed', alignItems: 'center', justifyContent: 'center', gap: 12 },
  addStoryCircle: { width: 44, height: 44, borderRadius: 22, backgroundColor: 'rgba(255,255,255,0.05)', alignItems: 'center', justifyContent: 'center' },
  storyLabel: { fontSize: 12, fontWeight: '800' },
  discCard: { 
    width: 240, 
    padding: 20, 
    borderRadius: 28, 
    marginRight: 12,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 2,
  },
  discTag: { 
    alignSelf: 'flex-start', 
    paddingHorizontal: 10, 
    paddingVertical: 5, 
    borderRadius: 8, 
    backgroundColor: 'rgba(255,107,53,0.12)', 
    marginBottom: 16 
  },
  discTagTxt: { color: '#ff6b35', fontSize: 10, fontWeight: '900', letterSpacing: 0.5 },
  discTitle: { fontSize: 17, fontWeight: '900', marginBottom: 6, letterSpacing: -0.3 },
  discMeta: { color: '#888', fontSize: 13, fontWeight: '600' },
  startDiscussionBanner: { flexDirection: 'row', alignItems: 'center', gap: 14, borderRadius: 20, borderWidth: 1, padding: 16, marginTop: 8 },
  offlineBanner: { padding: 8, alignItems: 'center' },
  offlineTxt: { color: '#FFF', fontSize: 11, fontWeight: '800' },
  shakeModal: {
    width: '95%',
    borderRadius: 24,
    padding: 20,
    alignSelf: 'center',
  },
  pollCard: {
    padding: 16,
    borderRadius: 24,
    borderWidth: 1,
  },
});