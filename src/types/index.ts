export type AgeRange = '18-24' | '25-34' | '35-44' | '45+';

export type MeetingPreference = 'one_on_one' | 'group' | 'both';

export type TrustStatus = 'trusted' | 'warning' | 'restricted' | 'suspended';

export type Area =
  | 'Stuttgart-Mitte'
  | 'Stuttgart-West'
  | 'Stuttgart-Ost'
  | 'Stuttgart-Vaihingen'
  | 'Böblingen'
  | 'Esslingen'
  | 'Ludwigsburg'
  | 'Reutlingen';

export interface PrivacySettings {
  hideBio: boolean;
  shareOnlyArea: boolean;
}

export interface User {
  id: string;
  pseudonym: string;
  email: string;
  ageRange: AgeRange;
  bio?: string;
  interests: string[];
  meetingPreference: MeetingPreference;
  privacySettings: PrivacySettings;
  noShowCount: number;
  trustStatus: TrustStatus;
  initials: string;
  accentColor: string;
  /** Altersgruppen, mit denen der User gematcht werden möchte. Filter
   *  läuft beidseitig: andere muss in dieser Liste sein, und das eigene
   *  ageRange muss in der ``matchAgeRanges`` des anderen sein. */
  matchAgeRanges: AgeRange[];
}

export const ALL_AGE_RANGES: AgeRange[] = ['18-24', '25-34', '35-44', '45+'];

export interface Availability {
  id: string;
  userId: string;
  date: string; // ISO date YYYY-MM-DD
  startTime: string; // HH:mm
  endTime: string; // HH:mm
  area: Area;
}

export interface CafeLocation {
  lat: number;
  lng: number;
}

export interface Cafe {
  id: string;
  name: string;
  address: string;
  area: Area;
  openingHours: string;
  rating: number;
  atmosphere: string[];
  distanceMock: string;
  emoji: string;
  location?: CafeLocation;
  placeId?: string;
  source?: 'mock' | 'google';
}

export type MatchStatus = 'suggested' | 'proposed' | 'accepted' | 'declined' | 'completed';

export interface MatchReason {
  label: string;
  detail: string;
}

export interface Match {
  id: string;
  userAId: string;
  userBId: string;
  score: number;
  sharedInterests: string[];
  suggestedCafeId: string;
  suggestedDate: string;
  suggestedStartTime: string;
  suggestedEndTime: string;
  meetingPreference: MeetingPreference;
  status: MatchStatus;
  reasons: MatchReason[];
}

export type MeetingStatus =
  | 'pending'
  | 'confirmed'
  | 'one_checked_in'
  | 'both_checked_in'
  | 'completed'
  | 'cancelled'
  | 'no_show';

export interface CheckIn {
  userId: string;
  checkedInAt: string | null;
  status: 'waiting' | 'checked_in';
}

export interface Meeting {
  id: string;
  matchId: string;
  cafeId: string;
  date: string;
  startTime: string;
  endTime: string;
  status: MeetingStatus;
  qrCode: string;
  checkIns: CheckIn[];
}

export interface ChatMessage {
  id: string;
  matchId: string;
  senderId: string;
  encryptedText: string;
  createdAt: string;
  messageNumber: number;
}

export const MAX_MESSAGES_PER_USER = 3;
