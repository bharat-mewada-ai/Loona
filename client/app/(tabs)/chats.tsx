import React from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, SafeAreaView, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { Colors, getColors } from '../../src/theme/colors';
import { useUIStore } from '../../src/store/uiStore';
import { useChats } from '../../src/hooks/useChat';
import { formatDistanceToNow } from '../../src/utils/time';

export default function ChatsScreen() {
  const { isDark } = useUIStore();
  const themeColors = getColors(isDark);
  const router = useRouter();
  const { data: chats, isLoading } = useChats();

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
        <Text style={[s.title, { color: themeColors.txt }]}>Chats</Text>
      </View>

      <FlatList
        data={chats || []}
        keyExtractor={i => i._id}
        contentContainerStyle={s.scroll}
        ListHeaderComponent={() => (
          <View style={[s.searchBox, { backgroundColor: themeColors.card2 }]}>
            <Text style={{ fontSize: 16, marginRight: 10 }}>🔍</Text>
            <Text style={{ color: themeColors.txt3, flex: 1 }}>Search messages...</Text>
          </View>
        )}
        renderItem={({ item }) => (
          <TouchableOpacity 
            style={s.item} 
            activeOpacity={0.7}
            onPress={() => router.push(`/chat/${item._id}`)}
          >
            <View style={s.avWrap}>
              <View style={[s.chatAv, { backgroundColor: themeColors.card2 }]}>
                <Text style={{ fontSize: 20 }}>{item.identities?.other?.avatar ?? '👤'}</Text>
              </View>
              {/* Online indicator */}
              <View style={[s.onlineDot, { backgroundColor: '#22C55E', borderColor: themeColors.bg }]} />
            </View>

            <View style={s.info}>
              <View style={s.nameRow}>
                <Text style={[s.chatName, { color: themeColors.txt }]}>{item.identities?.other?.name ?? 'Anonymous'}</Text>
                <Text style={[s.chatTime, { color: themeColors.txt3 }]}>
                  {item.updatedAt ? formatDistanceToNow(item.updatedAt) : ''}
                </Text>
              </View>
              <View style={s.msgRow}>
                <Text style={[s.chatPreview, { color: themeColors.txt2 }]} numberOfLines={1}>{item.lastMessage ?? 'Start chatting...'}</Text>
                {(item.unreadCount ?? 0) > 0 && (
                  <View style={[s.unreadBadge, { backgroundColor: themeColors.ogi }]}>
                    <Text style={s.unreadTxt}>{item.unreadCount}</Text>
                  </View>
                )}
              </View>
            </View>
          </TouchableOpacity>
        )}
        ListEmptyComponent={() => (
          <View style={s.empty}>
            <Text style={s.emptyIcon}>💬</Text>
            <Text style={[s.emptyTitle, { color: themeColors.txt }]}>No chats yet</Text>
            <Text style={[s.emptySub, { color: themeColors.txt2 }]}>Reply to posts to start anonymous conversations</Text>
          </View>
        )}
        ItemSeparatorComponent={() => <View style={[s.sep, { backgroundColor: themeColors.bdr }]} />}
      />
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  header: { paddingHorizontal: 20, paddingVertical: 15 },
  title: { fontSize: 28, fontFamily: 'Syne_700Bold' },
  scroll: { paddingBottom: 100 },
  searchBox: { flexDirection: 'row', alignItems: 'center', marginHorizontal: 20, marginBottom: 20, padding: 12, borderRadius: 16 },
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
