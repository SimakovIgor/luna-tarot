import { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import {
  createDonationInvoice,
  openInvoice,
  type DonationAmount,
  type InvoiceStatus,
} from '@/api/donation';
import { haptic } from '@/telegram/webapp';
import { GoldButton } from '@/components/GoldButton/GoldButton';
import { track, reportError } from '@/observability';
import styles from './SupportPage.module.css';

interface SupportPageProps {
  onClose: () => void;
  /** Дёргается после успешной оплаты — для перезапроса /me и обновления totalStars. */
  onDonated?: (stars: DonationAmount) => void;
}

interface Tier {
  amount: DonationAmount;
  name: string;
  desc: string;
}

const TIERS: Tier[] = [
  { amount: 30,  name: 'Шёпот',       desc: 'тёплый кивок Луне' },
  { amount: 50,  name: 'Искра',       desc: 'поддержать развитие' },
  { amount: 150, name: 'Лунный свет', desc: 'щедрый дар Луне' },
];

const DEFAULT_TIER: DonationAmount = 50;

type View = 'choose' | 'paying' | 'thanks';

// 4 фиксированные позиции для sparkle вокруг луны (top%, left%, размер px).
const SPARKLE_POS: ReadonlyArray<[string, string, number]> = [
  ['18%', '10%', 12],
  ['12%', '78%', 9],
  ['74%', '82%', 11],
  ['80%', '16%', 8],
];

export function SupportPage({ onClose, onDonated }: SupportPageProps) {
  const [selected, setSelected] = useState<DonationAmount>(DEFAULT_TIER);
  const [view, setView] = useState<View>('choose');
  const [error, setError] = useState<string | null>(null);
  const [paidAmount, setPaidAmount] = useState<DonationAmount | null>(null);

  useEffect(() => {
    setSelected(DEFAULT_TIER);
    setView('choose');
    setError(null);
    setPaidAmount(null);
  }, []);

  const busy = view === 'paying';

  const handleConfirm = async () => {
    if (busy) return;
    setError(null);
    setView('paying');
    haptic('medium');
    track('donate_initiated', { stars: selected });
    try {
      const { slug } = await createDonationInvoice(selected);
      const status: InvoiceStatus = await openInvoice(slug);
      if (status === 'paid') {
        track('donate_completed', { stars: selected });
        setPaidAmount(selected);
        setView('thanks');
        onDonated?.(selected);
      } else if (status === 'cancelled') {
        track('donate_cancelled', { stars: selected });
        setView('choose');
      } else {
        track('donate_failed', { stars: selected, status });
        setError('Что-то пошло не так. Попробуй ещё раз?');
        setView('choose');
      }
    } catch (e) {
      reportError(e, { where: 'SupportPage.confirm', stars: selected });
      setError('Не удалось открыть инвойс. Попробуй чуть позже.');
      setView('choose');
    }
  };

  const sparkles = useMemo(
    () => (view === 'thanks' ? makeSparkles(22) : []),
    [view],
  );

  return (
    <div className={styles.shell}>
      <div className={styles.topbar}>
        <button type="button" className={styles.backBtn} onClick={onClose} disabled={busy}>
          ← Назад
        </button>
      </div>

      <div className={styles.body}>
        {view !== 'thanks' && (
          <>
            <div className={styles.hero} aria-hidden="true">
              <div className={styles.moonHalo} />
              <div className={styles.moon} />
              {SPARKLE_POS.map(([top, left, size], i) => (
                <svg
                  key={i}
                  width={size}
                  height={size}
                  viewBox="-12 -12 24 24"
                  className={styles.sparkleDecor}
                  style={{
                    top,
                    left,
                    animationDelay: `${i * 0.5}s`,
                    animationDuration: `${3.5 + i}s`,
                  }}
                >
                  <path
                    d="M0,-11 Q1.4,-1.4 11,0 Q1.4,1.4 0,11 Q-1.4,1.4 -11,0 Q-1.4,-1.4 0,-11Z"
                    fill="var(--gold-hi)"
                  />
                </svg>
              ))}
            </div>

            <div className={styles.label}>
              <span className={styles.labelLine} />
              <span className={styles.labelText}>Свет для Луны</span>
              <span className={styles.labelLine} />
            </div>

            <p className={styles.intro}>
              Если Луна хоть раз тебе откликнулась — поддержи, чтобы она дальше шептала.
            </p>

            <div className={styles.tiers} role="radiogroup" aria-label="Сумма">
              {TIERS.map((t) => {
                const active = selected === t.amount;
                return (
                  <button
                    key={t.amount}
                    type="button"
                    className={`${styles.tier} ${active ? styles.tierActive : ''}`}
                    role="radio"
                    aria-checked={active}
                    onClick={() => {
                      haptic('light');
                      setSelected(t.amount);
                    }}
                    disabled={busy}
                  >
                    <span className={styles.tierGlyph} aria-hidden="true">✦</span>
                    <span className={styles.tierAmount}>
                      <span className={styles.tierAmountValue}>{t.amount}</span>
                      <span className={styles.tierStar} aria-hidden>★</span>
                    </span>
                    <span className={styles.tierName}>{t.name}</span>
                    <span className={styles.tierDesc}>{t.desc}</span>
                  </button>
                );
              })}
            </div>

            {error && <p className={styles.error}>{error}</p>}

            <div className={styles.actions}>
              <GoldButton onClick={handleConfirm} disabled={busy} full>
                {busy ? 'открываю…' : `Подарить ${selected} ★`}
              </GoldButton>
              <button
                type="button"
                className={styles.laterBtn}
                onClick={onClose}
                disabled={busy}
              >
                Позже
              </button>
            </div>

            <p className={styles.fineprint}>Telegram Stars · разовый жест</p>
          </>
        )}

        {view === 'thanks' && paidAmount && (
          <ThankYouScreen amount={paidAmount} sparkles={sparkles} onClose={onClose} />
        )}
      </div>
    </div>
  );
}

interface ThankYouProps {
  amount: DonationAmount;
  sparkles: SparkleSpec[];
  onClose: () => void;
}

function ThankYouScreen({ amount, sparkles, onClose }: ThankYouProps) {
  return (
    <motion.div
      className={styles.thanks}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.45 }}
    >
      <div className={styles.thanksMoonStage} aria-hidden="true">
        <motion.div
          className={styles.thanksMoonGlow}
          initial={{ scale: 0.6, opacity: 0 }}
          animate={{ scale: [0.6, 1.15, 1], opacity: [0, 0.9, 0.8] }}
          transition={{ duration: 1.6, ease: 'easeOut', times: [0, 0.55, 1] }}
        />
        <motion.div
          className={styles.thanksMoon}
          initial={{ scale: 0.7, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.9, ease: [0.22, 0.85, 0.3, 1] }}
        />
        {sparkles.map((s) => (
          <motion.span
            key={s.id}
            className={styles.thanksSparkle}
            style={{ left: `${s.x}%`, top: `${s.y}%`, fontSize: `${s.size}px` }}
            initial={{ opacity: 0, scale: 0, y: 8 }}
            animate={{ opacity: [0, 1, 0], scale: [0, 1, 0.6], y: [-4, -18, -30] }}
            transition={{ duration: 1.5 + s.delay, delay: s.delay, ease: 'easeOut' }}
          >
            ✦
          </motion.span>
        ))}
      </div>

      <motion.h3
        className={styles.thanksTitle}
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.5 }}
      >
        Луна благодарна
      </motion.h3>
      <motion.p
        className={styles.thanksText}
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.8 }}
      >
        Твои {amount} ★ — её свет.
        <br />
        Я рядом, когда снова понадоблюсь.
      </motion.p>
      <motion.div
        className={styles.thanksAction}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5, delay: 1.2 }}
      >
        <GoldButton onClick={onClose}>к Луне</GoldButton>
      </motion.div>
    </motion.div>
  );
}

interface SparkleSpec {
  id: number;
  x: number;
  y: number;
  size: number;
  delay: number;
}

function makeSparkles(count: number): SparkleSpec[] {
  return Array.from({ length: count }, (_, i) => ({
    id: i,
    x: Math.random() * 100,
    y: 30 + Math.random() * 50,
    size: 10 + Math.random() * 10,
    delay: Math.random() * 0.6,
  }));
}
