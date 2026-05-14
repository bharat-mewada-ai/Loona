import React from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { useStories } from '../hooks/useStories';
import { useUIStore } from '../store/uiStore';
import { getColors } from '../theme/colors';

export default function StoryRail() {
  const { data, isLoading } = useStories();
  const { isDark, openStoryViewer, openComposeSheet } = useUIStore();
  const themeColors = getColors(isDark);

  const stories = data?.pages.flatMap(p => p.posts) || [];

  if (isLoading) {
    return (
      <View style={s.loader}>
        <ActivityIndicator color={themeColors.ogi} size="small" />
      </View>
    );
  }

  return (
    <View style={s.container}>
      <View style={s.header}>
        <Text style={[s.title, { color: themeColors.txt }]}>CAMPUS STORIES</Text>
        <TouchableOpacity onPress={() => openComposeSheet('stories')}>
          <Text style={[s.viewAll, { color: themeColors.ogi }]}>Post Yours +</Text>
        </TouchableOpacity>
      </View>
      
      <ScrollView 
        horizontal 
        showsHorizontalScrollIndicator={false} 
        contentContainerStyle={s.scroll}
      >
        <TouchableOpacity 
          style={[s.addCard, { borderColor: themeColors.bdr }]}
          onPress={() => openComposeSheet('stories')}
        >
          <View style={[s.addIconWrap, { backgroundColor: themeColors.card2 }]}>
            <Text style={{ fontSize: 24 }}>+</Text>
          </View>
          <Text style={[s.addLabel, { color: themeColors.txt2 }]}>Add Story</Text>
        </TouchableOpacity>

        {stories.map((story) => {
          const colors = ['#5D5FEF', '#ED4899', '#8B5CF6', '#F59E0B', '#10B981'];
          const color = colors[story._id.charCodeAt(story._id.length - 1) % colors.length];
          
          return (
            <TouchableOpacity 
              key={story._id}
              style={[s.storyCard, { backgroundColor: color }]}
              onPress={() => openStoryViewer(story._id, stories.map(s => s._id))}
              activeOpacity={0.9}
            >
              <Text style={s.storyEmoji}>{story.anonAvatar || '📖'}</Text>
              <Text style={s.storyTitle} numberOfLines={3}>{story.title}</Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  container: { marginBottom: 24, marginTop: 10 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, marginBottom: 12 },
  title: { fontSize: 12, fontWeight: '900', letterSpacing: 1.2 },
  viewAll: { fontSize: 12, fontWeight: '800' },
  scroll: { paddingHorizontal: 16, gap: 12 },
  storyCard: { width: 130, height: 180, borderRadius: 24, padding: 16, justifyContent: 'space-between' },
  storyEmoji: { fontSize: 32 },
  storyTitle: { color: '#FFF', fontSize: 13, fontWeight: '800', lineHeight: 18 },
  addCard: { width: 130, height: 180, borderRadius: 24, borderWidth: 2, borderStyle: 'dashed', alignItems: 'center', justifyContent: 'center', gap: 10 },
  addIconWrap: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  addLabel: { fontSize: 12, fontWeight: '800' },
  loader: { height: 180, justifyContent: 'center', alignItems: 'center' },
});
