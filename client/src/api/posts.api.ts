import client from './client';
import type { Post, PaginatedPosts } from '../types';

export interface CreatePostDto {
  title?: string;
  body?: string;
  campus: string;
  type: string;
  burnAfter24h?: boolean;
  image?: string;
  images?: string[];    // Multiple images
  eventDate?: string;
  eventLocation?: string;
  location?: {
    type: "Point";
    coordinates: [number, number]; // [lon, lat]
  };
  isPoll?: boolean;
  pollOptions?: string[];
  offerBrand?: string;
  isExclusive?: boolean;
  offerDiscount?: string;
  externalLink?: string;
  songName?: string;    // Music sticker — song name
  songArtist?: string;  // Music sticker — artist name
  songAudioUrl?: string;// Audio preview URL (MP3)
  songCoverUrl?: string;// Album cover URL
}

export const postsApi = {
  // ── Feed ────────────────────────────────────────────────────────────────────
  getFeed: async (params: {
    campus?: string;
    type?: string;
    page?: number;
    cursor?: string;
    limit?: number;
  }): Promise<PaginatedPosts> => {
    const { data } = await client.get<PaginatedPosts>('/posts', { params });
    return data;
  },

  // ── Single post ─────────────────────────────────────────────────────────────
  getPost: async (id: string): Promise<Post> => {
    const { data } = await client.get<Post>(`/posts/${id}`);
    return data;
  },

  // Alias expected by some hooks
  getPostById: async (id: string): Promise<Post> => {
    const { data } = await client.get<Post>(`/posts/${id}`);
    return data;
  },

  // ── Stats ───────────────────────────────────────────────────────────────────
  getStats: async (): Promise<{
    totalPosts: number;
    todayPosts: number;
    campusBreakdown: { _id: string; count: number }[];
  }> => {
    const { data } = await client.get('/posts/stats');
    return data;
  },

  getTrendingTags: async (): Promise<{ tag: string; count: number }[]> => {
    const { data } = await client.get<{ tag: string; count: number }[]>('/posts/trending-tags');
    return data;
  },

  // ── Create ──────────────────────────────────────────────────────────────────
  createPost: async (payload: CreatePostDto): Promise<Post> => {
    const { data } = await client.post<Post>('/posts', payload);
    return data;
  },

  viewPost: async (id: string): Promise<{ views: number }> => {
    const { data } = await client.post<{ views: number }>(`/posts/${id}/view`);
    return data;
  },

  // ── Delete post ─────────────────────────────────────────────────────────────
  deletePost: async (id: string): Promise<void> => {
    await client.delete(`/posts/${id}`);
  },

  // ── Vote ────────────────────────────────────────────────────────────────────
  vote: async (id: string): Promise<{ upvotes: number; hasVoted: boolean; score: number; voterPotato?: number }> => {
    const { data } = await client.post<{ upvotes: number; hasVoted: boolean; score: number; voterPotato?: number }>(`/posts/${id}/vote`);
    return data;
  },
  voteBhandara: async (id: string, vote: 'yes' | 'no'): Promise<any> => {
    const { data } = await client.post(`/posts/${id}/bhandara-vote`, { vote });
    return data;
  },
  votePoll: async (id: string, optionIndex: number): Promise<any> => {
    const { data } = await client.post(`/posts/${id}/poll-vote`, { optionIndex });
    return data;
  },

  // ── React ───────────────────────────────────────────────────────────────────
  react: async (
    id: string,
    reaction: string
  ): Promise<{ reactions: Record<string, number> }> => {
    const { data } = await client.post<{ reactions: Record<string, number> }>(
      `/posts/${id}/react`,
      { reaction }
    );
    return data;
  },

  // ── Report ──────────────────────────────────────────────────────────────────
  report: async (id: string, reason: string): Promise<void> => {
    await client.post(`/posts/${id}/report`, { reason });
  },

  // ── Comments ────────────────────────────────────────────────────────────────
  addComment: async (id: string, content: string, image?: string, parentId?: string): Promise<any> => {
    const { data } = await client.post(`/posts/${id}/comments`, { content, image, parentId });
    return data;
  },

  getComments: async (
    id: string,
    page = 1
  ): Promise<{ comments: any[]; total: number; hasMore: boolean }> => {
    const { data } = await client.get<{ comments: any[]; total: number; hasMore: boolean }>(`/posts/${id}/comments`, { params: { page } });
    return data;
  },

  deleteComment: async (postId: string, commentId: string): Promise<void> => {
    await client.delete(`/posts/${postId}/comments/${commentId}`);
  },

  // ── My posts ──────────────────────────────────────────────────────────────
  getMyPosts: async (cursor?: string): Promise<PaginatedPosts> => {
    const { data } = await client.get<PaginatedPosts>('/posts/mine', { params: { cursor } });
    return data;
  },

  getUserPosts: async (userId: string, cursor?: string): Promise<PaginatedPosts> => {
    const { data } = await client.get<PaginatedPosts>(`/posts/user/${userId}`, { params: { cursor } });
    return data;
  },
  
  toggleSave: async (id: string): Promise<{ saved: boolean }> => {
    const { data } = await client.post<{ saved: boolean }>(`/posts/${id}/save`);
    return data;
  },
  
  getSavedPosts: async (): Promise<Post[]> => {
    const { data } = await client.get<Post[]>('/posts/saved');
    return data;
  },

  toggleGoing: async (id: string): Promise<{ hasGone: boolean; goingCount: number }> => {
    const { data } = await client.post<{ hasGone: boolean; goingCount: number }>(`/posts/${id}/going`);
    return data;
  },
};