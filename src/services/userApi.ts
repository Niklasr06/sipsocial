import { apiClient } from './apiClient';

export interface ApiUser {
  id: string;
  pseudonym: string;
  email: string;
  age_range: '18-24' | '25-34' | '35-44' | '45+';
  bio: string;
  interests: string[];
  meeting_preference: 'one_on_one' | 'group' | 'both';
  privacy_settings: {
    hide_exact_age: boolean;
    hide_bio: boolean;
    share_only_area: boolean;
  };
  no_show_count: number;
  trust_status: 'trusted' | 'warning' | 'restricted' | 'suspended';
  initials: string;
  accent_color: string;
}

export const userApi = {
  create: (payload: { pseudonym: string; email: string }) =>
    apiClient.post<ApiUser>('/api/users', payload),
  get: (id: string) => apiClient.get<ApiUser>(`/api/users/${id}`),
  update: (id: string, patch: Partial<ApiUser>) => apiClient.patch<ApiUser>(`/api/users/${id}`, patch),
  /** Stores (or clears with ``null``) the Expo push token for the bearer-auth'd user. */
  setPushToken: (token: string | null) =>
    apiClient.put<void>('/api/users/me/push-token', { token }),
};
