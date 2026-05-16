import { apiClient } from './apiClient';

export interface ApiCafe {
  id: string;
  place_id: string | null;
  name: string;
  address: string;
  area: string;
  opening_hours: string;
  rating: number;
  atmosphere: string[];
  distance_mock: string;
  emoji: string;
  location: { lat: number; lng: number } | null;
  source: 'mock' | 'google';
}

export const cafeApi = {
  search: (params: { area?: string; lat?: number; lng?: number; radiusM?: number; limit?: number }) => {
    const query = new URLSearchParams();
    if (params.area) query.set('area', params.area);
    if (params.lat !== undefined) query.set('lat', String(params.lat));
    if (params.lng !== undefined) query.set('lng', String(params.lng));
    if (params.radiusM) query.set('radius_m', String(params.radiusM));
    if (params.limit) query.set('limit', String(params.limit));
    const q = query.toString();
    return apiClient.get<ApiCafe[]>(`/api/cafes/search${q ? `?${q}` : ''}`);
  },
  nearby: (lat: number, lng: number, radiusM = 1500, limit = 12) =>
    apiClient.get<ApiCafe[]>(
      `/api/cafes/nearby?lat=${lat}&lng=${lng}&radius_m=${radiusM}&limit=${limit}`,
    ),
  get: (cafeId: string) => apiClient.get<ApiCafe>(`/api/cafes/${cafeId}`),
};
