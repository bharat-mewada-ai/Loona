import React, { useState, useEffect, useRef } from 'react';
import { 
  View, Text, Modal, StyleSheet, TouchableOpacity, SafeAreaView, 
  ScrollView, Dimensions, ActivityIndicator, Pressable, Animated 
} from 'react-native';
import { Image } from 'expo-image';
import { Post } from '../types';
import { getColors } from '../theme/colors';
import { useUIStore } from '../store/uiStore';
import { formatDistanceToNow } from '../utils/time';
import { usePost, useDeletePost } from '../hooks/usePosts';
import { triggerHaptic } from '../utils/haptics';
import { useAuthStore } from '../store/authStore';
import { Ionicons } from '@expo/vector-icons';
import { Alert } from 'react-native';
import { Audio } from 'expo-av';

const { width, height } = Dimensions.get('window');
const STORY_DURATION = 8000; // 8 seconds per story

export default function StoryViewer() {
  const { showStoryViewer, activeStoryId, storyList, closeStoryViewer, openCommentSheet, openStoryViewer } = useUIStore();
  const { data: story, isLoading } = usePost(activeStoryId || '');
  
  const [progress] = useState(new Animated.Value(0));
  const progressTimer = useRef<NodeJS.Timeout | null>(null);

  const currentIndex = storyList.indexOf(activeStoryId || '');
  const hasNext = currentIndex < storyList.length - 1;
  const hasPrev = currentIndex > 0;
  const hasPhoto = !!(story && story.image);

  const { user } = useAuthStore();
  const { mutate: deletePost } = useDeletePost();

  const authorId = typeof story?.author === 'string' ? story.author : story?.author?._id?.toString();
  const isAuthor = !!(user?._id && authorId && authorId === user._id.toString());
  const isStaff = ['admin', 'moderator', 'super-admin'].includes(user?.role || '');
  const canDelete = isAuthor || isStaff;

  const [soundObj, setSoundObj] = useState<Audio.Sound | null>(null);
  const [isMuted, setIsMuted] = useState(false);

  useEffect(() => {
    let activeSound: Audio.Sound | null = null;
    if (showStoryViewer && story && !isLoading) {
      startProgress();

      if (story.songAudioUrl) {
        Audio.Sound.createAsync({ uri: story.songAudioUrl }, { shouldPlay: !isMuted, isLooping: true })
          .then(({ sound }) => {
            activeSound = sound;
            setSoundObj(sound);
          })
          .catch(() => {});
      }
    }
    return () => {
      stopProgress();
      if (activeSound) {
        activeSound.unloadAsync();
      }
    };
  }, [activeStoryId, isLoading, showStoryViewer]);

  const startProgress = () => {
    progress.setValue(0);
    Animated.timing(progress, {
      toValue: 1,
      duration: STORY_DURATION,
      useNativeDriver: false,
    }).start(({ finished }) => {
      if (finished) handleNext();
    });
  };

  const stopProgress = () => {
    progress.stopAnimation();
    if (progressTimer.current) clearTimeout(progressTimer.current);
  };

  const handleNext = () => {
    if (hasNext) {
      triggerHaptic('selection');
      openStoryViewer(storyList[currentIndex + 1], storyList);
    } else {
      closeStoryViewer();
    }
  };

  const handlePrev = () => {
    if (hasPrev) {
      triggerHaptic('selection');
      openStoryViewer(storyList[currentIndex - 1], storyList);
    } else {
      // Restart current story if it's the first one
      progress.setValue(0);
      startProgress();
    }
  };

  const handleTap = (e: any) => {
    const x = e.nativeEvent.locationX;
    if (x < width * 0.3) {
      handlePrev();
    } else {
      handleNext();
    }
  };

  if (!activeStoryId) return null;

  const colors = ['#5D5FEF', '#ED4899', '#8B5CF6', '#F59E0B', '#10B981'];
  const bgColor = story ? colors[story._id.charCodeAt(story._id.length - 1) % colors.length] : '#000';

  return (
    <Modal visible={showStoryViewer} animationType="fade" transparent={false} onRequestClose={closeStoryViewer}>
      <Pressable style={[s.container, { backgroundColor: hasPhoto ? '#000' : bgColor }]} onPress={handleTap}>
        {story && story.image && (
          <View style={s.photoContainer}>
            <Image source={{ uri: story.image }} style={s.photoStyle} contentFit="cover" />
          </View>
        )}
        <SafeAreaView style={s.safe}>
          {/* Progress Bars */}
          <View style={s.progressRow}>
            {storyList.map((id, index) => (
              <View key={id} style={s.progressBg}>
                <Animated.View 
                  style={[
                    s.progressBar, 
                    { 
                      width: index === currentIndex 
                        ? progress.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] })
                        : index < currentIndex ? '100%' : '0%'
                    }
                  ]} 
                />
              </View>
            ))}
          </View>

          {/* Header */}
          <View style={s.header}>
            <View style={s.authorInfo}>
              {story ? (
                <>
                  <Text style={s.avatar}>{story.anonAvatar || '📖'}</Text>
                  <View>
                    <Text style={s.name}>{story.anonName}</Text>
                    <Text style={s.time}>{formatDistanceToNow(story.createdAt)} ago</Text>
                  </View>
                </>
              ) : (
                <Text style={s.name}>Loading...</Text>
              )}
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
              {story && canDelete && (
                <TouchableOpacity 
                  onPress={() => {
                    stopProgress();
                    Alert.alert(
                      "Delete Story?",
                      "Are you sure you want to delete this story permanently?",
                      [
                        { text: "Cancel", style: "cancel", onPress: () => startProgress() },
                        { 
                          text: "Delete", 
                          style: "destructive", 
                          onPress: () => {
                            deletePost(story._id, {
                              onSuccess: () => {
                                closeStoryViewer();
                                Alert.alert("Success", "Story deleted.");
                              }
                            });
                          } 
                        }
                      ]
                    );
                  }}
                  style={s.deleteBtn}
                >
                  <Ionicons name="trash-outline" size={20} color="#FFF" />
                </TouchableOpacity>
              )}
              <TouchableOpacity onPress={closeStoryViewer} style={s.closeBtn}>
                <Text style={s.closeTxt}>✕</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Content */}
          <View style={s.content}>
            {isLoading ? (
               <View style={s.center}><ActivityIndicator color="#FFF" size="large" /></View>
            ) : story ? (
              <ScrollView 
                showsVerticalScrollIndicator={false} 
                contentContainerStyle={[
                  s.scrollContent,
                  hasPhoto && { justifyContent: 'flex-end', flexGrow: 1, paddingHorizontal: 20, paddingBottom: 10 }
                ]}
              >
                {hasPhoto ? (
                  <View style={s.captionContainer}>
                    {!!story.title && <Text style={s.captionTitle}>{story.title}</Text>}
                    {!!story.body && <Text style={s.captionBody}>{story.body}</Text>}
                  </View>
                ) : (
                  <>
                    <Text style={s.title}>{story.title}</Text>
                    {!!story.body && (
                      <View style={s.bodyWrap}>
                        <Text style={s.bodyText}>{story.body}</Text>
                      </View>
                    )}
                  </>
                )}
              </ScrollView>
            ) : null}
          </View>

          {/* Footer */}
          {story && (
            <View style={s.footer}>
              {/* Song Ticker & Mute Control */}
              {!!story.songName && (
                <View style={s.songTicker}>
                  {story.songCoverUrl ? (
                    <Image source={{ uri: story.songCoverUrl }} style={{ width: 22, height: 22, borderRadius: 4 }} />
                  ) : (
                    <Text style={{ fontSize: 14 }}>🎵</Text>
                  )}
                  <Text style={s.songTickerTxt} numberOfLines={1}>
                    {story.songName}{story.songArtist ? ` — ${story.songArtist}` : ''}
                  </Text>
                  {!!story.songAudioUrl && (
                    <TouchableOpacity
                      onPress={async () => {
                        const newMute = !isMuted;
                        setIsMuted(newMute);
                        if (soundObj) {
                          await soundObj.setIsMutedAsync(newMute);
                        }
                      }}
                      style={{ paddingHorizontal: 6 }}
                    >
                      <Ionicons name={isMuted ? "volume-mute" : "volume-high"} size={18} color="#FFF" />
                    </TouchableOpacity>
                  )}
                </View>
              )}
              <TouchableOpacity 
                style={s.commentBar}
                onPress={() => {
                  closeStoryViewer();
                  setTimeout(() => openCommentSheet(story._id), 300);
                }}
              >
                <Text style={s.commentInputTxt}>Reply to this story...</Text>
                <Text style={{ fontSize: 20 }}>💬</Text>
              </TouchableOpacity>
            </View>
          )}
        </SafeAreaView>
      </Pressable>
    </Modal>
  );
}

const s = StyleSheet.create({
  container: { flex: 1 },
  safe: { flex: 1 },
  progressRow: { flexDirection: 'row', paddingHorizontal: 10, paddingTop: 10, gap: 4 },
  progressBg: { flex: 1, height: 3, backgroundColor: 'rgba(255,255,255,0.3)', borderRadius: 2, overflow: 'hidden' },
  progressBar: { height: '100%', backgroundColor: '#FFF' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, paddingTop: 10 },
  authorInfo: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  avatar: { fontSize: 32 },
  name: { color: '#FFF', fontWeight: '900', fontSize: 16 },
  time: { color: 'rgba(255,255,255,0.6)', fontSize: 12, fontWeight: '700' },
  closeBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(0,0,0,0.1)', alignItems: 'center', justifyContent: 'center' },
  closeTxt: { color: '#FFF', fontSize: 18, fontWeight: '800' },
  content: { flex: 1, justifyContent: 'center' },
  center: { alignItems: 'center', justifyContent: 'center' },
  scrollContent: { padding: 32, paddingBottom: 120 },
  title: { color: '#FFF', fontSize: 34, fontWeight: '900', lineHeight: 42, letterSpacing: -1, marginBottom: 24, textAlign: 'center', textShadowColor: 'rgba(0,0,0,0.6)', textShadowOffset: {width:0,height:1}, textShadowRadius: 8 },
  bodyWrap: { backgroundColor: 'rgba(0,0,0,0.1)', padding: 24, borderRadius: 32 },
  bodyText: { color: '#FFF', fontSize: 18, lineHeight: 28, fontWeight: '500', textAlign: 'center', textShadowColor: 'rgba(0,0,0,0.6)', textShadowOffset: {width:0,height:1}, textShadowRadius: 8 },
  footer: { padding: 20, paddingBottom: 30 },
  commentBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 16, borderRadius: 30, backgroundColor: 'rgba(255,255,255,0.2)' },
  commentInputTxt: { color: '#FFF', fontSize: 15, fontWeight: '700', opacity: 0.8 },
  captionContainer: {
    backgroundColor: 'rgba(0,0,0,0.3)',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 16,
    width: '100%',
    alignSelf: 'center',
    gap: 6,
  },
  captionTitle: {
    color: '#FFF',
    fontSize: 18,
    fontWeight: '800',
    textAlign: 'center',
    textShadowColor: 'rgba(0,0,0,0.6)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 6,
  },
  captionBody: {
    color: '#FFF',
    fontSize: 14.5,
    fontWeight: '500',
    lineHeight: 20,
    textAlign: 'center',
    textShadowColor: 'rgba(0,0,0,0.6)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 6,
  },
  photoContainer: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#000',
  },
  photoStyle: {
    width: '100%',
    height: '100%',
  },
  deleteBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0,0,0,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  // Song ticker for stories
  songTicker: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(0,0,0,0.4)',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    marginBottom: 10,
    alignSelf: 'flex-start',
  },
  songTickerTxt: {
    color: '#FFF',
    fontSize: 13,
    fontWeight: '700',
    maxWidth: 220,
  },
});
