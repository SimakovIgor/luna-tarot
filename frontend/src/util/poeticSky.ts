import type { MeResponse } from '@/api/me';
import { ZODIAC_INFO } from '@/zodiac';
import type { ZodiacSign } from '@/api/horoscope';

/**
 * Короткая поэтическая фраза для блока «Твоё небо».
 *
 * Собирается ЛОКАЛЬНО из эзо-профиля (zodiac + lifePathNumber + lunarPhase)
 * без LLM. Шаблон: «Рожден{а} в {фазу} Луну — {образ}. {Знак} с числом
 * {N} ищ{ут|ет} {что}».
 *
 * Если каких-то полей нет — фраза собирается из того, что есть, без
 * заглушек-многоточий.
 */
export function buildPoeticSkyLine(me: MeResponse): string {
  const phasePart = lunarPhaseClause(me);
  const zodiacPart = zodiacClause(me);
  // Соединяем через тире, если обе части непустые. Иначе берём ту, что есть.
  if (phasePart && zodiacPart) {
    return `${phasePart} — ${zodiacPart}.`;
  }
  if (phasePart) return `${phasePart}.`;
  if (zodiacPart) return `${capitalize(zodiacPart)}.`;
  return 'Твоё небо ещё пишется Луной.';
}

const PHASE_IMAGES: Record<string, string> = {
  NEW:                'интуиция шепчет тише, чем хочется',
  WAXING_CRESCENT:    'идеи только проклёвываются',
  FIRST_QUARTER:      'каждое решение — шаг',
  WAXING_GIBBOUS:     'силы копятся',
  FULL:               'интуиция громче слов',
  WANING_GIBBOUS:     'пора отпускать лишнее',
  LAST_QUARTER:       'тебе важно подвести черту',
  WANING_CRESCENT:    'умение слышать тишину — твой дар',
};

function lunarPhaseClause(me: MeResponse): string | null {
  if (!me.lunarPhase) return null;
  const image = PHASE_IMAGES[me.lunarPhase];
  if (!image) return null;
  const phaseLabel = phaseToShortRu(me.lunarPhase);
  const bornVerb = me.gender === 'FEMALE' ? 'Рождена' : 'Рождён';
  return `${bornVerb} в ${phaseLabel} Луну — ${image}`;
}

function phaseToShortRu(phase: string): string {
  switch (phase) {
    case 'NEW':                return 'новую';
    case 'WAXING_CRESCENT':    return 'растущую';
    case 'FIRST_QUARTER':      return 'первой четверти';
    case 'WAXING_GIBBOUS':     return 'почти полную';
    case 'FULL':               return 'полную';
    case 'WANING_GIBBOUS':     return 'убывающую';
    case 'LAST_QUARTER':       return 'последней четверти';
    case 'WANING_CRESCENT':    return 'тающую';
    default:                   return 'свою';
  }
}

const ZODIAC_QUEST: Record<ZodiacSign, string> = {
  ARIES:       'идут первыми и зажигают',
  TAURUS:      'ищут опору и тёплое тело',
  GEMINI:      'играют двумя голосами разом',
  CANCER:      'строят дом для своих чувств',
  LEO:         'хотят, чтобы их видели',
  VIRGO:       'наводят порядок в хаосе',
  LIBRA:       'ищут гармонию между двух',
  SCORPIO:     'идут вглубь, где другим страшно',
  SAGITTARIUS: 'летят на свет дальше горизонта',
  CAPRICORN:   'строят медленно, но надолго',
  AQUARIUS:    'видят то, чего ещё не видно',
  PISCES:      'ищут не ответы, а смысл',
};

function zodiacClause(me: MeResponse): string | null {
  if (!me.zodiac) return null;
  const z = me.zodiac as ZodiacSign;
  const sign = ZODIAC_INFO[z]?.sign;
  if (!sign) return null;
  const quest = ZODIAC_QUEST[z];
  if (me.lifePathNumber && me.lifePathNumber > 0) {
    return `${sign} с числом ${me.lifePathNumber} ${quest}`;
  }
  return `${sign} ${quest}`;
}

function capitalize(s: string): string {
  if (!s) return s;
  return s.charAt(0).toUpperCase() + s.slice(1);
}
