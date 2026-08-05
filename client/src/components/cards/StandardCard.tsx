import React, { useState, useRef, useCallback, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Share, Animated, ScrollView, Dimensions, Easing, Modal, ActionSheetIOS, Platform, Alert as RNAlert } from 'react-native';
import { Image } from 'expo-image';
const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CARD_IMAGE_WIDTH = SCREEN_WIDTH - 32; // 16px margin each side

import { PinchGestureHandler, State } from 'react-native-gesture-handler';

const ZoomableImage = ({ children }: { children: React.ReactNode }) => {
  const scale = useRef(new Animated.Value(1)).current;

  const onPinchEvent = Animated.event(
    [{ nativeEvent: { scale } }],
    { useNativeDriver: true }
  );

  const onPinchStateChange = (event: any) => {
    if (event.nativeEvent.oldState === State.ACTIVE) {
      Animated.spring(scale, {
        toValue: 1,
        useNativeDriver: true,
        bounciness: 4,
      }).start();
    }
  };

  return (
    <PinchGestureHandler
      onGestureEvent={onPinchEvent}
      onHandlerStateChange={onPinchStateChange}
    >
      <Animated.View style={{ transform: [{ scale }], overflow: 'visible', zIndex: 999 }}>
        {children}
      </Animated.View>
    </PinchGestureHandler>
  );
};
import { Ionicons } from '@expo/vector-icons';
import { soundManager } from '../../services/musicService';
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
  // Separate local upvote count — avoids the brittle inline formula that caused flickers
  const [upvoteCountLocal, setUpvoteCountLocal] = useState(post.upvotes ?? 0);
  const isSavedFromServer = post.isSaved || user?.savedPosts?.some(id => id === post._id || (typeof id === 'object' && (id as any)._id === post._id));
  const [isSavedLocal, setIsSavedLocal] = useState(isSavedFromServer);

  // Poll local vote state — updates instantly on tap without waiting for server refetch
  const [userVoteLocal, setUserVoteLocal] = useState<number | null | undefined>(post.userVote);
  const [bhandaraCounts, setBhandaraCounts] = useState<{ yes: number; no: number }>({
    yes: post.bhandaraCountYes || 0,
    no: post.bhandaraCountNo || 0,
  });

  const [isPlayingAudio, setIsPlayingAudio] = useState(false);
  const [showReelModal, setShowReelModal] = useState(false);
  const [showMenuModal, setShowMenuModal] = useState(false);


  const [activeIndex, setActiveIndex] = useState(0);
  const [singleRatio, setSingleRatio] = useState(4/3);
  const [multiRatio, setMultiRatio] = useState(4/3);

  // ── In-flight lock — prevents rapid-tap glitch (duplicate votes / flicker) ──
  // Only one vote request allowed at a time. Additional taps are silently dropped
  // while a request is in-flight. Lock is cleared in onSettled (success OR error).
  const isVotingRef = useRef(false);

  // Potato animation — start at correct scale
  const potatoScale = useRef(new Animated.Value(post.hasVoted ? 1.35 : 1.0)).current;

  // Vinyl spinning animation for floating music sticker
  const vinylAnim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    if (post.songName) {
      const loop = Animated.loop(
        Animated.timing(vinylAnim, { toValue: 1, duration: 3000, easing: Easing.linear, useNativeDriver: true })
      );
      loop.start();
      return () => loop.stop();
    }
  }, [!!post.songName]);
  const vinylRotation = vinylAnim.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] });

  // Stop audio when card unmounts (e.g. user scrolls away)
  useEffect(() => {
    return () => {
      if (isPlayingAudio) {
        soundManager.stop();
      }
    };
  }, [isPlayingAudio]);

  // Sync when server data updates (after onSuccess patches cache)
  React.useEffect(() => {
    setIsSavedLocal(isSavedFromServer);
  }, [isSavedFromServer]);

  // Sync votedLocal when server confirms a vote state change.
  // IMPORTANT: We only sync on hasVoted changes, NOT upvotes changes.
  // Previously, listening on [post.hasVoted, post.upvotes] caused the auto-dislike
  // bug: any upvote count change (from other users, leaderboard socket events, etc.)
  // would trigger this effect and reset votedLocal to whatever post.hasVoted was
  // at that moment — which could be a stale cached value.
  React.useEffect(() => {
    // Only sync if we're not in the middle of a vote request
    if (!isVotingRef.current) {
      setVotedLocal(post.hasVoted ?? false);
      potatoScale.setValue(post.hasVoted ? 1.35 : 1.0);
    }
  }, [post.hasVoted]);

  // Sync upvote count from server separately — only when not voting
  React.useEffect(() => {
    if (!isVotingRef.current) {
      setUpvoteCountLocal(post.upvotes ?? 0);
    }
  }, [post.upvotes]);

  const handleVote = useCallback(() => {
    // Drop tap if a vote request is already in-flight (Instagram-style lock)
    if (isVotingRef.current) return;
    isVotingRef.current = true;

    triggerHaptic('selection');
    const newVoted = !votedLocal;
    const newCount = Math.max(0, upvoteCountLocal + (newVoted ? 1 : -1));
    // Optimistic local update — instant feedback
    setVotedLocal(newVoted);
    setUpvoteCountLocal(newCount);
    // Spring animation — pop up on vote, shrink back on unvote
    Animated.spring(potatoScale, {
      toValue: newVoted ? 1.5 : 1.0,
      useNativeDriver: true,
      speed: 40,
      bounciness: 18,
    }).start();
    vote(post._id, {
      onSettled: () => {
        // Always release the lock, whether success or error
        isVotingRef.current = false;
      },
    });
  }, [votedLocal, upvoteCountLocal, post._id, vote, potatoScale]);

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

  // ── Floating song sticker — overlays image (Instagram-style) ──
  const FloatingSongSticker = () => (
    <TouchableOpacity
      style={s.songStickerFloat}
      onPress={() => setShowReelModal(true)}
      activeOpacity={0.85}
    >
      {/* Spinning Vinyl Disc */}
      <Animated.View style={[s.vinylDisc, { transform: [{ rotate: vinylRotation }] }]}>
        {post.songCoverUrl ? (
          <Image source={{ uri: post.songCoverUrl }} style={{ width: '100%', height: '100%', borderRadius: 20 }} />
        ) : (
          <View style={{ width: '100%', height: '100%', alignItems: 'center', justifyContent: 'center' }}>
            <Ionicons name="musical-notes" size={10} color="#c8f53a" />
          </View>
        )}
        {/* Center dot */}
        <View style={s.vinylCenter} />
      </Animated.View>

      {/* Song info */}
      <View style={{ flex: 1, marginHorizontal: 8, overflow: 'hidden' }}>
        <Text style={s.floatSongName} numberOfLines={1}>{post.songName}</Text>
        {!!post.songArtist && <Text style={s.floatSongArtist} numberOfLines={1}>{post.songArtist}</Text>}
      </View>

      {/* Play/Pause button */}
      {!!post.songAudioUrl && (
        <TouchableOpacity
          style={s.floatPlayBtn}
          onPress={(e) => {
            e.stopPropagation();
            if (isPlayingAudio) { soundManager.stop(); setIsPlayingAudio(false); }
            else { setIsPlayingAudio(true); soundManager.play(post.songAudioUrl!, () => setIsPlayingAudio(false), post.songStartOffset || 0); }
          }}
        >
          <Ionicons name={isPlayingAudio ? 'pause' : 'play'} size={13} color="#FFF" />
        </TouchableOpacity>
      )}
    </TouchableOpacity>
  );

  return (
    <View style={[s.card, { backgroundColor: themeColors.card, borderColor: themeColors.bdr }]}>
      {isAllTab && (
        <View style={[s.sectionTag, { backgroundColor: themeColors.card2, flexDirection: 'row', alignItems: 'center', gap: 4, borderRadius: 8, paddingVertical: 4, paddingHorizontal: 8, marginLeft: 16, marginTop: 8 }]}>
          <Ionicons 
            name={(POST_TYPES.find(t => t.value === post.type)?.icon as any) || 'chatbubble-outline'} 
            size={11} 
            color={themeColors.txt3} 
          />
          <Text style={[s.sectionTagTxt, { color: themeColors.txt3, margin: 0 }]}>
            {POST_TYPES.find(t => t.value === post.type)?.label || 'Thought'}
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
              {post.author?.isTopContributor && post.type !== 'confess' && (
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
          {(canDelete || canReport) && (
            <TouchableOpacity
              onPress={() => setShowMenuModal(true)}
              style={s.moreBtn}
              accessibilityRole="button"
              accessibilityLabel="More options"
            >
              <Ionicons name="ellipsis-horizontal" size={20} color={themeColors.txt3} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {post.images && post.images.length > 1 ? (
        <View style={[s.multiMediaContainer, { position: 'relative', overflow: 'visible', zIndex: 1 }]}>
          <ScrollView
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            onScroll={(e) => {
              const slide = Math.round(e.nativeEvent.contentOffset.x / CARD_IMAGE_WIDTH);
              setActiveIndex(slide);
            }}
            scrollEventThrottle={16}
            style={{ overflow: 'visible' }}
          >
            {post.images!.map((img, index) => (
              <ZoomableImage key={index}>
                <Image
                  source={{ uri: getOptimizedCloudinaryUrl(img, 800) }}
                  style={{ width: CARD_IMAGE_WIDTH, aspectRatio: multiRatio }}
                  contentFit="cover"
                  onLoad={index === 0 ? (e) => {
                    const { width, height } = e.source;
                    if (width && height) {
                      const ratio = width / height;
                      setMultiRatio(Math.max(0.8, Math.min(ratio, 1.91)));
                    }
                  } : undefined}
                  accessibilityLabel={`Post image ${index + 1}`}
                />
              </ZoomableImage>
            ))}
          </ScrollView>
          <View style={{ flexDirection: 'row', justifyContent: 'center', gap: 6, position: 'absolute', bottom: 12, left: 0, right: 0 }}>
            {post.images!.map((_, index) => (
              <View
                key={index}
                style={{
                  width: activeIndex === index ? 8 : 6,
                  height: activeIndex === index ? 8 : 6,
                  borderRadius: 4,
                  backgroundColor: activeIndex === index ? themeColors.ogi : 'rgba(255,255,255,0.4)',
                }}
              />
            ))}
          </View>
          {/* Floating song sticker over image */}
          {!!post.songName && <FloatingSongSticker />}
        </View>
      ) : !!post.image ? (
        <View style={{ position: 'relative', overflow: 'visible', zIndex: 1 }}>
          <ZoomableImage>
            <Image
              source={{ uri: getOptimizedCloudinaryUrl(post.image, 800) }}
              style={[s.mediaImg, { aspectRatio: singleRatio }]}
              contentFit="cover"
              onLoad={(e) => {
                const { width, height } = e.source;
                if (width && height) {
                  const ratio = width / height;
                  setSingleRatio(Math.max(0.8, Math.min(ratio, 1.91)));
                }
              }}
              accessibilityLabel="Post image"
            />
          </ZoomableImage>
          {/* Floating song sticker over image */}
          {!!post.songName && <FloatingSongSticker />}
        </View>
      ) : null}

      <View style={s.contentArea}>
        <Text style={[s.textBody, { color: themeColors.txt }]}>
          {post.title}{!!post.body && `\n\n${post.body}`}
        </Text>
        {(post.type === 'events' || post.type === 'bhandara') && (post.eventDate || post.eventLocation) && (
          <View style={{ marginTop: 12, padding: 12, backgroundColor: themeColors.card2, borderRadius: 12, gap: 6 }}>
            {!!post.eventDate && <Text style={{ color: '#3B82F6', fontSize: 13, fontWeight: '700' }}>📅 {new Date(post.eventDate).toLocaleDateString()} at {new Date(post.eventDate).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</Text>}
            {!!post.eventLocation && <Text style={{ color: themeColors.txt2, fontSize: 13, fontWeight: '500' }}>📍 {post.eventLocation}</Text>}
          </View>
        )}
      </View>

      {/* Song sticker BELOW text only when NO image */}
      {!!post.songName && !post.image && !(post.images && post.images.length > 1) && (
        <TouchableOpacity
          style={[s.songBadge, { backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)', borderColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)' }]}
          onPress={() => setShowReelModal(true)}
          activeOpacity={0.8}
        >
          {post.songCoverUrl ? (
            <Image source={{ uri: post.songCoverUrl }} style={{ width: 38, height: 38, borderRadius: 10 }} />
          ) : (
            <View style={s.songIconWrap}>
              <Ionicons name="musical-notes" size={16} color={isDark ? '#c8f53a' : '#3f6212'} />
            </View>
          )}
          <View style={{ flex: 1, overflow: 'hidden' }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
              <Text style={[s.songName, { color: themeColors.txt }]} numberOfLines={1}>{post.songName}</Text>
              <Ionicons name="musical-notes-outline" size={12} color={themeColors.txt3} />
            </View>
            {!!post.songArtist && <Text style={[s.songArtist, { color: themeColors.txt3 }]} numberOfLines={1}>{post.songArtist} · Original Audio</Text>}
          </View>
          {!!post.songAudioUrl && (
            <TouchableOpacity
              style={{ width: 34, height: 34, borderRadius: 17, backgroundColor: themeColors.ogi, alignItems: 'center', justifyContent: 'center' }}
              onPress={(e) => {
                e.stopPropagation();
                if (isPlayingAudio) { soundManager.stop(); setIsPlayingAudio(false); }
                else { setIsPlayingAudio(true); soundManager.play(post.songAudioUrl!, () => setIsPlayingAudio(false), post.songStartOffset || 0); }
              }}
            >
              <Ionicons name={isPlayingAudio ? 'pause' : 'play'} size={16} color={isDark ? '#000' : '#fff'} />
            </TouchableOpacity>
          )}
        </TouchableOpacity>
      )}

      {/* 🎬 Instagram-Style Reel Music Modal */}
      <Modal visible={showReelModal} transparent animationType="slide" onRequestClose={() => setShowReelModal(false)}>
        <TouchableOpacity
          style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.85)', justifyContent: 'flex-end' }}
          activeOpacity={1}
          onPress={() => setShowReelModal(false)}
        >
          <View
            style={{ backgroundColor: isDark ? '#121217' : '#FFFFFF', borderTopLeftRadius: 32, borderTopRightRadius: 32, padding: 24, alignItems: 'center' }}
            onStartShouldSetResponder={() => true}
          >
            <View style={{ width: 40, height: 4, backgroundColor: isDark ? '#333' : '#DDD', borderRadius: 2, marginBottom: 20 }} />

            {/* Spinning Album Artwork */}
            <View style={{ width: 140, height: 140, borderRadius: 70, overflow: 'hidden', borderWidth: 4, borderColor: themeColors.ogi, marginBottom: 16, elevation: 8, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 10 }}>
              {post.songCoverUrl ? (
                <Image source={{ uri: post.songCoverUrl }} style={{ width: '100%', height: '100%' }} />
              ) : (
                <View style={{ width: '100%', height: '100%', backgroundColor: themeColors.card2, alignItems: 'center', justifyContent: 'center' }}>
                  <Ionicons name="musical-notes" size={48} color={themeColors.ogi} />
                </View>
              )}
            </View>

            <Text style={{ color: themeColors.txt, fontSize: 20, fontWeight: '800', textAlign: 'center', fontFamily: 'DMSans_700Bold' }}>{post.songName}</Text>
            <Text style={{ color: themeColors.txt3, fontSize: 14, fontWeight: '500', marginTop: 4, textAlign: 'center', fontFamily: 'DMSans_400Regular' }}>{post.songArtist || 'Original Audio'} · Audio Preview</Text>

            {/* Play/Pause Large Button */}
            {!!post.songAudioUrl && (
              <TouchableOpacity
                onPress={() => {
                  if (isPlayingAudio) {
                    soundManager.stop();
                    setIsPlayingAudio(false);
                  } else {
                    setIsPlayingAudio(true);
                    soundManager.play(post.songAudioUrl!, () => {
                      setIsPlayingAudio(false);
                    }, post.songStartOffset || 0);
                  }
                }}
                style={{ flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: themeColors.ogi, paddingHorizontal: 32, paddingVertical: 14, borderRadius: 30, marginTop: 24 }}
              >
                <Ionicons name={isPlayingAudio ? "pause" : "play"} size={22} color={isDark ? '#000' : '#fff'} />
                <Text style={{ color: isDark ? '#000' : '#fff', fontWeight: '800', fontSize: 16, fontFamily: 'DMSans_700Bold' }}>
                  {isPlayingAudio ? 'Pause Audio' : 'Play Song Preview'}
                </Text>
              </TouchableOpacity>
            )}

            <TouchableOpacity
              onPress={() => setShowReelModal(false)}
              style={{ marginTop: 20, paddingVertical: 10, paddingHorizontal: 24 }}
            >
              <Text style={{ color: themeColors.txt3, fontSize: 14, fontWeight: '600', fontFamily: 'DMSans_600SemiBold' }}>Close</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>


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
          <TouchableOpacity activeOpacity={1} style={[s.menuSheet, { backgroundColor: isDark ? '#1A1A22' : '#FFFFFF' }]}>
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
                  <Text style={[s.menuItemTitle, { color: '#FF3B30' }]}>Delete Post</Text>
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
                  <Text style={[s.menuItemTitle, { color: themeColors.txt }]}>Report Post</Text>
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
              {upvoteCountLocal}
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
  authorName: { fontSize: 14, fontWeight: '600', fontFamily: 'DMSans_600SemiBold' },
  authorHandle: { fontSize: 12, fontFamily: 'DMSans_400Regular', marginTop: 1, color: '#666' },
  headerRight: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  statusPill: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 20 },
  statusTxt: { fontSize: 11, fontWeight: '800' },
  moreBtn: { padding: 4 },
  contentArea: { paddingHorizontal: 16, paddingVertical: 8 },
  textBody: { fontSize: 15, lineHeight: 22.5, fontFamily: 'DMSans_400Regular' },
  // Single image — auto height (4:3 ratio, no black bars, cover crop like Instagram)
  mediaImg: { width: CARD_IMAGE_WIDTH },
  // Multi-image carousel container — no fixed height
  multiMediaContainer: { marginHorizontal: 0, overflow: 'hidden', marginTop: 8 },
  // Legacy — keep for any code that still references it
  mediaContainer: { marginHorizontal: 0, overflow: 'hidden', marginTop: 8 },
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
  actionCount: { fontSize: 13, fontWeight: '400', fontFamily: 'DMSans_400Regular' },
  sectionTag: { paddingHorizontal: 12, paddingVertical: 4, alignSelf: 'flex-start' },
  sectionTagTxt: { fontSize: 10, fontWeight: '700', fontFamily: 'DMSans_700Bold', textTransform: 'uppercase', letterSpacing: 0.08 },
  tagsList: { flexDirection: 'row', flexWrap: 'wrap', gap: 4, marginVertical: 2 },
  tagPill: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
  tagTxt: { fontSize: 10, fontWeight: '700', fontFamily: 'DMSans_700Bold', letterSpacing: 0.08 },
  proPill: { paddingHorizontal: 6, paddingVertical: 1, borderRadius: 4, marginLeft: 2 },
  proTxt: { fontSize: 9, fontWeight: '900', color: '#000' },
  // Song badge styles (pill shown below text when no image)
  songBadge: { flexDirection: 'row', alignItems: 'center', gap: 10, marginHorizontal: 16, marginBottom: 8, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 12, borderWidth: 1 },
  songIconWrap: { width: 28, height: 28, borderRadius: 14, backgroundColor: 'rgba(200,245,58,0.15)', alignItems: 'center', justifyContent: 'center' },
  songName: { fontSize: 13, fontWeight: '700' },
  songArtist: { fontSize: 11, fontWeight: '400', marginTop: 1 },
  // Floating song sticker (over image — Instagram style)
  songStickerFloat: {
    position: 'absolute',
    bottom: 10,
    left: 10,
    right: 10,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.58)',
    borderRadius: 20,
    paddingVertical: 7,
    paddingHorizontal: 10,
    zIndex: 10,
  },
  vinylDisc: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#111',
    borderWidth: 2,
    borderColor: '#2a2a2a',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  vinylCenter: {
    position: 'absolute',
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#c8f53a',
    zIndex: 2,
  },
  floatSongName: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  floatSongArtist: {
    color: 'rgba(255,255,255,0.65)',
    fontSize: 10,
    marginTop: 1,
  },
  floatPlayBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.18)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  // Three-dot action menu
  menuSheet: {
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    padding: 20,
    paddingBottom: 36,
    gap: 4,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingVertical: 14,
    paddingHorizontal: 4,
  },
  menuItemTitle: {
    fontSize: 15,
    fontWeight: '600',
    fontFamily: 'DMSans_600SemiBold',
  },
  menuItemSub: {
    fontSize: 12,
    fontFamily: 'DMSans_400Regular',
    marginTop: 2,
  },
});
