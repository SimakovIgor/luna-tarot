import type { ReactNode } from 'react';
import styles from './EntryCard.module.css';

interface EntryCardProps {
  kicker: string;
  title: string;
  whisper: string;
  icon: ReactNode;
  onClick?: () => void;
  ariaLabel?: string;
}

export function EntryCard({ kicker, title, whisper, icon, onClick, ariaLabel }: EntryCardProps) {
  return (
    <button type="button" className={styles.entry} onClick={onClick} aria-label={ariaLabel ?? title}>
      <span className={styles.icon} aria-hidden="true">{icon}</span>
      <span className={styles.text}>
        <span className={styles.kicker}>{kicker}</span>
        <span className={styles.title}>{title}</span>
        <span className={styles.whisper}>{whisper}</span>
      </span>
      <span className={styles.arrow} aria-hidden="true">→</span>
    </button>
  );
}
