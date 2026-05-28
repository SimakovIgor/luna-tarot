/**
 * Парсит дату из строки ДД.ММ.ГГГГ.
 * Возвращает ISO yyyy-MM-dd или null.
 * Год должен быть >= 1900, дата не в будущем.
 */
export function parseBirthDate(input: string): string | null {
  if (!input) return null;
  const m = input.trim().match(/^(\d{1,2})[.\-/](\d{1,2})[.\-/](\d{4})$/);
  if (!m) return null;
  const day = parseInt(m[1], 10);
  const month = parseInt(m[2], 10);
  const year = parseInt(m[3], 10);
  if (year < 1900 || month < 1 || month > 12 || day < 1 || day > 31) return null;
  const date = new Date(Date.UTC(year, month - 1, day));
  if (date.getUTCFullYear() !== year || date.getUTCMonth() !== month - 1 || date.getUTCDate() !== day) {
    return null;
  }
  if (date.getTime() > Date.now()) return null;
  const pad = (n: number) => n.toString().padStart(2, '0');
  return `${year}-${pad(month)}-${pad(day)}`;
}
