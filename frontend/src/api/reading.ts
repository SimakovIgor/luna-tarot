import { api } from './client';

export type ReadingType =
  | 'CARD_OF_DAY'
  | 'YES_NO'
  | 'THREE_CARD'
  | 'LOVE'
  | 'CELTIC_CROSS'
  | 'YEAR_WHEEL';

export interface TarotCard {
  id: number;
  numeral: number;
  nameRu: string;
  nameEn: string;
  keywords: string[];
  uprightMeaning: string;
  reversedMeaning: string | null;
  imagePath: string | null;
}

export interface ReadingCard {
  card: TarotCard;
  reversed: boolean;
}

export type ReadingOutcome = 'CAME_TRUE' | 'PARTIAL' | 'MISSED';

export interface Reading {
  id: number;
  type: ReadingType;
  question: string | null;
  cards: ReadingCard[];
  interpretation: string;
  createdAt: string;
  outcomeStatus: ReadingOutcome | null;
  outcomeNote: string | null;
  outcomeRecordedAt: string | null;
}

export function fetchCardOfDay(): Promise<Reading> {
  return api<Reading>('/reading/card-of-day');
}

/** Универсальный создатель расклада. spreadType — любой кроме CARD_OF_DAY. */
export function createReading(
  spreadType: Exclude<ReadingType, 'CARD_OF_DAY'>,
  question: string
): Promise<Reading> {
  return api<Reading>('/reading', { method: 'POST', body: { spreadType, question } });
}

/** Старый эндпоинт — оставлен для совместимости с бот-флоу. */
export function createThreeCardReading(question: string): Promise<Reading> {
  return api<Reading>('/reading/3card', { method: 'POST', body: { question } });
}

export function fetchHistory(limit?: number): Promise<Reading[]> {
  const q = limit ? `?limit=${limit}` : '';
  return api<Reading[]>('/history' + q);
}

/** Отметить «как сбылось». note опциональна — до 1000 символов. */
export function recordOutcome(
  readingId: number,
  status: ReadingOutcome,
  note?: string,
): Promise<Reading> {
  return api<Reading>(`/reading/${readingId}/outcome`, {
    method: 'POST',
    body: { status, note: note ?? null },
  });
}

/** Сбросить отметку. */
export function clearOutcome(readingId: number): Promise<Reading> {
  return api<Reading>(`/reading/${readingId}/outcome`, { method: 'DELETE' });
}

/** URL картинки карты, отдаваемой Spring'ом из classpath cards/. */
export function cardImageUrl(card: TarotCard): string | null {
  if (!card.imagePath) return null;
  // Spring отдаёт карты через бэкендовый endpoint? Сейчас НЕТ — карты в JAR resources, не публикуются.
  // На MVP — кладём те же файлы в frontend/public/cards/, Vite билд их публикует под /app/cards/.
  return `/app/cards/${card.imagePath}`;
}
