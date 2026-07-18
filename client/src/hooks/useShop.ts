import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Alert } from 'react-native';
import RazorpayCheckout from 'react-native-razorpay';
import { shopApi, CreateListingOrderPayload } from '../api/shop.api';
import { useAuthStore } from '../store/authStore';

// ─── Queries ────────────────────────────────────────────────────────────────

export const useShopListings = (campus?: string, category?: string) => {
  return useQuery({
    queryKey: ['shop', 'listings', campus, category],
    queryFn: () => shopApi.getListings({ campus, category, limit: 30 }),
    staleTime: 1000 * 60 * 2, // 2 minutes
  });
};

export const useMyListings = () => {
  return useQuery({
    queryKey: ['shop', 'my'],
    queryFn: shopApi.getMyListings,
    staleTime: 0,              // always fresh for seller's own listings
    refetchInterval: 30000,    // GAP 7 fix: auto-refresh every 30s
  });
};

export const useBargains = (type: 'sent' | 'received') => {
  return useQuery({
    queryKey: ['shop', 'bargains', type],
    queryFn: () => shopApi.getBargains(type),
    staleTime: 1000 * 30, // 30 seconds
  });
};

// ─── Mutations ──────────────────────────────────────────────────────────────

/**
 * Creates a listing with Razorpay payment for the listing fee.
 * Flow: createListingOrder → Razorpay opens → verifyListingPayment → listing goes live
 */
export const useCreateListing = () => {
  const queryClient = useQueryClient();
  const { user } = useAuthStore();

  return useMutation({
    mutationFn: async (payload: CreateListingOrderPayload) => {
      // Step 1: Create order / list item
      const orderData = await shopApi.createListingOrder(payload);

      // If paid via potato, listing goes live immediately
      if (orderData.paymentMethod === 'potato') {
        return (orderData as any).item;
      }

      // Step 2: Open Razorpay checkout for INR payment
      const feeLabel = payload.wantFeatured
        ? `₹${orderData.feeBreakdown.total} (₹5 listing + ₹15 featured boost)`
        : '₹5 listing fee';

      const razorpayOptions = {
        description: `Loona Campus Shop — ${feeLabel}`,
        image: 'https://loona.app/logo.png',
        currency: orderData.currency || 'INR',
        key: orderData.key,
        amount: orderData.amount,
        name: 'Loona Campus Shop',
        order_id: orderData.orderId,
        prefill: {
          email: user?.email ?? '',
          name: user?.name ?? '',
        },
        theme: { color: '#c8f53a' },
      };

      const paymentResult = await RazorpayCheckout.open(razorpayOptions);

      // Step 3: Verify payment with server
      const result = await shopApi.verifyListingPayment(orderData.itemId, {
        razorpay_order_id: paymentResult.razorpay_order_id,
        razorpay_payment_id: paymentResult.razorpay_payment_id,
        razorpay_signature: paymentResult.razorpay_signature,
      });

      return result.item;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['shop', 'listings'] });
      queryClient.invalidateQueries({ queryKey: ['shop', 'my'] });
      queryClient.invalidateQueries({ queryKey: ['me'] });
    },
    onError: (err: any) => {
      if (err?.code === 'PAYMENT_CANCELLED') return;
      Alert.alert('Payment Failed', err?.description || err?.response?.data?.error || 'Could not complete listing payment. Try again.');
    },
  });
};

export const useDeleteListing = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (itemId: string) => shopApi.deleteListing(itemId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['shop'] });
    },
    onError: () => {
      Alert.alert('Error', 'Could not delete listing.');
    },
  });
};

// GAP 1 fix: Mark listing as sold (seller)
export const useMarkAsSold = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (itemId: string) => shopApi.markAsSold(itemId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['shop', 'listings'] });
      queryClient.invalidateQueries({ queryKey: ['shop', 'my'] });
    },
    onError: (err: any) => {
      Alert.alert('Error', err?.response?.data?.error || 'Could not mark as sold.');
    },
  });
};

// GAP 3 fix: Open in-app chat with seller without a bargain
export const useChatWithSeller = () => {
  return useMutation({
    mutationFn: (itemId: string) => shopApi.chatWithSeller(itemId),
    onError: (err: any) => {
      Alert.alert('Error', err?.response?.data?.error || 'Could not open chat with seller.');
    },
  });
};

export const useCreateBargain = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ itemId, price, message }: { itemId: string; price: number; message?: string }) =>
      shopApi.createBargain(itemId, price, message),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['shop', 'bargains', 'sent'] });
      Alert.alert('Success', 'Bargain request sent to the seller.');
    },
    onError: (err: any) => {
      Alert.alert('Error', err?.response?.data?.error || 'Could not send bargain request.');
    },
  });
};

export const useRespondToBargain = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ bargainId, action }: { bargainId: string; action: 'accept' | 'reject' }) =>
      shopApi.respondToBargain(bargainId, action),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['shop', 'bargains', 'received'] });
      queryClient.invalidateQueries({ queryKey: ['chats'] }); // A new chat might be created
    },
    onError: (err: any) => {
      Alert.alert('Error', err?.response?.data?.error || 'Could not respond to bargain.');
    },
  });
};
