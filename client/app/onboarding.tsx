import React, { useState, useRef } from 'react';
import { View, Text, StyleSheet, FlatList, Dimensions, TouchableOpacity, SafeAreaView } from 'react-native';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Syne_700Bold } from '@expo-google-fonts/syne';

const { width, height } = Dimensions.get('window');

const SLIDES = [
  {
    id: '1',
    title: 'Post Anonymously',
    description: 'Share your thoughts, secrets, and confessions without revealing your identity.',
    bgColor: '#FF231F',
    emoji: '🎭',
  },
  {
    id: '2',
    title: 'Stay Notified',
    description: 'Get real-time alerts for bhandaras, placement news, and campus events.',
    bgColor: '#10B981',
    emoji: '🔔',
  },
  {
    id: '3',
    title: 'Earn Karma',
    description: 'Upvote great posts, climb the leaderboard, and win the Campus War!',
    bgColor: '#6366F1',
    emoji: '🏆',
  },
];

export default function Onboarding() {
  const router = useRouter();
  const [currentIndex, setCurrentIndex] = useState(0);
  const flatListRef = useRef<FlatList>(null);

  const handleComplete = async () => {
    await AsyncStorage.setItem('loona_onboarded_v1', 'true');
    router.replace('/(auth)/login');
  };

  const nextSlide = () => {
    if (currentIndex < SLIDES.length - 1) {
      flatListRef.current?.scrollToIndex({ index: currentIndex + 1 });
      setCurrentIndex(currentIndex + 1);
    } else {
      handleComplete();
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <FlatList
        ref={flatListRef}
        data={SLIDES}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={(e) => {
          const index = Math.round(e.nativeEvent.contentOffset.x / width);
          setCurrentIndex(index);
        }}
        renderItem={({ item }) => (
          <View style={[styles.slide, { backgroundColor: item.bgColor }]}>
            <Text style={styles.emoji}>{item.emoji}</Text>
            <Text style={styles.title}>{item.title}</Text>
            <Text style={styles.description}>{item.description}</Text>
          </View>
        )}
        keyExtractor={(item) => item.id}
      />

      <View style={styles.footer}>
        <View style={styles.pagination}>
          {SLIDES.map((_, i) => (
            <View
              key={i}
              style={[
                styles.dot,
                { opacity: i === currentIndex ? 1 : 0.3 }
              ]}
            />
          ))}
        </View>

        <TouchableOpacity style={styles.button} onPress={nextSlide}>
          <Text style={styles.buttonText}>
            {currentIndex === SLIDES.length - 1 ? 'Get Started' : 'Next'}
          </Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  slide: {
    width,
    height: height * 0.8,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  emoji: { fontSize: 80, marginBottom: 20 },
  title: {
    fontFamily: 'Syne_700Bold',
    fontSize: 28,
    color: '#fff',
    textAlign: 'center',
    marginBottom: 15,
  },
  description: {
    fontSize: 16,
    color: '#fff',
    textAlign: 'center',
    lineHeight: 24,
    opacity: 0.8,
  },
  footer: {
    height: height * 0.2,
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 40,
  },
  pagination: { flexDirection: 'row', gap: 8 },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#fff' },
  button: {
    backgroundColor: '#fff',
    paddingHorizontal: 40,
    paddingVertical: 15,
    borderRadius: 30,
  },
  buttonText: { fontWeight: '700', fontSize: 16, color: '#000' },
});
