import React from 'react';
import {
  View, Text, ScrollView, StyleSheet, SafeAreaView, ActivityIndicator
} from 'react-native';
import { Colors, getColors } from '../../src/theme/colors';
import { useUIStore } from '../../src/store/uiStore';
import { useLeaderboard } from '../../src/hooks/useAuth';

const getCampusColor = (campus: string, themeColors: any) => {
  if (campus === 'ogi') return themeColors.ogi;
  if (campus === 'lnct') return themeColors.lnct;
  return themeColors.nit;
};

const getCampusName = (campus: string) => {
  if (campus === 'ogi') return 'Oriental Institute (OGI)';
  if (campus === 'lnct') return 'LNCT';
  return 'NIT Bhopal';
};

const getCampusEmoji = (campus: string) => {
  if (campus === 'ogi') return '🔴';
  if (campus === 'lnct') return '🟣';
  return '🟢';
};

const getRankLabel = (index: number) => {
  if (index === 0) return '🥇';
  if (index === 1) return '🥈';
  if (index === 2) return '🥉';
  return `${index + 1}`;
};

export default function LeaderboardScreen() {
  const { isDark } = useUIStore();
  const themeColors = getColors(isDark);
  // refetchInterval is set to 10s in useLeaderboard hook for live feel
  const { data, isLoading } = useLeaderboard();

  if (isLoading) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: themeColors.bg, justifyContent: 'center', alignItems: 'center' }}>
        <Text style={{ fontSize: 40, marginBottom: 16 }}>🥔</Text>
        <ActivityIndicator color={themeColors.ogi} />
        <Text style={{ color: themeColors.txt3, marginTop: 12, fontFamily: 'PlusJakartaSans_400Regular' }}>
          Loading patato scores...
        </Text>
      </SafeAreaView>
    );
  }

  const campusWarData = data?.campusWar || [];
  const maxPatato = campusWarData.length > 0 ? Math.max(campusWarData[0].karma, 1) : 1;

  const campusWar = campusWarData.map((c: any, i: number) => ({
    rank: i + 1,
    label: getRankLabel(i),
    name: getCampusName(c._id),
    emoji: getCampusEmoji(c._id),
    campus: c._id,
    color: getCampusColor(c._id, themeColors),
    patato: c.karma,
    pct: Math.max(Math.round((c.karma / maxPatato) * 100), 4),
  }));

  const totalPatato = campusWar.reduce((sum: number, c: any) => sum + c.patato, 0);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: themeColors.bg }}>
      <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>

        {/* Header */}
        <View style={s.headerRow}>
          <Text style={s.headerEmoji}>🥔</Text>
          <View style={{ flex: 1 }}>
            <Text style={[s.headerTitle, { color: themeColors.txt }]}>Campus Patato War</Text>
            <Text style={[s.headerSub, { color: themeColors.txt3 }]}>
              Which campus earns the most patato? 🔥
            </Text>
          </View>
          <View style={[s.liveBadge, { backgroundColor: themeColors.dangerbg }]}>
            <View style={s.liveDot} />
            <Text style={[s.liveTxt, { color: themeColors.danger }]}>LIVE</Text>
          </View>
        </View>

        {/* Total patato score */}
        <View style={[s.totalCard, { backgroundColor: themeColors.card2, borderColor: themeColors.bdr }]}>
          <Text style={[s.totalLabel, { color: themeColors.txt3 }]}>TOTAL PATATO EARNED ACROSS ALL CAMPUSES</Text>
          <Text style={[s.totalVal, { color: themeColors.ogi }]}>🥔 {totalPatato.toLocaleString()}</Text>
        </View>

        {/* Section Label */}
        <Text style={[s.sec, { color: themeColors.txt3 }]}>CAMPUS RANKINGS · SEASON 1</Text>

        {/* Campus War Cards */}
        {campusWar.map((c: any) => (
          <View key={c.campus} style={[s.warCard, { backgroundColor: themeColors.card, borderColor: themeColors.bdr }]}>
            {/* Rank + Campus Name */}
            <View style={s.warTop}>
              <Text style={[s.warRank, c.rank <= 3 && { color: Colors.gold }]}>{c.label}</Text>
              <Text style={[s.campusEmoji]}>{c.emoji}</Text>
              <View style={{ flex: 1 }}>
                <Text style={[s.warName, { color: c.color }]}>{c.name}</Text>
                <Text style={[s.warPatatoLabel, { color: themeColors.txt3 }]}>
                  🥔 {c.patato.toLocaleString()} patato
                </Text>
              </View>
              {c.rank === 1 && (
                <View style={[s.crownBadge, { backgroundColor: c.color + '22' }]}>
                  <Text style={[s.crownTxt, { color: c.color }]}>👑 Leading</Text>
                </View>
              )}
            </View>

            {/* Progress Bar */}
            <View style={[s.progBg, { backgroundColor: themeColors.bg2 }]}>
              <View
                style={[
                  s.progFill,
                  { width: `${c.pct}%` as any, backgroundColor: c.color },
                ]}
              />
            </View>
            <Text style={[s.progPct, { color: themeColors.txt3 }]}>{c.pct}% of top score</Text>
          </View>
        ))}

        {/* Top Users Section */}
        <Text style={[s.sec, { color: themeColors.txt3, marginTop: 24 }]}>TOP CAMPUS LEGENDS 🏆</Text>
        <View style={[s.legendsCard, { backgroundColor: themeColors.card, borderColor: themeColors.bdr }]}>
          {(data?.topUsers || []).map((u: any, i: number) => (
            <View key={u._id || i} style={[s.legendRow, i < ((data?.topUsers?.length || 0) - 1) && { borderBottomWidth: 1, borderBottomColor: themeColors.bdr }]}>
              <Text style={s.legendRank}>{getRankLabel(i)}</Text>
              <View style={[s.legendAv, { backgroundColor: themeColors.card2, borderColor: getCampusColor(u.campus, themeColors) }]}>
                <Text style={{ fontSize: 18 }}>{u.avatar || '👤'}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[s.legendName, { color: themeColors.txt }]}>{u.name}</Text>
                <Text style={[s.legendCampus, { color: getCampusColor(u.campus, themeColors) }]}>
                  {getCampusName(u.campus).split(' (')[0]}
                </Text>
              </View>
              <View style={s.legendKarma}>
                <Text style={[s.legendKarmaVal, { color: themeColors.ogi }]}>🥔 {u.karma.toLocaleString()}</Text>
              </View>
            </View>
          ))}
          {(!data?.topUsers || data.topUsers.length === 0) && (
            <View style={{ padding: 32, alignItems: 'center' }}>
              <Text style={{ color: themeColors.txt3, fontFamily: 'PlusJakartaSans_400Regular' }}>No legends yet. Be the first! 👑</Text>
            </View>
          )}
        </View>

        {/* Info card */}
        <View style={[s.infoCard, { backgroundColor: themeColors.card, borderColor: themeColors.bdr, marginTop: 32 }]}>
          <Text style={s.infoEmoji}>🥔</Text>
          <View style={{ flex: 1 }}>
            <Text style={[s.infoTitle, { color: themeColors.txt }]}>How patato works?</Text>
            <Text style={[s.infoBody, { color: themeColors.txt2 }]}>
              Every upvote (patato 🥔) you get on your posts earns your campus points and increases your legend rank.
              Post more, earn more patato, and lead your campus to victory!
            </Text>
          </View>
        </View>

        <Text style={[s.refreshNote, { color: themeColors.txt3 }]}>
          🔄 Scores update every 10 seconds
        </Text>

      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  scroll: { padding: 16, paddingBottom: 100 },

  headerRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 16 },
  headerEmoji: { fontSize: 40 },
  headerTitle: { fontFamily: 'Syne_700Bold', fontSize: 20 },
  headerSub: { fontFamily: 'PlusJakartaSans_400Regular', fontSize: 12, marginTop: 2 },
  liveBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 20 },
  liveDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#E53935' },
  liveTxt: { fontFamily: 'Syne_700Bold', fontSize: 10 },

  totalCard: { borderRadius: 16, borderWidth: 1, padding: 16, alignItems: 'center', marginBottom: 16 },
  totalLabel: { fontFamily: 'Syne_700Bold', fontSize: 9, letterSpacing: 1.2, marginBottom: 6 },
  totalVal: { fontFamily: 'Syne_700Bold', fontSize: 32 },

  sec: {
    fontFamily: 'Syne_700Bold', fontSize: 9, letterSpacing: 1.3,
    textTransform: 'uppercase', marginBottom: 10, marginTop: 4,
  },

  warCard: {
    borderWidth: 1, borderRadius: 16, padding: 14, marginBottom: 10,
  },
  warTop: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 12 },
  warRank: { fontFamily: 'Syne_700Bold', fontSize: 20, width: 28, color: Colors.txt3 },
  campusEmoji: { fontSize: 22 },
  warName: { fontFamily: 'Syne_700Bold', fontSize: 15 },
  warPatatoLabel: { fontFamily: 'PlusJakartaSans_400Regular', fontSize: 12, marginTop: 2 },
  crownBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 },
  crownTxt: { fontFamily: 'Syne_700Bold', fontSize: 10 },

  progBg: { height: 8, borderRadius: 4, overflow: 'hidden', marginBottom: 4 },
  progFill: { height: '100%', borderRadius: 4 },
  progPct: { fontFamily: 'PlusJakartaSans_400Regular', fontSize: 10, textAlign: 'right' },

  infoCard: {
    flexDirection: 'row', gap: 12, borderWidth: 1, borderRadius: 16,
    padding: 16, marginTop: 8, alignItems: 'flex-start',
  },
  infoEmoji: { fontSize: 28, marginTop: 2 },
  infoTitle: { fontFamily: 'Syne_700Bold', fontSize: 14, marginBottom: 4 },
  infoBody: { fontFamily: 'PlusJakartaSans_400Regular', fontSize: 12, lineHeight: 20 },

  refreshNote: { textAlign: 'center', fontSize: 11, fontFamily: 'PlusJakartaSans_400Regular', marginTop: 16 },
  
  legendsCard: { borderRadius: 20, borderWidth: 1, overflow: 'hidden' },
  legendRow: { flexDirection: 'row', alignItems: 'center', padding: 16, gap: 12 },
  legendRank: { width: 32, fontSize: 18, textAlign: 'center' },
  legendAv: { width: 44, height: 44, borderRadius: 22, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
  legendName: { fontFamily: 'Syne_700Bold', fontSize: 15 },
  legendCampus: { fontFamily: 'PlusJakartaSans_600SemiBold', fontSize: 10, textTransform: 'uppercase' },
  legendKarma: { alignItems: 'flex-end' },
  legendKarmaVal: { fontFamily: 'Syne_700Bold', fontSize: 14 },
});
