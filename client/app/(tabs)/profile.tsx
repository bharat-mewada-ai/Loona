import React, { useState, useEffect } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet, SafeAreaView,
  Modal, ActivityIndicator, Alert, Switch, TextInput, Platform,
  Dimensions, Image, Share, Linking
} from 'react-native';
import * as Notifications from 'expo-notifications';
import { useRouter } from 'expo-router';
import { Colors, getColors } from '../../src/theme/colors';
import { useAuthStore } from '../../src/store/authStore';
import { useUIStore } from '../../src/store/uiStore';
import { useLogout, useUpdateProfile, useMe, useDeleteAccount } from '../../src/hooks/useAuth';
import { useMyPosts } from '../../src/hooks/usePosts';
import { authApi } from '../../src/api/auth.api';
import PostCard from '../../src/components/PostCard';
import { LinearGradient } from 'expo-linear-gradient';

const { width } = Dimensions.get('window');

const AVATAR_OPTIONS = [
  "🦊", "🐯", "🦉", "🐺", "🐦‍⬛", "🦅", "🐆", "🐍", "🐻", "🦈", "🦝", "🐼", "🐸", "🐹", "🦁", "🐨",
  "🕶️", "🎭", "👻", "🤖", "🛸", "🌈", "🌕", "🍄", "🎸", "🎨", "👾", "🤠", "🔥", "⚡", "🍀", "🎲",
  "🕵️", "🤫", "🤝", "📢", "💡", "🍵", "🧿", "🪐", "🏹", "💎", "🧩"
];

export default function ProfileScreen() {
  const router = useRouter();
  const user = useAuthStore(s => s.user);
  const setUser = useAuthStore(s => s.setUser);
  
  useEffect(() => {
    console.log('--- USER FROM STORE ---', { name: user?.name, tags: user?.tags });
  }, [user]);
  
  const { 
    isDark, toggleDark, openFeedbackSheet, openPrivacySheet,
    hapticsEnabled, toggleHaptics
  } = useUIStore();
  const themeColors = getColors(isDark);
  const logout = useLogout();
  const { mutate: updateProfile, isPending: updating } = useUpdateProfile();
  const { mutate: deleteAccount, isPending: deleting } = useDeleteAccount();
  useMe(); // Keep profile data in sync with backend

  const [activeTab, setActiveTab] = useState<'posts' | 'badges' | 'settings'>('posts');
  const [editModalVisible, setEditModalVisible] = useState(false);
  
  // Edit States
  const [editName, setEditName] = useState(user?.name || '');
  const [editBio, setEditBio] = useState(user?.bio || '');
  const [editTags, setEditTags] = useState<string[]>(user?.tags || []);
  const [newTag, setNewTag] = useState('');
  const [notifsEnabled, setNotifsEnabled] = useState(user?.notificationsEnabled ?? true);
  const [isPrivate, setIsPrivate] = useState(user?.isPrivate || false);

  useEffect(() => {
    (async () => {
      if (Platform.OS === 'web') return;
      const { status } = await Notifications.getPermissionsAsync();
      // Only force-off if permission is explicitly denied
      if (status === 'denied') {
        setNotifsEnabled(false);
      }
    })();
  }, []);

  // Removed redundant setUser from latestUser to prevent race conditions

  useEffect(() => {
    // Only sync form states from store if modal is NOT visible to avoid overwriting user edits
    if (!editModalVisible) {
      setEditName(user?.name || '');
      setEditBio(user?.bio || '');
      setEditTags(user?.tags || []);
    }
    
    // Privacy and Notification settings can sync even if modal is open (they are outside the modal)
    if (!updating) {
      if (user?.isPrivate !== undefined && user?.isPrivate !== isPrivate) {
        setIsPrivate(user.isPrivate);
      }
      if (user?.notificationsEnabled !== undefined && user?.notificationsEnabled !== notifsEnabled) {
        setNotifsEnabled(user.notificationsEnabled);
      }
    }
  }, [user?.name, user?.bio, user?.isPrivate, user?.notificationsEnabled, user?.tags, updating, editModalVisible]);

  const { data: myPostsData } = useMyPosts();
  const myPosts = myPostsData?.pages?.flatMap((p: any) => p?.posts ?? []) ?? [];

  const karma = user?.karma ?? 0;
  const postCount = user?.postCount ?? 0;
  const streak = user?.streak ?? 0;
  const anon = user?.name ?? 'Anonymous';
  const avatar = user?.avatar ?? '🦊';
  const bio = user?.bio || 'No bio yet...';
  const campus = user?.campus ?? 'ogi';
  const badges = user?.badges || [];

  const campusName = campus === 'ogi' ? 'Oriental Institute' : campus === 'lnct' ? 'LNCT' : 'Bhopal Campus';
  const primaryColor = campus === 'lnct' ? themeColors.lnct : themeColors.ogi;

  const handleAvatarSelect = (newAv: string) => {
    updateProfile({ avatar: newAv });
  };

  const addTag = () => {
    if (!newTag.trim()) return;
    if (editTags.length >= 5) {
      Alert.alert('Limit Reached', 'You can only add up to 5 tags.');
      return;
    }
    if (newTag.trim().length > 15) {
      Alert.alert('Too Long', 'Each tag can be at most 15 characters.');
      return;
    }
    const cleanTag = newTag.trim().replace(/^#/, '');
    if (editTags.includes(cleanTag)) {
      Alert.alert('Duplicate', 'This tag already exists.');
      return;
    }
    setEditTags([...editTags, cleanTag]);
    setNewTag('');
  };

  const removeTag = (tagToRemove: string) => {
    setEditTags(editTags.filter(t => t !== tagToRemove));
  };

  const handleSaveProfile = () => {
    const payload: any = {};
    if (editName.trim() && editName !== user?.name) payload.name = editName.trim();
    if (editBio !== user?.bio) payload.bio = editBio.trim();
    if (JSON.stringify(editTags) !== JSON.stringify(user?.tags || [])) payload.tags = editTags;

    if (Object.keys(payload).length === 0) {
      setEditModalVisible(false);
      return;
    }

    console.log('--- SAVING PROFILE ---', payload);
    updateProfile(payload, {
      onSuccess: (updated) => {
        console.log('--- PROFILE SAVE SUCCESS ---', updated.tags);
        Alert.alert('Success', 'Profile updated! ✨');
        setEditModalVisible(false);
      },
      onError: (err: any) => {
        console.log('--- PROFILE SAVE ERROR ---', err.response?.data || err.message);
        Alert.alert('Error', err.response?.data?.error || err.message || 'Could not update profile');
      }
    });
  };

  const handleToggleNotifs = async (val: boolean) => {
    if (val) {
      const { status } = await Notifications.requestPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Denied', 'Please enable notifications in your settings.');
        return;
      }
    }
    setNotifsEnabled(val);
    updateProfile({ notificationsEnabled: val });
  };

  const handleTogglePrivate = (val: boolean) => {
    setIsPrivate(val);
    updateProfile({ isPrivate: val }, {
      onError: (err: any) => {
        setIsPrivate(!val);
        Alert.alert("Error", err.response?.data?.error || "Failed to update privacy setting");
      }
    });
  };

  const handleInvite = async () => {
    try {
      await Share.share({
        message: `Yo! Check out Loona - The Anonymous Campus Social for ${campusName} students. 🥔🔥\n\nDownload now on Play Store: https://play.google.com/store/apps/details?id=com.loona.app`,
        title: 'Invite to Loona',
      });
    } catch (error) {
      console.log('Error sharing:', error);
    }
  };

  const handleRate = () => {
    const url = Platform.OS === 'ios' 
      ? `itms-apps://itunes.apple.com/app/idYOUR_ID?action=write-review`
      : `market://details?id=com.loona.app`;

    Linking.canOpenURL(url).then(supported => {
      if (supported) {
        Linking.openURL(url);
      } else {
        // Fallback to browser link if market:// doesn't work
        Linking.openURL(`https://play.google.com/store/apps/details?id=com.loona.app`);
      }
    });
  };

  const handleDeleteAccount = () => {
    Alert.alert(
      'Delete Account', 
      'Are you sure? This will permanently erase your karma and posts. This action is irreversible.', 
      [
        { text: 'Cancel', style: 'cancel' }, 
        { 
          text: 'Delete Permanently', 
          style: 'destructive', 
          onPress: () => deleteAccount() 
        }
      ]
    );
  };

  const SettingRow = ({ icon, label, value, onPress, isSwitch, switchValue, onSwitchChange, destructive }: any) => (
    <TouchableOpacity 
      style={[s.row, { borderBottomColor: themeColors.bdr }]} 
      onPress={onPress} 
      activeOpacity={0.7}
      disabled={isSwitch}
    >
      <View style={s.rowLeft}>
        <View style={[s.rowIcon, { backgroundColor: destructive ? themeColors.dangerbg : themeColors.card2 }]}>
          <Text style={{ fontSize: 16 }}>{icon}</Text>
        </View>
        <Text style={[s.rowLabel, { color: destructive ? themeColors.danger : themeColors.txt }]}>{label}</Text>
      </View>
      <View style={s.rowRight}>
        {isSwitch ? (
          <Switch 
            value={switchValue} 
            onValueChange={onSwitchChange} 
            trackColor={{ false: '#767577', true: primaryColor }}
            thumbColor={'#f4f3f4'}
          />
        ) : (
          <>
            {value && <Text style={[s.rowValue, { color: themeColors.txt3 }]}>{value}</Text>}
            <Text style={[s.rowArrow, { color: themeColors.txt3 }]}>›</Text>
          </>
        )}
      </View>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: themeColors.bg }}>
      <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>

        {/* ULTRA PREMIUM HEADER */}
        <View style={s.headerContainer}>
          <LinearGradient
            colors={[primaryColor, primaryColor + 'CC', themeColors.bg]}
            style={s.coverGradient}
          />
          
          <View style={s.profileTop}>
            <TouchableOpacity 
              onPress={() => setEditModalVisible(true)}
              style={[s.avatarCircle, { borderColor: themeColors.bg, backgroundColor: themeColors.card }]}
            >
              <Text style={{ fontSize: 56 }}>{avatar}</Text>
              <View style={[s.editBadge, { backgroundColor: primaryColor }]}>
                <Text style={s.editBadgeIcon}>✎</Text>
              </View>
            </TouchableOpacity>

            <TouchableOpacity 
              style={[s.mainEditBtn, { backgroundColor: primaryColor }]}
              onPress={() => setEditModalVisible(true)}
            >
              <Text style={s.mainEditBtnTxt}>Edit Profile</Text>
            </TouchableOpacity>
          </View>

          <View style={s.infoSection}>
            <Text style={[s.displayName, { color: themeColors.txt }]}>{anon}</Text>
            <Text style={[s.campusSub, { color: primaryColor }]}>@{campus.toUpperCase()} · {campusName}</Text>
            
            <Text style={[s.bioTxt, { color: themeColors.txt2 }]}>{bio}</Text>

            <View style={s.tagContainer}>
              {(user?.tags || []).map((tag: string, i: number) => (
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
                <Text style={[s.statNum, { color: themeColors.txt }]}>{karma}</Text>
                <Text style={[s.statLbl, { color: themeColors.txt3 }]}>Patato</Text>
              </View>
              <View style={s.statBox}>
                <Text style={[s.statNum, { color: themeColors.txt }]}>{streak}</Text>
                <Text style={[s.statLbl, { color: themeColors.txt3 }]}>Streak</Text>
              </View>
              <View style={s.statBox}>
                <Text style={[s.statNum, { color: themeColors.txt }]}>{postCount}</Text>
                <Text style={[s.statLbl, { color: themeColors.txt3 }]}>Posts</Text>
              </View>
            </View>
          </View>
        </View>

        {/* Tab Selection */}
        <View style={[s.tabBar, { borderBottomColor: themeColors.bdr }]}>
          <TouchableOpacity 
            style={[s.tab, activeTab === 'posts' && [s.tabActive, { borderBottomColor: primaryColor }]]}
            onPress={() => setActiveTab('posts')}
          >
            <Text style={[s.tabTxt, { color: activeTab === 'posts' ? themeColors.txt : themeColors.txt3 }]}>Posts</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={[s.tab, activeTab === 'badges' && [s.tabActive, { borderBottomColor: primaryColor }]]}
            onPress={() => setActiveTab('badges')}
          >
            <Text style={[s.tabTxt, { color: activeTab === 'badges' ? themeColors.txt : themeColors.txt3 }]}>Badges</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={[s.tab, activeTab === 'settings' && [s.tabActive, { borderBottomColor: primaryColor }]]}
            onPress={() => setActiveTab('settings')}
          >
            <Text style={[s.tabTxt, { color: activeTab === 'settings' ? themeColors.txt : themeColors.txt3 }]}>Settings</Text>
          </TouchableOpacity>
        </View>

        <View style={s.contentArea}>
          {activeTab === 'posts' && (
            <View>
              {myPosts.length === 0 ? (
                <View style={s.emptyState}>
                  <Text style={s.emptyEmoji}>🏜️</Text>
                  <Text style={[s.emptyTitle, { color: themeColors.txt }]}>Zero Posts</Text>
                  <Text style={[s.emptySub, { color: themeColors.txt3 }]}>Your anonymous legacy starts with your first post.</Text>
                </View>
              ) : (
                myPosts.map(p => <PostCard key={p._id} post={p} />)
              )}
            </View>
          )}

          {activeTab === 'badges' && (
            <View style={s.badgeList}>
              {badges.length === 0 ? (
                <View style={s.emptyState}>
                  <Text style={s.emptyEmoji}>🎖️</Text>
                  <Text style={[s.emptyTitle, { color: themeColors.txt }]}>No Badges Yet</Text>
                  <Text style={[s.emptySub, { color: themeColors.txt3 }]}>Keep posting to unlock exclusive campus titles!</Text>
                </View>
              ) : (
                <View style={s.badgeGrid}>
                  {badges.map((b: string, i: number) => (
                    <View key={i} style={[s.badgeCard, { backgroundColor: themeColors.card, borderColor: themeColors.bdr }]}>
                      <Text style={s.badgeIconLarge}>{b.split(' ')[0]}</Text>
                      <Text style={[s.badgeNameLarge, { color: themeColors.txt }]}>{b.split(' ').slice(1).join(' ')}</Text>
                    </View>
                  ))}
                </View>
              )}
            </View>
          )}

          {activeTab === 'settings' && (
            <View>
              <Text style={[s.sectionTitle, { color: themeColors.txt3 }]}>ACCOUNT</Text>
              <View style={[s.settingsBlock, { backgroundColor: themeColors.card, borderColor: themeColors.bdr }]}>
                <SettingRow 
                  icon="👤" 
                  label="Campus" 
                  value={campus.toUpperCase()} 
                  onPress={() => Alert.alert('Campus', 'Your campus is fixed to your registration.')} 
                />
                <SettingRow 
                  icon="🔒" 
                  label="Private Account" 
                  isSwitch
                  switchValue={isPrivate}
                  onSwitchChange={handleTogglePrivate}
                />
              </View>

              <Text style={[s.sectionTitle, { color: themeColors.txt3 }]}>PREFERENCES</Text>
              <View style={[s.settingsBlock, { backgroundColor: themeColors.card, borderColor: themeColors.bdr }]}>
                <SettingRow 
                  icon={isDark ? "🌙" : "☀️"} 
                  label="Appearance" 
                  value={isDark ? "Dark Mode" : "Light Mode"}
                  onPress={toggleDark} 
                />
                <SettingRow 
                  icon="🔔" 
                  label="Push Notifications" 
                  isSwitch
                  switchValue={notifsEnabled}
                  onSwitchChange={handleToggleNotifs}
                />
                <SettingRow 
                  icon="📳" 
                  label="Haptic Feedback" 
                  isSwitch
                  switchValue={hapticsEnabled}
                  onSwitchChange={toggleHaptics}
                />
              </View>

              <Text style={[s.sectionTitle, { color: themeColors.txt3 }]}>SOCIAL</Text>
              <View style={[s.settingsBlock, { backgroundColor: themeColors.card, borderColor: themeColors.bdr }]}>
                <SettingRow 
                  icon="🎁" 
                  label="Invite Friends" 
                  onPress={handleInvite} 
                />
                <SettingRow 
                  icon="⭐" 
                  label="Rate Loona" 
                  onPress={handleRate} 
                />
              </View>

              {user?.role === 'admin' && (
                <>
                  <Text style={[s.sectionTitle, { color: themeColors.txt3 }]}>ADMINISTRATION</Text>
                  <View style={[s.settingsBlock, { backgroundColor: themeColors.card, borderColor: themeColors.bdr }]}>
                    <SettingRow 
                      icon="🛠️" 
                      label="Admin Dashboard" 
                      onPress={() => router.push('/admin')} 
                    />
                  </View>
                </>
              )}

              <Text style={[s.sectionTitle, { color: themeColors.txt3 }]}>SUPPORT</Text>
              <View style={[s.settingsBlock, { backgroundColor: themeColors.card, borderColor: themeColors.bdr }]}>
                <SettingRow icon="📄" label="Privacy Policy" onPress={openPrivacySheet} />
                <SettingRow icon="💬" label="Give Feedback" onPress={openFeedbackSheet} />
                <SettingRow 
                  icon="🚪" 
                  label="Logout" 
                  onPress={logout} 
                />
                <SettingRow 
                  icon="🗑️" 
                  label={deleting ? "Deleting..." : "Delete Account"}
                  onPress={handleDeleteAccount}
                  destructive 
                />
              </View>
            </View>
          )}
        </View>

        <View style={{ height: 120 }} />
      </ScrollView>

      {/* EDIT PROFILE MODAL */}
      <Modal visible={editModalVisible} animationType="slide" transparent>
        <View style={s.modalOverlay}>
          <View style={[s.modalBox, { backgroundColor: themeColors.bg }]}>
            <View style={s.modalHeader}>
              <TouchableOpacity onPress={() => setEditModalVisible(false)}>
                <Text style={{ color: themeColors.txt3, fontSize: 16 }}>Cancel</Text>
              </TouchableOpacity>
              <Text style={[s.modalTitle, { color: themeColors.txt }]}>Edit Profile</Text>
              <TouchableOpacity onPress={handleSaveProfile} disabled={updating}>
                {updating ? <ActivityIndicator size="small" color={primaryColor} /> : <Text style={{ color: primaryColor, fontFamily: 'Syne_700Bold', fontSize: 16 }}>Save</Text>}
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ padding: 20 }}>
              <View style={s.editAvatarSection}>
                <View style={[s.bigAvatarCircle, { backgroundColor: themeColors.card2, borderColor: primaryColor }]}>
                  <Text style={{ fontSize: 64 }}>{avatar}</Text>
                </View>
                <Text style={[s.editAvatarLabel, { color: themeColors.txt3 }]}>Tap an emoji below to change persona</Text>
              </View>

              <View style={s.avatarPickerGrid}>
                {AVATAR_OPTIONS.map((av) => (
                  <TouchableOpacity 
                    key={av} 
                    style={[
                      s.avatarOpt, 
                      { backgroundColor: themeColors.card, borderColor: themeColors.bdr },
                      avatar === av && { borderColor: primaryColor, borderWidth: 2 }
                    ]}
                    onPress={() => handleAvatarSelect(av)}
                    disabled={updating}
                  >
                    <Text style={{ fontSize: 24 }}>{av}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              <View style={s.inputGroup}>
                <Text style={[s.inputLabel, { color: themeColors.txt3 }]}>ANONYMOUS NAME</Text>
                <TextInput
                  style={[s.textInput, { color: themeColors.txt, borderColor: themeColors.bdr, backgroundColor: themeColors.card }]}
                  value={editName}
                  onChangeText={setEditName}
                  placeholder="Enter anonymous name..."
                  placeholderTextColor={themeColors.txt3}
                  maxLength={25}
                />
              </View>

              <View style={s.inputGroup}>
                <Text style={[s.inputLabel, { color: themeColors.txt3 }]}>BIO</Text>
                <TextInput
                  style={[s.textInput, s.bioInput, { color: themeColors.txt, borderColor: themeColors.bdr, backgroundColor: themeColors.card }]}
                  value={editBio}
                  onChangeText={setEditBio}
                  placeholder="Tell campus something about you..."
                  placeholderTextColor={themeColors.txt3}
                  multiline
                  maxLength={150}
                />
                <Text style={s.charCount}>{editBio.length}/150</Text>
              </View>

              <View style={s.inputGroup}>
                <Text style={[s.inputLabel, { color: themeColors.txt3 }]}>TAGS ({editTags.length}/5)</Text>
                <View style={s.tagInputRow}>
                  <TextInput
                    style={[s.textInput, { flex: 1, color: themeColors.txt, borderColor: themeColors.bdr, backgroundColor: themeColors.card }]}
                    value={newTag}
                    onChangeText={setNewTag}
                    placeholder="Add a tag..."
                    placeholderTextColor={themeColors.txt3}
                    maxLength={15}
                    onSubmitEditing={addTag}
                  />
                  <TouchableOpacity 
                    style={[s.addTagBtn, { backgroundColor: primaryColor }]}
                    onPress={addTag}
                  >
                    <Text style={s.addTagBtnTxt}>Add</Text>
                  </TouchableOpacity>
                </View>
                
                <View style={s.editTagList}>
                  {editTags.map((tag, i) => (
                    <TouchableOpacity 
                      key={i} 
                      style={[s.editTag, { backgroundColor: primaryColor + '10', borderColor: primaryColor + '40' }]}
                      onPress={() => removeTag(tag)}
                      activeOpacity={0.6}
                    >
                      <Text style={[s.editTagTxt, { color: primaryColor }]}>{tag}</Text>
                      <View style={[s.removeTagCircle, { backgroundColor: primaryColor }]}>
                        <Text style={s.removeTagIcon}>✕</Text>
                      </View>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
              
              <View style={{ height: 40 }} />
            </ScrollView>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  scroll: { backgroundColor: 'transparent' },
  headerContainer: { paddingBottom: 20 },
  coverGradient: { height: 180, width: '100%' },
  profileTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', paddingHorizontal: 20, marginTop: -60 },
  avatarCircle: { width: 110, height: 110, borderRadius: 55, borderWidth: 5, justifyContent: 'center', alignItems: 'center', position: 'relative', elevation: 10, shadowColor: '#000', shadowOpacity: 0.2, shadowRadius: 10, shadowOffset: { width: 0, height: 5 } },
  editBadge: { position: 'absolute', bottom: 0, right: 0, width: 30, height: 30, borderRadius: 15, alignItems: 'center', justifyContent: 'center', borderWidth: 3, borderColor: '#FFF' },
  editBadgeIcon: { color: '#FFF', fontSize: 14, fontWeight: '700' },
  mainEditBtn: { paddingHorizontal: 20, paddingVertical: 10, borderRadius: 20, marginBottom: 5 },
  mainEditBtnTxt: { color: '#FFF', fontFamily: 'Syne_700Bold', fontSize: 13 },

  infoSection: { paddingHorizontal: 20, marginTop: 15 },
  displayName: { fontFamily: 'Syne_700Bold', fontSize: 26 },
  campusSub: { fontFamily: 'PlusJakartaSans_700Bold', fontSize: 12, marginTop: 4, letterSpacing: 0.5 },
  bioTxt: { fontFamily: 'PlusJakartaSans_400Regular', fontSize: 14, marginTop: 12, lineHeight: 20 },
  
  statsBar: { flexDirection: 'row', marginTop: 24, gap: 30 },
  statBox: { alignItems: 'flex-start' },
  statNum: { fontFamily: 'Syne_700Bold', fontSize: 18 },
  statLbl: { fontFamily: 'PlusJakartaSans_600SemiBold', fontSize: 11, marginTop: 2, opacity: 0.7 },

  tabBar: { flexDirection: 'row', marginTop: 25, paddingHorizontal: 10, borderBottomWidth: 1 },
  tab: { flex: 1, alignItems: 'center', paddingVertical: 15, borderBottomWidth: 3, borderBottomColor: 'transparent' },
  tabActive: { borderBottomColor: Colors.ogi },
  tabTxt: { fontFamily: 'Syne_700Bold', fontSize: 14 },

  contentArea: { padding: 16 },
  emptyState: { alignItems: 'center', paddingVertical: 60 },
  emptyEmoji: { fontSize: 50, marginBottom: 15 },
  emptyTitle: { fontFamily: 'Syne_700Bold', fontSize: 18 },
  emptySub: { fontFamily: 'PlusJakartaSans_400Regular', fontSize: 14, textAlign: 'center', marginTop: 6, opacity: 0.6 },

  badgeList: { paddingVertical: 10 },
  badgeGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  badgeCard: { width: (width - 44) / 2, padding: 20, borderRadius: 24, borderWidth: 1, alignItems: 'center', elevation: 2 },
  badgeIconLarge: { fontSize: 40, marginBottom: 10 },
  badgeNameLarge: { fontFamily: 'Syne_700Bold', fontSize: 14, textAlign: 'center' },

  sectionTitle: { fontFamily: 'Syne_700Bold', fontSize: 11, letterSpacing: 1.5, marginBottom: 10, marginTop: 25, opacity: 0.5 },
  settingsBlock: { borderRadius: 24, borderWidth: 1, overflow: 'hidden' },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 18, borderBottomWidth: 1 },
  rowLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  rowIcon: { width: 36, height: 36, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  rowLabel: { fontFamily: 'PlusJakartaSans_600SemiBold', fontSize: 15 },
  rowRight: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  rowValue: { fontSize: 14, fontFamily: 'PlusJakartaSans_400Regular' },
  rowArrow: { fontSize: 18, fontWeight: '300' },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'flex-end' },
  modalBox: { borderTopLeftRadius: 40, borderTopRightRadius: 40, height: '92%' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, borderBottomWidth: 0.5, borderBottomColor: 'rgba(0,0,0,0.1)' },
  modalTitle: { fontFamily: 'Syne_700Bold', fontSize: 18 },
  
  editAvatarSection: { alignItems: 'center', marginVertical: 30 },
  bigAvatarCircle: { width: 130, height: 130, borderRadius: 65, borderWidth: 4, justifyContent: 'center', alignItems: 'center', marginBottom: 15 },
  editAvatarLabel: { fontSize: 12, fontFamily: 'PlusJakartaSans_400Regular' },
  
  avatarPickerGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, justifyContent: 'center', marginBottom: 30 },
  avatarOpt: { width: 54, height: 54, borderRadius: 27, borderWidth: 1, justifyContent: 'center', alignItems: 'center' },
  
  inputGroup: { marginBottom: 25 },
  inputLabel: { fontFamily: 'Syne_700Bold', fontSize: 11, letterSpacing: 1, marginBottom: 10 },
  textInput: { height: 56, borderRadius: 16, borderWidth: 1, paddingHorizontal: 16, fontFamily: 'PlusJakartaSans_600SemiBold', fontSize: 16 },
  bioInput: { height: 100, paddingTop: 16, textAlignVertical: 'top' },
  charCount: { alignSelf: 'flex-end', fontSize: 10, color: '#888', marginTop: 4 },

  tagContainer: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 15 },
  tag: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, borderWidth: 1 },
  tagText: { fontFamily: 'PlusJakartaSans_700Bold', fontSize: 11, letterSpacing: 0.3 },

  tagInputRow: { flexDirection: 'row', gap: 10 },
  addTagBtn: { paddingHorizontal: 18, justifyContent: 'center', borderRadius: 16 },
  addTagBtnTxt: { color: '#FFF', fontFamily: 'Syne_700Bold', fontSize: 14 },
  editTagList: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 12 },
  editTag: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 12, borderWidth: 1 },
  editTagTxt: { fontFamily: 'PlusJakartaSans_700Bold', fontSize: 13 },
  removeTagCircle: { width: 16, height: 16, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  removeTagIcon: { fontSize: 8, color: '#FFF', fontWeight: 'bold' },
});