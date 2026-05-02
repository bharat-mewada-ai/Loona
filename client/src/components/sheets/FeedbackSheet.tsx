import React, { useState } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, Modal, Pressable,
  TextInput, ActivityIndicator, Alert, KeyboardAvoidingView, Platform
} from 'react-native';
import { getColors } from '../../theme/colors';
import { useUIStore } from '../../store/uiStore';
import client from '../../api/client';

export default function FeedbackSheet() {
  const { showFeedbackSheet, closeFeedbackSheet, isDark } = useUIStore();
  const themeColors = getColors(isDark);

  const [content, setContent] = useState('');
  const [category, setCategory] = useState('improvement');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    if (!content.trim()) {
      Alert.alert('Empty', 'Please enter some feedback.');
      return;
    }

    setLoading(true);
    try {
      await client.post('/feedback', { content: content.trim(), category });
      Alert.alert('Success', 'Thank you for your feedback! ❤️');
      setContent('');
      closeFeedbackSheet();
    } catch (err: any) {
      Alert.alert('Error', err.response?.data?.error || 'Failed to submit feedback');
    } finally {
      setLoading(false);
    }
  };

  const categories = [
    { label: 'Bug 🐛', value: 'bug' },
    { label: 'Feature ✨', value: 'feature' },
    { label: 'Improvement 📈', value: 'improvement' },
    { label: 'Other 💬', value: 'other' },
  ];

  return (
    <Modal visible={showFeedbackSheet} transparent animationType="slide" onRequestClose={closeFeedbackSheet}>
      <Pressable style={s.overlay} onPress={closeFeedbackSheet}>
        <KeyboardAvoidingView 
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={{ width: '100%' }}
        >
          <Pressable style={[s.sheet, { backgroundColor: themeColors.card }]} onPress={(e) => e.stopPropagation()}>
            <View style={s.handle} />
            <View style={s.header}>
              <Text style={[s.title, { color: themeColors.txt }]}>Share Feedback 💬</Text>
              <TouchableOpacity onPress={closeFeedbackSheet}>
                <Text style={[s.closeTxt, { color: themeColors.txt3 }]}>Close</Text>
              </TouchableOpacity>
            </View>

            <Text style={[s.sub, { color: themeColors.txt3 }]}>
              Tell us what you love or what we can do better. We read every message!
            </Text>

            <View style={s.catRow}>
              {categories.map((cat) => (
                <TouchableOpacity 
                  key={cat.value} 
                  style={[
                    s.catBtn, 
                    { backgroundColor: themeColors.card2, borderColor: themeColors.bdr },
                    category === cat.value && { borderColor: themeColors.ogi, backgroundColor: themeColors.ogibg }
                  ]}
                  onPress={() => setCategory(cat.value)}
                >
                  <Text style={[s.catLabel, { color: category === cat.value ? themeColors.ogi : themeColors.txt }]}>
                    {cat.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <TextInput
              style={[s.input, { backgroundColor: themeColors.bg2, borderColor: themeColors.bdr, color: themeColors.txt }]}
              placeholder="What's on your mind?..."
              placeholderTextColor={themeColors.txt3}
              value={content}
              onChangeText={setContent}
              multiline
              numberOfLines={6}
              maxLength={1000}
            />

            <TouchableOpacity 
              style={[s.submitBtn, { backgroundColor: themeColors.ogi }, loading && { opacity: 0.7 }]} 
              onPress={handleSubmit}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={s.submitTxt}>Send Feedback</Text>
              )}
            </TouchableOpacity>
            <View style={{ height: 40 }} />
          </Pressable>
        </KeyboardAvoidingView>
      </Pressable>
    </Modal>
  );
}

const s = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.55)', justifyContent: 'flex-end' },
  sheet: { borderTopLeftRadius: 32, borderTopRightRadius: 32, padding: 24, paddingBottom: 40 },
  handle: { width: 40, height: 4, backgroundColor: '#DDD', borderRadius: 2, alignSelf: 'center', marginBottom: 20 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  title: { fontFamily: 'Syne_700Bold', fontSize: 20 },
  closeTxt: { fontSize: 14, fontWeight: '600' },
  sub: { fontSize: 14, fontFamily: 'PlusJakartaSans_400Regular', lineHeight: 20, marginBottom: 20 },
  catRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 20 },
  catBtn: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 20, borderWidth: 1 },
  catLabel: { fontSize: 12, fontFamily: 'PlusJakartaSans_600SemiBold' },
  input: { height: 150, borderRadius: 16, borderWidth: 1, padding: 16, textAlignVertical: 'top', fontSize: 15, marginBottom: 24 },
  submitBtn: { height: 56, borderRadius: 16, justifyContent: 'center', alignItems: 'center' },
  submitTxt: { color: '#fff', fontSize: 16, fontFamily: 'Syne_700Bold' },
});
