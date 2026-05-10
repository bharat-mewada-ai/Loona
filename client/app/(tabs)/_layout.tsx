import { Tabs } from 'expo-router';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Colors, getColors } from '../../src/theme/colors';
import { useUIStore } from '../../src/store/uiStore';

import ComposeSheet from '../../src/components/sheets/ComposeSheet';
import ReportSheet from '../../src/components/sheets/ReportSheet';
import CommentSheet from '../../src/components/sheets/CommentSheet';
import AuthorProfileSheet from '../../src/components/sheets/AuthorProfileSheet';
import FeedbackSheet from '../../src/components/sheets/FeedbackSheet';
import PrivacySheet from '../../src/components/sheets/PrivacySheet';

function TabBar({ state, navigation }: any) {
  const { isDark } = useUIStore();
  const themeColors = getColors(isDark);
  const tabs = [
    { name: 'index', icon: '🏠', label: 'Feed' },
    { name: 'nearby', icon: '📍', label: 'Nearby' },
    { name: 'chats', icon: '💬', label: 'Chats' },
    { name: 'profile', icon: '👤', label: 'Profile' },
  ];

  return (
    <View style={[s.bar, { backgroundColor: themeColors.bg, borderTopColor: themeColors.bdr }]}>
      {tabs.map((tab, i) => {
        const focused = state.index === i;
        return (
          <TouchableOpacity
            key={tab.name}
            style={s.ni}
            onPress={() => navigation.navigate(tab.name)}
            activeOpacity={0.7}
          >
            <View style={[s.iconWrap, focused && { borderTopWidth: 2, borderTopColor: themeColors.ogi }]}>
              <Text style={[s.niIcon, { color: focused ? themeColors.ogi : themeColors.txt3 }]}>{tab.icon}</Text>
              <Text style={[s.niLabel, { color: focused ? themeColors.ogi : themeColors.txt3 }]}>{tab.label}</Text>
            </View>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

export default function TabsLayout() {
  const { 
    showComposeSheet, showReportSheet, showCommentSheet, 
    showFeedbackSheet, showPrivacySheet, isDark 
  } = useUIStore();

  return (
    <View style={{ flex: 1, backgroundColor: isDark ? '#000' : '#fff' }}>
      <Tabs
        tabBar={(props) => <TabBar {...props} />}
        screenOptions={{ headerShown: false }}
      >
        <Tabs.Screen name="index" />
        <Tabs.Screen name="nearby" />
        <Tabs.Screen name="chats" />
        <Tabs.Screen name="profile" />
      </Tabs>
      {showComposeSheet && <ComposeSheet />}
      {showReportSheet && <ReportSheet />}
      {showCommentSheet && <CommentSheet />}
      {showFeedbackSheet && <FeedbackSheet />}
      {showPrivacySheet && <PrivacySheet />}
      <AuthorProfileSheet />
    </View>
  );
}

const s = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    borderTopWidth: 0.5,
    paddingBottom: 12,
  },
  ni: {
    flex: 1,
    alignItems: 'center',
  },
  iconWrap: {
    alignItems: 'center',
    gap: 4,
    paddingTop: 8,
    width: '100%',
  },
  niIcon: { fontSize: 20 },
  niLabel: {
    fontSize: 10,
    fontWeight: '700',
    fontFamily: 'PlusJakartaSans_700Bold',
  },
});
