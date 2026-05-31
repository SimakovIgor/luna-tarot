import type { ZodiacSign } from '@/api/horoscope';
import { CONSTELLATIONS } from '@/zodiac/constellations';

interface ConstellationProps {
  zodiac: ZodiacSign;
  /** Размер квадрата SVG (px). Точки и линии нормализованы под 200×200. */
  size?: number;
  /** Если true — каждая 4-я точка обведена тонким кольцом для «созвездного» вида. */
  haloEvery?: number;
}

const GOLD = '#d9b878';
const GOLD_HI = '#f2dca0';

/**
 * Стилизованное SVG-созвездие для одного из 12 знаков зодиака.
 *
 * Точки и рёбра берутся из {@link CONSTELLATIONS} (статичные шаблоны
 * под каждый знак). Большие точки светятся голд-glow, рёбра тонкие
 * полупрозрачные — атмосфера ночного неба.
 *
 * Используется на странице профиля (блок «Твоё небо») и в share-открытке.
 */
export function Constellation({ zodiac, size = 200, haloEvery = 4 }: ConstellationProps) {
  const shape = CONSTELLATIONS[zodiac];
  // Координаты заданы в 200×200, масштабируем к запрошенному size.
  const scale = (v: number) => (v / 200) * size;
  const points = shape.nodes.map(([x, y]) => [scale(x), scale(y)] as const);

  return (
    <svg
      width={size}
      height={size}
      viewBox={`0 0 ${size} ${size}`}
      style={{ display: 'block' }}
      aria-hidden="true"
    >
      {/* Линии-рёбра: тонкие, тёплое золото, полупрозрачные. */}
      {shape.edges.map(([a, b], i) => {
        const [x1, y1] = points[a];
        const [x2, y2] = points[b];
        return (
          <line
            key={`e-${i}`}
            x1={x1}
            y1={y1}
            x2={x2}
            y2={y2}
            stroke={GOLD}
            strokeWidth={0.8}
            strokeOpacity={0.45}
          />
        );
      })}

      {/* Точки: каждая 3-я — крупная, каждая 4-я — с тонким кольцом. */}
      {points.map(([x, y], i) => {
        const r = i % 3 === 0 ? 3 : 2;
        const showHalo = haloEvery > 0 && i % haloEvery === 0;
        return (
          <g key={`n-${i}`}>
            <circle
              cx={x}
              cy={y}
              r={r}
              fill={GOLD_HI}
              style={{ filter: 'drop-shadow(0 0 4px rgba(242, 220, 160, 0.8))' }}
            />
            {showHalo && (
              <circle
                cx={x}
                cy={y}
                r={6}
                fill="none"
                stroke={GOLD}
                strokeWidth={0.4}
                strokeOpacity={0.4}
              />
            )}
          </g>
        );
      })}
    </svg>
  );
}
