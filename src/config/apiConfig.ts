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
  // 45s deckt Render Free Tier Cold-Starts ab (Dyno schläft nach 15 Min,
  // braucht 30–50s zum Aufwachen). Sonst werden die ersten Calls nach
  // einer Pause silently als ApiUnavailableError verworfen — siehe Bug
  // wo Profil-Daten lokal "gespeichert" waren aber DB leer blieb.
  requestTimeoutMs: 45000,
} as const;

export function apiUrl(path: string): string {
  const p = path.startsWith('/') ? path : `/${path}`;
  return `${apiConfig.baseUrl}${p}`;
}
