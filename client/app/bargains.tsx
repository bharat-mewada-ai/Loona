import React, { useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, FlatList,
  ActivityIndicator, Image, Alert
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { getColors } from '../src/theme/colors';
import { useUIStore } from '../src/store/uiStore';
import { useAuthStore } from '../src/store/authStore';
import { useBargains, useRespondToBargain } from '../src/hooks/useShop';
import { Bargain } from '../src/api/shop.api';

const LIME = '#c8f53a';

export default function BargainsScreen() {
  const router = useRouter();
  const isDark = useUIStore(s => s.isDark);
  const themeColors = getColors(isDark);
  const { user } = useAuthStore();

  const [activeTab, setActiveTab] = useState<'received' | 'sent'>('received');

  const { data: receivedData, isLoading: loadingReceived, refetch: refetchReceived } = useBargains('received');
  const { data: sentData, isLoading: loadingSent, refetch: refetchSent } = useBargains('sent');

  const { mutate: respond, isPending: responding } = useRespondToBargain();

  const handleRespond = (bargain: Bargain, action: 'accept' | 'reject') => {
    Alert.alert(
      `${action === 'accept' ? 'Accept' : 'Reject'} Offer`,
      `Are you sure you want to ${action} this offer of ₹${bargain.price} for "${bargain.shopItemId.title}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: action === 'accept' ? 'Accept' : 'Reject',
          style: action === 'reject' ? 'destructive' : 'default',
          onPress: () => respond({ bargainId: bargain._id, action })
        }
      ]
    );
  };

  const renderItem = ({ item }: { item: Bargain }) => {
    const isSent = activeTab === 'sent';
    const statusColor = item.status === 'accepted' ? '#34C759' : item.status === 'rejected' ? '#FF3B30' : '#FF9500';

    return (
      <View style={[s.card, { backgroundColor: themeColors.card, borderColor: themeColors.bdr }]}>
        <View style={s.itemHeader}>
          {item.shopItemId.image ? (
            <Image source={{ uri: item.shopItemId.image }} style={s.itemImage} />
          ) : (
            <View style={[s.itemImage, { backgroundColor: themeColors.card2, justifyContent: 'center', alignItems: 'center' }]}>
              <Ionicons name="image-outline" size={24} color={themeColors.txt3} />
            </View>
          )}
          <View style={{ flex: 1 }}>
            <Text style={[s.itemTitle, { color: themeColors.txt }]} numberOfLines={1}>
              {item.shopItemId.title}
            </Text>
            <Text style={{ color: themeColors.txt3, fontSize: 12 }}>
              Listed at ₹{item.shopItemId.price}
            </Text>
          </View>
          <View style={[s.statusBadge, { backgroundColor: statusColor + '20' }]}>
            <Text style={{ color: statusColor, fontSize: 10, fontWeight: '800' }}>
              {item.status.toUpperCase()}
            </Text>
          </View>
        </View>

        <View style={[s.offerDetails, { backgroundColor: themeColors.bg }]}>
          <Text style={{ color: themeColors.txt2, fontSize: 14 }}>
            {isSent ? 'You offered:' : `${item.buyerId.name} offered:`} <Text style={{ color: LIME, fontWeight: '800', fontSize: 16 }}>₹{item.price}</Text>
          </Text>
          {!!item.message && (
            <Text style={{ color: themeColors.txt3, fontSize: 13, marginTop: 4, fontStyle: 'italic' }}>
              "{item.message}"
            </Text>
          )}
        </View>

        {/* Received Pending Actions */}
        {!isSent && item.status === 'pending' && (
          <View style={s.actionRow}>
            <TouchableOpacity 
              style={[s.actionBtn, { backgroundColor: '#FF3B3015', borderColor: '#FF3B30' }]}
              onPress={() => handleRespond(item, 'reject')}
              disabled={responding}
            >
              <Text style={{ color: '#FF3B30', fontWeight: '700' }}>Reject</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={[s.actionBtn, { backgroundColor: LIME, borderColor: LIME }]}
              onPress={() => handleRespond(item, 'accept')}
              disabled={responding}
            >
              <Text style={{ color: '#000', fontWeight: '700' }}>Accept Offer</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Accepted Action - Chat */}
        {item.status === 'accepted' && item.chatId && (
          <TouchableOpacity
            style={[s.chatBtn, { backgroundColor: themeColors.card2, borderColor: LIME }]}
            onPress={() => router.push(`/chat/${item.chatId}`)}
          >
            <Ionicons name="chatbubbles" size={18} color={LIME} />
            <Text style={{ color: LIME, fontWeight: '700', marginLeft: 8 }}>Go to Chat</Text>
          </TouchableOpacity>
        )}
      </View>
    );
  };

  const isLoading = activeTab === 'received' ? loadingReceived : loadingSent;
  const data = activeTab === 'received' ? receivedData : sentData;

  return (
    <SafeAreaView style={[s.safe, { backgroundColor: isDark ? '#0a0a0f' : themeColors.bg }]}>
      {/* Header */}
      <View style={s.header}>
        <TouchableOpacity onPress={() => router.back()} style={s.backBtn}>
          <Ionicons name="chevron-back" size={26} color={themeColors.txt} />
        </TouchableOpacity>
        <Text style={[s.headerTitle, { color: themeColors.txt }]}>Bargains</Text>
        <View style={{ width: 40 }} />
      </View>

      {/* Tabs */}
      <View style={[s.toggleRow, { backgroundColor: themeColors.card2 }]}>
        <TouchableOpacity
          style={[s.toggleBtn, activeTab === 'received' && { backgroundColor: themeColors.bg }]}
          onPress={() => setActiveTab('received')}
        >
          <Text style={[s.toggleTxt, { color: activeTab === 'received' ? themeColors.txt : themeColors.txt3 }]}>
            Received Offers
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[s.toggleBtn, activeTab === 'sent' && { backgroundColor: themeColors.bg }]}
          onPress={() => setActiveTab('sent')}
        >
          <Text style={[s.toggleTxt, { color: activeTab === 'sent' ? themeColors.txt : themeColors.txt3 }]}>
            Sent Offers
          </Text>
        </TouchableOpacity>
      </View>

      {isLoading ? (
        <ActivityIndicator color={LIME} style={{ marginTop: 40 }} />
      ) : !data || data.length === 0 ? (
        <View style={s.empty}>
          <Text style={{ fontSize: 48 }}>🤝</Text>
          <Text style={[s.emptyTxt, { color: themeColors.txt3 }]}>
            No {activeTab} bargains yet
          </Text>
        </View>
      ) : (
        <FlatList
          data={data}
          keyExtractor={i => i._id}
          renderItem={renderItem}
          contentContainerStyle={{ padding: 16, gap: 16 }}
          refreshing={isLoading}
          onRefresh={activeTab === 'received' ? refetchReceived : refetchSent}
        />
      )}
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1 },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 12,
  },
  backBtn: {
    width: 40, height: 40, borderRadius: 20,
    alignItems: 'center', justifyContent: 'center',
  },
  headerTitle: { fontSize: 20, fontWeight: '800' },
  toggleRow: {
    flexDirection: 'row', padding: 4, marginHorizontal: 16,
    borderRadius: 12, marginBottom: 12,
  },
  toggleBtn: {
    flex: 1, paddingVertical: 10, borderRadius: 10,
    alignItems: 'center',
  },
  toggleTxt: { fontWeight: '700', fontSize: 14 },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', opacity: 0.7 },
  emptyTxt: { fontSize: 16, marginTop: 12, fontWeight: '600' },
  
  card: {
    borderRadius: 16, borderWidth: 1, padding: 16, gap: 12
  },
  itemHeader: {
    flexDirection: 'row', alignItems: 'center', gap: 12
  },
  itemImage: {
    width: 48, height: 48, borderRadius: 8,
  },
  itemTitle: {
    fontSize: 16, fontWeight: '700', marginBottom: 2
  },
  statusBadge: {
    paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8,
  },
  offerDetails: {
    padding: 12, borderRadius: 12,
  },
  actionRow: {
    flexDirection: 'row', gap: 12, marginTop: 4
  },
  actionBtn: {
    flex: 1, paddingVertical: 12, borderRadius: 12, borderWidth: 1,
    alignItems: 'center', justifyContent: 'center'
  },
  chatBtn: {
    flexDirection: 'row', paddingVertical: 12, borderRadius: 12, borderWidth: 1,
    alignItems: 'center', justifyContent: 'center', marginTop: 4
  }
});
