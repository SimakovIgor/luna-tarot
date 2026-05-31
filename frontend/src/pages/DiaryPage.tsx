import { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { ScreenContainer } from '@/components/ScreenContainer/ScreenContainer';
import { OrnamentalDivider } from '@/components/OrnamentalDivider/OrnamentalDivider';
import { WhisperText } from '@/components/WhisperText/WhisperText';
import { GoldButton } from '@/components/GoldButton/GoldButton';
import { OutcomeSheet } from '@/components/OutcomeSheet/OutcomeSheet';
import { BackButton } from '@/components/BackButton/BackButton';
import {
  cardImageUrl,
  clearOutcome,
  fetchHistory,
  recordOutcome,
  type Reading,
  type ReadingOutcome,
  type ReadingType,
} from '@/api/reading';
import { haptic } from '@/telegram/webapp';
import { SPREADS, type SpreadId } from '@/spreads/catalog';
import { FinalLayout } from '@/spreads/FinalLayout';
import styles from './DiaryPage.module.css';

interface DiaryPageProps {
  onClose: () => void;
}

interface OutcomeTarget {
  reading: Reading;
}

export function DiaryPage({ onClose }: DiaryPageProps) {
  const [items, setItems] = useState<Reading[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [outcomeTarget, setOutcomeTarget] = useState<OutcomeTarget | null>(null);

  useEffect(() => {
    let alive = true;
    fetchHistory(30)
      .then((list) => { if (alive) setItems(list); })
      .catch((e) => { if (alive) setError(e instanceof Error ? e.message : 'error'); });
    return () => { alive = false; };
  }, []);

  const replaceItem = (updated: Reading) => {
    setItems((prev) => prev?.map((r) => (r.id === updated.id ? updated : r)) ?? prev);
  };

  return (
    <ScreenContainer>
      
      <div className={styles.shell}>
        <div className={styles.topbar}>
          <BackButton onClick={onClose} />
          <span className={styles.title}>дневник</span>
          <span style={{ width: 50 }} />
        </div>

        <div className={styles.stage}>
          <OrnamentalDivider label="дневник Луны" />

          {error ? (
            <div className={styles.empty}>
              <WhisperText size="m" tone="dim">Луна не ответила: {error}</WhisperText>
              <GoldButton variant="ghost" onClick={onClose}>На главную</GoldButton>
            </div>
          ) : items === null ? (
            <div className={styles.empty}>
              <WhisperText size="m" tone="dim">собираю твои расклады…</WhisperText>
            </div>
          ) : items.length === 0 ? (
            <div className={styles.empty}>
              <WhisperText size="m" tone="dim">
                Луна ещё не звучала тебе. Сделай первый расклад — и он останется здесь.
              </WhisperText>
              <GoldButton onClick={onClose}>На главную</GoldButton>
            </div>
          ) : (
            <div className={styles.timeline}>
              {items.map((r, idx) => (
                <DiaryEntry
                  key={r.id}
                  reading={r}
                  index={idx}
                  expanded={expandedId === r.id}
                  onToggle={() => {
                    haptic('light');
                    setExpandedId(expandedId === r.id ? null : r.id);
                  }}
                  onOpenOutcome={() => {
                    haptic('light');
                    setOutcomeTarget({ reading: r });
                  }}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      <OutcomeSheet
        open={outcomeTarget !== null}
        initialStatus={outcomeTarget?.reading.outcomeStatus ?? null}
        initialNote={outcomeTarget?.reading.outcomeNote ?? null}
        readingTitle={outcomeTitle(outcomeTarget?.reading)}
        onClose={() => setOutcomeTarget(null)}
        onSubmit={async (status, note) => {
          if (!outcomeTarget) return;
          const updated = await recordOutcome(outcomeTarget.reading.id, status, note ?? undefined);
          replaceItem(updated);
        }}
        onClear={async () => {
          if (!outcomeTarget) return;
          const updated = await clearOutcome(outcomeTarget.reading.id);
          replaceItem(updated);
        }}
      />
    </ScreenContainer>
  );
}

interface DiaryEntryProps {
  reading: Reading;
  index: number;
  expanded: boolean;
  onToggle: () => void;
  onOpenOutcome: () => void;
}

function DiaryEntry({ reading, index, expanded, onToggle, onOpenOutcome }: DiaryEntryProps) {
  const date = new Date(reading.createdAt);
  const dateLabel = formatDateRu(date);
  const spread = spreadForType(reading.type);
  const totalCards = reading.cards.length;

  const summary = reading.question
    ? `«${reading.question}»`
    : reading.type === 'CARD_OF_DAY'
      ? 'карта дня'
      : 'без вопроса';

  return (
    <motion.div
      className={`${styles.entry} ${expanded ? styles.expanded : ''}`}
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: Math.min(0.05 + index * 0.04, 0.6), duration: 0.45, ease: [0.22, 0.85, 0.3, 1] }}
    >
      <div className={styles.entryHead} onClick={onToggle}>
        <div className={styles.thumbStack} aria-hidden="true">
          {reading.cards.slice(0, 3).map((rc, i) => {
            const url = cardImageUrl(rc.card);
            return (
              <div key={i} className={styles.thumb}>
                {url && (
                  <img
                    src={url}
                    alt=""
                    style={rc.reversed ? { transform: 'rotate(180deg)' } : undefined}
                  />
                )}
              </div>
            );
          })}
          {totalCards > 3 && (
            <div className={styles.thumbMore}>+{totalCards - 3}</div>
          )}
        </div>
        <div className={styles.entryMeta}>
          <div className={styles.entryDate}>
            {dateLabel}
            {spread && (
              <span className={styles.entryKind}> · {spread.accent} {spread.displayName}</span>
            )}
            {!spread && reading.type === 'CARD_OF_DAY' && (
              <span className={styles.entryKind}> · 🌙 карта дня</span>
            )}
          </div>
          <div className={`${styles.entryQuestion} ${!reading.question ? styles.untyped : ''}`}>
            {summary}
          </div>
        </div>
        <OutcomeBadge
          status={reading.outcomeStatus}
          onClick={(e) => {
            e.stopPropagation();
            onOpenOutcome();
          }}
        />
      </div>

      <AnimatePresence initial={false}>
        {expanded && (
          <motion.div
            className={styles.entryBody}
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.45, ease: [0.22, 0.85, 0.3, 1] }}
          >
            {spread ? (
              <div className={styles.layoutWrap}>
                <FinalLayout cards={reading.cards} spread={spread} />
              </div>
            ) : (
              <CardOfDayBody reading={reading} />
            )}
            <div className={styles.interpretation}>{reading.interpretation}</div>

            {reading.outcomeStatus && (
              <div className={styles.outcomeBlock}>
                <div className={styles.outcomeHead}>
                  <span className={styles.outcomeGlyph} aria-hidden="true">
                    {outcomeGlyph(reading.outcomeStatus)}
                  </span>
                  <span className={styles.outcomeLabel}>
                    {outcomeLabel(reading.outcomeStatus)}
                  </span>
                  {reading.outcomeRecordedAt && (
                    <span className={styles.outcomeDate}>
                      · {formatDateRu(new Date(reading.outcomeRecordedAt))}
                    </span>
                  )}
                </div>
                {reading.outcomeNote && (
                  <p className={styles.outcomeNote}>«{reading.outcomeNote}»</p>
                )}
                <button
                  type="button"
                  className={styles.outcomeEdit}
                  onClick={(e) => { e.stopPropagation(); onOpenOutcome(); }}
                >
                  изменить
                </button>
              </div>
            )}

            {!reading.outcomeStatus && (
              <button
                type="button"
                className={styles.outcomeCta}
                onClick={(e) => { e.stopPropagation(); onOpenOutcome(); }}
              >
                · отметить, как сбылось
              </button>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

interface OutcomeBadgeProps {
  status: ReadingOutcome | null;
  onClick: (e: React.MouseEvent) => void;
}

function OutcomeBadge({ status, onClick }: OutcomeBadgeProps) {
  const filled = status !== null;
  return (
    <button
      type="button"
      className={`${styles.outcomeBadge} ${filled ? styles.outcomeBadgeFilled : ''}`}
      onClick={onClick}
      aria-label={filled ? `Сбылось: ${outcomeLabel(status!)}` : 'Отметить как сбылось'}
      title={filled ? outcomeLabel(status!) : 'отметить, как сбылось'}
    >
      <span aria-hidden="true">{filled ? outcomeGlyph(status!) : '·'}</span>
    </button>
  );
}

function CardOfDayBody({ reading }: { reading: Reading }) {
  const rc = reading.cards[0];
  if (!rc) return null;
  const url = cardImageUrl(rc.card);
  return (
    <div className={styles.cardsRow}>
      <div className={styles.cardCol}>
        <div className={styles.cardArt}>
          {url && (
            <img
              src={url}
              alt={rc.card.nameRu}
              style={rc.reversed ? { transform: 'rotate(180deg)' } : undefined}
            />
          )}
        </div>
        <div className={styles.cardCaption}>
          {rc.card.nameRu}{rc.reversed ? ' ↓' : ''}
        </div>
        <div className={styles.cardCaption} style={{ opacity: 0.6 }}>карта дня</div>
      </div>
    </div>
  );
}

function spreadForType(type: ReadingType) {
  if (type === 'CARD_OF_DAY') return null;
  return SPREADS[type as SpreadId] ?? null;
}

function outcomeGlyph(status: ReadingOutcome): string {
  switch (status) {
    case 'CAME_TRUE': return '✨';
    case 'PARTIAL':   return '🌗';
    case 'MISSED':    return '🌑';
  }
}

function outcomeLabel(status: ReadingOutcome): string {
  switch (status) {
    case 'CAME_TRUE': return 'Сбылось';
    case 'PARTIAL':   return 'Частично';
    case 'MISSED':    return 'Мимо';
  }
}

function outcomeTitle(reading: Reading | undefined): string {
  if (!reading) return '';
  if (reading.question) return reading.question;
  if (reading.type === 'CARD_OF_DAY') {
    const firstCard = reading.cards[0]?.card.nameRu;
    return firstCard ? `карта дня — ${firstCard}` : 'карта дня';
  }
  const spread = spreadForType(reading.type);
  return spread ? spread.displayName.toLowerCase() : 'расклад';
}

const MONTHS = [
  'января', 'февраля', 'марта', 'апреля', 'мая', 'июня',
  'июля', 'августа', 'сентября', 'октября', 'ноября', 'декабря',
];

function formatDateRu(d: Date): string {
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);

  const sameDay = (a: Date, b: Date) =>
    a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();

  if (sameDay(d, today)) return 'сегодня';
  if (sameDay(d, yesterday)) return 'вчера';
  return `${d.getDate()} ${MONTHS[d.getMonth()]}`;
}
