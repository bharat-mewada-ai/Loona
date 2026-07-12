import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator, TextInput, ScrollView } from 'react-native';
import { FlashList } from '@shopify/flash-list';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Colors, getColors } from '../../src/theme/colors';
import { useUIStore } from '../../src/store/uiStore';
import { useChats } from '../../src/hooks/useChat';
import { formatMessageTime } from '../../src/utils/time';
import EmptyState from '../../src/components/EmptyState';
import { Ionicons } from '@expo/vector-icons';
import { useAnalytics } from '../../src/hooks/useAnalytics';

export default function ChatsScreen() {
  const { isDark } = useUIStore();
  const themeColors = getColors(isDark);
  const router = useRouter();
  const { data: chats, isLoading } = useChats();
  const [searchQuery, setSearchQuery] = React.useState('');
  
  useAnalytics('chats');
  
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
    <SafeAreaView style={{ flex: 1, backgroundColor: themeColors.bg }}>
      <View style={s.header}>
        <View style={s.headerTop}>
          <Text style={[s.logo, { color: themeColors.txt }]}>
            🌙 <Text style={{ fontFamily: 'Syne_700Bold' }}>chats</Text>
          </Text>
          <TouchableOpacity 
            style={[s.iconBtn, { backgroundColor: themeColors.card2 }]}
            onPress={() => router.push('/search')}
          >
            <Ionicons name="search-outline" size={20} color={themeColors.txt} />
          </TouchableOpacity>
        </View>
      </View>

      <FlashList
        data={filteredChats}
        keyExtractor={i => i._id}
        contentContainerStyle={s.scroll}
        estimatedItemSize={75}
        ListHeaderComponent={
          <View>
            <View style={{ marginBottom: 20 }}>
              <Text style={[s.sectionLabel, { color: themeColors.txt3 }]}>Active Now</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 20, gap: 16 }}>
                {filteredChats.slice(0, 8).map((chat, idx) => (
                  <TouchableOpacity key={chat._id + idx} style={{ alignItems: 'center', gap: 6 }} onPress={() => router.push(`/chat/${chat._id}`)}>
                    <View style={[s.activeBubble, { backgroundColor: themeColors.card2 }]}>
                      <Text style={{ fontSize: 24 }}>{chat.avatar ?? '👤'}</Text>
                      <View style={[s.onlineDot, { backgroundColor: '#22C55E', borderColor: themeColors.bg, borderWidth: 2 }]} />
                    </View>
                    <Text style={{ color: themeColors.txt, fontSize: 11, fontWeight: '600' }} numberOfLines={1}>
                      {chat.name?.split(' ')[0] ?? 'Anon'}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
            <View style={[s.searchBox, { backgroundColor: themeColors.card2 }]}>
              <Ionicons name="search-outline" size={18} color={themeColors.txt3} style={{ marginRight: 10 }} />
              <TextInput
                style={{ color: themeColors.txt, flex: 1, fontSize: 15, padding: 0 }}
                placeholder="Search messages..."
                placeholderTextColor={themeColors.txt3}
                value={searchQuery}
                onChangeText={setSearchQuery}
              />
            </View>
          </View>
        }
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
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  header: { paddingHorizontal: 20, paddingTop: 15 },
  headerTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15 },
  logo: { fontSize: 28, fontFamily: 'Syne_400Regular' },
  iconBtn: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  title: { fontSize: 28, fontFamily: 'Syne_700Bold' },
  scroll: { paddingBottom: 100 },
  searchBox: { flexDirection: 'row', alignItems: 'center', marginHorizontal: 20, marginBottom: 20, padding: 12, borderRadius: 16 },
  sectionLabel: { fontSize: 12, fontWeight: '800', marginLeft: 20, marginBottom: 12, letterSpacing: 0.5 },
  activeBubble: { width: 56, height: 56, borderRadius: 28, alignItems: 'center', justifyContent: 'center', borderWidth: 1.5, borderColor: '#22C55E' },
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
