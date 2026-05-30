/**
 * Каталог раскладов на фронте. Источник истины для backend — `SpreadCatalog.java`;
 * здесь дублируются ровно те же type/displayName/labels (изменение требует синхронной
 * правки обоих файлов; backend дополнительно отдаёт описания через GET /api/spreads,
 * но layout-геометрия (где именно карты в финале) — чисто UI и живёт только тут.
 */
export type SpreadId =
  | 'YES_NO'
  | 'THREE_CARD'
  | 'LOVE'
  | 'CELTIC_CROSS'
  | 'YEAR_WHEEL';

export interface SpreadPosition {
  index: number;
  /** Короткое имя для UI (подпись под картой, заголовок в reveal). */
  label: string;
  /** Длинное имя — на entry/диалог выбора. */
  longLabel?: string;
}

/**
 * Описание layout-а финального экрана. Все варианты — адаптивные под мобильный
 * экран ≤375px шириной. Кардинально разные геометрии под каждый спред дают узнаваемость.
 */
export type FinalLayout =
  | { kind: 'row' }                        // 3 в ряд
  | { kind: 'pentagram' }                  // 5: классический любовный пятилист
  | { kind: 'celticCross' }                // 10: крест 6 + штаб 4
  | { kind: 'wheel' };                     // 12: круг как часы

export interface SpreadDescriptor {
  id: SpreadId;
  /** Имя расклада (две строки максимум). */
  displayName: string;
  /** Короткая подсказка под именем на entry-карточке хаба. */
  shortHint: string;
  /** Длинное описание для экрана вопроса в флоу. */
  longHint: string;
  /** Сколько карт пользователь выбирает из веера. */
  cardCount: number;
  /** Позиции в порядке выкладки. */
  positions: SpreadPosition[];
  /** Геометрия финального экрана. */
  finalLayout: FinalLayout;
  /** Акцент-символ для entry/индикаторов. */
  accent: string;
}

export const SPREADS: Record<SpreadId, SpreadDescriptor> = {
  YES_NO: {
    id: 'YES_NO',
    displayName: 'Да или нет',
    shortHint: 'короткий ответ на закрытый вопрос',
    longHint: 'спроси то, что требует ответа «да» или «нет» — Луна даст вердикт за три карты',
    cardCount: 3,
    positions: [
      { index: 0, label: 'За' },
      { index: 1, label: 'Против' },
      { index: 2, label: 'Итог' },
    ],
    finalLayout: { kind: 'row' },
    accent: '?',
  },
  THREE_CARD: {
    id: 'THREE_CARD',
    displayName: 'Три карты',
    shortHint: 'прошлое · настоящее · будущее',
    longHint: 'самый понятный расклад: где была энергия, где она сейчас и куда движется',
    cardCount: 3,
    positions: [
      { index: 0, label: 'Прошлое' },
      { index: 1, label: 'Настоящее' },
      { index: 2, label: 'Будущее' },
    ],
    finalLayout: { kind: 'row' },
    accent: '✦',
  },
  LOVE: {
    id: 'LOVE',
    displayName: 'О любви',
    shortHint: 'пять карт о ваших отношениях',
    longHint: 'ты, другой человек, связь между вами, препятствие и куда идёте вместе',
    cardCount: 5,
    positions: [
      { index: 0, label: 'Я' },
      { index: 1, label: 'Партнёр' },
      { index: 2, label: 'Связь' },
      { index: 3, label: 'Препятствие' },
      { index: 4, label: 'Исход' },
    ],
    finalLayout: { kind: 'pentagram' },
    accent: '♡',
  },
  CELTIC_CROSS: {
    id: 'CELTIC_CROSS',
    displayName: 'Полный разбор',
    shortHint: 'десять карт на серьёзный вопрос',
    longHint: 'десять позиций — суть, вызов, корень, прошлое, окружение, надежды и итог',
    cardCount: 10,
    positions: [
      { index: 0, label: 'Суть' },
      { index: 1, label: 'Вызов' },
      { index: 2, label: 'Корень' },
      { index: 3, label: 'Прошлое' },
      { index: 4, label: 'Сознание' },
      { index: 5, label: 'Близкое' },
      { index: 6, label: 'Я', longLabel: 'Спрашивающий' },
      { index: 7, label: 'Окружение' },
      { index: 8, label: 'Надежды', longLabel: 'Надежды и страхи' },
      { index: 9, label: 'Итог' },
    ],
    finalLayout: { kind: 'celticCross' },
    accent: '✚',
  },
  YEAR_WHEEL: {
    id: 'YEAR_WHEEL',
    displayName: 'На год вперёд',
    shortHint: 'двенадцать карт по месяцам',
    longHint: 'на каждый из 12 месяцев — куда ведёт следующий год',
    cardCount: 12,
    positions: Array.from({ length: 12 }, (_, i) => ({
      index: i,
      label: `Мес ${i + 1}`,
      longLabel: `Месяц ${i + 1}`,
    })),
    finalLayout: { kind: 'wheel' },
    accent: '☼',
  },
};

export const SPREAD_LIST: SpreadDescriptor[] = [
  SPREADS.YES_NO,
  SPREADS.THREE_CARD,
  SPREADS.LOVE,
  SPREADS.CELTIC_CROSS,
  SPREADS.YEAR_WHEEL,
];

export function getSpread(id: SpreadId): SpreadDescriptor {
  return SPREADS[id];
}
