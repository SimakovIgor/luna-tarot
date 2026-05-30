import { useState, type FormEvent } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ScreenContainer } from '@/components/ScreenContainer/ScreenContainer';
import { MoonBackground } from '@/components/MoonBackground/MoonBackground';
import { SparkleField } from '@/components/SparkleField/SparkleField';
import { OrnamentalDivider } from '@/components/OrnamentalDivider/OrnamentalDivider';
import { WhisperText } from '@/components/WhisperText/WhisperText';
import { GoldButton } from '@/components/GoldButton/GoldButton';
import { OrbitalLoader } from '@/components/OrbitalLoader/OrbitalLoader';
import { BackButton } from '@/components/BackButton/BackButton';
import { CompatibilityBar } from '@/components/CompatibilityBar/CompatibilityBar';
import { RichText } from '@/components/RichText/RichText';
import { generateCompatibilityPostcard, sharePostcard } from '@/util/postcard';
import { buildCompatibilityShareText } from '@/util/shareText';
import { BOT_URL } from '@/config';
import { extractFirstSentence } from '@/util/text';
import { calculateCompatibility, type CompatibilityResponse } from '@/api/compatibility';
import { ZODIAC_INFO } from '@/zodiac';
import { haptic } from '@/telegram/webapp';
import styles from './CompatibilityPage.module.css';

interface CompatibilityPageProps {
  onClose: () => void;
}

type Stage = 'form' | 'loading' | 'result';

export function CompatibilityPage({ onClose }: CompatibilityPageProps) {
  const [stage, setStage] = useState<Stage>('form');
  const [partnerName, setPartnerName] = useState('');
  const [partnerDate, setPartnerDate] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<CompatibilityResponse | null>(null);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    const trimmedName = partnerName.trim();
    if (trimmedName.length < 1 || trimmedName.length > 64) {
      setError('Имя — от 1 до 64 символов');
      return;
    }
    // type="date" уже возвращает ISO yyyy-MM-dd; валидируем что не пусто и не в будущем
    if (!partnerDate || !/^\d{4}-\d{2}-\d{2}$/.test(partnerDate)) {
      setError('Выбери дату рождения');
      return;
    }
    const picked = new Date(partnerDate);
    const now = new Date();
    if (picked > now) {
      setError('Дата рождения не может быть в будущем');
      return;
    }
    if (picked.getFullYear() < 1900) {
      setError('Странная дата — проверь год');
      return;
    }
    setStage('loading');
    try {
      const res = await calculateCompatibility({
        partnerName: trimmedName,
        partnerBirthDate: partnerDate,
      });
      setResult(res);
      haptic('medium');
      setStage('result');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'не вышло');
      setStage('form');
    }
  };

  return (
    <ScreenContainer>
      <MoonBackground />
      {stage === 'loading' && <SparkleField count={40} speed={1.8} />}
      <div className={styles.shell}>
        <div className={styles.topbar}>
          <BackButton onClick={onClose} />
          <span className={styles.topTitle}>совместимость</span>
          <span style={{ width: 50 }} />
        </div>

        <AnimatePresence mode="wait">
          {stage === 'form' && (
            <motion.div
              key="form"
              className={styles.formStage}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              transition={{ duration: 0.5 }}
            >
              <OrnamentalDivider label="кого спросим у Луны" />
              <p className={styles.subtitle}>
                расскажи о том, с кем хочешь сверить пути — Луна посмотрит на ваши знаки
              </p>

              <form className={styles.form} onSubmit={handleSubmit}>
                <label className={styles.field}>
                  <span className={styles.fieldLabel}>Имя</span>
                  <input
                    className={styles.input}
                    value={partnerName}
                    onChange={(e) => { setError(null); setPartnerName(e.target.value); }}
                    placeholder='напр. "Алина"'
                    maxLength={64}
                    autoFocus
                  />
                </label>
                <label className={styles.field}>
                  <span className={styles.fieldLabel}>Дата рождения</span>
                  <input
                    type="date"
                    className={`${styles.input} ${styles.dateInput}`}
                    value={partnerDate}
                    onChange={(e) => { setError(null); setPartnerDate(e.target.value); }}
                    max={new Date().toISOString().slice(0, 10)}
                    min="1900-01-01"
                  />
                </label>
                {error && <p className={styles.error}>{error}</p>}
                <input type="submit" hidden />
              </form>

              <div className={styles.actions}>
                <GoldButton variant="ghost" onClick={onClose}>Назад</GoldButton>
                <GoldButton onClick={() => handleSubmit(new Event('submit') as unknown as FormEvent)}>
                  Спросить Луну
                </GoldButton>
              </div>
            </motion.div>
          )}

          {stage === 'loading' && (
            <motion.div
              key="loading"
              className={styles.loadingStage}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.4 }}
            >
              <OrbitalLoader />
              <WhisperText size="m" tone="dim">
                Луна смотрит на вас обоих
              </WhisperText>
            </motion.div>
          )}

          {stage === 'result' && result && (
            <motion.div
              key="result"
              className={styles.resultStage}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.6 }}
            >
              <OrnamentalDivider label="между вами" />
              <ZodiacPair
                myZodiac={result.myZodiac}
                partnerZodiac={result.partnerZodiac}
                partnerName={result.partnerName}
              />
              <CompatibilityBar score={result.score} />
              <div className={styles.resultText}>
                <RichText source={result.text} />
              </div>
              <CompatShareButton result={result} />
              <div className={styles.actions}>
                <GoldButton variant="ghost" onClick={onClose}>На главную</GoldButton>
                <GoldButton onClick={() => {
                  setResult(null);
                  setPartnerName('');
                  setPartnerDate('');
                  setStage('form');
                }}>
                  Сравнить другого
                </GoldButton>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </ScreenContainer>
  );
}

// ── Кнопка «Поделиться» совместимостью ────────────────────────────

function CompatShareButton({ result }: { result: CompatibilityResponse }) {
  const [busy, setBusy] = useState(false);
  const [hint, setHint] = useState<string | null>(null);

  const handleClick = async () => {
    if (busy) {
      return;
    }
    setBusy(true);
    setHint(null);
    haptic('light');
    try {
      const me = ZODIAC_INFO[result.myZodiac];
      const partner = ZODIAC_INFO[result.partnerZodiac];
      const caption = extractFirstSentence(result.text);
      const blob = await generateCompatibilityPostcard({
        mySign: me.sign,
        mySymbol: me.symbol,
        partnerSign: partner.sign,
        partnerSymbol: partner.symbol,
        partnerName: result.partnerName,
        score: result.score,
        caption,
      });
      const shared = await sharePostcard(blob, {
        title: 'Luna · наша совместимость',
        text: buildCompatibilityShareText(result),
        url: BOT_URL,
        fileName: 'luna-compatibility.png',
      });
      setHint(shared === 'downloaded' ? 'открытка скачана' : null);
    } catch (e) {
      setHint(e instanceof Error ? e.message : 'не вышло');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
      <GoldButton onClick={handleClick} disabled={busy}>
        {busy ? 'Готовлю…' : 'Поделиться'}
      </GoldButton>
      {hint && (
        <div style={{ fontSize: 11, color: 'var(--ink-faint)', fontStyle: 'italic' }}>{hint}</div>
      )}
    </div>
  );
}

// ── Пара знаков: два круга с символами + связь между ──────────────

interface ZodiacPairProps {
  myZodiac: CompatibilityResponse['myZodiac'];
  partnerZodiac: CompatibilityResponse['partnerZodiac'];
  partnerName: string;
}

function ZodiacPair({ myZodiac, partnerZodiac, partnerName }: ZodiacPairProps) {
  const me = ZODIAC_INFO[myZodiac];
  const partner = ZODIAC_INFO[partnerZodiac];
  return (
    <div className={styles.pair}>
      <motion.div
        className={`${styles.zodiacOrb} ${styles[`elem_${me.element}`]}`}
        initial={{ opacity: 0, x: -16, scale: 0.85 }}
        animate={{ opacity: 1, x: 0, scale: 1 }}
        transition={{ duration: 0.7, delay: 0.1, ease: [0.22, 0.85, 0.3, 1] }}
      >
        <span className={styles.zodiacSymbol}>{me.symbol}</span>
        <span className={styles.zodiacLabel}>{me.sign}</span>
        <span className={styles.zodiacRole}>ты</span>
      </motion.div>

      <motion.div
        className={styles.pairLink}
        initial={{ opacity: 0, scaleX: 0 }}
        animate={{ opacity: 1, scaleX: 1 }}
        transition={{ duration: 0.7, delay: 0.4 }}
        aria-hidden="true"
      >
        <span className={styles.pairLinkSparkle}>✦</span>
      </motion.div>

      <motion.div
        className={`${styles.zodiacOrb} ${styles[`elem_${partner.element}`]}`}
        initial={{ opacity: 0, x: 16, scale: 0.85 }}
        animate={{ opacity: 1, x: 0, scale: 1 }}
        transition={{ duration: 0.7, delay: 0.1, ease: [0.22, 0.85, 0.3, 1] }}
      >
        <span className={styles.zodiacSymbol}>{partner.symbol}</span>
        <span className={styles.zodiacLabel}>{partner.sign}</span>
        <span className={styles.zodiacRole}>{partnerName}</span>
      </motion.div>
    </div>
  );
}
