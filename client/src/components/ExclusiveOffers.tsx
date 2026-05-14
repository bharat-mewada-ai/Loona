import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { getColors } from '../theme/colors';
import { useUIStore } from '../store/uiStore';
import { Post } from '../types';
import { triggerHaptic } from '../utils/haptics';

interface Props {
  posts: Post[];
}

export default function ExclusiveOffers({ posts }: Props) {
  const isDark = useUIStore(s => s.isDark);
  const themeColors = getColors(isDark);
  const openComposeSheet = useUIStore(s => s.openComposeSheet);

  const offers = posts.filter(p => p.type === 'offers');

  const handleAddOffer = () => {
    triggerHaptic('impact');
    openComposeSheet('offers');
  };

  return (
    <View style={s.container}>
      <View style={s.header}>
        <View style={s.line} />
        <Text style={[s.title, { color: themeColors.txt3 }]}>EXCLUSIVE OFFERS</Text>
        <TouchableOpacity style={s.addBtn} onPress={handleAddOffer}>
          <Ionicons name="add-circle" size={24} color="#c8f53a" />
          <Text style={s.addTxt}>Add Your Offer</Text>
        </TouchableOpacity>
        <View style={s.line} />
      </View>

      {offers.length === 0 ? (
        <View style={[s.emptyState, { backgroundColor: themeColors.card2 }]}>
          <Text style={[s.emptyTxt, { color: themeColors.txt3 }]}>No community offers yet. Be the first!</Text>
        </View>
      ) : (
        offers.map(offer => (
          <View key={offer._id} style={[s.card, { backgroundColor: themeColors.card, borderColor: themeColors.bdr }]}>
            <View style={[s.emojiCircle, { backgroundColor: themeColors.card2 }]}>
              <Text style={{ fontSize: 24 }}>💳</Text>
            </View>
            
            <View style={s.info}>
              <Text style={[s.brand, { color: themeColors.txt }]}>{offer.offerBrand}</Text>
              <Text style={[s.desc, { color: themeColors.txt2 }]} numberOfLines={2}>{offer.title}</Text>
              {offer.isExclusive && (
                <View style={[s.badge, { backgroundColor: '#c8f53a' }]}>
                  <Text style={s.badgeTxt}>LOONA EXCLUSIVE</Text>
                </View>
              )}
            </View>

            <View style={s.right}>
              <Text style={[s.discount, { color: '#c8f53a' }]}>{offer.offerDiscount || 'DEAL'}</Text>
              <Text style={[s.off, { color: '#c8f53a' }]}>OFF</Text>
            </View>
          </View>
        ))
      )}
    </View>
  );
}

const s = StyleSheet.create({
  container: { marginTop: 30, paddingHorizontal: 16 },
  header: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 20 },
  line: { flex: 1, height: 1, backgroundColor: 'rgba(255,255,255,0.05)' },
  title: { fontSize: 10, fontWeight: '900', letterSpacing: 1 },
  addBtn: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  addTxt: { color: '#c8f53a', fontSize: 11, fontWeight: '900' },
  emptyState: { padding: 30, borderRadius: 24, alignItems: 'center', justifyContent: 'center' },
  emptyTxt: { fontSize: 13, fontWeight: '600', textAlign: 'center' },
  card: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    padding: 16, 
    borderRadius: 24, 
    borderWidth: 1, 
    marginBottom: 12,
    gap: 16
  },
  emojiCircle: { width: 60, height: 60, borderRadius: 30, alignItems: 'center', justifyContent: 'center' },
  info: { flex: 1, gap: 4 },
  brand: { fontSize: 16, fontWeight: '900' },
  desc: { fontSize: 12, lineHeight: 16 },
  badge: { alignSelf: 'flex-start', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6, marginTop: 4 },
  badgeTxt: { color: '#000', fontSize: 9, fontWeight: '900' },
  right: { alignItems: 'center' },
  discount: { fontSize: 24, fontWeight: '900', lineHeight: 24 },
  off: { fontSize: 12, fontWeight: '900', marginTop: -2 }
});
