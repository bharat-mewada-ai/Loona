import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Post } from '../../types';
import { getColors } from '../../theme/colors';
import { useReact } from '../../hooks/usePosts';
import { useUIStore } from '../../store/uiStore';
import { useAuthStore } from '../../store/authStore';
import { formatDistanceToNow } from '../../utils/time';
import { triggerHaptic } from '../../utils/haptics';

interface Props {
  post: Post;
  onDelete: () => void;
  onReport?: () => void;
}

const REACTION_LIST = [
  { key: 'spicy', icon: '🌶️' }, { key: 'lit', icon: '🔥' },
  { key: 'lmao', icon: '🤣' }, { key: 'skull', icon: '💀' },
  { key: 'wholesome', icon: '🥺' }, { key: 'hmm', icon: '🤔' },
];

const ConfessionCard = React.memo(({ post, onDelete, onReport }: Props) => {
  const { mutate: react } = useReact();
  const isDark = useUIStore(s => s.isDark);
  const openCommentSheet = useUIStore(s => s.openCommentSheet);
  const { user } = useAuthStore();
  const themeColors = getColors(isDark);

  const authorId = typeof post.author === 'string' ? post.author : post.author?._id?.toString();
  const isAuthor = !!(user?._id && authorId && authorId === user._id.toString());
  const isStaff = ['admin', 'moderator', 'super-admin'].includes(user?.role || '');
  const canDelete = isAuthor || isStaff;
  const canReport = !isAuthor;

  const handleReact = (r: string) => {
    triggerHaptic('impact');
    react({ id: post._id, reaction: r });
  };

  const reactions = post.reactions || {};

  return (
    <TouchableOpacity 
      style={[s.card, { backgroundColor: themeColors.card, borderColor: themeColors.bdr }]}
      onPress={() => openCommentSheet(post._id)}
      activeOpacity={0.9}
      accessibilityRole="button"
      accessibilityLabel={`Confession: ${post.title}`}
      accessibilityHint="Double tap to view comments"
    >
      <View style={s.header}>
        <View style={s.metaRow}>
          <Text style={s.emoji}>🕳️</Text>
          <Text style={[s.metaTxt, { color: themeColors.txt3 }]}>
            Confession · {formatDistanceToNow(post.createdAt)}
          </Text>
        </View>
        <View style={s.headerActions}>
          {canReport && (
            <TouchableOpacity 
              onPress={onReport} 
              style={s.actionBtn}
              accessibilityRole="button"
              accessibilityLabel="Report this confession"
            >
              <Ionicons name="flag-outline" size={16} color={themeColors.txt3} />
            </TouchableOpacity>
          )}
          {canDelete && (
            <TouchableOpacity 
              onPress={onDelete} 
              style={s.actionBtn}
              accessibilityRole="button"
              accessibilityLabel="Delete this confession"
            >
              <Text style={{ fontSize: 18, color: themeColors.txt3 }}>⋮</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      <Text style={[s.text, { color: themeColors.txt }]}>{post.title}</Text>

      <View style={s.footer}>
        <View style={s.rxns}>
          {REACTION_LIST.slice(0, 4).map(r => (
            <TouchableOpacity 
              key={r.key} 
              style={[s.rxnBtn, { backgroundColor: themeColors.card2, borderColor: themeColors.bdr }]} 
              onPress={() => handleReact(r.key)}
              accessibilityRole="button"
              accessibilityLabel={`React with ${r.key}. Total ${reactions[r.key] || 0} reactions.`}
            >
              <Text style={[s.rxnTxt, { color: themeColors.txt }]}>{r.icon} {reactions[r.key] || 0}</Text>
            </TouchableOpacity>
          ))}
        </View>
        <View style={s.commentSection}>
          <View style={s.commentBadge}>
            <Ionicons name="chatbubble-outline" size={16} color={themeColors.txt3} />
            <Text style={[s.commentCount, { color: themeColors.txt3 }]}>{post.commentCount || 0}</Text>
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );
});

export default ConfessionCard;

const s = StyleSheet.create({
  card: { borderRadius: 24, padding: 24, marginBottom: 16, borderWidth: 1 },
  header: { alignItems: 'center', marginBottom: 20, position: 'relative' },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 8, justifyContent: 'center' },
  emoji: { fontSize: 18 },
  metaTxt: { fontSize: 12, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 1 },
  headerActions: { position: 'absolute', right: -10, top: -5, flexDirection: 'row', gap: 4, alignItems: 'center' },
  actionBtn: { padding: 10 },
  text: { fontSize: 15, lineHeight: 22.5, fontFamily: 'PlusJakartaSans_400Regular', textAlign: 'center', marginVertical: 12 },
  footer: { alignItems: 'center', marginTop: 24, gap: 16 },
  rxns: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, justifyContent: 'center' },
  rxnBtn: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 16, borderWidth: 1 },
  rxnTxt: { fontSize: 13, fontWeight: '800' },
  commentSection: { flexDirection: 'row', alignItems: 'center' },
  commentBadge: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 4 },
  commentCount: { fontSize: 13, fontWeight: '400', fontFamily: 'PlusJakartaSans_400Regular' },
});
