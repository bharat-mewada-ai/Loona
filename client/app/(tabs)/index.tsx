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

  const themeColors = getColors(isDark);
  const [dropdownOpen, setDropdownOpen] = useState(false);

  const { user } = useAuthStore();
  const { mutate: createPost, isPending: isPosting } = useCreatePost();

  // Magic Pencil States
  const [showTray, setShowTray] = useState(false);
  const [burn, setBurn] = useState(false);
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
    if (!quickText.trim() && !imageUri) return;
    
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
    const title = lines[0].trim() || (imageUri ? "Photo Update" : "Update");
    const body = lines.slice(1).join('\n').trim();

    createPost({
      title,
      body,
      type: activeTab === 'all' ? 'thought' : activeTab as any,
      image: cdnUrl || undefined,
      burnAfter24h: burn,
      campus: user?.campus || 'all',
    }, {
      onSuccess: () => {
        setQuickText('');
        setImageUri('');
        setBurn(false);
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
    activeCampus === "all" ? "All Bhopal Campuses" : 
    CAMPUSES.find(c => c.value === activeCampus)?.label || "Bhopal";

  const campusWar = leaderboardData?.campusWar || [];
  const getKarma = (cid: string) => campusWar.find(c => c._id === cid)?.karma || 0;

  return (
    <SafeAreaView style={[s.safe, { backgroundColor: themeColors.bg }]}>
      {/* Header */}
      <View style={s.header}>
        <View>
          <Text style={[s.logo, { color: themeColors.txt }]}>l<Text style={{color: themeColors.ogi}}>oo</Text>na</Text>
          <Text style={s.subLogo}>BHOPAL CAMPUSES</Text>
        </View>
        <View style={s.hActions}>
          <TouchableOpacity style={[s.iconBtn, { backgroundColor: themeColors.card, borderColor: themeColors.bdr }]} onPress={toggleDark}>
            <Text style={s.iconTxt}>{isDark ? '🌙' : '🌞'}</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={[s.iconBtn, { backgroundColor: themeColors.card, borderColor: themeColors.bdr }]}
            onPress={() => router.push('/profile')}
          >
            <Text style={s.iconTxt}>👤</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Campus Dropdown */}
      <View style={s.dropdownWrap}>
        <TouchableOpacity style={[s.dropdownBtn, { backgroundColor: themeColors.card2, borderColor: themeColors.bdr }]} onPress={() => setDropdownOpen(true)}>
          <View style={[s.dot, { backgroundColor: activeCampus === 'all' ? '#888' : (CAMPUSES.find(c => c.value === activeCampus)?.dotColor || '#888') }]} />
          <Text style={[s.dropdownTxt, { color: themeColors.txt }]}>{currentCampusLabel}</Text>
          <Text style={s.dropdownArrow}>▼</Text>
        </TouchableOpacity>
      </View>

      {/* Dropdown Modal */}
      <Modal visible={dropdownOpen} transparent animationType="fade">
        <TouchableOpacity style={s.modalBg} onPress={() => setDropdownOpen(false)}>
          <View style={[s.modalContent, { backgroundColor: themeColors.card }]}>
            <TouchableOpacity style={s.modalItem} onPress={() => handleSelectCampus('all')}>
              <Text style={[s.modalItemTxt, { color: themeColors.txt }]}>● All Bhopal Campuses</Text>
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
      <View style={[s.filtersWrap, { backgroundColor: themeColors.card, borderBottomColor: themeColors.bdr }]}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.filtersScroll}>
          <TouchableOpacity 
            style={[s.filterBtn, activeTab === 'all' && [s.filterBtnActive, { borderBottomColor: themeColors.txt }]]}
            onPress={() => setTab('all')}
          >
            <Text style={[s.filterTxt, activeTab === 'all' ? { color: themeColors.txt } : { color: themeColors.txt3 }]}>✦ All</Text>
          </TouchableOpacity>
          
          {POST_TYPES.map(t => (
            <TouchableOpacity 
              key={t.value} 
              style={[s.filterBtn, activeTab === t.value && [s.filterBtnActive, { borderBottomColor: themeColors.txt }]]}
              onPress={() => setTab(t.value as TabFilter)}
            >
              <Text style={[s.filterTxt, activeTab === t.value ? { color: themeColors.txt } : { color: themeColors.txt3 }]}>
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
        ListHeaderComponent={
          <>
            {activeTab === 'confess' && (
              <View style={[s.confBanner, { backgroundColor: themeColors.card2, borderColor: themeColors.bdr }]}>
                <Text style={s.confBannerTitle}>CONFESSION BOOTH 🕳️</Text>
                <Text style={[s.confBannerSub, { color: themeColors.txt3 }]}>Anonymous confessions. Reactions only. Identity hidden even from admins.</Text>
              </View>
            )}

            {/* Campus Patato War Banner */}
            <View style={[s.banner, { backgroundColor: themeColors.card, borderColor: themeColors.bdr }]}>
              <View style={[s.livePill, { backgroundColor: themeColors.dangerbg }]}>
                <Text style={[s.liveTxt, { color: themeColors.danger }]}>LIVE</Text>
              </View>
              <Text style={[s.bannerTitle, { color: themeColors.txt }]}>🥔 Campus Patato War</Text>
              <View style={s.bannerStats}>
                <Text style={{color: themeColors.nit, fontWeight: '700'}}>NIT {getKarma('nit')}🥔</Text>
                <Text style={{color: themeColors.txt3}}> · </Text>
                <Text style={{color: themeColors.ogi, fontWeight: '700'}}>OGI {getKarma('ogi')}🥔</Text>
                <Text style={{color: themeColors.txt3}}> · </Text>
                <Text style={{color: themeColors.lnct, fontWeight: '700'}}>LNCT {getKarma('lnct')}🥔</Text>
              </View>
            </View>
          </>
        }
      />
      {/* Magic Pencil Interaction UI */}
      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : undefined} 
        keyboardVerticalOffset={Platform.OS === 'ios' ? 100 : 0}
      >
        <View style={s.magicContainer}>
          {!isBarExpanded ? (
            /* FAB - Magic Pencil (Collapsed) */
            <TouchableOpacity 
              style={[s.fab, { backgroundColor: themeColors.ogi }]} 
              onPress={() => setIsBarExpanded(true)}
              activeOpacity={0.9}
            >
              <Text style={s.fabIcon}>✎</Text>
            </TouchableOpacity>
          ) : (
            /* WhatsApp-Style Permanent Chat Bar (Expanded) */
            <View style={s.barOuterRow}>
              <View style={[s.expandedBar, { backgroundColor: themeColors.card, borderColor: themeColors.bdr }]}>
                
                {/* Image Preview Thumbnail */}
                {!!imageUri && (
                  <View style={s.previewWrap}>
                    <Image source={{ uri: imageUri }} style={s.previewImg} />
                    <TouchableOpacity style={s.previewClose} onPress={() => setImageUri('')}>
                      <Text style={s.previewCloseTxt}>✕</Text>
                    </TouchableOpacity>
                  </View>
                )}

                <View style={s.barInputRow}>
                  <TouchableOpacity style={s.barAction} onPress={() => setShowTray(!showTray)}>
                    <Text style={s.barActionIcon}>😊</Text>
                  </TouchableOpacity>
                  
                  <TextInput
                    style={[s.barInput, { color: themeColors.txt }]}
                    placeholder="Message"
                    placeholderTextColor={themeColors.txt3}
                    multiline
                    maxHeight={120}
                    value={quickText}
                    onChangeText={setQuickText}
                    onFocus={() => setShowTray(false)}
                  />

                  <TouchableOpacity style={s.barAction} onPress={pickImage}>
                    <Text style={[s.barActionIcon, { color: themeColors.txt3, transform: [{ rotate: '45deg' }] }]}>📎</Text>
                  </TouchableOpacity>

                  <TouchableOpacity style={s.barAction} onPress={takePhoto}>
                    <Text style={[s.barActionIcon, { color: themeColors.txt3 }]}>📷</Text>
                  </TouchableOpacity>

                  <TouchableOpacity style={[s.barAction, { width: 32 }]} onPress={() => setBurn(!burn)}>
                    <Text style={[s.barActionIcon, { color: burn ? themeColors.danger : themeColors.txt3, fontSize: 16 }]}>🔥</Text>
                  </TouchableOpacity>
                </View>
              </View>

              <TouchableOpacity 
                style={[s.sendBtnCircle, { backgroundColor: '#25D366', opacity: (quickText.trim() || imageUri) && !isPosting && !imageUploading ? 1 : 0.5 }]}
                disabled={(!quickText.trim() && !imageUri) || isPosting || imageUploading}
                onPress={handleQuickPost}
              >
                {isPosting || imageUploading ? (
                  <ActivityIndicator color="#FFF" size="small" />
                ) : (
                  <Text style={s.sendIconLarge}>✈️</Text>
                )}
              </TouchableOpacity>
            </View>
          )}
        </View>
      </KeyboardAvoidingView>

      {/* Image Confirm Modal */}
      <Modal visible={showConfirmModal} transparent animationType="fade">
        <View style={s.confirmOverlay}>
          <View style={[s.confirmBox, { backgroundColor: themeColors.card }]}>
            <Text style={[s.confirmTitle, { color: themeColors.txt }]}>Attach this photo?</Text>
            <View style={s.confirmImgWrap}>
              <Image source={{ uri: tempImageUri }} style={s.confirmImg} />
            </View>
            <View style={s.confirmActions}>
              <TouchableOpacity style={[s.confirmBtn, { backgroundColor: themeColors.card2 }]} onPress={() => setShowConfirmModal(false)}>
                <Text style={[s.confirmBtnTxt, { color: themeColors.txt3 }]}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[s.confirmBtn, { backgroundColor: '#25D366' }]} onPress={() => { setImageUri(tempImageUri); setShowConfirmModal(false); }}>
                <Text style={[s.confirmBtnTxt, { color: '#FFF' }]}>Attach</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12 },
  logo: { fontSize: 28, fontFamily: 'Syne_700Bold', letterSpacing: -1 },
  subLogo: { fontSize: 10, color: '#888', fontWeight: '800', letterSpacing: 2, marginTop: -4 },
  hActions: { flexDirection: 'row', gap: 10 },
  iconBtn: { width: 40, height: 40, borderRadius: 20, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  iconTxt: { fontSize: 18 },
  dropdownWrap: { alignItems: 'center', marginBottom: 12 },
  dropdownBtn: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 10, borderRadius: 999, borderWidth: 1, gap: 8 },
  dot: { width: 8, height: 8, borderRadius: 4 },
  dropdownTxt: { fontSize: 14, fontWeight: '700' },
  dropdownArrow: { fontSize: 10, color: '#888' },
  modalBg: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'center', alignItems: 'center' },
  modalContent: { width: 260, borderRadius: 20, padding: 10 },
  modalItem: { paddingVertical: 14, paddingHorizontal: 16 },
  modalItemTxt: { fontSize: 15, fontWeight: '600' },
  filtersWrap: { borderBottomWidth: 1 },
  filtersScroll: { paddingHorizontal: 16, paddingVertical: 12, gap: 14 },
  filterBtn: { paddingBottom: 6 },
  filterBtnActive: { borderBottomWidth: 2 },
  filterTxt: { fontSize: 14, fontWeight: '700' },
  listContent: { padding: 12, paddingBottom: 120 },
  banner: { flexDirection: 'row', alignItems: 'center', padding: 14, borderRadius: 16, borderWidth: 1, marginBottom: 16, gap: 10 },
  livePill: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  liveTxt: { fontSize: 10, fontWeight: '900' },
  bannerTitle: { fontSize: 14, fontWeight: '700', flex: 1 },
  bannerStats: { flexDirection: 'row', alignItems: 'center' },
  emptyContainer: { alignItems: 'center', marginTop: 80 },
  emptyEmoji: { fontSize: 64, marginBottom: 16 },
  emptyTxt: { fontSize: 15, fontFamily: 'PlusJakartaSans_400Regular' },
  confBanner: { padding: 24, borderRadius: 20, marginBottom: 16, borderWidth: 1, alignItems: 'center' },
  confBannerTitle: { fontSize: 14, fontFamily: 'Syne_700Bold', color: '#888', letterSpacing: 2, marginBottom: 8 },
  confBannerSub: { fontSize: 12, textAlign: 'center', lineHeight: 20, fontFamily: 'PlusJakartaSans_400Regular' },
  magicContainer: { position: 'absolute', bottom: 10, left: 10, right: 10, zIndex: 999 },
  fab: { width: 56, height: 56, borderRadius: 28, position: 'absolute', bottom: 10, right: 0, alignItems: 'center', justifyContent: 'center', elevation: 5, shadowColor: '#000', shadowOpacity: 0.2, shadowRadius: 10, shadowOffset: { width: 0, height: 4 } },
  fabIcon: { color: '#FFF', fontSize: 24 },
  barOuterRow: { flexDirection: 'row', alignItems: 'flex-end', gap: 8 },
  expandedBar: { flex: 1, borderRadius: 25, borderWidth: 1, paddingHorizontal: 4, paddingVertical: 4, overflow: 'hidden' },
  previewWrap: { height: 120, width: '100%', marginBottom: 4, borderRadius: 15, overflow: 'hidden', position: 'relative' },
  previewImg: { width: '100%', height: '100%', resizeMode: 'cover' },
  previewClose: { position: 'absolute', top: 8, right: 8, backgroundColor: 'rgba(0,0,0,0.6)', width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  previewCloseTxt: { color: '#FFF', fontSize: 14, fontWeight: '700' },
  barInputRow: { flexDirection: 'row', alignItems: 'center' },
  barAction: { width: 38, height: 44, alignItems: 'center', justifyContent: 'center' },
  barActionIcon: { fontSize: 22 },
  barInput: { flex: 1, minHeight: 44, paddingHorizontal: 8, fontSize: 16, fontWeight: '400' },
  sendBtnCircle: { width: 50, height: 50, borderRadius: 25, alignItems: 'center', justifyContent: 'center', elevation: 2 },
  sendIconLarge: { color: '#FFF', fontSize: 20 },
  tray: { position: 'absolute', bottom: 60, left: 0, right: 0, borderRadius: 24, borderWidth: 1, flexDirection: 'row', padding: 12, gap: 16, justifyContent: 'center', elevation: 5 },
  trayBtn: { alignItems: 'center', gap: 4 },
  trayIcon: { fontSize: 22 },
  trayLabel: { fontSize: 10, fontWeight: '700' },
  confirmOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.8)', justifyContent: 'center', alignItems: 'center', padding: 20 },
  confirmBox: { width: '100%', borderRadius: 24, padding: 20, alignItems: 'center' },
  confirmTitle: { fontSize: 18, fontWeight: '700', marginBottom: 16 },
  confirmImgWrap: { width: '100%', height: 350, borderRadius: 15, overflow: 'hidden', marginBottom: 20 },
  confirmImg: { width: '100%', height: '100%', resizeMode: 'contain' },
  confirmActions: { flexDirection: 'row', gap: 12, width: '100%' },
  confirmBtn: { flex: 1, height: 50, borderRadius: 25, alignItems: 'center', justifyContent: 'center' },
  confirmBtnTxt: { fontSize: 16, fontWeight: '700' },
});