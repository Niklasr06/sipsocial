import { Availability, Cafe, Match, MatchReason, User } from '../types';
import { MOCK_CAFES } from '../data/mockCafes';
import { overlapMinutes } from '../utils/date';
import { createId } from '../utils/id';

export const SCORE_WEIGHTS = {
  time: 40,
  area: 30,
  interests: 20,
  meetingType: 10,
} as const;

export const MIN_MATCH_SCORE = 60;

export interface MatchComputation {
  score: number;
  sharedInterests: string[];
  reasons: MatchReason[];
  overlapMin: number;
  overlapWindow: { start: string; end: string } | null;
}

export function getSharedInterests(a: User, b: User): string[] {
  const setB = new Set(b.interests);
  return a.interests.filter((i) => setB.has(i));
}

function compatibleMeetingPreference(a: User['meetingPreference'], b: User['meetingPreference']): boolean {
  if (a === 'both' || b === 'both') return true;
  return a === b;
}

function maxTime(a: string, b: string) {
  return a > b ? a : b;
}
function minTime(a: string, b: string) {
  return a < b ? a : b;
}

export function calculateMatchScore(
  user: User,
  otherUser: User,
  availability: Availability,
  otherAvailability: Availability,
): MatchComputation {
  const reasons: MatchReason[] = [];

  // 1. Time overlap — up to 40 pts. Same date is required for any time score.
  let timeScore = 0;
  let overlap = 0;
  let overlapWindow: { start: string; end: string } | null = null;
  if (availability.date === otherAvailability.date) {
    overlap = overlapMinutes(
      availability.startTime,
      availability.endTime,
      otherAvailability.startTime,
      otherAvailability.endTime,
    );
    if (overlap > 0) {
      // 90+ min = full score, scale linearly below that.
      timeScore = Math.round(Math.min(1, overlap / 90) * SCORE_WEIGHTS.time);
      overlapWindow = {
        start: maxTime(availability.startTime, otherAvailability.startTime),
        end: minTime(availability.endTime, otherAvailability.endTime),
      };
      reasons.push({
        label: 'Zeitfenster',
        detail: `Euer Zeitfenster überschneidet sich um ${overlap} Minuten.`,
      });
    }
  }

  // 2. Area — up to 30 pts (binary in this prototype).
  let areaScore = 0;
  if (availability.area === otherAvailability.area) {
    areaScore = SCORE_WEIGHTS.area;
    reasons.push({
      label: 'Bereich',
      detail: `Ihr seid beide in ${availability.area} verfügbar.`,
    });
  }

  // 3. Shared interests — up to 20 pts. 5+ shared = full.
  const shared = getSharedInterests(user, otherUser);
  const interestScore = Math.round(Math.min(1, shared.length / 5) * SCORE_WEIGHTS.interests);
  if (shared.length > 0) {
    reasons.push({
      label: 'Interessen',
      detail:
        shared.length === 1
          ? `Ihr habt 1 gemeinsames Interesse: ${shared[0]}.`
          : `Ihr habt ${shared.length} gemeinsame Interessen: ${shared.slice(0, 3).join(', ')}${
              shared.length > 3 ? '…' : ''
            }.`,
    });
  }

  // 4. Meeting preference — 10 pts if compatible.
  let prefScore = 0;
  if (compatibleMeetingPreference(user.meetingPreference, otherUser.meetingPreference)) {
    prefScore = SCORE_WEIGHTS.meetingType;
    reasons.push({
      label: 'Treffenstyp',
      detail: 'Euer bevorzugter Treffenstyp passt zusammen.',
    });
  }

  const score = timeScore + areaScore + interestScore + prefScore;

  return {
    score,
    sharedInterests: shared,
    reasons,
    overlapMin: overlap,
    overlapWindow,
  };
}

export function findBestCafeForArea(area: string, cafes: Cafe[] = MOCK_CAFES): Cafe {
  const inArea = cafes.filter((c) => c.area === area);
  if (inArea.length === 0) {
    return [...cafes].sort((a, b) => b.rating - a.rating)[0];
  }
  return inArea.sort((a, b) => b.rating - a.rating)[0];
}

function deriveMeetingPreference(a: User, b: User): User['meetingPreference'] {
  if (a.meetingPreference === b.meetingPreference) return a.meetingPreference;
  if (a.meetingPreference === 'both') return b.meetingPreference;
  if (b.meetingPreference === 'both') return a.meetingPreference;
  return 'one_on_one';
}

export interface FindMatchesInput {
  user: User;
  myAvailabilities: Availability[];
  candidates: { user: User; availability: Availability }[];
  cafes?: Cafe[];
}

export function findMatches({ user, myAvailabilities, candidates, cafes = MOCK_CAFES }: FindMatchesInput): Match[] {
  if (myAvailabilities.length === 0) return [];

  const matches: Match[] = [];

  for (const candidate of candidates) {
    if (candidate.user.id === user.id) continue;
    if (candidate.user.trustStatus === 'suspended') continue;

    let best: { computation: MatchComputation; myAv: Availability } | null = null;

    for (const myAv of myAvailabilities) {
      const comp = calculateMatchScore(user, candidate.user, myAv, candidate.availability);
      if (!best || comp.score > best.computation.score) {
        best = { computation: comp, myAv };
      }
    }
    if (!best) continue;
    if (best.computation.score < MIN_MATCH_SCORE) continue;

    const cafe = findBestCafeForArea(candidate.availability.area, cafes);
    const window = best.computation.overlapWindow ?? {
      start: candidate.availability.startTime,
      end: candidate.availability.endTime,
    };

    const reasons = [...best.computation.reasons];
    if (cafe) {
      reasons.push({
        label: 'Café',
        detail: `Vorgeschlagenes Café in der Nähe: ${cafe.name}.`,
      });
    }

    matches.push({
      id: createId('match'),
      userAId: user.id,
      userBId: candidate.user.id,
      score: best.computation.score,
      sharedInterests: best.computation.sharedInterests,
      suggestedCafeId: cafe.id,
      suggestedDate: candidate.availability.date,
      suggestedStartTime: window.start,
      suggestedEndTime: window.end,
      meetingPreference: deriveMeetingPreference(user, candidate.user),
      status: 'suggested',
      reasons,
    });
  }

  return matches.sort((a, b) => b.score - a.score);
}
