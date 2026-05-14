import { Tabs } from 'expo-router';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Colors, getColors } from '../../src/theme/colors';
import { useUIStore } from '../../src/store/uiStore';

import { Ionicons } from '@expo/vector-icons';

const THEME = {
  bg: '#0a0a0f',
  active: '#ff6b35', // Premium Orange
  inactive: '#44444a',
  border: 'rgba(255,255,255,0.05)',
};

function TabBar({ state, navigation }: any) {
  const { isDark } = useUIStore();
  const themeColors = getColors(isDark);

  const tabs = [
    { name: 'index', icon: 'home-outline', label: 'Feed' },
    { name: 'nearby', icon: 'location-outline', label: 'Nearby' },
    { name: 'chats', icon: 'chatbubble-outline', label: 'Chats' },
    { name: 'profile', icon: 'person-outline', label: 'Profile' },
  ];

  const activeColor = themeColors.ogi; // Loona Orange/Lime depending on theme
  const inactiveColor = isDark ? '#44444a' : '#999';

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
            accessibilityRole="tab"
            accessibilityLabel={`${tab.label} tab`}
            accessibilityState={{ selected: focused }}
          >
            {/* Top Indicator Line */}
            {focused && <View style={[s.indicator, { backgroundColor: activeColor, shadowColor: activeColor }]} />}
            
            <View style={s.iconWrap}>
              <Ionicons 
                name={tab.icon as any} 
                size={24} 
                color={focused ? activeColor : inactiveColor} 
              />
              <Text style={[s.niLabel, { color: focused ? activeColor : inactiveColor }]}>{tab.label}</Text>
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
        <Tabs.Screen name="index" />
        <Tabs.Screen name="nearby" />
        <Tabs.Screen name="chats" />
        <Tabs.Screen name="profile" />
      </Tabs>
    </View>
  );
}

const s = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: THEME.bg,
    borderTopWidth: 1,
    borderTopColor: THEME.border,
    paddingBottom: 10, // Standard padding
    height: 60, // Standard height
  },
  ni: {
    flex: 1,
    alignItems: 'center',
    height: '100%',
    justifyContent: 'center',
  },
  indicator: {
    position: 'absolute',
    top: -1,
    width: '50%',
    height: 3,
    backgroundColor: THEME.active,
    borderBottomLeftRadius: 3,
    borderBottomRightRadius: 3,
    shadowColor: THEME.active,
    shadowOpacity: 0.5,
    shadowRadius: 10,
    elevation: 5,
  },
  iconWrap: {
    alignItems: 'center',
    gap: 6,
    marginTop: 8,
  },
  niLabel: {
    fontSize: 11,
    fontWeight: '800',
    fontFamily: 'Syne_700Bold',
    letterSpacing: 0.3,
  },
});
