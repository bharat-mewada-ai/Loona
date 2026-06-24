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
    staleTime: 0, // always fresh for seller's own listings
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
      // Step 1: Create Razorpay order for listing fee
      const orderData = await shopApi.createListingOrder(payload);

      const feeLabel = payload.wantFeatured
        ? `₹${orderData.feeBreakdown.total} (₹5 listing + ₹15 featured boost)`
        : '₹5 listing fee';

      // Step 2: Open Razorpay checkout
      const razorpayOptions = {
        description: `Loona Campus Shop — ${feeLabel}`,
        image: 'https://loona.app/logo.png',
        currency: orderData.currency,
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
    },
    onError: (err: any) => {
      // Razorpay throws a specific error when user cancels
      if (err?.code === 'PAYMENT_CANCELLED') return;
      Alert.alert('Payment Failed', err?.description || 'Could not complete listing payment. Try again.');
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
