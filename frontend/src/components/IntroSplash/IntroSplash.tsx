import { useEffect, useState, type MutableRefObject } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import styles from './IntroSplash.module.css';

interface IntroSplashProps {
  onDone?: () => void;
  onSettleCard?: () => void;
  minDurationMs?: number;
  /**
   * Общий со StarField на хабе ref скорости звёзд. Splash живёт при calm=0
   * (быстрый разлёт); сразу перед exit App рампит его до 1, и StarField
   * остаётся тот же — переход без перемонтажа canvas.
   */
  calmRef: MutableRefObject<number>;
}

/**
 * Loading-splash в новом языке: золотой полумесяц + PNG-лого + капс-надпись.
 * Звёздное поле общее с HubPage (StarField живёт под обоими через position:fixed),
 * splash рисует только центральный оверлей.
 */
export function IntroSplash({
  onDone,
  onSettleCard,
  minDurationMs = 2400,
  calmRef,
}: IntroSplashProps) {
  // calmRef живёт в App вместе с единственным StarField — splash сам ничего
  // не делает с ним, ramp 0→1 запускается из App в onSettleCard.
  void calmRef;
  const [phase, setPhase] = useState<'in' | 'out'>('in');

  // Карта дня на App-уровне «успокаивается» одновременно со звёздами —
  // settleAt чуть раньше exit, чтобы спин выровнялся к моменту fade.
  useEffect(() => {
    const settleAt = Math.max(700, minDurationMs - 800);
    const outAt = minDurationMs;
    const t1 = window.setTimeout(() => onSettleCard?.(), settleAt);
    const t2 = window.setTimeout(() => setPhase('out'), outAt);
    return () => {
      window.clearTimeout(t1);
      window.clearTimeout(t2);
    };
  }, [minDurationMs, onSettleCard]);

  return (
    <AnimatePresence onExitComplete={onDone}>
      {phase === 'in' && (
        <motion.div
          key="splash"
          className={styles.root}
          initial={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.85, ease: [0.4, 0, 0.2, 1] }}
        >
          {/* StarField живёт в App на всём viewport, splash рисует только overlay. */}
          <motion.div
            className={styles.stage}
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 1.15 }}
            transition={{
              duration: 1.0,
              ease: [0.22, 0.85, 0.3, 1],
            }}
          >
            {/* Золотой полумесяц — inset box-shadow создаёт «серп»,
                drop-shadow filter добавляет тёплое свечение вокруг. */}
            <div className={styles.crescent} aria-hidden="true" />

            <img
              src="/app/luna-logo.png"
              alt="Luna"
              className={styles.logo}
              draggable={false}
            />

            <div className={styles.caption}>Луна тасует карты</div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
