import { apiClient } from './apiClient';
import { MatchStatus } from '../types';

export interface ApiMatchReason {
  label: string;
  detail: string;
}

export interface ApiMatch {
  id: string;
  user_a_id: string;
  user_b_id: string;
  score: number;
  shared_interests: string[];
  suggested_cafe_id: string | null;
  suggested_date: string;
  suggested_start_time: string;
  suggested_end_time: string;
  meeting_preference: 'one_on_one' | 'group' | 'both';
  status: MatchStatus;
  reasons: ApiMatchReason[];
}

export const matchingApi = {
  find: (userId: string) => apiClient.post<ApiMatch[]>('/api/matches/find', { user_id: userId }),
  list: (userId: string) => apiClient.get<ApiMatch[]>(`/api/matches/${userId}`),
  updateStatus: (matchId: string, status: MatchStatus) =>
    apiClient.patch<ApiMatch>(`/api/matches/${matchId}/status`, { status }),
};
