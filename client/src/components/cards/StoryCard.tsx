import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { Post } from '../../types';
import { getColors } from '../../theme/colors';
import { useVote } from '../../hooks/usePosts';
import { useUIStore } from '../../store/uiStore';
import { useAuthStore } from '../../store/authStore';

interface Props {
  post: Post;
  onDelete: () => void;
}

export default function StoryCard({ post, onDelete }: Props) {
  const { mutate: vote } = useVote();
  const isDark = useUIStore(s => s.isDark);
  const openStoryViewer = useUIStore(s => s.openStoryViewer);
  const { user } = useAuthStore();
  const themeColors = getColors(isDark);

  const authorId = typeof post.author === 'string' ? post.author : post.author?._id?.toString();
  const isAuthor = !!(user?._id && authorId && authorId === user._id.toString());
  const isStaff = ['admin', 'moderator', 'super-admin'].includes(user?.role || '');
  const canDelete = isAuthor || isStaff;

  const [votedLocal, setVotedLocal] = useState(post.hasVoted);

  React.useEffect(() => {
    setVotedLocal(post.hasVoted);
  }, [post.hasVoted]);

  const handleVote = () => {
    setVotedLocal((v) => !v);
    vote(post._id);
  };

  const storyColors = ['#5D5FEF', '#ED4899', '#8B5CF6', '#F59E0B', '#10B981'];
  const color = storyColors[post._id.charCodeAt(post._id.length - 1) % storyColors.length];

  return (
    <TouchableOpacity 
      style={[s.card, { backgroundColor: color }]}
      onPress={() => openStoryViewer(post._id)}
      activeOpacity={0.9}
    >
      {post.image && (
        <View style={s.imageOverlay}>
          <Image source={{ uri: post.image }} style={s.bgImage} blurRadius={2} contentFit="cover" />
          <View style={s.darken} />
        </View>
      )}
      <View style={s.header}>
        <Text style={s.emoji}>{post.anonAvatar || '📖'}</Text>
        {canDelete && (
          <TouchableOpacity onPress={onDelete} style={s.menuBtn}>
            <Text style={{ fontSize: 20, color: '#FFF', fontWeight: '800' }}>⋮</Text>
          </TouchableOpacity>
        )}
      </View>
      
      <View style={s.content}>
        <Text style={s.title} numberOfLines={3}>{post.title}</Text>
      </View>

      <View style={s.footer}>
        <TouchableOpacity style={s.stat} onPress={handleVote}>
          <Text style={s.statTxt}>🥔 {post.upvotes + (votedLocal === post.hasVoted ? 0 : votedLocal ? 1 : -1)}</Text>
        </TouchableOpacity>
        <View style={s.stat}>
          <Ionicons name="chatbubble-outline" size={12} color="#FFF" />
          <Text style={s.statTxt}>{post.commentCount || 0}</Text>
        </View>
      </View>
    </TouchableOpacity>
  );
}

const s = StyleSheet.create({
  card: { borderRadius: 32, padding: 20, marginBottom: 16, height: 240, justifyContent: 'space-between', overflow: 'hidden' },
  imageOverlay: { ...StyleSheet.absoluteFillObject },
  bgImage: { width: '100%', height: '100%', opacity: 0.8 },
  darken: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.3)' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', zIndex: 1 },
  emoji: { fontSize: 48 },
  menuBtn: { padding: 5 },
  content: { marginTop: 'auto', zIndex: 1 },
  title: { color: '#FFF', fontSize: 20, fontWeight: '900', lineHeight: 28, textShadowColor: 'rgba(0,0,0,0.5)', textShadowOffset: { width: 0, height: 2 }, textShadowRadius: 6 },
  footer: { flexDirection: 'row', gap: 12, marginTop: 12, zIndex: 1 },
  stat: { backgroundColor: 'rgba(255,255,255,0.25)', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, flexDirection: 'row', alignItems: 'center', gap: 4 },
  statTxt: { color: '#FFF', fontSize: 12, fontWeight: '800' },
});
