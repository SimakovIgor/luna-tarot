import styles from './MoonBackground.module.css';

/**
 * Атмосферный фон Luna: пульсирующие звёзды в двух циклах. Грейн поверх — на body::after из tokens.css.
 * Кладётся внутрь {@link ScreenContainer} с position: relative; компонент сам absolute-fills.
 */
export function MoonBackground() {
  return <div className={styles.stars} aria-hidden="true" />;
}
