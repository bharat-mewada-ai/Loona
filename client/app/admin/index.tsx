import React, { useState, useEffect } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, StyleSheet, SafeAreaView,
  ActivityIndicator, Alert, RefreshControl, TextInput, ScrollView
} from 'react-native';
import { useRouter } from 'expo-router';
import { getColors } from '../../src/theme/colors';
import { useUIStore } from '../../src/store/uiStore';
import { useAuthStore } from '../../src/store/authStore';
import client from '../../src/api/client';
import PostCard from '../../src/components/PostCard';

export default function AdminDashboard() {
  const router = useRouter();
  const { isDark } = useUIStore();
  const themeColors = getColors(isDark);
  const { user } = useAuthStore();

  // ─── Role guard: redirect non-admins immediately ───────────────────────
  useEffect(() => {
    if (user && user.role !== 'admin') {
      router.replace('/(tabs)');
    }
  }, [user]);

  if (!user || user.role !== 'admin') {
    return null; // render nothing while redirecting
  }

  const [loading, setLoading] = useState(true);
  const [posts, setPosts] = useState<any[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [broadcast, setBroadcast] = useState({ title: '', body: '' });
  const [broadcasting, setBroadcasting] = useState(false);

  const handleBroadcast = async () => {
    if (!broadcast.title || !broadcast.body) return Alert.alert('Error', 'Fill all fields');
    setBroadcasting(true);
    try {
      await client.post('/admin/broadcast', broadcast);
      Alert.alert('Success', 'Broadcast sent to all users!');
      setBroadcast({ title: '', body: '' });
    } catch (e) {
      Alert.alert('Error', 'Failed to send broadcast');
    } finally {
      setBroadcasting(false);
    }
  };

  const fetchReportedPosts = async () => {
    try {
      const { data } = await client.get('/posts/reported');
      setPosts(data);
    } catch (err: any) {
      Alert.alert('Error', 'Failed to fetch reported posts');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchReportedPosts();
  }, []);

  const handleAction = async (postId: string, action: 'delete' | 'dismiss') => {
    try {
      if (action === 'delete') {
        await client.delete(`/posts/${postId}`);
        Alert.alert('Deleted', 'Post has been removed.');
      } else {
        await client.patch(`/posts/${postId}/dismiss-reports`);
        Alert.alert('Dismissed', 'Reports have been cleared.');
      }
      fetchReportedPosts();
    } catch (err: any) {
      Alert.alert('Error', err.response?.data?.error || 'Action failed');
    }
  };

  if (loading) {
    return (
      <View style={[s.center, { backgroundColor: themeColors.bg }]}>
        <ActivityIndicator color={themeColors.ogi} />
      </View>
    );
  }

  return (
    <SafeAreaView style={[s.container, { backgroundColor: themeColors.bg }]}>
      <View style={[s.header, { borderBottomColor: themeColors.bdr }]}>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={[s.back, { color: themeColors.txt }]}>← Back</Text>
        </TouchableOpacity>
        <Text style={[s.title, { color: themeColors.txt }]}>Admin Moderation</Text>
        <View style={{ width: 40 }} />
      </View>

      <FlatList
        ListHeaderComponent={
          <View style={s.broadcastSection}>
            <Text style={[s.sectionTitle, { color: themeColors.txt }]}>📣 Spicy Broadcast</Text>
            <Text style={[s.sectionDesc, { color: themeColors.txt3 }]}>Send a push to ALL users (Swiggy style)</Text>
            <TextInput
              style={[s.input, { backgroundColor: themeColors.card, color: themeColors.txt, borderColor: themeColors.bdr }]}
              placeholder="Notification Title (e.g. 👀 Sshhh...)"
              placeholderTextColor="#666"
              value={broadcast.title}
              onChangeText={(t) => setBroadcast({ ...broadcast, title: t })}
            />
            <TextInput
              style={[s.input, { backgroundColor: themeColors.card, color: themeColors.txt, borderColor: themeColors.bdr, height: 60 }]}
              placeholder="Message Body (e.g. Someone confessed...)"
              placeholderTextColor="#666"
              multiline
              value={broadcast.body}
              onChangeText={(t) => setBroadcast({ ...broadcast, body: t })}
            />
            <TouchableOpacity 
              style={[s.broadcastBtn, { backgroundColor: themeColors.ogi }]} 
              onPress={handleBroadcast}
              disabled={broadcasting}
            >
              <Text style={s.broadcastBtnTxt}>{broadcasting ? 'Sending...' : 'Send Broadcast'}</Text>
            </TouchableOpacity>
            <View style={[s.divider, { backgroundColor: themeColors.bdr }]} />
            <Text style={[s.sectionTitle, { color: themeColors.txt, marginBottom: 12 }]}>Reported Posts ({posts.length})</Text>
          </View>
        }
        data={posts}
        keyExtractor={(item) => item._id}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchReportedPosts(); }} tintColor={themeColors.ogi} />}
        renderItem={({ item }) => (
          <View style={[s.card, { backgroundColor: themeColors.card, borderColor: themeColors.bdr }]}>
            <View style={s.reportBadge}>
              <Text style={s.reportTxt}>{item.reports?.length || 0} REPORTS</Text>
            </View>
            <PostCard post={item} />
            <View style={s.actions}>
              <TouchableOpacity 
                style={[s.btn, { backgroundColor: themeColors.bg2 }]} 
                onPress={() => handleAction(item._id, 'dismiss')}
              >
                <Text style={[s.btnTxt, { color: themeColors.txt }]}>Dismiss Reports</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[s.btn, { backgroundColor: themeColors.dangerbg }]} 
                onPress={() => handleAction(item._id, 'delete')}
              >
                <Text style={[s.btnTxt, { color: themeColors.danger }]}>Delete Post</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
        ListEmptyComponent={() => (
          <View style={s.empty}>
            <Text style={{ color: themeColors.txt3 }}>No reported posts. Good job! 🛡️</Text>
          </View>
        )}
        contentContainerStyle={{ padding: 16 }}
      />
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16, borderBottomWidth: 1 },
  back: { fontSize: 16, fontWeight: '600' },
  title: { fontFamily: 'Syne_700Bold', fontSize: 18 },
  broadcastSection: { marginBottom: 24 },
  sectionTitle: { fontSize: 20, fontWeight: '900', marginBottom: 4 },
  sectionDesc: { fontSize: 13, marginBottom: 16 },
  input: {
    borderWidth: 1,
    borderRadius: 14,
    padding: 14,
    fontSize: 15,
    marginBottom: 12,
  },
  broadcastBtn: {
    height: 54,
    borderRadius: 27,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 4,
  },
  broadcastBtnTxt: { color: '#000', fontWeight: '800', fontSize: 16 },
  divider: { height: 1, marginVertical: 32, opacity: 0.1 },
  card: { marginBottom: 20, borderRadius: 16, borderWidth: 1, overflow: 'hidden' },
  reportBadge: { backgroundColor: '#F87171', paddingVertical: 4, alignItems: 'center' },
  reportTxt: { color: '#fff', fontSize: 10, fontWeight: '900', letterSpacing: 1 },
  actions: { flexDirection: 'row', padding: 12, gap: 10, borderTopWidth: 1, borderTopColor: 'rgba(0,0,0,0.05)' },
  btn: { flex: 1, height: 40, borderRadius: 10, justifyContent: 'center', alignItems: 'center' },
  btnTxt: { fontSize: 13, fontWeight: '700' },
  empty: { alignItems: 'center', marginTop: 40 },
});
