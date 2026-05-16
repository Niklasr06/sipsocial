import { apiClient } from './apiClient';

export interface ApiAvailability {
  id: string;
  user_id: string;
  date: string;
  start_time: string;
  end_time: string;
  area: string;
  lat?: number | null;
  lng?: number | null;
}

export const availabilityApi = {
  add: (payload: Omit<ApiAvailability, 'id'>) =>
    apiClient.post<ApiAvailability>('/api/availability', payload),
  forUser: (userId: string) => apiClient.get<ApiAvailability[]>(`/api/availability/${userId}`),
};
