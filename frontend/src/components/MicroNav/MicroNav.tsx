import styles from './MicroNav.module.css';

export interface MicroNavItem {
  id: string;
  label: string;
  onClick?: () => void;
}

interface MicroNavProps {
  items: MicroNavItem[];
}

export function MicroNav({ items }: MicroNavProps) {
  return (
    <footer className={styles.nav}>
      {items.map((it) => (
        <button key={it.id} className={styles.item} type="button" onClick={it.onClick}>
          <span className={styles.dot} aria-hidden="true" />
          {it.label}
        </button>
      ))}
    </footer>
  );
}
