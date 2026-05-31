import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { ScreenContainer } from '@/components/ScreenContainer/ScreenContainer';
import { MoonBackground } from '@/components/MoonBackground/MoonBackground';
import { SparkleField } from '@/components/SparkleField/SparkleField';
import { AppHeader } from '@/components/AppHeader/AppHeader';
import { OrnamentalDivider } from '@/components/OrnamentalDivider/OrnamentalDivider';
import { RitualTile } from '@/components/EntryCard/RitualTile';
import { DayCard } from '@/components/DayCard/DayCard';
import type { MeResponse } from '@/api/me';
import { cardImageUrl, type Reading } from '@/api/reading';
import { formatTodayRu } from '@/util/format';
import { SPREAD_LIST, type SpreadId } from '@/spreads/catalog';
import { SpreadIcon } from '@/spreads/SpreadIcon';
import { ReadingFlowPage } from './ReadingFlowPage';
import { CardOfDayPage } from './CardOfDayPage';
import { DiaryPage } from './DiaryPage';
import { ProfilePage } from './ProfilePage';
import { CompatibilityPage } from './CompatibilityPage';
import { SupportSheet } from '@/components/SupportSheet/SupportSheet';
import { fetchMe } from '@/api/me';
import styles from './HubPage.module.css';

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
  /** true когда splash ушёл — триггерит fade-in ритуалов и дневника. */
  reveal?: boolean;
  /** Колбэк в App при смене под-экрана: 'hub' = виден главный, 'other' = sub-page. */
  onSubViewChange?: (view: 'hub' | 'other') => void;
}

type View =
  | { name: 'hub' }
  | { name: 'reading'; spreadId: SpreadId }
  | { name: 'card-of-day' }
  | { name: 'diary' }
  | { name: 'profile' }
  | { name: 'compatibility' };

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
}: HubPageProps) {
  const [view, setView] = useState<View>({ name: 'hub' });
  const [supportOpen, setSupportOpen] = useState(false);

  const handleDonated = async () => {
    try {
      const fresh = await fetchMe();
      onMeUpdated(fresh);
    } catch {
      // обновим в следующий раз — необязательное действие
    }
  };

  // Сообщаем App про смену под-экрана — чтобы DayCard скрывалась когда мы не на хабе.
  useEffect(() => {
    onSubViewChange?.(view.name === 'hub' ? 'hub' : 'other');
  }, [view.name, onSubViewChange]);

  if (view.name === 'reading') {
    return <ReadingFlowPage spreadId={view.spreadId} onClose={() => setView({ name: 'hub' })} />;
  }
  if (view.name === 'card-of-day') {
    return <CardOfDayPage onClose={() => setView({ name: 'hub' })} preloaded={cardOfDay} startFlipped={dayFlipped} />;
  }
  if (view.name === 'diary') {
    return <DiaryPage onClose={() => setView({ name: 'hub' })} />;
  }
  if (view.name === 'profile') {
    return (
      <ProfilePage
        me={me}
        onMeUpdated={onMeUpdated}
        onClose={() => setView({ name: 'hub' })}
        horoscope={horoscope}
        horoscopeError={horoscopeError}
      />
    );
  }
  if (view.name === 'compatibility') {
    return <CompatibilityPage onClose={() => setView({ name: 'hub' })} />;
  }

  const firstCard = cardOfDay?.cards?.[0];
  const reversed = firstCard?.reversed ?? false;
  void cardImageUrl; // util остался импортированным на случай возврата к локальному рендерингу

  return (
    <ScreenContainer>
      <MoonBackground />
      <SparkleField count={55} />
      <AppHeader
        dateLabel={formatTodayRu()}
        name={me.name}
        onProfileClick={() => setView({ name: 'profile' })}
        logoSrc="/app/luna-logo.png"
      />

      {/* Карта дня — inline в потоке. Над ней ярлык «Карта дня», ниже название
          карты + «Читать полностью». Всё скроллится как единый блок, никакого
          position:fixed (раньше карта ехала со скроллом в Telegram WebView). */}
      <div className={styles.dayCardBlock}>
        <div className={styles.dayCardLabel} aria-hidden="true">Карта дня</div>
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
                {firstCard.card.nameRu}{reversed ? ' ↓' : ''}
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

      {/* Дно: ритуалы + дневник. Появляются после splash через motion-управление
          (key=reveal ставит triggers — при смене false→true перезапускает animation). */}
      <div className={styles.bottomStack}>
        <motion.section
          className={styles.ritualSection}
          initial={{ opacity: 0, y: 14 }}
          animate={reveal ? { opacity: 1, y: 0 } : { opacity: 0, y: 14 }}
          transition={{ duration: 0.8, delay: 0.1, ease: [0.22, 0.85, 0.3, 1] }}
        >
          <OrnamentalDivider label="расклады" />
          <div className={styles.ritualGrid}>
            {SPREAD_LIST.map((s, i) => (
              <motion.div
                key={s.id}
                initial={{ opacity: 0, y: 14 }}
                animate={reveal ? { opacity: 1, y: 0 } : { opacity: 0, y: 14 }}
                transition={{
                  duration: 0.7,
                  delay: 0.35 + i * 0.12,
                  ease: [0.22, 0.85, 0.3, 1],
                }}
              >
                <RitualTile
                  icon={<SpreadIcon id={s.id} />}
                  title={s.displayName}
                  meta={s.shortHint}
                  cardCount={s.cardCount}
                  accent={s.accent}
                  delayMs={0}
                  onClick={() => setView({ name: 'reading', spreadId: s.id })}
                />
              </motion.div>
            ))}
          </div>
        </motion.section>

        <motion.button
          type="button"
          className={styles.diaryRow}
          onClick={() => setView({ name: 'compatibility' })}
          initial={{ opacity: 0, y: 14 }}
          animate={reveal ? { opacity: 1, y: 0 } : { opacity: 0, y: 14 }}
          transition={{ duration: 0.7, delay: 0.85, ease: [0.22, 0.85, 0.3, 1] }}
        >
          <svg className={styles.diaryIcon} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2" aria-hidden="true">
            <circle cx="9" cy="12" r="6" />
            <circle cx="15" cy="12" r="6" />
          </svg>
          <span className={styles.diaryText}>
            <span className={styles.diaryTitle}>Совместимость</span>
            <span className={styles.diaryHint}>сравни себя с другим</span>
          </span>
          <span className={styles.diaryArrow} aria-hidden="true">→</span>
        </motion.button>

        <motion.button
          type="button"
          className={styles.diaryRow}
          onClick={() => setView({ name: 'diary' })}
          initial={{ opacity: 0, y: 14 }}
          animate={reveal ? { opacity: 1, y: 0 } : { opacity: 0, y: 14 }}
          transition={{ duration: 0.7, delay: 0.97, ease: [0.22, 0.85, 0.3, 1] }}
        >
          <svg className={styles.diaryIcon} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2" aria-hidden="true">
            <path d="M4 4h12a3 3 0 013 3v13H7a3 3 0 01-3-3V4z" />
            <path d="M4 17a3 3 0 013-3h12" />
          </svg>
          <span className={styles.diaryText}>
            <span className={styles.diaryTitle}>Дневник</span>
            <span className={styles.diaryHint}>прошлые расклады</span>
          </span>
          <span className={styles.diaryArrow} aria-hidden="true">→</span>
        </motion.button>

        <motion.button
          type="button"
          className={`${styles.diaryRow} ${styles.supportRow}`}
          onClick={() => setSupportOpen(true)}
          initial={{ opacity: 0, y: 14 }}
          animate={reveal ? { opacity: 1, y: 0 } : { opacity: 0, y: 14 }}
          transition={{ duration: 0.7, delay: 1.09, ease: [0.22, 0.85, 0.3, 1] }}
        >
          <svg className={styles.diaryIcon} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2" aria-hidden="true">
            <path d="M12 3l2.4 5.4L20 9l-4 4 1 6-5-2.8L7 19l1-6-4-4 5.6-.6L12 3z" />
          </svg>
          <span className={styles.diaryText}>
            <span className={styles.diaryTitle}>Поддержать Луну</span>
            <span className={styles.diaryHint}>звёзды для Луны</span>
          </span>
          <span className={styles.diaryArrow} aria-hidden="true">→</span>
        </motion.button>
      </div>

      <SupportSheet
        open={supportOpen}
        onClose={() => setSupportOpen(false)}
        onDonated={handleDonated}
      />
    </ScreenContainer>
  );
}
