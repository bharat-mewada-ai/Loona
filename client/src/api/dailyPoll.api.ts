import client from './client';

export interface DailyPoll {
  _id: string;
  question: string;
  options: { text: string; votes: number }[];
  activeDate: string;
  userVote: number | null;
}

export const dailyPollApi = {
  getTodayPoll: async (): Promise<DailyPoll> => {
    const { data } = await client.get<DailyPoll>('/polls/today');
    return data;
  },

  voteTodayPoll: async (optionIndex: number): Promise<DailyPoll> => {
    const { data } = await client.post<DailyPoll>('/polls/today/vote', { optionIndex });
    return data;
  },
};
