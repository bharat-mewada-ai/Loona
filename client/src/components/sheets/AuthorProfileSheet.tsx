import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Modal, Pressable } from 'react-native';
import { getColors } from '../../theme/colors';
import { useUIStore } from '../../store/uiStore';
import { useStartChat } from '../../hooks/useChat';
import { useRouter } from 'expo-router';

export default function AuthorProfileSheet() {
  const { authorProfile, closeAuthorProfile, isDark } = useUIStore();
  const themeColors = getColors(isDark);
  const router = useRouter();
  
  const { mutate: startChat, isPending } = useStartChat();

  if (!authorProfile) return null;

  const handleStartChat = () => {
    if (isPending) return;
    startChat(
      { targetUserId: authorProfile.userId, postId: authorProfile.postId },
      {
        onSuccess: (chat) => {
          closeAuthorProfile();
          router.push(`/chat/${chat._id}`);
        },
      }
    );
  };

  return (
    <Modal visible={!!authorProfile} transparent animationType="fade" onRequestClose={closeAuthorProfile}>
      <Pressable style={s.overlay} onPress={closeAuthorProfile}>
        <Pressable style={[s.sheet, { backgroundColor: themeColors.card }]} onPress={e => e.stopPropagation()}>
          <View style={s.handle} />
          
          <View style={s.profileHeader}>
            <Text style={s.avatar}>{authorProfile.anonAvatar}</Text>
            <Text style={[s.name, { color: themeColors.txt }]}>{authorProfile.anonName}</Text>
            <View style={[s.badge, { backgroundColor: themeColors.ogibg }]}>
              <Text style={[s.badgeTxt, { color: themeColors.ogi }]}>Anonymous User</Text>
            </View>
          </View>

          <Text style={[s.desc, { color: themeColors.txt3 }]}>
            This identity is randomly generated for this specific post to protect the author's privacy.
          </Text>

          {!authorProfile.isSelf ? (
            <TouchableOpacity 
              style={[s.dmBtn, { backgroundColor: themeColors.ogi }, isPending && s.btnDisabled]} 
              onPress={handleStartChat}
              disabled={isPending}
            >
              <Text style={s.dmTxt}>{isPending ? 'Starting Chat...' : '💬 Send a Message'}</Text>
            </TouchableOpacity>
          ) : (
            <View style={[s.dmBtn, { backgroundColor: themeColors.bg2 }]}>
              <Text style={[s.dmTxt, { color: themeColors.txt3 }]}>This is you!</Text>
            </View>
          )}

        </Pressable>
      </Pressable>
    </Modal>
  );
}

const s = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  sheet: { borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, paddingBottom: 40, alignItems: 'center' },
  handle: { width: 40, height: 4, backgroundColor: '#DDD', borderRadius: 2, marginBottom: 20 },
  profileHeader: { alignItems: 'center', marginBottom: 16 },
  avatar: { fontSize: 64, marginBottom: 12 },
  name: { fontSize: 22, fontFamily: 'Syne_700Bold', marginBottom: 8 },
  badge: { paddingHorizontal: 12, paddingVertical: 4, borderRadius: 12 },
  badgeTxt: { fontSize: 12, fontWeight: '700' },
  desc: { textAlign: 'center', fontSize: 13, lineHeight: 20, marginBottom: 24, paddingHorizontal: 20 },
  dmBtn: { width: '100%', paddingVertical: 14, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  dmTxt: { color: '#FFF', fontSize: 16, fontWeight: '700' },
  btnDisabled: { opacity: 0.7 },
});
