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
  const { mutate: voteBhandara } = useVoteBhandara();
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
    const res = await voteBhandara({ id: post._id, vote: v });
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
      isSelf: post.author === user?._id
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
      {hasImage ? (
        /* Immersive Photo Post Layout */
        <View style={{ backgroundColor: themeColors.card2 }}>
          <Image source={{ uri: post.image }} style={s.pimg} resizeMode="contain" />
          <View style={s.imgOverlay}>
            <View style={s.pmeta}>
              <View style={s.metaLeft}>
                <View style={[s.pclg, { backgroundColor: campus.bg, borderColor: campus.bdr }]}>
                  <Text style={[s.pclgTxt, { color: campus.color }]}>{campus.label}</Text>
                </View>
                <View style={[s.typePill, { backgroundColor: 'rgba(255,255,255,0.2)', borderColor: 'rgba(255,255,255,0.4)' }]}>
                  <Text style={[s.typeTxt, { color: '#FFF' }]}>
                    {POST_TYPES.find(p => p.value === post.type)?.label || 'Post'}
                  </Text>
                </View>
                {vibeEntry && (
                  <View style={[s.vibePill, { backgroundColor: vibeEntry.bg }]}>
                    <Text style={[s.vibeTxt, { color: vibeEntry.color }]}>{vibeEntry.label}</Text>
                  </View>
                )}
                {post.burnAfter24h && (
                  <View style={[s.burnPill, { backgroundColor: '#FF450020', borderColor: '#FF450040' }]}>
                    <Text style={s.burnTxt}>🔥 24h</Text>
                  </View>
                )}
              </View>
              <Text style={[s.ptime, { color: '#FFF' }]}>{formatDistanceToNow(post.createdAt)}{distanceText}</Text>
              {(post.author === user?._id || user?.role === 'admin') && (
                <TouchableOpacity onPress={handleDeletePost} style={{ marginLeft: 10 }}>
                  <Text style={{ fontSize: 18, color: '#FFF' }}>⋮</Text>
                </TouchableOpacity>
              )}
            </View>

            <TouchableOpacity style={s.panon} onPress={handleAuthorPress} activeOpacity={0.7}>
              <Text style={s.avatarEmoji}>{post.anonAvatar || '👤'}</Text>
              <Text style={[s.pname, { color: '#FFF' }]}>{post.anonName}</Text>
            </TouchableOpacity>

            <View style={s.titleRow}>
              <Text style={[s.ptitle, { color: '#FFF' }]}>{post.title}</Text>
              <TouchableOpacity
                style={[s.patatoBtn, votedLocal && { backgroundColor: themeColors.ogibg }]}
                onPress={handleVote}
                activeOpacity={0.7}
              >
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 2 }}>
                  <Text style={[s.patatoArrow, { color: votedLocal ? themeColors.ogi : themeColors.txt3 }]}>▲</Text>
                  <Text style={s.patatoEmoji}>🥔</Text>
                </View>
                <Text style={[s.patatoCount, { color: votedLocal ? themeColors.ogi : themeColors.txt3 }]}>
                  {post.upvotes}
                </Text>
              </TouchableOpacity>
            </View>
            {!!post.body && <Text style={[s.pbody, { color: 'rgba(255,255,255,0.8)' }]}>{post.body}</Text>}
            
            {/* Poll in Photo Post */}
            {post.isPoll && post.pollOptions && (
              <View style={s.pollContainer}>
                {post.pollOptions.map((opt, i) => {
                  const totalVotes = post.pollOptions?.reduce((a, b) => a + b.votes, 0) || 1;
                  const percent = Math.round((opt.votes / totalVotes) * 100);
                  const isVoted = post.userVote === i;
                  
                  return (
                    <TouchableOpacity 
                      key={i} 
                      style={[s.pollOpt, { backgroundColor: 'rgba(255,255,255,0.1)', borderColor: isVoted ? '#FFF' : 'rgba(255,255,255,0.2)' }]}
                      onPress={() => handlePollVote(i)}
                      disabled={post.userVote !== null}
                    >
                      <View style={[s.pollProgress, { width: `${percent}%`, backgroundColor: isVoted ? 'rgba(255,255,255,0.3)' : 'rgba(255,255,255,0.1)' }]} />
                      <Text style={[s.pollOptTxt, { color: '#FFF' }]}>{opt.text}</Text>
                      {post.userVote !== null && <Text style={[s.pollPercent, { color: '#FFF' }]}>{percent}%</Text>}
                    </TouchableOpacity>
                  );
                })}
              </View>
            )}
          </View>
        </View>
      ) : (
        /* Regular Text Post Layout */
        <>
          <View style={s.pmeta}>
            <View style={s.metaLeft}>
              <View style={[s.pclg, { backgroundColor: campus.bg, borderColor: campus.bdr }]}>
                <Text style={[s.pclgTxt, { color: campus.color }]}>{campus.label}</Text>
              </View>
              <View style={[s.typePill, { backgroundColor: themeColors.card2, borderColor: themeColors.bdr }]}>
                <Text style={[s.typeTxt, { color: themeColors.txt3 }]}>
                  {POST_TYPES.find(p => p.value === post.type)?.label || 'Post'}
                </Text>
              </View>
              {vibeEntry && (
                <View style={[s.vibePill, { backgroundColor: vibeEntry.bg }]}>
                  <Text style={[s.vibeTxt, { color: vibeEntry.color }]}>{vibeEntry.label}</Text>
                </View>
              )}
              {post.burnAfter24h && (
                <View style={[s.burnPill, { backgroundColor: '#FF450010', borderColor: '#FF450030' }]}>
                  <Text style={[s.burnTxt, { color: '#FF4500' }]}>🔥 24h</Text>
                </View>
              )}
            </View>
            <Text style={[s.ptime, { color: themeColors.txt3 }]}>{formatDistanceToNow(post.createdAt)}{distanceText}</Text>
            {(post.author === user?._id || user?.role === 'admin') && (
              <TouchableOpacity onPress={handleDeletePost} style={{ marginLeft: 10 }}>
                <Text style={{ fontSize: 18, color: themeColors.txt3 }}>⋮</Text>
              </TouchableOpacity>
            )}
          </View>

          {hasEventDate && (
            <View style={[s.eventHeader, { backgroundColor: themeColors.bg2 }]}>
              <Text style={s.eventEmoji}>{isBhandara ? '🍛' : '📅'}</Text>
              <View style={{ flex: 1 }}>
                <Text style={[s.eventDate, { color: themeColors.txt }]}>{formattedEventDate}</Text>
                <Text style={[s.eventLoc, { color: themeColors.txt3 }]}>{post.eventLocation || 'Campus'}</Text>
              </View>
              <TouchableOpacity style={[s.remindBtn, reminderSet && { backgroundColor: themeColors.ogi + '20' }]} onPress={handleSetReminder} disabled={reminderSet}>
                <Text style={[s.remindTxt, reminderSet && { color: themeColors.ogi }]}>{reminderSet ? 'Set ✅' : 'Remind'}</Text>
              </TouchableOpacity>
            </View>
          )}

          {isBhandara && (
            <View style={[s.eventHeader, { backgroundColor: themeColors.ogi + '10', borderColor: themeColors.ogi + '30', borderWidth: 1, marginHorizontal: 16, borderRadius: 16, marginTop: 8 }]}>
              <Text style={s.eventEmoji}>🍛</Text>
              <View style={{ flex: 1 }}>
                <Text style={[s.eventDate, { color: themeColors.txt, fontSize: 14 }]}>Is it happening now?</Text>
                <Text style={[s.eventLoc, { color: themeColors.txt3, fontSize: 12 }]}>
                  {bhandaraYesCount} approved this info
                </Text>
              </View>
              <View style={{ flexDirection: 'row', gap: 8 }}>
                <TouchableOpacity 
                  style={[s.voteBtn, { backgroundColor: themeColors.card2 }]} 
                  onPress={() => handleBhandaraVote('yes')}
                >
                  <Text style={{ color: themeColors.txt, fontSize: 12, fontWeight: '700' }}>Yes 👍</Text>
                </TouchableOpacity>
                <TouchableOpacity 
                  style={[s.voteBtn, { backgroundColor: themeColors.card2 }]} 
                  onPress={() => handleBhandaraVote('no')}
                >
                  <Text style={{ color: themeColors.txt, fontSize: 12, fontWeight: '700' }}>No 👎</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}

          <TouchableOpacity style={s.panon} onPress={handleAuthorPress} activeOpacity={0.7}>
            {isConfession ? (
              <Text style={[s.pname, { color: themeColors.txt2, fontStyle: 'italic' }]}>🕳️ Confession</Text>
            ) : (
              <>
                <Text style={s.avatarEmoji}>{post.anonAvatar || '👤'}</Text>
                <Text style={[s.pname, { color: themeColors.txt2 }]}>{post.anonName}</Text>
              </>
            )}
          </TouchableOpacity>

          <View style={[s.titleRow, { paddingHorizontal: 16 }]}>
            <Text style={[s.ptitleInline, { color: themeColors.txt }, (isEvent || isBhandara) && s.eventTitle]}>{post.title}</Text>
            <TouchableOpacity
              style={[s.patatoBtn, votedLocal && { backgroundColor: themeColors.ogibg }]}
              onPress={handleVote}
              activeOpacity={0.7}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 2 }}>
                <Text style={[s.patatoArrow, { color: votedLocal ? themeColors.ogi : themeColors.txt3 }]}>▲</Text>
                <Text style={s.patatoEmoji}>🥔</Text>
              </View>
              <Text style={[s.patatoCount, { color: votedLocal ? themeColors.ogi : themeColors.txt3 }]}>
                {post.upvotes + (votedLocal ? 1 : 0)}
              </Text>
            </TouchableOpacity>
          </View>
          {!!post.body && <Text style={[s.pbody, { color: themeColors.txt2 }]}>{post.body}</Text>}

          {/* Poll in Text Post */}
          {post.isPoll && post.pollOptions && (
            <View style={[s.pollContainer, { marginHorizontal: 16, marginBottom: 16 }]}>
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
        </>
      )}

      {/* Common Footer */}
      <View style={[s.pact, { borderTopColor: themeColors.bdr }]}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={s.rxnBarInFooter} contentContainerStyle={{ alignItems: 'center', gap: 8, paddingHorizontal: 12 }}>
          <TouchableOpacity style={s.abtn} onPress={() => openCommentSheet(post._id)}>
            <Text style={[s.abtnTxt, { color: themeColors.txt3 }]}>💬 {post.commentCount}</Text>
          </TouchableOpacity>
          {reactionList.map((r) => (
            <TouchableOpacity key={r.key} style={[s.rxn, { borderColor: themeColors.bdr, backgroundColor: themeColors.card2 }]} onPress={() => handleReact(r.key)}>
              <Text style={[s.rxnTxt, { color: themeColors.txt }]}>{r.icon} {reactions[r.key] || 0}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
        <TouchableOpacity style={[s.abtn, s.abtnReport]} onPress={() => openReportSheet(post._id)}>
          <Text style={[s.abtnTxt, { color: themeColors.txt3 }]}>⚑ Report</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  card: { borderWidth: 1, borderRadius: 24, padding: 0, marginBottom: 16, overflow: 'hidden', elevation: 3 },
  confCard: { borderWidth: 1, borderRadius: 24, padding: 24, marginBottom: 16, alignItems: 'center' },
  confText: { fontSize: 18, fontFamily: 'Syne_700Bold', textAlign: 'center', marginBottom: 20 },
  confRxns: { flexDirection: 'row', gap: 10 },
  confBtn: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 20, borderWidth: 1 },
  confBtnTxt: { fontSize: 12, fontWeight: '700' },
  pimg: { width: '100%', height: 450, backgroundColor: 'rgba(0,0,0,0.03)' },
  imgOverlay: { position: 'absolute', bottom: 0, left: 0, right: 0, padding: 20, backgroundColor: 'rgba(0,0,0,0.5)', borderBottomLeftRadius: 0, borderBottomRightRadius: 0 },
  pmeta: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, paddingBottom: 8 },
  metaLeft: { flexDirection: 'row', gap: 8 },
  pclg: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6, borderWidth: 1 },
  pclgTxt: { fontSize: 10, fontWeight: '800' },
  vibePill: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6 },
  vibeTxt: { fontSize: 10, fontWeight: '700' },
  typePill: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6, borderWidth: 1 },
  typeTxt: { fontSize: 10, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5 },
  burnPill: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6, borderWidth: 1, flexDirection: 'row', alignItems: 'center' },
  burnTxt: { fontSize: 9, fontWeight: '900', color: '#FFF' },
  ptime: { fontSize: 11 },
  panon: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 16, marginBottom: 8 },
  avatarEmoji: { fontSize: 20 },
  pname: { fontSize: 13, fontWeight: '700' },
  titleRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 },
  ptitle: { fontSize: 20, fontFamily: 'Syne_700Bold', flex: 1, lineHeight: 26 },
  ptitleInline: { fontSize: 18, fontFamily: 'Syne_700Bold', flex: 1, lineHeight: 24 },
  pbody: { fontSize: 14, paddingHorizontal: 16, marginTop: 8, marginBottom: 16, lineHeight: 20 },
  patatoBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16, backgroundColor: 'rgba(0,0,0,0.05)' },
  patatoArrow: { fontSize: 12 },
  patatoEmoji: { fontSize: 16 },
  patatoCount: { fontSize: 14, fontWeight: '800' },
  pact: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, borderTopWidth: 1 },
  rxnBarInFooter: { flex: 1 },
  abtn: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, gap: 4 },
  abtnTxt: { fontSize: 12, fontWeight: '700' },
  abtnReport: { opacity: 0.6 },
  rxn: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 12, borderWidth: 1 },
  rxnTxt: { fontSize: 11, fontWeight: '700' },
  eventHeader: { flexDirection: 'row', alignItems: 'center', padding: 12, borderRadius: 16, marginHorizontal: 16, marginBottom: 12, gap: 12 },
  eventEmoji: { fontSize: 24 },
  eventDate: { fontSize: 13, fontWeight: '700' },
  eventLoc: { fontSize: 12 },
  eventTitle: { fontSize: 16 },
  remindBtn: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 10, backgroundColor: 'rgba(0,0,0,0.05)' },
  remindTxt: { fontSize: 12, fontWeight: '800' },
  voteBtn: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8, borderWidth: 1, borderColor: 'rgba(0,0,0,0.1)' },
  pollContainer: { gap: 10, marginTop: 12 },
  pollOpt: { height: 44, borderRadius: 12, borderWidth: 1, paddingHorizontal: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', overflow: 'hidden', position: 'relative' },
  pollOptTxt: { fontSize: 14, fontWeight: '600', zIndex: 1 },
  pollProgress: { position: 'absolute', left: 0, top: 0, bottom: 0, borderRadius: 10 },
  pollPercent: { fontSize: 12, fontWeight: '800', zIndex: 1 },
});