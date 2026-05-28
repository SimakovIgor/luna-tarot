import type { ReactNode } from 'react';
import styles from './StatusLine.module.css';

interface StatusLineProps {
  moonPhase: string;   // напр. "Луна растёт"
  dateLabel: string;   // напр. "17 мая"
  /** Слот справа — для аватарной кнопки или иной точки входа. */
  rightContent?: ReactNode;
}

export function StatusLine({ moonPhase, dateLabel, rightContent }: StatusLineProps) {
  return (
    <header className={styles.top}>
      <div className={styles.moonPhase}>
        <span className={styles.dot} aria-hidden="true" />
        {moonPhase} · {dateLabel}
      </div>
      {rightContent && <div className={styles.right}>{rightContent}</div>}
    </header>
  );
}
