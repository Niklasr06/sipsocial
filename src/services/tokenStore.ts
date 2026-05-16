/**
 * Token persistence with an in-memory cache.
 *
 * AsyncStorage works on iOS, Android, and (via a localStorage shim) the web
 * preview, so this single module covers all targets. The in-memory copy keeps
 * synchronous reads cheap — the API client doesn't have to await on every
 * request.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';

const STORAGE_KEY = 'sipsocial.auth.token';

let cached: string | null = null;
let restored = false;

export async function restoreToken(): Promise<string | null> {
  if (!restored) {
    try {
      cached = await AsyncStorage.getItem(STORAGE_KEY);
    } catch {
      cached = null;
    }
    restored = true;
  }
  return cached;
}

export function getToken(): string | null {
  return cached;
}

export async function setToken(token: string | null): Promise<void> {
  cached = token;
  restored = true;
  try {
    if (token) {
      await AsyncStorage.setItem(STORAGE_KEY, token);
    } else {
      await AsyncStorage.removeItem(STORAGE_KEY);
    }
  } catch {
    // best-effort; we still have the value in memory for this session
  }
}
