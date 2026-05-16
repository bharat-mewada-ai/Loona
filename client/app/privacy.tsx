import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Stack, useRouter } from 'expo-router';
import { useUIStore } from '../src/store/uiStore';
import { getColors } from '../src/theme/colors';

export default function PrivacyPolicyScreen() {
  const router = useRouter();
  const isDark = useUIStore((s) => s.isDark);
  const themeColors = getColors(isDark);

  return (
    <SafeAreaView style={[s.safe, { backgroundColor: themeColors.bg }]}>
      <Stack.Screen options={{ 
        headerTitle: 'Privacy Policy',
        headerStyle: { backgroundColor: themeColors.bg },
        headerTintColor: themeColors.txt,
        headerTitleStyle: { fontFamily: 'Syne_700Bold' },
        headerShadowVisible: false,
      }} />
      
      <ScrollView contentContainerStyle={s.content}>
        <Text style={[s.title, { color: themeColors.txt }]}>Loona Privacy Policy</Text>
        <Text style={[s.date, { color: themeColors.txt3 }]}>Last updated: May 2026</Text>

        <Section title="1. Introduction" color={themeColors.txt}>
          Loona is committed to protecting your privacy. This policy explains how we handle your data in compliance with the Digital Personal Data Protection Act (DPDPA), 2023.
        </Section>

        <Section title="2. Anonymous Confessions" color={themeColors.txt}>
          For "Confession" type posts, we generate a random identity. Your real name and profile are NOT linked to these posts in our public database. Even admins cannot trace a confession back to your real identity.
        </Section>

        <Section title="3. Data Collection" color={themeColors.txt}>
          We collect your Google ID, name, email, and campus to provide a secure and verified experience. We also collect your location data (if permitted) to show posts near you.
        </Section>

        <Section title="4. Data Retention" color={themeColors.txt}>
          - Regular posts are stored permanently unless deleted by you or an admin.
          - "Burn" posts are deleted automatically after 24 hours.
          - Notifications are deleted after 30 days.
        </Section>

        <Section title="5. Your Rights" color={themeColors.txt}>
          You have the right to access, correct, or delete your personal data. You can delete your account at any time from the settings menu.
        </Section>

        <TouchableOpacity 
          style={[s.button, { backgroundColor: themeColors.ogi }]}
          onPress={() => router.back()}
        >
          <Text style={s.buttonTxt}>I Understand</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const Section = ({ title, children, color }: { title: string, children: React.ReactNode, color: string }) => (
  <View style={s.section}>
    <Text style={[s.sectionTitle, { color }]}>{title}</Text>
    <Text style={s.sectionText}>{children}</Text>
  </View>
);

const s = StyleSheet.create({
  safe: { flex: 1 },
  content: { padding: 24, paddingBottom: 40 },
  title: { fontSize: 24, fontFamily: 'Syne_700Bold', marginBottom: 4 },
  date: { fontSize: 12, marginBottom: 24 },
  section: { marginBottom: 24 },
  sectionTitle: { fontSize: 16, fontFamily: 'PlusJakartaSans_700Bold', marginBottom: 8 },
  sectionText: { fontSize: 14, color: '#A1A1AA', lineHeight: 22, fontFamily: 'PlusJakartaSans_400Regular' },
  button: { height: 50, borderRadius: 25, alignItems: 'center', justifyContent: 'center', marginTop: 20 },
  buttonTxt: { color: '#FFF', fontSize: 16, fontWeight: '700' }
});
