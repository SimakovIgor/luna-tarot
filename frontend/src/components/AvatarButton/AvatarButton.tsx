import styles from './AvatarButton.module.css';

interface AvatarButtonProps {
  /** Имя юзера — берём первую букву как инициал. */
  name: string;
  onClick?: () => void;
}

/**
 * Круглая кнопка-аватар в правом верхнем углу экрана.
 * Открывает Профиль / Настройки. Заменяет старую нижнюю плашку MicroNav —
 * одно понятное входное место вместо трёх кнопок неизвестного назначения.
 */
export function AvatarButton({ name, onClick }: AvatarButtonProps) {
  const initial = (name?.trim()?.[0] ?? '·').toUpperCase();
  return (
    <button
      type="button"
      className={styles.button}
      onClick={onClick}
      aria-label="Профиль и настройки"
    >
      <span className={styles.initial}>{initial}</span>
    </button>
  );
}
