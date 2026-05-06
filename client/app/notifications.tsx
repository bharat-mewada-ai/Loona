import React, { useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, SafeAreaView, ActivityIndicator } from 'react-native';
import { router, Stack } from 'expo-router';
import { Colors } from '../src/theme/colors';
import { useInAppNotifications, useMarkNotificationsRead } from '../src/hooks/useNotifications';
import { useUIStore } from '../src/store/uiStore';
import { formatDistanceToNow } from '../src/utils/time';
import { getColors } from '../src/theme/colors';

export default function NotificationsScreen() {
  const isDark = useUIStore((s) => s.isDark);
  const themeColors = getColors(isDark);
  const { data: notifications, isLoading, refetch } = useInAppNotifications();
  const { mutate: markRead } = useMarkNotificationsRead();

  useEffect(() => {
    // Mark as read when screen is opened
    markRead();
  }, []);

  const renderIcon = (type: string) => {
    switch (type) {
      case 'upvote': return '🥔';
      case 'reaction': return '✨';
      case 'comment': return '💬';
      case 'mention': return '🏷️';
      default: return '🔔';
    }
  };

  const handlePress = (notif: any) => {
    if (notif.data?.postId) {
      // In a real app, we'd navigate to the post detail screen
      // For now, we'll just go to the feed or alert
      console.log('Navigate to post:', notif.data.postId);
    }
  };

  return (
    <SafeAreaView style={[s.safe, { backgroundColor: themeColors.bg }]}>
      <Stack.Screen options={{ 
        headerTitle: 'Notifications',
        headerStyle: { backgroundColor: themeColors.bg },
        headerTintColor: themeColors.txt,
        headerTitleStyle: { fontFamily: 'Syne_700Bold' },
        headerShadowVisible: false,
      }} />

      {isLoading ? (
        <View style={s.center}>
          <ActivityIndicator color={Colors.ogi} />
        </View>
      ) : notifications?.length === 0 ? (
        <View style={s.center}>
          <Text style={[s.empty, { color: themeColors.txt3 }]}>No notifications yet</Text>
        </View>
      ) : (
        <FlatList
          data={notifications}
          keyExtractor={(item) => item._id}
          onRefresh={refetch}
          refreshing={isLoading}
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
    backgroundColor: Colors.ogi,
    marginLeft: 8,
  }
});
