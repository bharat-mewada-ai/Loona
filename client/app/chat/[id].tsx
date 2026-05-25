import React, { useState, useEffect, useRef } from 'react';
import { View, Text, TextInput, TouchableOpacity, FlatList, KeyboardAvoidingView, Platform, StyleSheet, ActivityIndicator, Image, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import { useUIStore } from '../../src/store/uiStore';
import { getColors } from '../../src/theme/colors';
import { useMessages, useSendMessage, useRevealIdentity, useDeleteChat } from '../../src/hooks/useChat';
import { useBlockUser } from '../../src/hooks/useAuth';
import { useAuthStore } from '../../src/store/authStore';
import * as ImagePicker from 'expo-image-picker';
import { uploadToCloudinary } from '../../src/utils/uploadToCloudinary';
import { Ionicons } from '@expo/vector-icons';
import { formatMessageTime } from '../../src/utils/time';
import { useAnalytics } from '../../src/hooks/useAnalytics';

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
  const flatListRef = useRef<FlatList>(null);

  const { data, isLoading, isError } = useMessages(id as string);
  const { mutate: sendMessage, isPending } = useSendMessage();
  const { mutate: blockUser } = useBlockUser();
  const { mutate: reveal } = useRevealIdentity();
  const { mutate: deleteChat } = useDeleteChat();

  const messages = data?.messages || [];
  const chatInfo = data?.chat;

  // Header Logic
  let otherName = (name as string) || "Anonymous";
  let otherAvatar = isGroup === 'true' ? "💬" : "👤";
  
  if (!isGroup && chatInfo?.identities) {
    otherName = chatInfo.identities.other?.name || "Anonymous";
    otherAvatar = chatInfo.identities.other?.avatar || "👤";
  }

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
      const result = await ImagePicker.launchCameraAsync({
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

  const handleSend = () => {
    if (!inputText.trim() && !image) return;
    sendMessage({ chatId: id as string, content: inputText, image: image || undefined });
    setInputText('');
    setImage('');
    setShowAttachment(false);
  };
  
  const handleBlock = () => {
    const otherId = chatInfo?.identities?.other?.id;
    if (!otherId) return;

    Alert.alert(
      "Block User?",
      `Are you sure you want to block ${otherName}? You will no longer see their posts and this chat will be archived.`,
      [
        { text: "Cancel", style: "cancel" },
        { 
          text: "Block", 
          style: "destructive",
          onPress: () => {
            blockUser(otherId, {
              onSuccess: () => {
                router.back();
                Alert.alert("Blocked", "User has been blocked.");
              }
            });
          }
        }
      ]
    );
  };

  const handleReveal = () => {
    Alert.alert(
      "Reveal Your Identity?",
      "This will show your real profile name and avatar to the other participant. This action cannot be undone.",
      [
        { text: "Cancel", style: "cancel" },
        { 
          text: "Reveal", 
          style: "destructive",
          onPress: () => {
            reveal(id as string, {
              onSuccess: () => {
                Alert.alert("Identity Revealed", "Your real identity has been successfully revealed to this user!");
              }
            });
          }
        }
      ]
    );
  };

  const handleDeleteChat = () => {
    Alert.alert(
      "Delete Chat?",
      "Are you sure you want to delete this entire chat and all its messages? This action cannot be undone.",
      [
        { text: "Cancel", style: "cancel" },
        { 
          text: "Delete", 
          style: "destructive",
          onPress: () => {
            deleteChat(id as string, {
              onSuccess: () => {
                router.back();
                Alert.alert("Deleted", "Chat has been deleted.");
              },
              onError: (err: any) => {
                Alert.alert("Error", err.response?.data?.error || "Could not delete chat.");
              }
            });
          }
        }
      ]
    );
  };

  const renderTicks = (item: any) => {
    const isMe = item.senderType === 'me';
    if (!isMe) return null;

    const isRead = item.readBy && item.readBy.length > 1;
    
    // Determine delivery status: if the other user has been active since the message was created
    const otherLastActive = chatInfo?.identities?.other?.lastActive;
    let isDelivered = false;
    
    if (otherLastActive) {
      const msgTime = new Date(item.createdAt).getTime();
      const activeTime = new Date(otherLastActive).getTime();
      isDelivered = activeTime >= msgTime;
    }

    if (isRead) {
      // Double blue ticks
      return <Ionicons name="checkmark-done" size={15} color="#34B7F1" style={{ marginLeft: 3 }} />;
    } else if (isDelivered) {
      // Double grey ticks
      return <Ionicons name="checkmark-done" size={15} color="rgba(255,255,255,0.55)" style={{ marginLeft: 3 }} />;
    } else {
      // Single grey tick
      return <Ionicons name="checkmark" size={15} color="rgba(255,255,255,0.55)" style={{ marginLeft: 3 }} />;
    }
  };

  if (isLoading) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: themeColors.bg, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator color={themeColors.ogi} />
      </SafeAreaView>
    );
  }

  if (isError || (!isLoading && !data)) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: themeColors.bg, justifyContent: 'center', alignItems: 'center', padding: 24 }}>
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

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: themeColors.bg }}>
      <Stack.Screen options={{ headerShown: false }} />
      <KeyboardAvoidingView 
        style={{ flex: 1 }} 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.select({ ios: 0, android: 10 })}
      >
        {/* Header */}
        <View style={[s.header, { borderBottomColor: themeColors.bdr, backgroundColor: themeColors.bg }]}>
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
              <Text style={[s.statusTxt, { color: themeColors.txt3 }]}>Last seen recently</Text>
            </View>
          </TouchableOpacity>
          <View style={s.headerRight}>
            <TouchableOpacity onPress={handleBlock} style={{ marginRight: 14 }}>
              <Ionicons name="shield-outline" size={20} color={themeColors.danger} style={{ opacity: 0.9 }} />
            </TouchableOpacity>
            <TouchableOpacity onPress={handleDeleteChat}>
              <Ionicons name="trash-outline" size={20} color={themeColors.danger} />
            </TouchableOpacity>
          </View>
        </View>

        {/* Reveal Identity Banner */}
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

        {/* Messages */}
        <FlatList
          ref={flatListRef}
          data={messages}
          keyExtractor={(item) => item._id}
          contentContainerStyle={s.listContent}
          onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
          onLayout={() => flatListRef.current?.scrollToEnd({ animated: true })}
          renderItem={({ item }) => {
            const isMe = item.senderType === 'me';
            const hasImage = !!item.image;

            return (
              <View style={[s.msgWrapper, isMe ? s.msgRight : s.msgLeft]}>
                <View style={[
                  s.msgBubble, 
                  isMe ? [s.myBubble, { backgroundColor: themeColors.ogi }] : [s.theirBubble, { backgroundColor: themeColors.card2 }],
                  hasImage && { padding: 4 } // edge-to-edge style inside bubble for images
                ]}>
                  {hasImage && (
                    <TouchableOpacity onPress={() => setSelectedImage(item.image)}>
                      <Image 
                        source={{ uri: item.image }} 
                        style={[
                          s.msgImg,
                          {
                            borderTopLeftRadius: 14,
                            borderTopRightRadius: 14,
                            borderBottomLeftRadius: item.content ? 0 : 14,
                            borderBottomRightRadius: item.content ? 0 : 14,
                          }
                        ]} 
                        resizeMode="cover" 
                      />
                    </TouchableOpacity>
                  )}
                  
                  {!!item.content && (
                    <View style={[s.captionContainer, hasImage && { paddingHorizontal: 8, paddingTop: 6, paddingBottom: 4 }]}>
                      <Text style={[s.msgText, { color: isMe ? '#FFF' : themeColors.txt }]}>{item.content}</Text>
                    </View>
                  )}

                  {/* Time + Ticks overlay (inside the bubble) */}
                  <View style={[s.msgBubbleMeta, hasImage && !item.content && s.msgMetaOverlay]}>
                    <Text style={[
                      s.msgTime, 
                      { color: isMe ? 'rgba(255,255,255,0.7)' : themeColors.txt3 },
                      hasImage && !item.content && { color: '#FFF', textShadowColor: 'rgba(0,0,0,0.5)', textShadowRadius: 3 }
                    ]}>
                      {formatMessageTime(item.createdAt)}
                    </Text>
                    {renderTicks(item)}
                  </View>

                </View>
              </View>
            );
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

        {/* Input */}
        <View style={[s.inputWrap, { borderTopColor: themeColors.bdr, backgroundColor: themeColors.card }]}>
          {image && (
            <View style={s.previewWrap}>
              <Image source={{ uri: image }} style={s.preview} resizeMode="contain" />
              <TouchableOpacity onPress={() => setImage('')} style={s.removeBtn}>
                <Text style={s.removeTxt}>✕</Text>
              </TouchableOpacity>
            </View>
          )}
          
          {/* WhatsApp-Style Attachment popup drawer */}
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
            
            {/* The Text Box Container wrapping both inputs and inside-icons */}
            <View style={[s.inputContainer, { backgroundColor: themeColors.bg2, borderColor: themeColors.bdr, borderWidth: 1 }]}>
              <TouchableOpacity onPress={() => setShowAttachment(!showAttachment)} style={s.plusBtn}>
                <Ionicons name={showAttachment ? "close" : "add"} size={22} color={themeColors.txt2} />
              </TouchableOpacity>
              
              <TextInput
                style={[s.input, { color: themeColors.txt }]}
                placeholder="Type a message..."
                placeholderTextColor={themeColors.txt3}
                value={inputText}
                onChangeText={(text) => {
                  setInputText(text);
                  if (showAttachment) setShowAttachment(false);
                }}
                onFocus={() => setShowAttachment(false)}
                multiline
                maxLength={500}
              />
              
              <TouchableOpacity onPress={takePhoto} style={s.cameraBtnInside}>
                <Ionicons name="camera-outline" size={20} color={themeColors.txt2} />
              </TouchableOpacity>
            </View>

            {/* Circular Send Button */}
            <TouchableOpacity 
              style={[
                s.sendBtnCircle, 
                (!inputText.trim() && !image || isPending || isUploading) && { opacity: 0.6 }, 
                { backgroundColor: themeColors.ogi }
              ]} 
              onPress={handleSend}
              disabled={(!inputText.trim() && !image) || isPending || isUploading}
            >
              {isUploading || isPending ? (
                <ActivityIndicator size="small" color="#FFF" />
              ) : (
                <Ionicons name="send" size={16} color="#FFF" style={{ marginLeft: 2 }} />
              )}
            </TouchableOpacity>

          </View>
        </View>
      </KeyboardAvoidingView>

      {/* Lightbox / Image Viewer Overlay */}
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
              <Image 
                source={{ uri: selectedImage }} 
                style={s.lightboxImage} 
                resizeMode="contain" 
              />
            </View>
          </SafeAreaView>
        </View>
      )}
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 12, paddingVertical: 10, borderBottomWidth: 0.5 },
  backBtn: { width: 40, height: 40, justifyContent: 'center', alignItems: 'center' },
  headerCenter: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 12 },
  headerAvatar: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  headerName: { fontSize: 16, fontWeight: '700', fontFamily: 'PlusJakartaSans_700Bold' },
  statusTxt: { fontSize: 11, marginTop: 1 },
  headerRight: { flexDirection: 'row', alignItems: 'center', marginRight: 8 },
  listContent: { padding: 16, paddingBottom: 32 },
  msgWrapper: { marginBottom: 12, maxWidth: '85%' },
  msgLeft: { alignSelf: 'flex-start' },
  msgRight: { alignSelf: 'flex-end' },
  msgBubble: { borderRadius: 16, padding: 10, minWidth: 80 },
  myBubble: { borderBottomRightRadius: 4 },
  theirBubble: { borderBottomLeftRadius: 4 },
  msgText: { fontSize: 15, lineHeight: 22, fontFamily: 'PlusJakartaSans_500Medium' },
  captionContainer: { width: '100%' },
  msgImg: { width: 240, height: 180, marginBottom: 4 },
  empty: { alignItems: 'center', marginTop: 60 },
  emptyTxt: { fontSize: 26, fontWeight: '900', marginBottom: 8 },
  emptyDesc: { fontSize: 13, textAlign: 'center', paddingHorizontal: 50, lineHeight: 20 },
  
  msgBubbleMeta: {
    flexDirection: 'row',
    alignSelf: 'flex-end',
    alignItems: 'center',
    marginTop: 2,
    marginRight: 2,
  },
  msgMetaOverlay: {
    position: 'absolute',
    bottom: 8,
    right: 8,
    backgroundColor: 'rgba(0,0,0,0.4)',
    borderRadius: 8,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  msgTime: { fontSize: 10, fontWeight: '600' },
  
  inputWrap: { 
    padding: 10, 
    borderTopWidth: 0.5,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.05,
    shadowRadius: 5
  },
  inputContainer: { 
    flex: 1, 
    flexDirection: 'row', 
    alignItems: 'center', 
    borderRadius: 24, 
    paddingHorizontal: 12, 
    paddingVertical: 2, 
    minHeight: 40, 
    maxHeight: 100 
  },
  plusBtn: { 
    marginRight: 4, 
    width: 32, 
    height: 32, 
    justifyContent: 'center', 
    alignItems: 'center' 
  },
  cameraBtnInside: { 
    marginLeft: 4, 
    width: 32, 
    height: 32, 
    justifyContent: 'center', 
    alignItems: 'center' 
  },
  input: { 
    flex: 1, 
    fontSize: 15, 
    paddingVertical: 8, 
    paddingHorizontal: 4, 
    minHeight: 32, 
    maxHeight: 80 
  },
  sendBtnCircle: { 
    width: 40, 
    height: 40, 
    borderRadius: 20, 
    justifyContent: 'center', 
    alignItems: 'center' 
  },
  
  attachmentMenu: {
    position: 'absolute',
    bottom: 65,
    left: 10,
    borderRadius: 16,
    borderWidth: 1,
    padding: 12,
    flexDirection: 'row',
    gap: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
    zIndex: 100,
  },
  attachmentOption: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 55,
  },
  attachmentIconBg: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 6,
  },
  attachmentText: {
    fontSize: 11,
    fontWeight: '700',
  },

  previewWrap: { width: '100%', height: 150, borderRadius: 12, overflow: 'hidden', position: 'relative', marginBottom: 12, backgroundColor: '#F9F9F9', borderWidth: 1, borderColor: '#EEE' },
  preview: { width: '100%', height: '100%' },
  removeBtn: { position: 'absolute', top: 5, right: 5, backgroundColor: 'rgba(0,0,0,0.6)', borderRadius: 12, width: 24, height: 24, alignItems: 'center', justifyContent: 'center' },
  removeTxt: { color: '#fff', fontSize: 12, fontWeight: '700' },
  revealBanner: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 0.5 },
  revealBannerTxt: { fontSize: 12, fontWeight: '700', fontFamily: 'PlusJakartaSans_700Bold', flexShrink: 1 },

  // Lightbox styles
  lightboxBg: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.95)',
    zIndex: 9999,
    justifyContent: 'center',
    alignItems: 'center',
  },
  lightboxHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 10,
    width: '100%',
  },
  lightboxBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  lightboxImageContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    width: '100%',
    padding: 10,
  },
  lightboxImage: {
    width: '100%',
    height: '100%',
  },
});
