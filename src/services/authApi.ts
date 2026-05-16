import { apiClient } from './apiClient';
import { ApiUser } from './userApi';

export interface ApiAuthResponse {
  token: string;
  token_type: 'bearer';
  user: ApiUser;
}

export const authApi = {
  register: (payload: { pseudonym: string; email: string; password: string }) =>
    apiClient.post<ApiAuthResponse>('/api/auth/register', payload),
  login: (payload: { email: string; password: string }) =>
    apiClient.post<ApiAuthResponse>('/api/auth/login', payload),
  me: () => apiClient.get<ApiUser>('/api/auth/me'),
};
