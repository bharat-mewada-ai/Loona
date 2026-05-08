import React, { useState, useRef, useEffect } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet,
  SafeAreaView, KeyboardAvoidingView, Platform, ActivityIndicator, ScrollView,
  Animated, Easing, Dimensions, TextInput, Image
} from 'react-native';
import { router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import * as WebBrowser from 'expo-web-browser';
import * as Google from 'expo-auth-session/providers/google';
import * as AuthSession from 'expo-auth-session';
import { useGoogleAuth } from '../../src/hooks/useAuth';
import { Colors } from '../../src/theme/colors';
import { CAMPUSES_LIST as CAMPUSES } from '../../src/constants';
import type { Campus } from '../../src/types';
import AnimatedSplashScreen from '../../src/components/AnimatedSplashScreen';

WebBrowser.maybeCompleteAuthSession();

const { width, height } = Dimensions.get('window');

export default function LoginScreen() {
  const { mutate: googleAuth, isPending: googleLoading } = useGoogleAuth();
  
  const [campus, setCampus] = useState('');
  const [campusOpen, setCampusOpen] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [showRedirectUri, setShowRedirectUri] = useState(false);
  const [isAgeVerified, setIsAgeVerified] = useState(false);
  const [isTermsAccepted, setIsTermsAccepted] = useState(false);

  const [request, response, promptAsync] = Google.useAuthRequest({
    webClientId: '612057986452-msvfloi7pqa12a9sfkth79kb1v18s01q.apps.googleusercontent.com',
    androidClientId: '612057986452-8ov2v6ouhqk1bsktvl2je8mj0j9nrc7r.apps.googleusercontent.com',
    iosClientId: '612057986452-msvfloi7pqa12a9sfkth79kb1v18s01q.apps.googleusercontent.com',
    clientId: '612057986452-msvfloi7pqa12a9sfkth79kb1v18s01q.apps.googleusercontent.com',
    redirectUri: AuthSession.makeRedirectUri({
      native: 'com.loona.app:/oauth2redirect/google',
      scheme: 'loona',
      path: 'login'
    }),
  });

  // Animation state
  const [isAnimating, setIsAnimating] = useState(false);
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const colorAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(Platform.OS === 'web' ? 0 : 50)).current;
  const opacityAnim = useRef(new Animated.Value(Platform.OS === 'web' ? 1 : 0)).current;

  const selectedCampus = CAMPUSES.find((c) => c.value === campus);

  // If for some reason the animation is stuck, we still want to render the UI
  // but we wait for essential hooks to initialize.

  useEffect(() => {
    // Initial load animation
    Animated.parallel([
      Animated.timing(opacityAnim, { toValue: 1, duration: 800, useNativeDriver: Platform.OS !== 'web' }),
      Animated.timing(slideAnim, { toValue: 0, duration: 800, easing: Easing.out(Easing.exp), useNativeDriver: Platform.OS !== 'web' })
    ]).start();
  }, []);

  const authInProgress = useRef(false);

  useEffect(() => {
    if (response?.type === 'success' && !authInProgress.current) {
      const token =
        response?.authentication?.idToken ||
        response?.authentication?.accessToken ||
        (response as any)?.params?.access_token;

      if (!token) {
        setIsAnimating(false);
        setErrorMsg('Failed to get Google token. Please try again.');
        return;
      }

      authInProgress.current = true;
      setIsAnimating(true);
      setErrorMsg('');

      // --- SAFETY TIMEOUT ---
      // If nothing happens in 15 seconds, reset the UI
      const timer = setTimeout(() => {
        if (authInProgress.current) {
          authInProgress.current = false;
          setIsAnimating(false);
          setErrorMsg('Authentication timed out. Please check your internet and try again.');
        }
      }, 15000);

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
          clearTimeout(timer);
          setTimeout(() => {
            router.replace('/(tabs)');
          }, 1300);
        },
        onError: (err: any) => {
          clearTimeout(timer);
          authInProgress.current = false;
          setIsAnimating(false);
          const msg = err?.response?.data?.error || err?.message || 'Authentication failed. Is the server running?';
          setErrorMsg(msg);
        }
      });
    } else if (response?.type === 'error' || response?.type === 'cancel') {
      authInProgress.current = false;
      setIsAnimating(false);
      if (response?.type === 'error') {
        setErrorMsg('Google login failed. ' + (response.error?.message || 'Please check your configuration.'));
      }
    }
  }, [response]);

  const handleGoogleLogin = () => {
    if (!campus) {
      setErrorMsg('Please select your campus first to continue.');
      return;
    }
    if (!isAgeVerified || !isTermsAccepted) {
      setErrorMsg('Please accept the age declaration and terms to continue.');
      return;
    }
    setErrorMsg('');
    promptAsync();
  };

  const isDisabled = googleLoading || !request || !isAgeVerified || !isTermsAccepted;

  const interpolatedColor = colorAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [Colors.ogi, Colors.lnct]
  });

  return (
    <SafeAreaView style={[s.safe, { backgroundColor: '#F5F3EE' }]}>
      <StatusBar style="dark" />
      
      <View style={{ flex: 1, padding: 24, justifyContent: 'center' }}>
        {/* Simple Header */}
        <View style={{ alignItems: 'center', marginBottom: 40 }}>
          <Text style={{ fontSize: 32, fontWeight: 'bold', color: '#C94030' }}>LOONA</Text>
          <Text style={{ fontSize: 12, color: '#666', marginTop: 4 }}>CAMPUS UNDERGROUND</Text>
        </View>

        {/* Card */}
        <View style={{ backgroundColor: '#FFF', borderRadius: 24, padding: 24, shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 10, elevation: 5 }}>
          <Text style={{ fontSize: 20, fontWeight: '700', marginBottom: 8, color: '#333' }}>Welcome 👋</Text>
          <Text style={{ fontSize: 14, color: '#666', marginBottom: 24 }}>Join your anonymous campus feed directly with your Gmail ID</Text>
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

            {/* Compliance Checkboxes */}
            <View style={s.complianceContainer}>
              <TouchableOpacity 
                style={s.checkRow} 
                onPress={() => setIsAgeVerified(!isAgeVerified)}
                activeOpacity={0.7}
              >
                <View style={[s.checkbox, isAgeVerified && s.checkboxChecked]}>
                  {isAgeVerified && <Text style={s.checkboxTick}>✓</Text>}
                </View>
                <Text style={s.checkLabel}>I am 18 years of age or older</Text>
              </TouchableOpacity>

              <TouchableOpacity 
                style={s.checkRow} 
                onPress={() => setIsTermsAccepted(!isTermsAccepted)}
                activeOpacity={0.7}
              >
                <View style={[s.checkbox, isTermsAccepted && s.checkboxChecked]}>
                  {isTermsAccepted && <Text style={s.checkboxTick}>✓</Text>}
                </View>
                <Text style={s.checkLabel}>
                  I agree to the <Text style={s.link} onPress={() => router.push('/privacy')}>Privacy Policy</Text> & <Text style={s.link}>Terms</Text>
                </Text>
              </TouchableOpacity>
            </View>

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
          </View>

          {/* Privacy */}
          <Text style={[s.privacy, { color: '#888', marginTop: 20 }]}>
            Your real identity is never shown to other students.{'\n'}Loona is anonymous by design.
          </Text>
        </View>
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
  logoImage: {
    width: 60,
    height: 60,
    borderRadius: 12,
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

  complianceContainer: { marginBottom: 24, gap: 12 },
  checkRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  checkbox: { 
    width: 20, height: 20, borderRadius: 6, borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.2)',
    backgroundColor: 'rgba(255,255,255,0.03)', alignItems: 'center', justifyContent: 'center'
  },
  checkboxChecked: { backgroundColor: Colors.ogi, borderColor: Colors.ogi },
  checkboxTick: { color: '#fff', fontSize: 12, fontWeight: 'bold' },
  checkLabel: { fontSize: 13, color: Colors.txt2, fontFamily: 'PlusJakartaSans_400Regular' },
  link: { color: Colors.ogi, fontFamily: 'PlusJakartaSans_600SemiBold' },

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