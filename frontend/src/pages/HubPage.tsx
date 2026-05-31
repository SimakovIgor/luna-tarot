import { lazy, Suspense, useEffect, useState, type MutableRefObject } from 'react';
import { motion } from 'framer-motion';
import { DayCard } from '@/components/DayCard/DayCard';
import { fetchMe, type MeResponse } from '@/api/me';
import { cardImageUrl, type Reading } from '@/api/reading';
import { formatTodayRu } from '@/util/format';
import { SPREAD_LIST, type SpreadId } from '@/spreads/catalog';
import styles from './HubPage.module.css';

// Тяжёлые под-страницы грузятся в момент перехода (а не в initial bundle).
// На главном экране они не нужны — это даёт быстрый first paint в Telegram WebView.
const ReadingFlowPage   = lazy(() => import('./ReadingFlowPage').then((m) => ({ default: m.ReadingFlowPage })));
const CardOfDayPage     = lazy(() => import('./CardOfDayPage').then((m) => ({ default: m.CardOfDayPage })));
const DiaryPage         = lazy(() => import('./DiaryPage').then((m) => ({ default: m.DiaryPage })));
const ProfilePage       = lazy(() => import('./ProfilePage').then((m) => ({ default: m.ProfilePage })));
const CompatibilityPage = lazy(() => import('./CompatibilityPage').then((m) => ({ default: m.CompatibilityPage })));
const SupportPage       = lazy(() => import('./SupportPage').then((m) => ({ default: m.SupportPage })));

/**
 * Пустой fallback для Suspense на под-страницах — экран и так анимирует
 * вход через AnimatePresence/motion на странице, отдельный лоадер только
 * добавит мерцания.
 */
const SUB_PAGE_FALLBACK = null;

interface HubPageProps {
  me: MeResponse;
  onMeUpdated: (me: MeResponse) => void;
  /** Карта дня данные — приходит из App (живёт там же, где DayCard компонент). */
  cardOfDay: Reading | null;
  dayFlipped: boolean;
  onDayFlip: (v: boolean) => void;
  /** Гороскоп показывается в Профиле; HubPage только пробрасывает. */
  horoscope: import('@/api/horoscope').HoroscopeResponse | null;
  horoscopeError: string | null;
  /** true когда splash ушёл — триггерит stagger fade-in блоков хаба. */
  reveal?: boolean;
  /** Колбэк в App при смене под-экрана: 'hub' = виден главный, 'other' = sub-page. */
  onSubViewChange?: (view: 'hub' | 'other') => void;
  /** Общий со StarField ref скорости звёзд (0=splash, 1=home). */
  calmRef: MutableRefObject<number>;
  /**
   * Если приложение открыли по invite-deeplink (?startapp=compat_xxx),
   * App вытаскивает slug и передаёт сюда — Hub сразу переключается на
   * Compatibility-view в режиме invitee.
   */
  initialCompatInviteSlug?: string | null;
}

type View =
  | { name: 'hub' }
  | { name: 'reading'; spreadId: SpreadId }
  | { name: 'card-of-day' }
  | { name: 'diary' }
  | { name: 'profile' }
  | { name: 'compatibility'; inviteSlug?: string }
  | { name: 'support' };

/** Карта SpreadId → ключ SVG-иконки (раскладка-схема для SpreadIcon). */
const SPREAD_ICON_BY_ID: Record<SpreadId, IconKind> = {
  YES_NO: 'yesno',
  THREE_CARD: 'three',
  LOVE: 'love',
  CELTIC_CROSS: 'full',
  YEAR_WHEEL: 'year',
};

export function HubPage({
  me,
  onMeUpdated,
  cardOfDay,
  dayFlipped,
  onDayFlip,
  horoscope,
  horoscopeError,
  reveal = true,
  onSubViewChange,
  calmRef,
  initialCompatInviteSlug,
}: HubPageProps) {
  const [view, setView] = useState<View>(
    initialCompatInviteSlug
      ? { name: 'compatibility', inviteSlug: initialCompatInviteSlug }
      : { name: 'hub' },
  );

  // Сообщаем App про смену под-экрана — чтобы DayCard скрывалась когда мы не на хабе.
  useEffect(() => {
    onSubViewChange?.(view.name === 'hub' ? 'hub' : 'other');
  }, [view.name, onSubViewChange]);

  if (view.name === 'reading') {
    return (
      <Suspense fallback={SUB_PAGE_FALLBACK}>
        <ReadingFlowPage spreadId={view.spreadId} onClose={() => setView({ name: 'hub' })} />
      </Suspense>
    );
  }
  if (view.name === 'card-of-day') {
    return (
      <Suspense fallback={SUB_PAGE_FALLBACK}>
        <CardOfDayPage onClose={() => setView({ name: 'hub' })} preloaded={cardOfDay} startFlipped={dayFlipped} />
      </Suspense>
    );
  }
  if (view.name === 'diary') {
    return (
      <Suspense fallback={SUB_PAGE_FALLBACK}>
        <DiaryPage onClose={() => setView({ name: 'hub' })} />
      </Suspense>
    );
  }
  if (view.name === 'profile') {
    return (
      <Suspense fallback={SUB_PAGE_FALLBACK}>
        <ProfilePage
          me={me}
          onMeUpdated={onMeUpdated}
          onClose={() => setView({ name: 'hub' })}
          horoscope={horoscope}
          horoscopeError={horoscopeError}
          onTapSupport={() => setView({ name: 'support' })}
        />
      </Suspense>
    );
  }
  if (view.name === 'compatibility') {
    return (
      <Suspense fallback={SUB_PAGE_FALLBACK}>
        <CompatibilityPage
          onClose={() => setView({ name: 'hub' })}
          pendingInviteSlug={view.inviteSlug}
          myName={me.name}
        />
      </Suspense>
    );
  }
  if (view.name === 'support') {
    return (
      <Suspense fallback={SUB_PAGE_FALLBACK}>
        <SupportPage
          onClose={() => setView({ name: 'hub' })}
          onDonated={async () => {
            try {
              const fresh = await fetchMe();
              onMeUpdated(fresh);
            } catch {
              // тихо игнорируем — обновим в следующий заход
            }
          }}
        />
      </Suspense>
    );
  }

  const firstCard = cardOfDay?.cards?.[0];
  const reversed = firstCard?.reversed ?? false;
  void cardImageUrl; // util остался импортированным на случай возврата к локальному рендерингу

  const initial = me.name?.trim().charAt(0).toUpperCase() || '✦';

  // Stagger: каждый блок появляется через 0.07s * index после reveal.
  const stagger = (i: number) => ({
    initial: { opacity: 0, y: 16 },
    animate: reveal ? { opacity: 1, y: 0 } : { opacity: 0, y: 16 },
    transition: { duration: 0.6, delay: 0.1 + i * 0.07, ease: [0.22, 0.85, 0.3, 1] as const },
  });

  // calmRef живёт в App, прокинут сюда только для совместимости сигнатуры.
  void calmRef;

  return (
    <div className={styles.root}>
      <div className={styles.content}>
        {/* Верхняя строка: дата · лого · аватар */}
        <motion.div className={styles.topRow} {...stagger(0)}>
          <div className={styles.datePill}>
            <span className={styles.dateGlyph} aria-hidden="true">✦</span>
            <span className={styles.dateText}>{formatTodayRu()}</span>
          </div>
          <img
            src="/app/luna-logo.png"
            alt="Luna"
            className={styles.headerLogo}
            draggable={false}
          />
          <button
            type="button"
            className={styles.avatar}
            onClick={() => setView({ name: 'profile' })}
            aria-label="Профиль"
          >
            {initial}
          </button>
        </motion.div>

        {/* Карта дня */}
        <motion.section className={styles.dayBlock} {...stagger(1)}>
          <SectionLabel>Карта дня</SectionLabel>
          <div className={styles.dayCardFloat}>
            <DayCard
              cardOfDay={cardOfDay}
              flipped={dayFlipped}
              onFlip={onDayFlip}
              spinning={false}
              interactive={reveal}
              inline
            />
          </div>
          <div className={styles.dayCaption}>
            {firstCard ? (
              dayFlipped ? (
                <>
                  <div className={styles.dayName}>
                    {firstCard.card.nameRu}
                    {reversed ? ' ↓' : ''}
                  </div>
                  <button
                    type="button"
                    className={styles.readMore}
                    onClick={() => setView({ name: 'card-of-day' })}
                  >
                    Читать полностью
                  </button>
                </>
              ) : (
                <span className={styles.dayHint}>коснись, чтобы открыть</span>
              )
            ) : (
              <span className={styles.dayHint}>Луна готовит карту…</span>
            )}
          </div>
        </motion.section>

        {/* Расклады */}
        <motion.div className={styles.sectionHead} {...stagger(2)}>
          <SectionLabel>Расклады</SectionLabel>
        </motion.div>
        <div className={styles.rowList}>
          {SPREAD_LIST.map((s, i) => (
            <motion.div key={s.id} {...stagger(3 + i)}>
              <SpreadRow
                icon={SPREAD_ICON_BY_ID[s.id]}
                count={String(s.cardCount)}
                title={s.displayName}
                sub={s.shortHint}
                onTap={() => setView({ name: 'reading', spreadId: s.id })}
              />
            </motion.div>
          ))}
        </div>

        {/* Ещё */}
        <motion.div className={styles.sectionHead} {...stagger(8)}>
          <SectionLabel>Ещё</SectionLabel>
        </motion.div>
        <div className={styles.rowList}>
          <motion.div {...stagger(9)}>
            <SpreadRow
              icon="compat"
              title="Совместимость"
              sub="сравни себя с другим"
              onTap={() => setView({ name: 'compatibility' })}
            />
          </motion.div>
          <motion.div {...stagger(10)}>
            <SpreadRow
              icon="diary"
              title="Дневник"
              sub="история твоих раскладов"
              onTap={() => setView({ name: 'diary' })}
            />
          </motion.div>
          <motion.div {...stagger(11)}>
            <SpreadRow
              icon="support"
              title="Поддержать Луну"
              sub="звёзды для Луны"
              warm
              onTap={() => setView({ name: 'support' })}
            />
          </motion.div>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Локальные компоненты разметки хаба.
// ─────────────────────────────────────────────────────────────────────────────

/** Тонкий золотой UPPERCASE-кикер с боковыми линиями-градиентами. */
function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div className={styles.label}>
      <span className={styles.labelRule} />
      <span className={styles.labelText}>{children}</span>
      <span className={styles.labelRule} />
    </div>
  );
}

type IconKind = 'yesno' | 'three' | 'love' | 'full' | 'year' | 'compat' | 'diary' | 'support';

interface SpreadRowProps {
  icon: IconKind;
  count?: string;
  title: string;
  sub: string;
  /** Тёплая золотая подсветка (для «Поддержать Луну»). */
  warm?: boolean;
  onTap: () => void;
}

function SpreadRow({ icon, count, title, sub, warm, onTap }: SpreadRowProps) {
  return (
    <button
      type="button"
      onClick={onTap}
      className={`${styles.row} ${warm ? styles.rowWarm : ''}`}
    >
      <span className={styles.rowIcon}>
        <SpreadIconSvg kind={icon} />
        {count && <span className={styles.rowBadge}>{count}</span>}
      </span>
      <span className={styles.rowText}>
        <span className={styles.rowTitle}>{title}</span>
        <span className={styles.rowSub}>{sub}</span>
      </span>
      <span className={styles.rowArrow} aria-hidden="true">→</span>
    </button>
  );
}

/** SVG-схемы layout-ов раскладов (по образцу handoff: 34×34, золотой stroke). */
function SpreadIconSvg({ kind }: { kind: IconKind }) {
  const stroke = '#d9b878';
  const card = (x: number, y: number, w = 6, h = 9) => (
    <rect x={x} y={y} width={w} height={h} rx={1.2} fill="none" stroke={stroke} strokeWidth={1.4} strokeOpacity={0.85} />
  );
  return (
    <svg width="34" height="34" viewBox="0 0 34 34" aria-hidden="true">
      {kind === 'yesno' && (
        <g>
          {card(8, 12)}
          {card(15, 9)}
          {card(22, 12)}
        </g>
      )}
      {kind === 'three' && (
        <g>
          {card(6, 12)}
          {card(14, 12)}
          {card(22, 12)}
        </g>
      )}
      {kind === 'love' && (
        <g>
          {card(13, 5, 8, 5)}
          {card(5, 14)}
          {card(14, 14)}
          {card(23, 14)}
          {card(13, 24, 8, 5)}
        </g>
      )}
      {kind === 'full' && (
        <g>
          {card(14, 4, 6, 6)}
          {card(5, 12)}
          {card(14, 12)}
          {card(23, 12)}
          {card(14, 23, 6, 6)}
        </g>
      )}
      {kind === 'year' && (
        <g fill="none" stroke={stroke} strokeWidth={1.4} strokeOpacity={0.85}>
          <circle cx="17" cy="17" r="11" />
          <circle cx="17" cy="6" r="1.6" fill={stroke} />
          <circle cx="28" cy="17" r="1.6" fill={stroke} />
          <circle cx="17" cy="28" r="1.6" fill={stroke} />
          <circle cx="6" cy="17" r="1.6" fill={stroke} />
        </g>
      )}
      {kind === 'compat' && (
        <g fill="none" stroke={stroke} strokeWidth={1.4} strokeOpacity={0.85}>
          <circle cx="13" cy="17" r="8" />
          <circle cx="21" cy="17" r="8" />
        </g>
      )}
      {kind === 'diary' && (
        <g>
          {card(9, 7, 16, 20)}
          <line x1="9" y1="13" x2="25" y2="13" stroke={stroke} strokeWidth={1.4} strokeOpacity={0.85} />
          <line x1="9" y1="19" x2="25" y2="19" stroke={stroke} strokeWidth={1.4} strokeOpacity={0.85} />
        </g>
      )}
      {kind === 'support' && (
        <g fill="none" stroke={stroke} strokeWidth={1.4} strokeOpacity={0.85}>
          <path d="M17,6 l3,7 8,0.5 -6,5 2,8 -7,-4 -7,4 2,-8 -6,-5 8,-0.5 z" />
        </g>
      )}
    </svg>
  );
}
