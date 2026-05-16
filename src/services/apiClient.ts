import { apiConfig, apiUrl } from '../config/apiConfig';
import { getToken } from './tokenStore';

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

async function request<T>(path: string, opts: RequestOptions = {}): Promise<T> {
  if (!apiConfig.isBackendEnabled) {
    throw new ApiUnavailableError('EXPO_PUBLIC_API_URL nicht gesetzt — Backend deaktiviert.');
  }
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), apiConfig.requestTimeoutMs);

  // Attach the bearer token whenever we have one. Keeps unauthenticated
  // endpoints (register/login/health) working — the backend just ignores it.
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    Accept: 'application/json',
  };
  const token = getToken();
  if (token) headers.Authorization = `Bearer ${token}`;

  let res: Response;
  try {
    res = await fetch(apiUrl(path), {
      method: opts.method ?? 'GET',
      headers,
      body: opts.body !== undefined ? JSON.stringify(opts.body) : undefined,
      signal: opts.signal ?? controller.signal,
    });
  } catch (err) {
    clearTimeout(timeout);
    if ((err as { name?: string })?.name === 'AbortError') {
      throw new ApiUnavailableError('Backend antwortet nicht (Timeout).');
    }
    throw new ApiUnavailableError(
      'Backend nicht erreichbar — läuft uvicorn? Fällt automatisch auf lokale Daten zurück.',
    );
  }
  clearTimeout(timeout);

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
