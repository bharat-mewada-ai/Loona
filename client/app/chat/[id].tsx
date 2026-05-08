import React, { useState, useEffect, useRef } from 'react';
import { View, Text, TextInput, TouchableOpacity, FlatList, KeyboardAvoidingView, Platform, StyleSheet, SafeAreaView, ActivityIndicator, Image, Alert } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useUIStore } from '../../src/store/uiStore';
import { getColors } from '../../src/theme/colors';
import { useMessages, useSendMessage } from '../../src/hooks/useChat';
import { useAuthStore } from '../../src/store/authStore';
import * as ImagePicker from 'expo-image-picker';
import EmojiPicker from '../../src/components/EmojiPicker';
import { uploadToCloudinary } from '../../src/utils/uploadToCloudinary';

export default function ChatRoomScreen() {
  const { id } = useLocalSearchParams();
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

  const messages = data?.messages || [];
  const chatInfo = data?.chat;

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

  // Determine other user's identity to show in header
  let otherName = "Anonymous";
  let otherAvatar = "👤";
  
  if (chatInfo?.identities) {
    otherName = chatInfo.identities.other?.name || "Anonymous";
    otherAvatar = chatInfo.identities.other?.avatar || "👤";
  }

  const handleSend = () => {
    if (!inputText.trim() && !image) return;
    sendMessage({ chatId: id as string, content: inputText, image: image || undefined });
    setInputText('');
    setImage('');
    setShowEmoji(false);
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
        <View style={[s.header, { borderBottomColor: themeColors.bdr, backgroundColor: themeColors.card }]}>
          <TouchableOpacity onPress={() => router.back()} style={s.backBtn}>
            <Text style={[s.backTxt, { color: themeColors.txt }]}>← Back</Text>
          </TouchableOpacity>
          <View style={s.headerCenter}>
            <Text style={{ fontSize: 24 }}>{otherAvatar}</Text>
            <Text style={[s.headerName, { color: themeColors.txt }]}>{otherName}</Text>
          </View>
          <View style={s.backBtn} /> {/* Placeholder for balance */}
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
              </View>
            );
          }}
          ListEmptyComponent={() => (
            <View style={s.empty}>
              <Text style={s.emptyTxt}>Start the conversation anonymously...</Text>
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
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16, borderBottomWidth: 1 },
  backBtn: { width: 60 },
  backTxt: { fontSize: 16, fontWeight: '600' },
  headerCenter: { alignItems: 'center' },
  headerName: { fontFamily: 'Syne_700Bold', fontSize: 16, marginTop: 4 },
  listContent: { padding: 16, paddingBottom: 32 },
  msgWrapper: { marginBottom: 12, width: '100%' },
  msgRight: { alignItems: 'flex-end' },
  msgLeft: { alignItems: 'flex-start' },
  msgBubble: { maxWidth: '80%', paddingHorizontal: 16, paddingVertical: 10, borderRadius: 20 },
  myBubble: { borderBottomRightRadius: 4 },
  theirBubble: { borderBottomLeftRadius: 4 },
  msgText: { fontSize: 15, lineHeight: 20, fontFamily: 'PlusJakartaSans_400Regular' },
  msgImg: { width: 200, height: 150, borderRadius: 12, marginBottom: 8 },
  empty: { alignItems: 'center', marginTop: 40 },
  emptyTxt: { color: '#888', fontStyle: 'italic' },
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
