/**
 * Maps backend ↔ frontend domain shapes and centralises optimistic backend
 * writes. The AppContext keeps the **frontend** model as source of truth —
 * everything in this file is best-effort persistence on top.
 *
 * If the backend is reachable, writes succeed silently. If it's not
 * reachable, ``ApiUnavailableError`` is swallowed so the UI keeps working.
 */

import { Availability, Cafe, CheckIn, Match, Meeting, User } from '../types';
import { ApiUser, userApi } from '../services/userApi';
import { availabilityApi, ApiAvailability } from '../services/availabilityApi';
import { ApiMatch, matchingApi } from '../services/matchingApi';
import { ApiCafe } from '../services/cafeApi';
import { ApiCheckIn, ApiMeeting, meetingApi } from '../services/meetingApi';
import { ApiError, isApiUnavailable } from '../services/apiClient';

export function apiUserToLocal(u: ApiUser): User {
  // Defensive: backend used to serialize the primary key as ``_id`` (a
  // MongoDB-alias leftover). Old deployments still in flight may return
  // that — fall back gracefully so the ``id`` never becomes ``undefined``.
  const id = u.id ?? (u as unknown as { _id?: string })._id ?? '';
  return {
    id,
    pseudonym: u.pseudonym,
    email: u.email,
    ageRange: u.age_range,
    bio: u.bio || '',
    interests: u.interests,
    meetingPreference: u.meeting_preference,
    privacySettings: {
      hideBio: u.privacy_settings.hide_bio,
      shareOnlyArea: u.privacy_settings.share_only_area,
    },
    noShowCount: u.no_show_count,
    trustStatus: u.trust_status,
    initials: u.initials,
    accentColor: u.accent_color,
  };
}

export function apiAvailToLocal(a: ApiAvailability): Availability {
  return {
    id: a.id,
    userId: a.user_id,
    date: a.date,
    startTime: a.start_time,
    endTime: a.end_time,
    area: a.area as Availability['area'],
  };
}

export function apiCafeToLocal(c: ApiCafe): Cafe {
  return {
    id: c.id,
    name: c.name,
    address: c.address,
    area: c.area as Cafe['area'],
    openingHours: c.opening_hours || '',
    rating: c.rating,
    atmosphere: c.atmosphere,
    distanceMock: c.distance_mock,
    emoji: c.emoji,
    location: c.location ?? undefined,
    placeId: c.place_id ?? undefined,
    source: c.source,
  };
}

export function apiMatchToLocal(m: ApiMatch): Match {
  return {
    id: m.id,
    userAId: m.user_a_id,
    userBId: m.user_b_id,
    score: m.score,
    sharedInterests: m.shared_interests,
    suggestedCafeId: m.suggested_cafe_id ?? '',
    suggestedDate: m.suggested_date,
    suggestedStartTime: m.suggested_start_time,
    suggestedEndTime: m.suggested_end_time,
    meetingPreference: m.meeting_preference,
    status: m.status,
    reasons: m.reasons,
  };
}

export function localUserPatchToApi(patch: Partial<User>) {
  const out: Record<string, unknown> = {};
  if (patch.pseudonym !== undefined) out.pseudonym = patch.pseudonym;
  if (patch.ageRange !== undefined) out.age_range = patch.ageRange;
  if (patch.bio !== undefined) out.bio = patch.bio;
  if (patch.interests !== undefined) out.interests = patch.interests;
  if (patch.meetingPreference !== undefined) out.meeting_preference = patch.meetingPreference;
  if (patch.privacySettings !== undefined) {
    out.privacy_settings = {
      hide_bio: patch.privacySettings.hideBio,
      share_only_area: patch.privacySettings.shareOnlyArea,
    };
  }
  return out;
}

/** Returns the backend user on success, ``null`` if backend is offline. */
export async function backendCreateUser(payload: { pseudonym: string; email: string }): Promise<User | null> {
  try {
    const apiUser = await userApi.create(payload);
    return apiUserToLocal(apiUser);
  } catch (err) {
    if (isApiUnavailable(err)) return null;
    throw err;
  }
}

export async function backendUpdateUser(userId: string, patch: Partial<User>): Promise<User | null> {
  try {
    const apiUser = await userApi.update(userId, localUserPatchToApi(patch) as Partial<ApiUser>);
    return apiUserToLocal(apiUser);
  } catch (err) {
    if (isApiUnavailable(err)) {
      // eslint-disable-next-line no-console
      console.warn('[backend] user update timed out / unreachable — local state ahead of DB:', err);
      return null;
    }
    // eslint-disable-next-line no-console
    console.error('[backend] user update failed:', err);
    throw err;
  }
}

export async function backendLoadAvailabilities(userId: string): Promise<Availability[] | null> {
  try {
    const list = await availabilityApi.forUser(userId);
    return list.map(apiAvailToLocal);
  } catch (err) {
    if (isApiUnavailable(err)) return null;
    throw err;
  }
}


export async function backendSaveAvailability(av: Availability): Promise<Availability | null> {
  try {
    const apiAv = await availabilityApi.add({
      user_id: av.userId,
      date: av.date,
      start_time: av.startTime,
      end_time: av.endTime,
      area: av.area,
    });
    return apiAvailToLocal(apiAv);
  } catch (err) {
    if (isApiUnavailable(err)) return null;
    throw err;
  }
}

export async function backendFindMatches(userId: string): Promise<Match[] | null> {
  try {
    const list = await matchingApi.find(userId);
    return list.map(apiMatchToLocal);
  } catch (err) {
    if (isApiUnavailable(err)) return null;
    throw err;
  }
}

export function apiCheckInToLocal(c: ApiCheckIn): CheckIn {
  return {
    userId: c.user_id,
    status: c.status,
    checkedInAt: c.checked_in_at,
  };
}

export function apiMeetingToLocal(m: ApiMeeting): Meeting {
  return {
    id: m.id,
    matchId: m.match_id,
    cafeId: m.cafe_id,
    date: m.date,
    startTime: m.start_time,
    endTime: m.end_time,
    status: m.status,
    qrCode: m.qr_code,
    checkIns: m.check_ins.map(apiCheckInToLocal),
  };
}

/**
 * Returns ``{ok: true, meeting}`` on a successful check-in,
 * ``{ok: false, reason}`` on an authoritative backend rejection (invalid
 * token, wrong meeting, not a participant) so the caller can surface the
 * cause, or ``null`` when the backend is unreachable so the caller can
 * fall back to local-only simulation.
 */
export async function backendCheckInMeeting(
  meetingId: string,
  qrToken: string,
): Promise<{ ok: true; meeting: Meeting } | { ok: false; reason: string } | null> {
  try {
    const apiMeeting = await meetingApi.checkIn(meetingId, qrToken);
    return { ok: true, meeting: apiMeetingToLocal(apiMeeting) };
  } catch (err) {
    if (isApiUnavailable(err)) return null;
    if (err instanceof ApiError) {
      return { ok: false, reason: err.detail ?? err.message };
    }
    throw err;
  }
}
