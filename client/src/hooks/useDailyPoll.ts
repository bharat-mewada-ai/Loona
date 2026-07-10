import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { dailyPollApi, DailyPoll } from '../api/dailyPoll.api';
import { useAuthStore } from '../store/authStore';

export const useTodayPoll = () => {
  const token = useAuthStore((s) => s.token);
  return useQuery<DailyPoll, Error>({
    queryKey: ['todayPoll'],
    queryFn: dailyPollApi.getTodayPoll,
    enabled: !!token,
    refetchInterval: 60_000 * 5, // auto refresh every 5 mins
  });
};

export const useVoteTodayPoll = () => {
  const qc = useQueryClient();
  return useMutation<DailyPoll, Error, number, { previousPoll?: DailyPoll }>({
    mutationFn: dailyPollApi.voteTodayPoll,
    onMutate: async (optionIndex) => {
      await qc.cancelQueries({ queryKey: ['todayPoll'] });
      const previousPoll = qc.getQueryData<DailyPoll>(['todayPoll']);

      if (previousPoll && Array.isArray(previousPoll.options)) {
        // Optimistically increment local votes count
        const updatedOptions = [...previousPoll.options];
        if (updatedOptions[optionIndex]) {
          updatedOptions[optionIndex] = {
            ...updatedOptions[optionIndex],
            votes: (updatedOptions[optionIndex].votes || 0) + 1,
          };
        }
        qc.setQueryData(['todayPoll'], {
          ...previousPoll,
          userVote: optionIndex,
          options: updatedOptions,
        });
      }

      return { previousPoll };
    },
    onError: (_err, _variables, context) => {
      if (context?.previousPoll) {
        qc.setQueryData(['todayPoll'], context.previousPoll);
      }
    },
    onSuccess: (updatedPoll) => {
      qc.setQueryData(['todayPoll'], updatedPoll);
      qc.invalidateQueries({ queryKey: ['todayPoll'] });
      qc.invalidateQueries({ queryKey: ['me'] }); // update potato balance
    },
  });
};
