import { apiClient } from './apiClient';

export type ReportReason =
  | 'harassment'
  | 'spam'
  | 'inappropriate'
  | 'no_show'
  | 'fake_profile'
  | 'other';

export const REPORT_REASON_LABELS: Record<ReportReason, string> = {
  harassment: 'Belästigung',
  spam: 'Spam / Werbung',
  inappropriate: 'Unangemessenes Verhalten',
  no_show: 'Wiederholtes No-Show',
  fake_profile: 'Fake-Profil',
  other: 'Etwas anderes',
};

export const blockApi = {
  block: (userId: string, reason?: string) =>
    apiClient.post<void>(`/api/blocks/${userId}`, { reason: reason ?? null }),
  unblock: (userId: string) => apiClient.del<void>(`/api/blocks/${userId}`),
  list: () => apiClient.get<string[]>('/api/blocks'),
  report: (payload: {
    reportedId: string;
    reason: ReportReason;
    details?: string;
    matchId?: string;
  }) =>
    apiClient.post<{ ok: boolean }>('/api/reports', {
      reported_id: payload.reportedId,
      reason: payload.reason,
      details: payload.details ?? '',
      match_id: payload.matchId ?? null,
    }),
};
