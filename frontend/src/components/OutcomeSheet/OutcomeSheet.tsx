import { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { ReadingOutcome } from '@/api/reading';
import { haptic } from '@/telegram/webapp';
import { OrnamentalDivider } from '@/components/OrnamentalDivider/OrnamentalDivider';
import { GoldButton } from '@/components/GoldButton/GoldButton';
import styles from './OutcomeSheet.module.css';

interface OutcomeSheetProps {
  open: boolean;
  initialStatus: ReadingOutcome | null;
  initialNote: string | null;
  /** Что Луна показала — короткая строка для контекста (вопрос или название карты дня). */
  readingTitle: string;
  onClose: () => void;
  onSubmit: (status: ReadingOutcome, note: string | null) => Promise<void> | void;
  onClear?: () => Promise<void> | void;
}

interface OptionMeta {
  status: ReadingOutcome;
  glyph: string;
  label: string;
  hint: string;
}

const OPTIONS: OptionMeta[] = [
  { status: 'CAME_TRUE', glyph: '✨', label: 'Сбылось',  hint: 'карты попали в цель' },
  { status: 'PARTIAL',   glyph: '🌗', label: 'Частично', hint: 'что-то откликнулось' },
  { status: 'MISSED',    glyph: '🌑', label: 'Мимо',     hint: 'не совпало' },
];

const MAX_NOTE = 1000;

export function OutcomeSheet({
  open,
  initialStatus,
  initialNote,
  readingTitle,
  onClose,
  onSubmit,
  onClear,
}: OutcomeSheetProps) {
  const [status, setStatus] = useState<ReadingOutcome | null>(initialStatus);
  const [note, setNote] = useState<string>(initialNote ?? '');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Сбрасываем стейт при каждом открытии: pre-fill из props
  useEffect(() => {
    if (open) {
      setStatus(initialStatus);
      setNote(initialNote ?? '');
      setError(null);
      setBusy(false);
    }
  }, [open, initialStatus, initialNote]);

  const handleSubmit = async () => {
    if (!status || busy) return;
    setBusy(true);
    setError(null);
    try {
      await onSubmit(status, note.trim() || null);
      haptic('medium');
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'не удалось сохранить');
    } finally {
      setBusy(false);
    }
  };

  const handleClear = async () => {
    if (!onClear || busy) return;
    setBusy(true);
    setError(null);
    try {
      await onClear();
      haptic('light');
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'не удалось сбросить');
    } finally {
      setBusy(false);
    }
  };

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
            aria-label="Как сбылось"
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ duration: 0.35, ease: [0.22, 0.85, 0.3, 1] }}
          >
            <button
              type="button"
              className={styles.handle}
              onClick={busy ? undefined : onClose}
              aria-label="Закрыть"
            />
            <div className={styles.body}>
              <OrnamentalDivider label="как сбылось" />
              <p className={styles.context}>
                Луна показала: <span className={styles.contextEm}>{readingTitle}</span>
              </p>

              <div className={styles.options} role="radiogroup" aria-label="Статус">
                {OPTIONS.map((opt) => {
                  const active = status === opt.status;
                  return (
                    <button
                      key={opt.status}
                      type="button"
                      className={`${styles.option} ${active ? styles.optionActive : ''}`}
                      role="radio"
                      aria-checked={active}
                      onClick={() => {
                        haptic('light');
                        setStatus(opt.status);
                      }}
                      disabled={busy}
                    >
                      <span className={styles.optionGlyph} aria-hidden="true">{opt.glyph}</span>
                      <span className={styles.optionLabel}>{opt.label}</span>
                      <span className={styles.optionHint}>{opt.hint}</span>
                    </button>
                  );
                })}
              </div>

              <label className={styles.noteWrap}>
                <span className={styles.noteLabel}>заметка <span className={styles.noteOpt}>необязательно</span></span>
                <textarea
                  ref={textareaRef}
                  className={styles.noteInput}
                  placeholder="что случилось на самом деле…"
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  maxLength={MAX_NOTE}
                  rows={3}
                  disabled={busy}
                />
                <span className={styles.noteCount}>{note.length}/{MAX_NOTE}</span>
              </label>

              {error && <p className={styles.error}>{error}</p>}

              <div className={styles.actions}>
                {onClear && initialStatus && (
                  <button
                    type="button"
                    className={styles.clearBtn}
                    onClick={handleClear}
                    disabled={busy}
                  >
                    сбросить
                  </button>
                )}
                <div className={styles.actionsMain}>
                  <GoldButton variant="ghost" onClick={onClose} disabled={busy}>Отмена</GoldButton>
                  <GoldButton onClick={handleSubmit} disabled={!status || busy}>
                    {busy ? 'сохраняю…' : 'Сохранить'}
                  </GoldButton>
                </div>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
