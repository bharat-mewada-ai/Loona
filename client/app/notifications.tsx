import React, { useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../src/theme/colors';
import { useInAppNotifications, useMarkNotificationsRead } from '../src/hooks/useNotifications';
import { useUIStore } from '../src/store/uiStore';
import { useStats } from '../src/hooks/usePosts';
import { formatDistanceToNow } from '../src/utils/time';
import { getColors } from '../src/theme/colors';
import EmptyState from '../src/components/EmptyState';

export default function NotificationsScreen() {
  const isDark = useUIStore((s) => s.isDark);
  const themeColors = getColors(isDark);
  const { 
    data, 
    isLoading, 
    fetchNextPage, 
    hasNextPage, 
    isFetchingNextPage,
    refetch 
  } = useInAppNotifications();
  const { data: stats } = useStats();
  
  const { mutate: markRead } = useMarkNotificationsRead();

  // Flatten the pages into a single array for the FlatList
  const notifications = data?.pages.flatMap(page => page.notifications) || [];

  useEffect(() => {
    markRead();
  }, []);

  const renderIcon = (type: string) => {
    switch (type) {
      case 'upvote': return '🥔';
      case 'reaction': return '✨';
      case 'comment': return '💬';
      case 'mention': return '🏷️';
      case 'wave': return '👋';
      case 'message': return '💌';
      default: return '🔔';
    }
  };

  const handlePress = (notif: any) => {
    if (notif.type === 'message' && notif.data?.chatId) {
      router.push(`/chat/${notif.data.chatId}`);
    } else if (notif.type === 'wave' && notif.sender) {
      router.push(`/user/${notif.sender._id || notif.sender}`);
    } else if (notif.data?.postId) {
      router.push(`/post/${notif.data.postId}`);
    }
  };

  return (
    <SafeAreaView style={[s.safe, { backgroundColor: themeColors.bg }]}>
      <View style={[s.header, { borderBottomColor: themeColors.bdr }]}>
        <TouchableOpacity 
          style={[s.backBtn, { backgroundColor: themeColors.card2 }]} 
          onPress={() => router.back()}
        >
          <Ionicons name="chevron-back" size={24} color={themeColors.txt} />
        </TouchableOpacity>
        <Text style={[s.headerTitle, { color: themeColors.txt }]}>Notifications</Text>
        <View style={{ width: 42 }} /> {/* Spacer to center title */}
      </View>

      {isLoading ? (
        <View style={s.center}>
          <ActivityIndicator color={themeColors.ogi || '#4A90E2'} />
        </View>
      ) : notifications.length === 0 ? (
        <EmptyState type="notifications" />
      ) : (
        <FlatList
          data={notifications}
          keyExtractor={(item) => item._id}
          onRefresh={refetch}
          refreshing={isLoading}
          onEndReached={() => {
            if (hasNextPage && !isFetchingNextPage) {
              fetchNextPage();
            }
          }}
          onEndReachedThreshold={0.5}
          ListFooterComponent={() => 
            isFetchingNextPage ? (
              <ActivityIndicator style={{ marginVertical: 20 }} color={themeColors.ogi} />
            ) : null
          }
          renderItem={({ item }) => (
            <TouchableOpacity 
              style={[s.item, { borderBottomColor: themeColors.bdr }]}
              onPress={() => handlePress(item)}
            >
              <View style={s.iconWrap}>
                <Text style={s.icon}>{renderIcon(item.type)}</Text>
              </View>
              <View style={s.content}>
                <Text style={[s.title, { color: themeColors.txt }]}>{item.title}</Text>
                <Text style={[s.body, { color: themeColors.txt2 }]}>{item.body}</Text>
                <Text style={[s.time, { color: themeColors.txt3 }]}>
                  {formatDistanceToNow(item.createdAt)}
                </Text>
              </View>
              {!item.read && <View style={s.unreadDot} />}
            </TouchableOpacity>
          )}
          ListHeaderComponent={() => (
            <View style={s.activityHeader}>
              <Text style={[s.sectionTitle, { color: themeColors.txt }]}>CAMPUS ACTIVITY</Text>
              <View style={s.statsRow}>
                <View style={[s.statItem, { backgroundColor: themeColors.card2 }]}>
                  <Text style={s.statIcon}>🔥</Text>
                  <View>
                    <Text style={[s.statVal, { color: themeColors.txt }]}>{stats?.todayPosts || 0}</Text>
                    <Text style={[s.statLabel, { color: themeColors.txt3 }]}>POSTS TODAY</Text>
                  </View>
                </View>
                <View style={[s.statItem, { backgroundColor: themeColors.card2 }]}>
                  <Text style={s.statIcon}>🥔</Text>
                  <View>
                    <Text style={[s.statVal, { color: themeColors.txt }]}>{(stats?.totalPosts || 0).toLocaleString()}</Text>
                    <Text style={[s.statLabel, { color: themeColors.txt3 }]}>TOTAL POTATO</Text>
                  </View>
                </View>
              </View>
              <Text style={[s.sectionTitle, { color: themeColors.txt, marginTop: 24 }]}>YOUR ALERTS</Text>
            </View>
          )}
          contentContainerStyle={s.list}
        />
      )}
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  empty: { fontFamily: 'PlusJakartaSans_500Medium', fontSize: 16 },
  list: { paddingBottom: 20 },
  item: {
    flexDirection: 'row',
    padding: 16,
    borderBottomWidth: 1,
    alignItems: 'center',
  },
  iconWrap: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(255,255,255,0.05)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  icon: { fontSize: 24 },
  content: { flex: 1 },
  title: { fontFamily: 'PlusJakartaSans_700Bold', fontSize: 15, marginBottom: 2 },
  body: { fontFamily: 'PlusJakartaSans_400Regular', fontSize: 14, marginBottom: 4 },
  time: { fontSize: 12 },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#ff6b35',
    marginLeft: 8,
  },
  activityHeader: { padding: 16, paddingBottom: 8 },
  sectionTitle: { fontSize: 11, fontWeight: '900', letterSpacing: 1.2, textTransform: 'uppercase', marginBottom: 12 },
  statsRow: { flexDirection: 'row', gap: 12 },
  statItem: { flex: 1, padding: 12, borderRadius: 16, flexDirection: 'row', alignItems: 'center', gap: 10 },
  statIcon: { fontSize: 20 },
  statVal: { fontSize: 15, fontWeight: '800' },
  statLabel: { fontSize: 8, fontWeight: '700' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 0.5,
  },
  backBtn: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontFamily: 'Syne_700Bold',
  },
});
