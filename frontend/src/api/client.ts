/**
 * Тонкий fetch-клиент для бэкенда Luna.
 * Bearer-токен живёт в памяти (sessionToken). При 401 — выбрасываем UnauthorizedError,
 * вызывающий код перезапускает auth-flow.
 */

const API_PREFIX = '/api';

let sessionToken: string | null = null;

export function setSessionToken(token: string | null): void {
  sessionToken = token;
}

export function getSessionToken(): string | null {
  return sessionToken;
}

export class UnauthorizedError extends Error {
  constructor() {
    super('Unauthorized');
    this.name = 'UnauthorizedError';
  }
}

export class ApiError extends Error {
  constructor(
    public readonly status: number,
    public readonly body: string,
  ) {
    super(`API error ${status}: ${body}`);
    this.name = 'ApiError';
  }
}

interface ApiCallOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE';
  body?: unknown;
  skipAuth?: boolean;
}

export async function api<T>(path: string, opts: ApiCallOptions = {}): Promise<T> {
  const { method = 'GET', body, skipAuth = false } = opts;
  const headers: Record<string, string> = {
    Accept: 'application/json',
  };
  if (body !== undefined) {
    headers['Content-Type'] = 'application/json';
  }
  if (!skipAuth && sessionToken) {
    headers.Authorization = `Bearer ${sessionToken}`;
  }
  const res = await fetch(API_PREFIX + path, {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  if (res.status === 401) {
    throw new UnauthorizedError();
  }
  if (!res.ok) {
    const text = await res.text();
    throw new ApiError(res.status, text);
  }
  if (res.status === 204) {
    return undefined as T;
  }
  return res.json() as Promise<T>;
}
