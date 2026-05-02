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
    { name: 'index', icon: '🏠', label: 'FEED' },
    { name: 'leaderboard', icon: '⚡', label: 'RANKS' },
    { name: 'chats', icon: '💬', label: 'CHATS' },
    { name: 'profile', icon: '👤', label: 'ME' },
  ];

  return (
    <View style={[s.bar, { backgroundColor: themeColors.card, borderTopColor: themeColors.bdr }]}>
      {tabs.map((tab, i) => {
        const focused = state.index === i;
        return (
          <TouchableOpacity
            key={tab.name}
            style={s.ni}
            onPress={() => navigation.navigate(tab.name)}
            activeOpacity={0.7}
          >
            <Text style={[s.niIcon, focused && s.niIconOn]}>{tab.icon}</Text>
            <Text style={[s.niLabel, { color: themeColors.txt3 }, focused && { color: themeColors.ogi }]}>{tab.label}</Text>
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
        <Tabs.Screen name="leaderboard" />
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
    backgroundColor: Colors.card,
    borderTopWidth: 1,
    borderTopColor: Colors.bdr,
    paddingBottom: 12,
    paddingTop: 5,
  },
  ni: {
    flex: 1,
    alignItems: 'center',
    gap: 2,
    paddingVertical: 4,
  },
  niIcon: { fontSize: 17, opacity: 0.4 },
  niIconOn: { opacity: 1 },
  niLabel: {
    fontSize: 8,
    color: Colors.txt3,
    fontWeight: '700',
    letterSpacing: 0.4,
    fontFamily: 'Syne_700Bold',
  },
  niLabelOn: { color: Colors.ogi },
});
