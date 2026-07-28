import React, { useState } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, Modal, Pressable,
  TextInput, ScrollView, ActivityIndicator, Image, Alert, KeyboardAvoidingView, Platform
} from 'react-native';
import { FlashList } from '@shopify/flash-list';
import * as ImagePicker from 'expo-image-picker';
import { Colors, getColors } from '../../theme/colors';
import { useUIStore } from '../../store/uiStore';
import { useAuthStore } from '../../store/authStore';
import { useComments, useAddComment, useDeleteComment, usePost } from '../../hooks/usePosts';
import { useStartChat } from '../../hooks/useChat';
import { formatDistanceToNow } from '../../utils/time';
import { useRouter } from 'expo-router';
import EmojiPicker from '../EmojiPicker';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function CommentSheet() {
  const { showCommentSheet, closeCommentSheet, commentPostId, isDark } = useUIStore();
  const themeColors = getColors(isDark);
  const { user } = useAuthStore();
  const insets = useSafeAreaInsets();
  
  const { data, isLoading } = useComments(commentPostId || '');
  const { data: postData, isLoading: postLoading } = usePost(commentPostId || '');
  const rawComments = data?.comments || [];
  
  // Simple threading: Put children after their parents
  const comments = React.useMemo(() => {
    const parents = rawComments.filter(c => !c.parentId);
    const children = rawComments.filter(c => c.parentId);
    
    const result: any[] = [];
    parents.forEach(p => {
      result.push(p);
      children.filter(c => c.parentId === p._id).forEach(c => result.push(c));
    });
    return result;
  }, [rawComments]);

  const post = postData;
  
  const { mutate: addComment, isPending } = useAddComment();
  const { mutate: deleteComment } = useDeleteComment();
  const { mutate: startChat, isPending: startingChat } = useStartChat();
  const router = useRouter();
  
  const [content, setContent] = useState('');
  const [image, setImage] = useState('');
  const [showEmoji, setShowEmoji] = useState(false);
  const [replyTo, setReplyTo] = useState<{ id: string; name: string } | null>(null);

  const pickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      quality: 0.6,
      base64: true,
    });
    if (!result.canceled) setImage(`data:image/jpeg;base64,${result.assets[0].base64}`);
  };

  const takePhoto = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') return Alert.alert('Permission Denied', 'Allow camera access.');
    const result = await ImagePicker.launchCameraAsync({ allowsEditing: true, quality: 0.6, base64: true });
    if (!result.canceled) setImage(`data:image/jpeg;base64,${result.assets[0].base64}`);
  };

  const handleSubmit = () => {
    if (!content.trim() || !commentPostId) return;
    addComment({ 
      id: commentPostId, 
      content: content.trim(), 
      image: image || undefined,
      parentId: replyTo?.id
    }, {
      onSuccess: () => { 
        setContent(''); 
        setImage(''); 
        setShowEmoji(false); 
        setReplyTo(null);
      }
    });
  };

  const handleDelete = (commentId: string) => {
    Alert.alert('Delete Comment', 'Delete this forever?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => deleteComment({ postId: commentPostId!, commentId }) }
    ]);
  };

  if (!commentPostId) return null;

  return (
    <Modal visible={showCommentSheet} transparent animationType="slide" onRequestClose={closeCommentSheet}>
      <View style={s.overlay}>
        <Pressable style={StyleSheet.absoluteFill} onPress={closeCommentSheet} />
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={s.keyboardView}>
          <View style={[s.sheet, { backgroundColor: themeColors.card }]}>
            <View style={s.handle} />
            <View style={s.sHeader}>
              <Text style={[s.title, { color: themeColors.txt }]}>Comments</Text>
            </View>

            <FlashList
              data={comments}
              estimatedItemSize={90}
              keyExtractor={(item) => item._id}
              showsVerticalScrollIndicator={false}
              renderItem={({ item }) => (
                <View style={[s.commentRow, item.parentId && s.nestedComment]}>
                  {item.parentId && <View style={[s.depthLine, { backgroundColor: themeColors.bdr }]} />}
                  <View style={[s.avatarCircle, { backgroundColor: themeColors.card2 }]}>
                    <Text style={{ fontSize: 16 }}>{item.anonAvatar || '👤'}</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <View style={s.commentContent}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                        <Text style={[
                          s.cName, 
                          { 
                            color: post && post.type !== 'confess' && (post.author?._id || post.author)?.toString() === item.author?.toString()
                              ? themeColors.ogi 
                              : themeColors.txt 
                          }
                        ]}>
                          {item.anonName}
                          {post && post.type !== 'confess' && (post.author?._id || post.author)?.toString() === item.author?.toString() && ' [OP]'}
                        </Text>
                        {item.authorIsVerified && (
                          <Ionicons name="checkmark-circle" size={14} color="#3897f0" />
                        )}
                        <Text style={[s.cTime, { color: themeColors.txt3 }]}>• {formatDistanceToNow(item.createdAt)}</Text>
                      </View>
                      <Text style={[s.cText, { color: themeColors.txt }]}>{item.content}</Text>
                      {!!item.image && (
                        <Image source={{ uri: item.image }} style={s.cImg} resizeMode="cover" />
                      )}
                    </View>
                    <View style={s.cActions}>
                      <TouchableOpacity onPress={() => {
                        const targetParentId = item.parentId || item._id;
                        setReplyTo({ id: targetParentId, name: item.anonName });
                        setContent(`@${item.anonName} `);
                      }}>
                        <Text style={[s.actionTxt, { color: themeColors.ogi }]}>Reply</Text>
                      </TouchableOpacity>
                      {item.author === user?._id ? (
                        <TouchableOpacity onPress={() => handleDelete(item._id)}>
                          <Text style={[s.actionTxt, { color: themeColors.danger }]}>Delete</Text>
                        </TouchableOpacity>
                      ) : (
                        post?.type !== 'confess' && (
                          <TouchableOpacity onPress={() => {
                            closeCommentSheet();
                            startChat({ targetUserId: item.author, postId: commentPostId }, {
                              onSuccess: (c) => router.push(`/chat/${c._id}`)
                            });
                          }}>
                            <Text style={[s.actionTxt, { color: themeColors.txt3 }]}>Message</Text>
                          </TouchableOpacity>
                        )
                      )}
                    </View>
                  </View>
                </View>
              )}
              ListHeaderComponent={
                post ? (
                  <View style={[s.postHeader, { borderBottomColor: themeColors.bdr }]}>
                    <View style={s.postAuthorRow}>
                      <View style={[s.avatarCircle, { backgroundColor: themeColors.card2 }]}>
                        <Text style={{ fontSize: 18 }}>{post.type === 'confess' ? (post.anonAvatar || '🕳️') : (post.author?.avatar || post.anonAvatar || '👤')}</Text>
                      </View>
                      <View>
                        <Text style={[s.postAuthorName, { color: themeColors.txt }]}>
                          {post.anonName}
                        </Text>
                        <Text style={[s.postTime, { color: themeColors.txt3 }]}>{formatDistanceToNow(post.createdAt)}</Text>
                      </View>
                      <View style={[s.postTypePill, { backgroundColor: themeColors.ogi + '20' }]}>
                        <Text style={[s.postTypeTxt, { color: themeColors.ogi }]}>{post.type.toUpperCase()}</Text>
                      </View>
                    </View>
                    <Text style={[s.postTitle, { color: themeColors.txt }]}>{post.title}</Text>
                    {!!post.body && <Text style={[s.postBody, { color: themeColors.txt2 }]}>{post.body}</Text>}
                    {!!post.image && <Image source={{ uri: post.image }} style={s.postImage} resizeMode="contain" />}
                    
                    <View style={s.commentsDivider}>
                      <Text style={[s.dividerTxt, { color: themeColors.txt3 }]}>COMMENTS</Text>
                    </View>
                  </View>
                ) : null
              }
              ListEmptyComponent={
                isLoading ? <ActivityIndicator style={{ marginTop: 20 }} color={themeColors.ogi} /> : 
                <View style={s.emptyState}>
                  <Text style={{ fontSize: 40, marginBottom: 10 }}>💬</Text>
                  <Text style={[s.empty, { color: themeColors.txt3 }]}>No comments yet.</Text>
                </View>
              }
              contentContainerStyle={s.listContent}
            />

            <View style={[s.inputWrap, { borderTopColor: themeColors.bdr, backgroundColor: themeColors.card, paddingBottom: insets.bottom + 12 }]}>
              {replyTo && (
                <View style={[s.replyInfo, { backgroundColor: themeColors.card2 }]}>
                  <Text style={[s.replyTxt, { color: themeColors.txt2 }]}>Replying to <Text style={{ fontWeight: '800' }}>{replyTo.name}</Text></Text>
                  <TouchableOpacity onPress={() => setReplyTo(null)}>
                    <Text style={{ color: themeColors.ogi, fontWeight: '800' }}>Cancel</Text>
                  </TouchableOpacity>
                </View>
              )}
              {image && (
                <View style={s.previewContainer}>
                  <Image source={{ uri: image }} style={s.previewImg} />
                  <TouchableOpacity style={s.removeImg} onPress={() => setImage('')}><Text style={{ color: '#fff' }}>✕</Text></TouchableOpacity>
                </View>
              )}
              <View style={s.inputBar}>
                <View style={[s.inpBox, { backgroundColor: themeColors.bg2, borderColor: themeColors.bdr }]}>
                  <TouchableOpacity onPress={() => setShowEmoji(!showEmoji)}><Text style={{ fontSize: 20 }}>{showEmoji ? '⌨️' : '😀'}</Text></TouchableOpacity>
                  <TextInput
                    style={[s.inp, { color: themeColors.txt }]}
                    placeholder="Add a comment..."
                    placeholderTextColor={themeColors.txt3}
                    value={content}
                    onChangeText={setContent}
                    multiline
                  />
                  <TouchableOpacity onPress={pickImage}><Text style={{ fontSize: 20 }}>🖼️</Text></TouchableOpacity>
                </View>
                <TouchableOpacity 
                  onPress={handleSubmit} 
                  disabled={isPending || (!content.trim() && !image)}
                  style={[s.sendBtn, (isPending || (!content.trim() && !image)) && { opacity: 0.5 }]}
                >
                  <Text style={[s.sendTxt, { color: themeColors.ogi }]}>Post</Text>
                </TouchableOpacity>
              </View>
              {showEmoji && (
                <View style={{ height: 250, marginTop: 10 }}>
                  <EmojiPicker themeColors={themeColors} onSelect={(e) => setContent(p => p + e)} />
                </View>
              )}
            </View>
          </View>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
}

const s = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' },
  keyboardView: { width: '100%', height: '85%' },
  sheet: { borderTopLeftRadius: 24, borderTopRightRadius: 24, flex: 1, paddingHorizontal: 16 },
  handle: { width: 36, height: 4, backgroundColor: '#333', borderRadius: 2, alignSelf: 'center', marginVertical: 12 },
  sHeader: { alignItems: 'center', paddingBottom: 15, borderBottomWidth: 0.5, borderBottomColor: '#333' },
  title: { fontSize: 16, fontWeight: '800', letterSpacing: 0.5 },
  listContent: { paddingVertical: 20, paddingBottom: 120 },
  commentRow: { flexDirection: 'row', gap: 12, marginBottom: 20 },
  avatarCircle: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  commentContent: { flex: 1 },
  cName: { fontSize: 13, fontWeight: '800' },
  cTime: { fontSize: 12, fontWeight: '400' },
  cText: { fontSize: 14, lineHeight: 20, marginTop: 2, fontFamily: 'PlusJakartaSans_400Regular' },
  cImg: { width: '100%', height: 200, borderRadius: 12, marginTop: 8 },
  cActions: { flexDirection: 'row', gap: 15, marginTop: 6 },
  actionTxt: { fontSize: 12, fontWeight: '700' },
  emptyState: { alignItems: 'center', marginTop: 100 },
  empty: { fontSize: 14, fontWeight: '600' },
  inputWrap: { position: 'absolute', bottom: 0, left: 0, right: 0, padding: 12, borderTopWidth: 0.5 },
  inputBar: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  inpBox: { flex: 1, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 15, borderRadius: 25, borderWidth: 1, minHeight: 45, gap: 10 },
  inp: { flex: 1, paddingVertical: 8, fontSize: 14, maxHeight: 100 },
  sendBtn: { paddingHorizontal: 5 },
  sendTxt: { fontWeight: '800', fontSize: 15 },
  previewContainer: { marginBottom: 10, position: 'relative' },
  previewImg: { width: 60, height: 60, borderRadius: 8 },
  removeImg: { position: 'absolute', top: -5, left: 50, backgroundColor: 'rgba(0,0,0,0.7)', borderRadius: 10, width: 20, height: 20, alignItems: 'center', justifyContent: 'center' },
  postHeader: { paddingBottom: 20, marginBottom: 10, borderBottomWidth: 1 },
  postAuthorRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 16 },
  postAuthorName: { fontSize: 14, fontWeight: '800' },
  postTime: { fontSize: 11 },
  postTypePill: { marginLeft: 'auto', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
  postTypeTxt: { fontSize: 10, fontWeight: '900' },
  postTitle: { fontSize: 20, fontWeight: '900', marginBottom: 10, lineHeight: 28 },
  postBody: { fontSize: 15, lineHeight: 24, marginBottom: 15, fontFamily: 'PlusJakartaSans_400Regular' },
  postImage: { width: '100%', height: 250, borderRadius: 16, marginBottom: 15 },
  commentsDivider: { marginTop: 10, paddingVertical: 10, borderTopWidth: 0.5, borderTopColor: '#333' },
  dividerTxt: { fontSize: 10, fontWeight: '800', letterSpacing: 1 },
  emptyTitle: { fontFamily: 'PlusJakartaSans_600SemiBold', fontSize: 14 },
  nestedComment: { marginLeft: 32 },
  depthLine: { position: 'absolute', left: -16, top: 0, bottom: 0, width: 2, borderRadius: 1 },
  replyInfo: { flexDirection: 'row', justifyContent: 'space-between', padding: 10, borderRadius: 12, marginBottom: 10 },
  replyTxt: { fontSize: 12 },
});
