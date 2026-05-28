import { api, setSessionToken } from './client';

interface AuthResponse {
  token: string;
  expiresAtEpochSec: number;
}

export async function loginWithTgInit(initData: string): Promise<AuthResponse> {
  const resp = await api<AuthResponse>('/auth/tg-init', {
    method: 'POST',
    body: { initData },
    skipAuth: true,
  });
  setSessionToken(resp.token);
  return resp;
}
