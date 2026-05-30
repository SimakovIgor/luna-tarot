/**
 * Возвращает первое предложение из текста (для подписи под картой дня).
 * Конец предложения — точка, !, ?, …  или \n.
 */
export function extractFirstSentence(text: string): string {
  if (!text) return '';
  const stripped = text
    .replace(/\*\*(.+?)\*\*/g, '$1')
    .replace(/^[🌙✦☽\s]+/u, '')
    .trim();
  const match = stripped.match(/^(.*?[.!?…])(\s|$)/);
  const line = match ? match[1] : stripped.split('\n')[0];
  return line.trim();
}
