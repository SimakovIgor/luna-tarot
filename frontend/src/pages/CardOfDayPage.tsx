import { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { ScreenContainer } from '@/components/ScreenContainer/ScreenContainer';
import { MoonBackground } from '@/components/MoonBackground/MoonBackground';
import { GoldButton } from '@/components/GoldButton/GoldButton';
import { TarotCard } from '@/components/TarotCard/TarotCard';
import { OrnamentalDivider } from '@/components/OrnamentalDivider/OrnamentalDivider';
import { WhisperText } from '@/components/WhisperText/WhisperText';
import { RichText } from '@/components/RichText/RichText';
import { cardImageUrl, fetchCardOfDay, type Reading } from '@/api/reading';
import { fetchTodayHoroscope, type HoroscopeResponse } from '@/api/horoscope';
import { ZODIAC_INFO } from '@/zodiac';
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
  const [horoscope, setHoroscope] = useState<HoroscopeResponse | null>(null);
  const [horoscopeError, setHoroscopeError] = useState<string | null>(null);

  useEffect(() => {
    if (reading) return;
    let alive = true;
    fetchCardOfDay()
      .then((r) => { if (alive) setReading(r); })
      .catch((e) => { if (alive) setError(e instanceof Error ? e.message : 'error'); });
    return () => { alive = false; };
  }, [reading]);

  // Гороскоп тянется сразу при mount — независимо от reading.
  // На фронте только тут (на хабе его нет — слишком много контента).
  useEffect(() => {
    let alive = true;
    fetchTodayHoroscope()
      .then((h) => { if (alive) setHoroscope(h); })
      .catch((e) => { if (alive) setHoroscopeError(e instanceof Error ? e.message : 'error'); });
    return () => { alive = false; };
  }, []);

  const card = reading?.cards?.[0];
  const face = card ? cardImageUrl(card.card) : null;

  return (
    <ScreenContainer>
      <MoonBackground />
      <div className={styles.shell}>
        <div className={styles.topbar}>
          <button type="button" className={styles.back} onClick={onClose}>← Назад</button>
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

          {/* Гороскоп — отдельная карточка-блок с золотой обводкой и углами «манускрипта».
              Появляется после флипа большой карты. */}
          {flipped && (
            <motion.section
              className={styles.horoscopeCard}
              initial={{ opacity: 0, y: 16, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ duration: 0.7, delay: 0.9, ease: [0.22, 0.85, 0.3, 1] }}
            >
              <div className={styles.horoscopeHeader}>
                <span className={styles.horoscopeKicker}>гороскоп на сегодня</span>
                {horoscope?.zodiac && (
                  <div className={styles.horoscopeZodiac}>
                    <span className={styles.horoscopeSymbol}>{ZODIAC_INFO[horoscope.zodiac].symbol}</span>
                    <span className={styles.horoscopeName}>{ZODIAC_INFO[horoscope.zodiac].sign}</span>
                  </div>
                )}
              </div>
              <div className={styles.horoscopeBody}>
                {horoscope ? (
                  <RichText source={horoscope.text} />
                ) : horoscopeError ? (
                  <span className={styles.horoscopeMuted}>гороскоп не загрузился</span>
                ) : (
                  <span className={styles.horoscopeMuted}>Луна шепчет твой день…</span>
                )}
              </div>
            </motion.section>
          )}
        </div>

        <div className={styles.actions}>
          <GoldButton variant="ghost" onClick={onClose}>На главную</GoldButton>
        </div>
      </div>
    </ScreenContainer>
  );
}
