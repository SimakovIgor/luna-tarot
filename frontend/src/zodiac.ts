import type { ZodiacSign } from './api/horoscope';

export interface ZodiacInfo {
  sign: string;
  symbol: string;
  element: 'fire' | 'earth' | 'air' | 'water';
}

export const ZODIAC_INFO: Record<ZodiacSign, ZodiacInfo> = {
  ARIES:       { sign: 'Овен',      symbol: '♈', element: 'fire' },
  TAURUS:      { sign: 'Телец',     symbol: '♉', element: 'earth' },
  GEMINI:      { sign: 'Близнецы',  symbol: '♊', element: 'air' },
  CANCER:      { sign: 'Рак',       symbol: '♋', element: 'water' },
  LEO:         { sign: 'Лев',       symbol: '♌', element: 'fire' },
  VIRGO:       { sign: 'Дева',      symbol: '♍', element: 'earth' },
  LIBRA:       { sign: 'Весы',      symbol: '♎', element: 'air' },
  SCORPIO:     { sign: 'Скорпион',  symbol: '♏', element: 'water' },
  SAGITTARIUS: { sign: 'Стрелец',   symbol: '♐', element: 'fire' },
  CAPRICORN:   { sign: 'Козерог',   symbol: '♑', element: 'earth' },
  AQUARIUS:    { sign: 'Водолей',   symbol: '♒', element: 'air' },
  PISCES:      { sign: 'Рыбы',      symbol: '♓', element: 'water' },
};
