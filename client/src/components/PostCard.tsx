import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Image, Alert, ScrollView, Dimensions } from 'react-native';
import * as Notifications from 'expo-notifications';
import { Post } from '../types';
import { CAMPUS_META, POST_TYPES, VIBE_META } from '../constants';
import { getColors } from '../theme/colors';
import { useVote, useReact, useVoteBhandara, useVotePoll, useDeletePost } from '../hooks/usePosts';
import { useUIStore } from '../store/uiStore';
import { useAuthStore } from '../store/authStore';
import { formatDistanceToNow } from '../utils/time';
import { getDistance, formatDistance } from '../utils/geo';

const { width } = Dimensions.get('window');

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

interface Props {
  post: Post;
  isAllTab?: boolean;
  userLocation?: { latitude: number; longitude: number } | null;
}

export default function PostCard({ post, isAllTab, userLocation }: Props) {
  const { mutate: vote } = useVote();
  const { mutate: react } = useReact();
  const { mutateAsync: voteBhandaraAsync } = useVoteBhandara();
  const { mutate: votePoll } = useVotePoll();
  const { mutate: deletePost } = useDeletePost();
  const { openReportSheet, openCommentSheet, openAuthorProfile, isDark } = useUIStore();
  const { user } = useAuthStore();
  const themeColors = getColors(isDark);

  const [votedLocal, setVotedLocal] = useState(post.hasVoted);
  const [reminderSet, setReminderSet] = useState(false);
  const [bhandaraYesCount, setBhandaraYesCount] = useState(post.bhandaraCountYes || 0);

  const isConfession = post.type === 'confess';
  const isEvent = post.type === 'events' || post.type === 'bhandara';
  const isBhandara = post.type === 'bhandara';
  const isPlacement = post.type === 'place';
  const hasEventDate = !!post.eventDate;
  const hasImage = !!post.image;
  
  const campus = (CAMPUS_META as any)[post.campus] || { label: 'Campus', color: '#666', bg: '#F5F5F5', bdr: '#DDD' };
  const vibeEntry = VIBE_META[post.vibe ?? ''] ?? null;

  const handleVote = () => {
    setVotedLocal((v) => !v);
    vote(post._id);
  };

  const handleReact = (r: string) => {
    react({ id: post._id, reaction: r });
  };

  const handleBhandaraVote = async (v: 'yes' | 'no') => {
    const res = await voteBhandaraAsync({ id: post._id, vote: v });
    if (res?.bhandaraCountYes !== undefined) {
      setBhandaraYesCount(res.bhandaraCountYes);
    }
  };

  const handleSetReminder = async () => {
    if (!post.eventDate) return;
    try {
      const { status } = await Notifications.requestPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Denied', 'Enable notifications to set reminders.');
        return;
      }
      const triggerTime = new Date(post.eventDate).getTime() - 15 * 60 * 1000;
      if (triggerTime < Date.now()) {
        Alert.alert('Too Late!', 'This event is starting soon.');
        return;
      }
      await Notifications.scheduleNotificationAsync({
        content: {
          title: `🔔 Event Reminder`,
          body: `"${post.title}" starts in 15 mins at ${post.eventLocation || 'Campus'}!`,
        },
        trigger: new Date(triggerTime) as any,
      });
      setReminderSet(true);
      Alert.alert('Success', "We'll notify you 15 mins before! 📅");
    } catch (e) { Alert.alert('Error', 'Could not set reminder.'); }
  };

  const handlePollVote = (index: number) => {
    if (post.userVote !== null) return;
    votePoll({ id: post._id, optionIndex: index });
  };

  const handleDeletePost = () => {
    Alert.alert(
      "Delete Post",
      "Are you sure you want to delete this post? This cannot be undone.",
      [
        { text: "Cancel", style: "cancel" },
        { 
          text: "Delete", 
          style: "destructive", 
          onPress: () => deletePost(post._id) 
        }
      ]
    );
  };

  const handleAuthorPress = () => {
    openAuthorProfile({
      userId: post.author,
      postId: post._id,
      anonName: post.anonName,
      anonAvatar: post.anonAvatar || '👤',
      isSelf: post.author === user?._id,
      postCampus: post.campus
    });
  };

  const reactions = post.reactions || {};
  const reactionList = [
    { key: 'spicy', icon: '🌶️' }, { key: 'lit', icon: '🔥' },
    { key: 'lmao', icon: '🤣' }, { key: 'skull', icon: '💀' },
    { key: 'wholesome', icon: '🥺' }, { key: 'hmm', icon: '🤔' },
  ];

  const formattedEventDate = post.eventDate 
    ? new Date(post.eventDate).toLocaleString([], { weekday: 'short', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) 
    : 'Date TBD';

  // Distance calculation
  let distanceText = "";
  if (userLocation && post.location?.coordinates) {
    const d = getDistance(
      userLocation.latitude,
      userLocation.longitude,
      post.location.coordinates[1],
      post.location.coordinates[0]
    );
    distanceText = ` · near ${formatDistance(d)} from you`;
  }

  if (isConfession && !isAllTab) {
    return (
      <View style={[s.confCard, { backgroundColor: themeColors.card, borderColor: themeColors.bdr }]}>
        <View style={{ position: 'absolute', top: 12, right: 12 }}>
          {(post.author === user?._id || user?.role === 'admin') && (
            <TouchableOpacity onPress={handleDeletePost}>
              <Text style={{ fontSize: 18, color: themeColors.txt3 }}>⋮</Text>
            </TouchableOpacity>
          )}
        </View>
        <Text style={[s.confText, { color: themeColors.txt }]}>{post.title}</Text>
        <View style={s.confRxns}>
          {reactionList.slice(0, 4).map(r => (
            <TouchableOpacity key={r.key} style={[s.confBtn, { backgroundColor: themeColors.card2, borderColor: themeColors.bdr }]} onPress={() => handleReact(r.key)}>
              <Text style={[s.confBtnTxt, { color: themeColors.txt }]}>{r.icon} {reactions[r.key] || 0}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>
    );
  }

  return (
    <View style={[s.card, { backgroundColor: themeColors.card, borderColor: themeColors.bdr }]}>
      {/* Post Header */}
      <View style={s.cardHeader}>
        <TouchableOpacity style={s.authorRow} onPress={handleAuthorPress} activeOpacity={0.7}>
          <View style={[s.avatarWrap, { backgroundColor: themeColors.card2 }]}>
            <Text style={s.avatarEmoji}>{isConfession ? '🕳️' : (post.anonAvatar || '👤')}</Text>
          </View>
          <View>
            <Text style={[s.authorName, { color: themeColors.txt }]}>{isConfession ? 'Confession' : post.anonName}</Text>
            <Text style={[s.authorHandle, { color: themeColors.txt3 }]}>
              {campus.label} · {formatDistanceToNow(post.createdAt)}
            </Text>
          </View>
        </TouchableOpacity>
        
        <View style={s.headerRight}>
          <View style={[s.statusPill, { backgroundColor: isEvent ? '#3B82F620' : (isConfession ? '#6B728020' : '#FF6B0020') }]}>
            <Text style={[s.statusTxt, { color: isEvent ? '#3B82F6' : (isConfession ? '#6B7280' : '#FF6B00') }]}>
              {isEvent ? '🎉 Event' : (isConfession ? '🕳️ Secret' : (post.upvotes > 10 ? '🔥 Hot' : '💬 Thought'))}
            </Text>
          </View>
          {(post.author === user?._id || user?.role === 'admin') && (
            <TouchableOpacity onPress={handleDeletePost} style={s.moreBtn}>
              <Text style={{ fontSize: 18, color: themeColors.txt3 }}>⋮</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Post Content */}
      <View style={s.contentArea}>
        <Text style={[s.title, { color: themeColors.txt }]}>{post.title}</Text>
        {!!post.body && <Text style={[s.body, { color: themeColors.txt2 }]}>{post.body}</Text>}
      </View>

      {/* Media */}
      {hasImage && (
        <View style={[s.mediaWrap, { backgroundColor: themeColors.bg === '#000000' ? '#111' : '#f5f5f5' }]}>
          <Image source={{ uri: post.image }} style={s.mediaImg} resizeMode="contain" />
        </View>
      )}

      {/* Poll */}
      {post.isPoll && post.pollOptions && (
        <View style={s.pollWrap}>
          {post.pollOptions.map((opt, i) => {
            const totalVotes = post.pollOptions?.reduce((a, b) => a + b.votes, 0) || 0;
            const percent = totalVotes === 0 ? 0 : Math.round((opt.votes / totalVotes) * 100);
            const isVoted = post.userVote === i;
            return (
              <TouchableOpacity 
                key={i} 
                style={[s.pollOpt, { backgroundColor: themeColors.card2, borderColor: isVoted ? themeColors.ogi : themeColors.bdr }]}
                onPress={() => handlePollVote(i)}
                disabled={post.userVote !== null}
              >
                <View style={[s.pollProgress, { width: `${percent}%`, backgroundColor: isVoted ? themeColors.ogi + '20' : themeColors.bdr + '20' }]} />
                <Text style={[s.pollOptTxt, { color: themeColors.txt }]}>{opt.text}</Text>
                {post.userVote !== null && <Text style={[s.pollPercent, { color: themeColors.txt3 }]}>{percent}%</Text>}
              </TouchableOpacity>
            );
          })}
        </View>
      )}

      {/* Event Details */}
      {(hasEventDate || isBhandara) && (
        <View style={[s.eventPill, { backgroundColor: themeColors.card2 }]}>
          <Text style={s.eventIcon}>{isBhandara ? '🍛' : '📅'}</Text>
          <View style={{ flex: 1 }}>
            <Text style={[s.eventDate, { color: themeColors.txt }]}>
              {isBhandara ? 'Bhandara happening now?' : formattedEventDate}
            </Text>
            <Text style={[s.eventLoc, { color: themeColors.txt3 }]}>{post.eventLocation || 'Campus'}</Text>
          </View>
          {isBhandara ? (
            <View style={{ flexDirection: 'row', gap: 6 }}>
              <TouchableOpacity style={s.vBtn} onPress={() => handleBhandaraVote('yes')}><Text style={s.vBtnTxt}>👍</Text></TouchableOpacity>
              <TouchableOpacity style={s.vBtn} onPress={() => handleBhandaraVote('no')}><Text style={s.vBtnTxt}>👎</Text></TouchableOpacity>
            </View>
          ) : (
            <TouchableOpacity style={s.remindBtn} onPress={handleSetReminder} disabled={reminderSet}>
              <Text style={[s.remindTxt, { color: reminderSet ? themeColors.ogi : themeColors.txt2 }]}>
                {reminderSet ? 'Set ✅' : 'Remind'}
              </Text>
            </TouchableOpacity>
          )}
        </View>
      )}

      {/* Post Footer */}
      <View style={[s.footer, { borderTopColor: themeColors.bdr }]}>
        <View style={s.footerLeft}>
          <TouchableOpacity style={s.actionBtn} onPress={handleVote} activeOpacity={0.7}>
            <Text style={[s.actionIcon, votedLocal && { color: themeColors.ogi }]}>🥔</Text>
            <Text style={[s.actionCount, { color: votedLocal ? themeColors.ogi : themeColors.txt2 }]}>
              {post.upvotes + (votedLocal ? 1 : 0)}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity style={s.actionBtn} onPress={() => openCommentSheet(post._id)}>
            <Text style={s.actionIcon}>💬</Text>
            <Text style={[s.actionCount, { color: themeColors.txt2 }]}>{post.commentCount}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={s.actionBtn}>
            <Text style={s.actionIcon}>📤</Text>
            <Text style={[s.actionCount, { color: themeColors.txt2 }]}>Share</Text>
          </TouchableOpacity>
          <TouchableOpacity style={s.actionBtn} onPress={() => openReportSheet(post._id)}>
            <Text style={s.actionIcon}>⚑</Text>
            <Text style={[s.actionCount, { color: themeColors.txt3 }]}>Report</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  card: { borderRadius: 28, marginBottom: 16, overflow: 'hidden', borderWidth: 1 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, paddingBottom: 8 },
  authorRow: { flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 },
  avatarWrap: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  avatarEmoji: { fontSize: 24 },
  authorName: { fontSize: 15, fontWeight: '700', fontFamily: 'PlusJakartaSans_700Bold' },
  authorHandle: { fontSize: 11, marginTop: 1 },
  headerRight: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  statusPill: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  statusTxt: { fontSize: 10, fontWeight: '800', textTransform: 'uppercase' },
  moreBtn: { padding: 4 },
  contentArea: { paddingHorizontal: 16, paddingVertical: 8 },
  title: { fontSize: 17, fontWeight: '600', lineHeight: 24, fontFamily: 'PlusJakartaSans_600SemiBold' },
  body: { fontSize: 14, marginTop: 6, lineHeight: 20 },
  mediaWrap: { width: '100%', height: 320, marginTop: 8 },
  mediaImg: { width: '100%', height: '100%' },
  pollWrap: { paddingHorizontal: 16, gap: 8, marginTop: 12 },
  pollOpt: { height: 44, borderRadius: 14, borderWidth: 1, paddingHorizontal: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', overflow: 'hidden', position: 'relative' },
  pollOptTxt: { fontSize: 14, fontWeight: '600', zIndex: 1 },
  pollProgress: { position: 'absolute', left: 0, top: 0, bottom: 0 },
  pollPercent: { fontSize: 12, fontWeight: '800', zIndex: 1 },
  eventPill: { flexDirection: 'row', alignItems: 'center', gap: 12, marginHorizontal: 16, marginTop: 12, padding: 12, borderRadius: 16 },
  eventIcon: { fontSize: 20 },
  eventDate: { fontSize: 13, fontWeight: '700' },
  eventLoc: { fontSize: 11 },
  remindBtn: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 10 },
  remindTxt: { fontSize: 12, fontWeight: '700' },
  vBtn: { width: 32, height: 32, borderRadius: 16, backgroundColor: 'rgba(255,255,255,0.05)', alignItems: 'center', justifyContent: 'center' },
  vBtnTxt: { fontSize: 14 },
  footer: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 12, borderTopWidth: 0.5, marginTop: 8 },
  footerLeft: { flexDirection: 'row', gap: 16, alignItems: 'center' },
  actionBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 8, paddingVertical: 4 },
  actionIcon: { fontSize: 18 },
  actionCount: { fontSize: 13, fontWeight: '600' },
  reportBtn: { padding: 4 },
  confCard: { borderRadius: 20, padding: 24, marginBottom: 16, borderWidth: 1, backgroundColor: '#0A0A0A', alignItems: 'center' },
  confText: { fontSize: 16, lineHeight: 24, marginBottom: 20, fontFamily: 'PlusJakartaSans_500Medium', textAlign: 'center' },
  confRxns: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, justifyContent: 'center' },
  confBtn: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 12, borderWidth: 1 },
  confBtnTxt: { fontSize: 12, fontWeight: '800' },
});