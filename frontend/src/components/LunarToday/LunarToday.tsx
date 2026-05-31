import { useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { haptic } from '@/telegram/webapp';
import {
  getCurrentLunarPhase,
  LUNAR_PHASE_RU,
  LUNAR_PHASE_ADVICE,
  natalEcho,
} from '@/util/lunarPhase';
import type { MeResponse } from '@/api/me';
import { MoonPhaseGlyph } from './MoonPhaseGlyph';
import styles from './LunarToday.module.css';

interface LunarTodayProps {
  /** Нужно для сравнения с натальной фазой (natalEcho) и рода глагола. */
  me: MeResponse;
}

/**
 * Карточка «Луна сегодня» в профиле: SVG-моя с реальной освещённостью,
 * название фазы, день цикла, дни до ближайшего ключевого события +
 * раскрытие совета по тапу.
 *
 * Все расчёты локальны — без бэкенда (см. util/lunarPhase.ts).
 */
export function LunarToday({ me }: LunarTodayProps) {
  const snapshot = useMemo(() => getCurrentLunarPhase(), []);
  const [expanded, setExpanded] = useState(false);

  const phaseRu = LUNAR_PHASE_RU[snapshot.phase];
  const advice = LUNAR_PHASE_ADVICE[snapshot.phase];
  const echo = natalEcho(snapshot.phase, me.lunarPhase, me.gender);

  // Что ближе — новолуние или полнолуние. Если оба 0 — мы сегодня в ключевой
  // точке, показывать «сегодня» вместо «через N дней».
  const headsUp = nextEventLabel(snapshot.phase, snapshot.daysToNew, snapshot.daysToFull);

  const handleToggle = () => {
    haptic('light');
    setExpanded((v) => !v);
  };

  return (
    <button
      type="button"
      className={`${styles.card} ${expanded ? styles.cardOpen : ''}`}
      onClick={handleToggle}
    >
      <div className={styles.row}>
        <div className={styles.moonWrap}>
          <MoonPhaseGlyph position={snapshot.position} size={56} />
        </div>
        <div className={styles.text}>
          <div className={styles.phaseName}>{phaseRu}</div>
          <div className={styles.subline}>
            {snapshot.dayOfCycle} день цикла · {headsUp}
          </div>
        </div>
        <div className={styles.chevron} aria-hidden="true">
          {expanded ? '−' : '+'}
        </div>
      </div>

      <AnimatePresence initial={false}>
        {expanded && (
          <motion.div
            className={styles.expand}
            initial={{ height: 0 }}
            animate={{ height: 'auto' }}
            exit={{ height: 0 }}
            transition={{ duration: 0.32, ease: [0.22, 0.85, 0.3, 1] }}
          >
            {/* Декорации (border, padding) внутри inner-div, чтобы не
                «вспыхивали» на первом кадре height-анимации. */}
            <motion.div
              className={styles.expandInner}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.24, ease: 'easeOut' }}
            >
              <p className={styles.advice}>{advice}</p>
              {echo && <p className={styles.echo}>{echo}</p>}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </button>
  );
}

function nextEventLabel(
  phase: ReturnType<typeof getCurrentLunarPhase>['phase'],
  daysToNew: number,
  daysToFull: number,
): string {
  // В дни ключевых событий показываем «сегодня».
  if (phase === 'NEW') return 'новолуние сегодня';
  if (phase === 'FULL') return 'полнолуние сегодня';
  if (phase === 'FIRST_QUARTER') return 'первая четверть сегодня';
  if (phase === 'LAST_QUARTER') return 'последняя четверть сегодня';
  // Иначе показываем что ближе.
  if (daysToFull <= daysToNew) {
    return `до полнолуния — ${pluralDays(daysToFull)}`;
  }
  return `до новолуния — ${pluralDays(daysToNew)}`;
}

function pluralDays(n: number): string {
  const mod10 = n % 10;
  const mod100 = n % 100;
  if (mod100 >= 11 && mod100 <= 14) return `${n} дней`;
  if (mod10 === 1) return `${n} день`;
  if (mod10 >= 2 && mod10 <= 4) return `${n} дня`;
  return `${n} дней`;
}
