import { ChatMessage, MAX_MESSAGES_PER_USER } from '../types';
import { decryptMessage, encryptMessage } from '../utils/crypto';
import { createId } from '../utils/id';
import { evaluateMessage, PRIVACY_HINT } from './privacyFilter';

export { encryptMessage, decryptMessage };

export function countMessagesFromUser(messages: ChatMessage[], senderId: string, matchId: string): number {
  return messages.filter((m) => m.matchId === matchId && m.senderId === senderId).length;
}

export function checkMessageLimit(messages: ChatMessage[], senderId: string, matchId: string): {
  remaining: number;
  reached: boolean;
} {
  const used = countMessagesFromUser(messages, senderId, matchId);
  const remaining = Math.max(0, MAX_MESSAGES_PER_USER - used);
  return { remaining, reached: remaining === 0 };
}

export interface SendMessageInput {
  messages: ChatMessage[];
  matchId: string;
  senderId: string;
  text: string;
}

export interface SendMessageResult {
  ok: boolean;
  reason?: string;
  warnings?: string[];
  message?: ChatMessage;
}

export function sendMessage({ messages, matchId, senderId, text }: SendMessageInput): SendMessageResult {
  const trimmed = text.trim();
  if (!trimmed) return { ok: false, reason: 'Bitte gib eine Nachricht ein.' };
  const limit = checkMessageLimit(messages, senderId, matchId);
  if (limit.reached) {
    return { ok: false, reason: 'Du hast dein Nachrichten-Limit für diesen Match erreicht.' };
  }
  const verdict = evaluateMessage(trimmed);
  if (verdict.blocked) {
    return { ok: false, reason: PRIVACY_HINT, warnings: verdict.warnings };
  }
  const count = countMessagesFromUser(messages, senderId, matchId);
  const message: ChatMessage = {
    id: createId('msg'),
    matchId,
    senderId,
    encryptedText: encryptMessage(trimmed),
    createdAt: new Date().toISOString(),
    messageNumber: count + 1,
  };
  return { ok: true, message, warnings: verdict.warnings };
}

export function getMessages(messages: ChatMessage[], matchId: string): ChatMessage[] {
  return messages
    .filter((m) => m.matchId === matchId)
    .sort((a, b) => a.createdAt.localeCompare(b.createdAt));
}
