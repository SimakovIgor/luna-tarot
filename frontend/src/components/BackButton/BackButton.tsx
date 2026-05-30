import styles from './BackButton.module.css';

interface BackButtonProps {
  onClick: () => void;
  /** Текст кнопки. По умолчанию «← Назад». */
  label?: string;
}

/**
 * Кнопка «← Назад» в топбаре. Один источник правды для всех страниц,
 * чтобы стиль не расходился между Reading/Compat/Diary/Profile/CardOfDay.
 */
export function BackButton({ onClick, label = '← Назад' }: BackButtonProps) {
  return (
    <button type="button" className={styles.back} onClick={onClick}>
      {label}
    </button>
  );
}
