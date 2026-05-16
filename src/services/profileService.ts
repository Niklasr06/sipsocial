import { User } from '../types';
import { initialsFrom } from '../utils/id';

export function createProfile(base: User, patch: Partial<User>): User {
  const next: User = { ...base, ...patch };
  if (patch.pseudonym) {
    next.initials = initialsFrom(patch.pseudonym);
  }
  return next;
}

export function updateProfile(current: User, patch: Partial<User>): User {
  return createProfile(current, patch);
}

export function getProfile(users: User[], id: string): User | undefined {
  return users.find((u) => u.id === id);
}
