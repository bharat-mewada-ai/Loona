import { useInfiniteQuery, useMutation, useQueryClient, useQuery } from '@tanstack/react-query';
import { Alert } from 'react-native';
import { postsApi } from '../api/posts.api';
import { useUIStore } from '../store/uiStore';
import { useAuthStore } from '../store/authStore';
import { Post, PaginatedPosts } from '../types';

// ─── usePosts — infinite feed ─────────────────────────────────────────────────
export const usePosts = () => {
  const activeCampus = useUIStore((s) => s.activeCampus);
  const user = useAuthStore((s) => s.user);
  const tab = useUIStore((s) => s.activeTab);

  let targetCampus: string | undefined = activeCampus;
  if (activeCampus === 'all') {
    // Mutual Exclusive Sneak In logic:
    // If I am from Oriental (ogi), Sneak In shows LNCT (lnct)
    // If I am from LNCT (lnct), Sneak In shows Oriental (ogi)
    targetCampus = user?.campus === 'ogi' ? 'lnct' : 'ogi';
  }

  return useInfiniteQuery({
    queryKey: ['posts', targetCampus, tab],
    queryFn: ({ pageParam = null }: { pageParam?: string | null }) =>
      postsApi.getFeed({
        campus: targetCampus,
        type: tab === 'all' ? undefined : (tab === 'events' ? 'events,offers,bhandara' : tab),
        cursor: pageParam || undefined,
        limit: 10,
      }),
    getNextPageParam: (last: any) => (last.hasMore ? last.nextCursor : undefined),
    initialPageParam: null,
    staleTime: 30_000,
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
    onMutate: async (id: string) => {
      // Cancel outgoing refetches so they don't overwrite our optimistic update
      await qc.cancelQueries({ queryKey: ['posts'] });
      await qc.cancelQueries({ queryKey: ['post', id] });
      await qc.cancelQueries({ queryKey: ['myPosts'] });
      await qc.cancelQueries({ queryKey: ['savedPosts'] });

      // Optimistic updates for feed lists ('posts')
      qc.setQueriesData({ queryKey: ['posts'] }, (old: any) => {
        if (!old || !old.pages) return old;
        return {
          ...old,
          pages: old.pages.map((page: any) => ({
            ...page,
            posts: page.posts.map((post: any) => {
              if (post._id === id) {
                const currentlyVoted = post.hasVoted;
                return {
                  ...post,
                  hasVoted: !currentlyVoted,
                  upvotes: Math.max(0, post.upvotes + (currentlyVoted ? -1 : 1)),
                };
              }
              return post;
            }),
          })),
        };
      });

      // Optimistic updates for single post detail query ('post', id)
      qc.setQueryData(['post', id], (old: any) => {
        if (!old) return old;
        const currentlyVoted = old.hasVoted;
        return {
          ...old,
          hasVoted: !currentlyVoted,
          upvotes: Math.max(0, old.upvotes + (currentlyVoted ? -1 : 1)),
        };
      });

      // Optimistic updates for 'myPosts' query
      qc.setQueriesData({ queryKey: ['myPosts'] }, (old: any) => {
        if (!old || !old.pages) return old;
        return {
          ...old,
          pages: old.pages.map((page: any) => ({
            ...page,
            posts: page.posts.map((post: any) => {
              if (post._id === id) {
                const currentlyVoted = post.hasVoted;
                return {
                  ...post,
                  hasVoted: !currentlyVoted,
                  upvotes: Math.max(0, post.upvotes + (currentlyVoted ? -1 : 1)),
                };
              }
              return post;
            }),
          })),
        };
      });

      // Optimistic updates for 'savedPosts' query
      qc.setQueryData(['savedPosts'], (old: any) => {
        if (!old || !Array.isArray(old)) return old;
        return old.map((post: any) => {
          if (post._id === id) {
            const currentlyVoted = post.hasVoted;
            return {
              ...post,
              hasVoted: !currentlyVoted,
              upvotes: Math.max(0, post.upvotes + (currentlyVoted ? -1 : 1)),
            };
          }
          return post;
        });
      });
    },
    onError: (_err, id) => {
      // In case of error, invalidating queries is the safest way to restore correctness
      qc.invalidateQueries({ queryKey: ['posts'] });
      qc.invalidateQueries({ queryKey: ['post', id] });
      qc.invalidateQueries({ queryKey: ['myPosts'] });
      qc.invalidateQueries({ queryKey: ['savedPosts'] });
    },
    onSuccess: (_data, id) => {
      // Invalidate queries so that we fetch correct state from server
      qc.invalidateQueries({ queryKey: ['leaderboard'] });
      qc.invalidateQueries({ queryKey: ['me'] });
      qc.invalidateQueries({ queryKey: ['posts'] });
      qc.invalidateQueries({ queryKey: ['post', id] });
      qc.invalidateQueries({ queryKey: ['myPosts'] });
      qc.invalidateQueries({ queryKey: ['savedPosts'] });
    },
  });
};

export const useVoteBhandara = () => {
  const qc = useQueryClient();
  return useMutation<{ bhandaraCountYes: number; bhandaraCountNo: number }, Error, { id: string; vote: 'yes' | 'no' }>({
    mutationFn: ({ id, vote }) =>
      postsApi.voteBhandara(id, vote),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['posts'] });
    },
  });
};

export const useVotePoll = () => {
  const qc = useQueryClient();
  const campus = useUIStore((s) => s.activeCampus);
  const tab = useUIStore((s) => s.activeTab);

  return useMutation({
    mutationFn: ({ id, optionIndex }: { id: string; optionIndex: number }) =>
      postsApi.votePoll(id, optionIndex),
    onMutate: async ({ id, optionIndex }) => {
      const queryKey = ['posts', campus, tab];
      await qc.cancelQueries({ queryKey });
      const previousPosts = qc.getQueryData(queryKey);

      qc.setQueryData(queryKey, (old: { pages: PaginatedPosts[] } | undefined) => {
        if (!old || !old.pages) return old;
        const newPages = old.pages.map((page) => ({
          ...page,
          posts: page.posts.map((post) => {
            if (post._id === id) {
              const newOptions = [...(post.pollOptions || [])];
              if (newOptions[optionIndex]) {
                newOptions[optionIndex] = { ...newOptions[optionIndex], votes: newOptions[optionIndex].votes + 1 };
              }
              return { ...post, userVote: optionIndex, pollOptions: newOptions };
            }
            return post;
          }),
        }));
        return { ...old, pages: newPages };
      });

      return { previousPosts };
    },
    onError: (_err, _vars, context: any) => {
      qc.setQueryData(['posts', campus, tab], context?.previousPosts);
    },
    onSuccess: () => {
      // Optimistic update in onMutate already applied the poll vote to the UI.
      // No feed refetch needed.
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
      // Reactions are instant via haptics — no full feed refetch needed.
      // Leaderboard may update reaction-based potato scores.
      qc.invalidateQueries({ queryKey: ['leaderboard'] });
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
    mutationFn: ({ id, content, image, parentId }: { id: string; content: string; image?: string; parentId?: string }) =>
      postsApi.addComment(id, content, image, parentId),
    onMutate: async (newCommentData) => {
      await qc.cancelQueries({ queryKey: ['comments', newCommentData.id] });
      const previousComments = qc.getQueryData(['comments', newCommentData.id]);
      
      qc.setQueryData(['comments', newCommentData.id], (old: { comments: any[]; total: number; hasMore: boolean } | undefined) => {
        const optimistic = {
          _id: Date.now().toString(),
          postId: newCommentData.id,
          content: newCommentData.content,
          image: newCommentData.image,
          parentId: newCommentData.parentId || null,
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
      qc.invalidateQueries({ queryKey: ['post', id] });
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

export const useDeletePost = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: postsApi.deletePost,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['posts'] });
      qc.invalidateQueries({ queryKey: ['stats'] });
      qc.invalidateQueries({ queryKey: ['leaderboard'] });
    },
    onError: (err: any) => {
      const msg = err.response?.data?.error || err.message || 'Could not delete post';
      Alert.alert('Delete Failed', msg);
    }
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

      qc.setQueryData(queryKey, (old: { pages: PaginatedPosts[] } | undefined) => {
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
            posts: [optimistic as unknown as Post, ...newPages[0].posts],
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
      qc.invalidateQueries({ queryKey: ['me'] });
      // After posting, ensure user is back in their own campus feed to see the post
      const user = useAuthStore.getState().user;
      if (user?.campus) {
        useUIStore.getState().setCampus(user.campus as any);
      }
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

// --- useMyPosts ---
export const useMyPosts = () => {
  return useInfiniteQuery({
    queryKey: ['myPosts'],
    queryFn: ({ pageParam = undefined }: { pageParam?: string }) =>
      postsApi.getMyPosts(pageParam as any),
    getNextPageParam: (last: any) => (last.hasMore ? last.nextCursor : undefined),
    initialPageParam: undefined,
  });
};

// --- usePost (Detail View) ---
export const usePost = (id: string) => {
  return useQuery({
    queryKey: ['post', id],
    queryFn: () => postsApi.getPostById(id),
    enabled: !!id,
  });
};

export const useSavePost = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: postsApi.toggleSave,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['me'] });
      qc.invalidateQueries({ queryKey: ['savedPosts'] });
    },
  });
};

export const useSavedPosts = () => {
  return useQuery({
    queryKey: ['savedPosts'],
    queryFn: postsApi.getSavedPosts,
  });
};

export const useGoing = () => {
  const qc = useQueryClient();
  const campus = useUIStore((s) => s.activeCampus);
  const tab = useUIStore((s) => s.activeTab);

  return useMutation<{ hasGone: boolean; goingCount: number }, Error, string>({
    mutationFn: postsApi.toggleGoing,
    onMutate: async (id) => {
      const queryKey = ['posts', campus, tab];
      await qc.cancelQueries({ queryKey });
      const previousPosts = qc.getQueryData(queryKey);

      qc.setQueryData(queryKey, (old: { pages: PaginatedPosts[] } | undefined) => {
        if (!old || !old.pages) return old;
        const newPages = old.pages.map((page) => ({
          ...page,
          posts: page.posts.map((post) => {
            if (post._id === id) {
              const currentlyGone = post.hasGone;
              return { 
                ...post, 
                hasGone: !currentlyGone, 
                goingCount: Math.max(0, (post.goingCount || 0) + (currentlyGone ? -1 : 1)) 
              };
            }
            return post;
          }),
        }));
        return { ...old, pages: newPages };
      });

      return { previousPosts };
    },
    onError: (_err, _vars, context: any) => {
      qc.setQueryData(['posts', campus, tab], context?.previousPosts);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['posts'] });
    },
  });
};
