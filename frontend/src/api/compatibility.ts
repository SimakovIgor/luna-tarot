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

/** Запись истории совместимости в Дневнике. */
export interface CompatibilityHistoryItem {
  id: number;
  /** «INITIATOR» — я её запустил, «PARTNER» — меня пригласили. */
  role: 'INITIATOR' | 'PARTNER';
  partnerName: string;
  myZodiac: ZodiacSign;
  partnerZodiac: ZodiacSign;
  score: number;
  text: string;
  /** ISO timestamp. */
  createdAt: string;
}

export function fetchCompatibilityHistory(): Promise<CompatibilityHistoryItem[]> {
  return api<CompatibilityHistoryItem[]>('/compatibility/history');
}
