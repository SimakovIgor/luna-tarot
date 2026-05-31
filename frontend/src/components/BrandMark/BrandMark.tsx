import styles from './BrandMark.module.css';

type Size = 'xl' | 'l' | 'm' | 's';

interface BrandMarkProps {
  size?: Size;
  subline?: string | null;
}

const sizeClass: Record<Size, string> = {
  xl: styles.sizeXL,
  l: styles.sizeL,
  m: styles.sizeM,
  s: styles.sizeS,
};

export function BrandMark({ size = 'm', subline = 'Луна · Таро' }: BrandMarkProps) {
  return (
    <div className={styles.brand}>
      <div className={`${styles.wordmark} ${sizeClass[size]}`}>Luna</div>
      {subline ? <div className={styles.subline}>{subline}</div> : null}
    </div>
  );
}
