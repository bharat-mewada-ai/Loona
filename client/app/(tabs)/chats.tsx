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

  const handleChatPress = (chatId: string) => {
    router.push(`/chat/${chatId}`);
  };

  if (isLoading) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: themeColors.bg, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator color={themeColors.ogi} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: themeColors.bg }}>
      <FlatList
        data={chats || []}
        keyExtractor={i => i._id}
        contentContainerStyle={s.scroll}
        ListHeaderComponent={() => (
          <>
            <Text style={[s.sec, { color: themeColors.txt3 }]}>Campus DMs · Anonymous</Text>
            <View style={[s.warnCard, { backgroundColor: themeColors.warnbg, borderColor: themeColors.gold }]}>
              <Text style={[s.warnTxt, { color: themeColors.warn }]}>
                Your identity stays hidden in chats — you appear as your current anonymous avatar. Chats expire in 7 days.
              </Text>
            </View>
          </>
        )}
        renderItem={({ item }) => (
          <TouchableOpacity 
            style={[s.item, { backgroundColor: themeColors.card, borderColor: themeColors.bdr }]} 
            activeOpacity={0.8}
            onPress={() => handleChatPress(item._id)}
          >
            <View style={[s.chatAv, { backgroundColor: themeColors.ogibg }]}>
              <Text style={{ fontSize: 18 }}>{item.avatar}</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[s.chatName, { color: themeColors.txt }]}>{item.name}</Text>
              <Text style={[s.chatPreview, { color: themeColors.txt3 }]} numberOfLines={1}>{item.preview}</Text>
            </View>
            <View style={{ alignItems: 'flex-end' }}>
              <Text style={[s.chatTime, { color: themeColors.txt3 }]}>
                {item.time ? formatDistanceToNow(item.time) : ''}
              </Text>
              {item.unread > 0 && (
                <View style={[s.unreadBadge, { backgroundColor: themeColors.ogi }]}>
                  <Text style={s.unreadTxt}>{item.unread}</Text>
                </View>
              )}
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
      />
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  scroll: { padding: 13, paddingBottom: 100 },
  sec: {
    fontFamily: 'Syne_700Bold', fontSize: 9, letterSpacing: 1.3,
    textTransform: 'uppercase', marginBottom: 7, marginTop: 14,
  },
  warnCard: {
    borderWidth: 1,
    borderRadius: 10, padding: 10, marginBottom: 10,
  },
  warnTxt: { fontSize: 11, lineHeight: 16, fontFamily: 'PlusJakartaSans_400Regular' },
  item: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    borderWidth: 1,
    borderRadius: 10, padding: 10, marginBottom: 7,
  },
  chatAv: {
    width: 38, height: 38, borderRadius: 19,
    alignItems: 'center', justifyContent: 'center',
  },
  chatName: { fontSize: 13, fontWeight: '600', fontFamily: 'PlusJakartaSans_600SemiBold' },
  chatPreview: { fontSize: 11, marginTop: 1, maxWidth: 200, fontFamily: 'PlusJakartaSans_400Regular' },
  chatTime: { fontSize: 10 },
  unreadBadge: {
    width: 18, height: 18, borderRadius: 9,
    alignItems: 'center', justifyContent: 'center',
    marginTop: 3,
  },
  unreadTxt: { fontSize: 9, color: '#fff', fontWeight: '700' },
  empty: { alignItems: 'center', paddingVertical: 48 },
  emptyIcon: { fontSize: 36, marginBottom: 10 },
  emptyTitle: { fontFamily: 'Syne_700Bold', fontSize: 15, marginBottom: 5 },
  emptySub: { fontSize: 11, textAlign: 'center', fontFamily: 'PlusJakartaSans_400Regular' },
});
