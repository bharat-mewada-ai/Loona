import React, { useState, useEffect } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, StyleSheet,
  ActivityIndicator, Alert, RefreshControl, TextInput, ScrollView
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
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

  useEffect(() => {
    if (user && user.role !== 'admin') {
      router.replace('/(tabs)');
    }
  }, [user]);

  if (!user || user.role !== 'admin') {
    return null;
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

  const handleBan = (authorId: string, authorName: string) => {
    Alert.alert(
      'Ban User?',
      `Are you sure you want to ban ${authorName} permanently?`,
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Ban Permanently', 
          style: 'destructive',
          onPress: async () => {
            try {
              await client.post(`/admin/users/${authorId}/ban`);
              Alert.alert('Success', 'User has been banned.');
            } catch (e) {
              Alert.alert('Error', 'Failed to ban user.');
            }
          }
        }
      ]
    );
  };

  const handleVerify = async (authorId: string) => {
    try {
      await client.post(`/admin/users/${authorId}/verify`);
      Alert.alert('Success', 'User verified successfully.');
    } catch (e) {
      Alert.alert('Error', 'Failed to verify user.');
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
        <Text style={[s.title, { color: themeColors.txt }]}>Admin Terminal</Text>
        <View style={{ width: 40 }} />
      </View>

      <FlatList
        ListHeaderComponent={
          <View style={s.broadcastSection}>
            <Text style={[s.sectionTitle, { color: themeColors.txt }]}>📣 SPIKE BROADCAST</Text>
            <Text style={[s.sectionDesc, { color: themeColors.txt3 }]}>Push notifications to all users (Use sparingly!)</Text>
            <TextInput
              style={[s.input, { backgroundColor: themeColors.card, color: themeColors.txt, borderColor: themeColors.bdr }]}
              placeholder="Title..."
              placeholderTextColor="#666"
              value={broadcast.title}
              onChangeText={(t) => setBroadcast({ ...broadcast, title: t })}
            />
            <TextInput
              style={[s.input, { backgroundColor: themeColors.card, color: themeColors.txt, borderColor: themeColors.bdr, height: 60 }]}
              placeholder="Body..."
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
              <Text style={s.broadcastBtnTxt}>{broadcasting ? 'Sending...' : 'Transmit Now'}</Text>
            </TouchableOpacity>
            
            <View style={[s.divider, { backgroundColor: themeColors.bdr }]} />
            
            <View style={s.queueHeader}>
              <Text style={[s.sectionTitle, { color: themeColors.txt }]}>MODERATION QUEUE</Text>
              <View style={[s.countBadge, { backgroundColor: themeColors.danger }]}>
                <Text style={s.countTxt}>{posts.length}</Text>
              </View>
            </View>
          </View>
        }
        data={posts}
        keyExtractor={(item) => item._id}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchReportedPosts(); }} tintColor={themeColors.ogi} />}
        renderItem={({ item }) => (
          <View style={[s.card, { backgroundColor: themeColors.card, borderColor: themeColors.bdr }]}>
            <View style={s.cardMeta}>
              <Text style={s.reportTag}>{item.reports?.length || 0} REPORTS</Text>
              <Text style={[s.authorTag, { color: themeColors.txt3 }]}>By: {item.anonName}</Text>
            </View>

            <View style={s.postPreview}>
              <PostCard post={item} />
            </View>

            <View style={s.actions}>
              <View style={s.actionRow}>
                <TouchableOpacity 
                  style={[s.btn, { backgroundColor: themeColors.bg2 }]} 
                  onPress={() => handleAction(item._id, 'dismiss')}
                >
                  <Text style={[s.btnTxt, { color: themeColors.txt }]}>Keep Post</Text>
                </TouchableOpacity>
                <TouchableOpacity 
                  style={[s.btn, { backgroundColor: themeColors.dangerbg }]} 
                  onPress={() => handleAction(item._id, 'delete')}
                >
                  <Text style={[s.btnTxt, { color: themeColors.danger }]}>Remove Post</Text>
                </TouchableOpacity>
              </View>

              <View style={[s.actionRow, { marginTop: 8 }]}>
                <TouchableOpacity 
                  style={[s.btn, { backgroundColor: themeColors.okbg }]} 
                  onPress={() => handleVerify(item.author)}
                >
                  <Text style={[s.btnTxt, { color: themeColors.ok }]}>Verify User</Text>
                </TouchableOpacity>
                <TouchableOpacity 
                  style={[s.btn, { backgroundColor: themeColors.dangerbg, borderColor: themeColors.danger, borderWidth: 1 }]} 
                  onPress={() => handleBan(item.author, item.anonName)}
                >
                  <Text style={[s.btnTxt, { color: themeColors.danger }]}>BAN USER</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        )}
        ListEmptyComponent={() => (
          <View style={s.empty}>
            <Text style={{ fontSize: 40, marginBottom: 12 }}>🛡️</Text>
            <Text style={{ color: themeColors.txt3, fontFamily: 'PlusJakartaSans_600SemiBold' }}>All clear! No pending reports.</Text>
          </View>
        )}
        contentContainerStyle={{ padding: 16, paddingBottom: 100 }}
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
  sectionTitle: { fontSize: 11, fontWeight: '900', letterSpacing: 1.5, marginBottom: 8, textTransform: 'uppercase' },
  sectionDesc: { fontSize: 13, marginBottom: 16, opacity: 0.6 },
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
  queueHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 16 },
  countBadge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 10 },
  countTxt: { color: '#FFF', fontSize: 10, fontWeight: '900' },

  card: { marginBottom: 20, borderRadius: 24, borderWidth: 1, overflow: 'hidden' },
  cardMeta: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 12, backgroundColor: 'rgba(0,0,0,0.02)' },
  reportTag: { color: '#F87171', fontSize: 10, fontWeight: '900', letterSpacing: 1 },
  authorTag: { fontSize: 10, fontWeight: '700' },
  postPreview: { paddingBottom: 12 },
  actions: { padding: 12, borderTopWidth: 1, borderTopColor: 'rgba(0,0,0,0.05)' },
  actionRow: { flexDirection: 'row', gap: 10 },
  btn: { flex: 1, height: 44, borderRadius: 14, justifyContent: 'center', alignItems: 'center' },
  btnTxt: { fontSize: 12, fontWeight: '800', textTransform: 'uppercase' },
  empty: { alignItems: 'center', marginTop: 80 },
});
