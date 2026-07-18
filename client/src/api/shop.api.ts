import client from './client';
import type { ShopItem, ShopCategory, User } from '../types';

export interface Bargain {
  _id: string;
  shopItemId: ShopItem;
  buyerId: User;
  sellerId: User;
  price: number;
  message: string;
  status: 'pending' | 'accepted' | 'rejected';
  chatId?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateListingOrderPayload {
  title: string;
  description: string;
  price: number;
  category: ShopCategory;
  sellerUpi: string;
  sellerContact: string;
  wantFeatured: boolean;
  paymentMethod: 'potato' | 'razorpay';
  image?: string;
  images?: string[];
}

export interface CreateListingOrderResponse {
  itemId: string;
  orderId?: string;
  amount?: number;
  currency?: string;
  key?: string;
  feeBreakdown: {
    listingFee: number;
    boostFee: number;
    total: number;
  };
  paymentMethod: 'potato' | 'razorpay';
}

export interface PaginatedShopItems {
  items: ShopItem[];
  total: number;
  page: number;
  hasMore: boolean;
}

export const shopApi = {
  getListings: async (params: {
    campus?: string;
    category?: string;
    page?: number;
    limit?: number;
  }): Promise<PaginatedShopItems> => {
    const { data } = await client.get<PaginatedShopItems>('/shop', { params });
    return data;
  },

  getMyListings: async (): Promise<ShopItem[]> => {
    const { data } = await client.get<ShopItem[]>('/shop/my');
    return data;
  },

  createListingOrder: async (
    payload: CreateListingOrderPayload
  ): Promise<CreateListingOrderResponse> => {
    const { data } = await client.post<CreateListingOrderResponse>('/shop/create-order', payload);
    return data;
  },

  verifyListingPayment: async (
    itemId: string,
    payload: {
      razorpay_order_id: string;
      razorpay_payment_id: string;
      razorpay_signature: string;
    }
  ): Promise<{ success: boolean; item: ShopItem }> => {
    const { data } = await client.post(`/shop/${itemId}/verify-listing`, payload);
    return data;
  },

  deleteListing: async (itemId: string): Promise<void> => {
    await client.delete(`/shop/${itemId}`);
  },

  markAsSold: async (itemId: string): Promise<ShopItem> => {
    const { data } = await client.patch<{ item: ShopItem }>(`/shop/${itemId}/mark-sold`);
    return data.item;
  },

  chatWithSeller: async (itemId: string): Promise<{ chatId: string }> => {
    const { data } = await client.post<{ chatId: string }>(`/shop/${itemId}/contact`);
    return data;
  },

  createBargain: async (itemId: string, price: number, message?: string): Promise<Bargain> => {
    const { data } = await client.post<Bargain>(`/shop/${itemId}/bargain`, { price, message });
    return data;
  },

  getBargains: async (type: 'sent' | 'received'): Promise<Bargain[]> => {
    const { data } = await client.get<Bargain[]>('/shop/bargains', { params: { type } });
    return data;
  },

  respondToBargain: async (bargainId: string, action: 'accept' | 'reject'): Promise<Bargain> => {
    const { data } = await client.post<Bargain>(`/shop/bargains/${bargainId}/respond`, { action });
    return data;
  },
};
