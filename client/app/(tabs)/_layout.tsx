import { Tabs } from 'expo-router';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { getColors } from '../../src/theme/colors';
import { useUIStore } from '../../src/store/uiStore';
import { Ionicons } from '@expo/vector-icons';

const THEME = {
  bg: '#0a0a0f',
  active: '#ff6b35',
  inactive: '#44444a',
  border: 'rgba(255,255,255,0.05)',
};

// Height of the visible icon + label content area
const TAB_CONTENT_HEIGHT = 56;

function TabBar({ state, navigation }: any) {
  const { isDark } = useUIStore();
  const themeColors = getColors(isDark);
  // insets.bottom = Android nav bar height (0 on gesture nav, ~48dp on 3-button nav)
  const insets = useSafeAreaInsets();
  const bottomPad = insets.bottom;

  const tabs = [
    { name: 'index',   icon: 'home-outline',      label: 'Feed'    },
    { name: 'nearby',  icon: 'location-outline',   label: 'Nearby'  },
    { name: 'chats',   icon: 'chatbubble-outline', label: 'Chats'   },
    { name: 'profile', icon: 'person-outline',     label: 'Profile' },
  ];

  const activeColor   = themeColors.ogi;
  const inactiveColor = isDark ? '#44444a' : '#999';

  return (
    <View
      style={[
        s.bar,
        {
          backgroundColor: themeColors.bg,
          borderTopColor: themeColors.bdr,
          // System nav buttons live in the bottom padding — they never overlap icons
          paddingBottom: bottomPad,
          height: TAB_CONTENT_HEIGHT + bottomPad,
        },
      ]}
    >
      {tabs.map((tab, i) => {
        const focused = state.index === i;
        return (
          <TouchableOpacity
            key={tab.name}
            style={s.ni}
            onPress={() => navigation.navigate(tab.name)}
            activeOpacity={0.7}
            accessibilityRole="tab"
            accessibilityLabel={`${tab.label} tab`}
            accessibilityState={{ selected: focused }}
          >
            {/* Top indicator stripe */}
            {focused && (
              <View
                style={[
                  s.indicator,
                  { backgroundColor: activeColor, shadowColor: activeColor },
                ]}
              />
            )}

            <View style={s.iconWrap}>
              <Ionicons
                name={tab.icon as any}
                size={24}
                color={focused ? activeColor : inactiveColor}
              />
              <Text style={[s.niLabel, { color: focused ? activeColor : inactiveColor }]}>
                {tab.label}
              </Text>
            </View>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

export default function TabsLayout() {
  const { isDark } = useUIStore();

  return (
    <View style={{ flex: 1, backgroundColor: THEME.bg }}>
      <Tabs
        tabBar={(props) => <TabBar {...props} />}
        screenOptions={{ headerShown: false }}
      >
        <Tabs.Screen name="index"   />
        <Tabs.Screen name="nearby"  />
        <Tabs.Screen name="chats"   />
        <Tabs.Screen name="profile" />
      </Tabs>
    </View>
  );
}

const s = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    // Icons align to top of bar; bottomPad handles the system nav area
    alignItems: 'flex-start',
    borderTopWidth: 1,
  },
  ni: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'flex-start',
    paddingTop: 8,
    height: TAB_CONTENT_HEIGHT,
  },
  indicator: {
    position: 'absolute',
    top: -1,
    width: '50%',
    height: 3,
    borderBottomLeftRadius: 3,
    borderBottomRightRadius: 3,
    shadowOpacity: 0.5,
    shadowRadius: 10,
    elevation: 5,
  },
  iconWrap: {
    alignItems: 'center',
    gap: 4,
  },
  niLabel: {
    fontSize: 11,
    fontWeight: '600',
    fontFamily: 'PlusJakartaSans_600SemiBold',
    letterSpacing: 0.3,
  },
});
