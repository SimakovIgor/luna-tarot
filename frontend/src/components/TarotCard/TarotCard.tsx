import { useCallback, useEffect, useRef, useState, type CSSProperties, type PointerEvent } from 'react';
import { haptic } from '@/telegram/webapp';
import { CardBack } from './CardBack';
import styles from './TarotCard.module.css';

type Size = 'xs' | 's' | 'm' | 'l';

interface TarotCardProps {
  /** Путь к лицевой картинке (классически m02.jpg и т.п.). Если не задан — карта не флипается. */
  faceSrc?: string | null;
  faceAlt?: string;
  /** Перевёрнутая карта — лицо повёрнуто на 180° (тёмная трактовка). */
  reversed?: boolean;
  /** Контролируемое состояние флипа. Если не задано — компонент сам управляет (uncontrolled). */
  flipped?: boolean;
  onFlip?: (next: boolean) => void;
  size?: Size;
  /** uid для defs внутри CardBack — чтобы при нескольких картах в DOM не пересекались id градиентов. */
  uid?: string;
  /** Можно ли тапать — флипать. По дефолту true. */
  interactive?: boolean;
}

const tiltMax = 14;
const liftMax = 18;

const sizeClass: Record<Size, string> = {
  xs: styles.sizeXS,
  s: styles.sizeS,
  m: styles.sizeM,
  l: styles.sizeL,
};

export function TarotCard({
  faceSrc,
  faceAlt = 'Карта Таро',
  reversed = false,
  flipped: controlledFlipped,
  onFlip,
  size = 'm',
  uid = 'def',
  interactive = true,
}: TarotCardProps) {
  const sceneRef = useRef<HTMLDivElement | null>(null);
  const tiltRef = useRef<HTMLDivElement | null>(null);
  const rafRef = useRef<number | null>(null);

  const [internalFlipped, setInternalFlipped] = useState(false);
  const isControlled = controlledFlipped !== undefined;
  const isFlipped = isControlled ? !!controlledFlipped : internalFlipped;
  const [isPressing, setIsPressing] = useState(false);
  const [isIdle, setIsIdle] = useState(true);

  // Сбрасываем tilt при выходе курсора
  useEffect(() => {
    if (isIdle && tiltRef.current) {
      tiltRef.current.style.setProperty('--rx', '0deg');
      tiltRef.current.style.setProperty('--ry', '0deg');
      tiltRef.current.style.setProperty('--lift', '0px');
      if (sceneRef.current) sceneRef.current.style.setProperty('--shadow-x', '0px');
    }
  }, [isIdle]);

  const handlePointerMove = useCallback((e: PointerEvent<HTMLDivElement>) => {
    if (!interactive || !sceneRef.current || !tiltRef.current) return;
    const rect = sceneRef.current.getBoundingClientRect();
    const cx = (e.clientX - rect.left) / rect.width;
    const cy = (e.clientY - rect.top) / rect.height;
    const nx = (cx - 0.5) * 2;
    const ny = (cy - 0.5) * 2;
    const ry = nx * tiltMax;
    const rx = -ny * tiltMax;
    const yEff = isFlipped ? -ry : ry;
    const dist = Math.min(1, Math.hypot(nx, ny));

    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    const tilt = tiltRef.current;
    const scene = sceneRef.current;
    rafRef.current = requestAnimationFrame(() => {
      tilt.style.setProperty('--ry', `${yEff}deg`);
      tilt.style.setProperty('--rx', `${rx}deg`);
      tilt.style.setProperty('--lift', `${liftMax * dist}px`);
      scene.style.setProperty('--shadow-x', `${-nx * 12}px`);
    });
  }, [isFlipped, interactive]);

  const handlePointerEnter = useCallback(() => {
    if (!interactive) return;
    setIsIdle(false);
  }, [interactive]);

  const handlePointerLeave = useCallback(() => {
    setIsIdle(true);
  }, []);

  const doFlip = useCallback(() => {
    if (!interactive || !faceSrc) return;
    setIsPressing(true);
    haptic('light');
    setTimeout(() => {
      setIsPressing(false);
      const next = !isFlipped;
      if (!isControlled) setInternalFlipped(next);
      onFlip?.(next);
    }, 180);
  }, [interactive, faceSrc, isFlipped, isControlled, onFlip]);

  const sceneStyle: CSSProperties = {};
  const tiltClass = [styles.tilt, isIdle ? styles.idle : '', isPressing ? styles.pressing : '']
    .filter(Boolean)
    .join(' ');
  const innerClass = [styles.inner, isFlipped ? styles.flipped : ''].filter(Boolean).join(' ');
  const faceClass = [styles.side, styles.face, reversed ? styles.faceReversed : ''].filter(Boolean).join(' ');

  return (
    <div
      ref={sceneRef}
      className={`${styles.scene} ${sizeClass[size]}`}
      style={sceneStyle}
      onPointerMove={handlePointerMove}
      onPointerEnter={handlePointerEnter}
      onPointerLeave={handlePointerLeave}
      role={interactive ? 'button' : undefined}
      tabIndex={interactive ? 0 : -1}
      aria-label={interactive ? 'Открыть карту' : undefined}
      onKeyDown={(e) => {
        if (!interactive) return;
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          doFlip();
        }
      }}
      onClick={doFlip}
    >
      <span className={styles.glow} aria-hidden="true" />
      <div ref={tiltRef} className={tiltClass}>
        <div className={innerClass}>
          <div className={`${styles.side} ${styles.back}`}>
            <CardBack uid={uid} />
          </div>
          {faceSrc ? (
            <div className={faceClass}>
              <img src={faceSrc} alt={faceAlt} />
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
