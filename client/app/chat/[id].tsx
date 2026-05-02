import React, { useState, useEffect, useRef } from 'react';
import { View, Text, TextInput, TouchableOpacity, FlatList, KeyboardAvoidingView, Platform, StyleSheet, SafeAreaView, ActivityIndicator } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useUIStore } from '../../src/store/uiStore';
import { getColors } from '../../src/theme/colors';
import { useMessages, useSendMessage } from '../../src/hooks/useChat';
import { useAuthStore } from '../../src/store/authStore';

export default function ChatRoomScreen() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const { isDark } = useUIStore();
  const themeColors = getColors(isDark);
  const { user } = useAuthStore();
  
  const [inputText, setInputText] = useState('');
  const flatListRef = useRef<FlatList>(null);

  const { data, isLoading } = useMessages(id as string);
  const { mutate: sendMessage, isPending } = useSendMessage();

  const messages = data?.messages || [];
  const chatInfo = data?.chat;

  // Determine other user's identity to show in header
  let otherName = "Anonymous";
  let otherAvatar = "👤";
  
  if (chatInfo?.identities && user?._id) {
    const identities = chatInfo.identities;
    const otherId = Object.keys(identities).find(key => key !== user._id);
    if (otherId && identities[otherId]) {
      otherName = identities[otherId].name;
      otherAvatar = identities[otherId].avatar;
    }
  }

  const handleSend = () => {
    if (!inputText.trim()) return;
    sendMessage({ chatId: id as string, content: inputText });
    setInputText('');
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
            const isMe = item.senderId === user?._id;
            return (
              <View style={[s.msgWrapper, isMe ? s.msgRight : s.msgLeft]}>
                <View style={[
                  s.msgBubble, 
                  isMe ? [s.myBubble, { backgroundColor: themeColors.ogi }] : [s.theirBubble, { backgroundColor: themeColors.card2 }]
                ]}>
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
        <View style={[s.inputWrap, { borderTopColor: themeColors.bdr, backgroundColor: themeColors.card }]}>
          <TextInput
            style={[s.input, { color: themeColors.txt, backgroundColor: themeColors.bg2, borderColor: themeColors.bdr }]}
            placeholder="Type a message..."
            placeholderTextColor={themeColors.txt3}
            value={inputText}
            onChangeText={setInputText}
            multiline
            maxLength={500}
          />
          <TouchableOpacity 
            style={[s.sendBtn, (!inputText.trim() || isPending) && { opacity: 0.5 }, { backgroundColor: themeColors.ogi }]} 
            onPress={handleSend}
            disabled={!inputText.trim() || isPending}
          >
            <Text style={s.sendTxt}>Send</Text>
          </TouchableOpacity>
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
  empty: { alignItems: 'center', marginTop: 40 },
  emptyTxt: { color: '#888', fontStyle: 'italic' },
  inputWrap: { flexDirection: 'row', alignItems: 'flex-end', padding: 12, borderTopWidth: 1, gap: 8 },
  input: { flex: 1, minHeight: 40, maxHeight: 100, borderWidth: 1, borderRadius: 20, paddingHorizontal: 16, paddingVertical: 10, fontSize: 15 },
  sendBtn: { height: 40, paddingHorizontal: 20, borderRadius: 20, justifyContent: 'center', alignItems: 'center' },
  sendTxt: { color: '#FFF', fontWeight: '700', fontSize: 15 },
});
