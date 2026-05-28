import type { SpreadId } from '@/spreads/catalog';
import type { CompatibilityResponse } from '@/api/compatibility';
import { ZODIAC_INFO } from '@/zodiac';

/**
 * Текстовая подпись для шеринга расклада. Грамматически нейтральная
 * (без «спросил/спросила»), чтобы работало для любого пола. URL бота
 * приклеивается строкой ниже в sharePostcard — отдельно через `url` его
 * нельзя передавать вместе с `files`, иначе iOS/Telegram теряют картинку.
 */
export function buildShareText(spreadId: SpreadId): string {
  switch (spreadId) {
    case 'THREE_CARD':
      return '✦ Луна показала мне расклад на прошлое, настоящее и будущее. Сделай свой:';
    case 'LOVE':
      return '✦ Расклад о любви от Луны — пять карт. Сделай свой:';
    case 'CELTIC_CROSS':
      return '✦ Луна разложила Кельтский крест — глубокий взгляд. Сделай свой:';
    case 'YEAR_WHEEL':
      return '🌙 Колесо года от Луны — двенадцать месяцев вперёд. Сделай свой:';
    default:
      return '✦ Я заглянул в Зеркало Луны — карты ответили. Сделай свой расклад:';
  }
}

/**
 * Подпись для шеринга совместимости. Включает % и оба знака зодиака —
 * чтобы получатель сразу видел суть, а ссылка вела в бот.
 */
export function buildCompatibilityShareText(result: CompatibilityResponse): string {
  const mine = ZODIAC_INFO[result.myZodiac].sign;
  const partner = ZODIAC_INFO[result.partnerZodiac].sign;
  const score = Math.round(result.score);
  return `✦ Луна посмотрела на нас: ${mine} и ${partner} — ${score}%. Проверь свою совместимость:`;
}
