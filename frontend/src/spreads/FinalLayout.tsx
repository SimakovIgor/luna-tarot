import { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import type { ReadingCard } from '@/api/reading';
import { cardImageUrl } from '@/api/reading';
import { CardBack } from '@/components/TarotCard/CardBack';
import { haptic } from '@/telegram/webapp';
import type { SpreadDescriptor } from './catalog';
import styles from './FinalLayout.module.css';

interface FinalLayoutProps {
  cards: ReadingCard[];
  spread: SpreadDescriptor;
  /** Анимировать раскрытие: каждая карта появляется рубашкой и переворачивается по очереди.
   *  Включается для авто-reveal (5/10/12 карт), где ручной флип каждой — это пытка. */
  revealOnMount?: boolean;
}

/** Сколько ms между разворотами карт в авто-reveal. */
const STAGGER_MS = 380;
const FIRST_DELAY_MS = 250;

/**
 * Финальная раскладка карт под нужный layout. Каждый kind — своя геометрия:
 *  - row:         3 в ряд (узнаваемое прошлое/настоящее/будущее)
 *  - pentagram:   5 в форме треугольника-сердца
 *  - celticCross: 6 крест + 4 штаб справа (классика)
 *  - wheel:       12 по кругу как циферблат
 *
 * Тап по карте (после флипа) → overlay с увеличенной версией. Тап overlay → закрыть.
 */
export function FinalLayout({ cards, spread, revealOnMount = false }: FinalLayoutProps) {
  const [zoomedIdx, setZoomedIdx] = useState<number | null>(null);
  const handleTap = (idx: number) => {
    haptic('light');
    setZoomedIdx(idx);
  };
  const layoutProps = {
    cards,
    spread,
    revealOnMount: revealOnMount ?? false,
    onTap: handleTap,
  };
  let layout: React.ReactNode;
  switch (spread.finalLayout.kind) {
    case 'row': layout = <RowLayout {...layoutProps} />; break;
    case 'pentagram': layout = <PentagramLayout {...layoutProps} />; break;
    case 'celticCross': layout = <CelticCrossLayout {...layoutProps} />; break;
    case 'wheel': layout = <WheelLayout {...layoutProps} />; break;
  }
  return (
    <>
      {layout}
      <AnimatePresence>
        {zoomedIdx !== null && (
          <CardZoomOverlay
            key={`zoom-${zoomedIdx}`}
            card={cards[zoomedIdx]}
            positionLabel={spread.positions[zoomedIdx]?.longLabel ?? spread.positions[zoomedIdx]?.label ?? `№${zoomedIdx + 1}`}
            onClose={() => setZoomedIdx(null)}
          />
        )}
      </AnimatePresence>
    </>
  );
}

interface InnerLayoutProps extends FinalLayoutProps {
  revealOnMount: boolean;
  onTap: (idx: number) => void;
}

// ── 3-card row ────────────────────────────────────────────────────────────

function RowLayout({ cards, spread, revealOnMount, onTap }: InnerLayoutProps) {
  return (
    <div className={styles.row}>
      {cards.map((rc, i) => (
        <FinalThumb
          key={i}
          rc={rc}
          uid={`row-${i}`}
          label={spread.positions[i]?.label ?? `№${i + 1}`}
          appearDelayMs={120 + i * 80}
          flipDelayMs={revealOnMount ? FIRST_DELAY_MS + i * STAGGER_MS : 0}
          revealOnMount={revealOnMount ?? false}
          size="m"
          onTap={() => onTap(i)}
        />
      ))}
    </div>
  );
}

// ── 5-card pentagram (Love) ───────────────────────────────────────────────

const PENTAGRAM_POSITIONS: Array<{ left: string; top: string }> = [
  { left: '15%', top: '0%' },
  { left: '65%', top: '0%' },
  { left: '40%', top: '38%' },
  { left: '5%',  top: '70%' },
  { left: '55%', top: '70%' },
];

function PentagramLayout({ cards, spread, revealOnMount, onTap }: InnerLayoutProps) {
  return (
    <div className={styles.pentagram}>
      {cards.map((rc, i) => (
        <FinalThumb
          key={i}
          rc={rc}
          uid={`pent-${i}`}
          label={spread.positions[i]?.label ?? `№${i + 1}`}
          appearDelayMs={120 + i * 90}
          flipDelayMs={revealOnMount ? FIRST_DELAY_MS + i * STAGGER_MS : 0}
          revealOnMount={revealOnMount ?? false}
          size="s"
          absolutePos={PENTAGRAM_POSITIONS[i]}
          onTap={() => onTap(i)}
        />
      ))}
    </div>
  );
}

// ── 10-card Celtic Cross ──────────────────────────────────────────────────

const CC_LEFT_BLOCK = { width: 70, height: 100 } as const;

interface CCSlot {
  left: number;
  top: number;
  rotate?: number;
  z?: number;
}

const CELTIC_CROSS_SLOTS: CCSlot[] = [
  { left: 80, top: 110, z: 2 },
  // Слот «Вызов» (rotate:90) ставится поверх «Сути» с лёгким смещением
  // (8px вправо, 12px вниз) — традиционный крест таро, но без визуального
  // слияния двух карт в одну «задвоившуюся».
  { left: 88, top: 122, rotate: 90, z: 3 },
  { left: 80, top: 220 },
  { left: 5,  top: 110 },
  { left: 80, top: 0 },
  { left: 155, top: 110 },
];

const CC_STAFF_X = 250;
const CC_STAFF_SLOTS: CCSlot[] = [
  { left: CC_STAFF_X, top: 230 },
  { left: CC_STAFF_X, top: 153 },
  { left: CC_STAFF_X, top: 76 },
  { left: CC_STAFF_X, top: 0 },
];

function CelticCrossLayout({ cards, spread, revealOnMount, onTap }: InnerLayoutProps) {
  return (
    <div className={styles.celticCross}>
      {cards.map((rc, i) => {
        const slot = i < 6 ? CELTIC_CROSS_SLOTS[i] : CC_STAFF_SLOTS[i - 6];
        return (
          <FinalThumb
            key={i}
            rc={rc}
            uid={`cc-${i}`}
            label={spread.positions[i]?.label ?? `№${i + 1}`}
            appearDelayMs={100 + i * 60}
            flipDelayMs={revealOnMount ? FIRST_DELAY_MS + i * STAGGER_MS : 0}
            revealOnMount={revealOnMount ?? false}
            size="xs"
            absolutePos={{ left: `${slot.left}px`, top: `${slot.top}px` }}
            extraRotate={slot.rotate}
            zIndex={slot.z}
            width={CC_LEFT_BLOCK.width}
            height={CC_LEFT_BLOCK.height}
            onTap={() => onTap(i)}
          />
        );
      })}
    </div>
  );
}

// ── 12-card Year Wheel ────────────────────────────────────────────────────

const WHEEL_RADIUS = 110;
const WHEEL_CENTER = 140;

function WheelLayout({ cards, spread, revealOnMount, onTap }: InnerLayoutProps) {
  return (
    <div className={styles.wheel}>
      {cards.map((rc, i) => {
        const angleDeg = (i / 12) * 360 - 90;
        const rad = (angleDeg * Math.PI) / 180;
        const x = WHEEL_CENTER + Math.cos(rad) * WHEEL_RADIUS;
        const y = WHEEL_CENTER + Math.sin(rad) * WHEEL_RADIUS;
        const cardRotate = angleDeg + 90;
        return (
          <FinalThumb
            key={i}
            rc={rc}
            uid={`wheel-${i}`}
            label={spread.positions[i]?.label ?? `№${i + 1}`}
            appearDelayMs={80 + i * 50}
            flipDelayMs={revealOnMount ? FIRST_DELAY_MS + i * STAGGER_MS : 0}
            revealOnMount={revealOnMount ?? false}
            size="xs"
            absolutePos={{
              left: `${x - 28}px`,
              top: `${y - 42}px`,
            }}
            extraRotate={cardRotate}
            width={56}
            height={84}
            captionBelow={false}
            onTap={() => onTap(i)}
          />
        );
      })}
      <div className={styles.wheelCenter} aria-hidden="true">
        <span className={styles.wheelCenterMark}>☼</span>
      </div>
    </div>
  );
}

// ── FinalThumb (общий компонент карты в финале) ───────────────────────────

interface FinalThumbProps {
  rc: ReadingCard;
  uid: string;
  label: string;
  appearDelayMs: number;
  flipDelayMs: number;
  /** Если true — карта при появлении сначала рубашкой, потом авто-флипается через flipDelayMs. */
  revealOnMount: boolean;
  size: 'xs' | 's' | 'm';
  absolutePos?: { left: string; top: string };
  extraRotate?: number;
  zIndex?: number;
  width?: number;
  height?: number;
  captionBelow?: boolean;
  /** Тап по миниатюре (только когда карта уже флипнута). Открывает zoom-overlay. */
  onTap?: () => void;
}

function FinalThumb({
  rc,
  uid,
  label,
  appearDelayMs,
  flipDelayMs,
  revealOnMount,
  size,
  absolutePos,
  extraRotate,
  zIndex,
  width,
  height,
  captionBelow = false,
  onTap,
}: FinalThumbProps) {
  const url = cardImageUrl(rc.card);
  const baseRotate = rc.reversed ? 180 : 0;
  const totalRotate = baseRotate + (extraRotate ?? 0);
  const dim = pickSize(size, width, height);

  // Авто-флип: при revealOnMount=true сначала рубашка, через flipDelayMs → face
  const [flipped, setFlipped] = useState(!revealOnMount);
  useEffect(() => {
    if (!revealOnMount) return;
    const t = window.setTimeout(() => {
      setFlipped(true);
      haptic('light');
    }, flipDelayMs);
    return () => window.clearTimeout(t);
  }, [revealOnMount, flipDelayMs]);

  const wrapStyle: React.CSSProperties = absolutePos
    ? { position: 'absolute', ...absolutePos, zIndex }
    : {};

  const tappable = flipped && onTap;
  return (
    <motion.div
      className={styles.thumbCol}
      style={wrapStyle}
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: appearDelayMs / 1000, duration: 0.45, ease: [0.2, 0.85, 0.3, 1] }}
    >
      <button
        type="button"
        className={styles.flipScene}
        style={{
          width: dim.w,
          height: dim.h,
          transform: totalRotate ? `rotate(${totalRotate}deg)` : undefined,
          cursor: tappable ? 'pointer' : 'default',
        }}
        onClick={tappable ? onTap : undefined}
        aria-label={tappable ? `Открыть карту: ${rc.card.nameRu}` : undefined}
      >
        <div className={`${styles.flipCard} ${flipped ? styles.flipped : ''}`}>
          <div className={`${styles.flipFace} ${styles.flipBack}`}>
            <CardBack uid={uid} />
          </div>
          <div className={`${styles.flipFace} ${styles.flipFront} ${styles.thumb}`}>
            {url && <img src={url} alt={rc.card.nameRu} />}
          </div>
        </div>
      </button>
      {captionBelow && <div className={styles.caption}>{label}</div>}
    </motion.div>
  );
}

// ── CardZoomOverlay ──────────────────────────────────────────────────
// Полноэкранный модал с увеличенной картой. Тап по подложке или карте → закрыть.
// Экспортирован для переиспользования из PickedCardsLayer (ReadingFlowPage),
// где он рендерит зум для row/pentagram/celticCross/wheel-карт, живущих в
// persistent-слое поверх AnimatePresence.

export interface CardZoomOverlayProps {
  card: ReadingCard;
  positionLabel: string;
  onClose: () => void;
}

export function CardZoomOverlay({ card, positionLabel, onClose }: CardZoomOverlayProps) {
  const url = cardImageUrl(card.card);
  const reversed = card.reversed;
  return (
    <motion.div
      className={styles.zoomBackdrop}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.25 }}
      onClick={onClose}
      role="dialog"
      aria-label={`Карта: ${card.card.nameRu}`}
    >
      <motion.div
        className={styles.zoomCard}
        initial={{ scale: 0.6, opacity: 0, y: 20 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.6, opacity: 0, y: 20 }}
        transition={{ duration: 0.35, ease: [0.22, 0.85, 0.3, 1.05] }}
        onClick={(e) => { e.stopPropagation(); onClose(); }}
      >
        <div
          className={styles.zoomCardImage}
          style={{ transform: reversed ? 'rotate(180deg)' : undefined }}
        >
          {url && <img src={url} alt={card.card.nameRu} />}
        </div>
        <div className={styles.zoomPosition}>{positionLabel}</div>
        <div className={styles.zoomName}>
          {card.card.nameRu}{reversed ? ' (перевёрнута)' : ''}
        </div>
        <div className={styles.zoomHint}>тап чтобы вернуть</div>
      </motion.div>
    </motion.div>
  );
}

function pickSize(size: 'xs' | 's' | 'm', w?: number, h?: number) {
  if (w && h) return { w, h };
  switch (size) {
    case 'xs': return { w: 56, h: 84 };
    case 's':  return { w: 68, h: 102 };
    case 'm':  return { w: 84, h: 126 };
  }
}
