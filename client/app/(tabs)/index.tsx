import React, { useState, useEffect } from "react";
import { 
  View, 
  Text, 
  TouchableOpacity, 
  ScrollView, 
  FlatList, 
  ActivityIndicator, 
  StyleSheet,
  Modal,
  SafeAreaView,
  KeyboardAvoidingView,
  Switch,
  Platform,
  TextInput,
  RefreshControl,
  Animated
} from "react-native";
import * as Location from "expo-location";
import * as ImagePicker from 'expo-image-picker';
import { useRouter } from "expo-router";
import { usePosts, useCreatePost } from "../../src/hooks/usePosts";
import { useLeaderboard } from "../../src/hooks/useAuth";
import { useUIStore } from "../../src/store/uiStore";
import { useAuthStore } from "../../src/store/authStore";
import { getColors, Colors as StaticColors } from "../../src/theme/colors";
import { CAMPUSES, POST_TYPES } from "../../src/constants";
import PostCard from "../../src/components/PostCard";
import FeedSkeleton from "../../src/components/FeedSkeleton";
import { Campus, TabFilter } from "../../src/types";
import { Alert, Image, Pressable } from "react-native";
import { uploadToCloudinary } from "../../src/utils/uploadToCloudinary";

export default function Feed() {
  const router = useRouter();
  const { data, fetchNextPage, hasNextPage, isFetchingNextPage, isLoading, refetch } = usePosts();
  const { data: leaderboardData } = useLeaderboard();
  
  const [userLocation, setUserLocation] = useState<{ latitude: number; longitude: number } | null>(null);

  useEffect(() => {
    (async () => {
      if (Platform.OS === 'web') return;
      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') return;
      let loc = await Location.getCurrentPositionAsync({});
      setUserLocation({
        latitude: loc.coords.latitude,
        longitude: loc.coords.longitude
      });
    })();
  }, []);

  const activeCampus = useUIStore(s => s.activeCampus);
  const activeTab = useUIStore(s => s.activeTab);
  const setCampus = useUIStore(s => s.setCampus);
  const setTab = useUIStore(s => s.setTab);
  const isDark = useUIStore(s => s.isDark);
  const toggleDark = useUIStore(s => s.toggleDark);
  const openComposeSheet = useUIStore(s => s.openComposeSheet);

  const themeColors = getColors(isDark);
  const [dropdownOpen, setDropdownOpen] = useState(false);

  const { user } = useAuthStore();
  const { mutate: createPost, isPending: isPosting } = useCreatePost();

  // Magic Pencil States
  const [showTray, setShowTray] = useState(false);
  const [burn, setBurn] = useState(false);
  const [isPoll, setIsPoll] = useState(false);
  const [pollOptions, setPollOptions] = useState(['', '']); // Default 2 options
  const [quickText, setQuickText] = useState('');
  const [imageUri, setImageUri] = useState('');
  const [tempImageUri, setTempImageUri] = useState('');
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [imageUploading, setImageUploading] = useState(false);
  const [isBarExpanded, setIsBarExpanded] = useState(true);

  const posts = data?.pages.flatMap((page) => page.posts) ?? [];

  const handleScroll = (event: any) => {
    const offsetY = event.nativeEvent.contentOffset.y;
    if (offsetY > 50 && isBarExpanded) {
      setIsBarExpanded(false);
    }
  };

  const pickImage = async () => {
    const res = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      quality: 0.8,
    });
    if (!res.canceled) {
      setTempImageUri(res.assets[0].uri);
      setShowConfirmModal(true);
    }
  };

  const takePhoto = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') return Alert.alert('Error', 'Camera permission needed');
    const res = await ImagePicker.launchCameraAsync({
      allowsEditing: true,
      quality: 0.8,
    });
    if (!res.canceled) {
      setTempImageUri(res.assets[0].uri);
      setShowConfirmModal(true);
    }
  };

  const handleQuickPost = async () => {
    if (!quickText.trim() && !imageUri && !isPoll) return;
    
    // Validate poll
    if (isPoll) {
      const validOptions = pollOptions.filter(o => o.trim().length > 0);
      if (validOptions.length < 2) {
        Alert.alert('Error', 'Poll needs at least 2 options');
        return;
      }
    }

    let cdnUrl = '';
    if (imageUri) {
      setImageUploading(true);
      try {
        const res = await uploadToCloudinary(imageUri);
        cdnUrl = res.url;
      } catch (e: any) {
        Alert.alert('Upload Error', e.message || 'Could not upload image');
        setImageUploading(false);
        return;
      }
      setImageUploading(false);
    }

    // Parse Title & Body
    const lines = quickText.split('\n');
    const title = lines[0].trim() || (isPoll ? "Campus Poll" : (imageUri ? "Photo Update" : "Update"));
    const body = lines.slice(1).join('\n').trim();

    createPost({
      title,
      body,
      type: activeTab === 'all' ? 'thought' : activeTab as any,
      image: cdnUrl || undefined,
      burnAfter24h: burn,
      campus: user?.campus || 'all',
      isPoll,
      pollOptions: isPoll ? pollOptions.filter(o => o.trim().length > 0) : undefined
    }, {
      onSuccess: () => {
        setQuickText('');
        setImageUri('');
        setBurn(false);
        setIsPoll(false);
        setPollOptions(['', '']);
        setShowTray(false);
      },
      onError: (err: any) => {
        Alert.alert('Error', err.response?.data?.error || 'Failed to post');
      }
    });
  };

  const handleSelectCampus = (c: Campus) => {
    setCampus(c);
    setDropdownOpen(false);
  };

  const currentCampusLabel = 
    activeCampus === "all" 
      ? `Sneaking into ${user?.campus === 'ogi' ? 'LNCT' : 'Oriental'}` 
      : CAMPUSES.find(c => c.value === activeCampus)?.label || "Bhopal";

  const campusWar = leaderboardData?.campusWar || [];
  const getKarma = (cid: string) => campusWar.find(c => c._id === cid)?.karma || 0;

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
              {user?.campusRank && (
                <View style={[s.rankPill, { backgroundColor: themeColors.ogi }]}>
                  <Text style={s.rankTxt}>#{user.campusRank}</Text>
                </View>
              )}
            </View>
          </View>
        </View>
        <View style={s.hActions}>
          <TouchableOpacity 
            style={[s.iconBtn, { backgroundColor: themeColors.card3 || '#1A1A1A' }]}
            onPress={() => router.push('/search')}
          >
            <Text style={s.iconTxt}>🔍</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={[s.iconBtn, { backgroundColor: themeColors.card3 || '#1A1A1A' }]}
            onPress={() => router.push('/notifications')}
          >
            <Text style={s.iconTxt}>🔔</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={[s.iconBtn, { backgroundColor: themeColors.card3 || '#1A1A1A' }]}
            onPress={toggleDark}
          >
            <Text style={s.iconTxt}>{isDark ? '🌙' : '🌞'}</Text>
          </TouchableOpacity>
        </View>
      </View>

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
          <TouchableOpacity 
            style={[s.filterPill, activeTab === 'all' && { backgroundColor: themeColors.ogi }]}
            onPress={() => setTab('all')}
          >
            <Text style={[s.filterPillTxt, { color: activeTab === 'all' ? '#FFF' : themeColors.txt2 }]}>✦ Feed</Text>
          </TouchableOpacity>
          
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
      <FlatList
        data={posts}
        keyExtractor={(item) => item._id}
        renderItem={({ item }) => <PostCard post={item} isAllTab={activeTab === 'all'} userLocation={userLocation} />}
        onScroll={handleScroll}
        scrollEventThrottle={16}
        contentContainerStyle={s.listContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={isLoading && posts.length > 0} onRefresh={refetch} tintColor={themeColors.ogi} />
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
            <View style={s.emptyContainer}>
              <Text style={s.emptyEmoji}>🏜️</Text>
              <Text style={[s.emptyTxt, { color: themeColors.txt3 }]}>Nothing here yet... Start the fire! 🔥</Text>
            </View>
          )
        }
      />

      {/* FAB - Hide if sneaking */}
      {(activeCampus === 'all' || activeCampus === user?.campus) && (
        <TouchableOpacity 
          style={[s.fab, { backgroundColor: themeColors.ogi }]} 
          onPress={() => openComposeSheet('thought')}
          activeOpacity={0.9}
        >
          <Text style={s.fabIcon}>+</Text>
        </TouchableOpacity>
      )}
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
  rankPill: { paddingHorizontal: 6, paddingVertical: 1, borderRadius: 6, marginTop: -2 },
  rankTxt: { color: '#FFF', fontSize: 9, fontWeight: '900' },
});