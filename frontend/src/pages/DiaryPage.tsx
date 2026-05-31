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
import {
  cancelCompatibilityInvite,
  fetchCompatibilityHistory,
  fetchCompatibilityPending,
  type CompatibilityHistoryItem,
  type CompatibilityPendingItem,
} from '@/api/compatibility';
import { haptic, isInTelegram, shareViaTelegram } from '@/telegram/webapp';
import { ZODIAC_INFO } from '@/zodiac';
import { SPREADS, type SpreadId } from '@/spreads/catalog';
import { FinalLayout } from '@/spreads/FinalLayout';
import styles from './DiaryPage.module.css';

interface DiaryPageProps {
  onClose: () => void;
}

interface OutcomeTarget {
  reading: Reading;
}

/**
 * В Дневнике смешиваем расклады и совместимости в общую timeline по дате.
 * Дискриминатор `kind` отличает их при рендере карточки.
 */
type DiaryItem =
  | { kind: 'reading'; data: Reading; createdAt: string }
  | { kind: 'compat'; data: CompatibilityHistoryItem; createdAt: string };

export function DiaryPage({ onClose }: DiaryPageProps) {
  const [items, setItems] = useState<DiaryItem[] | null>(null);
  const [pending, setPending] = useState<CompatibilityPendingItem[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [outcomeTarget, setOutcomeTarget] = useState<OutcomeTarget | null>(null);

  useEffect(() => {
    let alive = true;
    // Тянем 3 источника параллельно: расклады + совершившаяся совместимость
    // + pending-приглашения. Pending показывается отдельной секцией СВЕРХУ.
    Promise.all([
      fetchHistory(30).catch(() => [] as Reading[]),
      fetchCompatibilityHistory().catch(() => [] as CompatibilityHistoryItem[]),
      fetchCompatibilityPending().catch(() => [] as CompatibilityPendingItem[]),
    ])
      .then(([readings, compats, pendingItems]) => {
        if (!alive) return;
        const all: DiaryItem[] = [
          ...readings.map((r) => ({ kind: 'reading' as const, data: r, createdAt: r.createdAt })),
          ...compats.map((c) => ({ kind: 'compat' as const, data: c, createdAt: c.createdAt })),
        ].sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
        setItems(all);
        setPending(pendingItems);
      })
      .catch((e) => { if (alive) setError(e instanceof Error ? e.message : 'error'); });
    return () => { alive = false; };
  }, []);

  const replaceReading = (updated: Reading) => {
    setItems((prev) => prev?.map((it) =>
      it.kind === 'reading' && it.data.id === updated.id
        ? { ...it, data: updated }
        : it,
    ) ?? prev);
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
          ) : items.length === 0 && pending.length === 0 ? (
            <div className={styles.empty}>
              <WhisperText size="m" tone="dim">
                Луна ещё не звучала тебе. Сделай первый расклад — и он останется здесь.
              </WhisperText>
              <GoldButton onClick={onClose}>На главную</GoldButton>
            </div>
          ) : (
            <>
              {pending.length > 0 && (
                <div className={styles.pendingSection}>
                  <div className={styles.pendingHeader}>
                    <span className={styles.pendingDot} />
                    ждут ответа · {pending.length}
                  </div>
                  {pending.map((p) => (
                    <PendingInviteCard
                      key={p.id}
                      item={p}
                      onShare={() => {
                        haptic('medium');
                        const text = 'Пойдём, спросим у Луны? Открой ссылку — она посчитает нашу совместимость.';
                        if (isInTelegram()) {
                          shareViaTelegram(text, p.shareUrl);
                        } else {
                          const nav = navigator as Navigator & {
                            share?: (data: { title?: string; text?: string; url?: string }) => Promise<void>;
                            clipboard?: { writeText: (s: string) => Promise<void> };
                          };
                          if (nav.share) {
                            nav.share({ title: 'Luna · совместимость', text, url: p.shareUrl }).catch(() => {});
                          } else if (nav.clipboard) {
                            nav.clipboard.writeText(p.shareUrl).catch(() => {});
                          }
                        }
                      }}
                      onCancel={async () => {
                        haptic('medium');
                        try {
                          await cancelCompatibilityInvite(p.slug);
                          setPending((prev) => prev.filter((x) => x.slug !== p.slug));
                        } catch (e) {
                          setError(e instanceof Error ? e.message : 'не вышло');
                        }
                      }}
                    />
                  ))}
                </div>
              )}
            <div className={styles.timeline}>
              {items.map((it, idx) => {
                const key = it.kind + '-' + it.data.id;
                const expanded = expandedId === key;
                const onToggle = () => {
                  haptic('light');
                  setExpandedId(expanded ? null : key);
                };
                if (it.kind === 'reading') {
                  return (
                    <DiaryEntry
                      key={key}
                      reading={it.data}
                      index={idx}
                      expanded={expanded}
                      onToggle={onToggle}
                      onOpenOutcome={() => {
                        haptic('light');
                        setOutcomeTarget({ reading: it.data });
                      }}
                    />
                  );
                }
                return (
                  <CompatDiaryEntry
                    key={key}
                    item={it.data}
                    expanded={expanded}
                    onToggle={onToggle}
                  />
                );
              })}
            </div>
            </>
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
          replaceReading(updated);
        }}
        onClear={async () => {
          if (!outcomeTarget) return;
          const updated = await clearOutcome(outcomeTarget.reading.id);
          replaceReading(updated);
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

// ── CompatDiaryEntry ────────────────────────────────────────
// Карточка совместимости в Дневнике. Header: «с {имя} · {date}»,
// два знака с символами + % резонанса справа. По клику — раскрывается
// полный текст разбора.

interface CompatDiaryEntryProps {
  item: CompatibilityHistoryItem;
  expanded: boolean;
  onToggle: () => void;
}

function CompatDiaryEntry({ item, expanded, onToggle }: CompatDiaryEntryProps) {
  const me = ZODIAC_INFO[item.myZodiac];
  const partner = ZODIAC_INFO[item.partnerZodiac];
  const headline = item.role === 'INITIATOR'
    ? `с ${item.partnerName}`
    : `${item.partnerName} пригласил${item.partnerName.endsWith('а') ? 'а' : ''}`;
  const dateLabel = formatDateRu(new Date(item.createdAt));
  return (
    <button
      type="button"
      className={`${styles.compatEntry} ${expanded ? styles.compatEntryOpen : ''}`}
      onClick={onToggle}
    >
      <div className={styles.compatHeadRow}>
        <span className={styles.entryDate}>{dateLabel}</span>
        <span className={styles.compatRoleBadge}>
          {item.role === 'INITIATOR' ? 'ты' : 'тебя позвали'}
        </span>
      </div>
      <div className={styles.compatBody}>
        <div className={styles.compatSignBlock}>
          <span className={styles.compatGlyph}>{me.symbol}</span>
          <span className={styles.compatSignName}>{me.sign}</span>
        </div>
        <div className={styles.compatLinkLine} aria-hidden="true">
          <span className={styles.compatSpark}>✦</span>
        </div>
        <div className={styles.compatSignBlock}>
          <span className={styles.compatGlyph}>{partner.symbol}</span>
          <span className={styles.compatSignName}>{partner.sign}</span>
        </div>
      </div>
      <div className={styles.compatFoot}>
        <span className={styles.compatHeadline}>{headline}</span>
        <span className={styles.compatScoreBig}>{item.score}<span className={styles.compatScorePct}>%</span></span>
      </div>
      {expanded && (
        <div className={styles.compatText}>
          {item.text}
        </div>
      )}
    </button>
  );
}

// ── PendingInviteCard ──────────────────────────────────────
// Карточка незавершённого приглашения в «ждут ответа».
// Видит только инициатор. Цель — дать ему быстро переотправить
// ссылку другу если тот ещё не открыл.

interface PendingInviteCardProps {
  item: CompatibilityPendingItem;
  onShare: () => void;
  onCancel: () => void;
}

function PendingInviteCard({ item, onShare, onCancel }: PendingInviteCardProps) {
  const dateLabel = formatDateRu(new Date(item.createdAt));
  return (
    <div className={styles.pendingCard}>
      <div className={styles.pendingMeta}>
        <span className={styles.entryDate}>{dateLabel}</span>
        <span className={styles.pendingTitle}>приглашение · ждёт</span>
      </div>
      <code className={styles.pendingUrl}>{item.shareUrl.replace('https://', '')}</code>
      <div className={styles.pendingActions}>
        <button type="button" className={styles.pendingShareBtn} onClick={onShare}>
          ↗ переотправить
        </button>
        <button type="button" className={styles.pendingCancelBtn} onClick={onCancel}>
          удалить
        </button>
      </div>
    </div>
  );
}
