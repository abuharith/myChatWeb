import type { AuthResponse } from '@voidlink/shared';

const BASE = import.meta.env.VITE_API_URL ?? '';

let accessToken: string | null = null;
let refreshInFlight: Promise<AuthResponse | null> | null = null;

export class ApiError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    message: string,
    readonly details?: unknown,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

export function setAccessToken(token: string | null): void {
  accessToken = token;
}

export function getAccessToken(): string | null {
  return accessToken;
}

interface Envelope<T> {
  data: T;
}

async function parse<T>(response: Response): Promise<T> {
  const payload = (await response.json().catch(() => null)) as
    | Envelope<T>
    | { error?: { code?: string; message?: string; details?: unknown } }
    | null;

  if (!response.ok) {
    const error = payload as { error?: { code?: string; message?: string; details?: unknown } };
    throw new ApiError(
      response.status,
      error?.error?.code ?? 'REQUEST_FAILED',
      error?.error?.message ?? 'The request failed',
      error?.error?.details,
    );
  }

  return (payload as Envelope<T>).data;
}

/** Rotates the refresh cookie and updates the in-memory access token. */
export function refreshSession(): Promise<AuthResponse | null> {
  if (!refreshInFlight) {
    refreshInFlight = fetch(`${BASE}/v1/auth/refresh`, {
      method: 'POST',
      credentials: 'include',
    })
      .then(async (response) => {
        if (!response.ok) return null;
        const data = (await response.json()) as Envelope<AuthResponse>;
        setAccessToken(data.data.accessToken);
        return data.data;
      })
      .catch(() => null)
      .finally(() => {
        refreshInFlight = null;
      });
  }
  return refreshInFlight;
}

export async function apiRequest<T>(
  path: string,
  options: { method?: string; body?: unknown; signal?: AbortSignal } = {},
  allowRetry = true,
): Promise<T> {
  const headers: Record<string, string> = { Accept: 'application/json' };
  if (options.body !== undefined) headers['Content-Type'] = 'application/json';
  if (accessToken) headers.Authorization = `Bearer ${accessToken}`;

  const response = await fetch(`${BASE}${path}`, {
    method: options.method ?? 'GET',
    headers,
    credentials: 'include',
    body: options.body === undefined ? undefined : JSON.stringify(options.body),
    signal: options.signal,
  });

  if (response.status === 401 && allowRetry && !path.startsWith('/v1/auth/refresh')) {
    const refreshed = await refreshSession();
    if (refreshed) return apiRequest<T>(path, options, false);
  }

  return parse<T>(response);
}

export const api = {
  get: <T>(path: string, signal?: AbortSignal) => apiRequest<T>(path, { signal }),
  post: <T>(path: string, body?: unknown) => apiRequest<T>(path, { method: 'POST', body }),
  patch: <T>(path: string, body?: unknown) => apiRequest<T>(path, { method: 'PATCH', body }),
  delete: <T>(path: string) => apiRequest<T>(path, { method: 'DELETE' }),
};
