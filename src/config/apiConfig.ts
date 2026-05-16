/**
 * Runtime configuration sourced from Expo environment variables.
 *
 * - ``EXPO_PUBLIC_API_URL`` enables the FastAPI backend. When empty the app
 *   stays fully local and uses the in-memory mock services.
 * - ``EXPO_PUBLIC_GOOGLE_MAPS_API_KEY`` is only used by the real native map
 *   component; the web fallback ignores it.
 */
const rawBase = (process.env.EXPO_PUBLIC_API_URL ?? '').trim();
const cleanedBase = rawBase.replace(/\/$/, '');

export const apiConfig = {
  baseUrl: cleanedBase,
  isBackendEnabled: cleanedBase.length > 0,
  googleMapsApiKey: (process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY ?? '').trim(),
  requestTimeoutMs: 8000,
} as const;

export function apiUrl(path: string): string {
  const p = path.startsWith('/') ? path : `/${path}`;
  return `${apiConfig.baseUrl}${p}`;
}
