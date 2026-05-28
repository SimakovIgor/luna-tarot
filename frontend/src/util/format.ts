const monthsGen = [
  'января', 'февраля', 'марта', 'апреля', 'мая', 'июня',
  'июля', 'августа', 'сентября', 'октября', 'ноября', 'декабря',
];

export function formatTodayRu(now: Date = new Date()): string {
  return `${now.getDate()} ${monthsGen[now.getMonth()]}`;
}

const lunarPhaseRu: Record<string, string> = {
  NEW: 'Луна новая',
  WAXING: 'Луна растёт',
  FULL: 'Луна полная',
  WANING: 'Луна убывает',
};

export function describeLunarPhase(phase: string | null): string {
  if (!phase) return 'Луна молчит';
  return lunarPhaseRu[phase] ?? 'Луна';
}
