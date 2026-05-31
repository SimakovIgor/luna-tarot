interface MoonPhaseGlyphProps {
  /** 0..1 — позиция в синодическом цикле (0 = новая, 0.5 = полная). */
  position: number;
  size?: number;
}

/**
 * SVG-моя с точной освещённостью под текущую позицию цикла.
 *
 * Реализация по канонической модели: освещённая часть = объединение
 * полудиска (с яркой стороны) и эллипса с горизонтальным радиусом,
 * меняющимся от r до 0 и обратно — это и есть линия терминатора.
 *
 *  - position ∈ (0, 0.5):  waxing, ярко справа
 *  - position ∈ (0.5, 1):  waning, ярко слева
 *  - 0:    новая (всё тёмное)
 *  - 0.25: первая четверть (правая половина)
 *  - 0.5:  полная (вся яркая)
 *  - 0.75: последняя четверть (левая половина)
 */
export function MoonPhaseGlyph({ position, size = 56 }: MoonPhaseGlyphProps) {
  const r = size / 2;
  const illumination = (1 - Math.cos(2 * Math.PI * position)) / 2;

  // Безопасные кейсы — крайние точки и почти-полная/нулевая Луна.
  if (illumination < 0.02) {
    return <NewMoon r={r} size={size} />;
  }
  if (illumination > 0.98) {
    return <FullMoon r={r} size={size} />;
  }

  const waxing = position < 0.5;

  // Радиус терминаторной полу-эллипсы. На четвертях = 0 (прямая линия),
  // на пути от четверти к новолунию/полнолунию растёт до r.
  const termRx = Math.abs(1 - 2 * illumination) * r;

  // Направления дуг:
  //  - waxing (ярко справа): внешняя дуга идёт по правой полуокружности,
  //    sweep=1 (по часовой), от (cx, 0) к (cx, size).
  //  - waning: внешняя дуга по левой полуокружности, sweep=0.
  const outerSweep = waxing ? 1 : 0;
  // Внутренняя дуга (терминатор):
  //  - до квартилов (illum<0.5, серп): эллипс «впалой» формы, концы соединяются
  //    через бок ТЁМНОЙ стороны → для waxing sweep=0, для waning sweep=1.
  //  - после квартилов (illum>0.5, гиббус): эллипс выгнут наружу яркой части
  //    → для waxing sweep=1, для waning sweep=0.
  const innerSweep =
    illumination < 0.5
      ? (waxing ? 0 : 1)
      : (waxing ? 1 : 0);

  const litPath =
    `M ${r} 0
     A ${r} ${r} 0 0 ${outerSweep} ${r} ${size}
     A ${termRx} ${r} 0 0 ${innerSweep} ${r} 0
     Z`;

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} aria-hidden="true">
      <Defs />
      {/* Тёмный диск-фон (вся Луна, как в новолуние). */}
      <circle cx={r} cy={r} r={r} fill="#16142e" stroke="rgba(217,184,120,0.28)" strokeWidth={1} />
      {/* Освещённая часть поверх. */}
      <path d={litPath} fill="url(#lunar-gold)" />
    </svg>
  );
}

function NewMoon({ r, size }: { r: number; size: number }) {
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} aria-hidden="true">
      <Defs />
      <circle cx={r} cy={r} r={r} fill="#16142e" stroke="rgba(217,184,120,0.4)" strokeWidth={1} />
    </svg>
  );
}

function FullMoon({ r, size }: { r: number; size: number }) {
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} aria-hidden="true">
      <Defs />
      <circle cx={r} cy={r} r={r} fill="url(#lunar-gold)" />
    </svg>
  );
}

function Defs() {
  return (
    <defs>
      <radialGradient id="lunar-gold" cx="32%" cy="28%" r="80%">
        <stop offset="0%"  stopColor="#fff7d6" />
        <stop offset="55%" stopColor="#f2dca0" />
        <stop offset="100%" stopColor="#9a7636" />
      </radialGradient>
    </defs>
  );
}
