import { AvatarButton } from '../AvatarButton/AvatarButton';
import { BrandMark } from '../BrandMark/BrandMark';
import styles from './AppHeader.module.css';

interface AppHeaderProps {
  /** Дата вроде «28 мая». Покажется слева под золотой точкой. */
  dateLabel: string;
  /** Имя — для инициала в правой кнопке-аватаре. */
  name: string;
  onProfileClick?: () => void;
  /** Путь до картинки логотипа. Если не задан — fallback на текстовый BrandMark. */
  logoSrc?: string;
}

/**
 * Один ряд: [точка · дата]  [логотип Luna]  [аватар-кнопка].
 * Фаза луны убрана из хедера по запросу пользователя — оставлен только день месяца.
 */
export function AppHeader({ dateLabel, name, onProfileClick, logoSrc }: AppHeaderProps) {
  return (
    <header className={styles.row}>
      <div className={styles.left}>
        <span className={styles.dot} aria-hidden="true" />
        <span className={styles.dateLine}>{dateLabel}</span>
      </div>

      <div className={styles.center}>
        {logoSrc ? (
          <img src={logoSrc} alt="Luna" className={styles.logo} draggable={false} />
        ) : (
          <BrandMark size="s" subline={null} />
        )}
      </div>

      <div className={styles.right}>
        <AvatarButton name={name} onClick={onProfileClick} />
      </div>
    </header>
  );
}
