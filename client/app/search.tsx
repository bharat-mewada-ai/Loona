import React, { useState } from 'react';
import { View, Text, StyleSheet, TextInput, FlatList, TouchableOpacity, SafeAreaView, ActivityIndicator } from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { Colors } from '../src/theme/colors';
import { useUIStore } from '../src/store/uiStore';
import { getColors } from '../src/theme/colors';
import client from '../src/api/client';
import PostCard from '../src/components/PostCard';

export default function SearchScreen() {
  const router = useRouter();
  const isDark = useUIStore((s) => s.isDark);
  const themeColors = getColors(isDark);
  
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [type, setType] = useState<'posts' | 'users'>('posts');

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
        <View style={[s.searchBar, { backgroundColor: themeColors.card2, borderColor: themeColors.bdr }]}>
          <Text style={s.searchIcon}>🔍</Text>
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
              <Text style={s.clearIcon}>✕</Text>
            </TouchableOpacity>
          )}
        </View>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={[s.cancel, { color: themeColors.ogi }]}>Cancel</Text>
        </TouchableOpacity>
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
          <ActivityIndicator color={Colors.ogi} />
        </View>
      ) : (
        <FlatList
          data={results}
          keyExtractor={(item) => item._id}
          renderItem={({ item }) => (
            type === 'posts' ? (
              <PostCard post={item} />
            ) : (
              <TouchableOpacity style={[s.userItem, { borderBottomColor: themeColors.bdr }]}>
                <Text style={s.userAvatar}>{item.avatar || '👤'}</Text>
                <View style={s.userInfo}>
                  <Text style={[s.userName, { color: themeColors.txt }]}>{item.name}</Text>
                  <Text style={[s.userSub, { color: themeColors.txt3 }]}>
                    {item.campus.toUpperCase()} · {item.karma} Karma
                  </Text>
                </View>
              </TouchableOpacity>
            )
          )}
          ListEmptyComponent={
            query.length > 1 ? (
              <View style={s.center}>
                <Text style={[s.empty, { color: themeColors.txt3 }]}>No results found</Text>
              </View>
            ) : null
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
    borderBottomWidth: 1,
  },
  searchBar: {
    flex: 1,
    height: 44,
    borderRadius: 22,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
  },
  searchIcon: { fontSize: 16, marginRight: 8 },
  input: { flex: 1, fontSize: 16, fontFamily: 'PlusJakartaSans_500Medium' },
  clearIcon: { fontSize: 18, color: '#888', padding: 4 },
  cancel: { fontFamily: 'PlusJakartaSans_600SemiBold', fontSize: 16 },
  tabs: { flexDirection: 'row', borderBottomWidth: 0 },
  tab: { flex: 1, alignItems: 'center', paddingVertical: 12, borderBottomWidth: 2, borderBottomColor: 'transparent' },
  tabActive: { },
  tabTxt: { fontFamily: 'PlusJakartaSans_700Bold', fontSize: 14 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', marginTop: 100 },
  empty: { fontFamily: 'PlusJakartaSans_500Medium', fontSize: 16 },
  list: { padding: 16 },
  userItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1 },
  userAvatar: { fontSize: 32, marginRight: 16 },
  userInfo: { flex: 1 },
  userName: { fontFamily: 'PlusJakartaSans_700Bold', fontSize: 16 },
  userSub: { fontSize: 12, marginTop: 2 },
});
