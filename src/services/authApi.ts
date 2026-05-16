import { apiClient } from './apiClient';
import { ApiUser } from './userApi';

export interface ApiAuthResponse {
  token: string;
  token_type: 'bearer';
  refresh_token: string;
  user: ApiUser;
}

export interface ApiRefreshResponse {
  token: string;
  token_type: 'bearer';
  refresh_token: string;
}

export const authApi = {
  register: (payload: { pseudonym: string; email: string; password: string }) =>
    apiClient.post<ApiAuthResponse>('/api/auth/register', payload),
  login: (payload: { email: string; password: string }) =>
    apiClient.post<ApiAuthResponse>('/api/auth/login', payload),
  refresh: (refreshToken: string) =>
    apiClient.post<ApiRefreshResponse>('/api/auth/refresh', { refresh_token: refreshToken }),
  logout: (refreshToken: string) =>
    apiClient.post<void>('/api/auth/logout', { refresh_token: refreshToken }),
  me: () => apiClient.get<ApiUser>('/api/auth/me'),
  requestPasswordReset: (email: string) =>
    apiClient.post<void>('/api/auth/password-reset/request', { email }),
  confirmPasswordReset: (token: string, newPassword: string) =>
    apiClient.post<ApiAuthResponse>('/api/auth/password-reset/confirm', {
      token,
      new_password: newPassword,
    }),
};
