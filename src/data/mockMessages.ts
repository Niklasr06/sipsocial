import { ChatMessage } from '../types';
import { encryptMessage } from '../utils/crypto';
import { createId } from '../utils/id';

// Sample seeded messages for an existing match — they appear after the user
// confirms a meeting with that match.
export function createSeedMessages(matchId: string, otherUserId: string): ChatMessage[] {
  const now = Date.now();
  return [
    {
      id: createId('msg_seed'),
      matchId,
      senderId: otherUserId,
      encryptedText: encryptMessage('Hi! Passt 16:30 Uhr für dich?'),
      createdAt: new Date(now - 1000 * 60 * 60).toISOString(),
      messageNumber: 1,
    },
  ];
}
