import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Modal, Pressable, Alert } from 'react-native';
import { getColors } from '../../theme/colors';
import { useUIStore } from '../../store/uiStore';
import { useStartChat } from '../../hooks/useChat';
import { useRouter } from 'expo-router';
import { useAuthStore } from '../../store/authStore';
import { useBlockUser } from '../../hooks/useAuth';

export default function AuthorProfileSheet() {
  const { authorProfile, closeAuthorProfile, isDark } = useUIStore();
  const user = useAuthStore((s) => s.user);
  const themeColors = getColors(isDark);
  const router = useRouter();
  
  const { mutate: startChat, isPending } = useStartChat();
  const { mutate: blockUser, isPending: isBlocking } = useBlockUser();

  if (!authorProfile) return null;

  const isSameCampus = authorProfile.postCampus === user?.campus;

  const handleStartChat = () => {
    if (isPending) return;
    startChat(
      { targetUserId: authorProfile.userId, ...(authorProfile.postId ? { postId: authorProfile.postId } : {}) },
      {
        onSuccess: (chat) => {
          closeAuthorProfile();
          router.push(`/chat/${chat._id}`);
        },
        onError: (err: any) => {
          const msg = err?.response?.data?.error || err?.message || 'Could not start chat';
          Alert.alert('Message Failed', msg);
        }
      }
    );
  };

  const handleBlock = () => {
    Alert.alert(
      "Block User?",
      `Are you sure you want to block ${authorProfile.anonName}? You will no longer see their posts in your feed.`,
      [
        { text: "Cancel", style: "cancel" },
        { 
          text: "Block", 
          style: "destructive",
          onPress: () => {
            blockUser(authorProfile.userId, {
              onSuccess: () => {
                closeAuthorProfile();
                Alert.alert("Blocked", "User has been blocked.");
              }
            });
          }
        }
      ]
    );
  };

  return (
    <Modal visible={!!authorProfile} transparent animationType="fade" onRequestClose={closeAuthorProfile}>
      <Pressable style={s.overlay} onPress={closeAuthorProfile}>
        <Pressable style={[s.sheet, { backgroundColor: themeColors.card }]} onPress={e => e.stopPropagation()}>
          <View style={s.handle} />
          
          <View style={s.profileHeader}>
            <Text style={s.avatar}>{authorProfile.anonAvatar}</Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <Text style={[s.name, { color: themeColors.txt }]}>{authorProfile.anonName}</Text>
              {authorProfile.isVerified && <Text style={{ fontSize: 20 }}>✅</Text>}
            </View>
            <View style={s.badgeRow}>
              <View style={[s.badge, { backgroundColor: themeColors.ogibg }]}>
                <Text style={[s.badgeTxt, { color: themeColors.ogi }]}>{authorProfile.postCampus.toUpperCase()} User</Text>
              </View>
              {authorProfile.isVerified && (
                <View style={[s.badge, { backgroundColor: '#FACC1520' }]}>
                  <Text style={[s.badgeTxt, { color: '#FACC15' }]}>Verified ✅</Text>
                </View>
              )}
              {authorProfile.isPremium && (
                <View style={[s.badge, { backgroundColor: '#c8f53a' }]}>
                  <Text style={[s.badgeTxt, { color: '#000' }]}>PRO 💎</Text>
                </View>
              )}
            </View>

            {/* Awarded Badges Row */}
            {authorProfile.badges && authorProfile.badges.length > 0 && (
              <View style={[s.badgeRow, { marginTop: 12 }]}>
                {authorProfile.badges.map((b, i) => (
                  <View key={i} style={[s.miniBadge, { backgroundColor: themeColors.card2 }]}>
                    <Text style={{ fontSize: 16 }}>{b.icon}</Text>
                    <Text style={[s.miniBadgeTxt, { color: themeColors.txt }]}>{b.name}</Text>
                  </View>
                ))}
              </View>
            )}
          </View>

          <Text style={[s.desc, { color: themeColors.txt3 }]}>
            {authorProfile.bio || "This identity is randomly generated for this specific post to protect the author's privacy."}
          </Text>

          {!authorProfile.isSelf ? (
            <>
              <TouchableOpacity 
                style={[s.dmBtn, { backgroundColor: themeColors.ogi }, isPending && s.btnDisabled]} 
                onPress={handleStartChat}
                disabled={isPending}
              >
                <Text style={s.dmTxt}>{isPending ? 'Starting Chat...' : '💬 Send a Message'}</Text>
              </TouchableOpacity>

              <TouchableOpacity 
                style={[s.blockBtn, { borderColor: themeColors.danger }]} 
                onPress={handleBlock}
                disabled={isBlocking}
              >
                <Text style={[s.blockBtnTxt, { color: themeColors.danger }]}>
                  {isBlocking ? 'Blocking...' : '🚫 Block User'}
                </Text>
              </TouchableOpacity>
            </>
          ) : (
            <View style={[s.dmBtn, { backgroundColor: themeColors.bg2 }]}>
              <Text style={[s.dmTxt, { color: themeColors.txt3 }]}>This is you!</Text>
            </View>
          )}

          {!authorProfile.isConfession && (
            <TouchableOpacity 
              style={[s.profileBtn, { borderColor: themeColors.bdr }]} 
              onPress={() => {
                if (!authorProfile.userId) {
                  Alert.alert("Error", "User profile not available.");
                  return;
                }
                closeAuthorProfile();
                router.push(`/user/${authorProfile.userId}`);
              }}
            >
              <Text style={[s.profileBtnTxt, { color: themeColors.txt }]}>👤 View Profile</Text>
            </TouchableOpacity>
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
  badgeRow: { flexDirection: 'row', gap: 8, marginTop: 8 },
  badge: { paddingHorizontal: 12, paddingVertical: 4, borderRadius: 12 },
  badgeTxt: { fontSize: 10, fontWeight: '800', textTransform: 'uppercase' },
  desc: { textAlign: 'center', fontSize: 13, lineHeight: 20, marginBottom: 24, paddingHorizontal: 20 },
  dmBtn: { width: '100%', paddingVertical: 14, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  dmTxt: { color: '#FFF', fontSize: 16, fontWeight: '700' },
  btnDisabled: { opacity: 0.7 },
  profileBtn: { width: '100%', paddingVertical: 14, borderRadius: 16, alignItems: 'center', justifyContent: 'center', borderWidth: 1, marginTop: 12 },
  profileBtnTxt: { fontSize: 15, fontWeight: '600' },
  blockBtn: { width: '100%', paddingVertical: 14, borderRadius: 16, alignItems: 'center', justifyContent: 'center', borderWidth: 1, marginTop: 12 },
  blockBtnTxt: { fontSize: 15, fontWeight: '600' },
  miniBadge: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 12 },
  miniBadgeTxt: { fontSize: 11, fontWeight: '700' },
});
