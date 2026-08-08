import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator, TextInput, LayoutAnimation, UIManager, Platform } from 'react-native';
import { FlashList } from '@shopify/flash-list';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { BlurView } from 'expo-blur';
import { useRouter } from 'expo-router';
import { Colors, getColors } from '../../src/theme/colors';
import { useUIStore } from '../../src/store/uiStore';
import { useChats } from '../../src/hooks/useChat';
import { formatMessageTime } from '../../src/utils/time';
import EmptyState from '../../src/components/EmptyState';
import { Ionicons } from '@expo/vector-icons';
import { useAnalytics } from '../../src/hooks/useAnalytics';

if (Platform.OS === 'android') {
  if (UIManager.setLayoutAnimationEnabledExperimental) {
    UIManager.setLayoutAnimationEnabledExperimental(true);
  }
}

export default function ChatsScreen() {
  const { isDark } = useUIStore();
  const themeColors = getColors(isDark);
  const router = useRouter();
  const { data: chats, isLoading } = useChats();
  const [searchQuery, setSearchQuery] = React.useState('');
  const [isSearching, setIsSearching] = React.useState(false);
  const insets = useSafeAreaInsets();
  
  useAnalytics('chats');
  
  const toggleSearch = () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setIsSearching(!isSearching);
    if (isSearching) setSearchQuery('');
  };
  
  const filteredChats = React.useMemo(() => {
    if (!chats) return [];
    if (!searchQuery.trim()) return chats;
    return chats.filter(c => 
      c.name?.toLowerCase().includes(searchQuery.toLowerCase()) || 
      c.preview?.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [chats, searchQuery]);

  if (isLoading) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: themeColors.bg, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator color={themeColors.ogi} />
      </SafeAreaView>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: themeColors.bg }}>
      {/* Floating Glass Header */}
      <BlurView 
        intensity={80} 
        tint={isDark ? 'dark' : 'light'} 
        style={[s.floatingHeader, { paddingTop: insets.top + 10 }]}
      >
        <View style={s.headerTop}>
          {!isSearching ? (
            <>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <Text style={[s.titleText, { color: themeColors.txt }]}>Messages</Text>
                {/* Glowing Unread Dot */}
                <View style={[s.unreadDot, { backgroundColor: '#EF4444', shadowColor: '#EF4444' }]} />
              </View>
              
              <View style={{ flexDirection: 'row', gap: 10 }}>
                <TouchableOpacity 
                  style={[s.iconBtn, { backgroundColor: themeColors.card2 }]}
                  onPress={toggleSearch}
                >
                  <Ionicons name="search-outline" size={20} color={themeColors.txt} />
                </TouchableOpacity>
                <TouchableOpacity 
                  style={[s.iconBtn, { backgroundColor: themeColors.card2 }]}
                  onPress={() => router.push('/search')}
                >
                  <Ionicons name="create-outline" size={20} color={themeColors.txt} />
                </TouchableOpacity>
              </View>
            </>
          ) : (
            <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1, gap: 12 }}>
              <View style={[s.inlineSearch, { backgroundColor: themeColors.card2 }]}>
                <Ionicons name="search" size={18} color={themeColors.txt3} />
                <TextInput
                  style={{ color: themeColors.txt, flex: 1, fontSize: 15, padding: 0, marginLeft: 8 }}
                  placeholder="Search messages..."
                  placeholderTextColor={themeColors.txt3}
                  value={searchQuery}
                  onChangeText={setSearchQuery}
                  autoFocus
                />
              </View>
              <TouchableOpacity onPress={toggleSearch}>
                <Text style={{ color: themeColors.txt, fontWeight: '600' }}>Cancel</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </BlurView>

      <FlashList
        data={filteredChats}
        keyExtractor={i => i._id}
        contentContainerStyle={[s.scroll, { paddingTop: insets.top + 70 }]}
        
        renderItem={({ item }) => (
          <TouchableOpacity 
            style={s.item} 
            activeOpacity={0.7}
            onPress={() => router.push(`/chat/${item._id}`)}
          >
            <View style={s.avWrap}>
              <View style={[
                s.chatAv, 
                { backgroundColor: themeColors.card2 },
                (item.unread ?? 0) > 0 && { borderColor: themeColors.ogi, borderWidth: 2, shadowColor: themeColors.ogi, shadowOpacity: 0.4, shadowRadius: 8, shadowOffset: { width: 0, height: 0 } }
              ]}>
                <Text style={{ fontSize: 20 }}>{item.avatar ?? '👤'}</Text>
              </View>
              {/* Online indicator */}
              <View style={[
                s.onlineDot, 
                { 
                  backgroundColor: item.lastActive && (new Date().getTime() - new Date(item.lastActive).getTime() < 5 * 60 * 1000) ? '#22C55E' : themeColors.txt3, 
                  borderColor: themeColors.bg 
                }
              ]} />
            </View>

            <View style={s.info}>
              <View style={s.nameRow}>
                <Text style={[s.chatName, { color: themeColors.txt }]}>{item.name ?? 'Anonymous'}</Text>
                <Text style={[s.chatTime, { color: themeColors.txt3 }]}>
                  {item.updatedAt ? formatMessageTime(item.updatedAt) : ''}
                </Text>
              </View>
              <View style={s.msgRow}>
                <Text style={[s.chatPreview, { color: themeColors.txt2 }]} numberOfLines={1}>
                  {item.preview || 'Start chatting...'}
                </Text>
                {(item.unread ?? 0) > 0 && (
                  <View style={[s.unreadBadge, { backgroundColor: themeColors.ogi }]}>
                    <Text style={s.unreadTxt}>{item.unread}</Text>
                  </View>
                )}
              </View>
            </View>
          </TouchableOpacity>
        )}
        ListEmptyComponent={() => (
          <EmptyState type="chats" />
        )}
        ItemSeparatorComponent={() => <View style={[s.sep, { backgroundColor: themeColors.bdr }]} />}
      />
    </View>
  );
}

const s = StyleSheet.create({
  floatingHeader: { position: 'absolute', top: 0, left: 0, right: 0, zIndex: 10, paddingHorizontal: 20, paddingBottom: 10, borderBottomWidth: 0.5, borderBottomColor: 'rgba(255,255,255,0.05)', minHeight: 60, justifyContent: 'flex-end' },
  headerTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  titleText: { fontSize: 26, fontFamily: 'Syne_700Bold', letterSpacing: -0.5 },
  unreadDot: { width: 8, height: 8, borderRadius: 4, shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.8, shadowRadius: 6 },
  iconBtn: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  inlineSearch: { flex: 1, flexDirection: 'row', alignItems: 'center', padding: 10, borderRadius: 16 },
  scroll: { paddingBottom: 100 },
  item: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 14, gap: 14 },
  avWrap: { position: 'relative' },
  chatAv: { width: 56, height: 56, borderRadius: 28, alignItems: 'center', justifyContent: 'center' },
  onlineDot: { position: 'absolute', bottom: 2, right: 2, width: 14, height: 14, borderRadius: 7, borderWidth: 2.5 },
  info: { flex: 1 },
  nameRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  chatName: { fontSize: 16, fontWeight: '700', fontFamily: 'PlusJakartaSans_700Bold' },
  chatTime: { fontSize: 11 },
  msgRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  chatPreview: { fontSize: 14, flex: 1, marginRight: 10 },
  unreadBadge: { minWidth: 20, height: 20, borderRadius: 10, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 6 },
  unreadTxt: { fontSize: 10, color: '#fff', fontWeight: '800' },
  sep: { height: 0.5, marginHorizontal: 20, opacity: 0.5 },
  empty: { alignItems: 'center', paddingVertical: 80 },
  emptyIcon: { fontSize: 48, marginBottom: 16 },
  emptyTitle: { fontFamily: 'Syne_700Bold', fontSize: 18, marginBottom: 8 },
  emptySub: { fontSize: 13, textAlign: 'center', paddingHorizontal: 40, lineHeight: 20 },
});
