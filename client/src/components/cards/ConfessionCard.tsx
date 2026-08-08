import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Modal } from 'react-native';
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

  const [showMenuModal, setShowMenuModal] = useState(false);

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
        {(canDelete || canReport) && (
          <View style={s.headerActions}>
            <TouchableOpacity
              onPress={() => setShowMenuModal(true)}
              style={s.actionBtn}
              accessibilityRole="button"
              accessibilityLabel="More options"
            >
              <Ionicons name="ellipsis-horizontal" size={20} color={themeColors.txt3} />
            </TouchableOpacity>
          </View>
        )}
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

      {/* Three-dot Action Menu Modal */}
      <Modal
        visible={showMenuModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowMenuModal(false)}
      >
        <TouchableOpacity
          style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' }}
          activeOpacity={1}
          onPress={() => setShowMenuModal(false)}
        >
          <TouchableOpacity
            activeOpacity={1}
            style={[s.menuSheet, { backgroundColor: isDark ? '#1A1A22' : '#FFFFFF' }]}
          >
            <View style={{ width: 40, height: 4, backgroundColor: isDark ? '#333' : '#DDD', borderRadius: 2, alignSelf: 'center', marginBottom: 16 }} />
            {canDelete && (
              <TouchableOpacity
                style={s.menuItem}
                onPress={() => {
                  setShowMenuModal(false);
                  setTimeout(() => onDelete?.(), 200);
                }}
              >
                <Ionicons name="trash-outline" size={20} color="#FF3B30" />
                <View style={{ flex: 1 }}>
                  <Text style={[s.menuItemTitle, { color: '#FF3B30' }]}>Delete Confession</Text>
                  <Text style={[s.menuItemSub, { color: themeColors.txt3 }]}>This action cannot be undone</Text>
                </View>
              </TouchableOpacity>
            )}
            {canReport && (
              <TouchableOpacity
                style={s.menuItem}
                onPress={() => {
                  setShowMenuModal(false);
                  setTimeout(() => onReport?.(), 200);
                }}
              >
                <Ionicons name="flag-outline" size={20} color={themeColors.txt2} />
                <View style={{ flex: 1 }}>
                  <Text style={[s.menuItemTitle, { color: themeColors.txt }]}>Report Confession</Text>
                  <Text style={[s.menuItemSub, { color: themeColors.txt3 }]}>Report to our moderation team</Text>
                </View>
              </TouchableOpacity>
            )}
            <TouchableOpacity
              style={[s.menuItem, { marginTop: 8, borderTopWidth: 1, borderTopColor: isDark ? '#222' : '#EEE' }]}
              onPress={() => setShowMenuModal(false)}
            >
              <Text style={[s.menuItemTitle, { color: themeColors.txt3, textAlign: 'center', flex: 1 }]}>Cancel</Text>
            </TouchableOpacity>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>
    </TouchableOpacity>
  );
});

export default ConfessionCard;

const s = StyleSheet.create({
  card: { borderRadius: 24, padding: 24, marginBottom: 16, borderWidth: 1 },
  header: { alignItems: 'center', marginBottom: 20, position: 'relative' },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 8, justifyContent: 'center' },
  emoji: { fontSize: 18 },
  metaTxt: { fontSize: 12, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 1, fontFamily: 'DMSans_700Bold' },
  headerActions: { position: 'absolute', right: -10, top: -5, flexDirection: 'row', gap: 4, alignItems: 'center' },
  actionBtn: { padding: 10 },
  text: { fontSize: 15, lineHeight: 22.5, fontFamily: 'DMSans_400Regular', textAlign: 'center', marginVertical: 12 },
  footer: { alignItems: 'center', marginTop: 24, gap: 16 },
  rxns: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, justifyContent: 'center' },
  rxnBtn: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 16, borderWidth: 1 },
  rxnTxt: { fontSize: 13, fontWeight: '800', fontFamily: 'DMSans_700Bold' },
  commentSection: { flexDirection: 'row', alignItems: 'center' },
  commentBadge: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 4 },
  commentCount: { fontSize: 13, fontWeight: '400', fontFamily: 'DMSans_400Regular' },
  // Three-dot action menu sheet
  menuSheet: { borderTopLeftRadius: 28, borderTopRightRadius: 28, padding: 20, paddingBottom: 36, gap: 4 },
  menuItem: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingVertical: 14, paddingHorizontal: 4 },
  menuItemTitle: { fontSize: 15, fontWeight: '600', fontFamily: 'DMSans_600SemiBold' },
  menuItemSub: { fontSize: 12, fontFamily: 'DMSans_400Regular', marginTop: 2 },
});
