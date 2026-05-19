import React, { createContext, useCallback, useContext, useEffect, useMemo, useReducer, useState } from 'react';
import {
  Availability,
  Cafe,
  ChatMessage,
  Match,
  Meeting,
  User,
} from '../types';
import { MOCK_USERS } from '../data/mockUsers';
import { MOCK_CAFES } from '../data/mockCafes';
import { MOCK_AVAILABILITIES } from '../data/mockAvailabilities';
import { findMatches } from '../services/matchingService';
import { mockRegister } from '../services/authService';
import { createMeeting, recomputeStatusFromCheckIns } from '../services/meetingService';
import { sendMessage } from '../services/chatService';
import { simulateCheckIn } from '../services/checkInService';
import { registerNoShow } from '../services/noShowService';
import { createProfile } from '../services/profileService';
import {
  apiCafeToLocal,
  apiMeetingToLocal,
  apiUserToLocal,
  backendCheckInMeeting,
  backendCreateUser,
  backendFindMatches,
  backendLoadAvailabilities,
  backendSaveAvailability,
  backendUpdateUser,
} from './backendBridge';
import { authApi } from '../services/authApi';
import { availabilityApi } from '../services/availabilityApi';
import { cafeApi } from '../services/cafeApi';
import { chatApi } from '../services/chatApi';
import { meetingApi } from '../services/meetingApi';
import { userApi } from '../services/userApi';
import { encryptMessage } from '../utils/crypto';
import { setSentryUser } from './../services/sentry';
import { ApiError, isApiUnavailable } from '../services/apiClient';
import { getRefreshToken, restoreToken, setTokens } from '../services/tokenStore';
import { clearPushTokenForCurrentUser, registerPushTokenForCurrentUser } from '../services/pushService';

interface AppState {
  currentUser: User | null;
  users: User[];
  availabilities: Availability[];
  matches: Match[];
  meetings: Meeting[];
  cafes: Cafe[];
  chatMessages: ChatMessage[];
}

type Action =
  | { type: 'SET_USER'; user: User | null }
  | { type: 'UPDATE_USER'; patch: Partial<User> }
  | { type: 'MERGE_USERS'; users: User[] }
  | { type: 'MERGE_CAFES'; cafes: Cafe[] }
  | { type: 'ADD_AVAILABILITY'; availability: Availability }
  | { type: 'REPLACE_AVAILABILITIES'; userId: string; list: Availability[] }
  | { type: 'REMOVE_AVAILABILITY'; id: string }
  | { type: 'SET_MATCHES'; matches: Match[] }
  | { type: 'UPDATE_MATCH'; id: string; patch: Partial<Match> }
  | { type: 'ADD_MEETING'; meeting: Meeting }
  | { type: 'UPDATE_MEETING'; id: string; meeting: Meeting }
  | { type: 'ADD_MESSAGE'; message: ChatMessage }
  | { type: 'REPLACE_CHAT_MESSAGES'; matchId: string; messages: ChatMessage[] }
  | { type: 'REGISTER_NO_SHOW'; userId: string };

const initialState: AppState = {
  currentUser: null,
  users: MOCK_USERS,
  availabilities: MOCK_AVAILABILITIES,
  matches: [],
  meetings: [],
  cafes: MOCK_CAFES,
  chatMessages: [],
};

function reducer(state: AppState, action: Action): AppState {
  switch (action.type) {
    case 'SET_USER':
      return { ...state, currentUser: action.user };
    case 'UPDATE_USER': {
      if (!state.currentUser) return state;
      const next = createProfile(state.currentUser, action.patch);
      return { ...state, currentUser: next };
    }
    case 'MERGE_USERS': {
      // Update existing entries by id, add new ones at the end.
      const byId = new Map(state.users.map((u) => [u.id, u]));
      for (const u of action.users) {
        if (u.id) byId.set(u.id, u);
      }
      return { ...state, users: [...byId.values()] };
    }
    case 'MERGE_CAFES': {
      const byId = new Map(state.cafes.map((c) => [c.id, c]));
      for (const c of action.cafes) {
        if (c.id) byId.set(c.id, c);
      }
      return { ...state, cafes: [...byId.values()] };
    }
    case 'ADD_AVAILABILITY':
      return { ...state, availabilities: [...state.availabilities, action.availability] };
    case 'REPLACE_AVAILABILITIES': {
      const others = state.availabilities.filter((a) => a.userId !== action.userId);
      return { ...state, availabilities: [...others, ...action.list] };
    }
    case 'REMOVE_AVAILABILITY':
      return {
        ...state,
        availabilities: state.availabilities.filter((a) => a.id !== action.id),
      };
    case 'SET_MATCHES':
      return { ...state, matches: action.matches };
    case 'UPDATE_MATCH':
      return {
        ...state,
        matches: state.matches.map((m) => (m.id === action.id ? { ...m, ...action.patch } : m)),
      };
    case 'ADD_MEETING':
      return {
        ...state,
        meetings: [...state.meetings, action.meeting],
      };
    case 'UPDATE_MEETING':
      return {
        ...state,
        meetings: state.meetings.map((m) => (m.id === action.id ? action.meeting : m)),
      };
    case 'ADD_MESSAGE':
      // Dedup: dont add a message if one with the same id is already there.
      // Happens when sendChatMessage adds optimistically and then the load
      // afterwards brings the same message back from the server.
      if (state.chatMessages.some((m) => m.id === action.message.id)) {
        return state;
      }
      return { ...state, chatMessages: [...state.chatMessages, action.message] };
    case 'REPLACE_CHAT_MESSAGES': {
      const others = state.chatMessages.filter((m) => m.matchId !== action.matchId);
      return { ...state, chatMessages: [...others, ...action.messages] };
    }
    case 'REGISTER_NO_SHOW': {
      if (!state.currentUser || state.currentUser.id !== action.userId) return state;
      return { ...state, currentUser: registerNoShow(state.currentUser) };
    }
    default:
      return state;
  }
}

export interface AuthError {
  message: string;
  code: 'invalid_credentials' | 'email_taken' | 'network' | 'unknown';
}

export interface AppContextValue extends AppState {
  /** ``true`` while we restore a saved token on launch. */
  authBootstrapping: boolean;
  /** Real backend register. Throws ``AuthError`` for the UI to render. */
  signUp: (payload: { pseudonym: string; email: string; password: string }) => Promise<User>;
  /**
   * Real backend login. Throws ``AuthError`` for the UI to render. The
   * returned object includes ``hasAvailability`` so the login screen can
   * deep-link partially onboarded users to the right step without waiting
   * on a re-render of the AppContext state.
   */
  signIn: (payload: { email: string; password: string }) => Promise<{ user: User; hasAvailability: boolean }>;
  /** Clears the session and returns the navigator to the onboarding stack. */
  signOut: () => Promise<void>;
  /** Widerruft alle Refresh-Tokens server-side (also auch auf anderen
   *  Geräten) und loggt diesen Client anschließend aus. */
  signOutEverywhere: () => Promise<void>;
  /**
   * Permanently delete the user's account on the backend, then sign out
   * locally. DSGVO Art. 17 (right to erasure). Caller should confirm
   * intent in a destructive dialog before calling this — there is no
   * undo on either side.
   */
  deleteAccount: () => Promise<void>;
  setCurrentUser: (user: User | null) => void;
  updateUser: (patch: Partial<User>) => void;
  /**
   * Persists user updates to the backend if reachable. The local state is
   * updated either way so the UI stays responsive.
   */
  saveUserToBackend: (patch: Partial<User>) => Promise<void>;
  /**
   * Persists an availability entry to the backend. Resolves once the local
   * state is set. Backend failures are swallowed (we still keep the entry
   * locally).
   */
  saveAvailabilityToBackend: (availability: Availability) => Promise<void>;
  /** Delete one of the current user's availability slots (backend + local). */
  removeAvailability: (availabilityId: string) => Promise<void>;
  /**
   * Asks the backend for matches; falls back to the local algorithm if the
   * backend is offline. Returns the resulting match list.
   */
  fetchMatches: () => Promise<Match[]>;
  /**
   * Creates a fresh user — backend-first, with local fallback. Used by the
   * onboarding ``LoginScreen``. The created user becomes the current user.
   */
  registerUser: (payload: { pseudonym: string; email: string }) => Promise<User>;
  addAvailability: (availability: Availability) => void;
  replaceMyAvailabilities: (list: Availability[]) => void;
  recomputeMatches: () => Match[];
  updateMatch: (id: string, patch: Partial<Match>) => void;
  confirmMatch: (matchId: string) => Meeting | null;
  cancelMatch: (matchId: string) => void;
  sendChatMessage: (matchId: string, text: string) => Promise<{ ok: boolean; reason?: string; warnings?: string[] }>;
  /** Fetch chat history for a match from the backend and merge into local state. */
  loadChatMessages: (matchId: string) => Promise<void>;
  /**
   * Real QR check-in. The QR payload is a signed JWT the backend issued at
   * meeting creation. Backend verifies token + meeting + participant, then
   * marks the authenticated user as checked in. Falls back to local-only
   * simulation when the backend is unreachable.
   *
   * Returns ``{ok: true}`` on success; ``{ok: false, reason}`` on validation
   * failure so the scanner screen can show a useful message.
   */
  checkInToMeeting: (meetingId: string, qrToken: string) => Promise<{ ok: boolean; reason?: string }>;
  /** Demo-only helper: marks the other participant as checked in locally. */
  simulateOtherUserCheckIn: (meetingId: string, userId: string) => void;
  /** Cancel a confirmed meeting. Persists to backend, pushes the other side. */
  cancelMeeting: (meetingId: string) => Promise<void>;
  /**
   * Move a meeting to a new time / café. Returns ``{ok: false, reason}`` on
   * authoritative backend errors so the caller can surface them inline.
   */
  rescheduleMeeting: (
    meetingId: string,
    patch: { date?: string; startTime?: string; endTime?: string; cafeId?: string },
  ) => Promise<{ ok: boolean; reason?: string }>;
  markMeetingNoShow: (meetingId: string) => void;
  registerSelfNoShow: () => void;
  getCafe: (id: string) => Cafe | undefined;
  getUser: (id: string) => User | undefined;
  getMeetingByMatch: (matchId: string) => Meeting | undefined;
}

const AppContext = createContext<AppContextValue | null>(null);

export const AppStateProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [state, dispatch] = useReducer(reducer, initialState);

  const [authBootstrapping, setAuthBootstrapping] = useState(true);

  const setCurrentUser = useCallback((user: User | null) => {
    dispatch({ type: 'SET_USER', user });
  }, []);

  const updateUser = useCallback((patch: Partial<User>) => {
    dispatch({ type: 'UPDATE_USER', patch });
  }, []);

  // On launch: restore the saved bearer token (if any) and re-fetch the user
  // through /api/auth/me. If the token is invalid or the backend is down we
  // simply land on the onboarding screen — nothing destructive.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const stored = await restoreToken();
      if (!stored) {
        if (!cancelled) setAuthBootstrapping(false);
        return;
      }
      try {
        const apiUser = await authApi.me();
        if (cancelled) return;
        const user = apiUserToLocal(apiUser);
        dispatch({ type: 'SET_USER', user });
        // Pull the user's saved availability so the RootNavigator knows they
        // already completed onboarding.
        const list = await backendLoadAvailabilities(user.id).catch(() => null);
        if (!cancelled && list && list.length > 0) {
          dispatch({ type: 'REPLACE_AVAILABILITIES', userId: user.id, list });
        }
        // Fire-and-forget; safe on web (no-op) and on simulators.
        registerPushTokenForCurrentUser().catch(() => null);
      } catch (err) {
        // Invalid/expired token — drop both.
        if (!isApiUnavailable(err)) {
          await setTokens(null, null);
        }
      } finally {
        if (!cancelled) setAuthBootstrapping(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // Sentry-Events ohne PII identifizieren — nur die User-ID, kein Name/Mail.
  useEffect(() => {
    setSentryUser(state.currentUser?.id ?? null);
  }, [state.currentUser?.id]);

  const signUp = useCallback(
    async (payload: { pseudonym: string; email: string; password: string }): Promise<User> => {
      try {
        const res = await authApi.register(payload);
        await setTokens(res.token, res.refresh_token);
        const user = apiUserToLocal(res.user);
        dispatch({ type: 'SET_USER', user });
        registerPushTokenForCurrentUser().catch(() => null);
        return user;
      } catch (err) {
        if (isApiUnavailable(err)) {
          const error: AuthError = {
            code: 'network',
            message: 'Backend nicht erreichbar — bitte später nochmal versuchen.',
          };
          throw error;
        }
        if (err instanceof ApiError && err.status === 409) {
          throw { code: 'email_taken', message: 'Diese E-Mail ist bereits registriert.' } as AuthError;
        }
        throw {
          code: 'unknown',
          message: err instanceof Error ? err.message : 'Registrierung fehlgeschlagen.',
        } as AuthError;
      }
    },
    [],
  );

  const signIn = useCallback(
    async (
      payload: { email: string; password: string },
    ): Promise<{ user: User; hasAvailability: boolean }> => {
      try {
        const res = await authApi.login(payload);
        await setTokens(res.token, res.refresh_token);
        const user = apiUserToLocal(res.user);
        dispatch({ type: 'SET_USER', user });
        // Hydrate availability so the user lands on Home, not Onboarding.
        const list = await backendLoadAvailabilities(user.id).catch(() => null);
        const hasAvailability = !!list && list.length > 0;
        if (hasAvailability) {
          dispatch({ type: 'REPLACE_AVAILABILITIES', userId: user.id, list });
        }
        registerPushTokenForCurrentUser().catch(() => null);
        return { user, hasAvailability };
      } catch (err) {
        if (isApiUnavailable(err)) {
          throw { code: 'network', message: 'Backend nicht erreichbar.' } as AuthError;
        }
        if (err instanceof ApiError && err.status === 401) {
          throw {
            code: 'invalid_credentials',
            message: 'E-Mail oder Passwort stimmt nicht.',
          } as AuthError;
        }
        throw {
          code: 'unknown',
          message: err instanceof Error ? err.message : 'Login fehlgeschlagen.',
        } as AuthError;
      }
    },
    [],
  );

  const signOutEverywhere = useCallback(async (): Promise<void> => {
    // Widerruft alle Refresh-Tokens server-side und loggt anschließend
    // lokal aus. Die hiesige Session muss zwingend authenticated sein,
    // damit der Endpoint überhaupt rangeht — also vor setTokens(null).
    await clearPushTokenForCurrentUser();
    try {
      await authApi.logoutEverywhere();
    } catch {
      // Best-effort — wenn der Server nicht erreichbar ist, loggen wir
      // lokal trotzdem aus. Andere Geräte fliegen dann beim nächsten
      // Refresh raus (sobald das aktuelle Refresh-Token revoked wird).
    }
    await setTokens(null, null);
    dispatch({ type: 'SET_USER', user: null });
  }, []);

  const signOut = useCallback(async (): Promise<void> => {
    // Clear backend push token and revoke the refresh token while we're
    // still authenticated; then drop both tokens locally.
    await clearPushTokenForCurrentUser();
    const rt = getRefreshToken();
    if (rt) {
      try {
        await authApi.logout(rt);
      } catch {
        // best-effort
      }
    }
    await setTokens(null, null);
    dispatch({ type: 'SET_USER', user: null });
  }, []);

  const deleteAccount = useCallback(async (): Promise<void> => {
    // DELETE läuft authenticated — Token muss noch da sein. Backend
    // cascadet alle abhängigen Daten (availabilities, matches, meetings,
    // chats, blocks, reports, auth-tokens). Lokal danach gleicher
    // Cleanup wie bei signOut.
    try {
      await userApi.deleteMe();
    } catch (err) {
      // Selbst wenn der Backend-Call fehlschlägt: lokal ausloggen, sonst
      // wirkt es als ob nichts passiert. Der User kann's nochmal probieren.
      // eslint-disable-next-line no-console
      console.warn('[delete] backend delete failed, signing out locally:', err);
    }
    await setTokens(null, null);
    dispatch({ type: 'SET_USER', user: null });
  }, []);

  const registerUser = useCallback(
    async (payload: { pseudonym: string; email: string }): Promise<User> => {
      const fromBackend = await backendCreateUser(payload).catch(() => null);
      const user = fromBackend ?? mockRegister(payload);
      dispatch({ type: 'SET_USER', user });
      return user;
    },
    [],
  );

  const saveUserToBackend = useCallback(
    async (patch: Partial<User>): Promise<void> => {
      // Always update local state immediately.
      dispatch({ type: 'UPDATE_USER', patch });
      if (!state.currentUser) return;
      const updated = await backendUpdateUser(state.currentUser.id, patch).catch(() => null);
      if (updated) {
        // Keep canonical id/initials from backend in sync.
        dispatch({ type: 'SET_USER', user: updated });
      }
    },
    [state.currentUser],
  );

  const saveAvailabilityToBackend = useCallback(
    async (availability: Availability): Promise<void> => {
      // Append-only model: the backend supports multiple slots per user, so
      // we add to local state immediately and reconcile with the persisted
      // version (its id may differ from the optimistic one).
      dispatch({ type: 'ADD_AVAILABILITY', availability });
      const persisted = await backendSaveAvailability(availability).catch(() => null);
      if (persisted) {
        dispatch({ type: 'REMOVE_AVAILABILITY', id: availability.id });
        dispatch({ type: 'ADD_AVAILABILITY', availability: persisted });
      }
    },
    [],
  );

  const removeAvailability = useCallback(
    async (availabilityId: string): Promise<void> => {
      dispatch({ type: 'REMOVE_AVAILABILITY', id: availabilityId });
      // Best-effort persistence; offline removal stays local-only.
      try {
        await availabilityApi.remove(availabilityId);
      } catch (err) {
        if (!isApiUnavailable(err)) {
          // eslint-disable-next-line no-console
          console.warn('[availability] backend delete failed:', err);
        }
      }
    },
    [],
  );

  const addAvailability = useCallback((availability: Availability) => {
    dispatch({ type: 'ADD_AVAILABILITY', availability });
  }, []);

  const replaceMyAvailabilities = useCallback(
    (list: Availability[]) => {
      if (!state.currentUser) return;
      dispatch({ type: 'REPLACE_AVAILABILITIES', userId: state.currentUser.id, list });
    },
    [state.currentUser],
  );

  const recomputeMatches = useCallback((): Match[] => {
    if (!state.currentUser) return [];
    const myAvailabilities = state.availabilities.filter((a) => a.userId === state.currentUser!.id);
    if (myAvailabilities.length === 0) {
      dispatch({ type: 'SET_MATCHES', matches: [] });
      return [];
    }
    const candidates = state.users
      .filter((u) => u.id !== state.currentUser!.id)
      .flatMap((u) =>
        state.availabilities
          .filter((a) => a.userId === u.id)
          .map((a) => ({ user: u, availability: a })),
      );

    const result = findMatches({
      user: state.currentUser,
      myAvailabilities,
      candidates,
      cafes: state.cafes,
    });

    // Carry over status of any matches we'd already confirmed/declined.
    const merged = result.map((m) => {
      const existing = state.matches.find(
        (e) => e.userBId === m.userBId && e.suggestedDate === m.suggestedDate,
      );
      if (existing) return { ...m, id: existing.id, status: existing.status };
      return m;
    });

    dispatch({ type: 'SET_MATCHES', matches: merged });
    return merged;
  }, [state.currentUser, state.users, state.availabilities, state.cafes, state.matches]);

  const fetchMatches = useCallback(async (): Promise<Match[]> => {
    if (!state.currentUser) return [];
    const fromBackend = await backendFindMatches(state.currentUser.id).catch(() => null);
    if (fromBackend && fromBackend.length > 0) {
      // Keep statuses we'd already locally accepted/declined.
      const merged = fromBackend.map((m) => {
        const existing = state.matches.find(
          (e) => e.userBId === m.userBId && e.suggestedDate === m.suggestedDate,
        );
        return existing ? { ...m, id: existing.id, status: existing.status } : m;
      });
      dispatch({ type: 'SET_MATCHES', matches: merged });

      // Lade fehlende Match-Partner + vorgeschlagene Cafés parallel nach.
      // Ohne die zwei filtert MatchScreen die Zeilen via
      // ``if (!other || !cafe) return null`` silent raus — User sieht
      // dann eine leere Liste obwohl die Matches längst in der DB sind.
      const knownUserIds = new Set(state.users.map((u) => u.id));
      const knownCafeIds = new Set(state.cafes.map((c) => c.id));
      // Sammle Partner-IDs in beide Richtungen: nach dem De-Dup-Fix können
      // wir in einer Match-Row entweder user_a oder user_b sein.
      const partnerIds = new Set<string>();
      const meId = state.currentUser.id;
      for (const m of merged) {
        if (m.userAId && m.userAId !== meId) partnerIds.add(m.userAId);
        if (m.userBId && m.userBId !== meId) partnerIds.add(m.userBId);
      }
      const missingUserIds = [...partnerIds].filter((id) => !knownUserIds.has(id));
      const missingCafeIds = [
        ...new Set(
          merged.map((m) => m.suggestedCafeId).filter((id) => id && !knownCafeIds.has(id)),
        ),
      ];

      const [fetchedUsers, fetchedCafes] = await Promise.all([
        Promise.all(
          missingUserIds.map((id) => userApi.get(id).then(apiUserToLocal).catch(() => null)),
        ),
        Promise.all(
          missingCafeIds.map((id) => cafeApi.get(id).then(apiCafeToLocal).catch(() => null)),
        ),
      ]);

      const newUsers = fetchedUsers.filter((u): u is User => u !== null);
      const newCafes = fetchedCafes.filter((c): c is Cafe => c !== null);
      if (newUsers.length > 0) dispatch({ type: 'MERGE_USERS', users: newUsers });
      if (newCafes.length > 0) dispatch({ type: 'MERGE_CAFES', cafes: newCafes });

      return merged;
    }
    // Backend offline or empty — fall back to the local matcher.
    return recomputeMatches();
  }, [state.currentUser, state.matches, state.users, recomputeMatches]);

  const updateMatch = useCallback((id: string, patch: Partial<Match>) => {
    dispatch({ type: 'UPDATE_MATCH', id, patch });
  }, []);

  const confirmMatch = useCallback(
    (matchId: string): Meeting | null => {
      const match = state.matches.find((m) => m.id === matchId);
      if (!match) return null;
      const meeting = createMeeting(match);
      dispatch({ type: 'UPDATE_MATCH', id: matchId, patch: { status: 'accepted' } });
      dispatch({ type: 'ADD_MEETING', meeting });
      return meeting;
    },
    [state.matches],
  );

  const cancelMatch = useCallback((matchId: string) => {
    dispatch({ type: 'UPDATE_MATCH', id: matchId, patch: { status: 'declined' } });
  }, []);

  const sendChatMessage = useCallback(
    async (
      matchId: string,
      text: string,
    ): Promise<{ ok: boolean; reason?: string; warnings?: string[] }> => {
      if (!state.currentUser) return { ok: false, reason: 'Nicht eingeloggt.' };

      try {
        const res = await chatApi.send(matchId, {
          sender_id: state.currentUser.id,
          text,
        });
        if (res.ok && res.message) {
          // Backend liefert plaintext + alle Metadaten. Wir verschlüsseln
          // lokal mit dem XOR-Mock, damit der lokale State weiter ein
          // einheitliches Format hat (LimitedChatScreen erwartet
          // encryptedText). Der "echte" Krypto-Schritt passiert backend-
          // seitig per Fernet.
          dispatch({
            type: 'ADD_MESSAGE',
            message: {
              id: res.message.id,
              matchId: res.message.match_id,
              senderId: res.message.sender_id,
              encryptedText: encryptMessage(res.message.text),
              createdAt: res.message.created_at,
              messageNumber: res.message.message_number,
            },
          });
        }
        return { ok: res.ok, reason: res.reason || undefined };
      } catch (err) {
        if (isApiUnavailable(err)) {
          // Offline: behalte die alte Mock-Logik damit lokales Testen weiter
          // tut. Wer mit echtem Backend arbeitet sieht den Fehler nie.
          const result = sendMessage({
            messages: state.chatMessages,
            matchId,
            senderId: state.currentUser.id,
            text,
          });
          if (result.ok && result.message) {
            dispatch({ type: 'ADD_MESSAGE', message: result.message });
          }
          return { ok: result.ok, reason: result.reason, warnings: result.warnings };
        }
        // eslint-disable-next-line no-console
        console.error('[chat] send failed:', err);
        return { ok: false, reason: 'Nachricht konnte nicht gesendet werden.' };
      }
    },
    [state.chatMessages, state.currentUser],
  );

  const loadChatMessages = useCallback(
    async (matchId: string): Promise<void> => {
      try {
        const apiMessages = await chatApi.list(matchId);
        const local: ChatMessage[] = apiMessages.map((m) => ({
          id: m.id,
          matchId: m.match_id,
          senderId: m.sender_id,
          encryptedText: encryptMessage(m.text),
          createdAt: m.created_at,
          messageNumber: m.message_number,
        }));
        dispatch({ type: 'REPLACE_CHAT_MESSAGES', matchId, messages: local });
      } catch (err) {
        if (!isApiUnavailable(err)) {
          // eslint-disable-next-line no-console
          console.warn('[chat] load failed:', err);
        }
      }
    },
    [],
  );

  const checkInToMeeting = useCallback(
    async (
      meetingId: string,
      qrToken: string,
    ): Promise<{ ok: boolean; reason?: string }> => {
      const meeting = state.meetings.find((m) => m.id === meetingId);
      if (!meeting) return { ok: false, reason: 'Treffen nicht gefunden.' };
      if (!state.currentUser) return { ok: false, reason: 'Nicht angemeldet.' };

      const result = await backendCheckInMeeting(meetingId, qrToken).catch(() => null);

      if (result === null) {
        // Backend unreachable — fall back to local-only simulation. We still
        // require the token to at least equal the meeting's stored QR so the
        // mock flow validates the camera roundtrip.
        if (qrToken !== meeting.qrCode) {
          return { ok: false, reason: 'QR-Code passt nicht zu diesem Treffen.' };
        }
        const updated = simulateCheckIn(meeting, state.currentUser.id);
        dispatch({ type: 'UPDATE_MEETING', id: meetingId, meeting: updated });
        return { ok: true };
      }

      if (!result.ok) return { ok: false, reason: result.reason };

      dispatch({ type: 'UPDATE_MEETING', id: meetingId, meeting: result.meeting });
      return { ok: true };
    },
    [state.meetings, state.currentUser],
  );

  const simulateOtherUserCheckIn = useCallback(
    (meetingId: string, userId: string) => {
      const meeting = state.meetings.find((m) => m.id === meetingId);
      if (!meeting) return;
      const updated = simulateCheckIn(meeting, userId);
      dispatch({ type: 'UPDATE_MEETING', id: meetingId, meeting: updated });
    },
    [state.meetings],
  );

  const cancelMeeting = useCallback(
    async (meetingId: string): Promise<void> => {
      const meeting = state.meetings.find((m) => m.id === meetingId);
      if (!meeting) return;
      // Optimistic local update; backend confirms or no-ops if offline.
      dispatch({
        type: 'UPDATE_MEETING',
        id: meetingId,
        meeting: { ...meeting, status: 'cancelled' },
      });
      try {
        const updated = await meetingApi.update(meetingId, { status: 'cancelled' });
        dispatch({ type: 'UPDATE_MEETING', id: meetingId, meeting: apiMeetingToLocal(updated) });
      } catch (err) {
        if (!isApiUnavailable(err)) {
          // eslint-disable-next-line no-console
          console.warn('[meeting] cancel failed:', err);
        }
      }
    },
    [state.meetings],
  );

  const rescheduleMeeting = useCallback(
    async (
      meetingId: string,
      patch: { date?: string; startTime?: string; endTime?: string; cafeId?: string },
    ): Promise<{ ok: boolean; reason?: string }> => {
      const meeting = state.meetings.find((m) => m.id === meetingId);
      if (!meeting) return { ok: false, reason: 'Treffen nicht gefunden.' };
      const apiPatch = {
        date: patch.date,
        start_time: patch.startTime,
        end_time: patch.endTime,
        cafe_id: patch.cafeId,
      };
      // Local optimistic update.
      dispatch({
        type: 'UPDATE_MEETING',
        id: meetingId,
        meeting: {
          ...meeting,
          date: patch.date ?? meeting.date,
          startTime: patch.startTime ?? meeting.startTime,
          endTime: patch.endTime ?? meeting.endTime,
          cafeId: patch.cafeId ?? meeting.cafeId,
        },
      });
      try {
        const updated = await meetingApi.update(meetingId, apiPatch);
        dispatch({ type: 'UPDATE_MEETING', id: meetingId, meeting: apiMeetingToLocal(updated) });
        return { ok: true };
      } catch (err) {
        if (isApiUnavailable(err)) return { ok: true }; // Local-only succeeded.
        if (err instanceof ApiError) return { ok: false, reason: err.detail ?? err.message };
        return { ok: false, reason: err instanceof Error ? err.message : 'Unbekannter Fehler.' };
      }
    },
    [state.meetings],
  );

  const markMeetingNoShow = useCallback(
    (meetingId: string) => {
      const meeting = state.meetings.find((m) => m.id === meetingId);
      if (!meeting) return;
      const updated = recomputeStatusFromCheckIns({ ...meeting, status: 'no_show' });
      dispatch({ type: 'UPDATE_MEETING', id: meetingId, meeting: updated });
    },
    [state.meetings],
  );

  const registerSelfNoShow = useCallback(() => {
    if (!state.currentUser) return;
    dispatch({ type: 'REGISTER_NO_SHOW', userId: state.currentUser.id });
  }, [state.currentUser]);

  const getCafe = useCallback((id: string) => state.cafes.find((c) => c.id === id), [state.cafes]);
  const getUser = useCallback((id: string) => state.users.find((u) => u.id === id), [state.users]);
  const getMeetingByMatch = useCallback(
    (matchId: string) => state.meetings.find((m) => m.matchId === matchId),
    [state.meetings],
  );

  const value = useMemo<AppContextValue>(
    () => ({
      ...state,
      authBootstrapping,
      signUp,
      signIn,
      signOut,
      signOutEverywhere,
      deleteAccount,
      setCurrentUser,
      updateUser,
      registerUser,
      saveUserToBackend,
      saveAvailabilityToBackend,
      removeAvailability,
      fetchMatches,
      addAvailability,
      replaceMyAvailabilities,
      recomputeMatches,
      updateMatch,
      confirmMatch,
      cancelMatch,
      sendChatMessage,
      loadChatMessages,
      checkInToMeeting,
      simulateOtherUserCheckIn,
      cancelMeeting,
      rescheduleMeeting,
      markMeetingNoShow,
      registerSelfNoShow,
      getCafe,
      getUser,
      getMeetingByMatch,
    }),
    [
      state,
      authBootstrapping,
      signUp,
      signIn,
      signOut,
      signOutEverywhere,
      deleteAccount,
      setCurrentUser,
      updateUser,
      registerUser,
      saveUserToBackend,
      saveAvailabilityToBackend,
      removeAvailability,
      fetchMatches,
      addAvailability,
      replaceMyAvailabilities,
      recomputeMatches,
      updateMatch,
      confirmMatch,
      cancelMatch,
      sendChatMessage,
      loadChatMessages,
      checkInToMeeting,
      simulateOtherUserCheckIn,
      cancelMeeting,
      rescheduleMeeting,
      markMeetingNoShow,
      registerSelfNoShow,
      getCafe,
      getUser,
      getMeetingByMatch,
    ],
  );

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
};

export function useApp(): AppContextValue {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used inside AppStateProvider');
  return ctx;
}
