import { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { ScreenContainer } from '@/components/ScreenContainer/ScreenContainer';
import { MoonBackground } from '@/components/MoonBackground/MoonBackground';
import { GoldButton } from '@/components/GoldButton/GoldButton';
import { TarotCard } from '@/components/TarotCard/TarotCard';
import { OrnamentalDivider } from '@/components/OrnamentalDivider/OrnamentalDivider';
import { BackButton } from '@/components/BackButton/BackButton';
import { WhisperText } from '@/components/WhisperText/WhisperText';
import { cardImageUrl, fetchCardOfDay, type Reading } from '@/api/reading';
import { formatTodayRu } from '@/util/format';
import styles from './CardOfDayPage.module.css';

interface CardOfDayPageProps {
  onClose: () => void;
  /** Если уже загружали на Hub — переиспользуем (без второго запроса). */
  preloaded?: Reading | null;
  /** Если карта уже открыта на Hub — пропускаем флип, сразу разворачиваем. */
  startFlipped?: boolean;
}

export function CardOfDayPage({ onClose, preloaded = null, startFlipped = false }: CardOfDayPageProps) {
  const [reading, setReading] = useState<Reading | null>(preloaded);
  const [error, setError] = useState<string | null>(null);
  const [flipped, setFlipped] = useState<boolean>(startFlipped);

  useEffect(() => {
    if (reading) return;
    let alive = true;
    fetchCardOfDay()
      .then((r) => { if (alive) setReading(r); })
      .catch((e) => { if (alive) setError(e instanceof Error ? e.message : 'error'); });
    return () => { alive = false; };
  }, [reading]);

  // Гороскоп переехал в Профиль — на CardOfDay только сама карта и её трактовка.

  const card = reading?.cards?.[0];
  const face = card ? cardImageUrl(card.card) : null;

  return (
    <ScreenContainer>
      <MoonBackground />
      <div className={styles.shell}>
        <div className={styles.topbar}>
          <BackButton onClick={onClose} />
          <span className={styles.dateLabel}>{formatTodayRu()}</span>
          <span style={{ width: 50 }} />
        </div>

        <div className={styles.stage}>
          <OrnamentalDivider label="карта дня" />
          <div className={styles.kicker}>судьба уже выбрала её для тебя</div>

          <TarotCard
            faceSrc={face ?? undefined}
            faceAlt={card?.card.nameRu ?? 'Карта дня'}
            reversed={card?.reversed ?? false}
            flipped={flipped}
            onFlip={setFlipped}
            uid="cod-page"
            size="l"
            interactive={!!face}
          />

          <AnimatePresence mode="wait">
            {!flipped && (
              <motion.div
                key="hint"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.4 }}
              >
                <WhisperText size="m" tone="dim">
                  {error
                    ? `Луна не отвечает (${error})`
                    : face
                      ? 'прикоснись к карте — Луна заговорит'
                      : 'Луна готовит карту…'}
                </WhisperText>
              </motion.div>
            )}

            {flipped && card && (
              <motion.div
                key="reveal"
                style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.6, delay: 0.3 }}
              >
                <div className={styles.name}>
                  {card.card.nameRu}{card.reversed ? ' (перевёрнута)' : ''}
                </div>
                {card.card.keywords?.length ? (
                  <div className={styles.keywords}>
                    {card.card.keywords.map((kw) => (
                      <span key={kw} className={styles.chip}>{kw}</span>
                    ))}
                  </div>
                ) : null}
                <div className={styles.reading}>
                  {reading?.interpretation || card.card.uprightMeaning}
                </div>
              </motion.div>
            )}
          </AnimatePresence>

        </div>

        <div className={styles.actions}>
          <GoldButton variant="ghost" onClick={onClose}>На главную</GoldButton>
        </div>
      </div>
    </ScreenContainer>
  );
}
