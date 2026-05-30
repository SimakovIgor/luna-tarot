import type { SpreadId } from './catalog';

/**
 * Мини-силуэт layout-а расклада. SVG 24×24 viewport.
 * Карты — прозрачные прямоугольники с золотой обводкой.
 */
export function SpreadIcon({ id }: { id: SpreadId }) {
  const stroke = 'currentColor';
  switch (id) {
    case 'YES_NO':
      // Три карты с большим вопросительным знаком сверху — узнаваемо.
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke={stroke} strokeWidth="1.1">
          <rect x="3"  y="9" width="5" height="10" rx="1" />
          <rect x="9.5" y="9" width="5" height="10" rx="1" />
          <rect x="16" y="9" width="5" height="10" rx="1" />
          <path d="M10.4 5.2c0-1.2 1-2.2 2.2-2.2s2.2 1 2.2 2.2c0 1.3-1.4 1.5-1.4 2.3v0.5" strokeLinecap="round" />
          <circle cx="13.2" cy="8.7" r="0.5" fill={stroke} stroke="none" />
        </svg>
      );
    case 'THREE_CARD':
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke={stroke} strokeWidth="1.1">
          <rect x="3"  y="7" width="5" height="10" rx="1" />
          <rect x="9.5" y="7" width="5" height="10" rx="1" />
          <rect x="16" y="7" width="5" height="10" rx="1" />
        </svg>
      );
    case 'LOVE':
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke={stroke} strokeWidth="1.1">
          <rect x="3.5"  y="4" width="4" height="6" rx="0.8" />
          <rect x="16.5" y="4" width="4" height="6" rx="0.8" />
          <rect x="10"   y="9" width="4" height="6" rx="0.8" />
          <rect x="3.5"  y="14" width="4" height="6" rx="0.8" />
          <rect x="16.5" y="14" width="4" height="6" rx="0.8" />
        </svg>
      );
    case 'CELTIC_CROSS':
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke={stroke} strokeWidth="0.9">
          {/* левый крест */}
          <rect x="6"  y="9" width="4" height="6" rx="0.6" />
          <rect x="5.5" y="9" width="5" height="6" rx="0.6" transform="rotate(90 8 12)" />
          <rect x="6"  y="2" width="4" height="6" rx="0.6" />
          <rect x="6"  y="16" width="4" height="6" rx="0.6" />
          <rect x="0"  y="9" width="4" height="6" rx="0.6" />
          <rect x="12" y="9" width="4" height="6" rx="0.6" />
          {/* штаб справа */}
          <rect x="18" y="2"  width="4" height="4" rx="0.5" />
          <rect x="18" y="7"  width="4" height="4" rx="0.5" />
          <rect x="18" y="12" width="4" height="4" rx="0.5" />
          <rect x="18" y="17" width="4" height="4" rx="0.5" />
        </svg>
      );
    case 'YEAR_WHEEL':
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke={stroke} strokeWidth="0.9">
          {Array.from({ length: 12 }).map((_, i) => {
            const angle = (i / 12) * 2 * Math.PI - Math.PI / 2;
            const cx = 12 + Math.cos(angle) * 8.5;
            const cy = 12 + Math.sin(angle) * 8.5;
            // Прямоугольнички, повёрнутые «головой» к центру
            const rot = (angle * 180) / Math.PI + 90;
            return (
              <rect
                key={i}
                x={cx - 1.4}
                y={cy - 2.2}
                width="2.8"
                height="4.4"
                rx="0.4"
                transform={`rotate(${rot} ${cx} ${cy})`}
              />
            );
          })}
          <circle cx="12" cy="12" r="1.4" fill={stroke} opacity="0.35" />
        </svg>
      );
  }
}
