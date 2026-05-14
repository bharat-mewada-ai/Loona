import React, { useState, useEffect } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet, SafeAreaView,
  Modal, ActivityIndicator, Alert, Switch, TextInput, Platform,
  Dimensions, Image, Share, Linking, FlatList
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import * as Notifications from 'expo-notifications';
import { useRouter } from 'expo-router';
import { Colors, getColors } from '../../src/theme/colors';
import { useAuthStore } from '../../src/store/authStore';
import { useUIStore } from '../../src/store/uiStore';
import { useLogout, useUpdateProfile, useMe, useDeleteAccount } from '../../src/hooks/useAuth';
import { useMyPosts, useSavedPosts } from '../../src/hooks/usePosts';
import { Ionicons } from '@expo/vector-icons';
import { triggerHaptic } from '../../src/utils/haptics';
import StandardCard from '../../src/components/cards/StandardCard';
import { CAMPUSES_LIST } from '../../src/constants';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const { width } = Dimensions.get('window');

const AVATAR_OPTIONS = [
  "🦊", "🐯", "🦉", "🐺", "🐦‍⬛", "🦅", "🐆", "🐍", "🐻", "🦈", "🦝", "🐼", "🐸", "🐹", "🦁", "🐨",
  "🕶️", "🎭", "👻", "🤖", "🛸", "🌈", "🌕", "🍄", "🎸", "🎨", "👾", "🤠", "🔥", "⚡", "🍀", "🎲"
];

export default function ProfileScreen() {
  const router = useRouter();
  const { user } = useAuthStore();
  const { isDark, toggleDark, openFeedbackSheet, openPrivacySheet, hapticsEnabled, toggleHaptics } = useUIStore();
  const themeColors = getColors(isDark);
  const logout = useLogout();
  const { mutate: updateProfile, isPending: updating } = useUpdateProfile();
  const { mutate: deleteAccount } = useDeleteAccount();
  const insets = useSafeAreaInsets();

  const [settingsVisible, setSettingsVisible] = useState(false);
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [editBioVisible, setEditBioVisible] = useState(false);
  const [campusPickerVisible, setCampusPickerVisible] = useState(false);
  const [activeView, setActiveView] = useState<'main' | 'posts' | 'saved'>('main');

  const [newBio, setNewBio] = useState(user?.bio || '');
  const [newTags, setNewTags] = useState(user?.tags?.join(', ') || '');

  const { data: myPostsData } = useMyPosts();
  const { data: savedPosts } = useSavedPosts();
  
  const myPosts = myPostsData?.pages?.flatMap((p: any) => p?.posts ?? []) ?? [];
  const karma = user?.karma ?? 0;
  const postCount = user?.postCount ?? 0;
  const repliesCount = user?.commentsCount ?? 0;
  const campus = user?.campus?.toUpperCase() || 'OGI';

  const handleLogout = () => {
    Alert.alert('Logout', 'Are you sure?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Logout', style: 'destructive', onPress: () => {
        setSettingsVisible(false);
        logout();
      }}
    ]);
  };

  const ActivityItem = ({ icon, label, count, onPress, color }: any) => (
    <TouchableOpacity style={[s.activityItem, { borderBottomColor: themeColors.bdr }]} onPress={onPress}>
      <View style={s.rowLeft}>
        <View style={[s.activityIcon, { backgroundColor: color + '15' }]}>
          <Ionicons name={icon} size={20} color={color} />
        </View>
        <Text style={[s.activityLabel, { color: themeColors.txt }]}>{label}</Text>
      </View>
      <View style={s.rowRight}>
        {count !== undefined && <Text style={[s.activityCount, { color: themeColors.txt3 }]}>{count}</Text>}
        <Ionicons name="chevron-forward" size={18} color={themeColors.txt3} />
      </View>
    </TouchableOpacity>
  );

  const SettingRow = ({ icon, label, value, onPress, isSwitch, switchValue, onSwitchChange, destructive }: any) => (
    <TouchableOpacity 
      style={[s.settingRow, { borderBottomColor: themeColors.bdr }]} 
      onPress={onPress} 
      activeOpacity={0.7}
      disabled={isSwitch}
    >
      <View style={s.rowLeft}>
        <View style={[s.settingIcon, { backgroundColor: destructive ? '#FF3B3015' : themeColors.card2 }]}>
          <Ionicons name={icon} size={18} color={destructive ? '#FF3B30' : themeColors.txt} />
        </View>
        <Text style={[s.settingLabel, { color: destructive ? '#FF3B30' : themeColors.txt }]}>{label}</Text>
      </View>
      <View style={s.rowRight}>
        {isSwitch ? (
          <Switch 
            value={switchValue} 
            onValueChange={onSwitchChange} 
            trackColor={{ false: '#767577', true: themeColors.ogi }}
          />
        ) : (
          <>
            {value && <Text style={[s.settingValue, { color: themeColors.txt3 }]}>{value}</Text>}
            <Ionicons name="chevron-forward" size={16} color={themeColors.txt3} />
          </>
        )}
      </View>
    </TouchableOpacity>
  );

  if (activeView === 'posts' || activeView === 'saved') {
    const listData = activeView === 'posts' ? myPosts : (Array.isArray(savedPosts) ? savedPosts : []);
    
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: themeColors.bg }}>
        <View style={s.subHeader}>
          <TouchableOpacity onPress={() => setActiveView('main')} style={s.backBtn}>
            <Ionicons name="chevron-back" size={28} color={themeColors.txt} />
          </TouchableOpacity>
          <Text style={[s.subTitle, { color: themeColors.txt }]}>{activeView === 'posts' ? 'My Posts' : 'Saved Posts'}</Text>
          <View style={{ width: 40 }} />
        </View>
        <FlatList
          data={listData}
          keyExtractor={item => item?._id || Math.random().toString()}
          renderItem={({ item }) => item ? (
            <StandardCard 
              post={item} 
              onDelete={() => {}} 
              onReport={() => {}} 
            />
          ) : null}
          contentContainerStyle={{ padding: 16 }}
          ListEmptyComponent={<Text style={{ textAlign: 'center', color: themeColors.txt3, marginTop: 40 }}>Nothing here yet...</Text>}
        />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: themeColors.bg }}>
      <View style={s.header}>
        <Text style={[s.logo, { color: themeColors.txt }]}>
          🌙 <Text style={{ fontFamily: 'Syne_700Bold' }}>profile</Text>
        </Text>
        <TouchableOpacity onPress={() => setSettingsVisible(true)} style={[s.gearBtn, { backgroundColor: themeColors.card2 }]}>
          <Ionicons name="settings-sharp" size={20} color={themeColors.txt} />
        </TouchableOpacity>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={s.scroll}>
        {/* Profile Info */}
        <View style={s.profileInfo}>
          <TouchableOpacity onPress={() => setEditModalVisible(true)} style={[s.avatarCircle, { backgroundColor: themeColors.card2, borderColor: themeColors.ogi }]}>
            <Text style={{ fontSize: 60 }}>{user?.avatar || '🦁'}</Text>
            <View style={s.editBadge}><Ionicons name="pencil" size={12} color="#FFF" /></View>
          </TouchableOpacity>
          <Text style={[s.name, { color: themeColors.txt }]}>{user?.name || 'Anonymous'}</Text>
          <Text style={[s.campus, { color: themeColors.txt3 }]}>{campus}</Text>
          
          {user?.bio ? (
            <Text style={[s.userBio, { color: themeColors.txt2 }]}>{user.bio}</Text>
          ) : null}

          {user?.tags && user.tags.length > 0 && (
            <View style={s.tagsRow}>
              {user.tags.map(tag => (
                <View key={tag} style={[s.userTag, { backgroundColor: themeColors.card2 }]}>
                  <Text style={[s.userTagTxt, { color: themeColors.txt2 }]}>#{tag}</Text>
                </View>
              ))}
            </View>
          )}

          <TouchableOpacity onPress={() => setEditBioVisible(true)} style={[s.editProfileBtn, { borderColor: themeColors.bdr }]}>
            <Text style={{ color: themeColors.txt2, fontSize: 12, fontWeight: '600' }}>Edit Bio & Tags</Text>
          </TouchableOpacity>

          <View style={s.statsBar}>
            <View style={s.statItem}>
              <Text style={[s.statNum, { color: themeColors.txt }]}>{postCount}</Text>
              <Text style={[s.statLabel, { color: themeColors.txt3 }]}>Posts</Text>
            </View>
            <View style={s.statItem}>
              <Text style={[s.statNum, { color: themeColors.ogi }]}>{karma > 999 ? `${(karma/1000).toFixed(1)}k` : karma}</Text>
              <Text style={[s.statLabel, { color: themeColors.txt3 }]}>Potatoes</Text>
            </View>
            <View style={s.statItem}>
              <Text style={[s.statNum, { color: themeColors.txt }]}>#{user?.campusRank || '99+'}</Text>
              <Text style={[s.statLabel, { color: themeColors.txt3 }]}>Rank</Text>
            </View>
          </View>
        </View>

        {/* Karma Card */}
        <TouchableOpacity style={[s.karmaCard, { backgroundColor: themeColors.card }]} activeOpacity={0.9}>
          <View style={s.karmaLeft}>
            <View style={s.flameCircle}>
              <Text style={{ fontSize: 24 }}>🔥</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[s.karmaNum, { color: themeColors.ogi }]}>{karma.toLocaleString()}</Text>
              <Text style={[s.karmaLabel, { color: themeColors.txt3 }]}>Campus Karma · Top Contributor at {campus}</Text>
            </View>
          </View>
        </TouchableOpacity>



        <Text style={[s.sectionTitle, { color: themeColors.txt3 }]}>YOUR ACTIVITY</Text>
        <View style={[s.activityBox, { backgroundColor: themeColors.card }]}>
          <ActivityItem icon="document-text" label="My Posts" count={postCount} color="#FF9500" onPress={() => setActiveView('posts')} />
          <ActivityItem icon="bookmark" label="Saved Posts" count={Array.isArray(savedPosts) ? savedPosts.length : 0} color="#007AFF" onPress={() => setActiveView('saved')} />
        </View>

        <Text style={[s.sectionTitle, { color: themeColors.txt3, marginTop: 25 }]}>SETTINGS</Text>
        <View style={[s.activityBox, { backgroundColor: themeColors.card }]}>
          <TouchableOpacity 
            style={[s.settingRow, { borderBottomColor: themeColors.bdr }]} 
            onPress={() => setEditModalVisible(true)}
          >
            <View style={s.rowLeft}>
              <View style={[s.iconBox, { backgroundColor: '#AF52DE20' }]}>
                <Ionicons name="person" size={20} color="#AF52DE" />
              </View>
              <Text style={[s.settingLabel, { color: themeColors.txt }]}>Anonymous Identity</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={themeColors.txt3} />
          </TouchableOpacity>

          <TouchableOpacity 
            style={[s.settingRow, { borderBottomColor: themeColors.bdr }]} 
            onPress={() => router.push('/notifications')}
          >
            <View style={s.rowLeft}>
              <View style={[s.iconBox, { backgroundColor: '#34C75920' }]}>
                <Ionicons name="notifications" size={20} color="#34C759" />
              </View>
              <Text style={[s.settingLabel, { color: themeColors.txt }]}>Notifications</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={themeColors.txt3} />
          </TouchableOpacity>

          <TouchableOpacity 
            style={s.settingRow} 
            onPress={handleLogout}
          >
            <View style={s.rowLeft}>
              <View style={[s.iconBox, { backgroundColor: '#FF3B3020' }]}>
                <Ionicons name="log-out" size={20} color="#FF3B30" />
              </View>
              <Text style={[s.settingLabel, { color: themeColors.txt }]}>Log Out</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={themeColors.txt3} />
          </TouchableOpacity>
        </View>

        <View style={{ height: 100 }} />
      </ScrollView>

      {/* Settings Modal */}
      <Modal visible={settingsVisible} animationType="slide" transparent onRequestClose={() => setSettingsVisible(false)}>
        <View style={s.modalOverlay}>
          <View style={[s.modalBox, { backgroundColor: themeColors.bg }]}>
            <View style={s.modalHeader}>
              <Text style={[s.modalTitle, { color: themeColors.txt }]}>Settings</Text>
              <TouchableOpacity onPress={() => setSettingsVisible(false)}>
                <Ionicons name="close" size={24} color={themeColors.txt} />
              </TouchableOpacity>
            </View>
            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ padding: 20 }}>
              <Text style={s.groupLabel}>ACCOUNT</Text>
              <View style={[s.settingsGroup, { backgroundColor: themeColors.card }]}>
                <SettingRow icon="person-outline" label="Anonymous Identity" onPress={() => { setSettingsVisible(false); setEditModalVisible(true); }} />
                <TouchableOpacity style={s.settingRow} onPress={() => setCampusPickerVisible(true)}>
                  <View style={s.rowLeft}>
                    <View style={[s.settingIcon, { backgroundColor: '#34C75920' }]}>
                      <Ionicons name="business" size={18} color="#34C759" />
                    </View>
                    <Text style={[s.settingLabel, { color: themeColors.txt }]}>Change Campus</Text>
                  </View>
                  <View style={s.rowRight}>
                    <Text style={[s.settingValue, { color: themeColors.txt3 }]}>{campus}</Text>
                    <Ionicons name="chevron-forward" size={16} color={themeColors.txt3} />
                  </View>
                </TouchableOpacity>
                <SettingRow icon="lock-closed-outline" label="Private Account" isSwitch switchValue={user?.isPrivate} onSwitchChange={(val: boolean) => updateProfile({ isPrivate: val })} />
              </View>

              <Text style={s.groupLabel}>PREFERENCES</Text>
              <View style={[s.settingsGroup, { backgroundColor: themeColors.card }]}>
                <SettingRow icon="moon-outline" label="Appearance" value={isDark ? "Dark Mode" : "Light Mode"} onPress={toggleDark} />
                <SettingRow icon="notifications-outline" label="Push Notifications" isSwitch switchValue={user?.notificationsEnabled} onSwitchChange={(val: boolean) => updateProfile({ notificationsEnabled: val })} />
                <SettingRow icon="phone-portrait-outline" label="Haptic Feedback" isSwitch switchValue={hapticsEnabled} onSwitchChange={toggleHaptics} />
              </View>

              <Text style={s.groupLabel}>SUPPORT</Text>
              <View style={[s.settingsGroup, { backgroundColor: themeColors.card }]}>
                <SettingRow icon="share-social-outline" label="Invite Friends" onPress={() => {
                  Share.share({ message: "Join me on Loona, the best campus app! Download: https://loona.app" });
                }} />
                <SettingRow icon="document-outline" label="Privacy Policy" onPress={openPrivacySheet} />
                <SettingRow icon="chatbubble-outline" label="Give Feedback" onPress={openFeedbackSheet} />
                <SettingRow icon="log-out-outline" label="Logout" onPress={handleLogout} />
                <SettingRow icon="trash-outline" label="Delete Account" destructive onPress={() => deleteAccount()} />
              </View>
              <View style={{ height: 40 }} />
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Edit Profile Modal (Avatar Picker) */}
      <Modal visible={editModalVisible} animationType="fade" transparent onRequestClose={() => setEditModalVisible(false)}>
        <View style={s.modalOverlay}>
          <View style={[s.editModal, { backgroundColor: themeColors.bg }]}>
            <Text style={[s.modalTitle, { color: themeColors.txt, textAlign: 'center', marginBottom: 20 }]}>Change Avatar</Text>
            <ScrollView contentContainerStyle={s.avatarGrid} showsVerticalScrollIndicator={false}>
              {AVATAR_OPTIONS.map(av => (
                <TouchableOpacity 
                  key={av} 
                  style={[s.avOpt, { backgroundColor: themeColors.card2 }, user?.avatar === av && { borderColor: themeColors.ogi, borderWidth: 2 }]}
                  onPress={() => { updateProfile({ avatar: av }); setEditModalVisible(false); }}
                >
                  <Text style={{ fontSize: 30 }}>{av}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
            <TouchableOpacity onPress={() => setEditModalVisible(false)} style={s.closeBtn}>
              <Text style={{ color: themeColors.ogi, fontWeight: '700' }}>Done</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Edit Bio & Tags Modal */}
      <Modal visible={editBioVisible} animationType="slide" transparent onRequestClose={() => setEditBioVisible(false)}>
        <View style={s.modalOverlay}>
          <View style={[s.editModal, { backgroundColor: themeColors.bg, height: 'auto' }]}>
            <Text style={[s.modalTitle, { color: themeColors.txt, marginBottom: 20 }]}>Edit Profile</Text>
            
            <Text style={s.inputLabel}>BIO</Text>
            <TextInput
              style={[s.textInput, { backgroundColor: themeColors.card2, color: themeColors.txt }]}
              placeholder="Tell us something..."
              placeholderTextColor={themeColors.txt3}
              value={newBio}
              onChangeText={setNewBio}
              maxLength={150}
              multiline
            />

            <Text style={[s.inputLabel, { marginTop: 15 }]}>TAGS (comma separated)</Text>
            <TextInput
              style={[s.textInput, { backgroundColor: themeColors.card2, color: themeColors.txt }]}
              placeholder="coding, music, cricket..."
              placeholderTextColor={themeColors.txt3}
              value={newTags}
              onChangeText={setNewTags}
              maxLength={100}
            />

            <TouchableOpacity 
              style={[s.saveBtn, { backgroundColor: themeColors.ogi }]}
              onPress={() => {
                const tagList = newTags.split(',').map(t => t.trim()).filter(t => t.length > 0);
                updateProfile({ bio: newBio, tags: tagList });
                setEditBioVisible(false);
              }}
            >
              <Text style={{ color: '#FFF', fontWeight: '700' }}>Save Changes</Text>
            </TouchableOpacity>

            <TouchableOpacity onPress={() => setEditBioVisible(false)} style={s.closeBtn}>
              <Text style={{ color: themeColors.txt3 }}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Campus Picker Modal */}
      <Modal visible={campusPickerVisible} transparent animationType="slide">
        <View style={s.modalOverlay}>
          <View style={[s.modalBox, { backgroundColor: themeColors.card }]}>
            <View style={s.modalHeader}>
              <Text style={[s.modalTitle, { color: themeColors.txt }]}>Select Campus</Text>
              <TouchableOpacity onPress={() => setCampusPickerVisible(false)}>
                <Ionicons name="close" size={24} color={themeColors.txt} />
              </TouchableOpacity>
            </View>
            <View style={{ padding: 20, gap: 15 }}>
              {CAMPUSES_LIST.filter(c => c.value !== 'all').map(c => (
                <TouchableOpacity 
                  key={c.value} 
                  style={[s.settingRow, { backgroundColor: themeColors.card2, borderRadius: 15, paddingHorizontal: 20, borderBottomWidth: 0 }]}
                  onPress={() => {
                     updateProfile({ campus: c.value });
                     useUIStore.getState().setCampus(c.value);
                     setCampusPickerVisible(false);
                  }}
                >
                  <Text style={[s.settingLabel, { color: themeColors.txt }]}>{c.label}</Text>
                  {campus.toLowerCase() === c.value && <Ionicons name="checkmark-circle" size={20} color={themeColors.ogi} />}
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20 },
  logo: { fontSize: 24, fontFamily: 'Syne_400Regular' },
  gearBtn: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  scroll: { paddingBottom: 40 },
  profileInfo: { alignItems: 'center', marginTop: 10 },
  avatarCircle: { width: 120, height: 120, borderRadius: 60, borderWidth: 3, justifyContent: 'center', alignItems: 'center', position: 'relative' },
  editBadge: { position: 'absolute', bottom: 5, right: 5, backgroundColor: '#333', width: 24, height: 24, borderRadius: 12, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: '#FFF' },
  name: { fontSize: 22, fontWeight: '800', marginTop: 15, fontFamily: 'Syne_700Bold' },
  campus: { fontSize: 13, marginTop: 5, opacity: 0.7 },
  statsBar: { flexDirection: 'row', width: '100%', justifyContent: 'center', gap: 40, marginTop: 25 },
  statItem: { alignItems: 'center' },
  statNum: { fontSize: 20, fontWeight: '800', fontFamily: 'Syne_700Bold' },
  statLabel: { fontSize: 11, marginTop: 2 },
  sectionTitle: { fontSize: 11, fontWeight: '800', marginHorizontal: 20, marginBottom: 10, letterSpacing: 1 },
  saveBtn: { marginTop: 25, height: 50, borderRadius: 25, alignItems: 'center', justifyContent: 'center' },
  activityBox: { marginHorizontal: 20, borderRadius: 20, overflow: 'hidden' },
  activityItem: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, borderBottomWidth: 0.5 },
  activityIcon: { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  activityLabel: { fontSize: 15, fontWeight: '600', marginLeft: 12 },
  activityCount: { fontSize: 14, fontWeight: '700', marginRight: 5 },
  rowLeft: { flexDirection: 'row', alignItems: 'center' },
  rowRight: { flexDirection: 'row', alignItems: 'center' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.8)', justifyContent: 'flex-end' },
  modalBox: { borderTopLeftRadius: 30, borderTopRightRadius: 30, height: '85%' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, borderBottomWidth: 0.5, borderBottomColor: '#333' },
  modalTitle: { fontSize: 18, fontWeight: '800' },
  groupLabel: { fontSize: 11, fontWeight: '800', color: '#888', marginTop: 20, marginBottom: 10, letterSpacing: 1 },
  settingsGroup: { borderRadius: 20, overflow: 'hidden' },
  settingRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, borderBottomWidth: 0.5 },
  settingIcon: { width: 32, height: 32, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  settingLabel: { fontSize: 15, fontWeight: '500', marginLeft: 12 },
  settingValue: { fontSize: 13, marginRight: 5 },
  editModal: { margin: 20, borderRadius: 30, padding: 20, maxHeight: '70%' },
  avatarGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 15, paddingVertical: 10 },
  avOpt: { width: 60, height: 60, borderRadius: 30, alignItems: 'center', justifyContent: 'center' },
  closeBtn: { marginTop: 20, alignItems: 'center', padding: 15 },
  subHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16 },
  subTitle: { fontSize: 18, fontWeight: '800' },
  backBtn: { width: 40, height: 40, justifyContent: 'center' },
  iconBox: { width: 42, height: 42, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  userBio: { fontSize: 14, marginTop: 10, textAlign: 'center', paddingHorizontal: 40, opacity: 0.8 },
  tagsRow: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 8, marginTop: 12 },
  userTag: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  userTagTxt: { fontSize: 12, fontWeight: '600' },
  editProfileBtn: { marginTop: 15, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 15, borderWidth: 1 },
  inputLabel: { fontSize: 11, fontWeight: '800', color: '#888', marginBottom: 5, letterSpacing: 1 },
  textInput: { borderRadius: 15, padding: 15, fontSize: 15, minHeight: 50 },
  premiumPromo: { marginHorizontal: 20, marginBottom: 25, borderRadius: 24, overflow: 'hidden' },
  premiumGradient: { padding: 20 },
  premiumContent: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  premiumTitle: { fontSize: 18, fontWeight: '900', color: '#000', marginBottom: 2 },
  premiumSubtitle: { fontSize: 12, color: 'rgba(0,0,0,0.6)', fontWeight: '600' },
  karmaCard: { marginHorizontal: 20, marginBottom: 20, padding: 20, borderRadius: 24, flexDirection: 'row', alignItems: 'center' },
  karmaLeft: { flexDirection: 'row', alignItems: 'center', flex: 1, gap: 15 },
  flameCircle: { width: 50, height: 50, borderRadius: 25, backgroundColor: '#c8f53a20', alignItems: 'center', justifyContent: 'center' },
  karmaNum: { fontSize: 28, fontWeight: '900', fontFamily: 'Syne_700Bold' },
  karmaLabel: { fontSize: 12, fontWeight: '600' },
});