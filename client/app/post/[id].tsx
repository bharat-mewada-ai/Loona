import React from 'react';
import { View, Text, StyleSheet, SafeAreaView, TouchableOpacity, ScrollView, ActivityIndicator } from 'react-native';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import { usePost } from '../../src/hooks/usePosts';
import { getColors } from '../../src/theme/colors';
import { useUIStore } from '../../src/store/uiStore';
import PostCard from '../../src/components/PostCard';

/**
 * PostDetailScreen
 * Used primarily for deep-linking from notifications.
 * Shows a single post in full view.
 */
export default function PostDetailScreen() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const isDark = useUIStore((s) => s.isDark);
  const themeColors = getColors(isDark);
  
  const { data: post, isLoading, error } = usePost(id as string);

  if (isLoading) {
    return (
      <View style={[s.center, { backgroundColor: themeColors.bg }]}>
        <ActivityIndicator color={themeColors.ogi} />
      </View>
    );
  }

  if (error || !post) {
    return (
      <View style={[s.center, { backgroundColor: themeColors.bg }]}>
        <Text style={{ color: themeColors.txt3 }}>Post not found or deleted.</Text>
        <TouchableOpacity onPress={() => router.replace('/')} style={s.backBtn}>
          <Text style={{ color: themeColors.ogi }}>Go back home</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <SafeAreaView style={[s.container, { backgroundColor: themeColors.bg }]}>
      <Stack.Screen options={{ 
        headerShown: true, 
        headerTitle: 'Post',
        headerStyle: { backgroundColor: themeColors.bg },
        headerTintColor: themeColors.txt,
        headerBackTitle: 'Back'
      }} />
      
      <ScrollView contentContainerStyle={s.scroll}>
        <PostCard post={post} />
        
        <View style={s.infoBox}>
          <Text style={[s.infoTxt, { color: themeColors.txt3 }]}>
            Tap the comment icon on the post to view or add replies.
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 },
  scroll: { padding: 12 },
  backBtn: { marginTop: 20, padding: 10 },
  infoBox: { marginTop: 20, padding: 20, alignItems: 'center' },
  infoTxt: { textAlign: 'center', fontSize: 14, fontStyle: 'italic' }
});
