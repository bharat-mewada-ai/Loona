import { useQuery, useInfiniteQuery } from '@tanstack/react-query';
import { authApi } from '../api/auth.api';
import { postsApi } from '../api/posts.api';

export const useOtherProfile = (userId: string) => {
  return useQuery({
    queryKey: ['profile', userId],
    queryFn: () => authApi.getPublicProfile(userId),
    enabled: !!userId,
  });
};

export const useUserPosts = (userId: string) => {
  return useInfiniteQuery({
    queryKey: ['user-posts', userId],
    queryFn: ({ pageParam = 1 }) => postsApi.getUserPosts(userId, Number(pageParam)),
    getNextPageParam: (lastPage: any) => lastPage.hasMore ? lastPage.page + 1 : undefined,
    initialPageParam: 1,
    enabled: !!userId,
  });
};
