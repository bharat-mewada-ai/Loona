import React, { useState } from 'react';
import {
  View, Text, StyleSheet, SafeAreaView, TouchableOpacity, 
  ScrollView, ActivityIndicator, Alert, Image, Dimensions
} from 'react-native';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { getColors } from '../src/theme/colors';
import { useUIStore } from '../src/store/uiStore';
import { useAuthStore } from '../src/store/authStore';
import client from '../src/api/client';
import RazorpayCheckout from 'react-native-razorpay';

const { width } = Dimensions.get('window');

export default function PremiumScreen() {
  const router = useRouter();
  const { isDark } = useUIStore();
  const { user, setUser } = useAuthStore();
  const themeColors = getColors(isDark);
  const [loading, setLoading] = useState(false);

  const perks = [
    { id: 'badge', title: 'Golden Badge', desc: 'A special golden "Pro" badge on your profile and posts.', icon: 'diamond' },
    { id: 'visibility', title: 'High Priority', desc: 'Your posts stay trending longer and get more visibility.', icon: 'trending-up' },
    { id: 'identity', title: 'Exclusive Avatars', desc: 'Unlock 50+ premium emoji avatars and custom themes.', icon: 'color-palette' },
    { id: 'anon', title: 'Secret Confessions', desc: 'Post up to 5 anonymous confessions daily.', icon: 'mask' },
  ];

  const handleSubscribe = async () => {
    setLoading(true);
    try {
      // 1. Create Order on Backend
      const { data: orderData } = await client.post('/payments/create-order', {
        amount: 199, // ₹199
        planId: 'pro_monthly'
      });

      // 2. Open Razorpay Checkout
      const options = {
        description: 'Loona Pro Monthly Subscription',
        image: 'https://loona.app/logo.png', // Placeholder
        currency: orderData.currency,
        key: orderData.key,
        amount: orderData.amount,
        name: 'Loona',
        order_id: orderData.orderId,
        prefill: {
          email: user?.email,
          contact: '',
          name: user?.name
        },
        theme: { color: '#c8f53a' }
      };

      RazorpayCheckout.open(options).then(async (data: any) => {
        // 3. Verify Payment on Backend
        try {
          const { data: verifyData } = await client.post('/payments/verify', {
            razorpay_order_id: data.razorpay_order_id,
            razorpay_payment_id: data.razorpay_payment_id,
            razorpay_signature: data.razorpay_signature,
            planDays: 30
          });

          if (verifyData.success) {
            // Update local user state
            setUser({ 
              ...user!, 
              isPremium: true, 
              premiumExpiresAt: verifyData.premiumExpiresAt 
            });
            Alert.alert('Success!', 'Welcome to Loona Pro! 💎');
            router.back();
          }
        } catch (err: any) {
          Alert.alert('Verification Failed', 'Something went wrong while verifying your payment.');
        }
      }).catch((error: any) => {
        // Handle checkout failure
        console.log(`Error: ${error.code} | ${error.description}`);
        Alert.alert('Payment Cancelled', 'You can try again whenever you want.');
      });

    } catch (error: any) {
      console.error(error);
      Alert.alert('Error', 'Could not initialize payment.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: themeColors.bg }}>
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Header Section */}
        <LinearGradient
          colors={['#c8f53a', '#a6d42d']}
          style={s.header}
        >
          <TouchableOpacity onPress={() => router.back()} style={s.backBtn}>
            <Ionicons name="close" size={28} color="#000" />
          </TouchableOpacity>
          <View style={s.headerContent}>
            <View style={s.crownIcon}>
              <Ionicons name="ribbon" size={60} color="#000" />
            </View>
            <Text style={s.headerTitle}>Loona Pro</Text>
            <Text style={s.headerSubtitle}>Elevate your campus experience</Text>
          </View>
        </LinearGradient>

        <View style={s.content}>
          <Text style={[s.sectionTitle, { color: themeColors.txt }]}>PRO PERKS</Text>
          
          {perks.map((perk) => (
            <View key={perk.id} style={[s.perkCard, { backgroundColor: themeColors.card }]}>
              <View style={[s.perkIcon, { backgroundColor: themeColors.bg2 }]}>
                <Ionicons name={perk.icon as any} size={24} color={themeColors.ogi} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[s.perkTitle, { color: themeColors.txt }]}>{perk.title}</Text>
                <Text style={[s.perkDesc, { color: themeColors.txt3 }]}>{perk.desc}</Text>
              </View>
            </View>
          ))}

          {/* Pricing Section */}
          <View style={[s.pricingCard, { backgroundColor: themeColors.card, borderColor: themeColors.ogi }]}>
            <View style={s.priceHeader}>
              <Text style={[s.planName, { color: themeColors.txt }]}>Monthly Plan</Text>
              <View style={s.badge}>
                <Text style={s.badgeText}>POPULAR</Text>
              </View>
            </View>
            <View style={s.priceRow}>
              <Text style={[s.price, { color: themeColors.txt }]}>₹199</Text>
              <Text style={[s.period, { color: themeColors.txt3 }]}>/month</Text>
            </View>
            <Text style={[s.priceNote, { color: themeColors.txt3 }]}>Cancel anytime. No questions asked.</Text>
          </View>

          <TouchableOpacity 
            style={[s.subscribeBtn, { backgroundColor: themeColors.ogi }]} 
            onPress={handleSubscribe}
            disabled={loading || user?.isPremium}
          >
            {loading ? (
              <ActivityIndicator color="#000" />
            ) : (
              <Text style={s.subscribeBtnText}>
                {user?.isPremium ? 'Currently Active 💎' : 'Upgrade to Pro'}
              </Text>
            )}
          </TouchableOpacity>
          
          <Text style={[s.footerNote, { color: themeColors.txt3 }]}>
            Secured by Razorpay. All transactions are encrypted.
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  header: {
    height: 300,
    borderBottomLeftRadius: 40,
    borderBottomRightRadius: 40,
    padding: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  backBtn: {
    position: 'absolute',
    top: 50,
    left: 20,
    zIndex: 10,
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.3)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerContent: {
    alignItems: 'center',
    marginTop: 20,
  },
  crownIcon: {
    marginBottom: 10,
  },
  headerTitle: {
    fontSize: 42,
    fontWeight: '900',
    fontFamily: 'Syne_700Bold',
    color: '#000',
    letterSpacing: -1,
  },
  headerSubtitle: {
    fontSize: 16,
    color: 'rgba(0,0,0,0.6)',
    fontWeight: '600',
  },
  content: {
    padding: 24,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '800',
    letterSpacing: 2,
    marginBottom: 20,
    opacity: 0.6,
  },
  perkCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 20,
    marginBottom: 12,
    gap: 16,
  },
  perkIcon: {
    width: 48,
    height: 48,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  perkTitle: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 4,
  },
  perkDesc: {
    fontSize: 13,
    lineHeight: 18,
  },
  pricingCard: {
    marginTop: 20,
    padding: 24,
    borderRadius: 28,
    borderWidth: 2,
  },
  priceHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  planName: {
    fontSize: 18,
    fontWeight: '800',
  },
  badge: {
    backgroundColor: '#000',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
  },
  badgeText: {
    color: '#c8f53a',
    fontSize: 10,
    fontWeight: '900',
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginBottom: 8,
  },
  price: {
    fontSize: 36,
    fontWeight: '900',
  },
  period: {
    fontSize: 18,
    fontWeight: '600',
    marginLeft: 4,
  },
  priceNote: {
    fontSize: 12,
    opacity: 0.8,
  },
  subscribeBtn: {
    height: 64,
    borderRadius: 32,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 30,
    shadowColor: '#c8f53a',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 10,
  },
  subscribeBtnText: {
    fontSize: 18,
    fontWeight: '800',
    color: '#000',
  },
  footerNote: {
    textAlign: 'center',
    fontSize: 11,
    marginTop: 20,
    opacity: 0.5,
  },
});
