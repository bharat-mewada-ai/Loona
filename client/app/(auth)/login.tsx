import React, { useState, useRef, useEffect } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet,
  SafeAreaView, KeyboardAvoidingView, Platform, ActivityIndicator, ScrollView,
  Animated, Easing, Dimensions, TextInput
} from 'react-native';
import { router } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import * as Google from 'expo-auth-session/providers/google';
import * as AuthSession from 'expo-auth-session';
import { useGoogleAuth } from '../../src/hooks/useAuth';
import { Colors } from '../../src/theme/colors';
import { CAMPUSES_LIST as CAMPUSES } from '../../src/constants';
import type { Campus } from '../../src/types';

WebBrowser.maybeCompleteAuthSession();

const { width, height } = Dimensions.get('window');

export default function LoginScreen() {
  const { mutate: googleAuth, isPending: googleLoading } = useGoogleAuth();
  
  const [campus, setCampus] = useState('');
  const [campusOpen, setCampusOpen] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [showRedirectUri, setShowRedirectUri] = useState(false);

  const [request, response, promptAsync] = Google.useAuthRequest({
    webClientId: '612057986452-msvfloi7pqa12a9sfkth79kb1v18s01q.apps.googleusercontent.com',
    androidClientId: '612057986452-8ov2v6ouhqk1bsktvl2je8mj0j9nrc7r.apps.googleusercontent.com',
    iosClientId: '612057986452-msvfloi7pqa12a9sfkth79kb1v18s01q.apps.googleusercontent.com',
    clientId: '612057986452-msvfloi7pqa12a9sfkth79kb1v18s01q.apps.googleusercontent.com',
    redirectUri: AuthSession.makeRedirectUri({
      scheme: 'loona',
      path: 'login'
    }),
  });

  // Animation state
  const [isAnimating, setIsAnimating] = useState(false);
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const colorAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(50)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;

  const selectedCampus = CAMPUSES.find((c) => c.value === campus);

  useEffect(() => {
    // Initial load animation
    Animated.parallel([
      Animated.timing(opacityAnim, { toValue: 1, duration: 800, useNativeDriver: true }),
      Animated.timing(slideAnim, { toValue: 0, duration: 800, easing: Easing.out(Easing.exp), useNativeDriver: true })
    ]).start();
  }, []);

  useEffect(() => {
    if (response?.type === 'success') {
      const token =
        response?.authentication?.idToken ||
        response?.authentication?.accessToken ||
        (response as any)?.params?.access_token;

      console.log('[Google Auth] token found:', token ? 'YES' : 'NO');

      if (!token) {
        setIsAnimating(false);
        setErrorMsg('Failed to get Google token. Please try again.');
        return;
      }

      setIsAnimating(true);

      Animated.sequence([
        Animated.timing(fadeAnim, { toValue: 1, duration: 400, useNativeDriver: false }),
        Animated.timing(scaleAnim, { toValue: 25, duration: 900, easing: Easing.inOut(Easing.ease), useNativeDriver: false })
      ]).start();

      Animated.loop(
        Animated.sequence([
          Animated.timing(colorAnim, { toValue: 1, duration: 600, useNativeDriver: false }),
          Animated.timing(colorAnim, { toValue: 0, duration: 600, useNativeDriver: false })
        ])
      ).start();

      googleAuth({ token, campus }, {
        onSuccess: () => {
          setTimeout(() => {
            router.replace('/(tabs)');
          }, 1300);
        },
        onError: (err: any) => {
          setIsAnimating(false);
          const msg = err?.response?.data?.error || err?.message || 'Authentication failed.';
          setErrorMsg(msg);
        }
      });
    } else if (response?.type === 'error') {
      setIsAnimating(false);
      setErrorMsg('Google login failed. ' + (response.error?.message || 'Please check your configuration.'));
    } else if (response?.type === 'cancel') {
      setIsAnimating(false);
    }
  }, [response]);

  const handleGoogleLogin = () => {
    if (!campus) {
      setErrorMsg('Please select your campus first to continue.');
      return;
    }
    setErrorMsg('');
    promptAsync();
  };

  const isDisabled = googleLoading || !request;

  const interpolatedColor = colorAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [Colors.ogi, Colors.nit]
  });

  return (
    <SafeAreaView style={s.safe}>
      {isAnimating && (
        <Animated.View style={[s.animOverlay, { opacity: fadeAnim }]}>
          <Text style={s.animText}>
            l
            <Animated.Text style={[{ color: interpolatedColor, transform: [{ scale: scaleAnim }] }]}>o</Animated.Text>
            <Animated.Text style={[{ color: interpolatedColor, transform: [{ scale: scaleAnim }] }]}>o</Animated.Text>
            na
          </Text>
          <Animated.Text style={{ marginTop: 24, color: '#fff', fontFamily: 'PlusJakartaSans_500Medium', opacity: colorAnim, fontSize: 16, letterSpacing: 2 }}>
            AUTHENTICATING
          </Animated.Text>
        </Animated.View>
      )}

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
      >
        <ScrollView
          contentContainerStyle={s.scroll}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Logo */}
          <Animated.View style={[s.logoWrap, { opacity: opacityAnim, transform: [{ translateY: slideAnim }] }]}>
            <View style={s.logoContainer}>
              <Text style={s.logo}>
                l<Text style={{ color: Colors.ogi }}>oo</Text>na
              </Text>
              <View style={s.badge}>
                <Text style={s.badgeText}>BETA</Text>
              </View>
            </View>
            <Text style={s.logoSub}>CAMPUS UNDERGROUND</Text>
            <Text style={s.tagline}>Anonymous. Real. Yours.</Text>
          </Animated.View>

          {/* Card */}
          <Animated.View style={[s.card, { opacity: opacityAnim, transform: [{ translateY: slideAnim }] }]}>
            <Text style={s.cardTitle}>Welcome 👋</Text>
            <Text style={s.cardSub}>Join your anonymous campus feed directly with your Gmail ID</Text>

            {/* Error */}
            {errorMsg ? (
              <View style={s.errBox}>
                <Text style={s.errTxt}>{errorMsg}</Text>
              </View>
            ) : null}

            {/* Campus picker */}
            <Text style={s.label}>Your Campus</Text>
            <TouchableOpacity
              style={[s.campusTrigger, campusOpen && { borderColor: Colors.ogi }]}
              onPress={() => setCampusOpen(o => !o)}
              activeOpacity={0.85}
            >
              {selectedCampus ? (
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                  <View style={[s.dot, { backgroundColor: selectedCampus.dotColor, shadowColor: selectedCampus.dotColor, shadowOpacity: 0.8, shadowRadius: 4, shadowOffset: { width: 0, height: 0 } }]} />
                  <Text style={[s.campusTxt, { color: Colors.txt }]}>
                    {selectedCampus.label} <Text style={{ color: Colors.txt3 }}>· {selectedCampus.full}</Text>
                  </Text>
                </View>
              ) : (
                <Text style={s.campusPlaceholder}>Select your campus</Text>
              )}
              <Text style={s.chev}>{campusOpen ? '▴' : '▾'}</Text>
            </TouchableOpacity>

            {campusOpen && (
              <View style={s.dropdown}>
                {CAMPUSES.map(c => (
                  <TouchableOpacity
                    key={c.value}
                    style={[s.ddItem, campus === c.value && s.ddItemActive]}
                    onPress={() => { setCampus(c.value as Campus); setCampusOpen(false); }}
                    activeOpacity={0.8}
                  >
                    <View style={[s.dot, { backgroundColor: c.dotColor }]} />
                    <View style={{ flex: 1 }}>
                      <Text style={s.ddName}>{c.label}</Text>
                      <Text style={s.ddSub}>{c.full}</Text>
                    </View>
                    {campus === c.value && (
                      <View style={s.checkMarkWrap}>
                        <Text style={s.checkMark}>✓</Text>
                      </View>
                    )}
                  </TouchableOpacity>
                ))}
              </View>
            )}

            {/* Google */}
            <TouchableOpacity style={[s.googleBtn, isDisabled && s.btnDisabled]} activeOpacity={0.8} onPress={handleGoogleLogin} disabled={isDisabled}>
              {googleLoading ? (
                <ActivityIndicator color="#000" />
              ) : (
                <View style={s.googleBtnContent}>
                  <Text style={s.googleIcon}>G</Text>
                  <Text style={s.googleTxt}>Continue with Google</Text>
                </View>
              )}
            </TouchableOpacity>
          </Animated.View>

          {/* Privacy */}
          <Animated.Text style={[s.privacy, { opacity: opacityAnim }]}>
            Your real identity is never shown to other students.{'\n'}Loona is anonymous by design.
          </Animated.Text>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.bg },
  scroll: { flexGrow: 1, padding: 24, justifyContent: 'center' },

  animOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: Colors.bg,
    zIndex: 999,
    justifyContent: 'center',
    alignItems: 'center',
  },
  animText: {
    fontFamily: 'Syne_700Bold',
    fontSize: 64,
    color: Colors.txt,
    letterSpacing: -3,
    flexDirection: 'row',
  },

  logoWrap: { alignItems: 'center', marginBottom: 40 },
  logoContainer: { flexDirection: 'row', alignItems: 'flex-start' },
  logo: {
    fontFamily: 'Syne_700Bold', fontSize: 48, color: Colors.txt, letterSpacing: -2,
  },
  badge: {
    backgroundColor: 'rgba(255, 69, 58, 0.15)',
    paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4, marginLeft: 6, marginTop: 8
  },
  badgeText: {
    color: Colors.ogi, fontSize: 8, fontFamily: 'Syne_700Bold', letterSpacing: 1
  },
  logoSub: {
    fontFamily: 'Syne_700Bold', fontSize: 10, color: Colors.txt3,
    letterSpacing: 4, marginTop: -4,
  },
  tagline: {
    fontSize: 13, color: Colors.txt2, marginTop: 12,
    fontFamily: 'PlusJakartaSans_400Regular', fontStyle: 'italic',
  },

  card: {
    backgroundColor: Colors.card, borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)',
    borderRadius: 20, padding: 24, marginBottom: 20,
    shadowColor: '#000', shadowOpacity: 0.3, shadowRadius: 20,
    shadowOffset: { width: 0, height: 10 }, elevation: 10,
  },
  cardTitle: { fontFamily: 'Syne_700Bold', fontSize: 22, color: Colors.txt, marginBottom: 6 },
  cardSub: { fontSize: 13, color: Colors.txt2, marginBottom: 24, fontFamily: 'PlusJakartaSans_400Regular', lineHeight: 20 },

  errBox: {
    backgroundColor: 'rgba(255, 69, 58, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(255, 69, 58, 0.3)',
    borderRadius: 12,
    padding: 14,
    marginBottom: 20,
  },
  errTxt: { fontSize: 13, color: Colors.danger, fontFamily: 'PlusJakartaSans_500Medium', lineHeight: 18 },

  label: {
    fontFamily: 'Syne_700Bold', fontSize: 11, color: Colors.txt2,
    letterSpacing: 0.5, marginBottom: 8, textTransform: 'uppercase',
  },

  campusTrigger: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: 'rgba(255,255,255,0.03)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)',
    borderRadius: 12, padding: 16, marginBottom: 24,
  },
  campusTxt: { fontFamily: 'PlusJakartaSans_500Medium', fontSize: 14, flex: 1 },
  campusPlaceholder: { color: Colors.txt3, fontFamily: 'PlusJakartaSans_400Regular', fontSize: 14 },
  chev: { fontSize: 12, color: Colors.txt3 },
  dot: { width: 10, height: 10, borderRadius: 5 },

  dropdown: {
    backgroundColor: Colors.card2, borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)',
    borderRadius: 16, overflow: 'hidden', marginBottom: 24, marginTop: -16,
    shadowColor: '#000', shadowOpacity: 0.2, shadowRadius: 15,
    shadowOffset: { width: 0, height: 8 }, elevation: 5,
  },
  ddItem: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    padding: 16, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.03)',
  },
  ddItemActive: { backgroundColor: 'rgba(255,255,255,0.05)' },
  ddName: { fontFamily: 'Syne_700Bold', fontSize: 14, color: Colors.txt },
  ddSub: { fontSize: 11, color: Colors.txt3, marginTop: 2, fontFamily: 'PlusJakartaSans_400Regular' },
  checkMarkWrap: { backgroundColor: 'rgba(255, 69, 58, 0.15)', width: 24, height: 24, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  checkMark: { color: Colors.ogi, fontSize: 12, fontWeight: 'bold' },

  googleBtn: {
    borderRadius: 14,
    padding: 16, alignItems: 'center', backgroundColor: '#fff',
    shadowColor: '#fff', shadowOpacity: 0.1, shadowRadius: 8, shadowOffset: { width: 0, height: 0 },
  },
  googleBtnContent: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  googleIcon: { fontFamily: 'Syne_700Bold', fontSize: 18, color: '#000' },
  googleTxt: { fontFamily: 'PlusJakartaSans_600SemiBold', fontSize: 15, color: '#000' },
  btnDisabled: { opacity: 0.5 },

  privacy: {
    fontSize: 11, color: Colors.txt3, textAlign: 'center', lineHeight: 18,
    fontFamily: 'PlusJakartaSans_400Regular', marginTop: 10,
  },
});