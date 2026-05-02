import { useInfiniteQuery, useMutation, useQueryClient, useQuery } from '@tanstack/react-query';
import { postsApi } from '../api/posts.api';
import { useUIStore } from '../store/uiStore';

// ─── usePosts — infinite feed ─────────────────────────────────────────────────
export const usePosts = () => {
  const campus = useUIStore((s) => s.activeCampus);
  const tab = useUIStore((s) => s.activeTab);

  return useInfiniteQuery({
    queryKey: ['posts', campus, tab],
    queryFn: ({ pageParam = 1 }: { pageParam?: number }) =>
      postsApi.getFeed({
        campus: campus === 'all' ? undefined : campus,
        type: tab === 'all' ? undefined : tab,
        page: pageParam as number,
        limit: 10,
      }),
    getNextPageParam: (last: any) => (last.hasMore ? last.page + 1 : undefined),
    initialPageParam: 1,
  });
};

// ─── useStats ─────────────────────────────────────────────────────────────────
export const useStats = () => {
  return useQuery({
    queryKey: ['stats'],
    queryFn: postsApi.getStats,
    refetchInterval: 30_000,
  });
};

// ─── useVote ──────────────────────────────────────────────────────────────────
export const useVote = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: postsApi.vote,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['posts'] });
      qc.invalidateQueries({ queryKey: ['leaderboard'] });
      qc.invalidateQueries({ queryKey: ['me'] });
    },
  });
};

export const useVoteBhandara = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, vote }: { id: string; vote: 'yes' | 'no' }) =>
      postsApi.voteBhandara(id, vote),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['posts'] });
    },
  });
};

// ─── useReact ─────────────────────────────────────────────────────────────────
export const useReact = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, reaction }: { id: string; reaction: string }) =>
      postsApi.react(id, reaction),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['posts'] });
      qc.invalidateQueries({ queryKey: ['leaderboard'] });
      qc.invalidateQueries({ queryKey: ['me'] });
    },
  });
};

// ─── useComments ─────────────────────────────────────────────────────────────
export const useComments = (postId: string) => {
  return useQuery({
    queryKey: ['comments', postId],
    queryFn: () => postsApi.getComments(postId),
    enabled: !!postId,
  });
};

// ─── useAddComment (with optimistic update) ───────────────────────────────────
export const useAddComment = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, content, image }: { id: string; content: string; image?: string }) =>
      postsApi.addComment(id, content, image),
    onMutate: async (newCommentData) => {
      await qc.cancelQueries({ queryKey: ['comments', newCommentData.id] });
      const previousComments = qc.getQueryData(['comments', newCommentData.id]);
      
      qc.setQueryData(['comments', newCommentData.id], (old: any) => {
        const optimistic = {
          _id: Date.now().toString(),
          postId: newCommentData.id,
          content: newCommentData.content,
          image: newCommentData.image,
          anonName: 'You',
          anonAvatar: '👤',
          createdAt: new Date().toISOString(),
          isOptimistic: true,
        };

        if (old && Array.isArray(old.comments)) {
          return {
            ...old,
            comments: [optimistic, ...old.comments],
            total: (old.total || 0) + 1,
          };
        }
        return { comments: [optimistic], total: 1, hasMore: false };
      });
      
      return { previousComments };
    },
    onError: (_err, newCommentData, context: any) => {
      qc.setQueryData(['comments', newCommentData.id], context?.previousComments);
    },
    onSettled: (_data, _err, { id }) => {
      qc.invalidateQueries({ queryKey: ['comments', id] });
      qc.invalidateQueries({ queryKey: ['posts'] });
    },
  });
};

// ─── useDeleteComment ─────────────────────────────────────────────────────────
export const useDeleteComment = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ postId, commentId }: { postId: string; commentId: string }) =>
      postsApi.deleteComment(postId, commentId),
    onSuccess: (_data, { postId }) => {
      qc.invalidateQueries({ queryKey: ['comments', postId] });
      qc.invalidateQueries({ queryKey: ['posts'] });
    },
  });
};

// ─── useCreatePost (with optimistic update) ───────────────────────────────────
export const useCreatePost = () => {
  const qc = useQueryClient();
  const campus = useUIStore((s) => s.activeCampus);
  const tab = useUIStore((s) => s.activeTab);

  return useMutation({
    mutationFn: postsApi.createPost,
    onMutate: async (newPost) => {
      const queryKey = ['posts', campus, tab];
      await qc.cancelQueries({ queryKey });
      const previousPosts = qc.getQueryData(queryKey);

      qc.setQueryData(queryKey, (old: any) => {
        if (!old || !old.pages) return old;
        const optimistic = {
          ...newPost,
          _id: Date.now().toString(),
          createdAt: new Date().toISOString(),
          upvotes: 0,
          commentCount: 0,
          reactions: {},
          isOptimistic: true,
          anonName: 'You',
          anonAvatar: '👤',
        };

        const newPages = [...old.pages];
        if (newPages[0]) {
          newPages[0] = {
            ...newPages[0],
            posts: [optimistic, ...newPages[0].posts],
          };
        }
        return { ...old, pages: newPages };
      });

      return { previousPosts };
    },
    onError: (_err, _vars, context: any) => {
      qc.setQueryData(['posts', campus, tab], context?.previousPosts);
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: ['posts'], exact: false });
      qc.invalidateQueries({ queryKey: ['stats'] });
    },
  });
};

// ─── useReport ────────────────────────────────────────────────────────────────
export const useReport = () => {
  return useMutation({
    mutationFn: ({ id, reason }: { id: string; reason: string }) =>
      postsApi.report(id, reason),
  });
};
// --- useMyPosts - dedicated /mine endpoint, not a feed filter ---
export const useMyPosts = () => {
  return useInfiniteQuery({
    queryKey: ['myPosts'],
    queryFn: ({ pageParam = 1 }: { pageParam?: number }) =>
      postsApi.getMyPosts(pageParam as number),
    getNextPageParam: (last: any) => (last.hasMore ? last.page + 1 : undefined),
    initialPageParam: 1,
  });
};
