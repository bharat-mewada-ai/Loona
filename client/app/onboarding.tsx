import React, { useState, useRef } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, 
  Dimensions, FlatList, ViewToken, Image
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getColors } from '../src/theme/colors';
import { useUIStore } from '../src/store/uiStore';

const { width, height } = Dimensions.get('window');

const SLIDES = [
  {
    id: '1',
    title: 'Stay Anonymous',
    desc: 'Express yourself freely without revealing your identity. Every post is private and safe.',
    icon: 'eye-off-outline',
    colors: ['#FF9500', '#FFCC00'],
  },
  {
    id: '2',
    title: 'Connect with Campus',
    desc: 'Join the conversation at OGI, LNCT, MANIT, and RGPV. See what is happening around you.',
    icon: 'business-outline',
    colors: ['#c8f53a', '#a6d42d'],
  },
  {
    id: '3',
    title: 'Earn Potatoes',
    desc: 'Get potatoes for your contributions and climb the campus leaderboard. Be a legend!',
    icon: 'flame-outline',
    colors: ['#FF3B30', '#FF2D55'],
  },
];

export default function OnboardingScreen() {
  const router = useRouter();
  const { isDark } = useUIStore();
  const themeColors = getColors(isDark);
  const [currentIndex, setCurrentIndex] = useState(0);
  const flatListRef = useRef<FlatList>(null);

  const onViewableItemsChanged = useRef(({ viewableItems }: { viewableItems: ViewToken[] }) => {
    if (viewableItems.length > 0) {
      setCurrentIndex(viewableItems[0].index ?? 0);
    }
  }).current;

  const handleNext = async () => {
    if (currentIndex < SLIDES.length - 1) {
      flatListRef.current?.scrollToIndex({ index: currentIndex + 1 });
    } else {
      await AsyncStorage.setItem('hasOnboarded', 'true');
      router.replace('/(auth)/login');
    }
  };

  const renderSlide = ({ item }: { item: typeof SLIDES[0] }) => (
    <View style={s.slide}>
      <LinearGradient colors={item.colors as any} style={s.iconCircle}>
        <Ionicons name={item.icon as any} size={80} color="#000" />
      </LinearGradient>
      <Text style={[s.title, { color: themeColors.txt }]}>{item.title}</Text>
      <Text style={[s.desc, { color: themeColors.txt2 }]}>{item.desc}</Text>
    </View>
  );

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: themeColors.bg }}>
      <View style={s.container}>
        <FlatList
          ref={flatListRef}
          data={SLIDES}
          renderItem={renderSlide}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          onViewableItemsChanged={onViewableItemsChanged}
          viewabilityConfig={{ itemVisiblePercentThreshold: 50 }}
          keyExtractor={(item) => item.id}
        />

        <View style={s.footer}>
          <View style={s.pagination}>
            {SLIDES.map((_, i) => (
              <View 
                key={i} 
                style={[
                  s.dot, 
                  { backgroundColor: i === currentIndex ? themeColors.ogi : themeColors.bdr },
                  i === currentIndex && { width: 24 }
                ]} 
              />
            ))}
          </View>

          <TouchableOpacity style={[s.btn, { backgroundColor: themeColors.ogi }]} onPress={handleNext}>
            <Text style={s.btnText}>{currentIndex === SLIDES.length - 1 ? 'Get Started' : 'Next'}</Text>
          </TouchableOpacity>

          <TouchableOpacity onPress={() => router.replace('/(auth)/login')}>
            <Text style={[s.skip, { color: themeColors.txt3 }]}>Skip</Text>
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1 },
  slide: { width, alignItems: 'center', justifyContent: 'center', padding: 40 },
  iconCircle: { width: 180, height: 180, borderRadius: 90, alignItems: 'center', justifyContent: 'center', marginBottom: 40 },
  title: { fontSize: 32, fontWeight: '900', fontFamily: 'Syne_700Bold', textAlign: 'center', marginBottom: 20 },
  desc: { fontSize: 16, textAlign: 'center', lineHeight: 24, opacity: 0.8 },
  footer: { padding: 40, alignItems: 'center' },
  pagination: { flexDirection: 'row', gap: 8, marginBottom: 40 },
  dot: { width: 8, height: 8, borderRadius: 4 },
  btn: { width: '100%', height: 60, borderRadius: 30, alignItems: 'center', justifyContent: 'center', marginBottom: 20 },
  btnText: { fontSize: 18, fontWeight: '800', color: '#000' },
  skip: { fontSize: 14, fontWeight: '600' },
});
