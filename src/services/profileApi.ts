import { apiClient } from './apiClient';
import { ApiUser } from './userApi';

export interface ApiProfile {
  id: string;
  pseudonym: string;
  age_range: ApiUser['age_range'];
  bio: string;
  interests: string[];
  meeting_preference: ApiUser['meeting_preference'];
  initials: string;
  accent_color: string;
  trust_status: ApiUser['trust_status'];
}

export const profileApi = {
  get: (userId: string) => apiClient.get<ApiProfile>(`/api/profiles/${userId}`),
  update: (userId: string, patch: Partial<ApiUser>) =>
    apiClient.patch<ApiProfile>(`/api/profiles/${userId}`, patch),
};
