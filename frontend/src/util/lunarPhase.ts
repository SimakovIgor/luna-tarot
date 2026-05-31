/**
 * Расчёт текущей фазы Луны по дате — детерминированная астрономия,
 * никаких API.
 *
 * Синодический месяц = 29.53058868 суток (период между новолуниями).
 * Известная точка отсчёта: новолуние 6 января 2000 года 18:14 UTC.
 * Точность ±несколько часов от реального положения Луны — для UX-блока
 * «фаза сегодня» этого более чем достаточно.
 */

import type { LunarPhase as NatalLunarPhase } from '@/api/me';

/** Синодический месяц в днях. */
const SYNODIC = 29.53058868;
/** UNIX-ms известного новолуния (2000-01-06 18:14 UTC). */
const REF_NEW_MOON = Date.UTC(2000, 0, 6, 18, 14, 0);

export type LunarPhaseKind =
  | 'NEW'
  | 'WAXING_CRESCENT'
  | 'FIRST_QUARTER'
  | 'WAXING_GIBBOUS'
  | 'FULL'
  | 'WANING_GIBBOUS'
  | 'LAST_QUARTER'
  | 'WANING_CRESCENT';

export interface LunarSnapshot {
  /** 0..1 — позиция в синодическом цикле (0=новолуние, 0.5=полнолуние). */
  position: number;
  /** 0..1 — доля освещённости диска. */
  illumination: number;
  /** Дискретная фаза. */
  phase: LunarPhaseKind;
  /** День цикла, 1..30. */
  dayOfCycle: number;
  /** Целое число дней до следующего новолуния (0 если сегодня). */
  daysToNew: number;
  /** Целое число дней до следующего полнолуния (0 если сегодня). */
  daysToFull: number;
}

export function getCurrentLunarPhase(now: Date = new Date()): LunarSnapshot {
  const daysSinceRef = (now.getTime() - REF_NEW_MOON) / 86_400_000;
  // Точка в цикле, 0..SYNODIC. Кручу через ((x % S) + S) % S чтобы поддержать
  // даты до точки отсчёта (отрицательный остаток нормализуется).
  const cycleDay = ((daysSinceRef % SYNODIC) + SYNODIC) % SYNODIC;
  const position = cycleDay / SYNODIC;

  // Освещённость = (1 - cos(2πp)) / 2 — стандартная формула для модели
  // освещённой полусферы, видимой с Земли.
  const illumination = (1 - Math.cos(2 * Math.PI * position)) / 2;

  return {
    position,
    illumination,
    phase: positionToPhase(position),
    dayOfCycle: Math.floor(cycleDay) + 1,
    daysToNew: Math.max(0, Math.round(SYNODIC - cycleDay)),
    daysToFull: Math.max(0, Math.round((position < 0.5 ? 0.5 - position : 1.5 - position) * SYNODIC)),
  };
}

function positionToPhase(p: number): LunarPhaseKind {
  // 8 равных секторов с небольшими «коридорами» вокруг ключевых точек
  // (0, 0.25, 0.5, 0.75) чтобы день стыка не дёргался между фазами.
  if (p < 0.03 || p > 0.97) return 'NEW';
  if (p < 0.22) return 'WAXING_CRESCENT';
  if (p < 0.28) return 'FIRST_QUARTER';
  if (p < 0.47) return 'WAXING_GIBBOUS';
  if (p < 0.53) return 'FULL';
  if (p < 0.72) return 'WANING_GIBBOUS';
  if (p < 0.78) return 'LAST_QUARTER';
  return 'WANING_CRESCENT';
}

/** Русское название фазы. */
export const LUNAR_PHASE_RU: Record<LunarPhaseKind, string> = {
  NEW:              'Новая Луна',
  WAXING_CRESCENT:  'Растущий месяц',
  FIRST_QUARTER:    'Первая четверть',
  WAXING_GIBBOUS:   'Растущая полная',
  FULL:             'Полная Луна',
  WANING_GIBBOUS:   'Убывающая полная',
  LAST_QUARTER:     'Последняя четверть',
  WANING_CRESCENT:  'Убывающий месяц',
};

/** Короткий совет под фазой — «что сейчас делать». */
export const LUNAR_PHASE_ADVICE: Record<LunarPhaseKind, string> = {
  NEW:              'Начало цикла. Время загадывать новое и начинать.',
  WAXING_CRESCENT:  'Идеи только проклёвываются — поливай их вниманием.',
  FIRST_QUARTER:    'Решающий шаг. Любое сомнение — двигай вперёд.',
  WAXING_GIBBOUS:   'Силы копятся. Доводи начатое до конца.',
  FULL:             'Пик силы. Кульминация. Интуиция громче слов.',
  WANING_GIBBOUS:   'Отпусти лишнее. Делиться важнее, чем держать.',
  LAST_QUARTER:     'Подведи черту, попрощайся с тем, что отжило.',
  WANING_CRESCENT:  'Тишина и отдых. Слушай — Луна шепчет.',
};

/** Маппинг бэкендовских фаз (рассчитанных по натальной дате) к нашим. */
const BACKEND_PHASE_TO_KIND: Record<NatalLunarPhase, LunarPhaseKind> = {
  NEW:              'NEW',
  WAXING_CRESCENT:  'WAXING_CRESCENT',
  FIRST_QUARTER:    'FIRST_QUARTER',
  WAXING_GIBBOUS:   'WAXING_GIBBOUS',
  FULL:             'FULL',
  WANING_GIBBOUS:   'WANING_GIBBOUS',
  LAST_QUARTER:     'LAST_QUARTER',
  WANING_CRESCENT:  'WANING_CRESCENT',
};

/**
 * Если сегодня та же фаза, в которую человек родился — «натальное эхо»:
 * усиление личной темы. Возвращает текст-эффект или null если фаз нет/не совпали.
 */
export function natalEcho(
  current: LunarPhaseKind,
  natal: NatalLunarPhase | null | undefined,
  gender: 'MALE' | 'FEMALE' | 'UNSPECIFIED' | undefined,
): string | null {
  if (!natal) return null;
  if (BACKEND_PHASE_TO_KIND[natal] !== current) return null;
  const bornIn = gender === 'FEMALE' ? 'Ты родилась' : 'Ты родился';
  return `${bornIn} в эту же фазу — Луна сегодня резонирует с твоим внутренним ритмом.`;
}
