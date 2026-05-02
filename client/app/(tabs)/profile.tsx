import React, { useState, useEffect } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet, SafeAreaView,
  Modal, ActivityIndicator, Alert, Switch, TextInput, Platform
} from 'react-native';
import * as Notifications from 'expo-notifications';
import { useRouter } from 'expo-router';
import { Colors, getColors } from '../../src/theme/colors';
import { useAuthStore } from '../../src/store/authStore';
import { useUIStore } from '../../src/store/uiStore';
import { useLogout, useUpdateProfile, useMe } from '../../src/hooks/useAuth';
import { useMyPosts } from '../../src/hooks/usePosts';
import { authApi } from '../../src/api/auth.api';
import PostCard from '../../src/components/PostCard';

const AVATAR_OPTIONS = [
  "🦊", "🐯", "🦉", "🐺", "🐦‍⬛", "🦅", "🐆", "🐍", "🐻", "🦈", "🦝", "🐼", "🐸", "🐹", "🦁", "🐨",
  "🕶️", "🎭", "👻", "🤖", "🛸", "🌈", "🌕", "🍄", "🎸", "🎨", "👾", "🤠", "🔥", "⚡", "🍀", "🎲",
  "🕵️", "🤫", "🤝", "📢", "💡", "🍵", "🧿", "🪐", "🏹", "💎", "🧩"
];

export default function ProfileScreen() {
  const router = useRouter();
  const { user: storedUser, setUser } = useAuthStore();
  const { 
    isDark, toggleDark, openFeedbackSheet, openPrivacySheet 
  } = useUIStore();
  const themeColors = getColors(isDark);
  const logout = useLogout();
  const { mutate: updateProfile, isPending: updating } = useUpdateProfile();
  const { data: latestUser } = useMe();

  const user = latestUser || storedUser;

  const [editIdentityVisible, setEditIdentityVisible] = useState(false);
  const [newName, setNewName] = useState(user?.name || '');
  const [notifsEnabled, setNotifsEnabled] = useState(false);

  useEffect(() => {
    (async () => {
      const { status } = await Notifications.getPermissionsAsync();
      setNotifsEnabled(status === 'granted');
    })();
  }, []);

  useEffect(() => {
    if (latestUser) {
      setUser(latestUser);
    }
  }, [latestUser]);

  useEffect(() => {
    if (user?.name) setNewName(user.name);
  }, [user?.name]);

  // Register push token with server so we can receive notifications
  useEffect(() => {
    if (Platform.OS === 'web') return; // Skip on web to avoid VAPID error

    (async () => {
      const { status } = await Notifications.getPermissionsAsync();
      if (status === 'granted') {
        const tokenData = await Notifications.getExpoPushTokenAsync();
        authApi.registerPushToken(tokenData.data).catch(() => {}); // non-blocking
      }
    })();
  }, []);

  const { data: myPostsData } = useMyPosts();
  const myPosts = myPostsData?.pages?.flatMap((p: any) => p?.posts ?? []) ?? [];

  const karma = user?.karma ?? 0;
  const postCount = user?.postCount ?? 0;
  const upvotesReceived = user?.upvotesReceived ?? 0;
  const streak = user?.streak ?? 0;
  const anon = user?.name ?? 'Anonymous';
  const avatar = user?.avatar ?? '🦊';
  const campus = user?.campus ?? 'ogi';
  const badges = user?.badges || [];

  const campusName = campus === 'ogi' ? 'Oriental Institute' : campus === 'lnct' ? 'LNCT' : 'NIT Bhopal';

  const handleAvatarSelect = (newAv: string) => {
    updateProfile({ avatar: newAv });
  };

  const handleSaveName = () => {
    if (!newName.trim()) return;
    if (newName === user?.name) return;
    updateProfile({ name: newName.trim() }, {
      onSuccess: () => {
        Alert.alert('Success', 'Username updated!');
      }
    });
  };

  const handleToggleNotifs = async (val: boolean) => {
    if (val) {
      const { status } = await Notifications.requestPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Denied', 'Please enable notifications in your device settings.');
        setNotifsEnabled(false);
        return;
      }
    }
    setNotifsEnabled(val);
  };

  const SettingRow = ({ icon, label, value, onPress, isSwitch, switchValue, onSwitchChange, destructive }: any) => (
    <TouchableOpacity 
      style={[styles.row, { borderBottomColor: themeColors.bdr }]} 
      onPress={onPress} 
      activeOpacity={0.7}
      disabled={isSwitch}
    >
      <View style={styles.rowLeft}>
        <View style={[styles.rowIcon, { backgroundColor: destructive ? themeColors.dangerbg : themeColors.card2 }]}>
          <Text style={{ fontSize: 16 }}>{icon}</Text>
        </View>
        <Text style={[styles.rowLabel, { color: destructive ? themeColors.danger : themeColors.txt }]}>{label}</Text>
      </View>
      <View style={styles.rowRight}>
        {isSwitch ? (
          <Switch 
            value={switchValue} 
            onValueChange={onSwitchChange} 
            trackColor={{ false: '#767577', true: themeColors.ogi }}
            thumbColor={'#f4f3f4'}
          />
        ) : (
          <>
            {value && <Text style={[styles.rowValue, { color: themeColors.txt3 }]}>{value}</Text>}
            <Text style={[styles.rowArrow, { color: themeColors.txt3 }]}>›</Text>
          </>
        )}
      </View>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: themeColors.bg }}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>

        {/* Profile Header */}
        <View style={styles.header}>
          <View style={[styles.avatarContainer, { borderColor: themeColors.ogi, backgroundColor: themeColors.ogibg }]}>
            <Text style={{ fontSize: 36 }}>{avatar}</Text>
          </View>
          <Text style={[styles.name, { color: themeColors.txt }]}>{anon}</Text>
          <Text style={[styles.sub, { color: themeColors.txt3 }]}>{campusName} · {streak} Day Streak 🔥</Text>
          
          <TouchableOpacity 
            style={[styles.editBtn, { backgroundColor: themeColors.card2, borderColor: themeColors.bdr }]}
            onPress={() => setEditIdentityVisible(true)}
          >
            <Text style={[styles.editBtnTxt, { color: themeColors.txt }]}>Edit Identity</Text>
          </TouchableOpacity>
        </View>

        {/* Stats Grid */}
        <View style={styles.statsGrid}>
          <View style={[styles.statBox, { backgroundColor: themeColors.card, borderColor: themeColors.bdr }]}>
            <Text style={[styles.statVal, { color: themeColors.ogi }]}>{karma}</Text>
            <Text style={[styles.statLbl, { color: themeColors.txt3 }]}>Patato</Text>
          </View>
          <View style={[styles.statBox, { backgroundColor: themeColors.card, borderColor: themeColors.bdr }]}>
            <Text style={[styles.statVal, { color: themeColors.txt }]}>{postCount}</Text>
            <Text style={[styles.statLbl, { color: themeColors.txt3 }]}>Posts</Text>
          </View>
          <View style={[styles.statBox, { backgroundColor: themeColors.card, borderColor: themeColors.bdr }]}>
            <Text style={[styles.statVal, { color: themeColors.txt }]}>{upvotesReceived}</Text>
            <Text style={[styles.statLbl, { color: themeColors.txt3 }]}>Likes</Text>
          </View>
        </View>

        {/* Badges Row (Real Data) */}
        {badges.length > 0 && (
          <View style={styles.badgeRow}>
            {badges.map((b: string, i: number) => (
              <View key={i} style={[styles.badge, { backgroundColor: themeColors.card2, borderColor: themeColors.bdr }]}>
                <Text style={[styles.badgeTxt, { color: themeColors.txt }]}>{b}</Text>
              </View>
            ))}
          </View>
        )}

        {/* Settings Section */}
        <Text style={[styles.secTitle, { color: themeColors.txt3 }]}>APP SETTINGS</Text>
        <View style={[styles.settingsCard, { backgroundColor: themeColors.card, borderColor: themeColors.bdr }]}>
          <SettingRow 
            icon="👤" 
            label="Anonymous Identity" 
            value={avatar} 
            onPress={() => setEditIdentityVisible(true)} 
          />
          <SettingRow 
            icon={isDark ? "🌙" : "☀️"} 
            label="Dark Mode" 
            isSwitch 
            switchValue={isDark} 
            onSwitchChange={toggleDark} 
          />
          <SettingRow 
            icon="🔔" 
            label="Notifications" 
            isSwitch
            switchValue={notifsEnabled}
            onSwitchChange={handleToggleNotifs}
          />
        </View>

        {user?.role === 'admin' && (
          <>
            <Text style={[styles.secTitle, { color: themeColors.txt3 }]}>ADMINISTRATION</Text>
            <View style={[styles.settingsCard, { backgroundColor: themeColors.card, borderColor: themeColors.bdr }]}>
              <SettingRow 
                icon="🛠️" 
                label="Admin Dashboard" 
                value="Manage Posts" 
                onPress={() => router.push('/admin')} 
              />
            </View>
          </>
        )}

        <Text style={[styles.secTitle, { color: themeColors.txt3 }]}>SUPPORT</Text>
        <View style={[styles.settingsCard, { backgroundColor: themeColors.card, borderColor: themeColors.bdr }]}>
          <SettingRow icon="🛡️" label="Privacy Policy" onPress={openPrivacySheet} />
          <SettingRow icon="💬" label="Feedback" onPress={openFeedbackSheet} />
          <SettingRow 
            icon="🚪" 
            label="Logout" 
            onPress={logout} 
            destructive 
          />
        </View>

        <View style={styles.postHeader}>
          <Text style={[styles.secTitle, { color: themeColors.txt3, marginBottom: 0 }]}>MY RECENT POSTS</Text>
          <Text style={[styles.postCount, { color: themeColors.ogi }]}>{myPosts.length}</Text>
        </View>

        {myPosts.length === 0 ? (
          <View style={styles.emptyPosts}>
            <Text style={[styles.emptyTitle, { color: themeColors.txt }]}>Nothing here yet</Text>
            <Text style={[styles.emptySub, { color: themeColors.txt3 }]}>Your anonymous posts will appear here</Text>
          </View>
        ) : (
          myPosts.slice(0, 5).map((p: any) => (
            <PostCard key={p._id} post={p} />
          ))
        )}
        <View style={{ height: 40 }} />
      </ScrollView>

      {/* Edit Identity Modal */}
      <Modal visible={editIdentityVisible} animationType="slide" transparent>
        <View style={styles.modalBg}>
          <View style={[styles.modalContent, { backgroundColor: themeColors.card }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: themeColors.txt }]}>Identity Settings</Text>
              <TouchableOpacity onPress={() => setEditIdentityVisible(false)}>
                <Text style={{ color: themeColors.ogi, fontFamily: 'Syne_700Bold' }}>Done</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.currentIdentity}>
              <View style={[styles.bigAvatar, { backgroundColor: themeColors.ogibg, borderColor: themeColors.ogi }]}>
                <Text style={{ fontSize: 50 }}>{avatar}</Text>
              </View>
              
              <View style={styles.nameInputContainer}>
                <TextInput
                  style={[styles.nameInput, { color: themeColors.txt, borderColor: themeColors.bdr, backgroundColor: themeColors.bg2 }]}
                  value={newName}
                  onChangeText={setNewName}
                  placeholder="New Username"
                  placeholderTextColor={themeColors.txt3}
                  maxLength={20}
                />
                <TouchableOpacity 
                  style={[styles.saveNameBtn, { backgroundColor: themeColors.ogi }]} 
                  onPress={handleSaveName}
                  disabled={updating || !newName.trim() || newName === user?.name}
                >
                  <Text style={styles.saveNameTxt}>Save</Text>
                </TouchableOpacity>
              </View>
              <Text style={[styles.identityNote, { color: themeColors.txt3 }]}>Choose your avatar persona below</Text>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              <View style={styles.avatarGrid}>
                {AVATAR_OPTIONS.map((av) => (
                  <TouchableOpacity 
                    key={av} 
                    style={[
                      styles.avOpt, 
                      { backgroundColor: themeColors.card2, borderColor: themeColors.bdr },
                      avatar === av && { borderColor: themeColors.ogi, borderWidth: 2 }
                    ]}
                    onPress={() => handleAvatarSelect(av)}
                    disabled={updating}
                  >
                    <Text style={{ fontSize: 24 }}>{av}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              {updating && <ActivityIndicator color={themeColors.ogi} style={{ marginTop: 10 }} />}

              <View style={[styles.infoBox, { backgroundColor: themeColors.bg2 }]}>
                <Text style={[styles.infoTxt, { color: themeColors.txt2 }]}>
                  Your anonymous username and avatar are visible to everyone on campus. Choose a vibe that represents you best!
                </Text>
              </View>
              <View style={{ height: 40 }} />
            </ScrollView>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  scroll: { padding: 16 },
  header: { alignItems: 'center', marginVertical: 24 },
  avatarContainer: { width: 100, height: 100, borderRadius: 50, borderWidth: 3, justifyContent: 'center', alignItems: 'center', marginBottom: 16 },
  name: { fontFamily: 'Syne_700Bold', fontSize: 24 },
  sub: { fontFamily: 'PlusJakartaSans_400Regular', fontSize: 14, marginTop: 4 },
  editBtn: { marginTop: 16, paddingHorizontal: 24, paddingVertical: 10, borderRadius: 20, borderWidth: 1 },
  editBtnTxt: { fontFamily: 'Syne_700Bold', fontSize: 13 },

  statsGrid: { flexDirection: 'row', gap: 12, marginBottom: 32 },
  statBox: { flex: 1, padding: 16, borderRadius: 16, borderWidth: 1, alignItems: 'center' },
  statVal: { fontFamily: 'Syne_700Bold', fontSize: 20 },
  statLbl: { fontFamily: 'PlusJakartaSans_600SemiBold', fontSize: 10, marginTop: 4, textTransform: 'uppercase' },

  badgeRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 24, justifyContent: 'center' },
  badge: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 999, borderWidth: 1 },
  badgeTxt: { fontFamily: 'Syne_700Bold', fontSize: 12 },

  secTitle: { fontFamily: 'Syne_700Bold', fontSize: 11, letterSpacing: 1.5, marginBottom: 8, marginLeft: 4 },
  settingsCard: { borderRadius: 20, borderWidth: 1, overflow: 'hidden', marginBottom: 24 },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16, borderBottomWidth: 1 },
  rowLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  rowIcon: { width: 32, height: 32, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  rowLabel: { fontFamily: 'PlusJakartaSans_600SemiBold', fontSize: 14 },
  rowRight: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  rowValue: { fontSize: 13, fontFamily: 'PlusJakartaSans_400Regular' },
  rowArrow: { fontSize: 18, fontWeight: '300' },

  postHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  postCount: { fontFamily: 'Syne_700Bold', fontSize: 12 },
  emptyPosts: { alignItems: 'center', paddingVertical: 40 },
  emptyTitle: { fontFamily: 'Syne_700Bold', fontSize: 16 },
  emptySub: { fontFamily: 'PlusJakartaSans_400Regular', fontSize: 13, marginTop: 4 },

  modalBg: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalContent: { borderTopLeftRadius: 32, borderTopRightRadius: 32, padding: 24, maxHeight: '90%' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 },
  modalTitle: { fontFamily: 'Syne_700Bold', fontSize: 20 },
  currentIdentity: { alignItems: 'center', marginBottom: 32 },
  bigAvatar: { width: 120, height: 120, borderRadius: 60, borderWidth: 4, justifyContent: 'center', alignItems: 'center', marginBottom: 16 },
  
  nameInputContainer: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 20, marginBottom: 12 },
  nameInput: { flex: 1, height: 48, borderRadius: 12, borderWidth: 1, paddingHorizontal: 16, fontFamily: 'PlusJakartaSans_600SemiBold', fontSize: 16 },
  saveNameBtn: { height: 48, paddingHorizontal: 20, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  saveNameTxt: { color: '#fff', fontFamily: 'Syne_700Bold', fontSize: 14 },

  identityNote: { fontSize: 12, marginTop: 6, fontFamily: 'PlusJakartaSans_400Regular' },
  avatarGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, justifyContent: 'center' },
  avOpt: { width: 56, height: 56, borderRadius: 28, borderWidth: 1, justifyContent: 'center', alignItems: 'center' },
  infoBox: { padding: 16, borderRadius: 16, marginTop: 24 },
  infoTxt: { fontSize: 12, lineHeight: 18, fontFamily: 'PlusJakartaSans_400Regular', textAlign: 'center' },
});