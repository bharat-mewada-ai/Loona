import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import * as Notifications from 'expo-notifications';
import { Post } from '../../types';
import { getColors } from '../../theme/colors';
import { useVote, useVoteBhandara, useGoing } from '../../hooks/usePosts';
import { useUIStore } from '../../store/uiStore';
import { useAuthStore } from '../../store/authStore';
import { formatDistanceToNow } from '../../utils/time';
import { triggerHaptic } from '../../utils/haptics';
import { getOptimizedCloudinaryUrl } from '../../utils/cloudinary';

interface Props {
  post: Post;
  onDelete: () => void;
}

const EventCard = React.memo(({ post, onDelete }: Props) => {
  const { mutate: vote } = useVote();
  const { mutate: toggleGoing } = useGoing();
  const { mutateAsync: voteBhandaraAsync } = useVoteBhandara();
  const { openCommentSheet, openReportSheet, isDark } = useUIStore();
  const { user } = useAuthStore();
  const themeColors = getColors(isDark);

  const authorId = typeof post.author === 'string' ? post.author : post.author?._id?.toString();
  const isAuthor = !!(user?._id && authorId && authorId === user._id.toString());
  const isStaff = ['admin', 'moderator', 'super-admin'].includes(user?.role || '');
  const canDelete = isAuthor || isStaff;
  const canReport = !isAuthor;

  const [votedLocal, setVotedLocal] = useState(post.hasVoted);
  const [goingLocal, setGoingLocal] = useState(post.hasGone);
  const [goingCount, setGoingCount] = useState(post.goingCount || 0);
  const [reminderSet, setReminderSet] = useState(false);
  const [bhandaraYesCount, setBhandaraYesCount] = useState(post.bhandaraCountYes || 0);

  const isBhandara = post.type === 'bhandara';

  const handleGoing = () => {
    triggerHaptic('impact');
    const newState = !goingLocal;
    setGoingLocal(newState);
    setGoingCount(prev => Math.max(0, prev + (newState ? 1 : -1)));
    toggleGoing(post._id);
    if (newState && !isBhandara) {
      handleSetReminder();
    }
  };

  const handleVote = () => {
    triggerHaptic('selection');
    setVotedLocal((v) => !v);
    vote(post._id);
  };

  const handleBhandaraVote = async (v: 'yes' | 'no') => {
    triggerHaptic('impact');
    const res = await voteBhandaraAsync({ id: post._id, vote: v });
    if (res?.bhandaraCountYes !== undefined) setBhandaraYesCount(res.bhandaraCountYes);
  };

  const handleSetReminder = async () => {
    if (!post.eventDate) return;
    try {
      const { status } = await Notifications.requestPermissionsAsync();
      if (status !== 'granted') return;
      const triggerTime = new Date(post.eventDate).getTime() - 15 * 60 * 1000;
      if (triggerTime < Date.now()) return;
      await Notifications.scheduleNotificationAsync({
        content: {
          title: `🔔 Event Reminder`,
          body: `"${post.title}" starts in 15 mins at ${post.eventLocation || 'Campus'}!`,
        },
        trigger: new Date(triggerTime) as any,
      });
      setReminderSet(true);
    } catch (e) {}
  };

  const formattedDate = post.eventDate 
    ? new Date(post.eventDate).toLocaleString([], { weekday: 'short', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) 
    : 'Date TBD';

  return (
    <View style={[s.card, { backgroundColor: themeColors.card, borderColor: themeColors.bdr }]}>
      {/* Visual Header / Image */}
      {post.image ? (
        <View style={s.imageContainer}>
          <Image source={{ uri: getOptimizedCloudinaryUrl(post.image, 800) }} style={s.headerImg} contentFit="cover" />
          <View style={s.imgOverlay}>
            <View style={[s.tag, { backgroundColor: 'rgba(200,245,58,0.9)', flexDirection: 'row', alignItems: 'center', gap: 8 }]}>
              <Text style={{ color: '#000', fontSize: 10, fontWeight: '900' }}>
                {isBhandara ? '🍛 BHANDARA' : '🎉 EVENT'}
              </Text>
              {canDelete && (
                <TouchableOpacity onPress={onDelete}>
                  <Text style={{ color: '#000', fontSize: 14, fontWeight: '800' }}>✕</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
        </View>
      ) : post.isHot ? (
        <View style={[s.visualHeader, { backgroundColor: '#1a1a1a' }]}>
          <View style={s.topRow}>
            <View style={[s.tag, { backgroundColor: 'rgba(200,245,58,0.1)' }]}>
              <Text style={{ color: '#c8f53a', fontSize: 11, fontWeight: '900' }}>
                {isBhandara ? '🍛 BHANDARA' : '🎉 FEST'}
              </Text>
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <View style={[s.tag, { backgroundColor: 'rgba(0,0,0,0.5)' }]}>
                <Text style={{ color: '#FFF', fontSize: 10, fontWeight: '900' }}>SPONSORED</Text>
              </View>
              {canDelete && (
                <TouchableOpacity onPress={onDelete} style={s.deleteBtn}>
                  <Text style={{ color: '#FFF', fontSize: 20, fontWeight: '800' }}>⋮</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>

          <View style={s.visualContent}>
            <Text style={{ fontSize: 60 }}>{isBhandara ? '🍛' : '🎊'}</Text>
            <Text style={[s.visualLabel, { color: '#c8f53a' }]}>{isBhandara ? 'FREE FOOD' : 'ANNUAL FEST'}</Text>
          </View>
        </View>
      ) : (
        <View style={[s.miniHeader, { backgroundColor: themeColors.card2 }]}>
          <View style={[s.tag, { backgroundColor: isBhandara ? 'rgba(255,107,53,0.1)' : 'rgba(59,130,246,0.1)' }]}>
            <Text style={{ color: isBhandara ? '#ff6b35' : '#3b82f6', fontSize: 10, fontWeight: '900' }}>
              {isBhandara ? '🍛 CAMPUS BHANDARA' : '📅 CAMPUS EVENT'}
            </Text>
          </View>
        </View>
      )}

      <View style={s.main}>
        <Text style={[s.title, { color: themeColors.txt }]}>{post.title}</Text>
        <Text style={[s.body, { color: themeColors.txt2 }]} numberOfLines={2}>{post.body || 'Join us for this event!'}</Text>
        
        <View style={s.metaRow}>
          <View style={s.metaItem}>
            <Ionicons name="calendar-outline" size={14} color={themeColors.txt3} />
            <Text style={[s.metaTxt, { color: themeColors.txt3 }]}>{formattedDate}</Text>
          </View>
          <View style={s.metaItem}>
            <Ionicons name="location-outline" size={14} color={themeColors.txt3} />
            <Text style={[s.metaTxt, { color: themeColors.txt3 }]}>{post.eventLocation || 'Campus'}</Text>
          </View>
          <View style={s.metaItem}>
            <Ionicons name="people-outline" size={14} color={themeColors.txt3} />
            <Text style={[s.metaTxt, { color: themeColors.txt3 }]}>{isBhandara ? bhandaraYesCount : goingCount} going</Text>
          </View>
        </View>

        <View style={s.actionRow}>
          <View>
            <Text style={[s.price, { color: themeColors.txt }]}>{isBhandara ? 'Free' : 'Register'}</Text>
            <Text style={[s.priceSub, { color: themeColors.txt3 }]}>{isBhandara ? 'entry' : 'now'}</Text>
          </View>

          <TouchableOpacity 
            style={[s.primaryBtn, { backgroundColor: goingLocal ? '#c8f53a' : '#1a1a1a', borderColor: '#c8f53a', borderWidth: 1 }]}
            onPress={() => isBhandara ? handleBhandaraVote('yes') : handleGoing()}
          >
            <Text style={{ color: goingLocal ? '#000' : '#c8f53a', fontWeight: '900' }}>
              {isBhandara ? "I'm Eating →" : (goingLocal ? "I'm Going ✓" : "I'm Going →")}
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      <View style={s.footer}>
        <View style={s.footerLeft}>
          <TouchableOpacity style={s.fBtn} onPress={handleVote}>
            <Text style={[s.fTxt, { color: votedLocal ? themeColors.ogi : themeColors.txt3 }]}>🥔 {post.upvotes + (votedLocal ? 1 : 0)}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={s.fBtn} onPress={() => openCommentSheet(post._id)}>
            <Text style={[s.fTxt, { color: themeColors.txt3 }]}>💬 {post.commentCount || 0}</Text>
          </TouchableOpacity>
        </View>
        {canReport && (
          <TouchableOpacity onPress={() => openReportSheet(post._id)}>
            <Ionicons name="flag-outline" size={16} color={themeColors.txt3} />
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
});

export default EventCard;

const s = StyleSheet.create({
  card: { borderRadius: 28, marginBottom: 20, overflow: 'hidden', borderWidth: 1 },
  visualHeader: { height: 180, padding: 16, alignItems: 'center', justifyContent: 'center' },
  miniHeader: { height: 60, paddingHorizontal: 16, justifyContent: 'center' },
  imageContainer: { height: 200, position: 'relative' },
  headerImg: { width: '100%', height: '100%' },
  imgOverlay: { position: 'absolute', top: 12, left: 12, right: 12 },
  deleteBtn: { padding: 4 },
  topRow: { position: 'absolute', top: 16, left: 16, right: 16, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  tag: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8 },
  visualContent: { alignItems: 'center', gap: 10 },
  visualLabel: { fontSize: 12, fontWeight: '900', letterSpacing: 1.5 },
  
  main: { padding: 20 },
  title: { fontSize: 22, fontWeight: '900', marginBottom: 8 },
  body: { fontSize: 14.5, lineHeight: 21.5, marginBottom: 16, opacity: 0.8 },
  
  metaRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginBottom: 20 },
  metaItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  metaTxt: { fontSize: 12, fontWeight: '600' },
  
  actionRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  price: { fontSize: 20, fontWeight: '900' },
  priceSub: { fontSize: 12, fontWeight: '600', marginTop: -2 },
  primaryBtn: { paddingHorizontal: 20, paddingVertical: 12, borderRadius: 16 },
  
  footer: { flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 20, paddingBottom: 16 },
  footerLeft: { flexDirection: 'row', gap: 16 },
  fBtn: { paddingVertical: 4 },
  fTxt: { fontSize: 13, fontWeight: '700' }
});
