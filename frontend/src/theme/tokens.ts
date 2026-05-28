/**
 * TS-токены для удобства inline-стилей и анимаций.
 * Истина живёт в tokens.css — здесь дублируем только то, что нужно из JS (motion и т.п.).
 */

export const motion = {
  fast: 180,
  mid: 550,
  slow: 1100,
  flip: 1400,
} as const;

export const ease = {
  out: [0.22, 0.9, 0.3, 1.05] as [number, number, number, number],
  flip: [0.6, -0.1, 0.35, 1.15] as [number, number, number, number],
};

export const palette = {
  bgDeep: '#08050f',
  bgSoft: '#110820',
  ink: '#ede0c4',
  inkDim: '#8a7c5e',
  inkFaint: '#4a3e2a',
  gold: '#c9a14a',
  goldWarm: '#d9b876',
  goldDeep: '#8a6a2f',
  line: 'rgba(201,161,74,.18)',
  lineHot: 'rgba(201,161,74,.45)',
} as const;
