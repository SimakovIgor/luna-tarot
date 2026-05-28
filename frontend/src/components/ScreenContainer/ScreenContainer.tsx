import type { ReactNode } from 'react';
import styles from './ScreenContainer.module.css';

interface ScreenContainerProps {
  children: ReactNode;
}

export function ScreenContainer({ children }: ScreenContainerProps) {
  return <div className={styles.device}>{children}</div>;
}
