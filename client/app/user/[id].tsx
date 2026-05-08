import React from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet, SafeAreaView,
  ActivityIndicator, Dimensions, Alert
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { getColors } from '../../src/theme/colors';
import { useUIStore } from '../../src/store/uiStore';
import { useOtherProfile, useUserPosts } from '../../src/hooks/useUser';
import { useStartChat } from '../../src/hooks/useChat';
import PostCard from '../../src/components/PostCard';
import { LinearGradient } from 'expo-linear-gradient';

const { width } = Dimensions.get('window');

export default function UserProfileScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { isDark, activeCampus, closeAuthorProfile } = useUIStore();
  const themeColors = getColors(isDark);

  const { data: user, isLoading: userLoading } = useOtherProfile(id);
  const { data: postsData, isLoading: postsLoading } = useUserPosts(id);
  const { mutate: startChat, isPending: startingChat } = useStartChat();

  if (userLoading) {
    return (
      <View style={[s.center, { backgroundColor: themeColors.bg }]}>
        <ActivityIndicator color={themeColors.ogi} size="large" />
      </View>
    );
  }

  if (!user) {
    return (
      <View style={[s.center, { backgroundColor: themeColors.bg }]}>
        <Text style={{ color: themeColors.txt }}>User not found</Text>
      </View>
    );
  }

  const posts = postsData?.pages?.flatMap((p: any) => p?.posts ?? []) ?? [];
  const isPrivate = user.isPrivate;
  const primaryColor = user.campus === 'lnct' ? themeColors.lnct : themeColors.ogi;

  const handleStartChat = () => {
    if (activeCampus === 'all') {
      Alert.alert('Sneak In Mode', 'You cannot message in Sneak In mode.');
      return;
    }
    startChat(
      { targetUserId: user._id, postId: '' },
      {
        onSuccess: (chat) => {
          closeAuthorProfile();
          router.push(`/chat/${chat._id}`);
        },
      }
    );
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: themeColors.bg }}>
      <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>
        
        {/* Header Section */}
        <View style={s.headerContainer}>
          <LinearGradient
            colors={[primaryColor, primaryColor + 'CC', themeColors.bg]}
            style={s.coverGradient}
          />
          
          <View style={s.profileTop}>
            <View style={[s.avatarCircle, { borderColor: themeColors.bg, backgroundColor: themeColors.card }]}>
              <Text style={{ fontSize: 56 }}>{user.avatar}</Text>
            </View>

            <TouchableOpacity 
              style={[s.messageBtn, { backgroundColor: primaryColor }]}
              onPress={handleStartChat}
              disabled={startingChat}
            >
              {startingChat ? (
                <ActivityIndicator color="#FFF" size="small" />
              ) : (
                <Text style={s.messageBtnTxt}>Message</Text>
              )}
            </TouchableOpacity>
          </View>

          <View style={s.infoSection}>
            <Text style={[s.displayName, { color: themeColors.txt }]}>{user.name}</Text>
            <Text style={[s.campusSub, { color: primaryColor }]}>@{user.campus?.toUpperCase()} · {user.campus === 'ogi' ? 'Oriental' : 'LNCT'}</Text>
            
            {user.bio ? (
              <Text style={[s.bioTxt, { color: themeColors.txt2 }]}>{user.bio}</Text>
            ) : null}

            <View style={s.tagContainer}>
              {(user.tags || []).map((tag: string, i: number) => (
                <TouchableOpacity 
                  key={i} 
                  style={[s.tag, { backgroundColor: themeColors.card2, borderColor: primaryColor + '30' }]}
                  activeOpacity={0.7}
                >
                  <Text style={[s.tagText, { color: themeColors.txt }]}>{tag}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <View style={s.statsBar}>
              <View style={s.statBox}>
                <Text style={[s.statNum, { color: themeColors.txt }]}>{user.karma}</Text>
                <Text style={[s.statLbl, { color: themeColors.txt3 }]}>Patato</Text>
              </View>
              <View style={s.statBox}>
                <Text style={[s.statNum, { color: themeColors.txt }]}>{user.streak}</Text>
                <Text style={[s.statLbl, { color: themeColors.txt3 }]}>Streak</Text>
              </View>
              <View style={s.statBox}>
                <Text style={[s.statNum, { color: themeColors.txt }]}>{user.postCount}</Text>
                <Text style={[s.statLbl, { color: themeColors.txt3 }]}>Posts</Text>
              </View>
            </View>
          </View>
        </View>

        {/* Content Section */}
        <View style={s.contentArea}>
          <View style={[s.sectionHeader, { borderBottomColor: themeColors.bdr }]}>
            <Text style={[s.sectionTitle, { color: themeColors.txt }]}>Posts</Text>
          </View>

          {isPrivate ? (
            <View style={s.privateState}>
              <Text style={s.lockEmoji}>🔒</Text>
              <Text style={[s.privateTitle, { color: themeColors.txt }]}>This account is private</Text>
              <Text style={[s.privateSub, { color: themeColors.txt3 }]}>Follow this user to see their anonymous posts.</Text>
            </View>
          ) : (
            <View>
              {posts.length === 0 ? (
                <View style={s.emptyState}>
                  <Text style={[s.emptyTitle, { color: themeColors.txt3 }]}>No posts yet</Text>
                </View>
              ) : (
                posts.map((p: any) => <PostCard key={p._id} post={p} />)
              )}
            </View>
          )}
        </View>

        <View style={{ height: 100 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  scroll: { backgroundColor: 'transparent' },
  headerContainer: { paddingBottom: 20 },
  coverGradient: { height: 180, width: '100%' },
  profileTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', paddingHorizontal: 20, marginTop: -60 },
  avatarCircle: { width: 110, height: 110, borderRadius: 55, borderWidth: 5, justifyContent: 'center', alignItems: 'center', elevation: 10, shadowColor: '#000', shadowOpacity: 0.2, shadowRadius: 10, shadowOffset: { width: 0, height: 5 } },
  messageBtn: { paddingHorizontal: 24, paddingVertical: 10, borderRadius: 20, marginBottom: 5 },
  messageBtnTxt: { color: '#FFF', fontFamily: 'Syne_700Bold', fontSize: 13 },

  infoSection: { paddingHorizontal: 20, marginTop: 15 },
  displayName: { fontFamily: 'Syne_700Bold', fontSize: 26 },
  campusSub: { fontFamily: 'PlusJakartaSans_700Bold', fontSize: 12, marginTop: 4, letterSpacing: 0.5 },
  bioTxt: { fontFamily: 'PlusJakartaSans_400Regular', fontSize: 14, marginTop: 12, lineHeight: 20 },
  
  statsBar: { flexDirection: 'row', marginTop: 24, gap: 30 },
  statBox: { alignItems: 'flex-start' },
  statNum: { fontFamily: 'Syne_700Bold', fontSize: 18 },
  statLbl: { fontFamily: 'PlusJakartaSans_600SemiBold', fontSize: 11, marginTop: 2, opacity: 0.7 },

  contentArea: { marginTop: 10 },
  sectionHeader: { paddingHorizontal: 20, paddingVertical: 15, borderBottomWidth: 1 },
  sectionTitle: { fontFamily: 'Syne_700Bold', fontSize: 16 },

  privateState: { alignItems: 'center', paddingVertical: 80, paddingHorizontal: 40 },
  lockEmoji: { fontSize: 48, marginBottom: 16 },
  privateTitle: { fontFamily: 'Syne_700Bold', fontSize: 18, textAlign: 'center' },
  privateSub: { fontFamily: 'PlusJakartaSans_400Regular', fontSize: 14, textAlign: 'center', marginTop: 8, opacity: 0.6 },

  emptyState: { alignItems: 'center', paddingVertical: 40 },
  emptyTitle: { fontFamily: 'PlusJakartaSans_600SemiBold', fontSize: 14 },

  tagContainer: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 15 },
  tag: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, borderWidth: 1 },
  tagText: { fontFamily: 'PlusJakartaSans_700Bold', fontSize: 11, letterSpacing: 0.3 },
});
