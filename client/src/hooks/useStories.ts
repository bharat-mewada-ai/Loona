import { useInfiniteQuery } from '@tanstack/react-query';
import { postsApi } from '../api/posts.api';
import { useUIStore } from '../store/uiStore';
import { useAuthStore } from '../store/authStore';
import { PaginatedPosts } from '../types';

export const useStories = () => {
  const activeCampus = useUIStore((s) => s.activeCampus);
  const user = useAuthStore((s) => s.user);

  let targetCampus: string | undefined = activeCampus;
  if (activeCampus === 'all') {
    targetCampus = user?.campus === 'ogi' ? 'lnct' : 'ogi';
  }

  return useInfiniteQuery({
    queryKey: ['stories', targetCampus],
    queryFn: ({ pageParam = 1 }: { pageParam?: number }) =>
      postsApi.getFeed({
        campus: targetCampus,
        type: 'stories',
        page: pageParam as number,
        limit: 15,
      }),
    getNextPageParam: (last: PaginatedPosts) => (last.hasMore ? last.page + 1 : undefined),
    initialPageParam: 1,
  });
};
