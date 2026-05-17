import React from 'react';
import { View, Text, ScrollView, StyleSheet, SafeAreaView, ActivityIndicator, TouchableOpacity, ImageBackground } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Colors, getColors } from '../../src/theme/colors';
import { useUIStore } from '../../src/store/uiStore';
import { useLeaderboard } from '../../src/hooks/useAuth';

const getCampusColor = (campus: string, themeColors: any) => {
  if (campus === 'ogi') return '#C94030';
  if (campus === 'lnct') return '#4D3DBF';
  return '#10B981';
};

const getCampusName = (campus: string) => {
  if (campus === 'ogi') return 'Oriental';
  if (campus === 'lnct') return 'LNCT';
  return 'NIT Bhopal';
};

const getCampusEmoji = (campus: string) => {
  if (campus === 'ogi') return '🦊';
  if (campus === 'lnct') return '🌙';
  return '🏛️';
};

const getRankLabel = (index: number) => {
  if (index === 0) return '🥇';
  if (index === 1) return '🥈';
  if (index === 2) return '🥉';
  return `${index + 1}`;
};

export default function LeaderboardScreen() {
  const router = useRouter();
  const { isDark } = useUIStore();
  const themeColors = getColors(isDark);
  const { data, isLoading } = useLeaderboard();

  if (isLoading) {
    return (
      <SafeAreaView style={[s.safe, { backgroundColor: themeColors.bg, justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator color={themeColors.ogi} size="large" />
        <Text style={[s.loadingTxt, { color: themeColors.txt3 }]}>Analyzing the battlefield...</Text>
      </SafeAreaView>
    );
  }

  const campusWarData = data?.campusWar || [];
  const topUsers = data?.topUsers || [];
  const totalPotato = campusWarData.reduce((sum: number, c: any) => sum + c.potato, 0);

  // Sorting for Versus logic
  const sortedCampuses = [...campusWarData].sort((a, b) => b.potato - a.potato);
  const leadCampus = sortedCampuses[0];
  const secondCampus = sortedCampuses[1];
  
  const leadGap = leadCampus && secondCampus ? leadCampus.potato - secondCampus.potato : 0;

  return (
    <SafeAreaView style={[s.safe, { backgroundColor: themeColors.bg }]}>
      <View style={[s.header, { borderBottomColor: themeColors.bdr }]}>
        <TouchableOpacity 
          style={[s.backBtn, { backgroundColor: themeColors.card2 }]} 
          onPress={() => router.back()}
        >
          <Ionicons name="chevron-back" size={24} color={themeColors.txt} />
        </TouchableOpacity>
        <Text style={[s.headerTitle, { color: themeColors.txt }]}>Leaderboard</Text>
        <View style={{ width: 42 }} />
      </View>
      <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>
        
        {/* Battleground Header */}
        <View style={[s.battleHeader, { backgroundColor: themeColors.card }]}>
          <Text style={s.battleLabel}>CAMPUS WAR: SEASON 1</Text>
          <Text style={[s.battleTitle, { color: themeColors.txt }]}>The Battle for Potato 🥔</Text>
          
          <View style={s.statsGrid}>
            <View style={[s.statBox, { backgroundColor: themeColors.card2 }]}>
              <Text style={[s.statVal, { color: themeColors.ogi }]}>{totalPotato.toLocaleString()}</Text>
              <Text style={[s.statLabel, { color: themeColors.txt3 }]}>TOTAL 🥔</Text>
            </View>
            <View style={[s.statBox, { backgroundColor: themeColors.card2 }]}>
              <Text style={[s.statVal, { color: themeColors.txt }]}>{campusWarData.length}</Text>
              <Text style={[s.statLabel, { color: themeColors.txt3 }]}>CAMPUSES</Text>
            </View>
          </View>
        </View>

        {/* VERSUS SECTION */}
        {leadCampus && secondCampus && (
          <View style={s.vsSection}>
            <View style={s.vsRow}>
              <View style={[s.vsSide, { alignItems: 'flex-end' }]}>
                <Text style={s.vsEmoji}>{getCampusEmoji(leadCampus._id)}</Text>
                <Text style={[s.vsName, { color: getCampusColor(leadCampus._id, themeColors) }]}>{getCampusName(leadCampus._id)}</Text>
                <Text style={[s.vsScore, { color: themeColors.txt }]}>{leadCampus.potato.toLocaleString()}</Text>
              </View>
              
              <View style={s.vsCircle}>
                <Text style={s.vsTxt}>VS</Text>
              </View>

              <View style={[s.vsSide, { alignItems: 'flex-start' }]}>
                <Text style={s.vsEmoji}>{getCampusEmoji(secondCampus._id)}</Text>
                <Text style={[s.vsName, { color: getCampusColor(secondCampus._id, themeColors) }]}>{getCampusName(secondCampus._id)}</Text>
                <Text style={[s.vsScore, { color: themeColors.txt }]}>{secondCampus.potato.toLocaleString()}</Text>
              </View>
            </View>
            
            <View style={[s.gapPill, { backgroundColor: themeColors.card2 }]}>
              <Text style={[s.gapTxt, { color: themeColors.txt2 }]}>
                {getCampusName(leadCampus._id)} is leading by <Text style={{ color: themeColors.ogi, fontWeight: '900' }}>{leadGap.toLocaleString()} 🥔</Text>
              </Text>
            </View>
          </View>
        )}

        {/* RANKINGS */}
        <Text style={[s.sectionHeader, { color: themeColors.txt3 }]}>RANKINGS</Text>
        {sortedCampuses.map((c, i) => {
          const color = getCampusColor(c._id, themeColors);
          return (
            <View key={c._id} style={[s.rankCard, { backgroundColor: themeColors.card, borderColor: themeColors.bdr }]}>
              <Text style={[s.rankNum, i < 3 && { color: '#FACC15' }]}>{getRankLabel(i)}</Text>
              <View style={[s.campusIcon, { backgroundColor: color + '20' }]}>
                <Text style={{ fontSize: 24 }}>{getCampusEmoji(c._id)}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[s.campusName, { color: themeColors.txt }]}>{getCampusName(c._id)}</Text>
                <View style={s.barWrap}>
                  <View style={[s.barBg, { backgroundColor: themeColors.card2 }]}>
                    <View style={[s.barFill, { width: `${Math.min(100, (c.potato / leadCampus.potato) * 100)}%`, backgroundColor: color }]} />
                  </View>
                  <Text style={[s.barVal, { color: themeColors.txt3 }]}>{c.potato.toLocaleString()} 🥔</Text>
                </View>
              </View>
            </View>
          );
        })}

        {/* TOP LEGENDS */}
        <Text style={[s.sectionHeader, { color: themeColors.txt3, marginTop: 32 }]}>TOP LEGENDS 🏆</Text>
        <View style={[s.legendsCard, { backgroundColor: themeColors.card, borderColor: themeColors.bdr }]}>
          {topUsers.map((u: any, i: number) => (
            <View key={u._id} style={[s.legendRow, i < topUsers.length - 1 && { borderBottomWidth: 1, borderBottomColor: themeColors.bdr }]}>
              <Text style={s.legendRank}>{getRankLabel(i)}</Text>
              <View style={[s.legendAv, { backgroundColor: themeColors.card2, borderColor: getCampusColor(u.campus, themeColors) }]}>
                <Text style={{ fontSize: 18 }}>{u.avatar || '👤'}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[s.legendName, { color: themeColors.txt }]}>{u.name}</Text>
                <Text style={[s.legendCampus, { color: getCampusColor(u.campus, themeColors) }]}>{getCampusName(u.campus)}</Text>
              </View>
              <View style={s.legendScore}>
                <Text style={[s.legendScoreVal, { color: themeColors.ogi }]}>{u.potato.toLocaleString()} 🥔</Text>
              </View>
            </View>
          ))}
        </View>

        <View style={s.footer}>
          <Text style={[s.footerTxt, { color: themeColors.txt3 }]}>🔄 Auto-refreshes every 10s</Text>
        </View>

      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1 },
  scroll: { paddingBottom: 100 },
  loadingTxt: { marginTop: 12, fontSize: 14, fontWeight: '600' },
  
  battleHeader: { padding: 24, paddingBottom: 32, borderBottomLeftRadius: 32, borderBottomRightRadius: 32 },
  battleLabel: { fontSize: 10, fontWeight: '900', letterSpacing: 2, color: '#ff6b35', marginBottom: 8 },
  battleTitle: { fontSize: 28, fontWeight: '900', fontFamily: 'Syne_700Bold' },
  statsGrid: { flexDirection: 'row', gap: 12, marginTop: 24 },
  statBox: { flex: 1, padding: 16, borderRadius: 20, alignItems: 'center' },
  statVal: { fontSize: 20, fontWeight: '900', fontFamily: 'Syne_700Bold' },
  statLabel: { fontSize: 9, fontWeight: '800', marginTop: 4 },

  vsSection: { margin: 16, marginTop: -20 },
  vsRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 20 },
  vsSide: { flex: 1 },
  vsEmoji: { fontSize: 44, marginBottom: 8 },
  vsName: { fontSize: 14, fontWeight: '900', textTransform: 'uppercase' },
  vsScore: { fontSize: 20, fontWeight: '900' },
  vsCircle: { width: 50, height: 50, borderRadius: 25, backgroundColor: '#000', borderWidth: 2, borderColor: '#333', alignItems: 'center', justifyContent: 'center', zIndex: 10 },
  vsTxt: { color: '#FFF', fontWeight: '900', fontSize: 16 },
  gapPill: { alignSelf: 'center', marginTop: 20, paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20 },
  gapTxt: { fontSize: 12, fontWeight: '700' },

  sectionHeader: { fontSize: 12, fontWeight: '900', letterSpacing: 1.5, marginHorizontal: 20, marginBottom: 16, marginTop: 24 },
  rankCard: { flexDirection: 'row', alignItems: 'center', padding: 16, marginHorizontal: 16, marginBottom: 12, borderRadius: 24, borderWidth: 1, gap: 16 },
  rankNum: { fontSize: 18, fontWeight: '900', width: 24, textAlign: 'center' },
  campusIcon: { width: 56, height: 56, borderRadius: 28, alignItems: 'center', justifyContent: 'center' },
  campusName: { fontSize: 16, fontWeight: '800', marginBottom: 8 },
  barWrap: { gap: 6 },
  barBg: { height: 6, borderRadius: 3, overflow: 'hidden' },
  barFill: { height: '100%', borderRadius: 3 },
  barVal: { fontSize: 11, fontWeight: '700' },

  legendsCard: { marginHorizontal: 16, borderRadius: 28, borderWidth: 1, overflow: 'hidden' },
  legendRow: { flexDirection: 'row', alignItems: 'center', padding: 16, gap: 12 },
  legendRank: { width: 32, fontSize: 16, textAlign: 'center' },
  legendAv: { width: 44, height: 44, borderRadius: 22, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
  legendName: { fontSize: 15, fontWeight: '800' },
  legendCampus: { fontSize: 11, fontWeight: '700', textTransform: 'uppercase', marginTop: 2 },
  legendScore: { alignItems: 'flex-end' },
  legendScoreVal: { fontSize: 14, fontWeight: '900' },

  footer: { padding: 40, alignItems: 'center' },
  footerTxt: { fontSize: 12, fontWeight: '600' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 0.5,
  },
  backBtn: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontFamily: 'Syne_700Bold',
  },
});
