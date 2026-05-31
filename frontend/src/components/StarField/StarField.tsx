import { useEffect, useRef, type MutableRefObject } from 'react';

interface StarFieldProps {
  /**
   * 0 = быстрый разлёт (для loading), 1 = почти полный покой (для главного экрана).
   * Меняй через ref.current — без ререндера.
   */
  calmRef: MutableRefObject<number>;
}

interface Star {
  /** Угол от центра (рад). */
  a: number;
  /** Радиус от центра (px). */
  r: number;
  /** Скорость роста радиуса (доля от текущего радиуса за кадр). */
  sp: number;
  /** Радиус самой звезды (px), масштабируется с увеличением r. */
  size: number;
  /** Золотая (~26%) или холодно-белая. */
  gold: boolean;
  /** Яркость 0..1. */
  br: number;
}

/**
 * Звёздное поле — canvas, заполняющий родительский контейнер.
 * Звёзды летят от центра наружу по спирали, оставляя шлейф
 * (полупрозрачная заливка кадра вместо clearRect).
 *
 * Используется как единый фон во всех экранах. Скорость
 * управляется через {@link StarFieldProps.calmRef} —
 * при переходе load→home плавно опускается 0→1 за ~1.2с.
 *
 * Реализация по `luna-home.jsx` → `StarFieldBG` из дизайн-handoff:
 * ~80 звёзд, 26% золотые, sp=0.0058..0.0148, fade=0.09..0.14.
 */
export function StarField({ calmRef }: StarFieldProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let W = 0;
    let H = 0;
    let cx = 0;
    let cy = 0;
    const STAR_COUNT = 80;
    let stars: Star[] = [];

    const spawn = (): Star => ({
      a: Math.random() * Math.PI * 2,
      r: 3 + Math.random() * 30,
      sp: 0.0058 + Math.random() * 0.009,
      size: Math.random() < 0.1 ? 1.5 : Math.random() * 0.8 + 0.35,
      gold: Math.random() < 0.26,
      br: 0.3 + Math.random() * 0.45,
    });

    const resize = () => {
      const parent = canvas.parentElement ?? document.body;
      const rect = parent.getBoundingClientRect();
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      W = Math.max(1, Math.round(rect.width));
      H = Math.max(1, Math.round(rect.height));
      canvas.width = W * dpr;
      canvas.height = H * dpr;
      canvas.style.width = `${W}px`;
      canvas.style.height = `${H}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      // Точка схода — чуть выше геометрического центра, как в дизайне (0.4·H).
      cx = W / 2;
      cy = H * 0.4;
      // Залить чёрным сразу, чтобы первый кадр не моргал.
      ctx.fillStyle = '#06030f';
      ctx.fillRect(0, 0, W, H);
    };

    resize();
    stars = Array.from({ length: STAR_COUNT }, spawn);

    const tick = () => {
      const calm = clamp01(calmRef.current);
      // На покое — fade плотнее (шлейф короче), на динамике — fade прозрачнее (шлейф длиннее).
      const fade = 0.09 + calm * 0.05;
      ctx.fillStyle = `rgba(6,3,15,${fade})`;
      ctx.fillRect(0, 0, W, H);

      const speedMul = 1 - calm * 0.74;

      for (let i = 0; i < stars.length; i++) {
        const s = stars[i];
        s.r *= 1 + s.sp * speedMul;
        const x = cx + Math.cos(s.a) * s.r;
        const y = cy + Math.sin(s.a) * s.r * 0.92;
        if (x < -20 || x > W + 20 || y < -20 || y > H + 20) {
          stars[i] = spawn();
          continue;
        }
        const sz = s.size * (0.5 + s.r / 280);
        ctx.beginPath();
        ctx.arc(x, y, sz, 0, Math.PI * 2);
        ctx.fillStyle = s.gold
          ? `rgba(242,220,160,${s.br})`
          : `rgba(225,218,255,${s.br})`;
        ctx.fill();
      }

      rafRef.current = requestAnimationFrame(tick);
    };

    rafRef.current = requestAnimationFrame(tick);

    const onResize = () => resize();
    window.addEventListener('resize', onResize);

    return () => {
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
      window.removeEventListener('resize', onResize);
    };
  }, [calmRef]);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      style={{
        position: 'absolute',
        inset: 0,
        width: '100%',
        height: '100%',
        zIndex: 0,
        pointerEvents: 'none',
      }}
    />
  );
}

function clamp01(v: number): number {
  if (v < 0) return 0;
  if (v > 1) return 1;
  return v;
}
