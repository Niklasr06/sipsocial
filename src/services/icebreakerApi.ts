import { apiClient } from './apiClient';

export interface ApiIcebreaker {
  id: string;
  match_id: string;
  interest: string;
  questions: string[];
}

export const icebreakerApi = {
  forMatch: (matchId: string, fallbackInterests?: string[]) => {
    const qs = fallbackInterests?.length ? `?interests=${encodeURIComponent(fallbackInterests.join(','))}` : '';
    return apiClient.get<ApiIcebreaker[]>(`/api/chat/${matchId}/icebreakers${qs}`);
  },
};
