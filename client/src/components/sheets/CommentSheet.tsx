import React, { useState } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, Modal, Pressable,
  TextInput, ScrollView, ActivityIndicator, FlatList, Image, Alert, KeyboardAvoidingView, Platform
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { Colors, getColors } from '../../theme/colors';
import { useUIStore } from '../../store/uiStore';
import { useAuthStore } from '../../store/authStore';
import { useComments, useAddComment, useDeleteComment } from '../../hooks/usePosts';
import { useStartChat } from '../../hooks/useChat';
import { formatDistanceToNow } from '../../utils/time';
import { useRouter } from 'expo-router';
import EmojiPicker from '../EmojiPicker';

export default function CommentSheet() {
  const { showCommentSheet, closeCommentSheet, commentPostId, isDark } = useUIStore();
  const themeColors = getColors(isDark);
  const { user } = useAuthStore();
  
  const { data, isLoading } = useComments(commentPostId || '');
  const comments = data?.comments || [];
  
  const { mutate: addComment, isPending } = useAddComment();
  const { mutate: deleteComment } = useDeleteComment();
  const { mutate: startChat, isPending: startingChat } = useStartChat();
  const router = useRouter();
  
  const [content, setContent] = useState('');
  const [image, setImage] = useState('');
  const [showEmoji, setShowEmoji] = useState(false);
  const [isKeyboardVisible, setIsKeyboardVisible] = useState(false);

  const pickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      quality: 0.6,
      base64: true,
    });

    if (!result.canceled) {
      setImage(`data:image/jpeg;base64,${result.assets[0].base64}`);
    }
  };

  const takePhoto = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission Denied', 'Allow camera access to take photos.');
      return;
    }
    const result = await ImagePicker.launchCameraAsync({
      allowsEditing: true,
      quality: 0.6,
      base64: true,
    });
    if (!result.canceled) {
      setImage(`data:image/jpeg;base64,${result.assets[0].base64}`);
    }
  };

  const handleSubmit = () => {
    if (!content.trim() || !commentPostId) return;
    addComment({ id: commentPostId, content: content.trim(), image: image || undefined }, {
      onSuccess: () => {
        setContent('');
        setImage('');
      }
    });
  };

  const handleDelete = (commentId: string) => {
    Alert.alert('Delete Comment', 'Are you sure you want to delete this comment?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => deleteComment({ postId: commentPostId!, commentId }) }
    ]);
  };

  const handleStartChat = (targetUserId: string) => {
    if (startingChat || !commentPostId) return;
    startChat({ targetUserId, postId: commentPostId }, {
      onSuccess: (chat) => {
        closeCommentSheet();
        router.push(`/chat/${chat._id}`);
      }
    });
  };

  if (!commentPostId) return null;

  return (
    <Modal visible={showCommentSheet} transparent animationType="slide" onRequestClose={closeCommentSheet}>
      <Pressable style={s.overlay} onPress={closeCommentSheet}>
        <KeyboardAvoidingView 
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={s.keyboardView}
        >
          <Pressable style={[s.sheet, { backgroundColor: themeColors.card }]} onPress={e => e.stopPropagation()}>
            <View style={s.handle} />
            <Text style={[s.title, { color: themeColors.txt }]}>Comments ({data?.total || 0})</Text>

            <FlatList
              data={comments}
              keyExtractor={(item) => item._id}
              renderItem={({ item }) => (
                <View style={[s.comment, { borderBottomColor: themeColors.bdr }]}>
                  <View style={s.cHeader}>
                    <Text style={s.cAvatar}>{item.anonAvatar}</Text>
                    <Text style={[s.cName, { color: themeColors.txt2 }]}>{item.anonName}</Text>
                    <Text style={[s.cTime, { color: themeColors.txt3 }]}>{formatDistanceToNow(item.createdAt)}</Text>
                    
                    {item.author === user?._id ? (
                      <TouchableOpacity onPress={() => handleDelete(item._id)} style={s.delBtn}>
                        <Text style={s.delTxt}>🗑️</Text>
                      </TouchableOpacity>
                    ) : (
                      <TouchableOpacity onPress={() => handleStartChat(item.author)} style={s.dmBtn}>
                        <Text style={s.dmTxt}>💬 DM</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                  <Text style={[s.cContent, { color: themeColors.txt }]}>{item.content}</Text>
                  {!!item.image && (
                    <Image source={{ uri: item.image }} style={s.cImg} resizeMode="cover" />
                  )}
                </View>
              )}
              ListEmptyComponent={
                isLoading ? <ActivityIndicator style={{ marginTop: 20 }} color={themeColors.ogi} /> : 
                <Text style={[s.empty, { color: themeColors.txt3 }]}>No comments yet. Be the first!</Text>
              }
              contentContainerStyle={s.listContent}
            />

            <View style={[s.inputArea, { backgroundColor: themeColors.card, borderTopColor: themeColors.bdr }]}>
              {image && (
                <View style={s.previewWrap}>
                  <Image source={{ uri: image }} style={s.preview} resizeMode="contain" />
                  <TouchableOpacity onPress={() => setImage('')} style={s.removeBtn}>
                    <Text style={s.removeTxt}>✕</Text>
                  </TouchableOpacity>
                </View>
              )}
              <View style={s.inputBar}>
                <TouchableOpacity onPress={() => setShowEmoji(!showEmoji)} style={[s.mediaBtn, { backgroundColor: themeColors.card2 }]}>
                  <Text style={s.mediaIcon}>{showEmoji ? '⌨️' : '😀'}</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={pickImage} style={[s.mediaBtn, { backgroundColor: themeColors.card2 }]}>
                  <Text style={s.mediaIcon}>🖼️</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={takePhoto} style={[s.mediaBtn, { backgroundColor: themeColors.card2 }]}>
                  <Text style={s.mediaIcon}>📸</Text>
                </TouchableOpacity>
                <TextInput
                  style={[s.inp, { backgroundColor: themeColors.card2, color: themeColors.txt }]}
                  placeholder="Write a comment..."
                  placeholderTextColor={themeColors.txt3}
                  value={content}
                  onChangeText={(text) => {
                    setContent(text);
                    if (showEmoji) setShowEmoji(false);
                  }}
                  onFocus={() => setShowEmoji(false)}
                  multiline
                />
                <TouchableOpacity 
                  style={[s.sendBtn, (!content.trim() && !image) && s.btnDisabled]} 
                  onPress={handleSubmit}
                  disabled={isPending || (!content.trim() && !image)}
                >
                  {isPending ? <ActivityIndicator size="small" color="#fff" /> : <Text style={s.sendTxt}>Send</Text>}
                </TouchableOpacity>
              </View>
              {showEmoji && (
                <EmojiPicker 
                  themeColors={themeColors} 
                  onSelect={(emoji) => setContent(prev => prev + emoji)} 
                />
              )}
            </View>
          </Pressable>
        </KeyboardAvoidingView>
      </Pressable>
    </Modal>
  );
}

const s = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  keyboardView: { width: '100%', height: '85%' },
  sheet: { borderTopLeftRadius: 20, borderTopRightRadius: 20, flex: 1, padding: 16 },
  handle: { width: 40, height: 4, backgroundColor: '#DDD', borderRadius: 2, alignSelf: 'center', marginBottom: 12 },
  title: { fontFamily: 'Syne_700Bold', fontSize: 18, marginBottom: 16 },
  comment: { marginBottom: 16, borderBottomWidth: 1, paddingBottom: 12 },
  cHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 6 },
  cAvatar: { fontSize: 16 },
  cName: { fontSize: 13, fontWeight: '700' },
  cTime: { fontSize: 11, marginLeft: 8 },
  delBtn: { marginLeft: 'auto', padding: 4 },
  delTxt: { fontSize: 14 },
  dmBtn: { marginLeft: 'auto', paddingHorizontal: 8, paddingVertical: 4, backgroundColor: '#EEE', borderRadius: 12 },
  dmTxt: { fontSize: 10, fontWeight: '700' },
  cContent: { fontSize: 15, lineHeight: 22, marginBottom: 8 },
  cImg: { width: '100%', height: 200, borderRadius: 12, marginTop: 4, backgroundColor: '#EEE' },
  empty: { textAlign: 'center', marginTop: 40, fontSize: 14, fontFamily: 'PlusJakartaSans_400Regular' },
  listContent: { paddingBottom: 120 },
  inputArea: { 
    borderTopWidth: 1, paddingVertical: 12,
    position: 'absolute', bottom: 0, left: 0, right: 0,
    paddingHorizontal: 16, paddingBottom: Platform.OS === 'ios' ? 34 : 16
  },
  inputBar: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  mediaBtn: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  mediaIcon: { fontSize: 18 },
  inp: { flex: 1, borderRadius: 22, paddingHorizontal: 16, paddingVertical: 10, maxHeight: 100, fontSize: 14, minHeight: 40 },
  sendBtn: { backgroundColor: '#C94030', borderRadius: 22, paddingHorizontal: 20, paddingVertical: 10 },
  btnDisabled: { opacity: 0.5 },
  sendTxt: { color: '#fff', fontWeight: '700', fontSize: 14 },
  previewWrap: { marginBottom: 12, width: '100%', height: 150, borderRadius: 12, overflow: 'hidden', position: 'relative', borderWidth: 1, borderColor: '#EEE', backgroundColor: '#F9F9F9' },
  preview: { width: '100%', height: '100%' },
  removeBtn: { position: 'absolute', top: 2, right: 2, backgroundColor: 'rgba(0,0,0,0.6)', borderRadius: 10, width: 20, height: 20, alignItems: 'center', justifyContent: 'center' },
  removeTxt: { color: '#fff', fontSize: 10, fontWeight: '700' }
});
