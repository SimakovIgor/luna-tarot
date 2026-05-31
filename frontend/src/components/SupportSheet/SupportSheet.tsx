import { useEffect, useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  createDonationInvoice,
  openInvoice,
  type DonationAmount,
  type InvoiceStatus,
} from '@/api/donation';
import { haptic } from '@/telegram/webapp';
import { GoldButton } from '@/components/GoldButton/GoldButton';
import { track, reportError } from '@/observability';
import styles from './SupportSheet.module.css';

interface SupportSheetProps {
  open: boolean;
  onClose: () => void;
  /** Дёргается после успешного платежа — обычно перезапрашиваем /me. */
  onDonated?: (stars: DonationAmount) => void;
}

interface Tier {
  amount: DonationAmount;
  glyph: string;
  title: string;
  hint: string;
}

const TIERS: Tier[] = [
  { amount: 20,  glyph: '✦', title: 'Шёпот',  hint: 'тихое спасибо' },
  { amount: 50,  glyph: '✧', title: 'Искра',  hint: 'тёплый огонёк благодарности' },
  { amount: 150, glyph: '✶', title: 'Сияние', hint: 'дыхание полнолуния' },
];

const DEFAULT_TIER: DonationAmount = 50;

type ViewState = 'choose' | 'paying' | 'thanks';

export function SupportSheet({ open, onClose, onDonated }: SupportSheetProps) {
  const [selected, setSelected] = useState<DonationAmount>(DEFAULT_TIER);
  const [view, setView] = useState<ViewState>('choose');
  const [error, setError] = useState<string | null>(null);
  const [paidAmount, setPaidAmount] = useState<DonationAmount | null>(null);

  useEffect(() => {
    if (open) {
      setSelected(DEFAULT_TIER);
      setView('choose');
      setError(null);
      setPaidAmount(null);
    }
  }, [open]);

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
      reportError(e, { where: 'SupportSheet.confirm', stars: selected });
      setError('Не удалось открыть инвойс. Попробуй чуть позже.');
      setView('choose');
    }
  };

  const sparkles = useMemo(
    () => (view === 'thanks' ? makeSparkles(22) : []),
    [view],
  );

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            key="backdrop"
            className={styles.backdrop}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
            onClick={busy ? undefined : onClose}
            aria-hidden="true"
          />
          <motion.div
            key="sheet"
            className={styles.sheet}
            role="dialog"
            aria-label="Поддержать Луну"
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ duration: 0.4, ease: [0.22, 0.85, 0.3, 1] }}
          >
            <button
              type="button"
              className={styles.handle}
              onClick={busy ? undefined : onClose}
              aria-label="Закрыть"
            />
            <div className={styles.body}>
              {view !== 'thanks' && (
                <>
                  <div className={styles.header}>
                    <span className={styles.headerGlyph} aria-hidden="true">✦</span>
                    <h2 className={styles.title}>Свет для Луны</h2>
                    <p className={styles.subtitle}>
                      Если Луна тебе откликнулась — поддержи её немного.
                    </p>
                  </div>

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
                          <span className={styles.tierGlyph} aria-hidden="true">{t.glyph}</span>
                          <span className={styles.tierBody}>
                            <span className={styles.tierTitle}>{t.title}</span>
                            <span className={styles.tierHint}>{t.hint}</span>
                          </span>
                          <span className={styles.tierAmount}>
                            {t.amount}
                            <span className={styles.tierStar} aria-hidden>★</span>
                          </span>
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
                      позже
                    </button>
                  </div>
                </>
              )}

              {view === 'thanks' && paidAmount && (
                <ThankYouScreen amount={paidAmount} sparkles={sparkles} onClose={onClose} />
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
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
      <div className={styles.moonStage} aria-hidden="true">
        <motion.div
          className={styles.moonGlow}
          initial={{ scale: 0.6, opacity: 0 }}
          animate={{ scale: [0.6, 1.15, 1], opacity: [0, 0.9, 0.8] }}
          transition={{ duration: 1.6, ease: 'easeOut', times: [0, 0.55, 1] }}
        />
        <motion.div
          className={styles.moon}
          initial={{ scale: 0.7, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.9, ease: [0.22, 0.85, 0.3, 1] }}
        />
        {sparkles.map((s) => (
          <motion.span
            key={s.id}
            className={styles.sparkle}
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
