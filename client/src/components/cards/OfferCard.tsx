import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Linking } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Post } from '../../types';
import { getColors } from '../../theme/colors';
import { useUIStore } from '../../store/uiStore';
import { useAuthStore } from '../../store/authStore';
import { triggerHaptic } from '../../utils/haptics';

interface Props {
  post: Post;
  onDelete?: () => void;
}

export default function OfferCard({ post, onDelete }: Props) {
  const { isDark, openReportSheet } = useUIStore();
  const { user } = useAuthStore();
  const themeColors = getColors(isDark);

  const authorId = typeof post.author === 'string' ? post.author : post.author?._id?.toString();
  const isAuthor = !!(user?._id && authorId && authorId === user._id.toString());
  const isStaff = ['admin', 'moderator', 'super-admin'].includes(user?.role || '');
  const canDelete = isAuthor || isStaff;
  const canReport = !isAuthor;

  const handleOpenLink = () => {
    if (post.externalLink) {
      triggerHaptic('impact');
      Linking.openURL(post.externalLink);
    }
  };

  return (
    <View style={[s.card, { backgroundColor: themeColors.card, borderColor: themeColors.bdr }]}>
      <View style={[s.topRow, { backgroundColor: '#c8f53a' }]}>
        <Text style={s.topTxt}>🔥 {post.isExclusive ? 'LOONA EXCLUSIVE OFFER' : 'COMMUNITY OFFER'}</Text>
      </View>

      <View style={s.main}>
        <View style={s.info}>
          <View style={[s.brandPill, { backgroundColor: themeColors.card2 }]}>
            <Text style={[s.brandName, { color: themeColors.txt }]}>{post.offerBrand || 'Local Brand'}</Text>
          </View>
          <Text style={[s.title, { color: themeColors.txt }]}>{post.title}</Text>
          <Text style={[s.body, { color: themeColors.txt2 }]} numberOfLines={2}>{post.body}</Text>
        </View>

        <View style={s.discountArea}>
          <Text style={[s.discount, { color: '#c8f53a' }]}>{post.offerDiscount || 'DEAL'}</Text>
          <Text style={[s.off, { color: '#c8f53a' }]}>OFF</Text>
        </View>
      </View>

      <View style={s.footer}>
        <TouchableOpacity 
          style={[s.claimBtn, { backgroundColor: '#1a1a1a', borderColor: '#c8f53a' }]}
          onPress={handleOpenLink}
        >
          <Text style={s.claimTxt}>Claim Deal →</Text>
        </TouchableOpacity>
        
        <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center' }}>
          {canReport && (
            <TouchableOpacity onPress={() => openReportSheet(post._id)} style={s.delBtn}>
              <Ionicons name="flag-outline" size={16} color={themeColors.txt3} />
            </TouchableOpacity>
          )}
          {onDelete && canDelete && (
            <TouchableOpacity onPress={onDelete} style={s.delBtn}>
              <Ionicons name="trash-outline" size={16} color={themeColors.txt3} />
            </TouchableOpacity>
          )}
        </View>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  card: { borderRadius: 24, marginBottom: 16, overflow: 'hidden', borderWidth: 1 },
  topRow: { paddingVertical: 6, alignItems: 'center' },
  topTxt: { color: '#000', fontSize: 10, fontWeight: '900', letterSpacing: 1 },
  main: { padding: 16, flexDirection: 'row', gap: 16, alignItems: 'center' },
  info: { flex: 1, gap: 6 },
  brandPill: { alignSelf: 'flex-start', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  brandName: { fontSize: 11, fontWeight: '800', textTransform: 'uppercase' },
  title: { fontSize: 18, fontWeight: '900' },
  body: { fontSize: 13, lineHeight: 18 },
  discountArea: { alignItems: 'center', minWidth: 70 },
  discount: { fontSize: 28, fontWeight: '900', lineHeight: 28 },
  off: { fontSize: 12, fontWeight: '900', marginTop: -4 },
  footer: { paddingHorizontal: 16, paddingBottom: 16, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  claimBtn: { flex: 1, paddingVertical: 10, borderRadius: 12, borderWidth: 1, alignItems: 'center' },
  claimTxt: { color: '#c8f53a', fontWeight: '900', fontSize: 13 },
  delBtn: { marginLeft: 12, padding: 8 }
});
