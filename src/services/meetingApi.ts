import { apiClient } from './apiClient';
import { MeetingStatus } from '../types';

export interface ApiCheckIn {
  user_id: string;
  status: 'waiting' | 'checked_in';
  checked_in_at: string | null;
}

export interface ApiMeeting {
  id: string;
  match_id: string;
  cafe_id: string;
  date: string;
  start_time: string;
  end_time: string;
  status: MeetingStatus;
  qr_code: string;
  check_ins: ApiCheckIn[];
}

export const meetingApi = {
  create: (payload: { match_id: string; cafe_id: string; date: string; start_time: string; end_time: string }) =>
    apiClient.post<ApiMeeting>('/api/meetings', payload),
  forUser: (userId: string) => apiClient.get<ApiMeeting[]>(`/api/meetings/${userId}`),
  update: (
    meetingId: string,
    patch: { status?: MeetingStatus; cafe_id?: string; check_in_user_id?: string },
  ) => apiClient.patch<ApiMeeting>(`/api/meetings/${meetingId}`, patch),
  checkIn: (meetingId: string, qrToken: string) =>
    apiClient.post<ApiMeeting>(`/api/meetings/${meetingId}/check-in`, { qr_token: qrToken }),
};
