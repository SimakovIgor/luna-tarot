import { api } from './client';
import type { ZodiacSign } from './horoscope';

export interface CompatibilityRequest {
  partnerName: string;
  /** ISO yyyy-MM-dd */
  partnerBirthDate: string;
}

export interface CompatibilityResponse {
  myZodiac: ZodiacSign;
  partnerZodiac: ZodiacSign;
  partnerName: string;
  /** 1..100 — процент совместимости, для шкалы. */
  score: number;
  text: string;
}

export function calculateCompatibility(body: CompatibilityRequest): Promise<CompatibilityResponse> {
  return api<CompatibilityResponse>('/compatibility', { method: 'POST', body });
}
