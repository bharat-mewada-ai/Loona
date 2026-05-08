import React, { useState, useRef, useEffect } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet,
  SafeAreaView, KeyboardAvoidingView, Platform, ActivityIndicator, ScrollView,
  Animated, Easing, TextInput
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

export default function RegisterScreen() {
  const { mutate: googleAuth, isPending: googleLoading } = useGoogleAuth();
  
  const [campus, setCampus] = useState('');
  const [campusOpen, setCampusOpen] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  
  const [request, response, promptAsync] = Google.useAuthRequest({
    webClientId: '612057986452-msvfloi7pqa12a9sfkth79kb1v18s01q.apps.googleusercontent.com',
    androidClientId: '612057986452-8ov2v6ouhqk1bsktvl2je8mj0j9nrc7r.apps.googleusercontent.com',
    iosClientId: '612057986452-msvfloi7pqa12a9sfkth79kb1v18s01q.apps.googleusercontent.com',
    clientId: '612057986452-msvfloi7pqa12a9sfkth79kb1v18s01q.apps.googleusercontent.com',
  });

  // Animation state
  const [isAnimating, setIsAnimating] = useState(false);
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const colorAnim = useRef(new Animated.Value(0)).current;

  const selectedCampus = CAMPUSES.find((c) => c.value === campus);

  useEffect(() => {
    if (response?.type === 'success') {
      const { authentication } = response;
      const token = authentication?.idToken || authentication?.accessToken;
      
      if (!token) {
        setIsAnimating(false);
        setErrorMsg('Failed to retrieve Google token.');
        return;
      }

      // Start animation
      setIsAnimating(true);
      
      Animated.sequence([
        Animated.timing(fadeAnim, { toValue: 1, duration: 400, useNativeDriver: false }),
        Animated.timing(scaleAnim, { toValue: 20, duration: 800, easing: Easing.inOut(Easing.ease), useNativeDriver: false })
      ]).start();

      Animated.loop(
        Animated.sequence([
          Animated.timing(colorAnim, { toValue: 1, duration: 500, useNativeDriver: false }),
          Animated.timing(colorAnim, { toValue: 0, duration: 500, useNativeDriver: false })
        ])
      ).start();

      googleAuth({ token, campus }, {
        onSuccess: () => {
          setTimeout(() => {
            router.replace("/(tabs)/");
          }, 1200);
        },
        onError: () => {
          setIsAnimating(false);
          setErrorMsg('Authentication failed. Please try again.');
        }
      });
    } else if (response?.type === 'error') {
      setIsAnimating(false);
      setErrorMsg('Google login failed or was canceled.');
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
    outputRange: [Colors.ogi, Colors.lnct]
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
           <Animated.Text style={{ marginTop: 20, color: '#fff', fontFamily: 'PlusJakartaSans_400Regular', opacity: colorAnim }}>
              Authenticating...
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
          <View style={s.logoWrap}>
            <Text style={s.logo}>
              l<Text style={{ color: Colors.ogi }}>oo</Text>na
            </Text>
            <Text style={s.logoSub}>CAMPUS UNDERGROUND</Text>
            <Text style={s.tagline}>Anonymous. Real. Yours.</Text>
          </View>

          {/* Card */}
          <View style={s.card}>
            <Text style={s.cardTitle}>Join your campus 🌕</Text>
            <Text style={s.cardSub}>Create an anonymous account directly with your Gmail ID</Text>

            {/* Error */}
            {errorMsg ? (
              <View style={s.errBox}>
                <Text style={s.errTxt}>{errorMsg}</Text>
              </View>
            ) : null}

            {/* Campus picker */}
            <Text style={s.label}>Your Campus</Text>
            <TouchableOpacity
              style={[s.campusTrigger, campusOpen && { borderColor: Colors.lnct }]}
              onPress={() => setCampusOpen(o => !o)}
              activeOpacity={0.85}
            >
              {selectedCampus ? (
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <View style={[s.dot, { backgroundColor: selectedCampus.dotColor }]} />
                  <Text style={[s.campusTxt, { color: Colors.txt }]}>
                    {selectedCampus.label} · {selectedCampus.full}
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
                      <Text style={{ color: Colors.ogi, fontSize: 12 }}>✓</Text>
                    )}
                  </TouchableOpacity>
                ))}
              </View>
            )}

            {/* Google */}
            <TouchableOpacity style={[s.googleBtn, isDisabled && s.btnDisabled]} activeOpacity={0.8} onPress={handleGoogleLogin} disabled={isDisabled}>
              {googleLoading ? (
                <ActivityIndicator color={Colors.txt} />
              ) : (
                <Text style={s.googleTxt}>🔵  Continue with Google</Text>
              )}
            </TouchableOpacity>
          </View>

          <TouchableOpacity onPress={() => router.replace('/(auth)/login')} style={{ alignItems: 'center', marginBottom: 20 }}>
            <Text style={{ color: Colors.txt3, fontSize: 13, fontFamily: 'PlusJakartaSans_500Medium' }}>
              Already have an account? <Text style={{ color: Colors.ogi }}>Login</Text>
            </Text>
          </TouchableOpacity>

          {/* Privacy */}
          <Text style={s.privacy}>
            Your real identity is never shown to other students.{'\n'}Loona is anonymous by design.
          </Text>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.bg },
  scroll: { flexGrow: 1, padding: 20, justifyContent: 'center' },

  animOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: Colors.bg,
    zIndex: 100,
    justifyContent: 'center',
    alignItems: 'center',
  },
  animText: {
    fontFamily: 'Syne_700Bold',
    fontSize: 50,
    color: Colors.txt,
    letterSpacing: -2,
    flexDirection: 'row',
  },

  logoWrap: { alignItems: 'center', marginBottom: 28 },
  logo: {
    fontFamily: 'Syne_700Bold', fontSize: 38, color: Colors.txt, letterSpacing: -1,
  },
  logoSub: {
    fontFamily: 'Syne_700Bold', fontSize: 9, color: Colors.txt3,
    letterSpacing: 2, marginTop: -4,
  },
  tagline: {
    fontSize: 12, color: Colors.txt2, marginTop: 8,
    fontFamily: 'PlusJakartaSans_400Regular', fontStyle: 'italic',
  },

  card: {
    backgroundColor: Colors.card, borderWidth: 1, borderColor: Colors.bdr,
    borderRadius: 14, padding: 20, marginBottom: 16,
  },
  cardTitle: { fontFamily: 'Syne_700Bold', fontSize: 18, color: Colors.txt, marginBottom: 4 },
  cardSub: { fontSize: 12, color: Colors.txt2, marginBottom: 20, fontFamily: 'PlusJakartaSans_400Regular' },

  errBox: {
    backgroundColor: Colors.dangerbg,
    borderWidth: 1,
    borderColor: Colors.ogi,
    borderRadius: 8,
    padding: 10,
    marginBottom: 14,
  },
  errTxt: { fontSize: 12, color: Colors.danger, fontFamily: 'PlusJakartaSans_400Regular' },

  label: {
    fontFamily: 'Syne_700Bold', fontSize: 10, color: Colors.txt2,
    letterSpacing: 0.5, marginBottom: 5, textTransform: 'uppercase',
  },
  
  campusTrigger: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: Colors.card2, borderWidth: 1, borderColor: Colors.bdr,
    borderRadius: 8, padding: 10, marginBottom: 18,
  },
  campusTxt: { fontFamily: 'PlusJakartaSans_400Regular', fontSize: 13, flex: 1 },
  campusPlaceholder: { color: Colors.txt3, fontFamily: 'PlusJakartaSans_400Regular', fontSize: 13 },
  chev: { fontSize: 10, color: Colors.txt3 },
  dot: { width: 8, height: 8, borderRadius: 4 },

  dropdown: {
    backgroundColor: Colors.card, borderWidth: 1, borderColor: Colors.bdr2,
    borderRadius: 10, overflow: 'hidden', marginBottom: 18, marginTop: -14,
    shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 }, elevation: 4,
  },
  ddItem: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    padding: 10, borderBottomWidth: 1, borderBottomColor: Colors.bdr,
  },
  ddItemActive: { backgroundColor: Colors.bg2 },
  ddName: { fontFamily: 'Syne_700Bold', fontSize: 12, color: Colors.txt },
  ddSub: { fontSize: 10, color: Colors.txt3, marginTop: 1 },

  googleBtn: {
    borderWidth: 1, borderColor: Colors.bdr, borderRadius: 999,
    padding: 14, alignItems: 'center', backgroundColor: Colors.card2,
  },
  googleTxt: { fontFamily: 'Syne_700Bold', fontSize: 13, color: Colors.txt },
  btnDisabled: { opacity: 0.5 },

  privacy: {
    fontSize: 10, color: Colors.txt3, textAlign: 'center', lineHeight: 15,
    fontFamily: 'PlusJakartaSans_400Regular', marginTop: 10,
  },
});
