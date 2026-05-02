import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Modal, Pressable } from 'react-native';
import { Colors } from '../../theme/colors';
import { useUIStore } from '../../store/uiStore';
import { useReport } from '../../hooks/usePosts';

const REPORT_OPTIONS = [
  { reason: 'Spam',        icon: '🚫', label: 'Spam or fake',               sub: 'Repeated or misleading content' },
  { reason: 'Bullying',    icon: '⚠️', label: 'Personal attack / bullying', sub: 'Targeting a real person' },
  { reason: 'Doxxing',     icon: '🔒', label: 'Sharing personal info',      sub: 'Name, phone, photos of real people' },
  { reason: 'Hate speech', icon: '🤬', label: 'Hate speech',                sub: 'Caste, religion, gender-based attacks' },
];

export default function ReportSheet() {
  // All three properties from uiStore are correctly named
  const { showReportSheet, closeReportSheet, reportPostId } = useUIStore();
  const { mutate: report, isPending } = useReport();

  const handleReport = (reason: string) => {
    if (!reportPostId) return;
    report(
      { id: reportPostId, reason },
      { onSuccess: closeReportSheet }
    );
  };

  return (
    <Modal visible={showReportSheet} transparent animationType="slide" onRequestClose={closeReportSheet}>
      <Pressable style={s.overlay} onPress={closeReportSheet}>
        <Pressable style={s.sheet} onPress={(e) => e.stopPropagation()}>
          <View style={s.handle} />
          <Text style={s.title}>Report this post</Text>

          <View style={s.warnBox}>
            <Text style={s.warnTxt}>
              Your report is 100% anonymous. 3 unique reports triggers auto-review.
            </Text>
          </View>

          {REPORT_OPTIONS.map((opt) => (
            <TouchableOpacity
              key={opt.reason}
              style={s.opt}
              onPress={() => handleReport(opt.reason)}
              disabled={isPending}
              activeOpacity={0.8}
            >
              <Text style={s.optIcon}>{opt.icon}</Text>
              <View>
                <Text style={s.optLabel}>{opt.label}</Text>
                <Text style={s.optSub}>{opt.sub}</Text>
              </View>
            </TouchableOpacity>
          ))}

          <TouchableOpacity style={s.cancelBtn} onPress={closeReportSheet} activeOpacity={0.8}>
            <Text style={s.cancelTxt}>Cancel</Text>
          </TouchableOpacity>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const s = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.55)', justifyContent: 'flex-end' },
  sheet: {
    backgroundColor: Colors.card, borderTopLeftRadius: 14, borderTopRightRadius: 14,
    padding: 16, paddingBottom: 28,
  },
  handle: { width: 34, height: 4, backgroundColor: Colors.bdr2, borderRadius: 2, alignSelf: 'center', marginBottom: 12 },
  title: { fontFamily: 'Syne_700Bold', fontSize: 14, color: Colors.txt, marginBottom: 10 },
  warnBox: {
    backgroundColor: Colors.warnbg, borderWidth: 1, borderColor: '#E8C878',
    borderRadius: 8, padding: 9, marginBottom: 8,
  },
  warnTxt: { fontSize: 11, color: Colors.warn, lineHeight: 16, fontFamily: 'PlusJakartaSans_400Regular' },
  opt: {
    flexDirection: 'row', alignItems: 'center', gap: 9,
    padding: 9, borderWidth: 1, borderColor: Colors.bdr, borderRadius: 10, marginBottom: 5,
  },
  optIcon: { fontSize: 16 },
  optLabel: { fontSize: 12, fontWeight: '600', color: Colors.txt, fontFamily: 'PlusJakartaSans_600SemiBold' },
  optSub: { fontSize: 10, color: Colors.txt3, marginTop: 1, fontFamily: 'PlusJakartaSans_400Regular' },
  cancelBtn: {
    marginTop: 6, borderWidth: 1, borderColor: Colors.bdr,
    borderRadius: 8, padding: 9, alignItems: 'center',
  },
  cancelTxt: { fontFamily: 'Syne_700Bold', fontSize: 11, color: Colors.txt3 },
});
