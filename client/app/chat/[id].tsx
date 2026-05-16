import React, { useState, useEffect, useRef } from 'react';
import { View, Text, TextInput, TouchableOpacity, FlatList, KeyboardAvoidingView, Platform, StyleSheet, ActivityIndicator, Image, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useUIStore } from '../../src/store/uiStore';
import { getColors } from '../../src/theme/colors';
import { useMessages, useSendMessage } from '../../src/hooks/useChat';
import { useBlockUser } from '../../src/hooks/useAuth';
import { useAuthStore } from '../../src/store/authStore';
import * as ImagePicker from 'expo-image-picker';
import EmojiPicker from '../../src/components/EmojiPicker';
import { uploadToCloudinary } from '../../src/utils/uploadToCloudinary';
import { Ionicons } from '@expo/vector-icons';
import { formatMessageTime } from '../../src/utils/time';

export default function ChatRoomScreen() {
  const { id, name, isGroup } = useLocalSearchParams();
  const router = useRouter();
  const { isDark } = useUIStore();
  const themeColors = getColors(isDark);
  const { user } = useAuthStore();
  
  const [inputText, setInputText] = useState('');
  const [image, setImage] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [showEmoji, setShowEmoji] = useState(false);
  const flatListRef = useRef<FlatList>(null);

  const { data, isLoading } = useMessages(id as string);
  const { mutate: sendMessage, isPending } = useSendMessage();
  const { mutate: blockUser } = useBlockUser();

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
    setShowEmoji(false);
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

  if (isLoading) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: themeColors.bg, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator color={themeColors.ogi} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: themeColors.bg }}>
      <KeyboardAvoidingView 
        style={{ flex: 1 }} 
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
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
            <TouchableOpacity onPress={handleBlock}>
              <Ionicons name="shield-outline" size={20} color={themeColors.danger} />
            </TouchableOpacity>
          </View>
        </View>

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
            const isRead = item.readBy && item.readBy.length > 1;

            return (
              <View style={[s.msgWrapper, isMe ? s.msgRight : s.msgLeft]}>
                <View style={[
                  s.msgBubble, 
                  isMe ? [s.myBubble, { backgroundColor: themeColors.ogi }] : [s.theirBubble, { backgroundColor: themeColors.card2 }]
                ]}>
                  {!!item.image && (
                    <Image source={{ uri: item.image }} style={s.msgImg} resizeMode="cover" />
                  )}
                  <Text style={[s.msgText, { color: isMe ? '#FFF' : themeColors.txt }]}>{item.content}</Text>
                </View>
                <View style={[s.msgMeta, isMe ? { alignSelf: 'flex-end' } : { alignSelf: 'flex-start' }]}>
                  <Text style={[s.msgTime, { color: themeColors.txt3 }]}>
                    {formatMessageTime(item.createdAt)}
                  </Text>
                  {isMe && (
                    <Ionicons 
                      name={isRead ? "checkmark-done" : "checkmark"} 
                      size={14} 
                      color={isRead ? themeColors.ogi : themeColors.txt3} 
                      style={{ marginLeft: 4 }}
                    />
                  )}
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
        <View style={[s.inputWrap, { borderTopColor: themeColors.bdr, backgroundColor: themeColors.card, flexDirection: 'column' }]}>
          {image && (
            <View style={s.previewWrap}>
              <Image source={{ uri: image }} style={s.preview} resizeMode="contain" />
              <TouchableOpacity onPress={() => setImage('')} style={s.removeBtn}>
                <Text style={s.removeTxt}>✕</Text>
              </TouchableOpacity>
            </View>
          )}
          <View style={{ flexDirection: 'row', alignItems: 'flex-end', width: '100%', gap: 8 }}>
            <TouchableOpacity onPress={() => setShowEmoji(!showEmoji)} style={s.mediaBtn}>
              <Text style={{ fontSize: 20 }}>{showEmoji ? '⌨️' : '😀'}</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={pickImage} style={s.mediaBtn}>
              <Text style={{ fontSize: 20 }}>🖼️</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={takePhoto} style={s.mediaBtn}>
              <Text style={{ fontSize: 20 }}>📸</Text>
            </TouchableOpacity>
            <TextInput
              style={[s.input, { color: themeColors.txt, backgroundColor: themeColors.bg2, borderColor: themeColors.bdr }]}
              placeholder="Type a message..."
              placeholderTextColor={themeColors.txt3}
              value={inputText}
              onChangeText={(text) => {
                setInputText(text);
                if (showEmoji) setShowEmoji(false);
              }}
              onFocus={() => setShowEmoji(false)}
              multiline
              maxLength={500}
            />
            <TouchableOpacity 
              style={[s.sendBtn, (!inputText.trim() && !image || isPending || isUploading) && { opacity: 0.5 }, { backgroundColor: themeColors.ogi }]} 
              onPress={handleSend}
              disabled={(!inputText.trim() && !image) || isPending || isUploading}
            >
              <Text style={s.sendTxt}>{isUploading ? '...' : 'Send'}</Text>
            </TouchableOpacity>
          </View>
          {showEmoji && (
            <EmojiPicker 
              themeColors={themeColors} 
              onSelect={(emoji) => setInputText(prev => prev + emoji)} 
            />
          )}
        </View>
      </KeyboardAvoidingView>
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
  headerRight: { width: 40, height: 40, justifyContent: 'center', alignItems: 'center' },
  listContent: { padding: 16, paddingBottom: 32 },
  msgWrapper: { marginBottom: 16, maxWidth: '85%' },
  msgLeft: { alignSelf: 'flex-start' },
  msgRight: { alignSelf: 'flex-end' },
  msgBubble: { borderRadius: 18, padding: 12, minWidth: 60 },
  myBubble: { borderBottomRightRadius: 4 },
  theirBubble: { borderBottomLeftRadius: 4 },
  msgText: { fontSize: 15, lineHeight: 22, fontFamily: 'PlusJakartaSans_500Medium' },
  msgMeta: { flexDirection: 'row', alignItems: 'center', marginTop: 4, paddingHorizontal: 4 },
  msgTime: { fontSize: 10, fontWeight: '600' },
  msgImg: { width: 220, height: 160, borderRadius: 14, marginBottom: 8 },
  empty: { alignItems: 'center', marginTop: 60 },
  emptyTxt: { fontSize: 26, fontWeight: '900', marginBottom: 8 },
  emptyDesc: { fontSize: 13, textAlign: 'center', paddingHorizontal: 50, lineHeight: 20 },
  inputWrap: { padding: 12, borderTopWidth: 1 },
  input: { flex: 1, minHeight: 40, maxHeight: 100, borderWidth: 1, borderRadius: 20, paddingHorizontal: 16, paddingVertical: 10, fontSize: 15 },
  mediaBtn: { height: 40, width: 40, justifyContent: 'center', alignItems: 'center' },
  sendBtn: { height: 40, paddingHorizontal: 20, borderRadius: 20, justifyContent: 'center', alignItems: 'center' },
  sendTxt: { color: '#FFF', fontWeight: '700', fontSize: 15 },
  previewWrap: { width: '100%', height: 150, borderRadius: 12, overflow: 'hidden', position: 'relative', marginBottom: 12, backgroundColor: '#F9F9F9', borderWidth: 1, borderColor: '#EEE' },
  preview: { width: '100%', height: '100%' },
  removeBtn: { position: 'absolute', top: 5, right: 5, backgroundColor: 'rgba(0,0,0,0.6)', borderRadius: 12, width: 24, height: 24, alignItems: 'center', justifyContent: 'center' },
  removeTxt: { color: '#fff', fontSize: 12, fontWeight: '700' },
});
