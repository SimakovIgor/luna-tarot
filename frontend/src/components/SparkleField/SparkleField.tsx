import { useEffect, useRef } from 'react';
import styles from './SparkleField.module.css';

interface SparkleFieldProps {
  /** Сколько частиц одновременно. Дороже 80 на мобильном — не рекомендую. */
  count?: number;
  /** Цвет частиц. */
  color?: string;
  /** Множитель скорости (1 = базовая, медленный дрейф). */
  speed?: number;
}

interface Particle {
  x: number;
  y: number;
  vy: number;
  vx: number;
  r: number;
  twinklePhase: number;
  twinkleSpeed: number;
}

/**
 * Медленно дрейфующие частицы поверх фона. Canvas + requestAnimationFrame.
 * Мерцают (twinkle) для ощущения дыхания.
 */
export function SparkleField({
  count = 60,
  color = 'rgba(255, 232, 184, 0.85)',
  speed = 1,
}: SparkleFieldProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef = useRef<number | null>(null);
  const particlesRef = useRef<Particle[]>([]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let width = 0;
    let height = 0;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);

    const resize = () => {
      width = canvas.clientWidth;
      height = canvas.clientHeight;
      canvas.width = Math.floor(width * dpr);
      canvas.height = Math.floor(height * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(canvas);

    // Стартовая инициализация частиц на всю площадь
    particlesRef.current = Array.from({ length: count }, () => spawn(width, height, true));

    let lastTs = performance.now();
    const tick = (ts: number) => {
      const dt = Math.min(60, ts - lastTs);
      lastTs = ts;
      ctx.clearRect(0, 0, width, height);
      const list = particlesRef.current;
      for (let i = 0; i < list.length; i++) {
        const p = list[i];
        // Дрейф: медленно вверх с лёгким боковым колыханием
        p.y += p.vy * speed * (dt / 16);
        p.x += p.vx * speed * (dt / 16);
        p.twinklePhase += p.twinkleSpeed * dt;

        // Перерождение если ушла за верх
        if (p.y < -8 || p.x < -8 || p.x > width + 8) {
          list[i] = spawn(width, height, false);
          continue;
        }

        // Twinkle через sin
        const alpha = 0.25 + (Math.sin(p.twinklePhase) * 0.5 + 0.5) * 0.7;
        ctx.globalAlpha = alpha;
        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fill();

        // Лёгкий ореол у крупных
        if (p.r > 1.2) {
          ctx.globalAlpha = alpha * 0.18;
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.r * 3.2, 0, Math.PI * 2);
          ctx.fill();
        }
      }
      ctx.globalAlpha = 1;
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);

    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      ro.disconnect();
    };
  }, [count, color, speed]);

  return <canvas ref={canvasRef} className={styles.canvas} aria-hidden="true" />;
}

function spawn(width: number, height: number, anywhere: boolean): Particle {
  return {
    x: Math.random() * width,
    y: anywhere ? Math.random() * height : height + Math.random() * 40,
    vy: -(0.05 + Math.random() * 0.18),       // медленно вверх
    vx: (Math.random() - 0.5) * 0.06,
    r: Math.random() < 0.15 ? 1.4 + Math.random() * 0.9 : 0.4 + Math.random() * 0.8,
    twinklePhase: Math.random() * Math.PI * 2,
    twinkleSpeed: 0.0008 + Math.random() * 0.0022,
  };
}
