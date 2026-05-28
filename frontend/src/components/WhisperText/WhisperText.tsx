import type { ReactNode } from 'react';
import styles from './WhisperText.module.css';

type Tone = 'dim' | 'ink' | 'faint';
type Size = 's' | 'm' | 'l';

interface WhisperTextProps {
  children: ReactNode;
  tone?: Tone;
  size?: Size;
  /** Если true — <em> внутри текста окрашивается в золото. */
  highlightEm?: boolean;
  as?: 'p' | 'span' | 'div';
}

const sizeClass: Record<Size, string> = { s: styles.sizeS, m: styles.sizeM, l: styles.sizeL };
const toneClass: Record<Tone, string> = { dim: '', ink: styles.ink, faint: styles.faint };

export function WhisperText({
  children,
  tone = 'dim',
  size = 'm',
  highlightEm = false,
  as: Tag = 'p',
}: WhisperTextProps) {
  const cls = [styles.whisper, sizeClass[size], toneClass[tone], highlightEm ? styles.emGold : '']
    .filter(Boolean)
    .join(' ');
  return <Tag className={cls}>{children}</Tag>;
}
