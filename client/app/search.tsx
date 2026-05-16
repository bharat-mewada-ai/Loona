import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TextInput, FlatList, TouchableOpacity, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Stack, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../src/theme/colors';
import { useUIStore } from '../src/store/uiStore';
import { getColors } from '../src/theme/colors';
import client from '../src/api/client';
import { postsApi } from '../src/api/posts.api';
import PostCard from '../src/components/PostCard';
import EmptyState from '../src/components/EmptyState';

export default function SearchScreen() {
  const router = useRouter();
  const isDark = useUIStore((s) => s.isDark);
  const themeColors = getColors(isDark);
  
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [type, setType] = useState<'posts' | 'users'>('posts');
  const [trendingTags, setTrendingTags] = useState<string[]>(['Placement', 'Bhandara', 'Hostel Life', 'Exam Prep']);

  useEffect(() => {
    postsApi.getTrendingTags().then(res => {
      if (res && res.length > 0) {
        setTrendingTags(res.map(t => t.tag.replace('#', '')));
      }
    }).catch(() => {});
  }, []);

  const handleSearch = async (text: string) => {
    setQuery(text);
    if (text.length < 2) {
      setResults([]);
      return;
    }

    setLoading(true);
    try {
      const endpoint = type === 'posts' ? '/posts/search/posts' : '/posts/search/users';
      const { data } = await client.get(endpoint, { params: { q: text } });
      setResults(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={[s.safe, { backgroundColor: themeColors.bg }]}>
      <Stack.Screen options={{ headerShown: false }} />
      
      <View style={[s.header, { borderBottomColor: themeColors.bdr }]}>
        <TouchableOpacity 
          style={[s.backBtn, { backgroundColor: themeColors.card2 }]} 
          onPress={() => router.back()}
        >
          <Ionicons name="chevron-back" size={24} color={themeColors.txt} />
        </TouchableOpacity>
        <View style={[s.searchBar, { backgroundColor: themeColors.card2, borderColor: themeColors.bdr }]}>
          <Ionicons name="search-outline" size={18} color={themeColors.txt3} style={{ marginRight: 8 }} />
          <TextInput
            style={[s.input, { color: themeColors.txt }]}
            placeholder="Search posts or users..."
            placeholderTextColor={themeColors.txt3}
            value={query}
            onChangeText={handleSearch}
            autoFocus
          />
          {query.length > 0 && (
            <TouchableOpacity onPress={() => handleSearch('')}>
              <Ionicons name="close-circle" size={18} color={themeColors.txt3} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      <View style={s.tabs}>
        <TouchableOpacity 
          style={[s.tab, type === 'posts' && [s.tabActive, { borderBottomColor: themeColors.ogi }]]}
          onPress={() => { setType('posts'); setResults([]); setQuery(''); }}
        >
          <Text style={[s.tabTxt, { color: type === 'posts' ? themeColors.txt : themeColors.txt3 }]}>Posts</Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={[s.tab, type === 'users' && [s.tabActive, { borderBottomColor: themeColors.ogi }]]}
          onPress={() => { setType('users'); setResults([]); setQuery(''); }}
        >
          <Text style={[s.tabTxt, { color: type === 'users' ? themeColors.txt : themeColors.txt3 }]}>Users</Text>
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={s.center}>
          <ActivityIndicator color={themeColors.ogi} />
        </View>
      ) : (
        <FlatList
          data={results}
          keyExtractor={(item) => item._id}
          keyboardShouldPersistTaps="handled"
          renderItem={({ item }) => (
            type === 'posts' ? (
              <PostCard post={item} />
            ) : (
              <TouchableOpacity 
                style={[s.userItem, { backgroundColor: themeColors.card2 }]}
                onPress={() => {
                  router.push(`/user/${item._id}`);
                }}
              >
                <View style={[s.uAvatarWrap, { backgroundColor: themeColors.bg2 }]}>
                  <Text style={s.userAvatar}>{item.avatar || '👤'}</Text>
                </View>
                <View style={s.userInfo}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    <Text style={[s.userName, { color: themeColors.txt }]}>{item.name}</Text>
                    {item.isVerified && <Text style={{ fontSize: 14 }}>✅</Text>}
                  </View>
                  <Text style={[s.userSub, { color: themeColors.txt3 }]}>
                    {item.campus?.toUpperCase()} · {item.karma} Karma
                  </Text>
                </View>
                <Text style={{ color: themeColors.txt3, fontSize: 18 }}>›</Text>
              </TouchableOpacity>
            )
          )}
          ListEmptyComponent={
            query.length > 1 ? (
              <EmptyState type="search" />
            ) : (
              <View style={{ padding: 16 }}>
                <Text style={[s.secTitle, { color: themeColors.txt3 }]}>TRENDING NOW</Text>
                <View style={s.trendingWrap}>
                  {trendingTags.map(tag => (
                    <TouchableOpacity 
                      key={tag} 
                      style={[s.tagBtn, { backgroundColor: themeColors.card2, borderColor: themeColors.bdr }]}
                      onPress={() => handleSearch(tag)}
                    >
                      <Text style={[s.tagTxt, { color: themeColors.txt2 }]}># {tag}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
                
                <View style={[s.center, { marginTop: 40 }]}>
                  <Text style={{ fontSize: 40, marginBottom: 10 }}>✨</Text>
                  <Text style={[s.empty, { color: themeColors.txt3 }]}>Search for posts or campus legends</Text>
                </View>
              </View>
            )
          }
          contentContainerStyle={s.list}
        />
      )}
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1 },
  header: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    padding: 16, 
    gap: 12,
  },
  backBtn: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
  },
  searchBar: {
    flex: 1,
    height: 44,
    borderRadius: 22,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
  },
  searchIcon: { fontSize: 16, marginRight: 8 },
  input: { flex: 1, fontSize: 15, fontFamily: 'PlusJakartaSans_500Medium' },
  clearIcon: { fontSize: 18, color: '#888', padding: 4 },
  cancel: { fontFamily: 'PlusJakartaSans_700Bold', fontSize: 15 },
  tabs: { flexDirection: 'row', paddingHorizontal: 16, marginBottom: 10 },
  tab: { flex: 1, alignItems: 'center', paddingVertical: 12, borderBottomWidth: 3, borderBottomColor: 'transparent' },
  tabActive: { borderBottomColor: Colors.ogi },
  tabTxt: { fontFamily: 'PlusJakartaSans_800ExtraBold', fontSize: 13, letterSpacing: 1, textTransform: 'uppercase' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', marginTop: 100 },
  empty: { fontFamily: 'PlusJakartaSans_600SemiBold', fontSize: 15 },
  list: { padding: 16, paddingBottom: 40 },
  userItem: { flexDirection: 'row', alignItems: 'center', padding: 12, borderRadius: 16, marginBottom: 10 },
  uAvatarWrap: { width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  userAvatar: { fontSize: 24 },
  userInfo: { flex: 1 },
  userName: { fontFamily: 'PlusJakartaSans_700Bold', fontSize: 16 },
  userSub: { fontSize: 12, marginTop: 2, fontWeight: '500' },
  secTitle: { fontSize: 11, fontWeight: '900', letterSpacing: 1.2, textTransform: 'uppercase', marginBottom: 16, marginTop: 8 },
  trendingWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  tagBtn: { paddingHorizontal: 16, paddingVertical: 10, borderRadius: 20, borderWidth: 1 },
  tagTxt: { fontSize: 13, fontWeight: '700' },
});
