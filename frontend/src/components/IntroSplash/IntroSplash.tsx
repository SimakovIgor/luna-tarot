import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { SparkleField } from '@/components/SparkleField/SparkleField';
import styles from './IntroSplash.module.css';

interface IntroSplashProps {
  onDone?: () => void;
  onSettleCard?: () => void;
  minDurationMs?: number;
}

const TYPED = 'луна тасует карты';

/**
 * Cinematic intro: bg + кольца от центра + центрированное лого + typewriter.
 * Карта живёт глобально в App (DayCard), splash — только overlay вокруг.
 *
 * Лого и typewriter обёрнуты в anchor-div с CSS translateX(-50%),
 * чтобы framer-motion transform на motion-элементах не ломал центрирование.
 */
export function IntroSplash({ onDone, onSettleCard, minDurationMs = 2600 }: IntroSplashProps) {
  const [phase, setPhase] = useState<'in' | 'out'>('in');
  const [typed, setTyped] = useState('');

  useEffect(() => {
    let i = 0;
    const id = window.setInterval(() => {
      i++;
      setTyped(TYPED.slice(0, i));
      if (i >= TYPED.length) window.clearInterval(id);
    }, 70);
    return () => window.clearInterval(id);
  }, []);

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
          <div className={styles.bg} aria-hidden="true" />
          <SparkleField count={70} speed={1.4} />

          <div className={styles.ringsAnchor} aria-hidden="true">
            {[0, 0.45, 0.9].map((delay, i) => (
              <motion.span
                key={i}
                className={styles.ring}
                initial={{ scale: 0.3, opacity: 0 }}
                animate={{ scale: 3.2, opacity: [0, 0.45, 0] }}
                transition={{
                  duration: 2.6,
                  delay,
                  ease: [0.22, 0.85, 0.3, 1],
                  repeat: 0,
                }}
              />
            ))}
          </div>

          {/* «Luna» лого. Anchor держит центрирование, motion-элемент только opacity/y. */}
          <div className={styles.wordmarkAnchor}>
            <motion.img
              src="/app/luna-logo.png"
              alt="Luna"
              className={styles.wordmarkImg}
              draggable={false}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 1.1, delay: 0.25, ease: [0.22, 0.85, 0.3, 1] }}
            />
          </div>

          {/* Подпись typewriter. Тот же приём: anchor + motion. */}
          <div className={styles.subtitleAnchor}>
            <motion.div
              className={styles.subtitle}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.4, delay: 0.9 }}
            >
              <span>{typed}</span>
              <span className={styles.caret} aria-hidden="true">▌</span>
            </motion.div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
