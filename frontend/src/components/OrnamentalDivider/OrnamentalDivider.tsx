import styles from './OrnamentalDivider.module.css';

interface OrnamentalDividerProps {
  glyph?: string;        // ✦  ☽  ✧
  label?: string;        // если задан — заменяет glyph (напр. "карта дня")
}

export function OrnamentalDivider({ glyph = '✦', label }: OrnamentalDividerProps) {
  return (
    <div className={styles.divider} aria-hidden="true">
      <span className={styles.line} />
      <span>{label ?? glyph}</span>
      <span className={styles.line} />
    </div>
  );
}
