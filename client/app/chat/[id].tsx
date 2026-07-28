import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, KeyboardAvoidingView,
  Platform, StyleSheet, ActivityIndicator, Image, Alert, Modal,
  TouchableWithoutFeedback, AppState, AppStateStatus, PanResponder, Animated,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { FlashList } from '@shopify/flash-list';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import { useUIStore } from '../../src/store/uiStore';
import { getColors } from '../../src/theme/colors';
import { useMessages, useSendMessage, useRevealIdentity, useDeleteChat, useReactToMessage } from '../../src/hooks/useChat';
import { useBlockUser } from '../../src/hooks/useAuth';
import { useAuthStore } from '../../src/store/authStore';
import * as ImagePicker from 'expo-image-picker';
import { uploadToCloudinary } from '../../src/utils/uploadToCloudinary';
import { Ionicons } from '@expo/vector-icons';
import { formatMessageTime } from '../../src/utils/time';
import { useAnalytics } from '../../src/hooks/useAnalytics';
import { getSocket, reconnectSocket } from '../../src/utils/socket';
import * as Haptics from 'expo-haptics';

// ─────────────────────────────────────────────────────────────────────────────
// SwipeableMessage
// ─────────────────────────────────────────────────────────────────────────────
interface SwipeableMessageProps {
  children: React.ReactNode;
  onSwipeReply: () => void;
}

const SwipeableMessage: React.FC<SwipeableMessageProps> = ({ children, onSwipeReply }) => {
  const pan = useRef(new Animated.ValueXY()).current;

  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (evt, gestureState) => {
        return Math.abs(gestureState.dx) > 10 && Math.abs(gestureState.dy) < 8 && gestureState.dx > 0;
      },
      onPanResponderMove: (evt, gestureState) => {
        if (gestureState.dx > 0) {
          pan.setValue({ x: Math.min(gestureState.dx, 50), y: 0 });
        }
      },
      onPanResponderRelease: (evt, gestureState) => {
        if (gestureState.dx >= 40) {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
          onSwipeReply();
        }
        Animated.spring(pan, {
          toValue: { x: 0, y: 0 },
          useNativeDriver: true,
          tension: 50,
          friction: 6,
        }).start();
      },
    })
  ).current;

  return (
    <View style={{ position: 'relative', width: '100%' }}>
      <Animated.View
        style={{
          position: 'absolute',
          left: 10,
          top: '30%',
          opacity: pan.x.interpolate({ inputRange: [0, 40], outputRange: [0, 1], extrapolate: 'clamp' }),
          transform: [{ scale: pan.x.interpolate({ inputRange: [0, 40], outputRange: [0.7, 1.1], extrapolate: 'clamp' }) }],
        }}
      >
        <Ionicons name="arrow-undo-outline" size={20} color="#FF453A" />
      </Animated.View>
      <Animated.View style={{ transform: [{ translateX: pan.x }] }} {...panResponder.panHandlers}>
        {children}
      </Animated.View>
    </View>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// Date label helper
// ─────────────────────────────────────────────────────────────────────────────
const getDateLabel = (date: string) => {
  const d = new Date(date);
  const today = new Date();
  const yesterday = new Date();
  yesterday.setDate(today.getDate() - 1);
  if (d.toDateString() === today.toDateString()) return 'Today';
  if (d.toDateString() === yesterday.toDateString()) return 'Yesterday';
  return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
};

// ─────────────────────────────────────────────────────────────────────────────
// ChatWallpaper
// ─────────────────────────────────────────────────────────────────────────────
const ChatWallpaper = ({ isDark }: { isDark: boolean }) => (
  <LinearGradient
    colors={
      isDark
        ? ['#060610', '#070D0A', '#060610']
        : ['#EDF5EE', '#F2F5EF', '#EDF5EE']
    }
    start={{ x: 0, y: 0 }}
    end={{ x: 1, y: 1 }}
    style={StyleSheet.absoluteFill}
  />
);

// ─────────────────────────────────────────────────────────────────────────────
// Main Component
// ─────────────────────────────────────────────────────────────────────────────
export default function ChatRoomScreen() {
  const { id, name, isGroup } = useLocalSearchParams();
  const router = useRouter();
  const { isDark } = useUIStore();
  const themeColors = getColors(isDark);
  const { user } = useAuthStore();

  useAnalytics('chat');

  const [inputText, setInputText] = useState('');
  const [image, setImage] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [showAttachment, setShowAttachment] = useState(false);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [replyingTo, setReplyingTo] = useState<any | null>(null);
  const flatListRef = useRef<any>(null);

  const [isOtherTyping, setIsOtherTyping] = useState(false);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isTypingRef = useRef(false);
  const token = useAuthStore(s => s.token);

  const [isSearching, setIsSearching] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const isNearBottomRef = useRef(true);
  const prevMessagesCountRef = useRef(0);

  const handleScroll = (event: any) => {
    const { layoutMeasurement, contentOffset, contentSize } = event.nativeEvent;
    const distanceFromBottom = contentSize.height - layoutMeasurement.height - contentOffset.y;
    isNearBottomRef.current = distanceFromBottom < 150;
  };

  const { data, isLoading, isFetching, isError, refetch } = useMessages(id as string);

  useEffect(() => {
    const handleAppStateChange = (nextAppState: AppStateStatus) => {
      if (nextAppState === 'active') {
        console.log('[Chat] App returned to active foreground: refetching and sync socket');
        refetch();
        if (token && id) {
          const s = reconnectSocket(token);
          s.emit('joinChat', id);
        }
      }
    };
    const subscription = AppState.addEventListener('change', handleAppStateChange);
    return () => { subscription.remove(); };
  }, [id, token, refetch]);

  useEffect(() => {
    if (!id || !token) return;
    const s = getSocket(token);

    const handleUserTyping = (payload: any) => {
      if (payload.chatId === id && payload.userId !== user?._id) {
        setIsOtherTyping(true);
      }
    };
    const handleUserStopTyping = (payload: any) => {
      if (payload.chatId === id && payload.userId !== user?._id) {
        setIsOtherTyping(false);
      }
    };

    s.on('userTyping', handleUserTyping);
    s.on('userStopTyping', handleUserStopTyping);

    return () => {
      s.off('userTyping', handleUserTyping);
      s.off('userStopTyping', handleUserStopTyping);
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    };
  }, [id, token, user?._id]);

  const { mutate: sendMessage, isPending } = useSendMessage();
  const { mutate: blockUser } = useBlockUser();
  const { mutate: reveal } = useRevealIdentity();
  const { mutate: deleteChat } = useDeleteChat();
  const { mutate: reactToMessage } = useReactToMessage();

  const [activeReactionMsg, setActiveReactionMsg] = useState<any | null>(null);
  const REACTION_EMOJIS = ['❤️', '👍', '🔥', '😆', '😢', '🙏'];

  const handleReact = (messageId: string, emoji: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    const currentReaction = activeReactionMsg?.reactions?.[user?._id || ''];
    const finalEmoji = currentReaction === emoji ? null : emoji;
    reactToMessage({ chatId: id as string, messageId, reaction: finalEmoji });
    setActiveReactionMsg(null);
  };

  const messages = data?.messages || [];
  const chatInfo = data?.chat;

  // Header info
  let otherName = (name as string) || 'Anonymous';
  let otherAvatar = isGroup === 'true' ? '💬' : '👤';

  if (!isGroup && chatInfo?.identities) {
    otherName = chatInfo.identities.other?.name || 'Anonymous';
    otherAvatar = chatInfo.identities.other?.avatar || '👤';
  }

  // Last seen text
  const lastActive = chatInfo?.identities?.other?.lastActive;
  const getLastSeenText = () => {
    if (!lastActive) return 'Last seen recently';
    const d = new Date(lastActive);
    const now = new Date();
    const diffMs = now.getTime() - d.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    if (diffMins < 2) return 'Active now';
    if (diffMins < 60) return `Last seen ${diffMins}m ago`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `Last seen ${diffHours}h ago`;
    return `Last seen ${d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}`;
  };

  // Filtered messages
  const filteredMessages = useMemo(() => {
    if (!isSearching || !searchQuery.trim()) return messages;
    return messages.filter((m: any) =>
      m.content?.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [messages, isSearching, searchQuery]);

  // Messages with date separators + grouping flags
  const messagesWithSeparators = useMemo(() => {
    const result: any[] = [];
    for (let i = 0; i < filteredMessages.length; i++) {
      const msg = filteredMessages[i];
      const prevMsg = i > 0 ? filteredMessages[i - 1] : null;
      const nextMsg = i < filteredMessages.length - 1 ? filteredMessages[i + 1] : null;

      // Date separator
      const needsSeparator =
        !prevMsg ||
        new Date(msg.createdAt).toDateString() !== new Date(prevMsg.createdAt).toDateString();

      if (needsSeparator) {
        result.push({ _id: 'sep_' + msg._id, _isDateSeparator: true, date: msg.createdAt });
      }

      // Consecutive / last-in-group flags
      const isConsecutive =
        !!prevMsg &&
        prevMsg.senderType === msg.senderType &&
        new Date(msg.createdAt).getTime() - new Date(prevMsg.createdAt).getTime() < 120000;

      const isLastInGroup =
        !nextMsg ||
        nextMsg.senderType !== msg.senderType ||
        new Date(nextMsg.createdAt).getTime() - new Date(msg.createdAt).getTime() >= 120000;

      result.push({ ...msg, isConsecutive, isLastInGroup });
    }
    return result;
  }, [filteredMessages]);

  const messagesCount = messages.length;
  useEffect(() => {
    if (messagesCount > 0) {
      const lastMsg = messages[messagesCount - 1];
      const isMe = lastMsg?.senderType === 'me';
      const wasLoaded = prevMessagesCountRef.current === 0;

      if (wasLoaded || isMe || isNearBottomRef.current) {
        setTimeout(() => {
          flatListRef.current?.scrollToEnd({ animated: !wasLoaded });
        }, 50);
      }
    }
    prevMessagesCountRef.current = messagesCount;
  }, [messagesCount]);

  const pickImage = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        quality: 0.7,
      });
      if (!result.canceled) {
        setIsUploading(true);
        const { url } = await uploadToCloudinary(result.assets[0].uri);
        setImage(url);
        setIsUploading(false);
      }
    } catch (err: any) {
      setIsUploading(false);
      Alert.alert('Upload Failed', err.message);
    }
  };

  const takePhoto = async () => {
    try {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Denied', 'Allow camera access to take photos.');
        return;
      }
      const result = await ImagePicker.launchCameraAsync({ allowsEditing: true, quality: 0.7 });
      if (!result.canceled) {
        setIsUploading(true);
        const { url } = await uploadToCloudinary(result.assets[0].uri);
        setImage(url);
        setIsUploading(false);
      }
    } catch (err: any) {
      setIsUploading(false);
      Alert.alert('Upload Failed', err.message);
    }
  };

  const handleSend = () => {
    if (!inputText.trim() && !image) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});

    if (isTypingRef.current && token && id) {
      isTypingRef.current = false;
      getSocket(token).emit('stopTyping', id);
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    }

    let textToSend = inputText;
    if (replyingTo) {
      const snippet = replyingTo.content
        ? replyingTo.content.replace(/\n/g, ' ').slice(0, 45)
        : replyingTo.image ? '📷 Image' : '';
      textToSend = `💬 Replying to: ${snippet}\n\n${inputText}`;
    }

    sendMessage({ chatId: id as string, content: textToSend, image: image || undefined });
    setInputText('');
    setImage('');
    setReplyingTo(null);
    setShowAttachment(false);
  };

  const handleBlock = () => {
    const otherId = chatInfo?.identities?.other?.id;
    if (!otherId) return;
    Alert.alert(
      'Block User?',
      `Are you sure you want to block ${otherName}? You will no longer see their posts and this chat will be archived.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Block',
          style: 'destructive',
          onPress: () => {
            blockUser(otherId, {
              onSuccess: () => {
                router.back();
                Alert.alert('Blocked', 'User has been blocked.');
              },
            });
          },
        },
      ]
    );
  };

  const handleReveal = () => {
    Alert.alert(
      'Reveal Your Identity?',
      'This will show your real profile name and avatar to the other participant. This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Reveal',
          style: 'destructive',
          onPress: () => {
            reveal(id as string, {
              onSuccess: () => {
                Alert.alert('Identity Revealed', 'Your real identity has been successfully revealed to this user!');
              },
            });
          },
        },
      ]
    );
  };

  const handleDeleteChat = () => {
    Alert.alert(
      'Delete Chat?',
      'Are you sure you want to delete this entire chat and all its messages? This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            deleteChat(id as string, {
              onSuccess: () => {
                router.back();
                Alert.alert('Deleted', 'Chat has been deleted.');
              },
              onError: (err: any) => {
                Alert.alert('Error', err.response?.data?.error || 'Could not delete chat.');
              },
            });
          },
        },
      ]
    );
  };

  const renderTicks = (item: any) => {
    const isMe = item.senderType === 'me';
    if (!isMe) return null;

    if (item.status === 'sending' || item.isOptimistic) {
      return <Ionicons name="time-outline" size={13} color="rgba(255,255,255,0.55)" style={{ marginLeft: 3 }} />;
    }

    const isRead = item.readBy && item.readBy.length > 1;
    const otherLastActive = chatInfo?.identities?.other?.lastActive;
    let isDelivered = false;
    if (otherLastActive) {
      const msgTime = new Date(item.createdAt).getTime();
      const activeTime = new Date(otherLastActive).getTime();
      isDelivered = activeTime >= msgTime;
    }

    if (isRead) {
      return <Ionicons name="checkmark-done" size={15} color="#34B7F1" style={{ marginLeft: 3 }} />;
    } else if (isDelivered) {
      return <Ionicons name="checkmark-done" size={15} color="rgba(255,255,255,0.55)" style={{ marginLeft: 3 }} />;
    } else {
      return <Ionicons name="checkmark" size={15} color="rgba(255,255,255,0.55)" style={{ marginLeft: 3 }} />;
    }
  };

  // ───────────────────────────────────────────────────────────────────────────
  // Animated Typing Indicator
  // ───────────────────────────────────────────────────────────────────────────
  const TypingIndicator = () => {
    const dot0 = useRef(new Animated.Value(0)).current;
    const dot1 = useRef(new Animated.Value(0)).current;
    const dot2 = useRef(new Animated.Value(0)).current;
    const dots = [dot0, dot1, dot2];

    useEffect(() => {
      const anims = dots.map((dot, i) =>
        Animated.loop(
          Animated.sequence([
            Animated.delay(i * 200),
            Animated.timing(dot, { toValue: -6, duration: 300, useNativeDriver: true }),
            Animated.timing(dot, { toValue: 0, duration: 300, useNativeDriver: true }),
            Animated.delay(600 - i * 200),
          ])
        )
      );
      anims.forEach(a => a.start());
      return () => anims.forEach(a => a.stop());
    }, []);

    return (
      <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 6, paddingHorizontal: 16, paddingVertical: 6 }}>
        <View
          style={{
            width: 30, height: 30, borderRadius: 15,
            backgroundColor: themeColors.card2,
            alignItems: 'center', justifyContent: 'center',
          }}
        >
          <Text style={{ fontSize: 14 }}>{otherAvatar}</Text>
        </View>
        <View
          style={{
            backgroundColor: themeColors.card2,
            borderRadius: 18, borderBottomLeftRadius: 4,
            paddingHorizontal: 16, paddingVertical: 12,
            flexDirection: 'row', alignItems: 'center', gap: 6,
          }}
        >
          {dots.map((dot, i) => (
            <Animated.View
              key={i}
              style={{
                width: 8, height: 8, borderRadius: 4,
                backgroundColor: themeColors.txt3,
                transform: [{ translateY: dot }],
              }}
            />
          ))}
        </View>
      </View>
    );
  };

  // ───────────────────────────────────────────────────────────────────────────
  // Early returns
  // ───────────────────────────────────────────────────────────────────────────
  if (isLoading && !data) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: themeColors.bg, justifyContent: 'center', alignItems: 'center' }}>
        <ChatWallpaper isDark={isDark} />
        <ActivityIndicator color={themeColors.ogi} />
      </SafeAreaView>
    );
  }

  if (isError || (!isLoading && !data)) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: themeColors.bg, justifyContent: 'center', alignItems: 'center', padding: 24 }}>
        <ChatWallpaper isDark={isDark} />
        <Text style={{ fontSize: 48, marginBottom: 16 }}>🚫</Text>
        <Text style={{ fontSize: 18, fontWeight: '700', color: themeColors.txt, marginBottom: 8 }}>Chat Unavailable</Text>
        <Text style={{ fontSize: 14, color: themeColors.txt3, textAlign: 'center', marginBottom: 24 }}>
          This conversation has been deleted or is no longer available.
        </Text>
        <TouchableOpacity
          style={{ backgroundColor: themeColors.ogi, paddingHorizontal: 24, paddingVertical: 12, borderRadius: 24 }}
          onPress={() => router.replace('/chats')}
        >
          <Text style={{ color: '#FFF', fontWeight: '700' }}>Back to Chats</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  // ───────────────────────────────────────────────────────────────────────────
  // Main render
  // ───────────────────────────────────────────────────────────────────────────
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: 'transparent' }}>
      {/* Wallpaper gradient behind everything */}
      <ChatWallpaper isDark={isDark} />

      <Stack.Screen options={{ headerShown: false }} />

      {/* Thin sync indicator */}
      {isFetching && !!data && (
        <View style={{ height: 2, backgroundColor: themeColors.ogi, opacity: 0.7, width: '100%' }} />
      )}

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.select({ ios: 0, android: 10 })}
      >
        {/* ── Header ── */}
        {isSearching ? (
          <View style={[s.header, { borderBottomColor: themeColors.bdr, backgroundColor: isDark ? 'rgba(6,6,16,0.92)' : 'rgba(237,245,238,0.92)' }]}>
            <TouchableOpacity onPress={() => { setIsSearching(false); setSearchQuery(''); }} style={s.backBtn}>
              <Ionicons name="close" size={24} color={themeColors.txt} />
            </TouchableOpacity>
            <View style={{ flex: 1, marginRight: 12 }}>
              <TextInput
                style={[s.searchInput, { color: themeColors.txt, backgroundColor: themeColors.card2, borderRadius: 20, paddingHorizontal: 16, height: 38 }]}
                placeholder="Search messages..."
                placeholderTextColor={themeColors.txt3}
                value={searchQuery}
                onChangeText={setSearchQuery}
                autoFocus
              />
            </View>
          </View>
        ) : (
          <View style={[s.header, { borderBottomColor: themeColors.bdr, backgroundColor: isDark ? 'rgba(6,6,16,0.92)' : 'rgba(237,245,238,0.92)' }]}>
            <TouchableOpacity onPress={() => router.back()} style={s.backBtn}>
              <Ionicons name="chevron-back" size={28} color={themeColors.txt} />
            </TouchableOpacity>
            <TouchableOpacity
              style={s.headerCenter}
              onPress={() => {
                const otherId = chatInfo?.identities?.other?.id;
                if (otherId) router.push(`/user/${otherId}`);
              }}
            >
              <View style={[s.headerAvatar, { backgroundColor: themeColors.card2 }]}>
                <Text style={{ fontSize: 18 }}>{otherAvatar}</Text>
              </View>
              <View>
                <Text style={[s.headerName, { color: themeColors.txt }]}>{otherName}</Text>
                <Text
                  style={[
                    s.statusTxt,
                    {
                      color: isOtherTyping ? themeColors.ogi : themeColors.txt3,
                      fontWeight: isOtherTyping ? '700' : '400',
                    },
                  ]}
                >
                  {isOtherTyping ? 'typing...' : getLastSeenText()}
                </Text>
              </View>
            </TouchableOpacity>
            <View style={s.headerRight}>
              <TouchableOpacity onPress={() => setIsSearching(true)} style={{ marginRight: 14 }}>
                <Ionicons name="search-outline" size={20} color={themeColors.txt} />
              </TouchableOpacity>
              <TouchableOpacity onPress={handleBlock} style={{ marginRight: 14 }}>
                <Ionicons name="shield-outline" size={20} color={themeColors.danger} style={{ opacity: 0.9 }} />
              </TouchableOpacity>
              <TouchableOpacity onPress={handleDeleteChat}>
                <Ionicons name="trash-outline" size={20} color={themeColors.danger} />
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* ── Reveal Identity Banner ── */}
        {chatInfo?.isAnonymous && !chatInfo?.isRevealed && user?._id === chatInfo?.anonAuthorId && (
          <TouchableOpacity
            style={[s.revealBanner, { backgroundColor: themeColors.ogi + '15', borderBottomColor: themeColors.bdr }]}
            onPress={handleReveal}
            activeOpacity={0.8}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1 }}>
              <Text style={{ fontSize: 16 }}>🤫</Text>
              <Text style={[s.revealBannerTxt, { color: themeColors.ogi }]}>
                You are chatting anonymously. Tap to Reveal your Identity!
              </Text>
            </View>
            <Ionicons name="eye-outline" size={16} color={themeColors.ogi} />
          </TouchableOpacity>
        )}

        {/* ── Messages ── */}
        <FlashList
          ref={flatListRef}
          data={messagesWithSeparators}
          estimatedItemSize={80}
          keyExtractor={(item) => item._id}
          contentContainerStyle={s.listContent}
          onScroll={handleScroll}
          scrollEventThrottle={16}
          showsVerticalScrollIndicator={true}
          persistentScrollbar={true}
          keyboardShouldPersistTaps="handled"
          removeClippedSubviews={Platform.OS !== 'web'}
          initialNumToRender={15}
          maxToRenderPerBatch={10}
          windowSize={11}
          renderItem={({ item }) => {
            // ── Date Separator ──
            if (item._isDateSeparator) {
              return (
                <View style={{ flexDirection: 'row', alignItems: 'center', marginVertical: 12, paddingHorizontal: 16 }}>
                  <View style={{ flex: 1, height: 0.5, backgroundColor: themeColors.bdr }} />
                  <View
                    style={{
                      paddingHorizontal: 12, paddingVertical: 4,
                      backgroundColor: isDark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.06)',
                      borderRadius: 12, marginHorizontal: 10,
                    }}
                  >
                    <Text style={{ color: themeColors.txt3, fontSize: 11, fontWeight: '700' }}>
                      {getDateLabel(item.date)}
                    </Text>
                  </View>
                  <View style={{ flex: 1, height: 0.5, backgroundColor: themeColors.bdr }} />
                </View>
              );
            }

            const isMe = item.senderType === 'me';
            const hasImage = !!item.image;

            // Dynamic bubble border radii
            const myBubbleStyle = [
              s.msgBubble,
              s.myBubble,
              { backgroundColor: themeColors.ogi, borderRadius: 18, borderTopLeftRadius: 18, borderTopRightRadius: 18, borderBottomLeftRadius: 18 },
              item.isLastInGroup && { borderBottomRightRadius: 4 },
              item.isConsecutive && !item.isLastInGroup && { borderTopRightRadius: 6 },
              hasImage && { padding: 4 },
            ];

            const theirBubbleStyle = [
              s.msgBubble,
              s.theirBubble,
              { backgroundColor: themeColors.card2, borderRadius: 18 },
              item.isLastInGroup && { borderBottomLeftRadius: 4 },
              item.isConsecutive && !item.isLastInGroup && { borderTopLeftRadius: 6 },
              hasImage && { padding: 4 },
            ];

            const messageBubble = (
              <View
                style={[
                  s.msgWrapper,
                  isMe ? s.msgRight : s.msgLeft,
                  {
                    position: 'relative',
                    marginBottom: (item.reactions && Object.keys(item.reactions).length > 0)
                      ? 20
                      : item.isConsecutive ? 3 : 12,
                  },
                ]}
              >
                <SwipeableMessage onSwipeReply={() => setReplyingTo(item)}>
                  <TouchableOpacity
                    activeOpacity={0.9}
                    onLongPress={() => {
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
                      setActiveReactionMsg(item);
                    }}
                    style={isMe ? myBubbleStyle : theirBubbleStyle}
                  >
                    {hasImage && (
                      <TouchableOpacity onPress={() => setSelectedImage(item.image || null)}>
                        <Image
                          source={{ uri: item.image }}
                          style={[
                            s.msgImg,
                            {
                              borderTopLeftRadius: 14,
                              borderTopRightRadius: 14,
                              borderBottomLeftRadius: item.content ? 0 : 14,
                              borderBottomRightRadius: item.content ? 0 : 14,
                            },
                          ]}
                          resizeMode="cover"
                        />
                      </TouchableOpacity>
                    )}

                    {!!item.content && (
                      <View style={[s.captionContainer, hasImage && { paddingHorizontal: 8, paddingTop: 6, paddingBottom: 4 }]}>
                        {item.content.startsWith('💬 Replying to: ') ? (() => {
                          const parts = item.content.split('\n\n');
                          const quotePart = parts[0];
                          const replyText = parts.slice(1).join('\n\n');
                          return (
                            <View>
                              <View
                                style={{
                                  backgroundColor: isMe ? 'rgba(0,0,0,0.15)' : 'rgba(255,255,255,0.06)',
                                  borderLeftWidth: 3,
                                  borderLeftColor: isMe ? '#FFF' : themeColors.ogi,
                                  paddingHorizontal: 8, paddingVertical: 4,
                                  borderRadius: 6, marginBottom: 6,
                                }}
                              >
                                <Text style={{ fontSize: 11, color: isMe ? 'rgba(255,255,255,0.85)' : themeColors.txt2 }} numberOfLines={1}>
                                  {quotePart}
                                </Text>
                              </View>
                              <Text style={[s.msgText, { color: isMe ? '#FFF' : themeColors.txt }]}>{replyText}</Text>
                            </View>
                          );
                        })() : (
                          <Text style={[s.msgText, { color: isMe ? '#FFF' : themeColors.txt }]}>{item.content}</Text>
                        )}
                      </View>
                    )}

                    {/* Time + Ticks */}
                    <View style={[s.msgBubbleMeta, hasImage && !item.content && s.msgMetaOverlay]}>
                      <Text
                        style={[
                          s.msgTime,
                          { color: isMe ? 'rgba(255,255,255,0.7)' : themeColors.txt3 },
                          hasImage && !item.content && { color: '#FFF', textShadowColor: 'rgba(0,0,0,0.5)', textShadowRadius: 3 },
                        ]}
                      >
                        {formatMessageTime(item.createdAt)}
                      </Text>
                      {renderTicks(item)}
                    </View>

                    {/* Reactions Pill */}
                    {item.reactions && Object.keys(item.reactions).length > 0 && (() => {
                      const reactionList = Object.values(item.reactions);
                      const uniqueEmojis = Array.from(new Set(reactionList)).slice(0, 3);
                      return (
                        <View
                          style={[
                            s.reactionPill,
                            isMe ? { left: 8 } : { right: 8 },
                            { backgroundColor: themeColors.card, borderColor: themeColors.bdr },
                          ]}
                        >
                          <Text style={[s.reactionText, { color: themeColors.txt }]}>
                            {uniqueEmojis.join('')}{reactionList.length > 1 ? ` ${reactionList.length}` : ''}
                          </Text>
                        </View>
                      );
                    })()}
                  </TouchableOpacity>
                </SwipeableMessage>
              </View>
            );

            // Received messages get avatar grouping treatment
            if (!isMe) {
              return (
                <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 6, paddingLeft: 8 }}>
                  {item.isLastInGroup ? (
                    <View
                      style={{
                        width: 30, height: 30, borderRadius: 15,
                        backgroundColor: themeColors.card2,
                        alignItems: 'center', justifyContent: 'center',
                        marginBottom: (item.reactions && Object.keys(item.reactions).length > 0) ? 20 : item.isConsecutive ? 3 : 12,
                      }}
                    >
                      <Text style={{ fontSize: 14 }}>{otherAvatar}</Text>
                    </View>
                  ) : (
                    <View style={{ width: 30 }} />
                  )}
                  <View style={{ flex: 1 }}>
                    {messageBubble}
                  </View>
                </View>
              );
            }

            return messageBubble;
          }}
          ListEmptyComponent={() => (
            <View style={s.empty}>
              <Text style={{ fontSize: 40, marginBottom: 16 }}>👋</Text>
              <Text style={[s.emptyTxt, { color: themeColors.txt2 }]}>Break the ice!</Text>
              <Text style={[s.emptyDesc, { color: themeColors.txt3 }]}>
                Messages are anonymous and end-to-end encrypted. Be yourself.
              </Text>
            </View>
          )}
        />

        {/* ── Animated Typing Indicator ── */}
        {isOtherTyping && <TypingIndicator />}

        {/* ── Input Bar ── */}
        <View
          style={[
            s.inputWrap,
            {
              borderTopColor: themeColors.bdr,
              backgroundColor: 'transparent',
            },
          ]}
        >
          {replyingTo && (
            <View
              style={{
                flexDirection: 'row', alignItems: 'center',
                backgroundColor: themeColors.card2,
                borderLeftWidth: 4, borderLeftColor: themeColors.ogi,
                padding: 10, borderRadius: 12, marginBottom: 10, gap: 12,
              }}
            >
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 11, fontWeight: '800', color: themeColors.ogi, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                  Replying to {replyingTo.senderType === 'me' ? 'Myself' : otherName}
                </Text>
                <Text style={{ fontSize: 13, color: themeColors.txt2, marginTop: 2 }} numberOfLines={1}>
                  {replyingTo.content?.startsWith('💬 Replying to: ')
                    ? replyingTo.content.split('\n\n').slice(1).join('\n\n')
                    : replyingTo.content || (replyingTo.image ? '📷 Photo' : '')}
                </Text>
              </View>
              <TouchableOpacity onPress={() => setReplyingTo(null)} style={{ padding: 4 }}>
                <Ionicons name="close-circle" size={20} color={themeColors.txt3} />
              </TouchableOpacity>
            </View>
          )}

          {image && (
            <View style={s.previewWrap}>
              <Image source={{ uri: image }} style={s.preview} resizeMode="contain" />
              <TouchableOpacity onPress={() => setImage('')} style={s.removeBtn}>
                <Text style={s.removeTxt}>✕</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* Attachment popup */}
          {showAttachment && (
            <View style={[s.attachmentMenu, { backgroundColor: themeColors.card, borderColor: themeColors.bdr }]}>
              <TouchableOpacity onPress={() => { setShowAttachment(false); pickImage(); }} style={s.attachmentOption}>
                <View style={[s.attachmentIconBg, { backgroundColor: '#4F46E5' }]}>
                  <Ionicons name="image-outline" size={20} color="#FFF" />
                </View>
                <Text style={[s.attachmentText, { color: themeColors.txt }]}>Gallery</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => { setShowAttachment(false); takePhoto(); }} style={s.attachmentOption}>
                <View style={[s.attachmentIconBg, { backgroundColor: '#EF4444' }]}>
                  <Ionicons name="camera-outline" size={20} color="#FFF" />
                </View>
                <Text style={[s.attachmentText, { color: themeColors.txt }]}>Camera</Text>
              </TouchableOpacity>
            </View>
          )}

          <View style={{ flexDirection: 'row', alignItems: 'center', width: '100%', gap: 8 }}>
            {/* Input container */}
            <View
              style={[
                s.inputContainer,
                {
                  backgroundColor: themeColors.bg2,
                  borderColor: themeColors.bdr,
                  borderWidth: 1,
                  shadowColor: '#000',
                  shadowOffset: { width: 0, height: 2 },
                  shadowOpacity: isDark ? 0.3 : 0.08,
                  shadowRadius: 6,
                  elevation: 3,
                },
              ]}
            >
              <TouchableOpacity onPress={() => setShowAttachment(!showAttachment)} style={s.plusBtn}>
                <Ionicons name={showAttachment ? 'close' : 'add'} size={22} color={themeColors.txt2} />
              </TouchableOpacity>

              <TextInput
                style={[s.input, { color: themeColors.txt }]}
                placeholder="Type a message..."
                placeholderTextColor={themeColors.txt3}
                value={inputText}
                onChangeText={(text) => {
                  setInputText(text);
                  if (showAttachment) setShowAttachment(false);

                  if (token && id) {
                    const sock = getSocket(token);
                    if (!isTypingRef.current) {
                      isTypingRef.current = true;
                      sock.emit('typing', id);
                    }
                    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
                    typingTimeoutRef.current = setTimeout(() => {
                      isTypingRef.current = false;
                      sock.emit('stopTyping', id);
                    }, 2000);
                  }
                }}
                onFocus={() => setShowAttachment(false)}
                multiline
                maxLength={500}
              />

              <TouchableOpacity onPress={takePhoto} style={s.cameraBtnInside}>
                <Ionicons name="camera-outline" size={20} color={themeColors.txt2} />
              </TouchableOpacity>
            </View>

            {/* Send button */}
            <TouchableOpacity
              style={[
                s.sendBtnCircle,
                (!inputText.trim() && !image || isPending || isUploading) && { opacity: 0.6 },
                { backgroundColor: themeColors.ogi },
              ]}
              onPress={handleSend}
              disabled={(!inputText.trim() && !image) || isPending || isUploading}
            >
              {isUploading || isPending ? (
                <ActivityIndicator size="small" color="#FFF" />
              ) : (
                <Ionicons name="send" size={17} color="#FFF" style={{ marginLeft: 2 }} />
              )}
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>

      {/* ── Reactions Picker Modal ── */}
      <Modal
        visible={activeReactionMsg !== null}
        transparent
        animationType="fade"
        onRequestClose={() => setActiveReactionMsg(null)}
      >
        <TouchableWithoutFeedback onPress={() => setActiveReactionMsg(null)}>
          <View style={s.reactionModalOverlay}>
            <TouchableWithoutFeedback>
              <View style={[s.reactionModalContainer, { backgroundColor: themeColors.card, borderColor: themeColors.bdr }]}>
                {REACTION_EMOJIS.map((emoji) => {
                  const hasReacted = activeReactionMsg?.reactions?.[user?._id || ''] === emoji;
                  return (
                    <TouchableOpacity
                      key={emoji}
                      style={[s.reactionEmojiBtn, hasReacted && { backgroundColor: themeColors.ogi + '25' }]}
                      onPress={() => handleReact(activeReactionMsg._id, emoji)}
                    >
                      <Text style={{ fontSize: 28 }}>{emoji}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>

      {/* ── Lightbox ── */}
      {selectedImage && (
        <View style={s.lightboxBg}>
          <SafeAreaView style={{ flex: 1, width: '100%' }}>
            <View style={s.lightboxHeader}>
              <TouchableOpacity onPress={() => setSelectedImage(null)} style={s.lightboxBtn}>
                <Ionicons name="close-outline" size={28} color="#FFF" />
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => {
                  if (Platform.OS === 'web') {
                    window.open(selectedImage, '_blank');
                  } else {
                    import('react-native').then(({ Linking }) => {
                      Linking.openURL(selectedImage);
                    });
                  }
                }}
                style={s.lightboxBtn}
              >
                <Ionicons name="download-outline" size={24} color="#FFF" />
              </TouchableOpacity>
            </View>
            <View style={s.lightboxImageContainer}>
              <Image source={{ uri: selectedImage }} style={s.lightboxImage} resizeMode="contain" />
            </View>
          </SafeAreaView>
        </View>
      )}
    </SafeAreaView>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Styles
// ─────────────────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 12, paddingVertical: 10, borderBottomWidth: 0.5,
  },
  backBtn: { width: 40, height: 40, justifyContent: 'center', alignItems: 'center' },
  headerCenter: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 12 },
  headerAvatar: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  headerName: { fontSize: 16, fontWeight: '700', fontFamily: 'PlusJakartaSans_700Bold' },
  statusTxt: { fontSize: 11, marginTop: 1 },
  headerRight: { flexDirection: 'row', alignItems: 'center', marginRight: 8 },

  listContent: { padding: 12, paddingBottom: 8 },

  msgWrapper: { marginBottom: 12, maxWidth: '85%' },
  msgLeft: { alignSelf: 'flex-start' },
  msgRight: { alignSelf: 'flex-end' },

  msgBubble: { borderRadius: 18, padding: 10, minWidth: 80 },
  myBubble: { borderBottomRightRadius: 4 },
  theirBubble: { borderBottomLeftRadius: 4 },

  msgText: { fontSize: 15, lineHeight: 22, fontFamily: 'PlusJakartaSans_500Medium' },
  captionContainer: { width: '100%' },
  msgImg: { width: 240, height: 180, marginBottom: 4 },

  empty: { alignItems: 'center', marginTop: 60 },
  emptyTxt: { fontSize: 26, fontWeight: '900', marginBottom: 8 },
  emptyDesc: { fontSize: 13, textAlign: 'center', paddingHorizontal: 50, lineHeight: 20 },

  msgBubbleMeta: {
    flexDirection: 'row', alignSelf: 'flex-end',
    alignItems: 'center', marginTop: 2, marginRight: 2,
  },
  msgMetaOverlay: {
    position: 'absolute', bottom: 8, right: 8,
    backgroundColor: 'rgba(0,0,0,0.4)',
    borderRadius: 8, paddingHorizontal: 6, paddingVertical: 2,
  },
  msgTime: { fontSize: 10, fontWeight: '600' },

  inputWrap: {
    padding: 12,
    borderTopWidth: 1,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.05,
    shadowRadius: 5,
  },
  inputContainer: {
    flex: 1, flexDirection: 'row', alignItems: 'center',
    borderRadius: 28, paddingHorizontal: 12, paddingVertical: 2,
    minHeight: 44, maxHeight: 120,
  },
  plusBtn: { marginRight: 4, width: 32, height: 32, justifyContent: 'center', alignItems: 'center' },
  cameraBtnInside: { marginLeft: 4, width: 32, height: 32, justifyContent: 'center', alignItems: 'center' },
  input: { flex: 1, fontSize: 15, paddingVertical: 8, paddingHorizontal: 4, minHeight: 32, maxHeight: 100 },
  sendBtnCircle: {
    width: 44, height: 44, borderRadius: 22,
    justifyContent: 'center', alignItems: 'center',
  },

  attachmentMenu: {
    position: 'absolute', bottom: 70, left: 10,
    borderRadius: 16, borderWidth: 1, padding: 12,
    flexDirection: 'row', gap: 16,
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1, shadowRadius: 8, elevation: 5, zIndex: 100,
  },
  attachmentOption: { alignItems: 'center', justifyContent: 'center', width: 55 },
  attachmentIconBg: {
    width: 40, height: 40, borderRadius: 20,
    justifyContent: 'center', alignItems: 'center', marginBottom: 6,
  },
  attachmentText: { fontSize: 11, fontWeight: '700' },

  previewWrap: {
    width: '100%', height: 150, borderRadius: 12, overflow: 'hidden',
    position: 'relative', marginBottom: 12, backgroundColor: '#F9F9F9',
    borderWidth: 1, borderColor: '#EEE',
  },
  preview: { width: '100%', height: '100%' },
  removeBtn: {
    position: 'absolute', top: 5, right: 5,
    backgroundColor: 'rgba(0,0,0,0.6)', borderRadius: 12,
    width: 24, height: 24, alignItems: 'center', justifyContent: 'center',
  },
  removeTxt: { color: '#fff', fontSize: 12, fontWeight: '700' },

  revealBanner: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 0.5,
  },
  revealBannerTxt: { fontSize: 12, fontWeight: '700', fontFamily: 'PlusJakartaSans_700Bold', flexShrink: 1 },

  lightboxBg: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.95)',
    zIndex: 9999, justifyContent: 'center', alignItems: 'center',
  },
  lightboxHeader: {
    flexDirection: 'row', justifyContent: 'space-between',
    paddingHorizontal: 20, paddingVertical: 10, width: '100%',
  },
  lightboxBtn: {
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center', justifyContent: 'center',
  },
  lightboxImageContainer: {
    flex: 1, justifyContent: 'center', alignItems: 'center',
    width: '100%', padding: 10,
  },
  lightboxImage: { width: '100%', height: '100%' },

  searchInput: { flex: 1, fontSize: 14, fontFamily: 'PlusJakartaSans_500Medium' },

  reactionModalOverlay: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center', alignItems: 'center',
  },
  reactionModalContainer: {
    flexDirection: 'row', padding: 12, borderRadius: 24, borderWidth: 1, gap: 8,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15, shadowRadius: 4, elevation: 5,
  },
  reactionEmojiBtn: { width: 44, height: 44, borderRadius: 22, justifyContent: 'center', alignItems: 'center' },

  reactionPill: {
    position: 'absolute', bottom: -10, borderRadius: 12, borderWidth: 1,
    paddingHorizontal: 6, paddingVertical: 2,
    flexDirection: 'row', alignItems: 'center',
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05, shadowRadius: 1, elevation: 1, zIndex: 999,
  },
  reactionText: { fontSize: 11, fontFamily: 'PlusJakartaSans_600SemiBold' },
});
