import { motion } from 'framer-motion';
import styles from './CompatibilityBar.module.css';

interface CompatibilityBarProps {
  /** 1..100 — процент совместимости. */
  score: number;
}

/**
 * Шкала совместимости 1..100 в брендовых тонах: от приглушённого ink к тёплому золоту.
 * Без светофора (красный→зелёный) — чтобы низкая совместимость не читалась как «нет».
 * Маркер сидит на позиции score, число над ним выделено золотом.
 */
export function CompatibilityBar({ score }: CompatibilityBarProps) {
  const clamped = Math.max(1, Math.min(100, Math.round(score)));

  return (
    <div className={styles.wrap}>
      <div className={styles.track} aria-hidden="true">
        <motion.div
          className={styles.fill}
          initial={{ scaleX: 0 }}
          animate={{ scaleX: clamped / 100 }}
          transition={{ duration: 0.9, ease: [0.22, 0.85, 0.3, 1], delay: 0.2 }}
        />
        <motion.div
          className={styles.marker}
          initial={{ left: '0%', opacity: 0 }}
          animate={{ left: `${clamped}%`, opacity: 1 }}
          transition={{ duration: 0.9, ease: [0.22, 0.85, 0.3, 1], delay: 0.2 }}
        >
          <div className={styles.markerValue}>{clamped}%</div>
          <div className={styles.markerDot} />
        </motion.div>
      </div>
      <div className={styles.scale} aria-hidden="true">
        <span>1</span>
        <span>50</span>
        <span>100</span>
      </div>
    </div>
  );
}
