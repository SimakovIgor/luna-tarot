import styles from './Orb.module.css';

interface OrbProps {
  /** Буква в центре орба. */
  letter: string;
  /** Размер в px (квадрат). */
  size?: number;
  /**
   * Вариант:
   *  - `gold` (по умолчанию) — золотой ты-орб с float-анимацией
   *  - `dashed` — placeholder «?» (друг ещё не вошёл): пунктирный фиолетовый,
   *    pulse-анимация
   *  - `purple` — партнёр-орб когда он есть (в loading / result)
   */
  variant?: 'gold' | 'dashed' | 'purple';
}

/**
 * Орб — круглый «портрет» пользователя в виде золотого/фиолетового шара
 * с первой буквой имени. Используется в Compatibility-флоу по дизайну
 * compat-flow.jsx → Orb.
 */
export function Orb({ letter, size = 96, variant = 'gold' }: OrbProps) {
  const className =
    variant === 'dashed' ? `${styles.orb} ${styles.dashed}` :
    variant === 'purple' ? `${styles.orb} ${styles.purple}` :
    `${styles.orb} ${styles.gold}`;
  return (
    <div
      className={className}
      style={{ width: size, height: size, fontSize: Math.round(size * 0.34) }}
    >
      {letter}
    </div>
  );
}
