/**
 * Token persistence with an in-memory cache.
 *
 * Stores both an **access token** (short-lived JWT, sent on every request)
 * and a **refresh token** (opaque, long-lived, server-rotated). The access
 * token is exposed synchronously for the apiClient; the refresh token only
 * comes out via getRefreshToken() and is used by the 401 retry path.
 *
 * AsyncStorage works on iOS, Android, and (via a localStorage shim) the web
 * preview, so this single module covers all targets.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';

const ACCESS_KEY = 'sipsocial.auth.token';
const REFRESH_KEY = 'sipsocial.auth.refresh';

let cachedAccess: string | null = null;
let cachedRefresh: string | null = null;
let restored = false;

export async function restoreToken(): Promise<string | null> {
  if (!restored) {
    try {
      const [a, r] = await Promise.all([
        AsyncStorage.getItem(ACCESS_KEY),
        AsyncStorage.getItem(REFRESH_KEY),
      ]);
      cachedAccess = a;
      cachedRefresh = r;
    } catch {
      cachedAccess = null;
      cachedRefresh = null;
    }
    restored = true;
  }
  return cachedAccess;
}

export function getToken(): string | null {
  return cachedAccess;
}

export function getRefreshToken(): string | null {
  return cachedRefresh;
}

export async function setToken(token: string | null): Promise<void> {
  cachedAccess = token;
  restored = true;
  try {
    if (token) {
      await AsyncStorage.setItem(ACCESS_KEY, token);
    } else {
      await AsyncStorage.removeItem(ACCESS_KEY);
    }
  } catch {
    // best-effort; we still have the value in memory for this session
  }
}

export async function setRefreshToken(token: string | null): Promise<void> {
  cachedRefresh = token;
  restored = true;
  try {
    if (token) {
      await AsyncStorage.setItem(REFRESH_KEY, token);
    } else {
      await AsyncStorage.removeItem(REFRESH_KEY);
    }
  } catch {
    // best-effort
  }
}

export async function setTokens(
  access: string | null,
  refresh: string | null,
): Promise<void> {
  await Promise.all([setToken(access), setRefreshToken(refresh)]);
}
