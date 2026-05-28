import type { ButtonHTMLAttributes, ReactNode } from 'react';
import styles from './GoldButton.module.css';

interface GoldButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  children: ReactNode;
  variant?: 'primary' | 'ghost';
  full?: boolean;
}

export function GoldButton({
  children,
  variant = 'primary',
  full = false,
  className,
  ...rest
}: GoldButtonProps) {
  const cls = [styles.btn, variant === 'ghost' ? styles.ghost : '', full ? styles.full : '', className ?? '']
    .filter(Boolean)
    .join(' ');
  return (
    <button type="button" className={cls} {...rest}>
      {children}
    </button>
  );
}
