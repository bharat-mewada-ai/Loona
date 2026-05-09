import React, { useState, useRef, useEffect } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet,
  SafeAreaView, ActivityIndicator, Animated, Easing, Platform,
} from 'react-native';
import { router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import * as WebBrowser from 'expo-web-browser';
import { GoogleSignin, statusCodes } from '@react-native-google-signin/google-signin';
import { useGoogleAuth } from '../../src/hooks/useAuth';
import { Colors } from '../../src/theme/colors';
import { CAMPUSES_LIST as CAMPUSES } from '../../src/constants';
import type { Campus } from '../../src/types';

WebBrowser.maybeCompleteAuthSession();

// ─── Native Google Sign-In Configuration ──────────────────────────────────────
const WEB_CLIENT_ID = '612057986452-msvfloi7pqa12a9sfkth79kb1v18s01q.apps.googleusercontent.com';

GoogleSignin.configure({
  webClientId: WEB_CLIENT_ID,
  offlineAccess: true,
  scopes: ['profile', 'email'],
});

export default function LoginScreen() {
  const { mutate: googleAuth, isPending: googleLoading } = useGoogleAuth();

  const [campus, setCampus] = useState('');
  const [campusOpen, setCampusOpen] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [isAgeVerified, setIsAgeVerified] = useState(false);
  const [isTermsAccepted, setIsTermsAccepted] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);

  // Animation refs
  const fadeAnim  = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const colorAnim = useRef(new Animated.Value(0)).current;
  const slideAnim   = useRef(new Animated.Value(Platform.OS === 'web' ? 0 : 50)).current;
  const opacityAnim = useRef(new Animated.Value(Platform.OS === 'web' ? 1 : 0)).current;

  // ─── Race condition guard ─────────────────────────────────────────────────
  const authInProgress = useRef(false);

  useEffect(() => {
    Animated.parallel([
      Animated.timing(opacityAnim, { toValue: 1, duration: 800, useNativeDriver: Platform.OS !== 'web' }),
      Animated.timing(slideAnim,   { toValue: 0, duration: 800, easing: Easing.out(Easing.exp), useNativeDriver: Platform.OS !== 'web' }),
    ]).start();
  }, []);

  const triggerLoadingAnimation = () => {
    setIsAnimating(true);
    Animated.sequence([
      Animated.timing(fadeAnim,  { toValue: 1, duration: 400, useNativeDriver: false }),
      Animated.timing(scaleAnim, { toValue: 25, duration: 900, easing: Easing.inOut(Easing.ease), useNativeDriver: false }),
    ]).start();

    Animated.loop(
      Animated.sequence([
        Animated.timing(colorAnim, { toValue: 1, duration: 600, useNativeDriver: false }),
        Animated.timing(colorAnim, { toValue: 0, duration: 600, useNativeDriver: false }),
      ])
    ).start();
  };

  const handleGoogleLogin = async () => {
    if (!campus) {
      setErrorMsg('Please select your campus first to continue.');
      return;
    }
    if (!isAgeVerified || !isTermsAccepted) {
      setErrorMsg('Please accept the age declaration and terms to continue.');
      return;
    }
    if (authInProgress.current) return;

    setErrorMsg('');
    authInProgress.current = true;

    try {
      await GoogleSignin.hasPlayServices();
      const userInfo = await GoogleSignin.signIn();
      const token = userInfo.idToken;

      if (!token) {
        throw new Error('No ID token received from Google');
      }

      triggerLoadingAnimation();

      googleAuth({ token, campus }, {
        onSuccess: () => {
          authInProgress.current = false;
          setTimeout(() => router.replace('/(tabs)'), 1300);
        },
        onError: (err: any) => {
          authInProgress.current = false;
          setIsAnimating(false);
          const msg = err?.response?.data?.error || err?.message || 'Authentication failed.';
          setErrorMsg(msg);
          GoogleSignin.signOut(); // Clean up session on backend error
        },
      });

    } catch (error: any) {
      authInProgress.current = false;
      setIsAnimating(false);
      if (error.code === statusCodes.SIGN_IN_CANCELLED) {
        // user cancelled the login flow
      } else if (error.code === statusCodes.IN_PROGRESS) {
        // operation already in progress
      } else if (error.code === statusCodes.PLAY_SERVICES_NOT_AVAILABLE) {
        setErrorMsg('Google Play Services not available or outdated.');
      } else {
        setErrorMsg(error.message || 'An unknown error occurred during sign in.');
      }
    }
  };

  const selectedCampus = CAMPUSES.find((c) => c.value === campus);
  const isDisabled = googleLoading || isAnimating;

  return (
    <SafeAreaView style={[s.safe, { backgroundColor: '#F5F3EE' }]}>
      <StatusBar style="dark" />

      <View style={{ flex: 1, padding: 24, justifyContent: 'center' }}>
        <View style={{ alignItems: 'center', marginBottom: 40 }}>
          <Text style={{ fontSize: 32, fontWeight: 'bold', color: '#C94030' }}>LOONA</Text>
          <Text style={{ fontSize: 12, color: '#666', marginTop: 4 }}>CAMPUS UNDERGROUND</Text>
        </View>

        <View style={{ backgroundColor: '#FFF', borderRadius: 24, padding: 24, shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 10, elevation: 5 }}>
          <Text style={{ fontSize: 20, fontWeight: '700', marginBottom: 8, color: '#333' }}>Welcome 👋</Text>
          <Text style={{ fontSize: 14, color: '#666', marginBottom: 24 }}>Join your anonymous campus feed directly with your Gmail ID</Text>

          {errorMsg ? (
            <View style={s.errBox}>
              <Text style={s.errTxt}>{errorMsg}</Text>
            </View>
          ) : null}

          <Text style={s.label}>Your Campus</Text>
          <TouchableOpacity
            style={[s.campusTrigger, campusOpen && { borderColor: Colors.ogi }]}
            onPress={() => setCampusOpen(o => !o)}
            activeOpacity={0.85}
          >
            {selectedCampus ? (
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                <View style={[s.dot, { backgroundColor: selectedCampus.dotColor }]} />
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

          <View style={s.complianceContainer}>
            <TouchableOpacity style={s.checkRow} onPress={() => setIsAgeVerified(!isAgeVerified)} activeOpacity={0.7}>
              <View style={[s.checkbox, isAgeVerified && s.checkboxChecked]}>
                {isAgeVerified && <Text style={s.checkboxTick}>✓</Text>}
              </View>
              <Text style={s.checkLabel}>I am 18 years of age or older</Text>
            </TouchableOpacity>

            <TouchableOpacity style={s.checkRow} onPress={() => setIsTermsAccepted(!isTermsAccepted)} activeOpacity={0.7}>
              <View style={[s.checkbox, isTermsAccepted && s.checkboxChecked]}>
                {isTermsAccepted && <Text style={s.checkboxTick}>✓</Text>}
              </View>
              <Text style={s.checkLabel}>
                I agree to the <Text style={s.link} onPress={() => router.push('/privacy')}>Privacy Policy</Text> & <Text style={s.link}>Terms</Text>
              </Text>
            </TouchableOpacity>
          </View>

          <TouchableOpacity
            style={[s.googleBtn, (isDisabled || !isAgeVerified || !isTermsAccepted) && s.btnDisabled]}
            activeOpacity={0.8}
            onPress={handleGoogleLogin}
            disabled={isDisabled || !isAgeVerified || !isTermsAccepted}
          >
            {googleLoading || isAnimating ? (
              <ActivityIndicator color="#000" />
            ) : (
              <View style={s.googleBtnContent}>
                <Text style={s.googleIcon}>G</Text>
                <Text style={s.googleTxt}>Continue with Google</Text>
              </View>
            )}
          </TouchableOpacity>
        </View>

        <Text style={[s.privacy, { color: '#888', marginTop: 20 }]}>
          Your real identity is never shown to other students.{'\n'}Loona is anonymous by design.
        </Text>
      </View>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.bg },
  errBox: {
    backgroundColor: 'rgba(255, 69, 58, 0.1)', borderWidth: 1,
    borderColor: 'rgba(255, 69, 58, 0.3)', borderRadius: 12, padding: 14, marginBottom: 20,
  },
  errTxt: { fontSize: 13, color: Colors.danger, lineHeight: 18 },
  label: { fontSize: 11, color: Colors.txt2, letterSpacing: 0.5, marginBottom: 8, textTransform: 'uppercase', fontWeight: '700' },
  campusTrigger: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: 'rgba(255,255,255,0.03)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)',
    borderRadius: 12, padding: 16, marginBottom: 24,
  },
  campusTxt: { fontSize: 14, flex: 1 },
  campusPlaceholder: { color: Colors.txt3, fontSize: 14 },
  chev: { fontSize: 12, color: Colors.txt3 },
  dot: { width: 10, height: 10, borderRadius: 5 },
  dropdown: {
    backgroundColor: Colors.card2, borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)',
    borderRadius: 16, overflow: 'hidden', marginBottom: 24, marginTop: -16,
    shadowColor: '#000', shadowOpacity: 0.2, shadowRadius: 15, shadowOffset: { width: 0, height: 8 }, elevation: 5,
  },
  ddItem: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 16, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.03)' },
  ddItemActive: { backgroundColor: 'rgba(255,255,255,0.05)' },
  ddName: { fontWeight: '700', fontSize: 14, color: Colors.txt },
  ddSub: { fontSize: 11, color: Colors.txt3, marginTop: 2 },
  checkMarkWrap: { backgroundColor: 'rgba(255, 69, 58, 0.15)', width: 24, height: 24, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  checkMark: { color: Colors.ogi, fontSize: 12, fontWeight: 'bold' },
  complianceContainer: { marginBottom: 24, gap: 12 },
  checkRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  checkbox: {
    width: 20, height: 20, borderRadius: 6, borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.2)',
    backgroundColor: 'rgba(255,255,255,0.03)', alignItems: 'center', justifyContent: 'center',
  },
  checkboxChecked: { backgroundColor: Colors.ogi, borderColor: Colors.ogi },
  checkboxTick: { color: '#fff', fontSize: 12, fontWeight: 'bold' },
  checkLabel: { fontSize: 13, color: Colors.txt2 },
  link: { color: Colors.ogi, fontWeight: '600' },
  googleBtn: {
    borderRadius: 14, padding: 16, alignItems: 'center', backgroundColor: '#fff',
    shadowColor: '#fff', shadowOpacity: 0.1, shadowRadius: 8, shadowOffset: { width: 0, height: 0 },
  },
  googleBtnContent: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  googleIcon: { fontWeight: '700', fontSize: 18, color: '#000' },
  googleTxt: { fontWeight: '600', fontSize: 15, color: '#000' },
  btnDisabled: { opacity: 0.5 },
  privacy: { fontSize: 11, color: Colors.txt3, textAlign: 'center', lineHeight: 18, marginTop: 10 },
});