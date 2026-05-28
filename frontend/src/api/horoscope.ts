import { api } from './client';

export type ZodiacSign =
  | 'ARIES' | 'TAURUS' | 'GEMINI' | 'CANCER' | 'LEO' | 'VIRGO'
  | 'LIBRA' | 'SCORPIO' | 'SAGITTARIUS' | 'CAPRICORN' | 'AQUARIUS' | 'PISCES';

export interface HoroscopeResponse {
  /** ISO yyyy-MM-dd */
  date: string;
  zodiac: ZodiacSign | null;
  text: string;
}

export function fetchTodayHoroscope(): Promise<HoroscopeResponse> {
  return api<HoroscopeResponse>('/horoscope/today');
}
