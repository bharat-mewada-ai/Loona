import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Dimensions, Animated, Easing, Image } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

const { width, height } = Dimensions.get('window');

interface Props {
  mode?: 'simple' | 'full';
}

const AnimatedSplashScreen = ({ mode = 'full' }: Props) => {
  // Use standard Animated API for max stability on Web
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(20)).current;
  const progressAnim = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(0.4)).current;
  const scanAnim = useRef(new Animated.Value(-50)).current;

  useEffect(() => {
    // Sequence animations
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 800,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 800,
        useNativeDriver: true,
      }),
      Animated.timing(progressAnim, {
        toValue: 80,
        duration: 2500,
        easing: Easing.bezier(0.4, 0, 0.2, 1),
        useNativeDriver: false,
      }),
    ]).start();

    // Loopings
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1, duration: 800, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 0.4, duration: 800, useNativeDriver: true }),
      ])
    ).start();

    if (mode === 'full') {
      Animated.loop(
        Animated.timing(scanAnim, {
          toValue: height + 50,
          duration: 3500,
          easing: Easing.linear,
          useNativeDriver: true,
        })
      ).start();
    }
  }, []);

  return (
    <View style={styles.container}>
      {/* Ambient Blobs */}
      <View style={[styles.blob, styles.blobRed, { opacity: 0.12 }]} />
      <View style={[styles.blob, styles.blobPurple, { opacity: 0.12 }]} />

      {/* Scan Line */}
      {mode === 'full' && (
        <Animated.View style={[styles.scanLine, { transform: [{ translateY: scanAnim }] }]}>
          <LinearGradient
            colors={['transparent', 'rgba(77,61,191,0.35)', 'rgba(201,64,48,0.25)', 'transparent']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={{ flex: 1 }}
          />
        </Animated.View>
      )}

      {/* Content */}
      <Animated.View style={[styles.content, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>
        <View style={styles.logoContainer}>
          <Image 
            source={require('../../assets/logo.png')} 
            style={styles.logoImage}
            resizeMode="contain"
          />
        </View>

        <Text style={styles.wordmark}>
          lo<Text style={{ color: '#4D3DBF' }}>o</Text>na
        </Text>

        {mode === 'full' && (
          <>
            <Text style={styles.tagline}>your campus, unfiltered</Text>
            <View style={styles.badges}>
              <View style={[styles.badge, styles.badgeOgi]}>
                <Text style={styles.badgeTextOgi}>OGI</Text>
              </View>
              <View style={[styles.badge, styles.badgeLnct]}>
                <Text style={styles.badgeTextLnct}>LNCT</Text>
              </View>
            </View>
          </>
        )}
      </Animated.View>

      {/* Loader */}
      {mode === 'full' && (
        <View style={styles.loaderWrap}>
          <View style={styles.progressBar}>
            <Animated.View style={[styles.progressFillContainer, { width: progressAnim }]}>
              <LinearGradient
                colors={['#C94030', '#4D3DBF', '#0D6E50']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={{ flex: 1 }}
              />
            </Animated.View>
          </View>
          <Animated.Text style={[styles.loaderText, { opacity: pulseAnim }]}>
            authenticating
          </Animated.Text>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: width || '100%',
    height: height || '100%',
    backgroundColor: '#0A0A0A',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'absolute',
    top: 0,
    left: 0,
    zIndex: 99999,
  },
  blob: {
    position: 'absolute',
    borderRadius: 1000,
  },
  blobRed: {
    width: 250, height: 250,
    backgroundColor: '#C94030',
    top: -50, right: -50,
  },
  blobPurple: {
    width: 200, height: 200,
    backgroundColor: '#4D3DBF',
    bottom: -50, left: -50,
  },
  scanLine: {
    position: 'absolute',
    width: '100%',
    height: 2,
    zIndex: 8,
  },
  content: {
    alignItems: 'center',
    zIndex: 10,
  },
  logoContainer: {
    width: 80,
    height: 80,
    marginBottom: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  logoImage: {
    width: '100%',
    height: '100%',
  },
  wordmark: {
    fontFamily: 'Syne_700Bold',
    fontSize: 52,
    letterSpacing: -1,
    color: '#F0EEE5',
  },
  tagline: {
    fontFamily: 'PlusJakartaSans_500Medium',
    fontSize: 11.5,
    color: '#545248',
    letterSpacing: 2,
    textTransform: 'uppercase',
    marginTop: 10,
  },
  badges: {
    flexDirection: 'row',
    gap: 7,
    marginTop: 28,
  },
  badge: {
    paddingHorizontal: 12, paddingVertical: 4,
    borderRadius: 20, borderWidth: 1,
  },
  badgeOgi: { backgroundColor: '#2A1A18', borderColor: '#3A2522' },
  badgeLnct: { backgroundColor: '#1C1A2E', borderColor: '#2C2950' },
  badgeTextOgi: { color: '#E86050', fontSize: 10, fontFamily: 'PlusJakartaSans_600SemiBold' },
  badgeTextLnct: { color: '#7B6CE8', fontSize: 10, fontFamily: 'PlusJakartaSans_600SemiBold' },
  loaderWrap: {
    position: 'absolute',
    bottom: 60,
    alignItems: 'center',
    gap: 12,
  },
  progressBar: {
    width: 80, height: 3,
    backgroundColor: '#1E1D18',
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressFillContainer: {
    height: '100%',
    borderRadius: 2,
  },
  loaderText: {
    fontFamily: 'PlusJakartaSans_400Regular',
    fontSize: 10,
    color: '#3E3D34',
    letterSpacing: 1.5,
    textTransform: 'uppercase',
  },
});

export default AnimatedSplashScreen;
