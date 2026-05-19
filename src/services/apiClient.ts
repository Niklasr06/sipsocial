import { apiConfig, apiUrl } from '../config/apiConfig';
import { getRefreshToken, getToken, setTokens } from './tokenStore';

export class ApiUnavailableError extends Error {
  constructor(message = 'Backend ist nicht erreichbar.') {
    super(message);
    this.name = 'ApiUnavailableError';
  }
}

export class ApiError extends Error {
  status: number;
  detail?: string;
  constructor(message: string, status: number, detail?: string) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.detail = detail;
  }
}

interface RequestOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  body?: unknown;
  signal?: AbortSignal;
}

// Render Free Tier schläft nach 15 Min und braucht 30-50s zum Aufwachen.
// Wir tracken jeden Request, der länger als ``SLOW_REQUEST_MS`` läuft, und
// notifizieren die UI — damit der User „Server wacht auf…" sieht statt
// nur einen stummen Spinner.
const SLOW_REQUEST_MS = 5000;
type SlowListener = (slowInFlight: number) => void;
const slowListeners = new Set<SlowListener>();
let slowInFlight = 0;

function notifySlow(): void {
  slowListeners.forEach((fn) => fn(slowInFlight));
}

export function onSlowRequest(fn: SlowListener): () => void {
  slowListeners.add(fn);
  fn(slowInFlight);
  return () => {
    slowListeners.delete(fn);
  };
}

// Coalesce concurrent refreshes — if 5 requests fail with 401 at once, only
// one /auth/refresh call should fire, and the others wait on that promise.
let refreshInFlight: Promise<boolean> | null = null;

async function attemptRefresh(): Promise<boolean> {
  if (refreshInFlight) return refreshInFlight;
  const rt = getRefreshToken();
  if (!rt) return false;

  refreshInFlight = (async () => {
    try {
      const res = await fetch(apiUrl('/api/auth/refresh'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({ refresh_token: rt }),
      });
      if (!res.ok) {
        // Refresh failed → drop both tokens so the next render shows onboarding.
        await setTokens(null, null);
        return false;
      }
      const data = (await res.json().catch(() => null)) as
        | { token?: string; refresh_token?: string }
        | null;
      if (!data?.token || !data?.refresh_token) {
        await setTokens(null, null);
        return false;
      }
      await setTokens(data.token, data.refresh_token);
      return true;
    } catch {
      return false;
    } finally {
      refreshInFlight = null;
    }
  })();
  return refreshInFlight;
}

async function doFetch(path: string, opts: RequestOptions): Promise<Response> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), apiConfig.requestTimeoutMs);

  let slowFlagged = false;
  const slowTimer = setTimeout(() => {
    slowFlagged = true;
    slowInFlight += 1;
    notifySlow();
  }, SLOW_REQUEST_MS);

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    Accept: 'application/json',
  };
  const token = getToken();
  if (token) headers.Authorization = `Bearer ${token}`;

  try {
    return await fetch(apiUrl(path), {
      method: opts.method ?? 'GET',
      headers,
      body: opts.body !== undefined ? JSON.stringify(opts.body) : undefined,
      signal: opts.signal ?? controller.signal,
    });
  } finally {
    clearTimeout(timeout);
    clearTimeout(slowTimer);
    if (slowFlagged) {
      slowInFlight = Math.max(0, slowInFlight - 1);
      notifySlow();
    }
  }
}

async function request<T>(path: string, opts: RequestOptions = {}): Promise<T> {
  if (!apiConfig.isBackendEnabled) {
    throw new ApiUnavailableError('EXPO_PUBLIC_API_URL nicht gesetzt — Backend deaktiviert.');
  }

  let res: Response;
  try {
    res = await doFetch(path, opts);
  } catch (err) {
    if ((err as { name?: string })?.name === 'AbortError') {
      throw new ApiUnavailableError('Backend antwortet nicht (Timeout).');
    }
    throw new ApiUnavailableError(
      'Backend nicht erreichbar — läuft uvicorn? Fällt automatisch auf lokale Daten zurück.',
    );
  }

  // 401 + we have a refresh token → try once, then retry the original request.
  // We deliberately don't auto-refresh on the /auth/* routes to avoid loops.
  if (res.status === 401 && !path.startsWith('/api/auth/') && getRefreshToken()) {
    const refreshed = await attemptRefresh();
    if (refreshed) {
      try {
        res = await doFetch(path, opts);
      } catch (err) {
        if ((err as { name?: string })?.name === 'AbortError') {
          throw new ApiUnavailableError('Backend antwortet nicht (Timeout).');
        }
        throw new ApiUnavailableError('Backend nicht erreichbar.');
      }
    }
  }

  const contentType = res.headers.get('content-type') ?? '';
  const data = contentType.includes('application/json')
    ? await res.json().catch(() => null)
    : await res.text().catch(() => null);

  if (!res.ok) {
    const detail = typeof data === 'object' && data !== null ? (data as { detail?: string }).detail : undefined;
    throw new ApiError(
      detail ?? `HTTP ${res.status}`,
      res.status,
      typeof data === 'string' ? data : undefined,
    );
  }

  return data as T;
}

export const apiClient = {
  get: <T>(path: string, signal?: AbortSignal) => request<T>(path, { method: 'GET', signal }),
  post: <T>(path: string, body?: unknown) => request<T>(path, { method: 'POST', body }),
  put: <T>(path: string, body?: unknown) => request<T>(path, { method: 'PUT', body }),
  patch: <T>(path: string, body?: unknown) => request<T>(path, { method: 'PATCH', body }),
  del: <T>(path: string) => request<T>(path, { method: 'DELETE' }),
};

export function isApiUnavailable(err: unknown): err is ApiUnavailableError {
  return err instanceof ApiUnavailableError;
}
