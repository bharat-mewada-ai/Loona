import React from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, Modal, Pressable, ScrollView, Linking
} from 'react-native';
import { getColors } from '../../theme/colors';
import { useUIStore } from '../../store/uiStore';

export default function PrivacySheet() {
  const { showPrivacySheet, closePrivacySheet, isDark } = useUIStore();
  const themeColors = getColors(isDark);

  return (
    <Modal visible={showPrivacySheet} transparent animationType="slide" onRequestClose={closePrivacySheet}>
      <Pressable style={s.overlay} onPress={closePrivacySheet}>
        <Pressable style={[s.sheet, { backgroundColor: themeColors.card }]} onPress={(e) => e.stopPropagation()}>
          <View style={s.handle} />
          <View style={s.header}>
            <Text style={[s.title, { color: themeColors.txt }]}>Privacy & Terms 🛡️</Text>
            <TouchableOpacity onPress={closePrivacySheet}>
              <Text style={[s.closeTxt, { color: themeColors.txt3 }]}>Close</Text>
            </TouchableOpacity>
          </View>

          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={s.content}>

            {/* Last Updated */}
            <Text style={[s.meta, { color: themeColors.txt3 }]}>Last updated: May 1, 2026 · Version 1.0</Text>

            {/* ─── PRIVACY POLICY ─── */}
            <Text style={[s.h1, { color: themeColors.txt }]}>Privacy Policy</Text>

            <Text style={[s.section, { color: themeColors.txt }]}>1. Anonymity First</Text>
            <Text style={[s.body, { color: themeColors.txt2 }]}>
              Loona is built on anonymity. We do not display your real name, email address, or college ID to other users. Your profile is represented only by a chosen avatar and an auto-generated anonymous username. Other users cannot identify you from your posts, comments, or messages.
            </Text>

            <Text style={[s.section, { color: themeColors.txt }]}>2. What Data We Collect</Text>
            <Text style={[s.body, { color: themeColors.txt2 }]}>
              • <Text style={{ fontWeight: '700' }}>Email address</Text> — collected via Google Sign-In, used only for authentication. Never shown to other users.{'\n'}
              • <Text style={{ fontWeight: '700' }}>Campus selection</Text> — used to filter your feed to relevant content.{'\n'}
              • <Text style={{ fontWeight: '700' }}>Post and comment content</Text> — stored to provide the core service.{'\n'}
              • <Text style={{ fontWeight: '700' }}>Device push token</Text> — stored to deliver notifications (optional; you can deny permission).{'\n\n'}
              We do <Text style={{ fontWeight: '700' }}>NOT</Text> sell, rent, or share your personal data with any third party for advertising purposes.
            </Text>

            <Text style={[s.section, { color: themeColors.txt }]}>3. How We Use Your Data</Text>
            <Text style={[s.body, { color: themeColors.txt2 }]}>
              Your data is used solely to:{'\n'}
              • Authenticate your account and maintain your session{'\n'}
              • Display campus-specific content in your feed{'\n'}
              • Calculate your potato score and streak for the leaderboard{'\n'}
              • Send you push notifications for replies and messages (only if permitted){'\n'}
              • Moderate content and enforce community guidelines
            </Text>

            <Text style={[s.section, { color: themeColors.txt }]}>4. Third-Party Services</Text>
            <Text style={[s.body, { color: themeColors.txt2 }]}>
              Loona uses the following third-party services:{'\n'}
              • <Text style={{ fontWeight: '700' }}>Google Sign-In</Text> — for authentication{'\n'}
              • <Text style={{ fontWeight: '700' }}>Cloudinary</Text> — for image hosting (CDN){'\n'}
              • <Text style={{ fontWeight: '700' }}>Sentry</Text> — for crash reporting (anonymized){'\n'}
              • <Text style={{ fontWeight: '700' }}>Expo Push Notifications</Text> — for delivery of alerts{'\n\n'}
              Each service operates under its own privacy policy.
            </Text>

            <Text style={[s.section, { color: themeColors.txt }]}>5. Data Retention & Deletion</Text>
            <Text style={[s.body, { color: themeColors.txt2 }]}>
              Posts marked "Burn after 24h" are automatically and permanently deleted after 24 hours.{'\n\n'}
              To request full account deletion, contact us via the Feedback section. We will delete your account and associated data within 30 days.
            </Text>

            <Text style={[s.section, { color: themeColors.txt }]}>6. Security</Text>
            <Text style={[s.body, { color: themeColors.txt2 }]}>
              We use industry-standard security measures including JWT-based authentication, HTTPS-only communication, and encrypted storage. However, no system is 100% secure. Please do not share sensitive personal information in posts.
            </Text>

            {/* ─── TERMS OF SERVICE ─── */}
            <View style={[s.divider, { backgroundColor: themeColors.bdr }]} />
            <Text style={[s.h1, { color: themeColors.txt }]}>Terms of Service</Text>

            <Text style={[s.section, { color: themeColors.txt }]}>1. Eligibility</Text>
            <Text style={[s.body, { color: themeColors.txt2 }]}>
              Loona is available to students currently enrolled at OGI or LNCT. By using the app, you confirm you are a student at one of these institutions and are at least 18 years of age.
            </Text>

            <Text style={[s.section, { color: themeColors.txt }]}>2. Acceptable Use</Text>
            <Text style={[s.body, { color: themeColors.txt2 }]}>
              You agree NOT to:{'\n'}
              • Post content that is illegal, hateful, harassing, or threatening{'\n'}
              • Share personal information (phone numbers, home addresses) of other users{'\n'}
              • Attempt to deanonymize or identify other users{'\n'}
              • Use bots or scripts to inflate potatoes or reactions{'\n'}
              • Post spam, advertisements, or phishing links{'\n\n'}
              Violation of these rules may result in immediate and permanent account termination.
            </Text>

            <Text style={[s.section, { color: themeColors.txt }]}>3. Content Ownership</Text>
            <Text style={[s.body, { color: themeColors.txt2 }]}>
              You retain ownership of the content you post. By posting, you grant Loona a non-exclusive, royalty-free license to display and distribute your content within the app for the purpose of providing the service.
            </Text>

            <Text style={[s.section, { color: themeColors.txt }]}>4. Moderation & Termination</Text>
            <Text style={[s.body, { color: themeColors.txt2 }]}>
              We reserve the right to remove any content and terminate any account that violates these terms, at our sole discretion, without prior notice.
            </Text>

            <Text style={[s.section, { color: themeColors.txt }]}>5. Disclaimer</Text>
            <Text style={[s.body, { color: themeColors.txt2 }]}>
              Loona is provided "as is" without warranties of any kind. We are not responsible for content posted by users. The app may be unavailable at times for maintenance.
            </Text>

            <Text style={[s.section, { color: themeColors.txt }]}>6. Contact</Text>
            <Text style={[s.body, { color: themeColors.txt2 }]}>
              For privacy concerns, account deletion, or terms-related queries, use the Feedback section in your profile, or email us at:{' '}
              <Text style={{ color: '#C94030', fontWeight: '700' }}
                onPress={() => Linking.openURL('mailto:loona43210@gmail.com')}>
                loona43210@gmail.com
              </Text>
            </Text>

            <View style={{ height: 60 }} />
          </ScrollView>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const s = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.55)', justifyContent: 'flex-end' },
  sheet: { borderTopLeftRadius: 32, borderTopRightRadius: 32, padding: 24, paddingBottom: 0, height: '90%' },
  handle: { width: 40, height: 4, backgroundColor: '#DDD', borderRadius: 2, alignSelf: 'center', marginBottom: 20 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  title: { fontFamily: 'Syne_700Bold', fontSize: 22 },
  closeTxt: { fontSize: 14, fontWeight: '600' },
  meta: { fontSize: 11, marginBottom: 16, fontStyle: 'italic' },
  content: { paddingBottom: 40 },
  h1: { fontFamily: 'Syne_700Bold', fontSize: 20, marginTop: 8, marginBottom: 4 },
  section: { fontFamily: 'Syne_700Bold', fontSize: 15, marginTop: 20, marginBottom: 6 },
  body: { fontFamily: 'PlusJakartaSans_400Regular', fontSize: 13.5, lineHeight: 22 },
  divider: { height: 1, marginVertical: 28, borderRadius: 1 },
});
