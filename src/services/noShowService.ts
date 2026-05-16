import { TrustStatus, User } from '../types';

export type RestrictionLevel = 'none' | 'soft_warning' | 'limited_matches' | 'temporary_block';

export interface TrustInfo {
  status: TrustStatus;
  level: RestrictionLevel;
  title: string;
  description: string;
  badge: string;
}

export function calculateTrustStatus(noShowCount: number): TrustInfo {
  if (noShowCount <= 0) {
    return {
      status: 'trusted',
      level: 'none',
      title: 'Vertrauensvoll',
      description:
        'Du bist zuverlässig zu Treffen erschienen. Danke! Das stärkt das Vertrauen in der Community.',
      badge: 'Aktiv',
    };
  }
  if (noShowCount === 1) {
    return {
      status: 'warning',
      level: 'soft_warning',
      title: 'Freundlicher Hinweis',
      description:
        'Es kann mal etwas dazwischenkommen. Bitte sag im Chat kurz Bescheid, falls du nicht kommen kannst. So bleibt SipSocial fair für alle.',
      badge: '1 No-Show',
    };
  }
  if (noShowCount === 2) {
    return {
      status: 'restricted',
      level: 'limited_matches',
      title: 'Match-Funktion eingeschränkt',
      description:
        'Damit Treffen verlässlich bleiben, erhältst du vorerst nur ausgewählte Match-Vorschläge. Mit einem erfolgreichen Treffen wird die Einschränkung wieder aufgehoben.',
      badge: '2 No-Shows',
    };
  }
  return {
    status: 'suspended',
    level: 'temporary_block',
    title: 'Vorübergehend pausiert',
    description:
      'Dein Konto ist für 14 Tage pausiert. Diese Pause hilft, die Community fair zu halten. Danach kannst du wieder ganz normal starten.',
    badge: '3+ No-Shows',
  };
}

export function getRestrictionLevel(noShowCount: number): RestrictionLevel {
  return calculateTrustStatus(noShowCount).level;
}

export function registerNoShow(user: User): User {
  const nextCount = user.noShowCount + 1;
  const { status } = calculateTrustStatus(nextCount);
  return { ...user, noShowCount: nextCount, trustStatus: status };
}
