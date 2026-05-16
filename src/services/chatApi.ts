import { apiClient } from './apiClient';

export interface ApiChatMessage {
  id: string;
  match_id: string;
  sender_id: string;
  text: string;
  message_number: number;
  blocked: boolean;
  privacy_warnings: string[];
  created_at: string;
}

export interface ApiChatSendResponse {
  ok: boolean;
  reason: string;
  message: ApiChatMessage | null;
  remaining: number;
}

export const chatApi = {
  list: (matchId: string) => apiClient.get<ApiChatMessage[]>(`/api/chat/${matchId}`),
  send: (matchId: string, payload: { sender_id: string; text: string }) =>
    apiClient.post<ApiChatSendResponse>(`/api/chat/${matchId}/message`, payload),
};
