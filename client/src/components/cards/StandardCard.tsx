import React, { useState, useRef } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Share, Animated } from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { Post } from '../../types';
import { POST_TYPES } from '../../constants';
import { getColors } from '../../theme/colors';
import { useVote, useVotePoll, useSavePost } from '../../hooks/usePosts';
import { useUIStore } from '../../store/uiStore';
import { useAuthStore } from '../../store/authStore';
import { formatDistanceToNow } from '../../utils/time';
import { getDistance, formatDistance } from '../../utils/geo';
import { triggerHaptic } from '../../utils/haptics';
import { getOptimizedCloudinaryUrl } from '../../utils/cloudinary';

interface Props {
  post: Post;
  isAllTab?: boolean;
  userLocation?: { latitude: number; longitude: number } | null;
  onDelete?: () => void;
  onReport?: () => void;
}

const StandardCard = React.memo(({ post, isAllTab, userLocation, onDelete, onReport }: Props) => {
  const { mutate: vote } = useVote();
  const { mutate: votePoll } = useVotePoll();
  const { mutate: toggleSave } = useSavePost();
  const isDark = useUIStore(s => s.isDark);
  const openCommentSheet = useUIStore(s => s.openCommentSheet);
  const openAuthorProfile = useUIStore(s => s.openAuthorProfile);
  const { user } = useAuthStore();
  const themeColors = getColors(isDark);

  const authorId = typeof post.author === 'string' ? post.author : post.author?._id?.toString();
  const isAuthor = !!(user?._id && authorId && authorId === user._id.toString());
  const isStaff = ['admin', 'moderator', 'super-admin'].includes(user?.role || '');
  const canDelete = isAuthor || isStaff;
  const canReport = !isAuthor;

  const [votedLocal, setVotedLocal] = useState(post.hasVoted ?? false);
  const initialVoted = post.hasVoted ?? false; // used for delta calculation only
  const isSavedFromServer = post.isSaved || user?.savedPosts?.some(id => id === post._id || (typeof id === 'object' && (id as any)._id === post._id));
  const [isSavedLocal, setIsSavedLocal] = useState(isSavedFromServer);

  // Poll local vote state — updates instantly on tap without waiting for server refetch
  const [userVoteLocal, setUserVoteLocal] = useState<number | null | undefined>(post.userVote);

  // Potato animation
  const potatoScale = useRef(new Animated.Value(post.hasVoted ? 1.35 : 1.0)).current;

  // Sync when server data updates
  React.useEffect(() => {
    setIsSavedLocal(isSavedFromServer);
  }, [isSavedFromServer]);

  const handleVote = () => {
    triggerHaptic('selection');
    const newVoted = !votedLocal;
    setVotedLocal(newVoted);
    // Spring animation — pop up on vote, shrink back on unvote
    Animated.spring(potatoScale, {
      toValue: newVoted ? 1.5 : 1.0,
      useNativeDriver: true,
      speed: 40,
      bounciness: 18,
    }).start();
    vote(post._id);
  };

  const handleSave = () => {
    triggerHaptic('selection');
    setVotedLocal(v => v); // dummy
    setIsSavedLocal(v => !v);
    toggleSave(post._id, {
      onError: () => setIsSavedLocal(v => !v)
    });
  };

  const handlePollVote = (index: number) => {
    // Already voted — ignore
    if (userVoteLocal !== null && userVoteLocal !== undefined) return;
    triggerHaptic('impact');
    // Optimistic update: show selection immediately
    setUserVoteLocal(index);
    votePoll({ id: post._id, optionIndex: index });
  };

  const handleShare = async () => {
    triggerHaptic('impact');
    try {
      await Share.share({
        message: `Check out this post on Loona: loona://post/${post._id}\n\n"${post.title}"`,
      });
    } catch (error) {
      console.error(error);
    }
  };

  const handleAuthorPress = () => {
    // Disable profile press for confessions to preserve anonymity
    if (post.type === 'confess') return;

    // Robustly extract userId: post.author might be an object, a string (ID), or missing
    const authorId = post.author?._id || (typeof post.author === 'string' ? post.author : null);
    
    // Fallback for "My Posts" view where author might be hidden by server
    const finalUserId = authorId;

    if (!finalUserId) return;

    openAuthorProfile({
      userId: finalUserId,
      postId: post._id,
      anonName: post.anonName,
      anonAvatar: post.anonAvatar || '👤',
      isSelf: finalUserId === user?._id,
      postCampus: post.campus,
      bio: post.author?.bio,
      isVerified: post.author?.isVerified,
      isPremium: post.author?.isPremium,
      badges: post.author?.badges,
      isConfession: false
    });
  };

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

  return (
    <View style={[s.card, { backgroundColor: themeColors.card, borderColor: themeColors.bdr }]}>
      {isAllTab && (
        <View style={[s.sectionTag, { backgroundColor: themeColors.card2 }]}>
          <Text style={[s.sectionTagTxt, { color: themeColors.txt3 }]}>
            {(POST_TYPES.find(t => t.value === post.type)?.icon || '💬') + ' ' + (POST_TYPES.find(t => t.value === post.type)?.label || 'Thought')}
          </Text>
        </View>
      )}

      <View style={s.cardHeader}>
        <TouchableOpacity 
          style={s.authorRow} 
          onPress={handleAuthorPress} 
          disabled={post.type === 'confess'}
          activeOpacity={post.type === 'confess' ? 1 : 0.7}
          accessibilityRole="button"
          accessibilityLabel={post.type === 'confess' ? "Anonymous Confession" : `View ${post.anonName}'s profile`}
        >
          <View style={[s.avatarWrap, { backgroundColor: themeColors.card2 }]}>
            <Text style={s.avatarEmoji}>
              {post.type === 'confess' ? '🕳️' : (post.author?.avatar || post.anonAvatar || '👤')}
            </Text>
          </View>
          <View style={{ flex: 1 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
              <Text style={[s.authorName, { color: themeColors.txt }]}>
                {post.type === 'confess' ? 'Confession' : post.anonName}
              </Text>
              {post.author?.isTopContributor && (
                <View style={{ backgroundColor: '#FFD70020', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 10 }}>
                  <Text style={{ fontSize: 10, color: '#FFD700', fontWeight: '800' }}>🌟 Top</Text>
                </View>
              )}
              {post.author?.isVerified && (
                <Ionicons name="checkmark-circle" size={16} color="#3897f0" />
              )}
              {post.author?.isPremium && (
                <View style={[s.proPill, { backgroundColor: '#c8f53a' }]}>
                  <Text style={s.proTxt}>PRO</Text>
                </View>
              )}
            </View>
            <Text style={s.authorHandle} numberOfLines={1}>
              {post.campus?.toUpperCase()} · {formatDistanceToNow(post.createdAt)}
            </Text>
          </View>
        </TouchableOpacity>
        
        <View style={s.headerRight}>
          {post.isHot && (
            <View style={[s.statusPill, { backgroundColor: '#FF6B3520' }]}>
              <Text style={[s.statusTxt, { color: '#FF6B35' }]}>🔥 Hot</Text>
            </View>
          )}
          {(post.type === 'events' || post.type === 'bhandara') && (
            <View style={[s.statusPill, { backgroundColor: '#3B82F620' }]}>
              <Text style={[s.statusTxt, { color: '#3B82F6' }]}>🎉 Event</Text>
            </View>
          )}
          {canReport && (
            <TouchableOpacity 
              onPress={onReport} 
              style={s.moreBtn}
              accessibilityRole="button"
              accessibilityLabel="Report this post"
            >
              <Text style={{ fontSize: 16 }}>🚩</Text>
            </TouchableOpacity>
          )}
          {canDelete && (
            <TouchableOpacity 
              onPress={onDelete} 
              style={s.moreBtn}
              accessibilityRole="button"
              accessibilityLabel="Delete this post"
            >
              <Text style={{ fontSize: 18, color: themeColors.txt3 }}>⋮</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      {!!post.image && (
        <View style={s.mediaContainer}>
          <Image 
            source={{ uri: getOptimizedCloudinaryUrl(post.image, 800) }} 
            style={[s.mediaImg, { backgroundColor: '#111' }]} 
            contentFit="cover"
            accessibilityLabel="Attached post image"
          />
        </View>
      )}

      <View style={s.contentArea}>
        <Text style={[s.textBody, { color: themeColors.txt }]}>
          {post.title}
          {!!post.body && `\n\n${post.body}`}
        </Text>
        {(post.type === 'events' || post.type === 'bhandara') && (post.eventDate || post.eventLocation) && (
          <View style={{ marginTop: 12, padding: 12, backgroundColor: themeColors.card2, borderRadius: 12, gap: 6 }}>
            {!!post.eventDate && <Text style={{ color: '#3B82F6', fontSize: 13, fontWeight: '700' }}>📅 {new Date(post.eventDate).toLocaleDateString()} at {new Date(post.eventDate).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</Text>}
            {!!post.eventLocation && <Text style={{ color: themeColors.txt2, fontSize: 13, fontWeight: '500' }}>📍 {post.eventLocation}</Text>}
          </View>
        )}
      </View>

      {post.isPoll && post.pollOptions && (
        <View style={s.pollWrap}>
          {post.pollOptions.map((opt, i) => {
            const hasVotedLocal = userVoteLocal !== null && userVoteLocal !== undefined;
            const isSelected = userVoteLocal === i;
            // After voting: show percentage bar. Before voting: show plain options
            const totalVotes = post.pollOptions?.reduce((a, b) => a + b.votes, 0) || 0;
            // Add 1 to the selected option's votes for local display accuracy
            const adjustedVotes = isSelected ? opt.votes + 1 : opt.votes;
            const adjustedTotal = hasVotedLocal ? totalVotes + (userVoteLocal === i || post.userVote === userVoteLocal ? 0 : 1) : totalVotes;
            const percent = (hasVotedLocal && adjustedTotal > 0)
              ? Math.round((adjustedVotes / (adjustedTotal + (post.userVote === null || post.userVote === undefined ? 1 : 0))) * 100)
              : 0;
            return (
              <TouchableOpacity
                key={i}
                style={[
                  s.pollOpt,
                  {
                    backgroundColor: isSelected
                      ? themeColors.ogi + '12'
                      : themeColors.card2,
                    borderColor: isSelected ? themeColors.ogi : themeColors.bdr,
                    borderWidth: isSelected ? 1.5 : 1,
                  },
                ]}
                onPress={() => handlePollVote(i)}
                disabled={hasVotedLocal}
                activeOpacity={hasVotedLocal ? 1 : 0.7}
                accessibilityRole="button"
                accessibilityLabel={`Vote for ${opt.text}. ${percent}% votes so far.`}
              >
                {/* Progress fill — only after voting */}
                {hasVotedLocal && (
                  <View
                    style={[
                      s.pollProgress,
                      {
                        width: `${percent}%`,
                        backgroundColor: isSelected
                          ? themeColors.ogi + '25'
                          : themeColors.bdr + '15',
                      },
                    ]}
                  />
                )}
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flex: 1, zIndex: 1 }}>
                  {/* Checkmark on selected */}
                  {isSelected && (
                    <View style={[s.pollCheck, { backgroundColor: themeColors.ogi }]}>
                      <Text style={{ fontSize: 8, color: '#fff', fontWeight: '900' }}>✓</Text>
                    </View>
                  )}
                  <Text style={[
                    s.pollOptTxt,
                    { color: isSelected ? themeColors.ogi : themeColors.txt, fontWeight: isSelected ? '700' : '500' },
                  ]}>
                    {opt.text}
                  </Text>
                </View>
                {/* Percentage shown after voting */}
                {hasVotedLocal && (
                  <Text style={[s.pollPercent, { color: isSelected ? themeColors.ogi : themeColors.txt3, zIndex: 1 }]}>
                    {percent}%
                  </Text>
                )}
              </TouchableOpacity>
            );
          })}
          {/* Total votes count */}
          {(userVoteLocal !== null && userVoteLocal !== undefined) && (
            <Text style={{ color: themeColors.txt3, fontSize: 11, marginTop: 4, marginLeft: 2 }}>
              {(post.pollOptions.reduce((a, b) => a + b.votes, 0) + (post.userVote === null || post.userVote === undefined ? 1 : 0)).toLocaleString()} votes
            </Text>
          )}
        </View>
      )}

      <View style={s.footer}>
        <View style={s.footerLeft}>
          <TouchableOpacity 
            style={s.actionBtn} 
            onPress={handleVote} 
            activeOpacity={0.7}
          >
            <Animated.Text style={[s.actionIcon, { transform: [{ scale: potatoScale }] }]}>🥔</Animated.Text>
            <Text style={[s.actionCount, { color: votedLocal ? themeColors.ogi : themeColors.txt3 }]}>
              {post.upvotes + (votedLocal === initialVoted ? 0 : votedLocal ? 1 : -1)}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={s.actionBtn} 
            onPress={() => openCommentSheet(post._id)}
          >
            <Ionicons name="chatbubble-outline" size={18} color={themeColors.txt3} />
            <Text style={[s.actionCount, { color: themeColors.txt3 }]}>{post.commentCount ?? 0}</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={s.actionBtn}
            onPress={handleSave}
          >
            <Ionicons name={isSavedLocal ? "bookmark" : "bookmark-outline"} size={18} color={isSavedLocal ? themeColors.ogi : themeColors.txt3} />
            <Text style={[s.actionCount, { color: themeColors.txt3 }]}>{isSavedLocal ? 'Saved' : 'Save'}</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={s.actionBtn}
            onPress={handleShare}
          >
            <Ionicons name="share-social-outline" size={18} color={themeColors.txt3} />
            <Text style={[s.actionCount, { color: themeColors.txt3 }]}>Share</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
});

export default StandardCard;

const s = StyleSheet.create({
  card: { borderRadius: 28, marginBottom: 16, overflow: 'hidden', borderWidth: 1, paddingVertical: 4 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12 },
  authorRow: { flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 },
  avatarWrap: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  avatarEmoji: { fontSize: 24 },
  authorName: { fontSize: 14, fontWeight: '600', fontFamily: 'PlusJakartaSans_600SemiBold' },
  authorHandle: { fontSize: 12, fontFamily: 'PlusJakartaSans_400Regular', marginTop: 1, color: '#666' },
  headerRight: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  statusPill: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 20 },
  statusTxt: { fontSize: 11, fontWeight: '800' },
  moreBtn: { padding: 4 },
  contentArea: { paddingHorizontal: 16, paddingVertical: 8 },
  textBody: { fontSize: 15, lineHeight: 22.5, fontFamily: 'PlusJakartaSans_400Regular' },
  mediaContainer: { marginHorizontal: 16, height: 300, borderRadius: 20, overflow: 'hidden', marginTop: 8 },
  mediaImg: { width: '100%', height: '100%' },
  pollWrap: { paddingHorizontal: 16, gap: 8, marginTop: 12 },
  pollOpt: { height: 48, borderRadius: 16, borderWidth: 1, paddingHorizontal: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', overflow: 'hidden', position: 'relative' },
  pollOptTxt: { fontSize: 14, fontWeight: '600', zIndex: 1 },
  pollProgress: { position: 'absolute', left: 0, top: 0, bottom: 0 },
  pollPercent: { fontSize: 12, fontWeight: '800', zIndex: 1 },
  pollCheck: { width: 16, height: 16, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  footer: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, marginTop: 4 },
  footerLeft: { flexDirection: 'row', gap: 24, alignItems: 'center' },
  actionBtn: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  actionIcon: { fontSize: 20 },
  actionCount: { fontSize: 13, fontWeight: '400', fontFamily: 'PlusJakartaSans_400Regular' },
  sectionTag: { paddingHorizontal: 12, paddingVertical: 4, alignSelf: 'flex-start' },
  sectionTagTxt: { fontSize: 10, fontWeight: '700', fontFamily: 'PlusJakartaSans_700Bold', textTransform: 'uppercase', letterSpacing: 0.08 },
  tagsList: { flexDirection: 'row', flexWrap: 'wrap', gap: 4, marginVertical: 2 },
  tagPill: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
  tagTxt: { fontSize: 10, fontWeight: '700', fontFamily: 'PlusJakartaSans_700Bold', letterSpacing: 0.08 },
  proPill: { paddingHorizontal: 6, paddingVertical: 1, borderRadius: 4, marginLeft: 2 },
  proTxt: { fontSize: 9, fontWeight: '900', color: '#000' },
});
