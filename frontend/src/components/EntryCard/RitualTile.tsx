import type { ReactNode } from 'react';
import { motion } from 'framer-motion';
import styles from './RitualTile.module.css';

interface RitualTileProps {
  /** SVG-силуэт layout-а 24×24. */
  icon: ReactNode;
  /** Имя расклада. Разрешено wrap на 2 строки. */
  title: string;
  /** Конкретная подпись «что было · что есть · что будет» и т.п. */
  meta: string;
  /** Кол-во карт в раскладе — показывается маленьким бейджем в правом верхнем углу. */
  cardCount?: number;
  /** Не используется в UI — оставлен для совместимости / возможного returning. */
  accent?: string;
  delayMs?: number;
  onClick?: () => void;
}

/**
 * Горизонтальная плитка ритуала: иконка слева, имя и краткая подпись справа.
 * Без accent-символа в углу — он сжимал колонку текста и провоцировал обрезку.
 */
export function RitualTile({ icon, title, meta, cardCount, delayMs = 0, onClick }: RitualTileProps) {
  return (
    <motion.button
      type="button"
      className={styles.tile}
      onClick={onClick}
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: delayMs / 1000, duration: 0.5, ease: [0.22, 0.85, 0.3, 1] }}
      whileTap={{ scale: 0.97 }}
    >
      <span className={styles.icon} aria-hidden="true">{icon}</span>
      <span className={styles.text}>
        <span className={styles.title}>{title}</span>
        <span className={styles.meta}>{meta}</span>
      </span>
      {cardCount !== undefined && (
        <span className={styles.cardCount} aria-label={`${cardCount} карт`}>
          {cardCount}
        </span>
      )}
    </motion.button>
  );
}
