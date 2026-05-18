import { User } from '../types';
import { createId, initialsFrom } from '../utils/id';
import { colors } from '../theme';

const ACCENTS = [colors.primary, colors.accent, colors.success];

export interface MockAuthInput {
  pseudonym: string;
  email: string;
}

export function mockRegister({ pseudonym, email }: MockAuthInput): User {
  const accentColor = ACCENTS[Math.floor(Math.random() * ACCENTS.length)];
  return {
    id: createId('user'),
    pseudonym: pseudonym.trim() || 'Gast',
    email: email.trim(),
    ageRange: '25-34',
    bio: '',
    interests: [],
    meetingPreference: 'both',
    privacySettings: { hideBio: false, shareOnlyArea: true },
    noShowCount: 0,
    trustStatus: 'trusted',
    initials: initialsFrom(pseudonym || 'Gast'),
    accentColor,
  };
}

export function mockLogin(input: MockAuthInput): User {
  // No real backend — login is treated like a register for the prototype.
  return mockRegister(input);
}

export function logout(): null {
  return null;
}
